const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const existingBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : config.resolver.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver.blockList = [
  ...existingBlockList,
  /app\/.*\.(test|spec)\.[jt]sx?$/,
];

module.exports = withNativeWind(config, { input: './global.css' });
