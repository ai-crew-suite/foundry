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
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { CustomAddCommand } from '../add';

vi.mock('@yarnpkg/cli', () => ({
  BaseCommand: class MockBaseCommand {
    context: any;
  },
}));

vi.mock('clipanion', () => ({
  Option: {
    Boolean: vi.fn(),
    String: vi.fn(),
    Rest: vi.fn(),
  },
}));

vi.mock('node:fs');
vi.mock('../../lib/catalogFile');
vi.mock('../../lib/confirm');
vi.mock('../../lib/npmRegistry');
vi.mock('../../lib/parsePackageSpec');
vi.mock('../../lib/packageManifest');
vi.mock('../../lib/resolveTarget');

vi.mock('@yarnpkg/core', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    Cache: {
      find: vi.fn().mockResolvedValue({}),
    },
    Project: {
      find: vi.fn(),
    },
    Configuration: {
      find: vi.fn(),
    },
    StreamReport: {
      start: vi.fn().mockImplementation(async (opts, cb) => {
        const mockReport = { hasErrors: vi.fn().mockReturnValue(false) };
        await cb(mockReport);
        return mockReport;
      }),
    },
  };
});

import { Cache, Configuration, Project, StreamReport } from '@yarnpkg/core';
import { readFileSync, writeFileSync } from 'node:fs';
import { confirm } from '../../lib/confirm';
import { resolveLatestRange } from '../../lib/npmRegistry';
import { parsePackageSpec } from '../../lib/parsePackageSpec';
import { resolveTargetPackageJson } from '../../lib/resolveTarget';

