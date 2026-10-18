"""Forward @trombonepiano.com mail to peter@ditchnavigation.com.

The copy is a new message from support@trombonepiano.com. SES signs that
message with the domain's DKIM key. Reply-To stays the original sender.
"""

import email
import json
import os

import boto3

FORWARD_FROM = "support@trombonepiano.com"
FORWARD_TO = "peter@ditchnavigation.com"
S3_BUCKET = os.environ.get("S3_BUCKET", "trombonepiano-mail")

s3_client = boto3.client("s3")
ses_client = boto3.client("ses", region_name="us-east-1")

DROP_HEADERS = ("dkim-signature", "authentication-results", "sender", "return-path")


def strip_auth_headers(message):
    names = [
        name
        for name in list(message.keys())
        if name.lower() in DROP_HEADERS or name.lower().startswith("arc-")
    ]
    for name in names:
        while name in message:
            del message[name]


def lambda_handler(event, context):
    print(json.dumps(event))
    ses_notification = event["Records"][0]["ses"]
    message_id = ses_notification["mail"]["messageId"]
    recipients = ses_notification["receipt"]["recipients"]
    print(f"Processing {message_id} for {recipients}")

    raw_email = s3_client.get_object(Bucket=S3_BUCKET, Key=message_id)["Body"].read()
    message = email.message_from_bytes(raw_email)
    original_from = message.get("From", "unknown")
    original_subject = message.get("Subject", "(no subject)")
    strip_auth_headers(message)

    if "From" in message:
        del message["From"]
    message["From"] = FORWARD_FROM
    if "Reply-To" in message:
        del message["Reply-To"]
    message["Reply-To"] = original_from
    if "To" in message:
        del message["To"]
    message["To"] = FORWARD_TO
    if "Subject" in message:
        del message["Subject"]
    recipient = recipients[0] if recipients else FORWARD_FROM
    message["Subject"] = f"[Fwd: {recipient}] {original_subject}"

    response = ses_client.send_raw_email(
        Source=FORWARD_FROM,
        Destinations=[FORWARD_TO],
        RawMessage={"Data": message.as_bytes()},
    )
    print(f"Forwarded to {FORWARD_TO}: {response['MessageId']}")
    return {"statusCode": 200, "body": json.dumps(response["MessageId"])}
