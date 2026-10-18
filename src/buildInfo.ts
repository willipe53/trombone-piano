export const version = '2.0.0'
export const buildNumber = '3'

export function versionLabel(versionValue = version, buildValue = buildNumber): string {
  return `Version: ${versionValue}+${buildValue}`
}
