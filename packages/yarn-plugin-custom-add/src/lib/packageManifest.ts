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
 * Adds or updates a `"packageName": "catalog:<catalogName>"` entry inside a
 * package.json's `dependencies`/`devDependencies`, keeping that field's keys
 * sorted alphabetically while preserving the rest of the manifest untouched.
 */
export function upsertCatalogDependency(
  packageJsonText: string,
  field: ManifestDependencyField,
  packageName: string,
  catalogName: string,
): string {
  const manifest = JSON.parse(packageJsonText) as Record<string, unknown>;
  const existingField = manifest[field];
  const dependencies: Record<string, string> =
    existingField && typeof existingField === 'object' && !Array.isArray(existingField)
      ? { ...(existingField as Record<string, string>) }
      : {};

  dependencies[packageName] = `catalog:${catalogName}`;

  const sorted: Record<string, string> = {};
  for (const key of Object.keys(dependencies).sort((a, b) => a.localeCompare(b))) {
    const value = dependencies[key];
    if (value !== undefined) {
      sorted[key] = value;
    }
  }

  manifest[field] = sorted;

  return `${JSON.stringify(manifest, null, 2)}\n`;
}
