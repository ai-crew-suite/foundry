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
import { resolve, win32, posix, sep } from "node:path";
import { structUtils, type Project } from "@yarnpkg/core";

/**
 * Normalizes an execution path cleanly for platform parity.
 * Converts slashes and standardizes character casings across Windows or Unix runtimes.
 */
export function normalizeFileSystemPath(filePath: string): string {
  const isWindows = process.platform === "win32";

  // Use platform-specific path resolution engines to allow testing Windows behaviors on Linux host machines
  let resolved = isWindows ? win32.resolve(filePath) : posix.resolve(filePath);

  if (isWindows) {
    resolved = resolved.replace(/\//g, "\\");
    // Force uppercase drive letters using charAt to satisfy strict type safety rules
    if (/^[a-z]:/i.test(resolved)) {
      resolved = resolved.charAt(0).toUpperCase() + resolved.slice(1);
    }
  }
  return resolved;
}

export interface ResolveTargetOptions {
  repoRoot: string;
  target?: string;
  project: Project;
}

export interface ResolvedTarget {
  kind: "root" | "package";
  packageJsonPath: string;
}

export function resolveTargetPackageJson(options: ResolveTargetOptions): ResolvedTarget {
  const { repoRoot, target, project } = options;
  const normalizedRoot = normalizeFileSystemPath(repoRoot);

  if (!target) {
    return { kind: "root", packageJsonPath: resolve(normalizedRoot, "package.json") };
  }

  // 1. Search the workspace graph by exact package name matches
  for (const workspace of project.workspaces) {
    if (workspace.manifest.name) {
      const workspaceName = structUtils.stringifyIdent(workspace.manifest.name);
      if (workspaceName === target) {
        const fullDir = normalizeFileSystemPath(workspace.cwd);
        return { kind: "package", packageJsonPath: resolve(fullDir, "package.json") };
      }
    }
  }

  // 2. Structural path route tracking with strict traversal boundaries
  const absoluteTargetDir = normalizeFileSystemPath(resolve(normalizedRoot, target));

  // Security Verification: Guarantee path target resides explicitly inside repoRoot bounds
  if (!absoluteTargetDir.startsWith(normalizedRoot + sep) && absoluteTargetDir !== normalizedRoot) {
    throw new Error(`Security Violation: Target path "${target}" falls outside the authorized repository boundary.`);
  }

  for (const workspace of project.workspaces) {
    const fullDir = normalizeFileSystemPath(workspace.cwd);
    if (fullDir === absoluteTargetDir) {
      return { kind: "package", packageJsonPath: resolve(fullDir, "package.json") };
    }
  }

  throw new Error(
    `Could not resolve target workspace "${target}". ` +
      `Ensure it is a valid package name or a valid directory layout mapped inside your monorepo workspace.`,
  );
}
