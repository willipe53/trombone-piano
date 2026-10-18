const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]
for (const ext of ['md', 'txt']) {
  if (!config.resolver.assetExts.includes(ext)) config.resolver.assetExts.push(ext)
}

module.exports = config
