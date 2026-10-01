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
import fs from 'node:fs';
import { runPublishPipeline } from '../orchestrate';
import { setupOrchestratorTestContext } from '../../../../utils/index';

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
  existsSync: vi.fn(),
}));

describe('runPublishPipeline Orchestrator', () => {
  const testEnv = setupOrchestratorTestContext();

  it('should reject execution and set exit code 1 when not inside the monorepo root workspace', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const success = runPublishPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('should successfully execute changesets publish from the root workspace', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    testEnv.mockAllSuccessful();

    const success = runPublishPipeline(['--otp', '123456']);

    expect(success).toBe(true);
    expect(process.exitCode).toBe(0);
    expect(spawnSync).toHaveBeenCalledTimes(1);
    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      ['changeset', 'publish', '--otp', '123456'],
      expect.objectContaining({ cwd: process.cwd() })
    );
  });

  it('should safely catch process execution breakdowns and update environment error status', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(spawnSync).mockReturnValue({
      error: new Error('Failed to resolve yarn binary'),
      status: null,
    } as any);

    const success = runPublishPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should fail with exit status 1 if the publish runner is forcefully aborted yielding null', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(spawnSync).mockReturnValue({
      status: null,
    } as any);

    const success = runPublishPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it('should reject execution if turbo.json is present but the .changeset configuration folder is missing', () => {
    vi.mocked(fs.existsSync).mockImplementation((targetPath) => {
      if (typeof targetPath === 'string') {
        return targetPath.endsWith('turbo.json');
      }
      return false;
    });

    const success = runPublishPipeline([]);

    expect(success).toBe(false);
    expect(process.exitCode).toBe(1);
    expect(spawnSync).not.toHaveBeenCalled();
  });

  it('should explicitly forward multiple continuous CLI deployment flags as separate positional array parameters', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    testEnv.mockAllSuccessful();

    const complexArgs = ['--snapshot', '--tag', 'next', '--no-git-tag'];
    runPublishPipeline(complexArgs);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      ['changeset', 'publish', '--snapshot', '--tag', 'next', '--no-git-tag'],
      expect.any(Object)
    );
  });

  it('should explicitly preserve and forward global security credentials and environment tokens down to Changesets', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    testEnv.mockAllSuccessful();

    // Inject a dummy token to replicate production secrets context mapping environments safely
    process.env['NPM_TOKEN'] = 'mock-secret-npm-deployment-token-string';

    runPublishPipeline([]);

    expect(spawnSync).toHaveBeenCalledWith(
      'yarn',
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          NPM_TOKEN: 'mock-secret-npm-deployment-token-string',
        }),
      })
    );

    delete process.env['NPM_TOKEN'];
  });

  it('should accurately pipe and print specific text attributes of trapped child process engine errors', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });

    const mockError = new Error('EACCES: permission denied, write');
    vi.mocked(spawnSync).mockReturnValue({
      error: mockError,
      status: null,
    } as any);

    runPublishPipeline([]);

    // Confirms the exact system exception reason maps to logging frames instead of failing completely blind
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Process Execution Error'),
      mockError
    );
  });
});
