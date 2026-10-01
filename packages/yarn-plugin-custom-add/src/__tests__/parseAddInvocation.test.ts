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
import { describe, expect, it } from 'vitest';
import { parseAddInvocationArgs, parsePackageSpec } from '../lib/parseAddInvocation.js';

describe('parseAddInvocationArgs', () => {
  it('collects positional specs', () => {
    expect(parseAddInvocationArgs(['lodash', 'chalk'])).toEqual({
      specs: ['lodash', 'chalk'],
      dev: false,
      target: undefined,
    });
  });

  it('parses -D and --dev as the dev flag', () => {
    expect(parseAddInvocationArgs(['lodash', '-D'])).toMatchObject({ dev: true });
    expect(parseAddInvocationArgs(['lodash', '--dev'])).toMatchObject({ dev: true });
  });

  it('parses --target <value>', () => {
    expect(parseAddInvocationArgs(['lodash', '--target', '@ai-crew-suite/crew-cli'])).toMatchObject({
      target: '@ai-crew-suite/crew-cli',
      specs: ['lodash'],
    });
  });

  it('parses --target=<value>', () => {
    expect(parseAddInvocationArgs(['lodash', '--target=packages/crew-cli'])).toMatchObject({
      target: 'packages/crew-cli',
      specs: ['lodash'],
    });
  });

  it('ignores unrecognized flags', () => {
    expect(parseAddInvocationArgs(['lodash', '--peer', '--exact'])).toMatchObject({
      specs: ['lodash'],
      dev: false,
    });
  });
});

describe('parsePackageSpec', () => {
  it('parses an unscoped package without a range', () => {
    expect(parsePackageSpec('lodash')).toEqual({ name: 'lodash', range: undefined });
  });

  it('parses an unscoped package with a range', () => {
    expect(parsePackageSpec('lodash@^4.17.21')).toEqual({ name: 'lodash', range: '^4.17.21' });
  });

  it('parses a scoped package without a range', () => {
    expect(parsePackageSpec('@types/node')).toEqual({ name: '@types/node', range: undefined });
  });

  it('parses a scoped package with a range', () => {
    expect(parsePackageSpec('@types/node@^26.1.1')).toEqual({ name: '@types/node', range: '^26.1.1' });
  });
});
