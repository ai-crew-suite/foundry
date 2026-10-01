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
import { upsertCatalogEntry } from '../lib/catalogFile.js';

const SAMPLE_YARNRC = [
  'yarnPath: .yarn/releases/yarn-4.18.0.cjs',
  '',
  'catalogs:',
  '  # Production dependencies.',
  '  prod:',
  '    "@backstage/cli": "^0.36.4"',
  '    "chalk": "^6.0.1"',
  '',
  '  # Development/Tooling dependencies.',
  '  dev:',
  '    "@types/node": "^26.1.1"',
  '    "rollup": "^4.63.5"',
  '',
].join('\n');

describe('upsertCatalogEntry', () => {
  it('inserts a new entry at the end of the named catalog block', () => {
    const result = upsertCatalogEntry(SAMPLE_YARNRC, 'prod', 'lodash', '^4.17.21');
    const lines = result.split('\n');

    expect(lines).toContain('    "lodash": "^4.17.21"');
    // Inserted after the last existing "prod" entry, before the blank separator line.
    expect(lines.indexOf('    "lodash": "^4.17.21"')).toBe(lines.indexOf('    "chalk": "^6.0.1"') + 1);
    // The "dev" catalog is untouched.
    expect(result).toContain('    "@types/node": "^26.1.1"');
    expect(result).toContain('    "rollup": "^4.63.5"');
  });

  it('updates the range of an existing entry in place', () => {
    const result = upsertCatalogEntry(SAMPLE_YARNRC, 'prod', 'chalk', '^7.0.0');

    expect(result).toContain('    "chalk": "^7.0.0"');
    expect(result).not.toContain('"chalk": "^6.0.1"');
    // No duplicate line was added.
    expect(result.match(/"chalk":/g)).toHaveLength(1);
  });

  it('writes into the requested catalog, not a different one', () => {
    const result = upsertCatalogEntry(SAMPLE_YARNRC, 'dev', 'vitest', '5.0.3');
    const lines = result.split('\n');

    expect(lines.indexOf('    "vitest": "5.0.3"')).toBe(lines.indexOf('    "rollup": "^4.63.5"') + 1);
  });

  it('preserves comments and unrelated content', () => {
    const result = upsertCatalogEntry(SAMPLE_YARNRC, 'prod', 'lodash', '^4.17.21');

    expect(result).toContain('yarnPath: .yarn/releases/yarn-4.18.0.cjs');
    expect(result).toContain('  # Production dependencies.');
    expect(result).toContain('  # Development/Tooling dependencies.');
  });

  it('creates a missing named catalog under an existing catalogs: block', () => {
    const yarnrc = ['catalogs:', '  prod:', '    "chalk": "^6.0.1"', ''].join('\n');
    const result = upsertCatalogEntry(yarnrc, 'dev', 'rollup', '^4.63.5');

    expect(result).toContain('  dev:');
    expect(result).toContain('    "rollup": "^4.63.5"');
  });

  it('creates a catalogs: block when none exists', () => {
    const result = upsertCatalogEntry('yarnPath: .yarn/releases/yarn-4.18.0.cjs\n', 'prod', 'lodash', '^4.17.21');

    expect(result).toContain('catalogs:');
    expect(result).toContain('  prod:');
    expect(result).toContain('    "lodash": "^4.17.21"');
  });
});
