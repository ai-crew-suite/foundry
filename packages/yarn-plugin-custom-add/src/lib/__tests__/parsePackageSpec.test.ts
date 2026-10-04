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
import { parsePackageSpec } from '../parsePackageSpec';

describe('parsePackageSpec with npm-package-arg', () => {
  describe('Standard Extraction Mechanics', () => {
    it('successfully extracts a simple package name with no range metadata', () => {
      const result = parsePackageSpec('lodash');
      expect(result).toEqual({ name: 'lodash', range: undefined });
    });

    it('successfully extracts a package name accompanied by an explicit semver range', () => {
      const result = parsePackageSpec('lodash@^4.17.21');
      expect(result).toEqual({ name: 'lodash', range: '^4.17.21' });
    });

    it('correctly handles enterprise scoped package structures with no range metadata', () => {
      const result = parsePackageSpec('@ai-crew-suite/crew-cli');
      expect(result).toEqual({ name: '@ai-crew-suite/crew-cli', range: undefined });
    });

    it('correctly handles enterprise scoped package structures containing version rules', () => {
      const result = parsePackageSpec('@ai-crew-suite/crew-cli@workspace:*');
      expect(result).toEqual({ name: '@ai-crew-suite/crew-cli', range: 'workspace:*' });
    });
  });

  describe('Complex Protocols & Advanced Semantic Layouts', () => {
    it('safely extracts descriptors utilizing dist-tags instead of numerical semver ranges', () => {
      const result = parsePackageSpec('react@latest');
      expect(result).toEqual({ name: 'react', range: 'latest' });
    });

    it('safely parses packages matching explicit alias locator declarations', () => {
      const spec = 'my-chalk@npm:chalk@^5.0.0';
      const result = parsePackageSpec(spec);
      expect(result).toEqual({ name: 'my-chalk', range: 'npm:chalk@^5.0.0' });
    });

    it('handles unexpected spacing anomalies by trimming padding bounds cleanly', () => {
      const result = parsePackageSpec('  @scope/package@^1.0.0   ');
      expect(result).toEqual({ name: '@scope/package', range: '^1.0.0' });
    });
  });

  describe('Security Validation & Exceptional Input Recovery', () => {
    it('throws a TypeError if the parameter passed is an empty expression or invalid type', () => {
      expect(() => parsePackageSpec('')).toThrow(TypeError);
      expect(() => parsePackageSpec('   ')).toThrow(TypeError);
      expect(() => parsePackageSpec(undefined as any)).toThrow(TypeError);
    });

    it('throws a SyntaxError if a user appends the range symbol but leaves the version segment empty', () => {
      expect(() => parsePackageSpec('lodash@')).toThrow(SyntaxError);
      expect(() => parsePackageSpec('@scope/pkg@  ')).toThrow(SyntaxError);
    });

    it('throws a SyntaxError if the expression isolates a range configuration lacking a clear package name', () => {
      expect(() => parsePackageSpec('@^1.0.0')).toThrow(SyntaxError);
    });
  });
});
