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
import { globSync } from 'glob';
import { defineConfig } from 'rollup';
import dts from "rollup-plugin-dts";
import esbuild from "rollup-plugin-esbuild";
import fs from 'node:fs';
import path from 'node:path';
import resolve from '@rollup/plugin-node-resolve';

const currentDir = import.meta.dirname;

const entryPoints = globSync([
  path.resolve(currentDir, 'src/bin/crew.ts'),
  path.resolve(currentDir, 'src/bin/commands/**/*.ts'),
  path.resolve(currentDir, 'src/bin/utils/*.ts'),
]);

const outputDir = path.resolve(currentDir, 'dist/bin');

const executableEntryPattern = /\/src\/bin\/(crew|commands\/[^/]+\/index)\.ts$/;

/** Shared external module checker function */
const externalChecker = (id: string): boolean => {
  /** Keep relative imports and internal source files bundled/resolved correctly */
  if (id.startsWith('.') || path.isAbsolute(id)) {
    return false;
  }
  /** Force ALL node_modules packages, node built-ins, and third-party tools to be external */
  return true;
};

export default defineConfig([
  // 1. Build the JavaScript/ESM modules with esbuild
  {
    input: entryPoints,
    output: {
      dir: outputDir,
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: path.resolve(currentDir, 'src/bin'),
      entryFileNames: '[name].js',
      /** Inject a shebang only into files intended to be invoked directly. */
      banner: ({ facadeModuleId }) =>
        facadeModuleId && executableEntryPattern.test(facadeModuleId)
          ? '#!/usr/bin/env node\n'
          : '',
    },
    external: externalChecker,
    plugins: [
      resolve(),
      esbuild({
        tsconfig: path.resolve(currentDir, './tsconfig.json')
      }),
      {
        name: 'make-executable',
        writeBundle() {
          if (process.platform !== 'win32') {
            /** Make the main entry binary executable */
            const entryPath = path.resolve(currentDir, 'dist/bin/crew.js');

            if (fs.existsSync(entryPath)) {
              fs.chmodSync(entryPath, 0o755);
            }

            /** Make all nested command binaries executable */
            const commandFiles = globSync(path.resolve(currentDir, 'dist/bin/commands/**/*.js'));

            for (const file of commandFiles) {
              if (fs.existsSync(file)) {
                fs.chmodSync(file, 0o755);
              }
            }

            console.log('⚡ Main binary and all subcommands marked as executable!');
          }
        }
      }
    ]
  },
  // 2. Build and bundle corresponding type definitions (.d.ts) preserving structure
  {
    input: entryPoints,
    output: {
      dir: outputDir,
      format: 'esm',
      preserveModules: true,
      preserveModulesRoot: path.resolve(currentDir, 'src/bin'),
      entryFileNames: '[name].d.ts',
    },
    external: externalChecker,
    plugins: [
      resolve(),
      dts({
        tsconfig: path.resolve(currentDir, './tsconfig.json')
      })
    ]
  }
]);
