# `@ai-crew-suite/prettier-config-base`

Extensible, strictly isolated, and production-ready formatting configurations for the AI Crew Suite platform.

## Overview

This package defines the global formatting standards and visual semantics used across all packages in the AI Crew Suite ecosystem. Built on native ES Modules, it enforces strict syntax consistency across both backend microservices and frontend browser codebases.

## Core Responsibilities

* **Formatting Uniformity**: Sets invariant baseline layout syntax rules (indentation, line width, single-vs-double quotes) across code layers.
* **Environment Isolation**: Exposes target-specific formatting variations isolated behind compiled subpaths.
* **Modern Build Integration**: Seamlessly maps properties to target workspaces without introducing runtime weight or overhead.

## Architectural Dependency Tree

This package establishes the foundation for syntactic layout health within the broader AI Crew Suite repository network:

* **Upstream Engine**: Built directly on native prettier structural interfaces.
* **Downstream Consumer**: Directly integrated into every engine package, backend module, frontend plugin, and infrastructure tool by referencing specialized sub-exports.
* **Boundary Rule**: Always consume this package using explicit sub-paths (/base, /node, /web). Do not attempt to import from the bare package root.

## Local Development Workflow

### Installation & Builds

Run installation routines and bundle generation tracks directly from the monorepo root:

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/prettier-config-base
```

### Running Verification Tracks

```bash
yarn turbo run lint --filter=@ai-crew-suite/prettier-config-base
```

## Consumer Usage Checklist

To apply these formatting standards inside a consuming application or package within the workspace, integrate the configuration paths using this format:

### Configure the Target Base

Create or edit your local prettier.config.js file and spread the profile object:

```typescript
// consumer-repo/prettier.config.ts
import { type Config } from "prettier";
import webConfig from "@ai-crew-suite/prettier-config-base/web";

const config: Config = {
  ...webConfig,
  // Package-specific structural overrides or target overrides go here
};

export default config;
```

Use code with caution.

### Validation Target Matrix

Ensure your target selections are restricted to the validated entry routes:

* [ ] **@ai-crew-suite/prettier-config-base/base**: Invariant rules common across all style layers.
* [ ] **@ai-crew-suite/prettier-config-base/node**: Tailored for backend Node.js microservices, orchestration runtimes, and worker pipelines.
* [ ] **@ai-crew-suite/prettier-config-base/web**: Configured specifically for frontend packages, components, and browser layout environments.

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
