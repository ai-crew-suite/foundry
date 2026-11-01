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
import { runStorybookBuildPipeline } from '../orchestrate';
import { setupOrchestratorTestContext } from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('runStorybookBuildPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully trigger a static storybook build invocation with correct configurations', () => {
    testEnv.mockAllSuccessful();

    const success = runStorybookBuildPipeline(['--docs']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      [
        'storybook',
        'build',
        '--config-dir',
        expect.stringContaining('storybook/config'),
        '--docs'
      ],
      expect.objectContaining({
        cwd: expect.any(String),
      })
    );
  });

  it('should explicitly forward multiple continuous compiler flags as positional arguments', () => {
    testEnv.mockAllSuccessful();

    const flagsToTest = ['-o', './dist-docs', '--quiet'];
    runStorybookBuildPipeline(flagsToTest);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.arrayContaining(['storybook', 'build', '-o', './dist-docs', '--quiet']),
      expect.any(Object)
    );
  });

  it('should catch builder compiler runtime launch crashes and flag exitCode 1', () => {
    (spawnSync as any).mockReturnValue({
      error: new Error('Yarn executable not found on host machine'),
      status: null,
    });

    const success = runStorybookBuildPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should fail with exit status 1 if the execution engine process gets abruptly terminated', () => {
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runStorybookBuildPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should accurately log structural text metadata parsed from intercepted build engine exceptions', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });
    
    const mockError = new Error('EACCES: permission denied, mkdir static-build');
    (spawnSync as any).mockReturnValue({
      error: mockError,
      status: null,
    });

    runStorybookBuildPipeline([]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to invoke Storybook build compiler engine'),
      mockError
    );
  });

  it('should resolve the cross-referenced config directory path string into a valid absolute layout pattern', () => {
    testEnv.mockAllSuccessful();

    runStorybookBuildPipeline([]);

    // Capture the exact array parameters passed during execution to isolate the directory string shape
    // @ts-expect-error: Accessing the mocked call arguments for spawnSync
    const executionArguments = vi.mocked(spawnSync).mock.calls[0][1] as string[];
    const configDirValue = executionArguments[executionArguments.indexOf('--config-dir') + 1];

    // Guard assertion: The directory mapping context must resolve as an absolute path, not a relative path literal
    expect(configDirValue).not.toContain('..');
    expect(configDirValue).toSatisfy((val: string) => val.endsWith('packages/crew-cli/src/bin/commands/storybook/config'));
  });
});
