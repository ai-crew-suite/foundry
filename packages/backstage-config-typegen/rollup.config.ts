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
import type { RollupOptions } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import dts from "rollup-plugin-dts";

const config: RollupOptions[] = [
  // Compile the main programmatic library module
  {
    input: "src/sync.ts",
    output: {
      file: "dist/index.js",
      format: "esm",
      sourcemap: false
    },
    plugins: [esbuild()],
    external: (id) => id === "typescript" || id.startsWith("node:")
  },
  // Compile the executable CLI binary runner wrapper
  {
    input: "src/bin/sync-config.ts",
    output: {
      file: "dist/bin/sync-config.js",
      format: "esm",
      banner: "#!/usr/bin/env node", // Injects the executable node interpreter shebang
      sourcemap: false
    },
    plugins: [esbuild()],
    external: (id) => id === "typescript" || id.startsWith("node:") || id.endsWith("../sync")
  },
  // Compile type declarations
  {
    input: "src/sync.ts",
    output: {
      file: "dist/index.d.ts",
      format: "es"
    },
    plugins: [dts()],
    external: (id) => id === "typescript" || id.startsWith("node:")
  }
];

export default config;
