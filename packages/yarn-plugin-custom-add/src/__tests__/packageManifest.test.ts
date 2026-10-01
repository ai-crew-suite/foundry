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
import { upsertCatalogDependency } from '../lib/packageManifest.js';

describe('upsertCatalogDependency', () => {
  it('adds a new dependency to an existing field, sorted alphabetically', () => {
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: { zod: 'catalog:prod' },
    });

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');
    const manifest = JSON.parse(result);

    expect(manifest.dependencies).toEqual({ lodash: 'catalog:prod', zod: 'catalog:prod' });
    expect(Object.keys(manifest.dependencies)).toEqual(['lodash', 'zod']);
  });

  it('creates the field when missing', () => {
    const packageJson = JSON.stringify({ name: '@ai-crew-suite/example' });

    const result = upsertCatalogDependency(packageJson, 'devDependencies', 'rollup', 'dev');
    const manifest = JSON.parse(result);

    expect(manifest.devDependencies).toEqual({ rollup: 'catalog:dev' });
  });

  it('overwrites an existing entry for the same package', () => {
    const packageJson = JSON.stringify({
      name: '@ai-crew-suite/example',
      dependencies: { lodash: '^4.0.0' },
    });

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
    });

    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');
    const manifest = JSON.parse(result);

    expect(manifest.name).toBe('@ai-crew-suite/example');
    expect(manifest.version).toBe('0.0.1');
    expect(manifest.scripts).toEqual({ build: 'rollup -c' });
  });

  it('ends the file with a trailing newline', () => {
    const packageJson = JSON.stringify({ name: '@ai-crew-suite/example' });
    const result = upsertCatalogDependency(packageJson, 'dependencies', 'lodash', 'prod');

    expect(result.endsWith('\n')).toBe(true);
  });
});
