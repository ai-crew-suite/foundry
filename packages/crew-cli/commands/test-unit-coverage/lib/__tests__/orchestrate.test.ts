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
import { runUnitCoveragePipeline } from '../orchestrate';
import { mockWorkspaceContext, setupOrchestratorTestContext } from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runUnitCoveragePipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully trigger vitest with coverage parameters and correct configurations', () => {
    testEnv.mockAllSuccessful();

    const success = runUnitCoveragePipeline(mockWorkspaceContext, ['--reporter=json']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      [
        'vitest',
        'run',
        '--coverage',
        '-c',
        expect.stringContaining('test-unit/lib/vitest.config.js'),
        '--reporter=json'
      ],
      expect.objectContaining({
        cwd: mockWorkspaceContext.packageDir,
      })
    );
  });

  it('should forward multiple complex testing parameters without concatenation bugs', () => {
    testEnv.mockAllSuccessful();

    const flagsToTest = ['--passWithNoTests', '--changed'];
    runUnitCoveragePipeline(mockWorkspaceContext, flagsToTest);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining(['vitest', 'run', '--coverage', '--passWithNoTests', '--changed']),
      expect.any(Object)
    );
  });

  it('should catch runtime launch breakdowns cleanly and enforce code 1', () => {
    (spawnSync as any).mockReturnValue({
      error: new Error('Failed to resolve yarn binary'),
      status: null,
    });

    const success = runUnitCoveragePipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should fail with exit status 1 if the execution runner process is abruptly killed yielding null', () => {
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runUnitCoveragePipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should explicitly flow host environment variables and automation flags down into the process', () => {
    testEnv.mockAllSuccessful();

    process.env['CI'] = 'true';
    process.env['COVERAGE_THRESHOLD'] = '80';

    runUnitCoveragePipeline(mockWorkspaceContext, []);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          CI: 'true',
          COVERAGE_THRESHOLD: '80',
        }),
      })
    );

    delete process.env['CI'];
    delete process.env['COVERAGE_THRESHOLD'];
  });
});
