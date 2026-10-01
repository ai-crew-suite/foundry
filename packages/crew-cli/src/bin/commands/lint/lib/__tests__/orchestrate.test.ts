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
import { runLintPipeline } from '../orchestrate';
import {
  mockWorkspaceContext,
  setupOrchestratorTestContext,
} from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runLintPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully execute eslint against the target workspace directory context', () => {
    testEnv.mockAllSuccessful();

    const success = runLintPipeline(mockWorkspaceContext, ['--fix']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      [expect.stringContaining('bin/eslint.js'), '.', '--fix'],
      expect.objectContaining({ cwd: mockWorkspaceContext.packageDir })
    );
  });

  it('should cleanly forward non-zero failure exit codes without crashing the pipeline runner', () => {
    // Simulate ESLint identifying syntax style breaks (status code 1)
    testEnv.mockSequenceStatuses(1);

    const success = runLintPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should safely trap execution failure exceptions and report an active code status error', () => {
    // Simulate a system invocation layer breakdown
    (spawnSync as any).mockReturnValue({
      error: new Error('ENOENT: Command not found'),
      status: null,
    });

    const success = runLintPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should fail with an error exit status if the process is killed or returns a null code', () => {
    // Simulate an external lifecycle termination yielding null status
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runLintPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should explicitly forward multiple continuous CLI arguments as separate positional array parameters', () => {
    testEnv.mockAllSuccessful();

    // Simulating multiple specialized parameters passed into the command
    const flagsToTest = ['--fix', '--quiet', '--max-warnings', '0'];
    runLintPipeline(mockWorkspaceContext, flagsToTest);

    // Verifies that the parameters are cleanly appended in sequence without collapsing into a single string
    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining('bin/eslint.js'),
        '.',
        '--fix',
        '--quiet',
        '--max-warnings',
        '0'
      ],
      expect.any(Object)
    );
  });
});
