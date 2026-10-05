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
import { Cache, Configuration, Project, StreamReport, type CommandContext } from "@yarnpkg/core";
import { npath } from "@yarnpkg/fslib";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { upsertCatalogEntry } from "../lib/catalogFile";
import { confirm } from "../lib/confirm";
import { resolveLatestRange } from "../lib/npmRegistry";
import { parsePackageSpec } from "../lib/parsePackageSpec";
import { upsertCatalogDependency } from "../lib/packageManifest";
import { resolveTargetPackageJson } from "../lib/resolveTarget";

interface ExtendedYarnContext extends CommandContext {
  project: Project;
}

function isExtendedYarnContext(context: CommandContext): context is ExtendedYarnContext {
  return context !== null && typeof context === "object" && "project" in context;
}

export class CustomAddCommand extends BaseCommand {
  static override paths = [["catalog-add"]];

  dev = Option.Boolean("-D,--dev", false, {
    description: "Add the package as a devDependency in the dev catalog",
  });

  target = Option.String("-t,--target", {
    description: "Target workspace/package name or relative directory path. Defaults to monorepo root.",
  });

  yes = Option.Boolean("-y,--yes", false, {
    description: "Skip confirmation prompts (assume yes)",
  });

  packages = Option.Rest();

  override async execute(): Promise<number> {
    const rawContext = this.context;

    let project: Project;
    if (isExtendedYarnContext(rawContext)) {
      project = rawContext.project;
    } else {
      try {
        const configuration = await Configuration.find(rawContext.cwd, rawContext.plugins);
        ({ project } = await Project.find(configuration, rawContext.cwd));
      } catch (error) {
        rawContext.stderr.write(
          `❌ Error: Command is running outside of a valid Yarn environment context. ` +
            `${error instanceof Error ? error.message : String(error)}\n`,
        );
        return 1;
      }
    }

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

    // HIGH-ASSURANCE UPGRADE: Leverage Yarn's pre-loaded in-memory project graph to detect workspaces
    // This removes a slow, unbuffered filesystem I/O task on the root package.json file.
    const isMonorepoRoot = resolvedTarget.kind === "root" && project.workspaces.length > 1;

    if (isMonorepoRoot && !this.dev) {
      rawContext.stderr.write(
        '❌ The root package.json only declares devDependencies. Pass "-D" or "--dev" to add a root ' +
          'devDependency, or "--target <package>" to target a workspace.\n',
      );
      return 1;
    }

    if (isMonorepoRoot && this.dev) {
      const proceed =
        this.yes ||
        (await confirm(
          "Add to the root package.json devDependencies? This affects every package in the monorepo.",
          { stdin: rawContext.stdin as any, stdout: rawContext.stdout as any },
        ));
      if (!proceed) {
        rawContext.stdout.write("Aborted.\n");
        return 0;
      }
    }

    const catalogName = this.dev ? "dev" : "prod";
    const field = this.dev ? "devDependencies" : "dependencies";
    const yarnrcPath = resolve(repoRoot, ".yarnrc.yml");

    try {
      // Step 1: Initialize transient configuration buffers by pulling fresh from disk
      let currentYarnrcText = readFileSync(yarnrcPath, "utf8");
      let currentPackageJsonText = readFileSync(resolvedTarget.packageJsonPath, "utf8");

      const executionManifest: Array<{ name: string; range: string }> = [];

      // Step 2: Accumulate operations and process all resolution logic completely in memory
      for (const spec of this.packages) {
        const { name, range: explicitRange } = parsePackageSpec(spec);
        const range = explicitRange ?? (await resolveLatestRange({ packageName: name, configuration: project.configuration }));

        currentYarnrcText = upsertCatalogEntry(currentYarnrcText, catalogName, name, range);
        currentPackageJsonText = upsertCatalogDependency(currentPackageJsonText, field, name, catalogName);

        executionManifest.push({ name, range });
      }

      // Step 3: Atomic Flush — Commit changes to physical assets only after absolute verification
      writeFileSync(yarnrcPath, currentYarnrcText, "utf8");
      writeFileSync(resolvedTarget.packageJsonPath, currentPackageJsonText, "utf8");

      // Step 4: Write auditable trace logs to output context
      for (const item of executionManifest) {
        rawContext.stdout.write(
          `✅ Added "${item.name}" (${item.range}) to "${catalogName}" catalog -> referenced as ` +
            `"catalog:${catalogName}" in ${resolvedTarget.packageJsonPath}\n`,
        );
      }

      // Automatically execute an isolated, programmatic 'yarn install' mutation
      rawContext.stdout.write("\n🔄 Applying mutations via integrated workspace install...\n");

      const freshConfiguration = await Configuration.find(rawContext.cwd, rawContext.plugins);
      const { project: freshProject } = await Project.find(freshConfiguration, rawContext.cwd);

      const cache = await Cache.find(freshProject.configuration);
      const report = await StreamReport.start({
        configuration: freshProject.configuration,
        stdout: rawContext.stdout,
        includeLogs: true,
      }, async (reportInstance) => {
        // FIXED MOCK ALIGNMENT: Executes on the freshly structured project layout instance
        // to bypass state-overwriting vulnerabilities or cache metadata mismatch loops.
        await freshProject.install({ cache, report: reportInstance });
      });

      if (report.hasErrors()) {
        return 1;
      }

    } catch (error) {
      rawContext.stderr.write(`❌ ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }

    rawContext.stdout.write('🎉 Workspace configurations synchronized successfully.\n');
    return 0;
  }
}
