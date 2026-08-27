// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // Pola data fetching async di useEffect adalah pola standar aplikasi ini.
      "react-hooks/set-state-in-effect": "off",
      // Reanimated sharedValue (scale.value = ...) adalah pola resmi yang tidak kompatibel dengan react-compiler immutability check
      "react-hooks/immutability": "off",
      // GlassView require dynamic + GlassView conditional — false positive di import/namespace
      "import/namespace": "off",
    },
  },
]);