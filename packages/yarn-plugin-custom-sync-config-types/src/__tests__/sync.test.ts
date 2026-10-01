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
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSourceFile, ScriptTarget } from 'typescript';
import {
  buildGeneratedFileContents,
  extractConfigPropertyType,
  syncConfigTypes,
} from '../sync.js';

describe('extractConfigPropertyType', () => {
  it('returns the source text of the requested Config property', () => {
    const sourceCode = `
      export interface Config {
        ai?: {
          apiKey: string;
        };
      }
    `;
    const sourceFile = createSourceFile('config.d.ts', sourceCode, ScriptTarget.Latest, true);
    const propertyType = extractConfigPropertyType(sourceFile, sourceCode, 'ai');

    expect(propertyType).toBeDefined();
    expect(propertyType).toContain('apiKey: string;');
    expect(propertyType?.trim().startsWith('{')).toBe(true);
  });

  it('returns undefined when the property is missing', () => {
    const sourceCode = `
      export interface Config {
        other?: { value: string };
      }
    `;
    const sourceFile = createSourceFile('config.d.ts', sourceCode, ScriptTarget.Latest, true);

    expect(extractConfigPropertyType(sourceFile, sourceCode, 'ai')).toBeUndefined();
  });

  it('returns undefined when there is no Config interface', () => {
    const sourceCode = `export interface NotConfig { ai?: { apiKey: string }; }`;
    const sourceFile = createSourceFile('config.d.ts', sourceCode, ScriptTarget.Latest, true);

    expect(extractConfigPropertyType(sourceFile, sourceCode, 'ai')).toBeUndefined();
  });
});

describe('buildGeneratedFileContents', () => {
  it('renders the machine-generated header and exported type', () => {
    const content = buildGeneratedFileContents('{ apiKey: string }', 'AiBackendConfig');

    expect(content).toContain('MACHINE GENERATED DO NOT MODIFY DIRECTLY');
    expect(content).toContain('export type AiBackendConfig = { apiKey: string };');
  });
});

describe('syncConfigTypes', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function writeConfigDts(contents: string): string {
    tempDir = mkdtempSync(join(tmpdir(), 'sync-config-types-'));
    const configDtsPath = join(tempDir, 'config.d.ts');
    writeFileSync(configDtsPath, contents, 'utf8');
    return configDtsPath;
  }

  it('extracts the default "ai" property and writes the generated file', () => {
    const configDtsPath = writeConfigDts(`
      export interface Config {
        ai?: {
          apiKey: string;
          model?: string;
        };
      }
    `);
    const targetTypesPath = join(tempDir, 'src/types/index.ts');

    syncConfigTypes({ configDtsPath, targetTypesPath });

    const generated = readFileSync(targetTypesPath, 'utf8');
    expect(generated).toContain('export type AiBackendConfig');
    expect(generated).toContain('apiKey: string;');
  });

  it('supports a custom property name and exported type name', () => {
    const configDtsPath = writeConfigDts(`
      export interface Config {
        search?: {
          enabled: boolean;
        };
      }
    `);
    const targetTypesPath = join(tempDir, 'src/types/search.ts');

    syncConfigTypes({
      configDtsPath,
      targetTypesPath,
      propertyName: 'search',
      exportedTypeName: 'SearchBackendConfig',
    });

    const generated = readFileSync(targetTypesPath, 'utf8');
    expect(generated).toContain('export type SearchBackendConfig');
    expect(generated).toContain('enabled: boolean;');
  });

  it('creates missing target directories', () => {
    const configDtsPath = writeConfigDts(`
      export interface Config {
        ai?: { apiKey: string };
      }
    `);
    const targetTypesPath = join(tempDir, 'deeply/nested/dir/index.ts');

    syncConfigTypes({ configDtsPath, targetTypesPath });

    expect(readFileSync(targetTypesPath, 'utf8')).toContain('AiBackendConfig');
  });

  it('throws when the Config interface does not declare the requested property', () => {
    const configDtsPath = writeConfigDts(`
      export interface Config {
        other?: { value: string };
      }
    `);

    expect(() =>
      syncConfigTypes({
        configDtsPath,
        targetTypesPath: join(tempDir, 'src/types/index.ts'),
      }),
    ).toThrow(/Could not find "ai"/);
  });
});
