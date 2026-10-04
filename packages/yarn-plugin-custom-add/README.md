# AI Crew Suite Custom Yarn Add Command

## Overview

The AI Crew Suite monorepos use Yarn Named Catalogs to manage dependency versions, instead of placing versions in individual `package.json` files. The goal is to have a central source of authority in each repo for version numbers across all packages / plugins, and to making keeping all repos in sync with each other on version numbers manageable. There are two named catalogs: `prod` and `dev`. Version numbers for packages are bumped when a `prod` dependency updates; since some dependencies are used in both contexts (like the Crew CLI's `test:unit` command requiring `vitest` as a `prod` dependency, while for most packages it is a `dev` dependency to import in test files), some dependencies are listed in both `prod` and `test` Named Catalogs.

Catalogs are maintained in the `yarnrc.yml` file in the project root. Monorepos also include a Yarn plugin from Backstage that reads the `backstage.json` file kept in the repo root for the version of Backstage, and allows managing that version in a central place. The patterns to use in package / plugin `package.json` files are:

```json
"dependencies": {
    "@backstage/config": "backstage:^",
    "@emotion/react": "catalog:prod"
},
"devDependencies": {
    "@ai-crew-suite/crew-cli": "workspace:*",
    "vitest": "catalog:dev"
},
```

This Yarn plugin improves DX by redirecting `yarn add` to add dependency versions directly in the Named Catalogs (`prod`/`dev`) in `.yarnrc.yml`.  It writes the resolved version into the right catalog, references it from the target package.json as `catalog:<name>`, and exits — the native `add` mutation never runs.

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

## Distribution

To use a published copy in another repository, copy `dist/plugin.cjs` to `.yarn/plugins/yarn-plugin-custom-add.cjs` and register it in `.yarnrc.yml`:

```yml
plugins:
  - path: .yarn/plugins/yarn-plugin-custom-add.cjs
    spec: "@ai-crew-suite/yarn-plugin-custom-add"
```

## Core Responsibilities

- Intercepts `yarn add` via the `validateProject` hook before Yarn writes anything.
- Resolves the version range from the spec (`pkg@range`) or, if omitted, the npm registry's `latest` dist-tag.
- Picks the `prod` or `dev` catalog based on `-D`/`--dev`.
- Picks the target package.json:
  - No `--target`: the monorepo root, `devDependencies` only (`dependencies` additions are rejected, and root additions ask for confirmation).
  - `--target <name>`: a package resolved by name via the root `tsconfig.json`'s `references`.
  - `--target <path>`: a `packages/**` or `plugins/**` relative path, used when the package isn't listed in `tsconfig.json` `references`.
- Updates `.yarnrc.yml` and the target package.json in place, preserving existing comments/formatting.
- Runs `yarn install` to link the new catalog entry.

## Local Development Workflow

```sh
# Verify formatting and linting
yarn turbo run lint --filter=@ai-crew-suite/yarn-plugin-custom-add

# Run tests
yarn turbo run test:unit --filter=@ai-crew-suite/yarn-plugin-custom-add

# Build
yarn turbo run build --filter=@ai-crew-suite/yarn-plugin-custom-add
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
