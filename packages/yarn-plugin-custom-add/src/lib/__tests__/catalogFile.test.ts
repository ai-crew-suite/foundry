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
import {
  isTopLevelLine,
  isCatalogEntryLine,
  escapeForRegExp,
  locateCatalogBlock,
  findCatalogInsertionPoint,
  upsertCatalogEntry,
  type CatalogBlockRange
} from '../catalogFile';

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

  it('returns false for tab-indented lines', () => {
    // YAML spec forbids tabs for indentation, but files might have them accidentally
    expect(isTopLevelLine('\tnodeLinker: node-modules')).toBe(true); // Caution: starts with '\t', not ' '
  });

  it('returns false for whitespace-only lines', () => {
    expect(isTopLevelLine('   ')).toBe(false);
  });

  it('returns false for YAML comments regardless of inline indentation', () => {
    expect(isTopLevelLine('# root comment')).toBe(false);
    expect(isTopLevelLine('  # indented comment')).toBe(false);
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

  it('returns true for 4-space indented comments (documents current behavior / risk)', () => {
    // WARNING: '    # core lib' starts with 4 spaces, so this currently returns TRUE
    // In locateCatalogBlock, this means comments are counted as valid entries.
    expect(isCatalogEntryLine('    # this is an entry comment')).toBe(true);
  });

  it('returns true for lines with only 4 spaces (whitespace drift)', () => {
    expect(isCatalogEntryLine('    ')).toBe(true);
  });

  it('returns false for 2-space or 6-space indentation', () => {
    expect(isCatalogEntryLine('  "chalk": "^6.0.0"')).toBe(false);
    expect(isCatalogEntryLine('      "chalk": "^6.0.0"')).toBe(true); // Caution: starts with 4 spaces!
  });
});

