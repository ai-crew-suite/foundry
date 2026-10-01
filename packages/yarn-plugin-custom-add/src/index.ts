/**
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
import type { Plugin, Project, Report } from "@yarnpkg/core";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { upsertCatalogEntry } from "./lib/catalogFile.js";
import { confirm } from "./lib/confirm.js";
import { resolveLatestRange } from "./lib/npmRegistry.js";
import { parseAddInvocationArgs, parsePackageSpec } from "./lib/parseAddInvocation.js";
import { upsertCatalogDependency } from "./lib/packageManifest.js";
import { resolveTargetPackageJson } from "./lib/resolveTarget.js";

type YarnFactoryRequire = Parameters<Plugin["factory"]>[0];

const ADD_COMMAND_NAME = "add";
/** `process.argv` is `[node, yarnPath, <command>, ...args]`. */
const COMMAND_ARG_INDEX = 2;

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

/**
 * Redirects `yarn add` onto the repo's named catalogs: the resolved version
 * range is written to `.yarnrc.yml` and the target package.json gets a
 * `catalog:<name>` reference instead of a raw semver range.
 */
async function interceptAdd(project: Project): Promise<void> {
  if (process.argv[COMMAND_ARG_INDEX] !== ADD_COMMAND_NAME) {
    return;
  }

  const { specs, dev, target } = parseAddInvocationArgs(process.argv.slice(COMMAND_ARG_INDEX + 1));

  if (specs.length === 0) {
    return;
  }

  const repoRoot = project.cwd;

  let resolvedTarget;
  try {
    resolvedTarget = resolveTargetPackageJson({ repoRoot, target });
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  if (resolvedTarget.kind === "root" && !dev) {
    fail(
      'The root package.json only declares devDependencies. Pass "--dev" to add a root ' +
        'devDependency, or "--target <package>" to add a dependency to a specific package.',
    );
  }

  if (resolvedTarget.kind === "root" && dev) {
    const proceed = await confirm(
      "Add to the root package.json devDependencies? This affects every package in the monorepo.",
    );
    if (!proceed) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  const catalogName = dev ? "dev" : "prod";
  const field = dev ? "devDependencies" : "dependencies";
  const yarnrcPath = resolve(repoRoot, ".yarnrc.yml");

  try {
    for (const spec of specs) {
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

      console.log(
        `✅ Added "${name}" (${range}) to the "${catalogName}" catalog and referenced it as ` +
          `"catalog:${catalogName}" in ${resolvedTarget.packageJsonPath}`,
      );
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  console.log('\nRun "yarn install" to apply the change.');
  process.exit(0);
}

const plugin: Plugin = {
  name: "@ai-crew-suite/yarn-plugin-custom-add",
  factory: (_require: YarnFactoryRequire) => {
    return {
      hooks: {
        validateProject(project: Project, _report: Report): Promise<void> {
          return interceptAdd(project);
        },
      },
    };
  },
};

export default plugin;
