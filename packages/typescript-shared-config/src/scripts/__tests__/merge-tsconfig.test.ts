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
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Resolve current directory context for native ESM/TypeScript execution loops
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../merge-tsconfig.ts');
const FIXTURE_DIR = path.resolve(__dirname, '__fixtures__');

describe('merge-tsconfig utility pipeline', () => {
  beforeEach(() => {
    if (!fs.existsSync(FIXTURE_DIR)) {
      fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  });

  it('should deeply merge compilerOptions while keeping \${configDir} tokens intact verbatim', () => {
    const baseConfig = {
      compilerOptions: {
        composite: true,
        target: 'ES2022',
        outDir: '\${configDir}/dist'
      }
    };

    const nodeConfig = {
      extends: './base.json',
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext'
      },
      include: ['\${configDir}/src/**/*'],
      exclude: ['\${configDir}/node_modules']
    };

    fs.writeFileSync(path.join(FIXTURE_DIR, 'base.json'), JSON.stringify(baseConfig, null, 2));
    fs.writeFileSync(path.join(FIXTURE_DIR, 'node.json'), JSON.stringify(nodeConfig, null, 2));

    const outputPath = path.join(FIXTURE_DIR, 'dist-node.json');

    execSync(`yarn tsx ${SCRIPT_PATH} ${path.join(FIXTURE_DIR, 'node.json')} ${outputPath}`);

    const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

    // Verify properties from base.json are present
    expect(result.compilerOptions.composite).toBe(true);
    expect(result.compilerOptions.target).toBe('ES2022');

    // Verify properties from node.json overrode or augmented base configuration options
    expect(result.compilerOptions.module).toBe('NodeNext');
    expect(result.compilerOptions.moduleResolution).toBe('NodeNext');

    // Verify token variables remained completely intact and were not expanded
    expect(result.compilerOptions.outDir).toBe('\${configDir}/dist');
    expect(result.include).toEqual(['\${configDir}/src/**/*']);
    expect(result.exclude).toEqual(['\${configDir}/node_modules']);

    // Verify structural inheritance keys were stripped out
    expect(result.extends).toBeUndefined();
  });
});
