const tsPlugin = require("@typescript-eslint/eslint-plugin")
const tsParser = require("@typescript-eslint/parser")
const reactPlugin = require("eslint-plugin-react")
const reactHooksPlugin = require("eslint-plugin-react-hooks")

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: ["node_modules/**", ".expo/**", "dist/**", "coverage/**"],
  },
  // TypeScript
  ...tsPlugin.configs["flat/recommended"],
  // React Hooks
  reactHooksPlugin.configs.flat["recommended-latest"],
  // Custom overrides + React plugin registered manually (react@7 flat.recommended is broken on ESLint v10)
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        require: "readonly",
        module: "writable",
        exports: "writable",
        __dirname: "readonly",
        __filename: "readonly",
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Promise: "readonly",
        fetch: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // Allow require() in CommonJS config files (must come after flat/recommended to override catchall)
  {
    files: ["*.js", "*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Les factories de jest.mock() sont hoistées : elles ne peuvent pas utiliser d'import.
  {
    files: ["tests/setup.ts", "__mocks__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]
