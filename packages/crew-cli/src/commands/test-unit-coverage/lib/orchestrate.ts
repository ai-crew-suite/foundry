/**
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
 * Orchestrates the full Vitest unit test runner matrix with coverage reports enabled.
 * Redirects configurations back cleanly to the shared test-unit configuration hub.
 */
export function runUnitCoveragePipeline(context: WorkspaceContext, forwardedArgs: string[]): boolean {
  console.log(
    `${chalk.blue('📊 Executing Unit Tests with Coverage for:')} ${chalk.bold(context.packageName)}`
  );

  // Cross-reference sibling configuration location context
  const internalConfigPath = path.resolve(__dirname, '../../test-unit/lib/vitest.config.js');

  const testResult = spawnSync(
    'yarn',
    ['vitest', 'run', '--coverage', '-c', internalConfigPath, ...forwardedArgs],
    {
      stdio: 'inherit',
      shell: true,
      cwd: context.packageDir,
      env: {
        ...process.env,
      }
    }
  );

  if (testResult.error) {
    console.error(chalk.red('❌ Process Execution Error: Failed to invoke Vitest coverage engine.'), testResult.error);
    process.exitCode = 1;
    return false;
  }

  // Fallback to 1 ensures abrupt process terminal signals (Ctrl+C) don't pass as a false success
  process.exitCode = testResult.status ?? 1;
  return testResult.status === 0;
}
