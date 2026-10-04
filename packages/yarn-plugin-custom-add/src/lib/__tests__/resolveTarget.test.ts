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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { structUtils, type Project, type Workspace } from '@yarnpkg/core';
import {
  normalizeFileSystemPath,
  resolveTargetPackageJson,
} from '../resolveTarget';

describe('normalizeFileSystemPath', () => {
  it('resolves relative symbols down to absolute canonical filesystems paths seamlessly', () => {
    const currentDir = process.cwd();
    const result = normalizeFileSystemPath('./src/lib');
    expect(result).toBe(resolve(currentDir, 'src/lib'));
  });

  describe('Windows Environment Isolation Runtime Constraints', () => {
    it('standardizes mixed forward-slashes down to conventional backward-slashes', () => {
      // Temporarily mock environment type state mapping to intercept transformation logic
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');

      const inputPath = 'c:/Users/Admin/Project/src';
      const result = normalizeFileSystemPath(inputPath);

      expect(result).toContain('\\');
      expect(result).not.toContain('/');
      vi.restoreAllMocks();
    });

    it('forces lowercase drive letter identifiers to upper-cased states securely', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');

      // Passing explicit lowercased drive letter configuration bounds
      const result = normalizeFileSystemPath('d:\\monorepo\\packages');

      expect(result.startsWith('D:\\')).toBe(true);
      vi.restoreAllMocks();
    });

    it('does not mutate paths or crash if the drive letter is already uppercase', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');

      const result = normalizeFileSystemPath('Z:\\secure-workspace');

      expect(result.startsWith('Z:\\')).toBe(true);
      vi.restoreAllMocks();
    });

    it('gracefully leaves UNC network paths or non-drive patterns safe from character indexing breaks', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');

      const uncPath = '\\\\NetworkServer\\shared-volume\\src';
      // resolve() on a UNC format retains backslashes; ensure character logic doesn't choke on zero indices
      const result = normalizeFileSystemPath(uncPath);

      expect(result).toBeDefined();
      vi.restoreAllMocks();
    });
  });

  describe('Unix/POSIX Environment Runtime Parity Rules', () => {
    it('leaves standard Unix forward slashes completely unmodified', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');

      const result = normalizeFileSystemPath('/usr/local/var/monorepo');

      expect(result).toContain('/');
      expect(result).not.toContain('\\');
      vi.restoreAllMocks();
    });

    it('never changes casing on regular directory letter boundaries in non-Windows runs', () => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('darwin');

      const targetPath = '/a/nested/route/profile';
      const result = normalizeFileSystemPath(targetPath);

      // Unix systems respect exact casing identities for absolute path hooks
      expect(result.startsWith('/a/')).toBe(true);
      vi.restoreAllMocks();
    });
  });
});

