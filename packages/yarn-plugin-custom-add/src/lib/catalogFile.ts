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

const CATALOGS_ROOT_LINE = 'catalogs:';
const CATALOG_HEADER_INDENT = '  ';
const CATALOG_ENTRY_INDENT = '    ';

function isTopLevelLine(line: string): boolean {
  return line.length > 0 && !line.startsWith(' ') && !line.startsWith('#');
}

function isCatalogEntryLine(line: string): boolean {
  return line.startsWith(CATALOG_ENTRY_INDENT);
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  if (catalogsIndex === -1) {
    const needsSeparator = lines.length > 0 && lines[lines.length - 1] !== '';
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
  let catalogHeaderIndex = -1;
  let blockEnd = -1;

  for (let i = catalogsIndex + 1; i < lines.length; i++) {
    const line = lines[i];

    if (catalogHeaderIndex === -1) {
      if (line === catalogHeaderLine) {
        catalogHeaderIndex = i;
        blockEnd = i + 1;
      } else if (isTopLevelLine(line)) {
        break;
      }
      continue;
    }

    if (isCatalogEntryLine(line)) {
      blockEnd = i + 1;
      continue;
    }

    break;
  }

  if (catalogHeaderIndex === -1) {
    let insertAt = catalogsIndex + 1;
    for (let i = catalogsIndex + 1; i < lines.length; i++) {
      if (isTopLevelLine(lines[i])) {
        break;
      }
      insertAt = i + 1;
    }

    const updated = [...lines];
    updated.splice(insertAt, 0, catalogHeaderLine, newEntryLine);
    return updated.join('\n');
  }

  const existingEntryPattern = new RegExp(`^${CATALOG_ENTRY_INDENT}"${escapeForRegExp(packageName)}":`);
  const existingIndex = lines.findIndex(
    (line, i) => i > catalogHeaderIndex && i < blockEnd && existingEntryPattern.test(line),
  );

  const updated = [...lines];
  if (existingIndex !== -1) {
    updated[existingIndex] = newEntryLine;
  } else {
    updated.splice(blockEnd, 0, newEntryLine);
  }

  return updated.join('\n');
}
