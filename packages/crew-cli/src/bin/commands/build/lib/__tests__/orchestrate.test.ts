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
import { describe, it, expect, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { runBuildPipeline } from '../orchestrate';
import {
  mockWorkspaceContext,
  setupOrchestratorTestContext,
} from '../../../../utils/index';

// Hoisted above the imports above so '../orchestrate' sees the mocked module.
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runBuildPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully run all pipeline stages sequentially with correct arguments', () => {
    testEnv.mockAllSuccessful();

    const success = runBuildPipeline(mockWorkspaceContext, ['--minify']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(5);

    // 1. Pre-build clean cycle
    expect(spawnSync).toHaveBeenNthCalledWith(
      1,
      'node',
      // The main CLI binary must resolve to <pkg>/(src|dist)/bin/crew.js, never a nonexistent sibling like dist/crew.js
      [expect.stringMatching(/(?:^|.*[\\/])bin[\\/]crew\.js$/), 'clean'],
      expect.objectContaining({ cwd: mockWorkspaceContext.packageDir })
    );

    // 2. Reference synchronization
    expect(spawnSync).toHaveBeenNthCalledWith(
      2,
      'node',
      [expect.stringMatching(/(?:^|.*[\\/])bin[\\/]crew\.js$/), 'sync:refs'],
      expect.objectContaining({ cwd: mockWorkspaceContext.packageDir })
    );

    // 3. TypeScript build clean cache
    expect(spawnSync).toHaveBeenNthCalledWith(
      3,
      process.execPath,
      [expect.stringContaining('tsc'), '--build', '--clean'],
      expect.objectContaining({ cwd: mockWorkspaceContext.packageDir })
    );

    // 4. TypeScript declaration emit execution
    expect(spawnSync).toHaveBeenNthCalledWith(
      4,
      process.execPath,
      [expect.stringContaining('tsc'), '--build', '--force', '--emitDeclarationOnly'],
      expect.objectContaining({ cwd: mockWorkspaceContext.packageDir })
    );

    // 5. Core Backstage compiler runtime delegation (with forwarded arguments)
    expect(spawnSync).toHaveBeenNthCalledWith(
      5,
      process.execPath,
      [expect.stringContaining('backstage-cli'), 'package', 'build', '--minify'],
      expect.objectContaining({ cwd: mockWorkspaceContext.packageDir })
    );
  });

  it('should abort early and update process exitCode if an early pipeline step fails', () => {
    // Fixes "Cannot find name 'mockSequenceStatuses'" by channeling it through the helper object
    testEnv.mockSequenceStatuses(2);

    const success = runBuildPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(2);
    expect(spawnSync).toHaveBeenCalledTimes(1); // Blocked early from running step 2
  });
});
