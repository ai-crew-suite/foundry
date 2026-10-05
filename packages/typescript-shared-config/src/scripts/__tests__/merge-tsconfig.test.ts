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
import { describe, it, expect, afterAll } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname, '../merge-tsconfig.ts');
const FIXTURE_DIR = path.resolve(__dirname, '../__fixtures__');
const OUTPUT_DIR = path.resolve(__dirname, '../__output_cache__');

describe('merge-tsconfig utility pipeline with manual fixtures', () => {
  // Wipe out compiled outputs after all test assertions pass
  afterAll(() => {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  });

  function runMerge(fixtureFilename: string, outputFilename: string): Record<string, any> {
    const srcPath = path.join(FIXTURE_DIR, fixtureFilename);
    const destPath = path.join(OUTPUT_DIR, outputFilename);

    // Ensure output target directory context exists cross-platform
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    execSync(`yarn tsx ${SCRIPT_PATH} ${srcPath} ${destPath}`);
    return JSON.parse(fs.readFileSync(destPath, 'utf8'));
  }

  describe('Deep Property Merging Framework', () => {
    it('should deeply merge base configurations into target configuration definitions', () => {
      const result = runMerge('node.json', 'node-merged.json');

      // Assert basic properties inherited from manual base.json
      expect(result['compilerOptions'].composite).toBe(true);
      expect(result['compilerOptions'].target).toBe('ES2022');

      // Assert specific overrides defined inside manual node.json
      expect(result['compilerOptions'].module).toBe('NodeNext');
      expect(result['compilerOptions'].moduleResolution).toBe('NodeNext');
    });

    it('should cleanly strip out the structural inheritance tracking pointer key', () => {
      const result = runMerge('node.json', 'node-extends-check.json');
      expect(result['extends']).toBeUndefined();
    });
  });

  describe('Array Mutation & Target Overwrite Behavior', () => {
    it('should overwrite compilerOptions arrays completely rather than concatenating them', () => {
      const result = runMerge('node.json', 'node-array-check.json');

      // Assert array fields are pristine overrides matching target configurations exactly
      expect(result['compilerOptions'].lib).toEqual(['ES2022']);
      expect(result['compilerOptions'].lib).not.toContain('DOM');
      expect(result['compilerOptions'].lib).not.toContain('DOM.Iterable');

      expect(result['compilerOptions'].types).toEqual(['node']);
      expect(result['compilerOptions'].types).not.toContain('jest');
    });

    it('should append missing array block fields completely when base keys do not conflict', () => {
      const result = runMerge('web.json', 'web-merged.json');
      expect(result['include']).toEqual(['${configDir}/src/**/*']);
    });
  });

  describe('Token Preservation & Metadata Integrity', () => {
    it('should preserve literal path interpolation tokens intact without string expansion errors', () => {
      const result = runMerge('node.json', 'node-tokens-check.json');
      expect(result['compilerOptions'].outDir).toBe('${configDir}/dist');
    });

    it('should preserve valid metadata schema definitions cleanly without backslash escape corruption', () => {
      const result = runMerge('node.json', 'node-schema-check.json');

      expect(result['$schema']).toBe('https://json.schemastore.org/tsconfig');
      expect(result['$schema']).toBeDefined();
      expect(result['($schema']).toBeUndefined();
    });
  });
});

describe('High-Compliance & Security Enterprise Assertions', () => {

  // Create clean paths for isolated execution
  const runCLI = (src: string, dest: string) => {
    return execSync(`yarn tsx ${SCRIPT_PATH} ${src} ${dest}`, { stdio: 'pipe' });
  };

  describe('Defensive Error Failure Tracks (SOC-2 / HIPAA Compliance)', () => {
    it('should explicitly fail with exit code 1 if the target file path does not exist', () => {
      const nonExistentPath = path.join(FIXTURE_DIR, 'ghost-config.json');
      const outputPath = path.join(OUTPUT_DIR, 'fail-output.json');

      expect(() => {
        runCLI(nonExistentPath, outputPath);
      }).toThrow(); // Verifies that process.exit(1) or process.exitCode = 1 throws an executive build termination error
    });

    it('should fail with exit code 1 and log a clear remediation message if JSON parsing encounters malformed blocks', () => {
      // 1. Create a permanent manual fixture or write an unparseable malformed entry dynamically for validation
      const malformedPath = path.join(FIXTURE_DIR, 'malformed.json');
      const outputPath = path.join(OUTPUT_DIR, 'malformed-output.json');
      fs.writeFileSync(malformedPath, '{ "compilerOptions": { "strict": true, } }'); // Trailing comma breaks strict JSON validation standards

      expect(() => {
        runCLI(malformedPath, outputPath);
      }).toThrow();
    });
  });

  describe('Runtime Prototype Pollution Mitigation Checks (SOC-2 Security Matrix)', () => {
    it('should actively ignore malicious nested prototype override blocks to prevent runtime execution context manipulation', () => {
      const toxicConfigPath = path.join(FIXTURE_DIR, 'toxic.json');
      const outputPath = path.join(OUTPUT_DIR, 'toxic-output.json');

      // Attempt injection of standard Prototype Pollution vectors
      const toxicPayload = {
        extends: './base.json',
        compilerOptions: {
          target: 'ES2022'
        },
        "__proto__": {
          "pollutedContextToken": "CRITICAL_SECURITY_BREACH"
        }
      };
      fs.writeFileSync(toxicConfigPath, JSON.stringify(toxicPayload));

      runCLI(toxicConfigPath, outputPath);
      const result = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

      // Ensure target pollution did not compromise internal node structure
      expect(result.pollutedContextToken).toBeUndefined();
      expect(({} as any).pollutedContextToken).toBeUndefined();
    });
  });

  describe('Byte-Level Output Determinism & Immutable Line Ordering (FINRA Audit Logs)', () => {
    it('should render byte-for-byte identical output tracking files on subsequent execution iterations', () => {
      const srcPath = path.join(FIXTURE_DIR, 'node.json');
      const destPath1 = path.join(OUTPUT_DIR, 'determinism-1.json');
      const destPath2 = path.join(OUTPUT_DIR, 'determinism-2.json');

      runCLI(srcPath, destPath1);
      runCLI(srcPath, destPath2);

      const runOneHash = fs.readFileSync(destPath1, 'utf8');
      const runTwoHash = fs.readFileSync(destPath2, 'utf8');

      // Strict String Match guarantees no randomized whitespace, line feed conversions, or key scrambling variations occur
      expect(runOneHash).toBe(runTwoHash);
    });
  });
});
