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
import { structUtils, httpUtils, type Configuration } from "@yarnpkg/core";

export interface ResolveLatestRangeOptions {
  packageName: string;
  configuration: Configuration;
}

/**
 * Resolves the caret range for a package's `latest` npm dist-tag.
 * Leverages Yarn's core httpUtils to ensure enterprise auth tokens, private
 * registry scopes, and corporate proxy configurations are automatically respected.
 */
export async function resolveLatestRange(options: ResolveLatestRangeOptions): Promise<string> {
  const { packageName, configuration } = options;

  // Convert the string name to a formal Yarn identity descriptor
  const ident = structUtils.parseIdent(packageName);

  // Dynamically resolve the correct registry endpoint for this package scope (public vs private Artifactory)
  const registrySpec = configuration.get("npmRegistryServer") as string;
  const scopes = configuration.get("npmScopes") as Map<string, Map<string, unknown>>;

  const targetScopeSettings = ident.scope ? scopes.get(ident.scope) : undefined;
  const registryUrl = (targetScopeSettings?.get("npmRegistryServer") as string | undefined) ?? registrySpec;

  // Standardize endpoint URLs trailing slash formats safely
  const sanitizedRegistryUrl = registryUrl.replace(/\/$/, "");
  const targetUrl = `${sanitizedRegistryUrl}/${structUtils.stringifyIdent(ident)}`;

  try {
    // Utilize Yarn's secure core HTTP network client
    const response = await httpUtils.get(targetUrl, {
      configuration,
      jsonResponse: true,
    });

    const packument = response as { 'dist-tags'?: { latest?: string } };
    const latest = packument['dist-tags']?.latest;

    if (!latest) {
      throw new Error(`No "latest" dist-tag found for "${packageName}" at registry ${registryUrl}.`);
    }

    return `^${latest}`;
  } catch (error) {
    throw new Error(
      `Failed to resolve latest version for "${packageName}" via authenticated registry trace: ` +
      `${error instanceof Error ? error.message : String(error)}`
    );
  }
}
