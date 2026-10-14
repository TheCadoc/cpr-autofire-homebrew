import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: [".claude/**", "docs/**"] },
  js.configs.recommended,
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jquery,
        // Foundry v12 runtime globals; extend as the module needs more.
        foundry: "readonly",
        game: "readonly",
        canvas: "readonly",
        ui: "readonly",
        CONFIG: "readonly",
        CONST: "readonly",
        Hooks: "readonly",
        Actor: "readonly",
        Item: "readonly",
        ChatMessage: "readonly",
        Roll: "readonly",
        Dialog: "readonly",
        Handlebars: "readonly",
        renderTemplate: "readonly",
        loadTemplates: "readonly",
        getTemplate: "readonly",
        libWrapper: "readonly",
        fromUuid: "readonly",
        fromUuidSync: "readonly",
      },
    },
  },
  {
    files: ["test/**/*.js", ".github/scripts/**/*.mjs", "tools/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
];
