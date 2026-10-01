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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import type { WorkspaceContext } from '../../../utils/workspace';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Orchestrates the full Playwright E2E execution matrix.
 * Targets the local workspace context and prevents silent failures on terminated states.
 */
export function runE2EPipeline(context: WorkspaceContext, forwardedArgs: string[]): boolean {
  console.log(`${chalk.magenta('🎭 AI CREW SUITE: Orchestrating Playwright E2E Runner matrix')}`);

  // Resolve config path directly targeting our sibling configuration file
  const internalConfigPath = path.resolve(__dirname, 'playwright.config.js');

  const result = spawnSync(
    'yarn', 
    ['playwright', 'test', '--config', internalConfigPath, ...forwardedArgs], 
    {
      stdio: 'inherit',
      shell: true,
      cwd: context.repoRoot,
      env: {
        ...process.env,
      }
    }
  );

  if (result.error) {
    console.error(chalk.red('❌ Process Execution Error: Failed to invoke Playwright engine.'), result.error);
    process.exitCode = 1;
    return false;
  }

  // Use fallback code 1 to protect CI pipelines if the runner process is abruptly killed (status: null)
  process.exitCode = result.status ?? 1;
  return result.status === 0;
}
