#!/usr/bin/env bash
# Idempotent hosting for https://trombonepiano.com. www redirects to the apex.
set -euo pipefail

PROFILE="${AWS_PROFILE:-ditch}"
REGION="${AWS_REGION:-us-east-1}"
APEX="trombonepiano.com"
WWW="www.trombonepiano.com"
BUCKET="trombonepiano-web"
FUNCTION_NAME="trombonepiano-www-redirect"
OAC_NAME="trombonepiano-web"
CACHE_POLICY_ID="658327ea-f89d-4fab-a63d-7e88639e58f6"
CLOUDFRONT_ZONE_ID="Z2FDTNDATAQYW2"

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

aws_cmd() {
  aws --profile "$PROFILE" --region "$REGION" "$@"
}

echo "Hosted zone for ${APEX}"
zone_id=$(aws_cmd route53 list-hosted-zones --output json \
  | jq -r --arg name "${APEX}." '.HostedZones[] | select(.Name == $name) | .Id' \
  | head -n 1 \
  | sed 's|/hostedzone/||')
if [[ -z "$zone_id" || "$zone_id" == "null" ]]; then
  echo "No Route 53 hosted zone named ${APEX}." >&2
  exit 1
fi
echo "Zone ${zone_id}"

echo "Certificate"
cert_arn=""
while read -r arn; do
  [[ -z "$arn" ]] && continue
  names=$(aws_cmd acm describe-certificate --certificate-arn "$arn" --output json \
    | jq -r '[.Certificate.DomainName] + (.Certificate.SubjectAlternativeNames // []) | .[]')
  if grep -qx "$APEX" <<<"$names" && grep -qx "$WWW" <<<"$names"; then
    cert_arn="$arn"
    break
  fi
done < <(aws_cmd acm list-certificates \
  --certificate-statuses ISSUED PENDING_VALIDATION \
  --query 'CertificateSummaryList[].CertificateArn' --output text | tr '\t' '\n')

if [[ -z "$cert_arn" ]]; then
  cert_arn=$(aws_cmd acm request-certificate \
    --domain-name "$APEX" \
    --subject-alternative-names "$WWW" \
    --validation-method DNS \
    --key-algorithm RSA_2048 \
    --query CertificateArn --output text)
  echo "Requested ${cert_arn}"
else
  echo "Using ${cert_arn}"
fi

for _ in $(seq 1 30); do
  aws_cmd acm describe-certificate --certificate-arn "$cert_arn" --output json >"$work/cert.json"
  ready=$(jq '[.Certificate.DomainValidationOptions[] | select(.ResourceRecord != null)] | length' "$work/cert.json")
  [[ "$ready" -ge 1 ]] && break
  sleep 2
done

jq -n --slurpfile cert "$work/cert.json" --arg zone "$zone_id" '{
  Changes: [
    $cert[0].Certificate.DomainValidationOptions[]
    | select(.ResourceRecord != null)
    | {
        Action: "UPSERT",
        ResourceRecordSet: {
          Name: .ResourceRecord.Name,
          Type: .ResourceRecord.Type,
          TTL: 300,
          ResourceRecords: [{Value: .ResourceRecord.Value}]
        }
      }
  ]
}' >"$work/validation.json"

if jq -e '.Changes | length > 0' "$work/validation.json" >/dev/null; then
  aws_cmd route53 change-resource-record-sets \
    --hosted-zone-id "$zone_id" \
    --change-batch "file://$work/validation.json" >/dev/null
fi

echo "Waiting for the certificate"
aws_cmd acm wait certificate-validated --certificate-arn "$cert_arn"
echo "Certificate issued"

echo "Bucket ${BUCKET}"
if ! aws_cmd s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  aws_cmd s3api create-bucket --bucket "$BUCKET" >/dev/null
fi
aws_cmd s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "Origin access control"
oac_id=$(aws_cmd cloudfront list-origin-access-controls --output json \
  | jq -r --arg name "$OAC_NAME" '.OriginAccessControlList.Items // [] | map(select(.Name == $name)) | .[0].Id // empty')
if [[ -z "$oac_id" ]]; then
  oac_id=$(aws_cmd cloudfront create-origin-access-control --origin-access-control-config "{
    \"Name\": \"${OAC_NAME}\",
    \"Description\": \"Trombone Piano web\",
    \"SigningProtocol\": \"sigv4\",
    \"SigningBehavior\": \"always\",
    \"OriginAccessControlOriginType\": \"s3\"
  }" --query OriginAccessControl.Id --output text)
fi
echo "OAC ${oac_id}"

echo "www redirect function"
function_arn="arn:aws:cloudfront::$(aws_cmd sts get-caller-identity --query Account --output text):function/${FUNCTION_NAME}"
if aws_cmd cloudfront describe-function --name "$FUNCTION_NAME" >/dev/null 2>&1; then
  etag=$(aws_cmd cloudfront describe-function --name "$FUNCTION_NAME" --query ETag --output text)
  etag=$(aws_cmd cloudfront update-function --name "$FUNCTION_NAME" --if-match "$etag" \
    --function-config "Comment=Redirect www to apex,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://${root}/scripts/www-redirect.js" \
    --query ETag --output text)
else
  etag=$(aws_cmd cloudfront create-function --name "$FUNCTION_NAME" \
    --function-config "Comment=Redirect www to apex,Runtime=cloudfront-js-2.0" \
    --function-code "fileb://${root}/scripts/www-redirect.js" \
    --query ETag --output text)
fi
aws_cmd cloudfront publish-function --name "$FUNCTION_NAME" --if-match "$etag" >/dev/null

