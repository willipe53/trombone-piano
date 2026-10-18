#!/usr/bin/env bash
# Build the web app, copy the store pages, and publish them.
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  source .env.deploy
fi

export AWS_PROFILE="${AWS_PROFILE:-ditch}"
export AWS_REGION="${AWS_REGION:-us-east-1}"
: "${BUCKET:?BUCKET is missing. Run scripts/provision-web.sh first.}"
: "${DISTRIBUTION_ID:?DISTRIBUTION_ID is missing. Run scripts/provision-web.sh first.}"

zsh scripts/version-fetch.zsh
node scripts/copy-canvaskit.mjs
npx expo export --platform web
cp website/privacy-policy.html website/support.html website/site.css website/icon.png dist/

# Assets go up before the page. A failed upload then leaves the previous page pointing at files that are still there.
aws s3 sync dist/ "s3://${BUCKET}/" \
  --exclude "*.html" \
  --cache-control "public, max-age=31536000, immutable" \
  --only-show-errors
aws s3 cp dist/ "s3://${BUCKET}/" --recursive \
  --exclude "*" --include "*.html" --include "site.css" --include "icon.png" \
  --cache-control "public, max-age=0, must-revalidate" \
  --only-show-errors
aws s3 sync dist/ "s3://${BUCKET}/" --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --only-show-errors
aws s3 cp dist/ "s3://${BUCKET}/" --recursive \
  --exclude "*" --include "*.html" --include "site.css" --include "icon.png" \
  --cache-control "public, max-age=0, must-revalidate" \
  --only-show-errors
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*" >/dev/null

echo "Published https://trombonepiano.com"
