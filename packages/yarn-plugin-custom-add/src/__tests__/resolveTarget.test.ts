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

  function setupRepo(): string {
    repoRoot = mkdtempSync(join(tmpdir(), 'resolve-target-'));
    mkdirSync(join(repoRoot, 'packages/crew-cli'), { recursive: true });
    mkdirSync(join(repoRoot, 'plugins/example-plugin'), { recursive: true });
    writeJson(join(repoRoot, 'packages/crew-cli/package.json'), { name: '@ai-crew-suite/crew-cli' });
    writeJson(join(repoRoot, 'plugins/example-plugin/package.json'), { name: '@ai-crew-suite/example-plugin' });
    writeJson(join(repoRoot, 'tsconfig.json'), {
      references: [{ path: './packages/crew-cli' }],
    });
    return repoRoot;
  }

  it('targets the root package.json when no target is given', () => {
    const root = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root })).toEqual({
      kind: 'root',
      packageJsonPath: join(root, 'package.json'),
    });
  });

  it('resolves a package by name via tsconfig.json references', () => {
    const root = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: '@ai-crew-suite/crew-cli' })).toEqual({
      kind: 'package',
      packageJsonPath: join(root, 'packages/crew-cli/package.json'),
    });
  });

  it('falls back to a packages/** relative path', () => {
    const root = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: 'packages/crew-cli' })).toEqual({
      kind: 'package',
      packageJsonPath: join(root, 'packages/crew-cli/package.json'),
    });
  });

  it('falls back to a plugins/** relative path not listed in tsconfig references', () => {
    const root = setupRepo();
    expect(resolveTargetPackageJson({ repoRoot: root, target: 'plugins/example-plugin' })).toEqual({
      kind: 'package',
      packageJsonPath: join(root, 'plugins/example-plugin/package.json'),
    });
  });

  it('throws when the target cannot be resolved', () => {
    const root = setupRepo();
    expect(() => resolveTargetPackageJson({ repoRoot: root, target: 'not-a-real-package' })).toThrow(
      /Could not resolve --target "not-a-real-package"/,
    );
  });
});
