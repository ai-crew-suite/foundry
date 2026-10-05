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
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin as RollupPlugin, RollupOptions } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";
import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json"; // Added JSON parser plugin

// Isolate the absolute project directory path matching ESM specifications
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and parse the package version directly using native Node filesystems
const packageJsonPath = resolve(__dirname, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string };
const version = packageJson.version;

// Define the explicit enterprise file layout naming format
const pluginName = 'yarn-plugin-custom-add';
const bundleFileName = `dist/${pluginName}-v${version}.cjs`;
const dtsFileName = `dist/${pluginName}-v${version}.d.ts`;

/**
 * Yarn loads file-based plugins expecting the `{ name, factory(require) }` envelope
 * (the same format @yarnpkg/builder emits). All external requires inside the bundle
 * must flow through the factory-provided require: Yarn resolves `clipanion`,
 * `@yarnpkg/core`, and `@yarnpkg/cli` to its own bundled module instances there.
 * Resolving them through regular Node resolution instead would load a duplicate
 * Clipanion whose option-descriptor Symbols don't match Yarn's instance, silently
 * stripping every option from the registered commands.
 */
function yarnPluginEnvelope(): RollupPlugin {
  return {
    name: "yarn-plugin-envelope",
    renderChunk(code) {
      return [
        "module.exports = {",
        `  name: ${JSON.stringify(`@ai-crew-suite/${pluginName}`)},`,
        "  factory: function (require) {",
        '    "use strict";',
        "    const module = { exports: {} };",
        code,
        "    return module.exports;",
        "  },",
        "};",
        "",
      ].join("\n");
    },
  };
}

const config: RollupOptions[] = [
  // 1. Build the JavaScript/CommonJS bundle, inlining third-party dependencies
  {
    input: "src/index.ts",
    output: {
      file: bundleFileName,
      format: "cjs",
      exports: "default",
      sourcemap: false
    },
    plugins: [
      json(), // Converts .json files into trackable AST data nodes for Rollup
      nodeResolve({
        exportConditions: ["node"],
        preferBuiltins: true
      }),
      commonjs(),
      esbuild({
        tsconfig: "./tsconfig.json",
        minify: false
      }),
      yarnPluginEnvelope()
    ],
    // Keep Yarn internals, Clipanion, and Node built-ins external. Everything else gets bundled.
    // Clipanion MUST stay external: option descriptors are keyed by a per-module Symbol,
    // so a bundled duplicate copy would be invisible to Yarn's own Clipanion instance.
    external: (id) =>
      id === "clipanion" ||
      id.startsWith("clipanion/") ||
      id === "@yarnpkg/core" ||
      id.startsWith("@yarnpkg/core/") ||
      id === "@yarnpkg/cli" ||
      id.startsWith("@yarnpkg/cli/") ||
      id.startsWith("node:")
  },
  // 2. Build and bundle the type declarations (.d.ts) matching the identical version name
  {
    input: "src/index.ts",
    output: {
      file: dtsFileName,
      format: "es"
    },
    plugins: [
      dts({
        tsconfig: "./tsconfig.json"
      })
    ],
    external: (id) =>
      id === "clipanion" ||
      id.startsWith("clipanion/") ||
      id === "@yarnpkg/core" ||
      id.startsWith("@yarnpkg/core/") ||
      id === "@yarnpkg/cli" ||
      id.startsWith("@yarnpkg/cli/") ||
      id.startsWith("node:")
  }
];

export default config;
