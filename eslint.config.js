import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "**/node_modules/**"]),

  // Front-end
  {
    files: ["src/**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // Back-end — ES Modules
  {
    files: ["backend/**/*.js"],
    ignores: ["backend/migrations/**", "backend/seeders/**"],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: "module",
      globals: globals.nodeBuiltin,
    },
  },

  // Back-end — CommonJS
  {
    files: [
      "backend/**/*.cjs",
      "backend/migrations/**/*.js",
      "backend/seeders/**/*.js",
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
]);