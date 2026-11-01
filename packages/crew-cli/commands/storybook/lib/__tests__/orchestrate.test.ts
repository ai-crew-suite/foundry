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
import { describe, it, expect, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { runStorybookPipeline } from '../orchestrate';
import { mockWorkspaceContext, setupOrchestratorTestContext } from '../../../../utils/index';
import type { WorkspaceContext } from '../../../../utils/workspace';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runStorybookPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully launch the storybook dev platform with accurate path mapping variables', () => {
    testEnv.mockAllSuccessful();

    const success = runStorybookPipeline(mockWorkspaceContext, ['--ci']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      [
        'storybook',
        'dev',
        '-p',
        '6006',
        '--config-dir',
        expect.stringContaining('storybook/config'),
        '--ci'
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          AI_CREW_SUITE_REPO_ROOT: mockWorkspaceContext.repoRoot,
        }),
      })
    );
  });

  it('should forward multiple complex options down to the yarn runner without string collapsing', () => {
    testEnv.mockAllSuccessful();

    const multipleFlags = ['--no-open', '--loglevel', 'silent'];
    runStorybookPipeline(mockWorkspaceContext, multipleFlags);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining(['storybook', 'dev', '--no-open', '--loglevel', 'silent']),
      expect.any(Object)
    );
  });

  it('should catch runtime launch failures and correctly flag exitCode 1', () => {
    (spawnSync as any).mockReturnValue({
      error: new Error('Yarn binary could not be found'),
      status: null,
    });

    const success = runStorybookPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should map a fallback exitCode status of 1 if the execution process is aborted', () => {
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runStorybookPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should explicitly preserve and forward global shell environment variables down to the Storybook process', () => {
    testEnv.mockAllSuccessful();

    process.env['CUSTOM_TEST_ENV_VAR'] = 'active-session-flag';

    runStorybookPipeline(mockWorkspaceContext, []);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          CUSTOM_TEST_ENV_VAR: 'active-session-flag',
          AI_CREW_SUITE_REPO_ROOT: mockWorkspaceContext.repoRoot,
        }),
      })
    );

    delete process.env['CUSTOM_TEST_ENV_VAR'];
  });

  it('should accurately log the specific text parameters of intercepted process invocation errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

    const mockError = new Error('ENOENT: command not found, yarn');
    (spawnSync as any).mockReturnValue({
      error: mockError,
      status: null,
    });

    runStorybookPipeline(mockWorkspaceContext, []);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to invoke Storybook server engine'),
      mockError
    );
  });

  it('should accurately bind changing workspace root constraints into the child process configuration array', () => {
    testEnv.mockAllSuccessful();

    // Simulating execution inside an completely separate directory path structure
    const alternativeContext: WorkspaceContext = {
      ...mockWorkspaceContext,
      repoRoot: '/completely/different/workspace/root/path',
      packageDir: '/completely/different/workspace/root/path/packages/target',
    };

    runStorybookPipeline(alternativeContext, []);

    // Verifies that the internal child environment dynamically adapts to match changing workspaces
    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          AI_CREW_SUITE_REPO_ROOT: '/completely/different/workspace/root/path',
        }),
      })
    );
  });
});
