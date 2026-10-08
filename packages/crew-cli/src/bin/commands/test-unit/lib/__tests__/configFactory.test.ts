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
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createCrewVitestConfig } from '../configFactory';

describe('createCrewVitestConfig Factory', () => {
  it('derives the shared base configuration from the active workspace context', () => {
    const config = createCrewVitestConfig();

    expect(config.test?.globals).toBe(true);
    // The crew-cli package carries no browser backstage role, so the shared config resolves a node environment
    expect(config.test?.environment).toBe('node');
    expect(config.test?.passWithNoTests).toBe(true);
    expect(config.test?.exclude).toContain('**/dist/**');
  });

  it('resolves the shared setup file next to the factory so it always exists', () => {
    const config = createCrewVitestConfig();
    const setupFiles = (config.test?.setupFiles ?? []) as string[];

    expect(setupFiles).toHaveLength(1);

    const [setupFile] = setupFiles;
    if (!setupFile) {
      throw new Error('Expected the shared config to define exactly one setup file');
    }
    expect(setupFile).toContain('setup.js');
    // The compiled setup.js exists in dist output; the source setup.ts exists when running tests from src
    expect(
      fs.existsSync(setupFile) || fs.existsSync(setupFile.replace(/\.js$/, '.ts'))
    ).toBe(true);
  });

  it('deep-merges consumer overrides over the shared base configuration', () => {
    const config = createCrewVitestConfig({
      test: {
        environment: 'jsdom',
        name: 'custom-suite',
      },
    });

    expect(config.test?.environment).toBe('jsdom');
    expect(config.test?.name).toBe('custom-suite');
    // Untouched shared defaults survive the merge
    expect(config.test?.globals).toBe(true);
    expect(config.test?.passWithNoTests).toBe(true);
  });
});
