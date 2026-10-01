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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WorkspaceContext } from '../../../../utils/workspace';
import { cleanWorkspace, getCleanTargets } from '../clean';

function makeContext(repoRoot: string, packageDir: string): WorkspaceContext {
  return {
    packageName: '@ai-crew-suite/example',
    role: 'node-library',
    isBrowser: false,
    isServer: true,
    packageDir,
    repoRoot,
  };
}

describe('getCleanTargets', () => {
  it('resolves dist, the dist-types mirror, and tsconfig.tsbuildinfo', () => {
    const repoRoot = '/repo';
    const packageDir = '/repo/plugins/kernel/node';

    const targets = getCleanTargets(makeContext(repoRoot, packageDir));

    expect(targets).toContain('/repo/plugins/kernel/node/dist');
    expect(targets).toContain('/repo/dist-types/plugins/kernel/node');
    expect(targets).toContain('/repo/plugins/kernel/node/tsconfig.tsbuildinfo');
  });
});

describe('cleanWorkspace', () => {
  let repoRoot: string;

  afterEach(() => {
    if (repoRoot) {
      rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  function setupRepo(): { repoRoot: string; packageDir: string } {
    repoRoot = mkdtempSync(join(tmpdir(), 'crew-clean-'));
    const packageDir = join(repoRoot, 'plugins/kernel/node');
    mkdirSync(packageDir, { recursive: true });
    return { repoRoot, packageDir };
  }

  it('removes dist, the matching dist-types mirror, and tsconfig.tsbuildinfo', () => {
    const { repoRoot: root, packageDir } = setupRepo();
    mkdirSync(join(packageDir, 'dist'), { recursive: true });
    writeFileSync(join(packageDir, 'dist/index.js'), '', 'utf8');
    mkdirSync(join(root, 'dist-types/plugins/kernel/node'), { recursive: true });
    writeFileSync(join(root, 'dist-types/plugins/kernel/node/index.d.ts'), '', 'utf8');
    writeFileSync(join(packageDir, 'tsconfig.tsbuildinfo'), '{}', 'utf8');

    const result = cleanWorkspace(makeContext(root, packageDir));

    expect(result.removed).toHaveLength(3);
    expect(existsSync(join(packageDir, 'dist'))).toBe(false);
    expect(existsSync(join(root, 'dist-types/plugins/kernel/node'))).toBe(false);
    expect(existsSync(join(packageDir, 'tsconfig.tsbuildinfo'))).toBe(false);
  });

  it('is a no-op when no build artifacts exist', () => {
    const { repoRoot: root, packageDir } = setupRepo();

    const result = cleanWorkspace(makeContext(root, packageDir));

    expect(result.removed).toEqual([]);
  });

  it('does not remove unrelated sibling dist-types directories', () => {
    const { repoRoot: root, packageDir } = setupRepo();
    mkdirSync(join(root, 'dist-types/plugins/kernel/backend'), { recursive: true });
    writeFileSync(join(root, 'dist-types/plugins/kernel/backend/index.d.ts'), '', 'utf8');

    cleanWorkspace(makeContext(root, packageDir));

    expect(existsSync(join(root, 'dist-types/plugins/kernel/backend/index.d.ts'))).toBe(true);
  });

  it('safely handles and skips broken symlinks or missing targets gracefully', () => {
    const { repoRoot: root, packageDir } = setupRepo();

    const targetFile = join(packageDir, 'non-existent-source.js');
    const symlinkPath = join(packageDir, 'dist');

    symlinkSync(targetFile, symlinkPath);

    const result = cleanWorkspace(makeContext(root, packageDir));
    expect(result).toBeDefined();
  });

  it('avoids destructive broad wiping when packageDir matches the repoRoot exactly', () => {
    const { repoRoot: root } = setupRepo();

    const targets = getCleanTargets(makeContext(root, root));

    // The targets must never include the shared root dist-types folder
    expect(targets).not.toContain(join(root, 'dist-types'));
  });
});
