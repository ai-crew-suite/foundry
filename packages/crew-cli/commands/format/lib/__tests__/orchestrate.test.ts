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
import { createRequire } from 'node:module';
import path from 'node:path';
import { runFormatPipeline } from '../orchestrate';
import { mockWorkspaceContext, setupOrchestratorTestContext } from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

const require = createRequire(import.meta.url);

/**
 * Resolves the installed Prettier CLI entrypoint the same way the pipeline does,
 * so the assertion tracks the actual "bin" field of whatever Prettier version
 * is installed instead of pinning a version-specific file layout.
 */
function resolveInstalledPrettierBin(): string {
  const prettierPackageJsonPath = require.resolve('prettier/package.json');
  const prettierPackageJson = require(prettierPackageJsonPath) as {
    bin: string | Record<string, string>;
  };
  const binEntry = typeof prettierPackageJson.bin === 'string'
    ? prettierPackageJson.bin
    : prettierPackageJson.bin['prettier'];
  if (!binEntry) {
    throw new Error('Installed Prettier package.json has no "prettier" bin entry');
  }
  return path.resolve(path.dirname(prettierPackageJsonPath), binEntry);
}

describe('runFormatPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should successfully invoke the prettier formatting engine with default fallback flags', () => {
    testEnv.mockAllSuccessful();

    const success = runFormatPipeline(mockWorkspaceContext, []);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);

    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      [resolveInstalledPrettierBin(), '--write', '.'],
      expect.objectContaining({ cwd: mockWorkspaceContext.packageDir })
    );
  });

  it('should forward explicit flags passed down by developers cleanly without string collapsing', () => {
    testEnv.mockAllSuccessful();

    const customFlags = ['--check', 'src/**/*.ts'];
    runFormatPipeline(mockWorkspaceContext, customFlags);

    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      [resolveInstalledPrettierBin(), '--check', 'src/**/*.ts'],
      expect.any(Object)
    );
  });

  it('should trap framework invocation failures cleanly and enforce an error status code 1', () => {
    (spawnSync as any).mockReturnValue({
      error: new Error('Failed to resolve execution prettier script binary'),
      status: null,
    });

    const success = runFormatPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should report an error exit status if the formatter runner process is abruptly killed returning null', () => {
    (spawnSync as any).mockReturnValue({
      status: null,
    });

    const success = runFormatPipeline(mockWorkspaceContext, []);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should explicitly flow host environment variables down into the Prettier child process', () => {
    testEnv.mockAllSuccessful();

    process.env['CUSTOM_FORMAT_LOG_LEVEL'] = 'debug';

    runFormatPipeline(mockWorkspaceContext, []);

    expect(spawnSync).toHaveBeenCalledWith(
      process.execPath,
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          CUSTOM_FORMAT_LOG_LEVEL: 'debug',
        }),
      })
    );

    delete process.env['CUSTOM_FORMAT_LOG_LEVEL'];
  });
});
