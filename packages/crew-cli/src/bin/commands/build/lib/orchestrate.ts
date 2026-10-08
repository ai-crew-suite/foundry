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
import { fileURLToPath } from 'node:url';
import type { WorkspaceContext } from '../../../utils/workspace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Orchestrates pre-build clean cycles, reference synchronization, type emission,
 * and passes continuous execution hooks onward to the core Backstage compiler platform.
 *
 * @returns boolean true if the entire sequence was successful, false if a child process failed.
 */
export function runBuildPipeline(context: WorkspaceContext, forwardedArgs: string[]): boolean {
  // The built command modules live at dist/bin/commands/build/lib, so the main
  // crew binary (package.json "bin": "./dist/bin/crew.js") sits three levels up.
  const mainCliPath = path.resolve(__dirname, '../../../crew.js');

  console.log('\x1b[34m⎋ Triggering pre-build clean cycle...\x1b[0m');

  const cleanResult = spawnSync('node', [mainCliPath, 'clean'], {
    stdio: 'inherit',
    shell: true,
    cwd: context.packageDir,
  });

  if (cleanResult.status !== 0) {
    process.exitCode = cleanResult.status ?? 1;
    return false;
  }

  const syncResult = spawnSync('node', [mainCliPath, 'sync:refs'], {
    stdio: 'inherit',
    shell: true,
    cwd: context.packageDir,
  });

  if (syncResult.status !== 0) {
    process.exitCode = syncResult.status ?? 1;
    return false;
  }

  console.log('\x1b[35m┌────────────────────────────────────────────────────────┐\x1b[0m');
  console.log('\x1b[35m│ 🚀 AI CREW SUITE: Orchestrating Backstage Build Target │\x1b[0m');
  console.log('\x1b[35m└────────────────────────────────────────────────────────┘\x1b[0m');
  console.log(`\x1b[35m\x1b[90mContext:\x1b[0m ${context.packageDir}`);

  const typescriptPackageJson = require.resolve('typescript/package.json');
  const typescriptCliPath = path.resolve(path.dirname(typescriptPackageJson), 'bin/tsc');

  const declarationCleanResult = spawnSync(process.execPath, [typescriptCliPath, '--build', '--clean'], {
    stdio: 'inherit',
    shell: true,
    cwd: context.packageDir,
  });

  if (declarationCleanResult.status !== 0) {
    process.exitCode = declarationCleanResult.status ?? 1;
    return false;
  }

  const declarationResult = spawnSync(process.execPath, [typescriptCliPath, '--build', '--force', '--emitDeclarationOnly'], {
    stdio: 'inherit',
    shell: true,
    cwd: context.packageDir,
  });

  if (declarationResult.status !== 0) {
    process.exitCode = declarationResult.status ?? 1;
    return false;
  }

  const backstagePackageJson = require.resolve('@backstage/cli/package.json');
  const backstageCliPath = path.resolve(path.dirname(backstagePackageJson), 'bin/backstage-cli');

  const buildResult = spawnSync(process.execPath, [backstageCliPath, 'package', 'build', ...forwardedArgs], {
    stdio: 'inherit',
    shell: true,
    cwd: context.packageDir,
  });

  process.exitCode = buildResult.status ?? 0;
  return buildResult.status === 0;
}
