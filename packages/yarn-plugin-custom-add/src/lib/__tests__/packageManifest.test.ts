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
import { describe, expect, it } from 'vitest';
import { upsertCatalogDependency } from '../packageManifest';

describe('upsertCatalogDependency', () => {
  it('adds a new dependency to an existing field, sorted alphabetically', () => {
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: { zod: 'catalog:prod' },
    }, null, 2);

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');
    const manifest = JSON.parse(result);

    expect(manifest.dependencies).toEqual({ lodash: 'catalog:prod', zod: 'catalog:prod' });
    expect(Object.keys(manifest.dependencies)).toEqual(['lodash', 'zod']);
  });

  it('creates the field when missing', () => {
    const packageJson = JSON.stringify({ name: '@ai-crew-suite/example' }, null, 2);

    const result = upsertCatalogDependency(packageJson, 'devDependencies', 'rollup', 'dev');
    const manifest = JSON.parse(result);

    expect(manifest.devDependencies).toEqual({ rollup: 'catalog:dev' });
  });

  it('overwrites an existing entry for the same package', () => {
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: { lodash: '^4.0.0' },
    }, null, 2);

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');
    const manifest = JSON.parse(result);

    expect(manifest.dependencies).toEqual({ lodash: 'catalog:prod' });
  });

  it('leaves unrelated manifest fields untouched', () => {
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      version: '0.0.1',
      scripts: { build: 'rollup -c' },
      dependencies: {},
    }, null, 2);

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');
    const manifest = JSON.parse(result);

    expect(manifest.name).toBe('@ai-crew-suite/example');
    expect(manifest.version).toBe('0.0.1');
    expect(manifest.scripts).toEqual({ build: 'rollup -c' });
  });

  it('ends the file with a trailing newline', () => {
    const packageJson = JSON.stringify({ name: '@ai-crew-suite/example' }, null, 2);
    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');

    expect(result.endsWith('\n')).toBe(true);
  });

  it('automatically detects and preserves 4-space indentation alignment styles', () => {
    const originalManifest = {
      name: '@ai-crew-suite/example',
      dependencies: { zod: 'catalog:prod' }
    };
    const packageJson = JSON.stringify(originalManifest, null, 4); // 4 spaces formatting style

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');

    // Core structural lines must reflect 4 spaces spacing pattern
    expect(result).toContain('\n    "dependencies": {');
    expect(result).toContain('\n        "lodash": "catalog:prod"');
  });

  it('automatically detects and preserves tab indentation layout alignments', () => {
    const originalManifest = {
      name: '@ai-crew-suite/example',
      dependencies: { zod: 'catalog:prod' }
    };
    const packageJson = JSON.stringify(originalManifest, null, '\t'); // Tabs style

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');

    expect(result).toContain('\n\t"dependencies": {');
    expect(result).toContain('\n\t\t"lodash": "catalog:prod"');
  });

  it('guarantees top-level key hierarchy layouts remain unmodified to avoid git drift', () => {
    // Setting an unconventional order (scripts before name) to prove layout retention
    const packageJson = [
      '{',
      '  "scripts": { "test": "vitest" },',
      '  "name": "@ai-crew-suite/example",',
      '  "dependencies": { "zod": "catalog:prod" }',
      '}'
    ].join('\n');

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');
    const sequentialKeys = Object.keys(JSON.parse(result));

    expect(sequentialKeys).toEqual(['scripts', 'name', 'dependencies']);
  });

  it('throws an auditable validation TypeError if the target field block is corrupted or broken', () => {
    const corruptedPackageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: 'this-should-be-an-object-but-is-a-corrupted-string'
    }, null, 2);

    expect(() =>
      upsertCatalogDependency(corruptedPackageJson, 'dependencies', 'lodash', 'prod')
    ).toThrow(TypeError);
  });
});

describe('Advanced Edge-Case Isolation Controls', () => {
  it('handles an explicitly declared empty dependency block cleanly', () => {
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: {},
    }, null, 2);

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');
    const manifest = JSON.parse(result);

    expect(manifest.dependencies).toEqual({ lodash: 'catalog:prod' });
  });

  it('isolates mutations cleanly when package names share a common substring prefix', () => {
    // Compliance Risk: Weak string-matching logic could accidentally match or wipe peer keys
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: {
        'react-dom': 'catalog:prod',
        'react-router': 'catalog:prod',
      },
    }, null, 2);

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'react', 'prod');
    const manifest = JSON.parse(result);

    expect(manifest.dependencies).toEqual({
      'react': 'catalog:prod',
      'react-dom': 'catalog:prod',
      'react-router': 'catalog:prod',
    });
    // Guarantee exact sorted order holds up with the prefix companion keys
    expect(Object.keys(manifest.dependencies)).toEqual(['react', 'react-dom', 'react-router']);
  });

  it('places a newly created devDependencies block directly adjacent to an existing dependencies block', () => {
    // Enforces SOC-2 cosmetic predictability: prevents breaking strict workspace package.json style linters
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: { lodash: 'catalog:prod' },
      scripts: { test: 'vitest' },
    }, null, 2);

    const result = upsertCatalogDependency(packageJson, 'devDependencies', 'vitest', 'dev');
    const structuralKeys = Object.keys(JSON.parse(result));

    // Assert precise index proximity: devDependencies inserts right after dependencies
    const depsIndex = structuralKeys.indexOf('dependencies');
    const devDepsIndex = structuralKeys.indexOf('devDependencies');
    expect(devDepsIndex).toBe(depsIndex + 1);
  });
});
