# 🧰 AI Crew Suite CLI & Developer Toolbelt

This package is the centralized developer toolbelt and workspace orchestrator for use in AI Crew Suite repos. It consolidates all building, cleaning, linting, typechecking, and testing workflows into a single, high-performance binary utility.

By managing tooling constraints centrally within this package, we can upgrade, patch, or alter repo-wide build steps without touching or changing individual package script blocks across our 60+ workspaces.

## 🚀 Consuming this Toolbelt

Every package in the monorepo utilizes the uniform `crew` binary interface. To configure a child workspace, simply link the tool and expose its sub-commands within the package's local `package.json`:

```json
{
  "name": "@ai-crew-suite/my-frontend-plugin",
  "scripts": {
    "build": "crew build",
    "clean": "crew clean",
    "lint": "crew lint",
    "test:unit:coverage": "crew test:unit:coverage",
    "test:unit": "crew test:unit",
    "typecheck": "crew typecheck"
  },
  "devDependencies": {
    "@ai-crew-suite/crew-cli": "workspace:*"
  }
}
```

## 🏛️ Core Features & Architecture

The CLI uses a smart tree-climbing utility (`getWorkspaceContext()`) that reads the executing folder's `package.json` and evaluates Spotify Backstage metadata parameters natively to understand its exact environment constraints.

```json
"backstage": {
  "role": "frontend-plugin"
}
```

### 🧠 Semantic Environment Routing

The tool maps the active workspace's roles into clear semantic runtime boundaries on the fly. This prevents developers from having to configure boilerplate environment scripts:

- **`isBrowser` Core Targets:** Mapped automatically for `frontend`, `frontend-plugin`, `frontend-plugin-module`, and `web-library`. Automatically sets Vitest to boot in a **JSDOM** sandbox and pulls down browser-specific lint rulesets.
- **`isServer` Core Targets:** Mapped automatically for `backend`, `backend-plugin`, `backend-plugin-module`, `node-library`, `cli`, and `cli-module`. Sets Vitest to a native, high-speed **Node** execution loop and enables server-side runtime validations.

### 🛡️ Resilient Process & Type Architecture

The toolbelt architecture is constructed following modern, deterministic execution patterns:

- **Decoupled Entrypoints:** `index.ts` files act strictly as lightweight declarative shells. All business rules, process spawning pipelines, and validation steps reside in pure, decoupled modules (`lib/orchestrate.ts` or `lib/sync.ts`).
- **Safe Exit Code Trapping:** The codebase enforces a strict **no-process-exit** layout policy. Subprocesses mutate `process.exitCode` natively and return control back to the event loop gracefully. This allows streams to finish draining and avoids abruptly halting asynchronous execution queues.
- **Deterministic Execution & Fail-safes:** If a child process is forcefully killed or timed out by a CI agent (yielding a `null` exit status), the orchestrator intercepts the signal and forces an exit status of `1` instead of leaking a false zero success code.
- **Extension-Free Resolution:** Clean TypeScript module boundaries are maintained throughout. Suffix paths like `.js` inside source file imports have been completely eliminated.
- **Backstage Ecosystem Shimming:** To support testing suites relying on upstream Backstage utility libraries (which look for native Jest testing hooks), the `test-unit` engine automatically mounts a global compatibility layer mapping `globalThis.jest` hooks directly to highly performant native Vitest vectors (`vi.fn()` and `vi.spyOn()`).

## 🛠️ The Global Command Matrix

Run any command using `crew <command>` from within a package folder, or target it globally through Turborepo. All native command flags are transparently passed down directly to the underlying compiler engines:

```bash
# Examples of transparent flag forwarding
crew typecheck --watch
crew test:unit --update
crew lint --fix
```

| Sub-command                   | Purpose                                                                       | Cache Policy              |
| ----------------------------- | ----------------------------------------------------------------------------- | ------------------------- |
| **`crew clean`**              | Clears local caching matrices and `dist/` folders safely with root guards.    | Cache Bypass              |
| **`crew build`**              | Wraps backstage-cli package compilation rules.                                | Cacheable (`dist/**`)     |
| **`crew format`**             | Run automated text style formatting across the workspace layout via Prettier. | Cacheable                 |
| **`crew lint`**               | Performs zero-config ESLint Flat rules evaluations.                           | Cacheable                 |
| **`crew typecheck`**          | Forces local `tsc --noEmit` compiler checks.                                  | Cacheable                 |
| **`crew sync:refs`**          | Synchronizes TypeScript Project References alphabetically and heals roots.    | Cache Bypass              |
| **`crew test:unit`**          | Fast, local, in-memory unit test matrix runner via Vitest.                    | Cacheable                 |
| **`crew test:unit:coverage`** | Comprehensive V8 block-coverage metric collection run.                        | Cacheable (`coverage/**`) |
| **`crew test:e2e`**           | Enterprise Playwright integration test suite browser pipeline.                | Cacheable                 |
| **`crew storybook`**          | Launches a self-contained Vite development documentation hub.                 | Live Watch                |
| **`crew storybook:build`**    | Bundles static distribution UI document artifacts.                            | Cacheable                 |

## 💻 Local CLI Development Workflow

When actively refactoring or changing the CLI package itself, Vitest and `tsx` bypass the `dist/` compilation loop entirely to let you validate source files instantly from the live, raw `src/` tree with no stale cache leakage:

### Execute unit and integration tests against local raw TypeScript source files

```bash
yarn turbo run test:unit --filter=@ai-crew-suite/crew-cli
```

### Run local code-coverage metric scans against the CLI package

```bash
yarn turbo run test:unit:coverage --filter=@ai-crew-suite/crew-cli
```

### Compile changes fresh using Rollup

```bash
yarn turbo run build --filter=@ai-crew-suite/crew-cli
```

## 🧩 Shared Config Subpath Exports

This toolkit exposes zero-boilerplate configuration hooks directly to the monorepo ecosystem. For example, your master root-level configuration maps straight to the CLI's internal compiled code vectors using Yarn Workspaces link aliases:

```javascript
// eslint.config.js (At Monorepo Root)
import { createFlatConfigForWorkspace } from '@ai-crew-suite/crew-cli';

export default createFlatConfigForWorkspace();
```

## 🛟 Self-Linting Special Exception

Because a node package cannot safely invoke its own uncompiled workspace binary hook while running clean cycles on its own files, the CLI uses a localized direct file pointer to trigger its code validation passes:

```json
"scripts": {
  "lint": "node ./dist/bin/crew.js lint"
}
```

### Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