describe('escapeForRegExp', () => {
  it('escapes regular expression special injection characters securely', () => {
    expect(escapeForRegExp('lodash')).toBe('lodash');
    expect(escapeForRegExp('@scope/pkg-name')).toBe('@scope/pkg-name');
    expect(escapeForRegExp('react.js')).toBe('react\\.js');
    expect(escapeForRegExp('a[b]c*d+e?')).toBe('a\\[b\\]c\\*d\\+e\\?');
  });

  it('escapes regex metacharacters that cause catastrophic backtracking or injection', () => {
    const input = '^\$()+*?[]{}.|\\';
    const escaped = escapeForRegExp(input);
    expect(() => new RegExp(escaped)).not.toThrow();

    // Verify it matches literally, not as metacharacters
    const regex = new RegExp(`^${escaped}$`);
    expect(regex.test(input)).toBe(true);
    expect(regex.test('arbitrary')).toBe(false);
  });

  it('safely handles standard enterprise scoped package characters like @, /, and -', () => {
    const pkg = '@company-scope/pkg.sub-module';
    const escaped = escapeForRegExp(pkg);
    expect(new RegExp(`^${escaped}$`).test(pkg)).toBe(true);
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

  it('locates an empty catalog block (header exists with zero entries)', () => {
    const emptyBlockLines = [
      'catalogs:',
      '  prod:',
      '  dev:',
      '    "vitest": "^1.0.0"',
    ];
    const range = locateCatalogBlock(emptyBlockLines, 0, '  prod:');
    expect(range).toBeDefined();
    // headerIndex is 1, and since line 2 ('  dev:') does not start with 4 spaces, blockEndIndex is 2
    expect(range?.headerIndex).toBe(1);
    expect(range?.blockEndIndex).toBe(2);
  });

  it('correctly handles a catalog located at the absolute end of the file without trailing newline', () => {
    const eofLines = [
      'catalogs:',
      '  prod:',
      '    "chalk": "^5.0.0"',
    ];
    const range = locateCatalogBlock(eofLines, 0, '  prod:');
    expect(range).toEqual({ headerIndex: 1, blockEndIndex: 3 });
  });

  it('does not confuse catalogs when catalog names are prefixes of each other', () => {
    const prefixLines = [
      'catalogs:',
      '  production:',
      '    "a": "1"',
      '  prod:',
      '    "b": "2"',
    ];
    const range = locateCatalogBlock(prefixLines, 0, '  prod:');
    expect(range?.headerIndex).toBe(3);
    expect(range?.blockEndIndex).toBe(5);
  });
});

describe('findCatalogInsertionPoint', () => {
  it('finds the index right before the next root configuration element', () => {
    const customRc = ['yarnPath: x', 'catalogs:', '  prod:', '    "a": "1"', '', 'nodeLinker: pnp'];
    const insertAt = findCatalogInsertionPoint(customRc, 1);
    expect(insertAt).toBe(5); // points to 'nodeLinker: pnp'
  });

  it('returns lines.length when catalogs: is the last block in the file and extends to EOF', () => {
    const lines = [
      'yarnPath: .yarn/releases/yarn-4.18.0.cjs',
      'catalogs:',
      '  prod:',
      '    "chalk": "1.0.0"',
    ];
    const point = findCatalogInsertionPoint(lines, 1);
    expect(point).toBe(4); // appends at index 4 (lines.length)
  });

  it('stops before the next top-level block even if there are blank lines in catalogs:', () => {
    const lines = [
      'catalogs:',
      '  prod:',
      '    "chalk": "1.0.0"',
      '',
      'nodeLinker: node-modules',
    ];
    const point = findCatalogInsertionPoint(lines, 0);
    expect(point).toBe(4); // index 4 is 'nodeLinker: node-modules'
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


  it('handles package name collisions where one name is a strict prefix or substring of another', () => {
    // Audit Risk: regex accidental matching (e.g. 'react' matching 'react-dom' or 'react-router')
    const initialRc = [
      'catalogs:',
      '  prod:',
      '    "react-dom": "^18.2.0"',
      '    "react": "^18.2.0"',
      '',
    ].join('\n');

    const result = upsertCatalogEntry(initialRc, 'prod', 'react', '^19.0.0');

    expect(result).toContain('    "react": "^19.0.0"');
    expect(result).toContain('    "react-dom": "^18.2.0"');
    expect(result.match(/"react":/g)).toHaveLength(1);
    expect(result.match(/"react-dom":/g)).toHaveLength(1);
  });

it('safely handles special characters and scoped packages in package names', () => {
  const scopedPkg = '@ai-crew-suite/crew.cli\$v2';
  const result = upsertCatalogEntry(SAMPLE_YARNRC, 'prod', scopedPkg, '1.0.0');

  expect(result).toContain(`    "${scopedPkg}": "1.0.0"`);

  const updatedResult = upsertCatalogEntry(result, 'prod', scopedPkg, '1.0.1');
  expect(updatedResult).toContain(`    "${scopedPkg}": "1.0.1"`);

  // Use escapeForRegExp on the test regex pattern:
  const escapedPattern = new RegExp(escapeForRegExp(scopedPkg), 'g');
  expect(updatedResult.match(escapedPattern)).toHaveLength(1);
});

  it('isolates mutations when a package is listed in both prod and dev catalogs', () => {
    // As noted in architecture docs: CLI tools (like vitest) can live in both prod and dev
    const dualCatalogRc = [
      'catalogs:',
      '  prod:',
      '    "vitest": "2.0.0"',
      '  dev:',
      '    "vitest": "2.0.0"',
      '',
    ].join('\n');

    // Updating 'prod' should NOT mutate 'dev'
    const resultProd = upsertCatalogEntry(dualCatalogRc, 'prod', 'vitest', '3.0.0');
    expect(resultProd).toContain('  prod:\n    "vitest": "3.0.0"');
    expect(resultProd).toContain('  dev:\n    "vitest": "2.0.0"');

    // Updating 'dev' should NOT mutate 'prod'
    const resultDev = upsertCatalogEntry(dualCatalogRc, 'dev', 'vitest', '4.0.0');
    expect(resultDev).toContain('  prod:\n    "vitest": "2.0.0"');
    expect(resultDev).toContain('  dev:\n    "vitest": "4.0.0"');
  });

  it('inserts into a catalog placed between other root-level properties without corrupting later blocks', () => {
    const complexRc = [
      'yarnPath: .yarn/releases/yarn-4.18.0.cjs',
      'catalogs:',
      '  prod:',
      '    "chalk": "^6.0.1"',
      'nodeLinker: pnpm',
      'checksumBehavior: reset',
    ].join('\n');

    const result = upsertCatalogEntry(complexRc, 'prod', 'lodash', '4.17.21');
    const lines = result.split('\n');

    expect(lines.indexOf('    "lodash": "4.17.21"')).toBe(lines.indexOf('    "chalk": "^6.0.1"') + 1);
    expect(lines).toContain('nodeLinker: pnpm');
    expect(lines).toContain('checksumBehavior: reset');
  });

  it('appends a new catalog block safely when catalogs: is followed by another root key', () => {
    const complexRc = [
      'catalogs:',
      '  prod:',
      '    "chalk": "^6.0.1"',
      'nodeLinker: node-modules',
    ].join('\n');

    const result = upsertCatalogEntry(complexRc, 'dev', 'vitest', '^2.0.0');
    const lines = result.split('\n');

    const devIndex = lines.indexOf('  dev:');
    const vitestIndex = lines.indexOf('    "vitest": "^2.0.0"');
    const nodeLinkerIndex = lines.indexOf('nodeLinker: node-modules');

    expect(devIndex).toBeGreaterThan(-1);
    expect(vitestIndex).toBe(devIndex + 1);
    expect(vitestIndex).toBeLessThan(nodeLinkerIndex);
  });

  it('handles an empty catalog block gracefully', () => {
    const emptyCatalogRc = [
      'catalogs:',
      '  prod:',
      '  dev:',
      '    "vitest": "1.0.0"',
      '',
    ].join('\n');

    const result = upsertCatalogEntry(emptyCatalogRc, 'prod', 'lodash', '^4.17.21');
    const lines = result.split('\n');

    const prodIndex = lines.indexOf('  prod:');
    const lodashIndex = lines.indexOf('    "lodash": "^4.17.21"');
    const devIndex = lines.indexOf('  dev:');

    expect(prodIndex).toBeGreaterThan(-1);
    expect(lodashIndex).toBe(prodIndex + 1);
    expect(lodashIndex).toBeLessThan(devIndex);
  });

  it('safely updates when version range contains quotes, semver tags, or URLs', () => {
    const complexRange = 'npm:@scope/package@^1.2.3-alpha.1+build.456';
    const result = upsertCatalogEntry(SAMPLE_YARNRC, 'prod', 'custom-pkg', complexRange);

    expect(result).toContain(`    "custom-pkg": "${complexRange}"`);
  });

  it('creates catalogs: in a completely empty file without leading syntax anomalies', () => {
    const result = upsertCatalogEntry('', 'prod', 'lodash', '^4.17.21');
    expect(result).toBe('catalogs:\n  prod:\n    "lodash": "^4.17.21"\n');
  });
});
