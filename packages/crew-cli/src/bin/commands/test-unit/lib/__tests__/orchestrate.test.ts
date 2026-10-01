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
import { runUnitTestsPipeline } from '../orchestrate';
import { mockWorkspaceContext, setupOrchestratorTestContext } from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runUnitTestsPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully trigger vitest with correct configuration path parameters', () => {
    testEnv.mockAllSuccessful();

    const success = runUnitTestsPipeline(mockWorkspaceContext, ['--watch=false']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      [
        'vitest',
        'run',
        '-c',
        expect.stringContaining('test-unit/lib/vitest.config.js'),
        '--watch=false'
      ],
      expect.objectContaining({
        cwd: mockWorkspaceContext.packageDir,
      })
    );
  });

  it('should forward multiple continuous testing flags without string concatenation errors', () => {
    testEnv.mockAllSuccessful();

    const complexArgs = ['--update', '--coverage'];
    runUnitTestsPipeline(mockWorkspaceContext, complexArgs);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining(['vitest', 'run', '--update', '--coverage']),
      expect.any(Object)
    );
  });

  it('should catch runtime launch failures cleanly and enforce code 1', () => {
    (spawnSync as any).mockReturnValue({
      error: new Error('Failed to resolve yarn command shell binary'),
      status: null,
    });

    const success = runUnitTestsPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should report an error exit status if the test runner is abruptly killed returning null', () => {
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runUnitTestsPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should explicitly flow host environment variables and automation flags down into the Vitest process', () => {
    testEnv.mockAllSuccessful();

    // Replicate environment variable injections used in active pipeline matrices
    process.env['CI'] = 'true';
    process.env['VITEST_SEGMENT'] = 'core-plugins';

    runUnitTestsPipeline(mockWorkspaceContext, []);

    // Verifies that the downstream context maintains full visibility over structural system properties
    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          CI: 'true',
          VITEST_SEGMENT: 'core-plugins',
        }),
      })
    );

    delete process.env['CI'];
    delete process.env['VITEST_SEGMENT'];
  });
});
