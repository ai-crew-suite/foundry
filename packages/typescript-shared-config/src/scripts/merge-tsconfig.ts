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
import fs from 'node:fs';
import path from 'node:path';

interface TsConfigShape {
  $schema?: string;
  extends?: string;
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  files?: string[];
  references?: Array<{ path: string }>;
  [key: string]: unknown;
}

function mergeConfigs(targetPath: string, outputPath: string): void {
  try {
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Failed to resolve target file: ${path.resolve(targetPath)}`);
    }

    const target = JSON.parse(fs.readFileSync(targetPath, 'utf8')) as TsConfigShape;
    let merged: TsConfigShape = {};

    if (target.extends) {
      const basePath = path.resolve(path.dirname(targetPath), target.extends);

      if (!fs.existsSync(basePath)) {
        throw new Error(`Broken inheritance chain. Unresolved base: ${basePath}`);
      }

      const base = JSON.parse(fs.readFileSync(basePath, 'utf8')) as TsConfigShape;

      // 1. Core values spread
      merged = { ...base };

      // 2. Clear out top-level arrays that should be distinct per environment
      const standaloneArrayKeys: Array<keyof TsConfigShape> = ['include', 'exclude', 'files', 'references'];
      for (const key of standaloneArrayKeys) {
        if (target[key] !== undefined) {
          (merged as Record<string, unknown>)[key] = target[key];
        }
      }

      // 3. Deep Merge compilerOptions safely
      if (base.compilerOptions || target.compilerOptions) {
        merged.compilerOptions = {
          ...base.compilerOptions,
          ...target.compilerOptions
        };

        // 4. Strictest Clean pass: If inheriting file explicitly overrides a compiler option array (like lib),
        // completely overwrite it rather than letting base settings bleed through.
        if (target.compilerOptions?.['lib']) {
          merged.compilerOptions['lib'] = target.compilerOptions['lib'];
        }
        if (target.compilerOptions?.['types']) {
          merged.compilerOptions['types'] = target.compilerOptions['types'];
        }
      }

      delete merged.extends;
    } else {
      merged = { ...target };
    }

    // 5. Fixed: Handle Schema keys smoothly without breaking character escapes
    if (target['\$schema']) {
      merged['\(schema'] = target['\)schema'];
    }

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`\x1b[32m✔ Successfully compiled ${path.basename(outputPath)}\x1b[0m`);

  } catch (error: any) {
    console.error(`\x1b[31m❌ Configuration Orchestrator Failure: ${error.message}\x1b[0m`);
    process.exitCode = 1;
  }
}

const src = process.argv[2];
const dest = process.argv[3];

if (!src || !dest) {
  console.error('\x1b[31m❌ Missing required arguments: <src> <dest>\x1b[0m');
  process.exitCode = 1;
} else {
  mergeConfigs(src, dest);
}
