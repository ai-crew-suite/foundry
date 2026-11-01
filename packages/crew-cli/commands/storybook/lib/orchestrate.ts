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
 * Boots the unified dev-server documentation platform.
 * Passes along critical repository roots so vite-plugin-tsconfig-paths handles routing.
 */
export function runStorybookPipeline(context: WorkspaceContext, forwardedArgs: string[]): boolean {
  console.log(`${chalk.green('📖 AI CREW SUITE: Spinning up self-contained Storybook platform...')}`);

  // Resolve config from our sibling directory location
  const internalConfigDir = path.resolve(__dirname, '../config');

  const result = spawnSync(
    'yarn',
    ['storybook', 'dev', '-p', '6006', '--config-dir', internalConfigDir, ...forwardedArgs],
    {
      stdio: 'inherit',
      shell: true,
      cwd: path.resolve(__dirname, '../../../../'),
      env: {
        ...process.env,
        AI_CREW_SUITE_REPO_ROOT: context.repoRoot
      }
    }
  );

  if (result.error) {
    console.error(chalk.red('❌ Process Execution Error: Failed to invoke Storybook server engine.'), result.error);
    process.exitCode = 1;
    return false;
  }

  // Fallback to 1 ensures abrupt process terminal signals (Ctrl+C) don't falsify a passing exit code
  process.exitCode = result.status ?? 1;
  return result.status === 0;
}
