const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

const withAliases = withNativeWind(config, { input: './global.css' });

const originalResolveRequest = withAliases.resolver.resolveRequest;

withAliases.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const target = path.resolve(__dirname, moduleName.slice(2));
    return resolve(
      {
        ...context,
        resolveRequest: resolve,
      },
      target,
      platform,
    );
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = withAliases;
