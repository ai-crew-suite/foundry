# Temporary Infra Planning Doc

## Asset Strategy Matrix

| Asset Group                                                  | Sync Location                     | Mechanics                                                    |
| ------------------------------------------------------------ | --------------------------------- | ------------------------------------------------------------ |
| **Global Docs & Workflows** (`.github/*`, CodeQL, issue templates, `.gitignore`, `.gitattributes`, `.dockerignore`) | Central CI Push                   | Managed via Redocly/repo-file-sync-action or `peter-evans/create-pull-request`. **Opens PRs automatically**. |
| **Local Tooling Integration** (Husky Hooks, `.vscode/settings.json`, `.vscode/extensions.json`) | Local Node SDK / CLI Pull         | Orchestrated by your `@ai-crew-suite/infra` `postinstall` or custom CLI initialization hooks. |
| **Yarn Workspace State** (`.yarn/plugins/*`, `.yarn/sdks/*`, `integrations.yml`) | Dynamic Reference / Manifest Pull | Handled via your central script injecting paths directly into `.yarnrc.yml`. |

## Config Exports (TSConfig, Prettier, ESLint)

Instead of copying files, packages in your repositories will directly extend or import them from your infra package.

- **`tsconfig.base.json` (inside `@ai-crew-suite/infra`)**

  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "strict": true,
      "esModuleInterop": true
    }
  }
  ```

  *Child repo usage (`tsconfig.json`):*

  ```json
  { "extends": "@ai-crew-suite/infra/configs/tsconfig.base.json" }
  ```

- **`eslint.config.ts` (inside `@ai-crew-suite/infra`)**

  ```typescript
  import tseslint from 'typescript-eslint';
  export const baseConfig = tseslint.config(...);
  ```

  *Child repo usage (`eslint.config.ts`):*

  ```typescript
  import { baseConfig } from "@ai-crew-suite/infra/configs/eslint";
  export default baseConfig;
  ```

- **`.prettierrc`** -> Can just be pointed to in `package.json`:

  ```bash
  "prettier": "@ai-crew-suite/infra/configs/prettier"
  ```

### Static File Syncing via your CLI

For non-code files (`LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`), your `ai-crew-suite-cli` can include a `sync` command.

When a developer runs `ai-crew-cli sync` locally or in CI, the CLI copies the golden files from `@ai-crew-suite/infra/templates/*` straight into the root of the child repository.

## Husky & VSCode (Local Node SDK / Pull Configuration)

Local workspace behavior configurations should be bundled directly into your `@ai-crew-suite/infra` NPM bundle. When developers pull updates down via dependency bumps, your internal engine sets up their local IDE workspace state.

- **VSCode Standards:** Keep `extensions.json` and `settings.json` within your infra package under `configs/vscode/`.
- **Husky Automation:** Bundle your husky shell scripts into the package.

Extend the `sync-catalogs.js` node script (from earlier) into a general setup script triggered by `postinstall`:

```javascript
// @ai-crew-suite/infra/scripts/postinstall-sync.js
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const targetRoot = process.cwd();

// 1. Sync VSCode profiles
const vscodeSrc = path.join(__dirname, '../configs/vscode');
const vscodeDest = path.join(targetRoot, '.vscode');
fs.copySync(vscodeSrc, vscodeDest, { overwrite: true });

// 2. Sync Yarn catalogs (as implemented previously)
syncYarnCatalogs(targetRoot);

// 3. Initialize & Sync Husky Hooks automatically
try {
  execSync('npx husky init', { cwd: targetRoot });
  const huskySrc = path.join(__dirname, '../configs/husky/pre-commit');
  const huskyDest = path.join(targetRoot, '.husky/pre-commit');
  fs.copySync(huskySrc, huskyDest, { overwrite: true });
} catch (e) {
  console.warn('⚠️ Husky initialization skipped or failed. Ensure Git is initialized.');
}
```

## Yarn Plugins & SDK Configurations (`.yarn/*`)

Do not bundle heavy SDK outputs (`.yarn/sdks/typescript/*`) into codebases or push them explicitly through git actions. Since you are standardizing on Yarn 4+, treat these artifacts as **ephemeral, runtime-generated files**.

The SDK binaries themselves shouldn't be committed across 3 repositories; instead, the instructions to build them should be centrally dictated. Add the instructions into the local repository definitions inside your `.yarnrc.yml` compilation block.

When your synchronization script runs, output a `.yarnrc.yml` pointing cleanly to the Backstage plugin paths:

```yaml
# Generated snippet inside your downstream .yarnrc.yml files
plugins:
  - path: .yarn/plugins/@yarnpkg/plugin-backstage.cjs
    spec: "@yarnpkg/plugin-backstage"
```

To prevent tracking hundreds of lines of editor SDKs inside code repositories, add `.yarn/sdks` straight to your master global `.gitignore` template template, and force each repo to build them deterministically locally inside their root configuration:

```json
"scripts": {
  "postinstall": "node ./node_modules/@ai-crew-suite/infra/scripts/postinstall-sync.js && yarn dlx @yarnpkg/sdks vscode"
}
```

## Handling `playwright.config.ts`

Unlike markdown, `playwright.config.ts` is executable TypeScript. You should avoid copying and pasting it. Instead, **export a base configuration** from `@ai-crew-suite/infra` and allow each repository to import and merge it with any repository-specific overrides.

### Step 1: Define the Base Config in `@ai-crew-suite/infra`

Inside your infra package, define your company-wide Playwright standards (browsers, viewports, retries, reporting).

```typescript
// @ai-crew-suite/infra/configs/playwright.base.ts
import { PlaywrightTestConfig, devices } from '@playwright/test';

export const basePlaywrightConfig: PlaywrightTestConfig = {
  testDir: './spec', // Assumes a convention across your plugin repos
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
};
```

### Step 2: Consume it in the Child Repositories

In the root of your target plugin repositories, the local `playwright.config.ts` becomes a tiny wrapper. If the repo needs standard settings, it just re-exports the base:

```typescript
// playwright.config.ts (Child Repo - Default)
import { basePlaywrightConfig } from '@ai-crew-suite/infra/configs/playwright.base';
export default basePlaywrightConfig;
```

If a specific repository houses a heavy plugin that requires a unique local database or a longer timeout, they can use deep merging to override *only* what they need without touching the global defaults:

```typescript
// playwright.config.ts (Child Repo - With Custom Tweaks)
import { basePlaywrightConfig } from '@ai-crew-suite/infra/configs/playwright.base';
import { defineConfig } from '@playwright/test';
import merge from 'lodash/merge'; // shared via your vitest/tooling catalog!

export default defineConfig(
  merge({}, basePlaywrightConfig, {
    timeout: 60 * 1000, // Override globally defined timeout
    use: {
      baseURL: 'http://localhost:3000',
    },
  })
);
```

## Handling Markdown Files (`LICENSE`, `SECURITY.md`, etc.)

Since these files cannot be extended or imported dynamically, you need to treat your `ai-crew-suite-infra` repository as the **upstream publisher** and automate the distribution. You have two excellent options depending on where you want the automation to live.

### The Global Docs & GitHub Ecosystem (PR-Driven Sync)

Create a `sync-config.yml` in your infra repository:

```yaml
# Inside ai-crew-suite-infra root
group:
  - repos: |
      ai-crew-suite/ai-crew-suite-plugins-a
      ai-crew-suite/ai-crew-suite-plugins-b
      ai-crew-suite/ai-crew-suite-plugins-c
    files:
      - source: templates/.github/workflows/ci.yml
        dest: .github/workflows/ci.yml
      - source: templates/.github/codeql/codeql-config.yml
        dest: .github/codeql/codeql-config.yml
      - source: templates/.github/ISSUE_TEMPLATE/bug_template.md
        dest: .github/ISSUE_TEMPLATE/bug_template.md
      - source: templates/.github/CODEOWNERS
        dest: .github/CODEOWNERS
      - source: templates/.dockerignore
        dest: .dockerignore
      - source: templates/.gitignore
        dest: .gitignore

```

Then create the workflow file in your infra repository:

```yaml
# .github/workflows/sync-ecosystem.yml inside ai-crew-suite-infra
name: Push Global Configuration PRs
on:
  push:
    branches: [ main ]
    paths:
      - 'templates/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run File Sync Engine
        uses: Redocly/repo-file-sync-action@v1
        with:
          GH_PAT: ${{ secrets.INFRA_AUTOMATION_TOKEN }}
          CONFIG_PATH: sync-config.yml
```

## `.github` files that *must* still be copied via CI

By switching to reusable actions, you completely eliminate the need to copy `.github/workflows/*`. The only files left in the `.github` folder that **must** be physically copied via a CI sync action (like `Redocly/repo-file-sync-action`) are static GitHub UI elements that don't support remote references:

- `.github/ISSUE_TEMPLATE/*.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/CODEOWNERS`

## Fixing VS Code Highlighting for `.yarnrc.yml`

To fix your IDE visual metrics, the trick is telling VS Code how to read and lint your custom centralized configuration files.

For `master-catalogs.yml` / `.yarnrc.yml` (Syntax & Hovering)

To get auto-complete, validation, and version linting inside the files that *actually* hold the versions, map them to standard npm schemas. Add this to your shared global `.vscode/settings.json` template:

```json
{
  "json.schemas": [
    {
      "fileMatch": [".yarnrc.yml"],
      "url": "https://schemastore.org"
    }
  ],
  "yaml.schemas": {
    "https://schemastore.org": ["master-catalogs.yml"]
  }
}
```

## Actions Workflow Files

How to consume your own action internally:

When testing or using your own action *inside* the `ai-crew-suite-infra` repository, **use a relative path**. Do not use a remote tag.

**Inside `internal-ci.yml` (Local testing):**

```yaml
steps:
  - uses: actions/checkout@v4 # Must check out code first for relative paths
  - name: Test our own action locally
    uses: ./actions/custom-python-runner
```

**Inside a child repository (Remote production usage):**

```yaml
steps:
  - name: Use the infra action remotely
    uses: ai-crew-suite/infra/actions/custom-python-runner@v1
```

### Normal directory structure for a standalone action

```bash
actions/my-javascript-action/
├── src/
│   └── index.ts          # Your source code
├── dist/
│   └── index.js          # THE BUNDLED OUTPUT (Committed to git via compilation)
├── package.json
├── action.yml            # Points explicitly to "using: 'node20'", main: 'dist/index.js'
└── README.md
```

## E2E Canary Integration Testing (In GitHub CI)

To test that your action works inside a true runtime pipeline before publishing a release tag, you wire up a "Canary" or "Self-Test" job directly inside your `.github/workflows/ci.yml`.

Because it's a monorepo, you can point a test step directly to the local filesystem path:

```yaml
# .github/workflows/ci.yml inside your actions repo
name: Continuous Integration

on: [pull_request]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Step 1: Lint, Compile and Run Unit Tests
      - name: Run Package Tooling
        run: |
          npm install
          npm run build
          npm run test

      # Step 2: E2E Integration Test (Action calls itself locally!)
      - name: Test Custom Runner Action Locally
        uses: ./actions/custom-python-runner # Relative path testing!
        with:
          script-path: 'test-fixtures/sample.py'
```

## Example Action workflow inside `ai-crew-suite/infra`:

```yaml
# Inside ai-crew-suite/infra: .github/workflows/sync-static-configs.yml
name: Distribute System Configs
on:
  push:
    branches: [ main ]
    paths:
      - 'templates/configs/**' # Trigger only when ESLint/TSConfig change

jobs:
  push-to-repos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Consume the file syncing logic owned by your other repo!
      - name: Run Organizational File Sync
        uses: ai-crew-suite/github-tooling/actions/repo-file-sync@v1
        with:
          gh-token: ${{ secrets.INFRA_AUTOMATION_TOKEN }}
          config-map: './sync-manifest.yml'
```
