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
import npa from 'npm-package-arg';

export interface PackageSpec {
  name: string;
  range?: string;
}

/**
 * Parses package descriptors safely using industry-standard npm-package-arg.
 * Gracefully processes Yarn-specific protocols (like workspace:) and handles missing ranges.
 */
export function parsePackageSpec(spec: string): PackageSpec {
  if (!spec || typeof spec !== 'string' || spec.trim() === '') {
    throw new TypeError('Package descriptor cannot be empty or non-string.');
  }

  const cleanedSpec = spec.trim();

  // Guard against dangling version indicators (e.g. "lodash@")
  if (cleanedSpec.includes('@') && cleanedSpec.endsWith('@')) {
    throw new SyntaxError(`Malformed package descriptor "${spec}": Range or tag declaration cannot be empty after '@'.`);
  }

  // Look for the version break index while protecting scoped package structures
  const startIndex = cleanedSpec.startsWith('@') ? 1 : 0;
  const atIndex = cleanedSpec.indexOf('@', startIndex);

  // If there's no version symbol, treat it as a raw name so command fetches latest
  if (atIndex === -1) {
    // SECURITY GUARD: Ensure the raw name does not start with a range operator (e.g. "@^1.0.0")
    if (cleanedSpec.startsWith('@') && /^[~^0-9*x]/.test(cleanedSpec.slice(1))) {
      throw new SyntaxError(`Malformed package descriptor "${spec}": Package name cannot be empty.`);
    }
    return { name: cleanedSpec, range: undefined };
  }

  const name = cleanedSpec.slice(0, atIndex).trim();
  const rawRange = cleanedSpec.slice(atIndex + 1).trim();

  if (!name || name === '@') {
    throw new SyntaxError(`Malformed package descriptor "${spec}": Package name cannot be empty.`);
  }

  // Intercept Yarn workspace protocols so npm-package-arg doesn't reject them as bad URLs
  if (rawRange.startsWith('workspace:')) {
    return { name, range: rawRange };
  }

  try {
    const result = npa(cleanedSpec);

    if (!result.name) {
      throw new SyntaxError(`Malformed package descriptor "${spec}": Package name cannot be empty.`);
    }

    // Standardize default fallback wildcards back to undefined to trigger registry latest lookup
    const range = result.rawSpec === '*' && !cleanedSpec.includes('@*') ? undefined : result.rawSpec;

    return {
      name: result.name,
      range: range || undefined,
    };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw error;
    }
    throw new SyntaxError(`Failed to parse package descriptor "${spec}": ${error instanceof Error ? error.message : String(error)}`);
  }
}
