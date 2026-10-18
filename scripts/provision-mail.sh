#!/usr/bin/env bash
# Catch-all @trombonepiano.com -> peter@ditchnavigation.com, on the existing SES rule set.
set -euo pipefail

PROFILE="${AWS_PROFILE:-ditch}"
REGION="${AWS_REGION:-us-east-1}"
APEX="trombonepiano.com"
MAIL_FROM="mail.trombonepiano.com"
BUCKET="trombonepiano-mail"
FUNCTION_NAME="trombonepiano-mail-forward"
ROLE_NAME="trombonepiano-mail-forward"
RULE_SET="INBOUND_MAIL"
RULE_NAME="TrombonePianoForwarding"
FORWARD_TO="peter@ditchnavigation.com"

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

aws_cmd() {
  aws --profile "$PROFILE" --region "$REGION" "$@"
}

zone_id=$(aws_cmd route53 list-hosted-zones --output json \
  | jq -r --arg name "${APEX}." '.HostedZones[] | select(.Name == $name) | .Id' \
  | head -n 1 | sed 's|/hostedzone/||')
account=$(aws_cmd sts get-caller-identity --query Account --output text)

active=$(aws_cmd ses describe-active-receipt-rule-set --query 'Metadata.Name' --output text)
if [[ "$active" != "$RULE_SET" ]]; then
  echo "Active receipt rule set is ${active}, expected ${RULE_SET}. Refusing to replace it." >&2
  exit 1
fi

echo "Mail bucket"
if ! aws_cmd s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  aws_cmd s3api create-bucket --bucket "$BUCKET" >/dev/null
fi
aws_cmd s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws_cmd s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration '{
  "Rules": [{
    "ID": "expire-mail",
    "Status": "Enabled",
    "Filter": {"Prefix": ""},
    "Expiration": {"Days": 14}
  }]
}' >/dev/null
jq -n --arg bucket "$BUCKET" --arg account "$account" '{
  Version: "2012-10-17",
  Statement: [{
    Sid: "AllowSESPuts",
    Effect: "Allow",
    Principal: {Service: "ses.amazonaws.com"},
    Action: "s3:PutObject",
    Resource: ("arn:aws:s3:::" + $bucket + "/*"),
    Condition: {StringEquals: {"AWS:SourceAccount": $account}}
  }]
}' >"$work/bucket-policy.json"
aws_cmd s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$work/bucket-policy.json"

echo "Domain identity"
if ! aws_cmd sesv2 get-email-identity --email-identity "$APEX" >/dev/null 2>&1; then
  aws_cmd sesv2 create-email-identity --email-identity "$APEX" \
    --dkim-signing-attributes NextSigningKeyLength=RSA_2048_BIT >/dev/null
fi
aws_cmd sesv2 put-email-identity-mail-from-attributes \
  --email-identity "$APEX" \
  --mail-from-domain "$MAIL_FROM" \
  --behavior-on-mx-failure USE_DEFAULT_VALUE

aws_cmd sesv2 get-email-identity --email-identity "$APEX" --output json >"$work/identity.json"
tokens=$(jq -r '.DkimAttributes.Tokens[]' "$work/identity.json")

changes=$(jq -n \
  --arg apex "$APEX" \
  --arg mail "$MAIL_FROM" \
  --argjson tokens "$(jq -n --arg t "$tokens" '$t | split("\n") | map(select(length > 0))')" \
  '{
    Changes: (
      [
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: $apex, Type: "MX", TTL: 300,
            ResourceRecords: [{Value: "10 inbound-smtp.us-east-1.amazonaws.com"}]
          }
        },
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: $apex, Type: "TXT", TTL: 300,
            ResourceRecords: [{Value: "\"v=spf1 include:amazonses.com -all\""}]
          }
        },
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: ("_dmarc." + $apex), Type: "TXT", TTL: 300,
            ResourceRecords: [{Value: "\"v=DMARC1; p=quarantine; adkim=s; aspf=r; rua=mailto:dmarc@trombonepiano.com\""}]
          }
        },
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: $mail, Type: "MX", TTL: 300,
            ResourceRecords: [{Value: "10 feedback-smtp.us-east-1.amazonses.com"}]
          }
        },
        {
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: $mail, Type: "TXT", TTL: 300,
            ResourceRecords: [{Value: "\"v=spf1 include:amazonses.com ~all\""}]
          }
        }
      ] + (
        $tokens | map({
          Action: "UPSERT",
          ResourceRecordSet: {
            Name: (. + "._domainkey." + $apex),
            Type: "CNAME",
            TTL: 300,
            ResourceRecords: [{Value: (. + ".dkim.amazonses.com")}]
          }
        })
      )
    )
  }')
