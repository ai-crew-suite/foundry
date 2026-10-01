/**
 * Copyright 2026 The AI Crew Suite Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    name: "crew-cli/global-setup",
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.ts"]
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    name: "crew-cli/base-rules",
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  {
    name: "crew-cli/node-rules",
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-process-exit": "error"
    }
  },
  {
    name: "crew-cli/test-overrides",
    files: [
      "src/bin/commands/test-unit/lib/setup.ts",
      "src/bin/utils/test-utils.ts",
      "**/*.test.ts",
      "**/__tests__/**/*.ts"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    ignores: ["dist/**", "coverage/**"]
  }
);
