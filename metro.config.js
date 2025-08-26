const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for importing .js files with JSX
config.resolver.sourceExts.push('cjs', 'mjs');

// Add support for web platform
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Handle three.js and related packages
config.resolver.alias = {
  'three/examples/jsm': 'three/examples/jsm',
};

// Update transformer for ES modules and handle import.meta
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];
config.transformer.unstable_allowRequireContext = true;

// Handle import.meta for web builds
config.transformer.getTransformOptions = () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: false,
  },
});

module.exports = config;