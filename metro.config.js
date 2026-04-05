const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

const withAliases = withNativeWind(config, { input: './global.css' });

// Firebase JS SDK + Hermes: release bundles can crash on launch if Metro resolves
// `firebase/*` subpaths differently than in dev. Disabling package exports + `cjs`
// matches Expo/Firebase guidance (see firebase-js-sdk#9157).
withAliases.resolver.unstable_enablePackageExports = false;
if (!withAliases.resolver.sourceExts.includes('cjs')) {
  withAliases.resolver.sourceExts.push('cjs');
}

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
