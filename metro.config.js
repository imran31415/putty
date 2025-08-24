const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for importing .js files with JSX
config.resolver.sourceExts.push('cjs');

// Add support for web platform
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Handle three.js and related packages
config.resolver.alias = {
  'three/examples/jsm': 'three/examples/jsm',
};

// Update transformer for ES modules
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

module.exports = config;