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
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { structUtils, type Project, type Workspace } from '@yarnpkg/core';
import { resolveTargetPackageJson } from '../lib/resolveTarget.js';

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

  /**
   * Builds a minimal fake Yarn workspace entry rooted at the given directory.
   */
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
      packageJsonPath: join(root, 'package.json'),
    });
  });

  it('resolves a package by name via the workspace graph', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: '@ai-crew-suite/crew-cli', project })).toEqual({
      kind: 'package',
      packageJsonPath: join(root, 'packages/crew-cli/package.json'),
    });
  });

  it('falls back to a packages/** relative path', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: 'packages/crew-cli', project })).toEqual({
      kind: 'package',
      packageJsonPath: join(root, 'packages/crew-cli/package.json'),
    });
  });

  it('falls back to a plugins/** relative path not listed in tsconfig references', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: 'plugins/example-plugin', project })).toEqual({
      kind: 'package',
      packageJsonPath: join(root, 'plugins/example-plugin/package.json'),
    });
  });

  it('throws when the target cannot be resolved', () => {
    const { repoRoot: root, project } = setupRepo();
    expect(() => resolveTargetPackageJson({ repoRoot: root, target: 'not-a-real-package', project })).toThrow(
      /Could not resolve target workspace "not-a-real-package"/,
    );
  });
});
