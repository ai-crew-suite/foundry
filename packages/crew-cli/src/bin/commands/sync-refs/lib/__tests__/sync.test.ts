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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findPackages, parseCommentedJson, syncProjectReferences, type TsConfig } from '../sync.js';

function writeJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

describe('parseCommentedJson', () => {
  it('strips block and line comments and trailing commas', () => {
    const input = `{
      /* block comment */
      "extends": "../../tsconfig.base.json", // line comment
      "references": [],
    }`;

    expect(parseCommentedJson(input)).toEqual({
      extends: '../../tsconfig.base.json',
      references: [],
    });
  });
});

describe('findPackages', () => {
  let repoRoot: string;

  afterEach(() => {
    if (repoRoot) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('registers leaf packages and stops recursing once package.json is found', () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'crew-sync-find-'));
    const pluginDir = join(repoRoot, 'plugins/kernel/node');
    mkdirSync(join(pluginDir, 'src'), { recursive: true });
    writeJson(join(pluginDir, 'package.json'), { name: '@test/plugin-node' });
    // A package.json nested under "src" should never be reached because
    // recursion stops as soon as a package.json is found in an ancestor dir.
    writeJson(join(pluginDir, 'src/package.json'), { name: '@test/should-not-be-found' });

    const result = findPackages(join(repoRoot, 'plugins'), repoRoot);

    expect(result.size).toBe(1);
    expect(result.get('@test/plugin-node')?.relativeFromRoot).toBe('plugins/kernel/node');
    expect(result.has('@test/should-not-be-found')).toBe(false);
  });

  it('ignores node_modules, dist, and dotfile directories', () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'crew-sync-find-'));
    mkdirSync(join(repoRoot, 'packages/app/node_modules/some-dep'), { recursive: true });
    writeJson(join(repoRoot, 'packages/app/node_modules/some-dep/package.json'), { name: 'some-dep' });
    mkdirSync(join(repoRoot, 'packages/app/dist'), { recursive: true });
    writeJson(join(repoRoot, 'packages/app/dist/package.json'), { name: '@test/should-not-be-found' });
    mkdirSync(join(repoRoot, 'packages/.hidden'), { recursive: true });
    writeJson(join(repoRoot, 'packages/.hidden/package.json'), { name: '@test/also-not-found' });
    writeJson(join(repoRoot, 'packages/app/package.json'), { name: '@test/app' });

    const result = findPackages(join(repoRoot, 'packages'), repoRoot);

    expect(Array.from(result.keys())).toEqual(['@test/app']);
  });

  it('returns an empty map for a directory that does not exist', () => {
    repoRoot = mkdtempSync(join(tmpdir(), 'crew-sync-find-'));

    expect(findPackages(join(repoRoot, 'plugins'), repoRoot).size).toBe(0);
  });
});

describe('syncProjectReferences', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'crew-sync-refs-'));
    writeFileSync(join(repoRoot, 'backstage.json'), '{}', 'utf8');
    writeJson(join(repoRoot, 'package.json'), { name: '@test/root' });
    vi.spyOn(process, 'cwd').mockReturnValue(repoRoot);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(repoRoot, { recursive: true, force: true });
  });

  function readTsConfig(relativePath: string): TsConfig {
    return JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8')) as TsConfig;
  }

  it('derives references from internal package dependencies across packages/ and plugins/', () => {
    mkdirSync(join(repoRoot, 'packages/app'), { recursive: true });
    writeJson(join(repoRoot, 'packages/app/package.json'), {
      name: '@test/app',
      dependencies: { '@test/plugin-node': '^0.0.1' },
    });
    writeJson(join(repoRoot, 'packages/app/tsconfig.json'), { extends: '../../tsconfig.base.json' });

    mkdirSync(join(repoRoot, 'plugins/kernel/node'), { recursive: true });
    writeJson(join(repoRoot, 'plugins/kernel/node/package.json'), { name: '@test/plugin-node' });
    writeJson(join(repoRoot, 'plugins/kernel/node/tsconfig.json'), {
      extends: '../../../tsconfig.base.json',
      compilerOptions: { outDir: '../../../dist-types/plugins/kernel/node' },
    });

    mkdirSync(join(repoRoot, 'plugins/kernel/backend'), { recursive: true });
    writeJson(join(repoRoot, 'plugins/kernel/backend/package.json'), {
      name: '@test/plugin-backend',
      dependencies: { '@test/plugin-node': '^0.0.1' },
    });
    writeJson(join(repoRoot, 'plugins/kernel/backend/tsconfig.json'), { extends: '../../../tsconfig.base.json' });

    writeJson(join(repoRoot, 'tsconfig.json'), { extends: './tsconfig.base.json' });

    syncProjectReferences();

    expect(readTsConfig('packages/app/tsconfig.json').references).toEqual([
      { path: '../../plugins/kernel/node' },
    ]);
    expect(readTsConfig('plugins/kernel/backend/tsconfig.json').references).toEqual([{ path: '../node' }]);

    // No internal deps: the node package's tsconfig is left untouched (no "references" key added).
    const nodeTsConfig = readTsConfig('plugins/kernel/node/tsconfig.json');
    expect(nodeTsConfig.references).toBeUndefined();
    expect((nodeTsConfig.compilerOptions as { outDir?: string })?.outDir).toBe(
      '../../../dist-types/plugins/kernel/node',
    );

    const rootTsConfig = readTsConfig('tsconfig.json');
    expect(rootTsConfig.references).toEqual([
      { path: './packages/app' },
      { path: './plugins/kernel/backend' },
      { path: './plugins/kernel/node' },
    ]);
  });

  it('ignores a top-level apps/ directory', () => {
    mkdirSync(join(repoRoot, 'apps/legacy'), { recursive: true });
    writeJson(join(repoRoot, 'apps/legacy/package.json'), { name: '@test/legacy-app' });
    writeJson(join(repoRoot, 'tsconfig.json'), {});

    syncProjectReferences();

    const rootTsConfig = readTsConfig('tsconfig.json');
    expect(rootTsConfig.references).toEqual([]);
  });

  it('excludes devDependencies-only tooling packages from references', () => {
    mkdirSync(join(repoRoot, 'packages/app'), { recursive: true });
    writeJson(join(repoRoot, 'packages/app/package.json'), {
      name: '@test/app',
      devDependencies: { '@test/crew-cli': '^0.0.1' },
    });
    writeJson(join(repoRoot, 'packages/app/tsconfig.json'), {});

    mkdirSync(join(repoRoot, 'packages/crew-cli'), { recursive: true });
    writeJson(join(repoRoot, 'packages/crew-cli/package.json'), { name: '@test/crew-cli' });

    writeJson(join(repoRoot, 'tsconfig.json'), {});

    syncProjectReferences();

    expect(readTsConfig('packages/app/tsconfig.json').references).toBeUndefined();
  });
});
