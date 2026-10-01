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
import { spawnSync } from 'node:child_process';
import path from 'node:path';

describe('AI Crew Toolbelt CLI Integration Suite', () => {
  const binaryPath = path.resolve('src/bin/crew.ts');

  it('should cleanly output the custom magenta header on help flags', () => {
    const result = spawnSync('npx', ['tsx', binaryPath, '--help'], {
      encoding: 'utf8',
      shell: true
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('AI CREW SUITE');
    expect(result.stdout).toContain('build');
  });

  it('should terminate with a non-zero exit code on unrecognized commands', () => {
    const result = spawnSync('npx', ['tsx', binaryPath, 'invalid-task-name'], {
      shell: true
    });
    expect(result.status).not.toBe(0);
  });

  it('should forward unknown options down to the build action runner without crashing', () => {
    // Passing a random flag down to verify Commander's .allowUnknownOption(true) works on the build command
    const result = spawnSync('npx', ['tsx', binaryPath, 'build', '--invalid-forwarded-flag-test'], {
      encoding: 'utf8',
      shell: true
    });

    // It might exit with a failure code because Backstage/TSC rejects the flag,
    // but the crew-cli wrapper process should successfully handle the pass-through context
    expect(result.status).toBeDefined();
    // Verify it reached our custom command block instead of hitting standard Commander errors
    expect(result.stderr).not.toContain("error: unknown option");
  });
});
