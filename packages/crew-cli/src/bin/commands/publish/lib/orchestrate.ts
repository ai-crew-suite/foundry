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
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Orchestrates workspace package registry releases via changesets.
 * Validates workspace root constraints and forwards execution hooks cleanly.
 *
 * @returns boolean true if the execution succeeded, false if validation or publishing failed.
 */
export function runPublishPipeline(forwardedArgs: string[]): boolean {
  const currentWorkingDir = process.cwd();

  // 1. Guardrail: Enforce running strictly from the Monorepo Root Workspace
  const hasRootFiles = fs.existsSync(path.resolve(currentWorkingDir, 'turbo.json')) && 
                       fs.existsSync(path.resolve(currentWorkingDir, '.changeset'));

  if (!hasRootFiles) {
    console.error(
      `\n\x1b[31m❌ Release Policy Violation:\x1b[0m 'crew publish' must be executed from the monorepo root.\n` +
      `   Current directory: ${currentWorkingDir}\n`
    );
    process.exitCode = 1;
    return false;
  }

  // 2. Output custom deployment headers reflecting your new scope namespace
  console.log('\n\x1b[35m┌────────────────────────────────────────────────────────┐\x1b[0m');
  console.log(`\x1b[35m│ 🚀 AI CREW SUITE: Deploying Scope Targets (@ai-crew)   │\x1b[0m`);
  console.log('\x1b[35m└────────────────────────────────────────────────────────┘\x1b[0m\n');

  // 3. Hand off execution cleanly to Changesets
  const publishResult = spawnSync(
    'yarn',
    ['changeset', 'publish', ...forwardedArgs],
    {
      stdio: 'inherit',
      shell: true,
      cwd: currentWorkingDir,
      env: {
        ...process.env,
      }
    }
  );

  if (publishResult.error) {
    console.error('\x1b[31m❌ Process Execution Error: Failed to invoke yarn changeset orchestration.\x1b[0m', publishResult.error);
    process.exitCode = 1;
    return false;
  }

  // 4. Fallback to 1 to protect CI workflows against unexpected null kills/signals
  process.exitCode = publishResult.status ?? 1;
  return publishResult.status === 0;
}