printf '%s\n' "$changes" >"$work/dns.json"
aws_cmd route53 change-resource-record-sets --hosted-zone-id "$zone_id" --change-batch "file://$work/dns.json" >/dev/null

echo "Forwarder role"
if ! aws_cmd iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws_cmd iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' >/dev/null
fi
aws_cmd iam put-role-policy --role-name "$ROLE_NAME" --policy-name trombonepiano-mail-forward --policy-document "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {\"Effect\": \"Allow\", \"Action\": [\"logs:CreateLogGroup\", \"logs:CreateLogStream\", \"logs:PutLogEvents\"], \"Resource\": \"arn:aws:logs:*:*:*\"},
    {\"Effect\": \"Allow\", \"Action\": \"s3:GetObject\", \"Resource\": \"arn:aws:s3:::${BUCKET}/*\"},
    {\"Effect\": \"Allow\", \"Action\": \"ses:SendRawEmail\", \"Resource\": \"*\"}
  ]
}"
role_arn="arn:aws:iam::${account}:role/${ROLE_NAME}"

zip -j "$work/forwarder.zip" "$root/scripts/ses_forwarder.py" >/dev/null
if aws_cmd lambda get-function --function-name "$FUNCTION_NAME" >/dev/null 2>&1; then
  aws_cmd lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file "fileb://$work/forwarder.zip" >/dev/null
  aws_cmd lambda wait function-updated --function-name "$FUNCTION_NAME"
  aws_cmd lambda update-function-configuration --function-name "$FUNCTION_NAME" \
    --timeout 30 --memory-size 256 \
    --environment "Variables={S3_BUCKET=${BUCKET}}" >/dev/null
  aws_cmd lambda wait function-updated --function-name "$FUNCTION_NAME"
else
  # A new role cannot be assumed until IAM finishes propagating.
  for _ in $(seq 1 20); do
    if aws_cmd lambda create-function --function-name "$FUNCTION_NAME" \
      --runtime python3.12 --handler ses_forwarder.lambda_handler \
      --role "$role_arn" --timeout 30 --memory-size 256 \
      --environment "Variables={S3_BUCKET=${BUCKET}}" \
      --zip-file "fileb://$work/forwarder.zip" >/dev/null; then
      break
    fi
    sleep 3
  done
fi
function_arn=$(aws_cmd lambda get-function --function-name "$FUNCTION_NAME" --query Configuration.FunctionArn --output text)

if ! aws_cmd lambda get-policy --function-name "$FUNCTION_NAME" --output json 2>/dev/null \
  | jq -e '.Policy | fromjson | .Statement[] | select(.Sid == "ses-invoke")' >/dev/null; then
  aws_cmd lambda add-permission --function-name "$FUNCTION_NAME" \
    --statement-id ses-invoke --action lambda:InvokeFunction \
    --principal ses.amazonaws.com --source-account "$account" >/dev/null
fi

rule=$(jq -n --arg arn "$function_arn" --arg bucket "$BUCKET" --arg name "$RULE_NAME" '{
  Name: $name,
  Enabled: true,
  TlsPolicy: "Optional",
  Recipients: ["trombonepiano.com"],
  ScanEnabled: true,
  Actions: [
    {S3Action: {BucketName: $bucket, ObjectKeyPrefix: ""}},
    {LambdaAction: {FunctionArn: $arn, InvocationType: "RequestResponse"}}
  ]
}')
printf '%s\n' "$rule" >"$work/rule.json"
if aws_cmd ses describe-receipt-rule --rule-set-name "$RULE_SET" --rule-name "$RULE_NAME" >/dev/null 2>&1; then
  aws_cmd ses update-receipt-rule --rule-set-name "$RULE_SET" --rule "file://$work/rule.json" >/dev/null
else
  aws_cmd ses create-receipt-rule --rule-set-name "$RULE_SET" --after ExtentDevicesForwarding \
    --rule "file://$work/rule.json" >/dev/null
fi

echo "Waiting for DKIM and MAIL FROM"
for _ in $(seq 1 40); do
  aws_cmd sesv2 get-email-identity --email-identity "$APEX" --output json >"$work/identity.json"
  dkim=$(jq -r '.DkimAttributes.Status' "$work/identity.json")
  mail=$(jq -r '.MailFromAttributes.MailFromDomainStatus' "$work/identity.json")
  echo "DKIM ${dkim}, MAIL FROM ${mail}"
  [[ "$dkim" == "SUCCESS" && "$mail" == "SUCCESS" ]] && break
  sleep 15
done

echo "Mail for @${APEX} forwards to ${FORWARD_TO}"
