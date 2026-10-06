# Shared Configuration for TypeScript `tsconfig.json` Files

Extensible, deterministic, and workspace-aware TypeScript configuration targets for the AI Crew Suite platform.

## Overview

This package defines the foundational TypeScript compiler configurations and target compilation footprints used across the AI Crew Suite ecosystem. By standardizing strict compiler flags and path boundaries, it guarantees uniform build behavior, type safety, and optimal output targets for both backend engines and frontend extensions.

## Usage

To apply these compilation standards inside a consuming application or package within the workspace, integrate the configuration targets using this format:

### Configure the Target Extension

Create or edit local `tsconfig.json` files and point the `extends` directive to a target profile:

```json
{
  "extends": "@ai-crew-suite/typescript-shared-config/node",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@src/*": ["./src/*"]
    }
  }
}
```

### Validation Target Matrix

Ensure your workspace extension selections map strictly to the verified entry points:

- [ ] **@ai-crew-suite/typescript-shared-config**: Standard baseline options containing immutable constraints invariant across all targets.
- [ ] **@ai-crew-suite/typescript-shared-config/node**: Tailored for backend microservices and agent execution layers (configures NodeNext resolution and targets dist/ compilation tracks).
- [ ] **@ai-crew-suite/typescript-shared-config/web**: Configured specifically for frontend packages, browser runtimes, and bundler compilation matrices (suppresses emissions via noEmit).

## Core Responsibilities

- **Strict Mode Enforcement**: Locks down compiler options (strict, isolatedModules, esModuleInterop) to prevent runtime type bleeding and build escapes.
- **Dynamic Context Resolution**: Leverages modern TypeScript ${configDir} routing to anchor source inputs, exclusions, and distribution output folders dynamically relative to the inheriting project's workspace.
- **Target Optimization**: Segregates engine runtime requirements into decoupled target configurations for NodeNext/ES2022 runtimes and bundler-driven frontend environments.

## Architectural Dependency Tree

This package functions as the core compilation contract within the broader AI Crew Suite ecosystem:

- **Upstream Engine**: Built directly on native typescript syntax features (v5.0.0+).
- **Downstream Consumer**: Directly extended by the tsconfig.json of every package, microservice, provider module, and plugin in the repository.
- **Boundary Rule**: Do not define custom base configurations locally inside consuming packages. All core compiler settings must inherit directly from a validated sub-profile export.

## Local Development Workflow

This package exports raw JSON configuration footprints. No intermediate bundle pass is required. Verify package layout directly from the monorepo root:

```bash
yarn install --refresh
# Verify formatting and linting
yarn turbo run lint --filter=@ai-crew-suite/typescript-shared-config

# Run tests
yarn turbo run test:unit --filter=@ai-crew-suite/typescript-shared-config

# Build
yarn turbo run build --filter=@ai-crew-suite/typescript-shared-config
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