echo "Distribution"
dist_id=""
marker=""
while true; do
  if [[ -n "$marker" ]]; then
    page=$(aws_cmd cloudfront list-distributions --marker "$marker" --output json)
  else
    page=$(aws_cmd cloudfront list-distributions --output json)
  fi
  found=$(jq -r --arg apex "$APEX" '
    [.DistributionList.Items // [] | .[] | select((.Aliases.Items // []) | index($apex)) | .Id] | .[0] // empty
  ' <<<"$page")
  if [[ -n "$found" ]]; then
    dist_id="$found"
    break
  fi
  truncated=$(jq -r '.DistributionList.IsTruncated // false' <<<"$page")
  [[ "$truncated" == "true" ]] || break
  marker=$(jq -r '.DistributionList.NextMarker' <<<"$page")
done

if [[ -z "$dist_id" ]]; then
  jq -n \
    --arg ref "trombonepiano-${BUCKET}-$(date +%s)" \
    --arg bucket "${BUCKET}.s3.${REGION}.amazonaws.com" \
    --arg oac "$oac_id" \
    --arg cert "$cert_arn" \
    --arg fn "$function_arn" \
    --arg cache "$CACHE_POLICY_ID" \
    --arg apex "$APEX" \
    --arg www "$WWW" \
    '{
      CallerReference: $ref,
      Comment: "Trombone Piano",
      Enabled: true,
      PriceClass: "PriceClass_100",
      HttpVersion: "http2and3",
      IsIPV6Enabled: true,
      DefaultRootObject: "index.html",
      Aliases: {Quantity: 2, Items: [$apex, $www]},
      Origins: {
        Quantity: 1,
        Items: [{
          Id: "s3-trombonepiano-web",
          DomainName: $bucket,
          OriginAccessControlId: $oac,
          S3OriginConfig: {OriginAccessIdentity: ""}
        }]
      },
      DefaultCacheBehavior: {
        TargetOriginId: "s3-trombonepiano-web",
        ViewerProtocolPolicy: "redirect-to-https",
        Compress: true,
        CachePolicyId: $cache,
        AllowedMethods: {
          Quantity: 2,
          Items: ["GET", "HEAD"],
          CachedMethods: {Quantity: 2, Items: ["GET", "HEAD"]}
        },
        FunctionAssociations: {
          Quantity: 1,
          Items: [{FunctionARN: $fn, EventType: "viewer-request"}]
        }
      },
      CustomErrorResponses: {
        Quantity: 2,
        Items: [
          {ErrorCode: 403, ResponsePagePath: "/index.html", ResponseCode: "200", ErrorCachingMinTTL: 0},
          {ErrorCode: 404, ResponsePagePath: "/index.html", ResponseCode: "200", ErrorCachingMinTTL: 0}
        ]
      },
      ViewerCertificate: {
        ACMCertificateArn: $cert,
        SSLSupportMethod: "sni-only",
        MinimumProtocolVersion: "TLSv1.2_2021",
        Certificate: $cert,
        CertificateSource: "acm"
      },
      Restrictions: {GeoRestriction: {RestrictionType: "none", Quantity: 0}}
    }' >"$work/distribution.json"
  dist_id=$(aws_cmd cloudfront create-distribution \
    --distribution-config "file://$work/distribution.json" \
    --query Distribution.Id --output text)
  echo "Created ${dist_id}"
else
  echo "Using ${dist_id}"
fi

domain=$(aws_cmd cloudfront get-distribution --id "$dist_id" --query Distribution.DomainName --output text)
account=$(aws_cmd sts get-caller-identity --query Account --output text)

jq -n --arg bucket "$BUCKET" --arg account "$account" --arg dist "$dist_id" '{
  Version: "2012-10-17",
  Statement: [{
    Sid: "AllowCloudFront",
    Effect: "Allow",
    Principal: {Service: "cloudfront.amazonaws.com"},
    Action: "s3:GetObject",
    Resource: ("arn:aws:s3:::" + $bucket + "/*"),
    Condition: {StringEquals: {"AWS:SourceArn": ("arn:aws:cloudfront::" + $account + ":distribution/" + $dist)}}
  }]
}' >"$work/bucket-policy.json"
aws_cmd s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$work/bucket-policy.json"

alias_target() {
  local name="$1" type="$2"
  jq -n --arg name "$name" --arg type "$type" --arg dns "$domain" --arg zone "$CLOUDFRONT_ZONE_ID" '{
    Action: "UPSERT",
    ResourceRecordSet: {
      Name: $name,
      Type: $type,
      AliasTarget: {HostedZoneId: $zone, DNSName: $dns, EvaluateTargetHealth: false}
    }
  }'
}
jq -n \
  --argjson a "$(alias_target "$APEX" A)" \
  --argjson aaaa "$(alias_target "$APEX" AAAA)" \
  --argjson wa "$(alias_target "$WWW" A)" \
  --argjson waaaa "$(alias_target "$WWW" AAAA)" \
  '{Changes: [$a, $aaaa, $wa, $waaaa]}' >"$work/aliases.json"
aws_cmd route53 change-resource-record-sets --hosted-zone-id "$zone_id" --change-batch "file://$work/aliases.json" >/dev/null

cat >"$root/.env.deploy" <<EOF
BUCKET=${BUCKET}
DISTRIBUTION_ID=${dist_id}
HOSTED_ZONE_ID=${zone_id}
CERTIFICATE_ARN=${cert_arn}
EOF

echo "Waiting for the distribution to deploy"
aws_cmd cloudfront wait distribution-deployed --id "$dist_id"
echo "https://${APEX} distribution ${dist_id}"
