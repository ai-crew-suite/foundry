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
import { globSync } from 'glob';
import path from 'node:path';
import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';

const currentDir = import.meta.dirname;
const sourceDir = path.resolve(currentDir, 'src');
const external = (id: string): boolean => !id.startsWith('.') && !path.isAbsolute(id);

export default defineConfig([
  {
    input: [
      path.join(sourceDir, 'index.ts'),
      ...globSync('commands/**/*.{ts,tsx}', {
        cwd: sourceDir,
        absolute: true,
        ignore: ['**/__tests__/**'],
      }),
    ],
    output: {
      dir: path.resolve(currentDir, 'dist'),
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: sourceDir,
      entryFileNames: '[name].js',
    },
    external,
    plugins: [resolve(), esbuild({ tsconfig: path.resolve(currentDir, 'tsconfig.json') })],
  },
  {
    input: path.join(sourceDir, 'index.ts'),
    output: { file: path.resolve(currentDir, 'dist/index.d.ts'), format: 'esm' },
    external,
    plugins: [resolve(), dts({ tsconfig: path.resolve(currentDir, 'tsconfig.json') })],
  },
]);
