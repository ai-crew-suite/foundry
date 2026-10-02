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
  const targetFilename = path.basename(targetPath);

  try {
    // 1. Guard: Validate Target File Existence
    if (!fs.existsSync(targetPath)) {
      throw new Error(
        `Failed to resolve target configuration file "${targetFilename}".\n` +
        `   Checked Path:  ${path.resolve(targetPath)}\n` +
        `   Remediation:   Verify the file exists and that the build script argument matches the file location.`
      );
    }

    // 2. Guard: Validate Target File JSON Syntax
    let target: TsConfigShape;
    try {
      target = JSON.parse(fs.readFileSync(targetPath, 'utf8')) as TsConfigShape;
    } catch (parseError: any) {
      throw new Error(
        `Malformed JSON syntax detected inside "${targetFilename}".\n` +
        `   Internal Error: ${parseError.message}\n` +
        `   Remediation:    Run 'yarn format' or fix syntax anomalies like missing brackets or trailing commas.`
      );
    }

    let merged: TsConfigShape = {};

    if (target.extends) {
      const basePath = path.resolve(path.dirname(targetPath), target.extends);

      // 3. Guard: Validate Inherited 'extends' File Existence
      if (!fs.existsSync(basePath)) {
        throw new Error(
          `Broken inheritance chain detected inside "${targetFilename}".\n` +
          `   Declared:     "extends": "${target.extends}"\n` +
          `   Unresolved:   ${basePath}\n` +
          `   Remediation:  Verify the path is accurate relative to the folder containing "${targetFilename}".`
        );
      }

      // 4. Guard: Validate Base File JSON Syntax
      let base: TsConfigShape;
      try {
        base = JSON.parse(fs.readFileSync(basePath, 'utf8')) as TsConfigShape;
      } catch (parseError: any) {
        throw new Error(
          `Malformed JSON syntax detected inside base configuration "${path.basename(basePath)}" (inherited by "${targetFilename}").\n` +
          `   Internal Error: ${parseError.message}\n` +
          `   Remediation:    Fix syntax anomalies inside the base configuration file.`
        );
      }

      // Spread top-level keys from base config
      merged = { ...base };

      // Deep merge compilerOptions to allow specific downstream overrides
      if (target.compilerOptions) {
        merged.compilerOptions = { ...base.compilerOptions, ...target.compilerOptions };
      }

      // Top-level array keys overwrite base definitions entirely per TypeScript standards
      const arrayKeys: Array<keyof TsConfigShape> = ['include', 'exclude', 'files', 'references'];
      for (const key of arrayKeys) {
        if (target[key] !== undefined) {
          (merged as Record<string, unknown>)[key] = target[key];
        }
      }

      // Strip the extends pointer out since it's now flat
      delete merged.extends;
    } else {
      merged = target;
    }

    // Preserve schema if targeted explicitly by downstream file
    if (target['\$schema']) {
      merged['\(schema'] = target['\)schema'];
    }

    // Ensure output directory exists cross-platform and write the clean JSON block
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf8');

  } catch (error: any) {
    console.error(
      `\x1b[31m❌ TypeScript Configuration Monorepo Orchestrator Failure\x1b[0m\n` +
      `========================================================================\n` +
      `${error.message}\n` +
      `========================================================================`
    );
    process.exitCode = 1;
  }
}

// Extract terminal input args directly
const src = process.argv[2];
const dest = process.argv[3];

if (!src || !dest) {
  console.error(
    `\x1b[31m❌ TypeScript Configuration Monorepo Orchestrator Failure\x1b[0m\n` +
    `========================================================================\n` +
    `Missing required orchestration file arguments.\n` +
    `   Expected Usage: yarn tsx src/merge-tsconfig.ts <src-file-path> <dest-file-path>\n` +
    `   Received Args:  src="${src || 'undefined'}", dest="${dest || 'undefined'}"\n` +
    `========================================================================`
  );
  process.exitCode = 1;
} else {
  mergeConfigs(src, dest);
}
