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

/**
 * Orchestrates file formatting using Prettier.
 * Enforces a strict no-process-exit layout contract.
 */
export function runFormatPipeline(context: WorkspaceContext, forwardedArgs: string[]): boolean {
  console.log(`${chalk.blue('✨ Formatting text layouts inside:')} ${chalk.bold(context.packageName)}`);

  const prettierPackageJsonPath = require.resolve('prettier/package.json');
  const prettierPackageJson = require(prettierPackageJsonPath) as {
    bin?: string | Record<string, string>;
  };

  // Resolve the CLI entry from the installed Prettier's own "bin" field so the
  // pipeline survives bin layout changes across Prettier major versions
  // (v2 shipped "bin-prettier.js" at the package root, v3 ships "bin/prettier.cjs").
  const prettierBinEntry = typeof prettierPackageJson.bin === 'string'
    ? prettierPackageJson.bin
    : prettierPackageJson.bin?.['prettier'];

  if (!prettierBinEntry) {
    console.error(chalk.red('❌ Failed to resolve the Prettier CLI entrypoint from its package.json "bin" field.'));
    process.exitCode = 1;
    return false;
  }

  const prettierBin = path.resolve(path.dirname(prettierPackageJsonPath), prettierBinEntry);

  // If the user doesn't pass specific targets, default to checking/writing the current package directory files
  const executionFlags = forwardedArgs.length > 0 ? forwardedArgs : ['--write', '.'];

  const formatResult = spawnSync(
    process.execPath,
    [prettierBin, ...executionFlags],
    {
      stdio: 'inherit',
      shell: true,
      cwd: context.packageDir,
      env: {
        ...process.env,
      }
    }
  );

  if (formatResult.error) {
    console.error(chalk.red('❌ Process Execution Error: Failed to invoke Prettier engine.'), formatResult.error);
    process.exitCode = 1;
    return false;
  }

  process.exitCode = formatResult.status ?? 1;
  return formatResult.status === 0;
}
