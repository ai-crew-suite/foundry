#!/usr/bin/env node
/*
 * Copyright 2026 The AI Crew Suite Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { syncConfigTypes } from "../sync";

/**
 * Executable entry point for package.json scripts orchestrated via Turborepo.
 * Automatically deduces layout bounds based on conventional process context pointers.
 */
function main(): void {
  const currentWorkspaceDir = process.cwd();

  // Establish conventional path alignments for Backstage IDP plugin packages
  const configDtsPath = resolve(currentWorkspaceDir, "config.d.ts");
  const targetTypesPath = resolve(currentWorkspaceDir, "src/types/config.generated.ts");

  // Operational Guardrail: If a plugin doesn't have a config.d.ts, skip gracefully
  // instead of throwing an error. This prevents empty plugins from breaking multi-package Turbo runs.
  if (!existsSync(configDtsPath)) {
    process.stdout.write(`ℹ️ Skipping: No "config.d.ts" file found at the root of ${currentWorkspaceDir}\n`);
    process.exit(0);
  }

  try {
    process.stdout.write(`🔄 Synchronizing Backstage configuration types for ${currentWorkspaceDir}...\n`);

    syncConfigTypes({
      configDtsPath,
      targetTypesPath,
      propertyName: "ai",
      exportedTypeName: "AiBackendConfig",
    });

    process.stdout.write(`✅ Success: Synthesized types exported to ${targetTypesPath}\n`);
    process.exit(0);
  } catch (error) {
    process.stderr.write(`❌ Error: Type synchronization execution trace failed:\n`);
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

main();
