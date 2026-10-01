# `@ai-crew-suite/yarn-plugin-custom-sync-config-types`

## Overview

This package ships a small CLI, `sync-config-types`, that keeps a Backstage plugin's runtime type declarations in sync with its published `config.d.ts` schema. It parses `config.d.ts` with the TypeScript compiler API, extracts the raw type of a single `Config` interface property (the `ai` block by default), and writes it to a standalone, machine-generated TypeScript file.

This keeps `config.d.ts` self-contained for config-schema loading while ensuring runtime source code never imports it directly, so the emitted `dist-types` tree stays resolvable by the declaration bundler.

> Despite the package name (kept for consistency with its sibling `yarn-plugin-custom-*` packages), this is **not** a Yarn resolver/hook plugin like `@ai-crew-suite/yarn-plugin-custom-install`. It is a regular npm dependency that exposes a `sync-config-types` binary.

## Core Responsibilities

- Parses `config.d.ts` and locates the top-level `Config` interface.
- Extracts the source text of a named property's type (`ai` by default).
- Writes a `MACHINE GENERATED DO NOT MODIFY DIRECTLY` file exporting that type under a stable name (`AiBackendConfig` by default).
- Fails loudly with a descriptive error when the requested property is missing.

## Local Development Workflow

Build the package before publishing or linking it locally:

```sh
yarn workspace @ai-crew-suite/yarn-plugin-custom-sync-config-types build
```

Run the unit tests:

```sh
yarn workspace @ai-crew-suite/yarn-plugin-custom-sync-config-types test:unit
```

## Consumer Usage

Add the package as a `devDependency` of a Backstage plugin package that ships a `config.d.ts` file at its root and a `src/types/index.ts` runtime types file, then add a script:

```json
{
  "scripts": {
    "sync-config-types": "sync-config-types"
  }
}
```

```sh
yarn sync-config-types
```

By default the CLI reads `config.d.ts` and writes `src/types/index.ts`, both resolved relative to the current working directory (the consuming package's root). For custom property names, exported type names, or paths, call the underlying library function directly from a small script:

```ts
import { syncConfigTypes } from '@ai-crew-suite/yarn-plugin-custom-sync-config-types';

syncConfigTypes({
  configDtsPath: 'config.d.ts',
  targetTypesPath: 'src/types/search.ts',
  propertyName: 'search',
  exportedTypeName: 'SearchBackendConfig',
});
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
