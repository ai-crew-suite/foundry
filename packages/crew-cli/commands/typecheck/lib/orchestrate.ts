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
import { createRequire } from 'node:module';
import path from 'node:path';
import chalk from 'chalk';

const require = createRequire(import.meta.url);

/**
 * Orchestrates the full static TypeScript validation task loop.
 * Updates native environment tracking hooks rather than forcing hard shutdowns.
 *
 * @returns boolean true if type checking passed perfectly, false on compiler/runtime failures.
 */
export function runTypecheckPipeline(forwardedArgs: string[]): boolean {
  const currentWorkingDir = process.cwd();

  console.log(`${chalk.blue('⎋ Executing static typecheck analysis in:')} ${chalk.gray(currentWorkingDir)}`);

  const typescriptPackageJson = require.resolve('typescript/package.json');
  const typescriptCliPath = path.resolve(
    path.dirname(typescriptPackageJson),
    'bin/tsc',
  );

  const result = spawnSync(
    process.execPath,
    [typescriptCliPath, '--noEmit', ...forwardedArgs],
    {
      stdio: 'inherit',
      shell: true,
      cwd: currentWorkingDir,
      env: {
        ...process.env,
      }
    },
  );

  if (result.error) {
    console.error(chalk.red(`❌ Process Execution Error: Failed to invoke typecheck engine.`), result.error);
    process.exitCode = 1;
    return false;
  }

  if (result.status !== 0) {
    // Fallback to 1 ensures abrupt process terminal signals (Ctrl+C) don't pass as a false success
    process.exitCode = result.status ?? 1;
    return false;
  }

  console.log(`${chalk.green('✅ Typecheck verification passed successfully!')}\n`);
  process.exitCode = 0;
  return true;
}
