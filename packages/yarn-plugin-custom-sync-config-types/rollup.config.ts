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
import typescript from "@rollup/plugin-typescript";

const config: RollupOptions = {
  input: {
    sync: "src/sync.ts",
    bin: "src/bin.ts"
  },
  output: {
    dir: "dist",
    format: "es",
    sourcemap: false,
    entryFileNames: "[name].js",
    /** Inject a shebang only into the executable CLI entry. */
    banner: (chunk) => (chunk.name === "bin" ? "#!/usr/bin/env node\n" : "")
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true,
      declarationDir: "dist"
    })
  ],
  external: (id) => id === "typescript" || id.startsWith("node:")
};

export default config;
