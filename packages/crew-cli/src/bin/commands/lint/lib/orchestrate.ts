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
import type { WorkspaceContext } from '../../../utils/workspace';

const require = createRequire(import.meta.url);

export function runLintPipeline(context: WorkspaceContext, forwardedArgs: string[]): boolean {
  console.log(
    `${chalk.blue('🚨 Executing ESLint Analysis for:')} ${chalk.bold(context.packageName)} ${chalk.gray(`(${context.role})`)}`
  );

  const eslintPackageJson = require.resolve('eslint/package.json');
  const eslintBin = path.resolve(path.dirname(eslintPackageJson), 'bin/eslint.js');

  const lintResult = spawnSync(
    process.execPath,
    [eslintBin, '.', ...forwardedArgs],
    {
      stdio: 'inherit',
      shell: true,
      cwd: context.packageDir,
    }
  );

  if (lintResult.error) {
    console.error(
      chalk.red('❌ Process Execution Error: Failed to invoke ESLint engine.'),
      lintResult.error
    );
    process.exitCode = 1;
    return false;
  }

  // Fallback to 1 to prevent silent pass-through failures on aborted/killed statuses
  process.exitCode = lintResult.status ?? 1;
  return lintResult.status === 0;
}
