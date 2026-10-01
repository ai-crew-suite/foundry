# Shared ESLint Configuration (`@ai-crew-suite/eslint-config-base`)

Extensible, strictly isolated, and production-ready TypeScript ESLint flat configurations for the AI Crew Suite platform.

## Overview

This package defines the global linting standards and code quality baselines used across all packages in the AI Crew Suite ecosystem. Built on **ESLint Flat Config** and **typescript-eslint**, it enforces strong type-checking rules, consistent style semantics, and code safety across both backend runtimes and frontend codebases.

## Core Responsibilities

* **Strict Type Enforcement**: Configures deep static analysis constraints to eliminate unsafe types, unhandled errors, and unused variables.
* **Environment Isolation**: Exposes decoupled, target-specific configuration profiles natively isolated from one another via sub-paths.
* **Zero-Bleed Dependency Boundaries**: Forces target compilation segregation so backend environments don't import heavy frontend linting dependencies.

## Architectural Dependency Tree

This package establishes the foundation for syntactic and structural health within the broader AI Crew Suite repository network:

* **Upstream Engine**: Wraps core modern lint layers including @eslint/js, typescript-eslint, and runtime globals.
* **Downstream Consumer**: Directly integrated into every engine package, backend module, frontend plugin, and infrastructure tool by referencing specialized sub-exports.
* **Boundary Rule**: Always consume this package using explicit sub-paths (/base, /node, /web). Do not attempt to import from the bare package root.

## Local Development Workflow

### Installation & Builds

Run installation routines and bundle generation tracks directly from the monorepo root:

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/eslint-config-base
```

### Running Verification Tracks

```bash
yarn turbo run lint --filter=@ai-crew-suite/eslint-config-base
```

## Consumer Usage Checklist

To apply these rules inside a consuming application or package within the workspace, integrate the configuration paths using this format.

### Configure the Target Base

Create or edit your local eslint.config.ts file and import the specialized profile array directly:

```typescript
import tseslint from "typescript-eslint";
import nodeConfig from "@ai-crew-suite/eslint-config-base/node";

export default tseslint.config(
  ...nodeConfig,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Package-specific rule overrides or exclusions go here
    files: ["**/*.ts"],
    rules: {}
  }
);
```

### Validation Target Matrix

Ensure your target selections are restricted to the validated entry routes:

* [ ] **@ai-crew-suite/eslint-config-base/base**: Invariant rules common across all JavaScript/TypeScript layers.
* [ ] **@ai-crew-suite/eslint-config-base/node**: Tailored for backend Node.js microservices, orchestration runtimes, and worker pipelines.
* [ ] **@ai-crew-suite/eslint-config-base/web**: Configured specifically for frontend packages, components, and browser environments.

### Usage

```typescript
import nodeConfig from "@my-organization/eslint-config/node";
```

```typescript
import webConfig from "@my-organization/eslint-config/web";
```

### Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
