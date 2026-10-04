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
export type ManifestDependencyField = 'dependencies' | 'devDependencies';

/**
 * Helper to dynamically capture how a raw JSON file is indented.
 * Matches spaces or tabs to preserve file aesthetics accurately.
 */
function detectIndentation(jsonText: string): string | number {
  const match = jsonText.match(/^[\r\n]*([ \t]+)/m);
  if (!match || !match[1]) return 2; // Default to 2 spaces if undetectable
  const indent = match[1];
  return indent.includes('\t') ? '\t' : indent.length;
}

/**
 * Adds or updates a `"packageName": "catalog:<catalogName>"` entry inside a
 * package.json's target dependency field. Guarantees top-level property position
 * preservation, detects original indentation, and sorts inner dependency keys.
 */
export function upsertCatalogDependency(
  packageJsonText: string,
  field: ManifestDependencyField,
  packageName: string,
  catalogName: string,
): string {
  const manifest = JSON.parse(packageJsonText) as Record<string, unknown>;
  const indentSetting = detectIndentation(packageJsonText);

  // Isolate and clean the target dependency block safely
  const existingField = manifest[field];
  if (existingField !== undefined && (typeof existingField !== 'object' || Array.isArray(existingField) || existingField === null)) {
    throw new TypeError(`Malformed manifest: "${field}" must be an object structure.`);
  }

  const dependencies: Record<string, string> = existingField ? { ...(existingField as Record<string, string>) } : {};
  dependencies[packageName] = `catalog:${catalogName}`;

  // Enforce alphabetical sorting for dependency keys
  const sortedDependencies: Record<string, string> = {};
  for (const key of Object.keys(dependencies).sort((a, b) => a.localeCompare(b))) {
    const value = dependencies[key];
    if (value !== undefined) {
      sortedDependencies[key] = value;
    }
  }

  // To preserve original top-level sorting order, construct a clean lookup map
  const finalManifest: Record<string, unknown> = {};
  const topLevelKeys = Object.keys(manifest);

  // If the target block is completely new, decide where it fits conventionally
  if (!topLevelKeys.includes(field)) {
    // Inject near other dependencies if they exist, otherwise append to end safely
    const fallbackIndex = field === 'devDependencies' && topLevelKeys.includes('dependencies')
      ? topLevelKeys.indexOf('dependencies') + 1
      : topLevelKeys.length;
    topLevelKeys.splice(fallbackIndex, 0, field);
  }

  for (const key of topLevelKeys) {
    if (key === field) {
      finalManifest[key] = sortedDependencies;
    } else {
      finalManifest[key] = manifest[key];
    }
  }

  return `${JSON.stringify(finalManifest, null, indentSetting)}\n`;
}
