const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const existing = config.resolver.blockList;
const toAdd = /[/\\]\.local[/\\]/;

if (Array.isArray(existing)) {
  config.resolver.blockList = [...existing, toAdd];
} else if (existing) {
  config.resolver.blockList = [existing, toAdd];
} else {
  config.resolver.blockList = [toAdd];
}

module.exports = config;
