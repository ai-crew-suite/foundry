import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import type { Linter } from "eslint";

export default tseslint.config(
  // 1. Incorporate native ESLint recommended rules
  eslint.configs.recommended,
  // 2. Incorporate TypeScript-specific static syntax checking
  ...tseslint.configs.recommended,

  // 3. Define target files and operational environment overrides
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      /* 🛡️ PLATFORM TYPE ACCURACY GATES */
      "@typescript-eslint/no-explicit-any": "off", // Allowed for plugin interface casts
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }]
    } as Linter.RulesRecord
  },
  // 4. Global exclusions matching your operational artifact layers
  {
    ignores: [
      "**/dist/**",
      "**/dist-types/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "packages/mock-fixtures/techdocs/**"
    ]
  }
);
