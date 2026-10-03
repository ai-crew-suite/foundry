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
import { BaseCommand } from "@yarnpkg/cli";
import { Option } from "clipanion";
import type { CommandContext, Project } from "@yarnpkg/core";
import { npath } from "@yarnpkg/fslib";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { upsertCatalogEntry } from "../lib/catalogFile.js";
import { confirm } from "../lib/confirm.js";
import { resolveLatestRange } from "../lib/npmRegistry.js";
import { parsePackageSpec } from "../lib/parsePackageSpec.js";
import { upsertCatalogDependency } from "../lib/packageManifest.js";
import { resolveTargetPackageJson } from "../lib/resolveTarget.js";

/**
 * Structural shape of the extended execution context Yarn passes at runtime.
 */
interface ExtendedYarnContext extends CommandContext {
  project: Project;
}

/**
 * Type guard to safely check and narrow the base context down to our runtime shape.
 */
function isExtendedYarnContext(context: CommandContext): context is ExtendedYarnContext {
  return context !== null && typeof context === "object" && "project" in context;
}

export class CustomAddCommand extends BaseCommand {
  static override paths = [["add"]];

  dev = Option.Boolean("-D,--dev", false, {
    description: "Add the package as a devDependency in the dev catalog",
  });

  target = Option.String("-t,--target", {
    description: "Target workspace/package name or relative directory path. Defaults to monorepo root.",
  });

  packages = Option.Rest();

  override async execute(): Promise<number> {
    const rawContext = this.context;

    // Type guard dynamically checks and narrows the structure without type assertions
    if (!isExtendedYarnContext(rawContext)) {
      this.context.stderr.write("❌ Error: Command is running outside of a valid Yarn environment context.\n");
      return 1;
    }

    // TypeScript now safely tracks rawContext as ExtendedYarnContext
    const project = rawContext.project;
    const repoRoot = npath.fromPortablePath(project.cwd);

    if (this.packages.length === 0) {
      rawContext.stderr.write("❌ No packages specified.\n");
      return 1;
    }

    let resolvedTarget;
    try {
      resolvedTarget = resolveTargetPackageJson({ repoRoot, target: this.target, project });
    } catch (error) {
      rawContext.stderr.write(`❌ ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }

    if (resolvedTarget.kind === "root" && !this.dev) {
      rawContext.stderr.write(
        '❌ The root package.json only declares devDependencies. Pass "-D" or "--dev" to add a root ' +
          'devDependency, or "--target <package>" to target a workspace.\n',
      );
      return 1;
    }

    if (resolvedTarget.kind === "root" && this.dev) {
      const proceed = await confirm(
        "Add to the root package.json devDependencies? This affects every package in the monorepo.",
      );
      if (!proceed) {
        rawContext.stdout.write("Aborted.\n");
        return 0;
      }
    }

    const catalogName = this.dev ? "dev" : "prod";
    const field = this.dev ? "devDependencies" : "dependencies";
    const yarnrcPath = resolve(repoRoot, ".yarnrc.yml");

    try {
      for (const spec of this.packages) {
        const { name, range: explicitRange } = parsePackageSpec(spec);
        const range = explicitRange ?? (await resolveLatestRange(name));

        const yarnrcText = readFileSync(yarnrcPath, "utf8");
        writeFileSync(yarnrcPath, upsertCatalogEntry(yarnrcText, catalogName, name, range), "utf8");

        const packageJsonText = readFileSync(resolvedTarget.packageJsonPath, "utf8");
        writeFileSync(
          resolvedTarget.packageJsonPath,
          upsertCatalogDependency(packageJsonText, field, name, catalogName),
          "utf8",
        );

        rawContext.stdout.write(
          `✅ Added "${name}" (${range}) to "${catalogName}" catalog -> referenced as ` +
            `"catalog:${catalogName}" in ${resolvedTarget.packageJsonPath}\n`,
        );
      }
    } catch (error) {
      rawContext.stderr.write(`❌ ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }

    rawContext.stdout.write('\nRun "yarn install" to apply the changes.\n');
    return 0;
  }
}
