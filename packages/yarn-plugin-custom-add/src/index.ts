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
import { MessageName, type Plugin, type Project } from "@yarnpkg/core";
import { CustomAddCommand } from "./commands/add";

/** Shape of the reporting facade Yarn passes to the `validateProject` hook. */
interface ValidationReport {
  reportWarning: (name: MessageName, text: string) => void;
  reportError: (name: MessageName, text: string) => void;
}

const NATIVE_ADD_REDIRECT_MESSAGE =
  `The native "yarn add" command is disabled in this repository.\n` +
  `To manage dependencies while maintaining Named Catalogs compliance, ` +
  `use the transactional catalog command instead:\n` +
  `  yarn catalog-add <package-name>\n` +
  `  yarn catalog-add <package-name> --dev (-D)`;

/**
 * Detects a native `yarn add` invocation from the raw process arguments.
 * Matches globally routed `yarn` shims, `yarn.js` releases, and `yarn.cjs` bundles,
 * while leaving the custom `catalog-add` command untouched.
 */
function isNativeAddInvocation(argv: string[]): boolean {
  return argv.some((arg, index) => {
    const previousArg = argv[index - 1];
    if (arg !== "add" || !previousArg) return false;

    return (
      previousArg.endsWith("yarn") ||
      previousArg.endsWith("yarn.js") ||
      previousArg.endsWith("yarn.cjs")
    );
  });
}

const plugin: Plugin = {
  commands: [CustomAddCommand],

  hooks: {
    // `yarn add` performs a project install after mutating the manifest; the
    // validateProject hook fires inside that install flow, which is the only
    // interception point available to plugins for blocking the native command.
    validateProject: async (_project: Project, report: ValidationReport) => {
      if (isNativeAddInvocation(process.argv)) {
        report.reportError(MessageName.UNNAMED, NATIVE_ADD_REDIRECT_MESSAGE);
      }
    },
  },
};

export default plugin;
