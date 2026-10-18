#!/bin/zsh
# Copy the latest iOS EAS build into src/buildInfo.ts. Does not bump a store version.
set -u

root=$(cd "$(dirname "$0")/.." && pwd)
info="$root/src/buildInfo.ts"

leave() {
  echo "$1"
  echo "Leaving src/buildInfo.ts at its committed defaults."
  exit 0
}

if ! command -v eas >/dev/null 2>&1; then
  leave "eas is not installed."
fi

if ! command -v jq >/dev/null 2>&1; then
  leave "jq is not installed."
fi

if ! build=$(eas build:list --platform ios --non-interactive --limit 1 --json 2>/dev/null); then
  leave "No EAS iOS build is available."
fi

app_version=$(print -r -- "$build" | jq -r '.[0].appVersion // empty')
app_build=$(print -r -- "$build" | jq -r '.[0].appBuildVersion // empty')
if [[ -z "$app_version" || -z "$app_build" || "$app_version" == "null" || "$app_build" == "null" ]]; then
  leave "No EAS iOS build is available."
fi

sed -i '' \
  -e "s/^export const version = .*/export const version = '${app_version}'/" \
  -e "s/^export const buildNumber = .*/export const buildNumber = '${app_build}'/" \
  "$info"

echo "Wrote src/buildInfo.ts ${app_version}+${app_build}"
