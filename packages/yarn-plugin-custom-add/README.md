# AI Crew Suite Custom Yarn Catalog Command Plugin

## Overview

The AI Crew Suite monorepos use Yarn Named Catalogs to manage dependency versions centrally instead of placing version strings directly into individual package manifests. This establishes a central source of authority for version compliance across all packages and plugins.

There are two primary named catalogs maintained within the root `.yarnrc.yml` file:

* `prod`: Production dependencies.
* `dev`: Development and tooling dependencies.

### Dependency Protocols Pattern

To maintain catalog alignment, package and plugin `package.json` manifests must strictly utilize the following protocols:

```json
"dependencies": {
    "@backstage/config": "backstage:^",
    "@emotion/react": "catalog:prod"
},
"devDependencies": {
    "@ai-crew-suite/crew-cli": "workspace:*",
    "vitest": "catalog:dev"
}
```

This plugin improves developer workflow and enforces dependency catalog compliance by providing a transactional, atomic wrapper command. It intercepts public metadata ranges, commits them directly to your root catalogs, references them inside the target package manifest as `catalog:<name>`, and executes an integrated workspace installation in-memory.

## Governance Safeguard: Native `yarn add` Blocking

To ensure absolute compliance with configuration drift policies, **the native `yarn add` command is completely disabled in this repository** across all developer environments (including Windows shells). Attempting to execute `yarn add` will abort immediately without modifying any workspace files.

## Usage

All dependency updates must be executed via the custom `catalog-add` command:

```sh
# Add to the root package.json devDependencies (prompts for confirmation)
yarn catalog-add typescript --dev

# Add a production dependency to a specific package workspace resolved by name
yarn catalog-add lodash --target @ai-crew-suite/crew-cli

# Add a development dependency to a package workspace resolved by relative path
yarn catalog-add lodash --target packages/crew-cli --dev

# Add a package with an explicit version constraint instead of fetching npm "latest"
yarn catalog-add lodash@^4.17.21 --target packages/crew-cli
```

## Core Responsibilities

* **Preemptive Interception**: Blocks native `yarn add` via early-boot `setupScriptEnvironment` hooks before any files are altered on disk.
* **Version Spec Resolution**: Extracts version tokens using industry-standard `npm-package-arg`. If the version string is omitted, it queries the authenticated registry server for the `latest` dist-tag using Yarn's built-in proxy-aware `httpUtils`.
* **Target Workspace Mapping**: Automatically resolves directories using Yarn's runtime workspace memory graph or relative containment bounds. It prevents path traversal exploits outside of the repository root.
* **Transactional File Flushes**: Updates `.yarnrc.yml` and the target `package.json` completely in-memory, performing atomic writes to physical disk assets only after absolute verification while preserving layout aesthetics, comments, and spacing alignments.
* **Integrated Installation**: Automatically invokes an in-memory `project.install()` sequence immediately following successful file writes to lock down the dependency tree.

## Distribution & Installation

This plugin is compiled as a self-contained, version-tagged CommonJS bundle. To install or update the plugin inside a workspace repository, copy the target compiled asset to your local plugin storage folder and map the relative registration reference inside your root `.yarnrc.yml`:

```yml
plugins:
  - path: .yarn/plugins/yarn-plugin-custom-add-v0.0.1.cjs
    spec: "@ai-crew-suite/yarn-plugin-custom-add"
```

## Local Development Workflow

Execute development and quality assurance scripts through Turborepo from the root directory:

```sh
# Run type checking and static analysis validations
yarn turbo run typecheck --filter=@ai-crew-suite/yarn-plugin-custom-add

# Verify formatting and code style compliance
yarn turbo run lint --filter=@ai-crew-suite/yarn-plugin-custom-add

# Run fast, isolated in-memory unit tests
yarn turbo run test:unit --filter=@ai-crew-suite/yarn-plugin-custom-add

# Execute the sandboxed E2E integration fixture test suite (Compiles artifact first)
yarn turbo run test:integration --filter=@ai-crew-suite/yarn-plugin-custom-add

# Build the production-ready distribution bundle assets
yarn turbo run build --filter=@ai-crew-suite/yarn-plugin-custom-add
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
