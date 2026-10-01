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
import type { RollupOptions } from "rollup";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const entries: string[] = ["base", "node", "web"];

// 1. Build configuration for JavaScript outputs
const jsConfigs: RollupOptions = {
  input: {
    base: "src/base.ts",
    node: "src/node.ts",
    web: "src/web.ts"
  },
  output: {
    dir: "dist",
    format: "esm",
    entryFileNames: "[name].js",
    sourcemap: true
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: false
    })
  ],
  external: ["prettier"]
};

// 2. Build configuration arrays for DTS outputs
const dtsConfigs: RollupOptions[] = entries.map((name: string): RollupOptions => {
  return {
    input: `src/${name}.ts`,
    output: {
      file: `dist/${name}.d.ts`,
      format: "esm"
    },
    plugins: [
      dts()
    ],
    external: ["prettier"]
  };
});

// 3. Export all configuration passes cleanly using native arrays
const config: RollupOptions[] = [jsConfigs, ...dtsConfigs];
export default config;
