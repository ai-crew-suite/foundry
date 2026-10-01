# `@ai-crew-suite/renovate-config`

Extensible, high-compliance dependency governance and automation presets for the AI Crew Suite platform.

## Overview

This directory defines the global dependency lifecycle standards, version lock gates, and release tracking workflows used across all codebases in the AI Crew Suite ecosystem. It provides the centralized automation engine that allows independent project repositories to maintain identical security postures and supply-chain barriers automatically.

## Core Responsibilities

* **Supply Chain Hardening**: Enforces strict version pins (such as clamping React to v18 and blocking Material UI v9) to prevent upstream breaking changes from crashing platform runtimes.
* **Release Impact Isolation**: Groups and separates incoming PR notifications based on change-impact intent (`prod` vs `dev`), automatically notifying developers when a package requires a production root version bump.
* **Audit Trail Generation**: Restricts third-party GitHub Action mutations to strict, tamper-evident cryptographic hashes while cleanly appending human-readable SemVer code annotations.

## Architectural Dependency Tree

This configuration block establishes the baseline for dependency integrity and automated compliance across the broader AI Crew Suite repository network:

* **Upstream Engine**: Governed by the native Renovate runtime schema and Yarn Catalog manager specifications.
* **Downstream Consumer**: Directly consumed by every active project repository (such as `ai-crew-suite/platform`) over high-performance GitHub API data layers.
* **Boundary Rule**: Other repositories must fetch this configuration directly using native Git-hosted relative paths. Do not attempt to import this as an npm package dependency.

## Local Development Workflow

### Installation & System Verification

Because this is a static declaration block, it requires no local compilation or bundling steps. To verify syntax validity against the Renovate schemas, run the verification tracks directly from the monorepo root:

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/renovate-config test
```

### Running Verification Tracks Local Dry-Runs

To validate changes against your local repository before merging, you can run a local test compilation:

```bash
npx renovate-config-validator packages/renovate-config/global-rules.json
```

## Consumer Usage Checklist

To inherit these global dependency standards and automated PR note templates inside an external platform or project repository, drop a `renovate.json` file into the root of that repository using this exact format:

### Configure the Target Base

Create or edit your target application's local `renovate.json` file:

```json
// consumer-repo/renovate.json
{
  "$schema": "https://renovatebot.com",
  "extends": [
    "github>ai-crew-suite/foundry//packages/renovate-config/global-rules.json"
  ]
}
```

### Validation Target Matrix

Ensure your configuration architecture maps exactly to these validated execution endpoints:

* [ ] **`github>ai-crew-suite/foundry//packages/renovate-config/global-rules.json`**: The core endpoint used by external project repositories to pull down global pins, schedule parameters, and release impact note blocks.
* [ ] **`local>packages/renovate-config/global-rules.json`**: The internal fallback path used strictly inside the root of the `ai-crew-suite/foundry` repository to evaluate rules locally without network loops.

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