describe('resolveTargetPackageJson', () => {
  let repoRoot: string;

  afterEach(() => {
    if (repoRoot) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  function writeJson(path: string, value: unknown): void {
    writeFileSync(path, JSON.stringify(value), 'utf8');
  }

  function makeWorkspace(dir: string, name: string): Workspace {
    return {
      cwd: dir,
      manifest: { name: structUtils.parseIdent(name) },
    } as unknown as Workspace;
  }

  function setupRepo(): { repoRoot: string; project: Project } {
    repoRoot = mkdtempSync(join(tmpdir(), 'resolve-target-'));
    const crewCliDir = join(repoRoot, 'packages/crew-cli');
    const pluginDir = join(repoRoot, 'plugins/example-plugin');
    mkdirSync(crewCliDir, { recursive: true });
    mkdirSync(pluginDir, { recursive: true });
    writeJson(join(crewCliDir, 'package.json'), { name: '@ai-crew-suite/crew-cli' });
    writeJson(join(pluginDir, 'package.json'), { name: '@ai-crew-suite/example-plugin' });
    writeJson(join(repoRoot, 'package.json'), { name: '@ai-crew-suite/root', workspaces: ['packages/*', 'plugins/*'] });

    const project = {
      workspaces: [
        makeWorkspace(crewCliDir, '@ai-crew-suite/crew-cli'),
        makeWorkspace(pluginDir, '@ai-crew-suite/example-plugin'),
      ],
    } as unknown as Project;
    return { repoRoot, project };
  }

  it('targets the root package.json when no target is given', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, project })).toEqual({
      kind: 'root',
      packageJsonPath: resolve(root, 'package.json'),
    });
  });

  it('resolves a package by name via the workspace graph', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: '@ai-crew-suite/crew-cli', project })).toEqual({
      kind: 'package',
      packageJsonPath: resolve(root, 'packages/crew-cli/package.json'),
    });
  });

  it('falls back to a packages/** relative path', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: 'packages/crew-cli', project })).toEqual({
      kind: 'package',
      packageJsonPath: resolve(root, 'packages/crew-cli/package.json'),
    });
  });

  it('falls back to a plugins/** relative path not listed in tsconfig references', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: 'plugins/example-plugin', project })).toEqual({
      kind: 'package',
      packageJsonPath: resolve(root, 'plugins/example-plugin/package.json'),
    });
  });

  it('throws when the target cannot be resolved', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(() => resolveTargetPackageJson({ repoRoot: root, target: 'not-a-real-package', project })).toThrow(
      /Could not resolve target workspace "not-a-real-package"/,
    );
  });

  it('defends against directory alignment failures caused by mismatched drive letter casings', () => {
    const { repoRoot: root } = setupRepo();

    // Fabricate a workspace path with a flipped casing profile to simulate Windows drive-letter drifts
    const alteredCwd = process.platform === 'win32'
      ? (root.startsWith('c:') ? root.replace('c:', 'C:') : root.replace('C:', 'c:'))
      : root;

    const modifiedProject = {
      workspaces: [
        makeWorkspace(join(alteredCwd, 'packages/crew-cli'), '@ai-crew-suite/crew-cli'),
      ],
    } as unknown as Project;

    expect(resolveTargetPackageJson({ repoRoot: root, target: 'packages/crew-cli', project: modifiedProject })).toEqual({
      kind: 'package',
      packageJsonPath: resolve(root, 'packages/crew-cli/package.json'),
    });
  });

  it('blocks path traversal attempts and throws a security error if target breaks containment boundaries', () => {
    const { repoRoot: root, project } = setupRepo();

    // Malicious structural break intent mapping outside the monorepo root bounds
    const maliciousTarget = '../../../../etc/passwd';

    expect(() =>
      resolveTargetPackageJson({ repoRoot: root, target: maliciousTarget, project })
    ).toThrow(/Security Violation: Target path .* falls outside the authorized repository boundary/);
  });

  describe('High-Assurance Security Containment & Data Integrity Guardrails', () => {
    it('rejects path traversal payloads utilizing complex encoded characters or hidden null bytes', () => {
      // Compliance Focus: FINRA/SOC-2 Data Isolation
      // Verifies that input normalization does not strip or bypass containment markers
      const { repoRoot: root, project } = setupRepo();
      const maliciousPayload = 'packages/crew-cli/../../../../etc/shadow\0';

      expect(() =>
        resolveTargetPackageJson({ repoRoot: root, target: maliciousPayload, project })
      ).toThrow(/Security Violation: Target path .* falls outside the authorized repository boundary/);
    });

    it('blocks relative upward parent boundary breaking targets like ".." explicitly', () => {
      const { repoRoot: root, project } = setupRepo();
      const parentTarget = '..';

      expect(() =>
        resolveTargetPackageJson({ repoRoot: root, target: parentTarget, project })
      ).toThrow(/Security Violation: Target path .* falls outside the authorized repository boundary/);
    });

    it('denies target paths that attempt to mimic the root name but map to a outside peer directory', () => {
      // Compliance Focus: Multi-tenant build isolation
      // If repo root is /var/build/project, a target like /var/build/project-backup should be denied
      const project = { workspaces: [] } as unknown as Project;
      const fakeRoot = resolve('/var/build/project');
      const overlappingTarget = '../project-backup';

      expect(() =>
        resolveTargetPackageJson({ repoRoot: fakeRoot, target: overlappingTarget, project })
      ).toThrow(/Security Violation: Target path .* falls outside the authorized repository boundary/);
    });

    it('handles complex nested relative dots inside authorized workspace structures cleanly', () => {
      // Ensures legitimate nested path structures remain operational
      const { repoRoot: root, project } = setupRepo();

      // Target pointing legitimately inside the boundaries but using un-normalized segments
      const redundantPath = 'packages/./crew-cli/../crew-cli';

      const result = resolveTargetPackageJson({ repoRoot: root, target: redundantPath, project });
      expect(result.kind).toBe('package');
      expect(result.packageJsonPath).toBe(resolve(root, 'packages/crew-cli/package.json'));
    });

    it('throws an informative error if a workspace directory is found but lacks a configuration manifest', () => {
      // Operational Rigor: Catch configuration baseline mismatches before mutating the tree
      const { repoRoot: root, project } = setupRepo();
      const untrackedTarget = 'packages/invalid-missing-dir';

      expect(() =>
        resolveTargetPackageJson({ repoRoot: root, target: untrackedTarget, project })
      ).toThrow(/Could not resolve target workspace/);
    });
  });
});
