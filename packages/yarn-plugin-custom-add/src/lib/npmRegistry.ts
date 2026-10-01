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

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Resolves the caret range for a package's `latest` npm dist-tag, used when a
 * `yarn add` spec omits an explicit version.
 *
 * @throws {Error} If the registry request fails or has no `latest` dist-tag.
 */
export async function resolveLatestRange(packageName: string, fetchImpl: FetchLike = fetch): Promise<string> {
  const response = await fetchImpl(`https://registry.npmjs.org/${packageName}`);

  if (!response.ok) {
    throw new Error(`Failed to resolve latest version for "${packageName}" (HTTP ${response.status}).`);
  }

  const packument = (await response.json()) as { 'dist-tags'?: { latest?: string } };
  const latest = packument['dist-tags']?.latest;

  if (!latest) {
    throw new Error(`No "latest" dist-tag found for "${packageName}".`);
  }

  return `^${latest}`;
}
