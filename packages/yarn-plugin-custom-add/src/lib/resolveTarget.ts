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
import { resolve } from "node:path";
import { npath, structUtils, type Project } from "@yarnpkg/core";

export interface ResolveTargetOptions {
  repoRoot: string;
  target?: string;
  project: Project; // Leverage the core Yarn project context instance
}

export interface ResolvedTarget {
  kind: "root" | "package";
  packageJsonPath: string;
}

export function resolveTargetPackageJson(options: ResolveTargetOptions): ResolvedTarget {
  const { repoRoot, target, project } = options;

  // Defaults to root package if no target is provided
  if (!target) {
    return { kind: "root", packageJsonPath: resolve(repoRoot, "package.json") };
  }

  // 1. Search the dynamic workspace graph by exact package name matches
  for (const workspace of project.workspaces) {
    if (workspace.manifest.name) {
      const workspaceName = structUtils.stringifyIdent(workspace.manifest.name);
      if (workspaceName === target) {
        const fullDir = npath.fromPortablePath(workspace.cwd);
        return { kind: "package", packageJsonPath: resolve(fullDir, "package.json") };
      }
    }
  }

  // 2. Fall back to relative structural route matching (e.g., "packages/my-app")
  const absoluteTargetDir = resolve(repoRoot, target.replace(/^\.\//, ""));
  for (const workspace of project.workspaces) {
    const fullDir = npath.fromPortablePath(workspace.cwd);
    if (fullDir === absoluteTargetDir) {
      return { kind: "package", packageJsonPath: resolve(fullDir, "package.json") };
    }
  }

  throw new Error(
    `Could not resolve target workspace "${target}". ` +
      `Ensure it is a valid package name or a valid directory layout mapped inside your monorepo workspace.`,
  );
}
