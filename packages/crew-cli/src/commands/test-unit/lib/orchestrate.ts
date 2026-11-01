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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import type { WorkspaceContext } from '../../../utils/workspace';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Local Vitest config file names that packages may provide to customize their test setup. */
const LOCAL_VITEST_CONFIG_FILENAMES = [
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mts',
  'vitest.config.mjs',
  'vitest.config.cts',
  'vitest.config.cjs',
];

/**
 * Orchestrates the full Vitest unit test runner matrix.
 * Targets the package-specific folder context and manages process exit states cleanly.
 *
 * Config selection order: an explicit `--config` flag forwarded by the developer
 * always wins, then a local `vitest.config.*` in the package directory (the
 * consumer-side extension point), and finally the shared crew-cli config —
 * so packages need no boilerplate config unless they actually customize something.
 */
export function runUnitTestsPipeline(context: WorkspaceContext, forwardedArgs: string[]): boolean {
  console.log(
    `${chalk.blue('🧪 Executing Unit Tests for:')} ${chalk.bold(context.packageName)} ${chalk.gray(`(${context.role})`)}`
  );

  const hasExplicitConfigFlag = forwardedArgs.includes('-c') || forwardedArgs.includes('--config');
  const hasLocalConfig = LOCAL_VITEST_CONFIG_FILENAMES.some((filename) =>
    fs.existsSync(path.resolve(context.packageDir, filename)),
  );

  if (!hasExplicitConfigFlag && hasLocalConfig) {
    console.log(`${chalk.gray('⎋ Detected a local vitest config — letting Vitest use it instead of the shared crew-cli config')}`);
  }

  const configArgs = hasExplicitConfigFlag || hasLocalConfig ? [] : ['-c', path.resolve(__dirname, 'vitest.config.js')];

  const testResult = spawnSync(
    'yarn',
    ['vitest', 'run', ...configArgs, ...forwardedArgs],
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
    console.error(chalk.red('❌ Process Execution Error: Failed to invoke Vitest engine.'), testResult.error);
    process.exitCode = 1;
    return false;
  }

  // Fallback to 1 ensures abrupt process terminal signals (Ctrl+C) don't pass as false successes
  process.exitCode = testResult.status ?? 1;
  return testResult.status === 0;
}
