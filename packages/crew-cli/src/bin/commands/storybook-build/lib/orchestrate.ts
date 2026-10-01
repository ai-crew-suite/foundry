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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Compiles a static distribution bundle of workspace stories using the shared configuration hub.
 * Updates native environment tracking hooks rather than triggering hard shutdowns.
 */
export function runStorybookBuildPipeline(forwardedArgs: string[]): boolean {
  console.log(`${chalk.green('📦 AI CREW SUITE: Compiling static documentation artifact layers...')}`);

  // Point back cleanly to the shared storybook configuration folder context
  const internalConfigDir = path.resolve(__dirname, '../../storybook/config');

  const result = spawnSync(
    'yarn',
    ['storybook', 'build', '--config-dir', internalConfigDir, ...forwardedArgs], 
    {
      stdio: 'inherit',
      shell: true,
      cwd: path.resolve(__dirname, '../../../../')
    }
  );

  if (result.error) {
    console.error(chalk.red('❌ Process Execution Error: Failed to invoke Storybook build compiler engine.'), result.error);
    process.exitCode = 1;
    return false;
  }

  // Fallback to 1 ensures abrupt process terminal signals (Ctrl+C) don't pass as a false success code 0
  process.exitCode = result.status ?? 1;
  return result.status === 0;
}
