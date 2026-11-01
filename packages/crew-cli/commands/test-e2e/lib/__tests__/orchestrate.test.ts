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
import { runE2EPipeline } from '../orchestrate';
import { mockWorkspaceContext, setupOrchestratorTestContext } from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runE2EPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully launch the playwright runner matrix with correct configuration path parameters', () => {
    testEnv.mockAllSuccessful();

    const success = runE2EPipeline(mockWorkspaceContext, ['--ui']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      [
        'playwright',
        'test',
        '--config',
        expect.stringContaining('test-e2e/lib/playwright.config.js'),
        '--ui'
      ],
      expect.objectContaining({
        cwd: mockWorkspaceContext.repoRoot,
      })
    );
  });

  it('should explicitly forward complex multi-variable parameters without flattening strings', () => {
    testEnv.mockAllSuccessful();

    const complexArgs = ['--project', 'chromium', '--grep', '@sanity'];
    runE2EPipeline(mockWorkspaceContext, complexArgs);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining(['playwright', 'test', '--project', 'chromium', '--grep', '@sanity']),
      expect.any(Object)
    );
  });

  it('should trap framework invocation failures cleanly and enforce an error status code 1', () => {
    (spawnSync as any).mockReturnValue({
      error: new Error('Failed to resolve yarn command shell binary'),
      status: null,
    });

    const success = runE2EPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should fail with exit status 1 if the execution runner is forcefully killed yielding null', () => {
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runE2EPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should accurately log structural text attributes parsed from caught process engine errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });
    const mockError = new Error('ENOENT: command not found, playwright');
    (spawnSync as any).mockReturnValue({
      error: mockError,
      status: null,
    });

    runE2EPipeline(mockWorkspaceContext, []);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to invoke Playwright engine'),
      mockError
    );
  });

  it('should explicitly flow host environment variables and automation flags down into the Playwright process', () => {
    testEnv.mockAllSuccessful();

    // Replicate environment variable injections used in active pipeline matrices
    process.env['CI'] = 'true';
    process.env['PLAYWRIGHT_APP_HOST'] = 'https://ai-crew.internal';

    runE2EPipeline(mockWorkspaceContext, []);

    // Verifies the downstream context maintains full visibility over structural system properties
    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          CI: 'true',
          PLAYWRIGHT_APP_HOST: 'https://ai-crew.internal',
        }),
      })
    );

    delete process.env['CI'];
    delete process.env['PLAYWRIGHT_APP_HOST'];
  });
});
