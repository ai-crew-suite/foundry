# `@ai-crew-suite/yarn-plugin-custom-add`

## Overview

This Yarn plugin redirects `yarn add` so that dependency versions always live in the named catalogs (`prod`/`dev`) defined in `.yarnrc.yml`, instead of as raw semver ranges scattered across package.json files. When it detects an `add` invocation it writes the resolved version into the right catalog, references it from the target package.json as `catalog:<name>`, and exits — the native `add` mutation never runs.

## Core Responsibilities

- Intercepts `yarn add` via the `validateProject` hook before Yarn writes anything.
- Resolves the version range from the spec (`pkg@range`) or, if omitted, the npm registry's `latest` dist-tag.
- Picks the `prod` or `dev` catalog based on `-D`/`--dev`.
- Picks the target package.json:
  - No `--target`: the monorepo root, `devDependencies` only (`dependencies` additions are rejected, and root additions ask for confirmation).
  - `--target <name>`: a package resolved by name via the root `tsconfig.json`'s `references`.
  - `--target <path>`: a `packages/**` or `plugins/**` relative path, used when the package isn't listed in `tsconfig.json` `references`.
- Updates `.yarnrc.yml` and the target package.json in place, preserving existing comments/formatting.

## Usage

```sh
# Root devDependency (prompts for confirmation)
yarn add typescript --dev

# A specific package, resolved by name from tsconfig.json references
yarn add lodash --target @ai-crew-suite/crew-cli

# A specific package, resolved by path (e.g. not yet listed in tsconfig.json references)
yarn add lodash --target packages/crew-cli --dev

# Explicit version instead of resolving npm's "latest"
yarn add lodash@^4.17.21 --target packages/crew-cli
```

After it runs, re-run `yarn install` to link the new catalog entry.

## Local Development Workflow

```sh
# Verify formatting and linting
yarn turbo run lint --filter=@ai-crew-suite/yarn-plugin-custom-add

# Run tests
yarn turbo run test:unit --filter=@ai-crew-suite/yarn-plugin-custom-add

# Build
yarn turbo run build --filter=@ai-crew-suite/yarn-plugin-custom-add
```

To use a published copy in another repository, copy `dist/plugin.cjs` to `.yarn/plugins/yarn-plugin-custom-add.cjs` and register it in `.yarnrc.yml`:

```yml
plugins:
  - path: .yarn/plugins/yarn-plugin-custom-add.cjs
    spec: "@ai-crew-suite/yarn-plugin-custom-add"
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
