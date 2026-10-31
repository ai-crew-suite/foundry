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
import { createRequire } from 'node:module';
import { createCliModule } from '@backstage/cli-node';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { name: string };

const commands = [
  ['build', 'Compile workspace distributions'],
  ['clean', 'Remove workspace build artifacts'],
  ['format', 'Format workspace files with Prettier'],
  ['lint', 'Run workspace ESLint checks'],
  ['publish', 'Publish workspace packages with Changesets'],
  ['storybook', 'Start the Storybook development server'],
  ['storybook:build', 'Build the static Storybook site'],
  ['sync:refs', 'Synchronize TypeScript project references'],
  ['test:e2e', 'Run end-to-end tests with Playwright'],
  ['test:unit', 'Run unit tests with Vitest'],
  ['test:unit:coverage', 'Run unit tests with coverage'],
  ['typecheck', 'Run TypeScript checks'],
] as const;

/** Backstage CLI module exposing the Crew toolbelt under the `crew` namespace. */
const crewCliModule = createCliModule({
  packageJson,
  init: async registry => {
    for (const [name, description] of commands) {
      registry.addCommand({
        path: ['crew', name],
        description,
        execute: { loader: () => import('./backstageCommands') },
      });
    }
  },
});

export default crewCliModule;
