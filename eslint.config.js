import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "test-results/", "playwright-report/", "android/build/", "android/app/build/"] },
  js.configs.recommended,
  {
    files: ["js/**/*.js", "sw.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser, ...globals.serviceworker } },
    rules: {
      // Data must never reach the DOM as HTML. Build nodes with h() from js/dom.js.
      "no-restricted-properties": ["error",
        { property: "innerHTML", message: "Use h()/mount() from js/dom.js." },
        { property: "outerHTML", message: "Use h()/mount() from js/dom.js." }],
      "no-restricted-syntax": ["error",
        { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: "Use h()/mount() from js/dom.js." },
        { selector: "CallExpression[callee.name='confirm']", message: "Delete immediately and offer undo instead." }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "prefer-const": "error",
      eqeqeq: ["error", "always"]
    }
  },
  {
    files: ["test/**/*.mjs", "tools/**/*.mjs", "e2e/**/*.mjs", "*.config.js", "*.config.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node, ...globals.browser } }
  }
];
