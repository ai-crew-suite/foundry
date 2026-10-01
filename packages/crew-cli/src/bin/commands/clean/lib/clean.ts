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
import fs from 'node:fs';
import path from 'node:path';
import type { WorkspaceContext } from '../../../utils/workspace.js';

export interface CleanResult {
  /** Absolute paths that existed and were removed. */
  removed: string[];
}

/**
 * Resolves the build artifact paths a package's `clean` run should remove:
 * its own `dist`, its mirror under the shared `dist-types` declaration tree,
 * and any stale `tsconfig.tsbuildinfo` composite-build state.
 */
export function getCleanTargets(context: WorkspaceContext): string[] {
  const relativeFromRoot = path.relative(context.repoRoot, context.packageDir);

  return [
    path.resolve(context.packageDir, 'dist'),
    path.resolve(context.repoRoot, 'dist-types', relativeFromRoot),
    path.resolve(context.packageDir, 'tsconfig.tsbuildinfo'),
  ];
}

/** Removes any existing build artifact targets for `context`. */
export function cleanWorkspace(context: WorkspaceContext): CleanResult {
  const removed: string[] = [];

  for (const target of getCleanTargets(context)) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      removed.push(target);
    }
  }

  return { removed };
}
