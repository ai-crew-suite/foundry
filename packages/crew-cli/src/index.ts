/**
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
import { createRequire } from 'node:module';
import { createCliModule } from '@backstage/cli-node';

export { createFlatConfigForWorkspace } from './commands/lint/config/factory';
export { createCrewVitestConfig } from './commands/test-unit/lib/configFactory';
export * from './commands/storybook/lib/mockUtils';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { name: string };

/** Crew commands registered with the Backstage CLI. */
export default createCliModule({
  packageJson,
  init: async registry => {
    registry.addCommand({ path: ['crew', 'build'], description: 'Compile workspace distributions', execute: { loader: () => import('./commands/build') } });
    registry.addCommand({ path: ['crew', 'clean'], description: 'Remove workspace build artifacts', execute: { loader: () => import('./commands/clean') } });
    registry.addCommand({ path: ['crew', 'format'], description: 'Format workspace files', execute: { loader: () => import('./commands/format') } });
    registry.addCommand({ path: ['crew', 'lint'], description: 'Run workspace ESLint checks', execute: { loader: () => import('./commands/lint') } });
    registry.addCommand({ path: ['crew', 'publish'], description: 'Publish workspace packages', execute: { loader: () => import('./commands/publish') } });
    registry.addCommand({ path: ['crew', 'storybook'], description: 'Start Storybook', execute: { loader: () => import('./commands/storybook') } });
    registry.addCommand({ path: ['crew', 'storybook:build'], description: 'Build the static Storybook site', execute: { loader: () => import('./commands/storybook-build') } });
    registry.addCommand({ path: ['crew', 'sync:refs'], description: 'Synchronize TypeScript project references', execute: { loader: () => import('./commands/sync-refs') } });
    registry.addCommand({ path: ['crew', 'test:e2e'], description: 'Run end-to-end tests', execute: { loader: () => import('./commands/test-e2e') } });
    registry.addCommand({ path: ['crew', 'test:unit'], description: 'Run unit tests', execute: { loader: () => import('./commands/test-unit') } });
    registry.addCommand({ path: ['crew', 'test:unit:coverage'], description: 'Run unit tests with coverage', execute: { loader: () => import('./commands/test-unit-coverage') } });
    registry.addCommand({ path: ['crew', 'typecheck'], description: 'Run TypeScript checks', execute: { loader: () => import('./commands/typecheck') } });
  },
});
