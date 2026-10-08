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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config';
import { getWorkspaceContext } from '../../../utils/workspace';

const configDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds the shared crew-cli Vitest configuration for the package that is
 * currently being tested (derived from the active working directory).
 *
 * Consuming packages that need to customize the shared configuration can
 * create a local `vitest.config.ts` that spreads overrides through this
 * factory — `crew test:unit` automatically prefers a local config over the
 * shared one, so no boilerplate is required unless customization is needed.
 * Overrides are deep-merged over the shared base config via vitest's
 * `mergeConfig` (arrays are concatenated).
 *
 * @example
 * import { defineConfig } from 'vitest/config';
 * import { createCrewVitestConfig } from '@ai-crew-suite/crew-cli';
 *
 * export default defineConfig(
 *   createCrewVitestConfig({
 *     test: { environment: 'jsdom' },
 *   }),
 * );
 */
export function createCrewVitestConfig(overrides: ViteUserConfig = {}): ViteUserConfig {
  const context = getWorkspaceContext();
  const projectName = path.relative(context.repoRoot, context.packageDir).replace(/\//g, '-') || 'root-suite';

  const baseConfig = defineConfig({
    test: {
      name: projectName,
      globals: true,
      environment: context.isBrowser ? 'jsdom' : 'node',
      passWithNoTests: true,
      // Resolve setup.js relative to this module's compiled location in
      // crew-cli's dist output (the same directory), so the path stays valid
      // regardless of where the crew-cli package is installed.
      setupFiles: [path.resolve(configDir, 'setup.js')],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e-tests/**',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
      },
    },
  });

  return mergeConfig(baseConfig, overrides);
}
