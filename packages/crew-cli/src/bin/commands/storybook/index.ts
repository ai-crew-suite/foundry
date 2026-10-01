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
import { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { getWorkspaceContext } from '../../utils/workspace.js';

const program = new Command();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

program
  .name('storybook')
  .description('Boot up the consolidated interactive Storybook documentation server')
  .allowUnknownOption(true)
  .action(() => {
    const context = getWorkspaceContext();
    console.log(`${chalk.green('📖 AI CREW SUITE: Spinning up self-contained Storybook platform...')}`);

    const internalConfigDir = path.resolve(__dirname, 'config');
    const forwardedArgs = process.argv.slice(3);

    const result = spawnSync('yarn', ['storybook', 'dev', '-p', '6006', '--config-dir', internalConfigDir, ...forwardedArgs], {
      stdio: 'inherit',
      shell: true,
      cwd: path.resolve(__dirname, '../../../../'), // packages/cli
      env: {
        ...process.env,
        AI_CREW_SUITE_REPO_ROOT: context.repoRoot
      }
    });

    process.exit(result.status ?? 0);
  });

program.parse(process.argv);
