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
import { runTypecheckPipeline } from '../orchestrate';
import { setupOrchestratorTestContext } from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runTypecheckPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully launch the typescript compiler with correct configuration options', () => {
    testEnv.mockAllSuccessful();

    const success = runTypecheckPipeline(['--pretty']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringContaining('bin/tsc'),
        '--noEmit',
        '--pretty'
      ],
      expect.objectContaining({
        cwd: process.cwd(),
      })
    );
  });

  it('should explicitly forward complex multi-variable flags without flattening strings', () => {
    testEnv.mockAllSuccessful();

    const flagsToForward = ['--skipLibCheck', '--incremental', 'false'];
    runTypecheckPipeline(flagsToForward);

    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining(['--noEmit', '--skipLibCheck', '--incremental', 'false']),
      expect.any(Object)
    );
  });

  it('should trap framework invocation failures cleanly and enforce an error status code 1', () => {
    (spawnSync as any).mockReturnValue({
      error: new Error('Failed to resolve execution compiler binary'),
      status: null,
    });

    const success = runTypecheckPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should fail with exit status 1 if the execution runner is forcefully killed yielding null', () => {
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runTypecheckPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should cleanly forward specific typescript compiler error statuses when validation fails', () => {
    // Simulate TypeScript compiler flagging structural syntax compilation breaks (exit status code 2)
    testEnv.mockSequenceStatuses(2);

    const success = runTypecheckPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(2);
  });

  it('should explicitly flow host environment variables and automation flags down into the tsc process', () => {
    testEnv.mockAllSuccessful();

    // Replicate environment variable allocations used in heavy pipeline matrices
    process.env['NODE_OPTIONS'] = '--max-old-space-size=4096';
    process.env['CUSTOM_COMPILE_DEBUG'] = 'true';

    runTypecheckPipeline([]);

    // Verifies the downstream compiler process retains full visibility over host system variables
    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          NODE_OPTIONS: '--max-old-space-size=4096',
          CUSTOM_COMPILE_DEBUG: 'true',
        }),
      })
    );

    delete process.env['NODE_OPTIONS'];
    delete process.env['CUSTOM_COMPILE_DEBUG'];
  });

  it('should accurately log the specific text parameters of intercepted process invocation errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

    const mockError = new Error('ENOENT: command not found, tsc');
    (spawnSync as any).mockReturnValue({
      error: mockError,
      status: null,
    });

    runTypecheckPipeline([]);

    // Verifies that the exact exception reason maps to logging frames instead of failing completely blind
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to invoke typecheck engine'),
      mockError
    );
  });
});
