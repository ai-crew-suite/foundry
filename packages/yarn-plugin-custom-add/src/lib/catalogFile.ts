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

// packages/yarn-plugin-custom-add/src/lib/catalogFile.ts

const CATALOGS_ROOT_LINE = 'catalogs:';
const CATALOG_HEADER_INDENT = '  ';
const CATALOG_ENTRY_INDENT = '    ';

export function isTopLevelLine(line: string | undefined): boolean {
  if (line === undefined) return false;
  return line.length > 0 && !line.startsWith(' ') && !line.startsWith('#');
}

export function isCatalogEntryLine(line: string | undefined): boolean {
  if (line === undefined) return false;
  return line.startsWith(CATALOG_ENTRY_INDENT);
}

export function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
}

/**
 * Structural boundaries of a single catalog block within the YAML lines array.
 */
export interface CatalogBlockRange {
  headerIndex: number;
  blockEndIndex: number;
}

/**
 * Identifies the start and end line indices of a specific named catalog block
 * inside the global catalogs block. Returns undefined if the block does not exist.
 */
export function locateCatalogBlock(
  lines: string[],
  catalogsIndex: number,
  catalogHeaderLine: string
): CatalogBlockRange | undefined {
  let headerIndex = -1;
  let blockEndIndex = -1;

  for (let i = catalogsIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    if (headerIndex === -1) {
      if (line === catalogHeaderLine) {
        headerIndex = i;
        blockEndIndex = i + 1;
      } else if (isTopLevelLine(line)) {
        break;
      }
      continue;
    }

    if (isCatalogEntryLine(line)) {
      blockEndIndex = i + 1;
      continue;
    }

    break;
  }

  if (headerIndex === -1) {
    return undefined;
  }

  return { headerIndex, blockEndIndex };
}

/**
 * Finds the index where a completely new catalog header block can be appended
 * within the parent global catalogs configuration namespace.
 */
export function findCatalogInsertionPoint(lines: string[], catalogsIndex: number): number {
  let insertAt = catalogsIndex + 1;
  for (let i = catalogsIndex + 1; i < lines.length; i++) {
    if (isTopLevelLine(lines[i])) {
      break;
    }
    insertAt = i + 1;
  }
  return insertAt;
}

/**
 * Inserts or updates a `"packageName": "range"` entry inside a named catalog
 * (e.g. `prod`/`dev`) of a `.yarnrc.yml` file, preserving comments and all
 * unrelated content. Operates on text directly rather than a YAML
 * parse/stringify round trip so existing comments survive.
 */
export function upsertCatalogEntry(
  yarnrcText: string,
  catalogName: string,
  packageName: string,
  range: string,
): string {
  const lines = yarnrcText.split('\n');
  const newEntryLine = `${CATALOG_ENTRY_INDENT}"${packageName}": "${range}"`;
  const catalogsIndex = lines.findIndex((line) => line === CATALOGS_ROOT_LINE);

  // Scenario 1: The entire global 'catalogs:' root structure is missing
  if (catalogsIndex === -1) {
    const lastLine = lines[lines.length - 1];
    const needsSeparator = lines.length > 0 && lastLine !== undefined && lastLine !== '';
    return [
      ...lines,
      ...(needsSeparator ? [''] : []),
      CATALOGS_ROOT_LINE,
      `${CATALOG_HEADER_INDENT}${catalogName}:`,
      newEntryLine,
      '',
    ].join('\n');
  }

  const catalogHeaderLine = `${CATALOG_HEADER_INDENT}${catalogName}:`;
  const blockRange = locateCatalogBlock(lines, catalogsIndex, catalogHeaderLine);

  // Scenario 2: 'catalogs:' exists, but this specific sub-catalog name block does not
  if (!blockRange) {
    const insertAt = findCatalogInsertionPoint(lines, catalogsIndex);
    const updated = [...lines];
    updated.splice(insertAt, 0, catalogHeaderLine, newEntryLine);
    return updated.join('\n');
  }

  // Scenario 3: The sub-catalog name block exists. Find or update the package entry.
  // Regex supports matching both quoted ("lodash":) and unquoted (lodash:) keys securely.
  const escapedPkg = escapeForRegExp(packageName);
  const existingEntryPattern = new RegExp(`^${CATALOG_ENTRY_INDENT}("?)${escapedPkg}\\1\\s*:`);

  const existingIndex = lines.findIndex(
    (line, i) => i > blockRange.headerIndex && i < blockRange.blockEndIndex && existingEntryPattern.test(line),
  );

  const updated = [...lines];
  if (existingIndex !== -1) {
    updated[existingIndex] = newEntryLine;
  } else {
    updated.splice(blockRange.blockEndIndex, 0, newEntryLine);
  }

  return updated.join('\n');
}
