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
// packages/yarn-plugin-custom-add/src/__tests__/catalogFile.test.ts
import { describe, expect, it } from 'vitest';
import {
  isTopLevelLine,
  isCatalogEntryLine,
  escapeForRegExp,
  locateCatalogBlock,
  findCatalogInsertionPoint,
  upsertCatalogEntry,
  type CatalogBlockRange
} from '../lib/catalogFile.js';

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

describe('isTopLevelLine', () => {
  it('returns false for undefined input', () => {
    expect(isTopLevelLine(undefined)).toBe(false);
  });

  it('returns false for empty lines or space-indented configuration parameters', () => {
    expect(isTopLevelLine('')).toBe(false);
    expect(isTopLevelLine('  prod:')).toBe(false);
    expect(isTopLevelLine('    "chalk": "^6.0.1"')).toBe(false);
  });

  it('returns false for root-level comments', () => {
    expect(isTopLevelLine('# this is a comment')).toBe(false);
  });

  it('returns true for genuine root-level configuration attributes', () => {
    expect(isTopLevelLine('yarnPath: .yarn/releases/yarn-4.18.0.cjs')).toBe(true);
    expect(isTopLevelLine('catalogs:')).toBe(true);
  });
});

describe('isCatalogEntryLine', () => {
  it('returns false for undefined input', () => {
    expect(isCatalogEntryLine(undefined)).toBe(false);
  });

  it('returns false for headers or top-level entries', () => {
    expect(isCatalogEntryLine('catalogs:')).toBe(false);
    expect(isCatalogEntryLine('  prod:')).toBe(false);
    expect(isCatalogEntryLine('  # comment')).toBe(false);
  });

  it('returns true only if the string starts with exactly 4 spaces', () => {
    expect(isCatalogEntryLine('    "chalk": "^6.0.1"')).toBe(true);
    expect(isCatalogEntryLine('    lodash: "^4.17.21"')).toBe(true);
  });
});

describe('escapeForRegExp', () => {
  it('escapes regular expression special injection characters securely', () => {
    expect(escapeForRegExp('lodash')).toBe('lodash');
    expect(escapeForRegExp('@scope/pkg-name')).toBe('@scope/pkg-name');
    expect(escapeForRegExp('react.js')).toBe('react\\.js');
    expect(escapeForRegExp('a[b]c*d+e?')).toBe('a\\[b\\]c\\*d\\+e\\?');
  });
});

describe('locateCatalogBlock', () => {
  const lines = SAMPLE_YARNRC.split('\n');
  const catalogsIndex = lines.findIndex(l => l === 'catalogs:');

  it('correctly maps the exact line bounds of an active catalog block', () => {
    const range = locateCatalogBlock(lines, catalogsIndex, '  prod:');
    expect(range).toBeDefined();

    // Using interface validation naturally
    const validatedRange: CatalogBlockRange = range!;
    expect(lines[validatedRange.headerIndex]).toBe('  prod:');
    // blockEndIndex points to the line immediately following the block entries
    expect(lines[validatedRange.blockEndIndex]).toBe('');
  });

  it('returns undefined if requested nested block is missing', () => {
    const range = locateCatalogBlock(lines, catalogsIndex, '  missing-catalog:');
    expect(range).toBeUndefined();
  });

  it('stops scanning immediately if a new root-level keyword parameter intervenes', () => {
    const customRc = ['catalogs:', 'nodeLinker: node-modules', '  prod:', '    "a": "1"'];
    const range = locateCatalogBlock(customRc, 0, '  prod:');
    expect(range).toBeUndefined();
  });
});

describe('findCatalogInsertionPoint', () => {
  it('finds the index right before the next root configuration element', () => {
    const customRc = ['yarnPath: x', 'catalogs:', '  prod:', '    "a": "1"', '', 'nodeLinker: pnp'];
    const insertAt = findCatalogInsertionPoint(customRc, 1);
    expect(insertAt).toBe(5); // points to 'nodeLinker: pnp'
  });
});

describe('upsertCatalogEntry', () => {
  it('inserts a new entry at the end of the named catalog block', () => {
    const result = upsertCatalogEntry(SAMPLE_YARNRC, 'prod', 'lodash', '^4.17.21');
    const lines = result.split('\n');

    expect(lines).toContain('    "lodash": "^4.17.21"');
    expect(lines.indexOf('    "lodash": "^4.17.21"')).toBe(lines.indexOf('    "chalk": "^6.0.1"') + 1);
    expect(result).toContain('    "@types/node": "^26.1.1"');
    expect(result).toContain('    "rollup": "^4.63.5"');
  });

  it('updates the range of an existing entry in place', () => {
    const result = upsertCatalogEntry(SAMPLE_YARNRC, 'prod', 'chalk', '^7.0.0');

    expect(result).toContain('    "chalk": "^7.0.0"');
    expect(result).not.toContain('"chalk": "^6.0.1"');
    expect(result.match(/"chalk":/g)).toHaveLength(1);
  });

  it('updates unquoted historical dependency entries safely without duplicating them', () => {
    const legacyYarnrc = ['catalogs:', '  prod:', '    chalk: "^6.0.1"', ''].join('\n');
    const result = upsertCatalogEntry(legacyYarnrc, 'prod', 'chalk', '^7.0.0');

    expect(result).toContain('    "chalk": "^7.0.0"');
    expect(result).not.toContain('chalk:');
    expect(result.match(/chalk/g)).toHaveLength(1);
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
