import js from "@eslint/js";
import globals from "globals";

/**
 * Minimal flat ESLint config.
 *
 * The key rule here is `no-undef`: it fails the build whenever code
 * references an identifier that was never declared, imported, or listed
 * as a known global. That is exactly the class of bug that shipped in
 * tokenStore.js, where acquireLock()/broadcastChannel() referenced
 * LOCK_KEY, LOCK_TIMEOUT_MS, and CHANNEL_NAME without ever declaring
 * them. The resulting ReferenceError was silently swallowed by a
 * surrounding try/catch, so cross-tab refresh locking silently became a
 * permanent no-op in production instead of failing loudly in CI.
 */
const eslintConfig = [
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "no-undef": "error",
    },
  },
];

export default eslintConfig;
