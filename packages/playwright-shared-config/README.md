# `@ai-crew-suite/playwright-config-base`

Extensible, strictly isolated, and production-ready Playwright integration configuration tracks for the AI Crew Suite platform.
### Overview

This package defines the cross-environment validation configurations and end-to-end testing profiles used across the AI Crew Suite platform. Built using typed compilation layers, it locks down browser targets, test directories, and parallel worker topologies to ensure repeatable validation steps on both engineer machines and continuous integration (CI) infrastructure.

## Core Responsibilities

* **Test Topology Synchronization**: Standardizes retry thresholds, timeouts, and parallelization limits across packages.
* **Isolated Target Testing**: Separates pure API integration testing presets from resource-heavy UI browser runner setups.
* **Continuous Integration Parity**: Dynamically shifts trace logging levels and worker configurations based on ambient CI environments.

## Architectural Dependency Tree

This package structures end-to-end testing architectures across the development landscape:

* **Upstream Engine**: Leverages native, typed configuration definitions provided by @playwright/test.
* **Downstream Consumer**: Extended directly by local playwright.config.ts modules sitting in core engines and service plugins.
* **Boundary Rule**: Always consume this package using explicit sub-paths (/base, /node, /web). Do not attempt to import from the bare package root.

## Local Development Workflow

### Installation & Builds

Run installation routines and bundle generation tracks directly from the monorepo root:

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/playwright-config-base
```

### Running Verification Tracks

```bash
yarn turbo run lint --filter=@ai-crew-suite/playwright-config-base
```

## Consumer Usage Checklist

To apply these validation tracks inside a local repository target, structure your local file using this structure:

## Configure the Target Base

Create or edit your local playwright.config.ts file, importing your targeted runner configuration:

```typescript
import { type PlaywrightTestConfig } from "@playwright/test";
import webConfig from "@ai-crew-suite/playwright-config-base/web";

const config: PlaywrightTestConfig = {
  ...webConfig,
  use: {
    ...webConfig.use,
    baseURL: "http://localhost:3000"
  }
};

export default config;
```

### Validation Target Matrix

Ensure your configuration extensions utilize the verified entry layers:

* [ ] **@ai-crew-suite/playwright-config-base/base**: Invariant rules common across all end-to-end testing cycles.
* [ ] **@ai-crew-suite/playwright-config-base/node**: Specialized for pure API testing, background ingest validation, or network interface testing.
* [ ] **@ai-crew-suite/playwright-config-base/web**: Configured specifically for heavy multi-browser user interface workflows.

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
