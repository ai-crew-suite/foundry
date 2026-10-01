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
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Workspace directories eligible for `--target <path>` resolution. */
const WORKSPACE_ROOT_DIRS = ['packages', 'plugins'];

export interface ResolveTargetOptions {
  /** Absolute path to the monorepo root (`project.cwd`). */
  repoRoot: string;
  /** Value of `--target`, if any. Root package.json is targeted when omitted. */
  target?: string;
}

export interface ResolvedTarget {
  kind: 'root' | 'package';
  packageJsonPath: string;
}

/**
 * Resolves the package.json that a `yarn add` invocation should modify:
 * the monorepo root when no `--target` is given, otherwise a package looked
 * up by name via the root `tsconfig.json`'s `references`, falling back to a
 * `packages/**`/`plugins/**` relative path.
 *
 * @throws {Error} If `target` is set but cannot be resolved either way.
 */
export function resolveTargetPackageJson(options: ResolveTargetOptions): ResolvedTarget {
  const { repoRoot, target } = options;

  if (!target) {
    return { kind: 'root', packageJsonPath: resolve(repoRoot, 'package.json') };
  }

  const byName = resolvePackageDirByName(repoRoot, target);
  if (byName) {
    return { kind: 'package', packageJsonPath: resolve(byName, 'package.json') };
  }

  const byPath = resolvePackageDirByPath(repoRoot, target);
  if (byPath) {
    return { kind: 'package', packageJsonPath: resolve(byPath, 'package.json') };
  }

  throw new Error(
    `Could not resolve --target "${target}" to a package name (see tsconfig.json "references") ` +
      'or a packages/** / plugins/** path.',
  );
}

function resolvePackageDirByName(repoRoot: string, packageName: string): string | undefined {
  const tsconfigPath = resolve(repoRoot, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    return undefined;
  }

  let references: Array<{ path?: unknown }>;
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8')) as { references?: unknown };
    references = Array.isArray(tsconfig.references) ? (tsconfig.references as Array<{ path?: unknown }>) : [];
  } catch {
    return undefined;
  }

  for (const reference of references) {
    if (typeof reference?.path !== 'string') {
      continue;
    }

    const dir = resolve(repoRoot, reference.path);
    const manifestPath = resolve(dir, 'package.json');
    if (!existsSync(manifestPath)) {
      continue;
    }

    try {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: unknown };
      if (manifest.name === packageName) {
        return dir;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function resolvePackageDirByPath(repoRoot: string, targetPath: string): string | undefined {
  const normalized = targetPath.replace(/^\.\//, '').replace(/\/+$/, '');
  const isWorkspacePath = WORKSPACE_ROOT_DIRS.some(
    (workspaceDir) => normalized === workspaceDir || normalized.startsWith(`${workspaceDir}/`),
  );

  if (!isWorkspacePath) {
    return undefined;
  }

  const dir = resolve(repoRoot, normalized);
  return existsSync(resolve(dir, 'package.json')) ? dir : undefined;
}