describe('CustomAddCommand', () => {
  let mockContext: any;
  let mockConfiguration: any;
  let mockInstallSpy: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockInstallSpy = vi.fn().mockResolvedValue({});
    vi.mocked(Cache.find).mockResolvedValue({} as any);
    vi.mocked(StreamReport.start).mockImplementation(async (_opts: any, cb: any) => {
      const mockReport = { hasErrors: vi.fn().mockReturnValue(false) };
      await cb(mockReport);
      return mockReport as any;
    });

    mockConfiguration = {
      get: vi.fn().mockReturnValue(new Map()),
    };

    mockContext = {
      cwd: '/mock/repo/root',
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      project: {
        cwd: '/mock/repo/root',
        configuration: mockConfiguration,
        install: mockInstallSpy,
        // Enforce an array structure so project.workspaces tracking logic works
        workspaces: [{}, {}],
      },
    };

    mockContext.stdout.write = vi.fn();
    mockContext.stderr.write = vi.fn();

    vi.mocked(Project.find).mockResolvedValue({ project: mockContext.project } as any);
    vi.mocked(Configuration.find).mockImplementation(async (cwd: any) => {
      if (!cwd) throw new Error('No Yarn project found from the provided cwd');
      return mockConfiguration;
    });
  });

  it('fails safely when executed outside of an active Yarn environment context', async () => {
    const command = new CustomAddCommand();
    command.context = { stdout: new PassThrough(), stderr: { write: vi.fn() } } as any;

    const exitCode = await command.execute();
    expect(exitCode).toBe(1);
    expect(command.context.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Error: Command is running outside of a valid Yarn environment context'),
    );
  });

  it('fails early if no target packages are passed into the rest parameter', async () => {
    const command = new CustomAddCommand();
    command.context = mockContext;
    command.packages = [];

    const exitCode = await command.execute();
    expect(exitCode).toBe(1);
    expect(mockContext.stderr.write).toHaveBeenCalledWith(expect.stringContaining('No packages specified'));
  });

  it('aborts root target updates safely if prompt confirmation is denied', async () => {
    const command = new CustomAddCommand();
    command.context = mockContext;
    command.packages = ['lodash'];
    command.dev = true;

    vi.mocked(resolveTargetPackageJson).mockReturnValue({
      kind: 'root',
      packageJsonPath: '/mock/repo/root/package.json',
    });
    vi.mocked(confirm).mockResolvedValue(false);

    const exitCode = await command.execute();
    expect(exitCode).toBe(0);
    expect(mockContext.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Aborted.'));
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('bypasses terminal prompt logic if explicit flag --yes is supplied on a root upgrade', async () => {
    const command = new CustomAddCommand();
    command.context = mockContext;
    command.packages = ['lodash'];
    command.dev = true;
    command.yes = true;

    vi.mocked(resolveTargetPackageJson).mockReturnValue({
      kind: 'root',
      packageJsonPath: '/mock/repo/root/package.json',
    });
    vi.mocked(parsePackageSpec).mockReturnValue({ name: 'lodash', range: '^4.17.21' });

    const exitCode = await command.execute();
    expect(exitCode).toBe(0);
    expect(confirm).not.toHaveBeenCalled();
    expect(writeFileSync).toHaveBeenCalled();
  });

  it('fails execution loop if target tracking error occurs', async () => {
    const command = new CustomAddCommand();
    command.context = mockContext;
    command.packages = ['react'];

    vi.mocked(resolveTargetPackageJson).mockImplementation(() => {
      throw new Error('Target workspace invalid-pkg not found');
    });

    const exitCode = await command.execute();
    expect(exitCode).toBe(1);
    expect(mockContext.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Target workspace invalid-pkg not found'),
    );
  });

  it('automatically resolves target version ranges via npm registry if no range is specified', async () => {
    const command = new CustomAddCommand();
    command.context = mockContext;
    command.packages = ['chalk'];
    command.dev = false;

    vi.mocked(resolveTargetPackageJson).mockReturnValue({
      kind: 'package',
      packageJsonPath: '/mock/repo/root/packages/core/package.json',
    });
    vi.mocked(parsePackageSpec).mockReturnValue({ name: 'chalk', range: undefined });
    vi.mocked(resolveLatestRange).mockResolvedValue('^5.3.0');
    vi.mocked(readFileSync).mockReturnValue('{}');

    const exitCode = await command.execute();
    expect(exitCode).toBe(0);
    expect(resolveLatestRange).toHaveBeenCalledWith(expect.objectContaining({ packageName: 'chalk' }));
    expect(mockContext.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Added "chalk" (^5.3.0)'));
    expect(mockInstallSpy).toHaveBeenCalled();
  });

  describe('High-Compliance & Transactional Execution Guardrails (SOC-2 / FINRA / HIPAA)', () => {
    it('handles multiple package installations in a single execution atomically', async () => {
      const command = new CustomAddCommand();
      command.context = mockContext;
      command.packages = ['react', 'react-dom'];
      command.dev = false;

      vi.mocked(resolveTargetPackageJson).mockReturnValue({
        kind: 'package',
        packageJsonPath: '/mock/repo/root/packages/core/package.json',
      });
      vi.mocked(parsePackageSpec)
        .mockReturnValueOnce({ name: 'react', range: '^18.2.0' })
        .mockReturnValueOnce({ name: 'react-dom', range: '^18.2.0' });
      vi.mocked(readFileSync).mockReturnValue('{}');

      const exitCode = await command.execute();
      expect(exitCode).toBe(0);

      expect(writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockContext.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Added "react"'));
      expect(mockContext.stdout.write).toHaveBeenCalledWith(expect.stringContaining('Added "react-dom"'));
      expect(mockInstallSpy).toHaveBeenCalledTimes(1);
    });

    it('prevents partial state corruption by stopping the execution loop if a single package fails resolution', async () => {
      const command = new CustomAddCommand();
      command.context = mockContext;
      command.packages = ['valid-package', 'malicious-or-broken-package'];
      command.dev = false;

      vi.mocked(resolveTargetPackageJson).mockReturnValue({
        kind: 'package',
        packageJsonPath: '/mock/repo/root/packages/core/package.json',
      });

      vi.mocked(parsePackageSpec)
        .mockReturnValueOnce({ name: 'valid-package', range: '^1.0.0' })
        .mockReturnValueOnce({ name: 'malicious-or-broken-package', range: undefined });

      vi.mocked(readFileSync).mockReturnValue('{}');

      vi.mocked(resolveLatestRange).mockImplementation(() => {
        throw new Error('Network timeout/Registry access denied (Auditable Security Event)');
      });

      const exitCode = await command.execute();
      expect(exitCode).toBe(1);

      expect(writeFileSync).not.toHaveBeenCalled();
      expect(mockInstallSpy).not.toHaveBeenCalled();
      expect(mockContext.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('Network timeout/Registry access denied'),
      );
    });

    it('safely handles read/write filesystem permission dropouts mid-operation', async () => {
      const command = new CustomAddCommand();
      command.context = mockContext;
      command.packages = ['lodash'];
      command.dev = false;

      vi.mocked(resolveTargetPackageJson).mockReturnValue({
        kind: 'package',
        packageJsonPath: '/mock/repo/root/packages/core/package.json',
      });
      vi.mocked(parsePackageSpec).mockReturnValue({ name: 'lodash', range: '^4.17.21' });
      vi.mocked(readFileSync).mockReturnValue('{}');

      vi.mocked(writeFileSync).mockImplementation(() => {
        throw new Error('EACCES: permission denied, write /mock/repo/root/.yarnrc.yml');
      });

      const exitCode = await command.execute();
      expect(exitCode).toBe(1);
      expect(mockInstallSpy).not.toHaveBeenCalled();
      expect(mockContext.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('EACCES: permission denied'),
      );
    });
  });
});
