module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Reanimated requires its plugin last.
      "react-native-reanimated/plugin",
    ],
  };
};
