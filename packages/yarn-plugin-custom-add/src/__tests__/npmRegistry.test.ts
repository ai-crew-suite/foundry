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
import { resolveLatestRange } from '../lib/npmRegistry.js';

describe('resolveLatestRange', () => {
  it('returns a caret range for the "latest" dist-tag', async () => {
    const fetchImpl = async (url: string) => {
      expect(url).toBe('https://registry.npmjs.org/lodash');
      return { ok: true, status: 200, json: async () => ({ 'dist-tags': { latest: '4.17.21' } }) };
    };

    await expect(resolveLatestRange('lodash', fetchImpl)).resolves.toBe('^4.17.21');
  });

  it('throws when the registry request fails', async () => {
    const fetchImpl = async () => ({ ok: false, status: 404, json: async () => ({}) });

    await expect(resolveLatestRange('does-not-exist', fetchImpl)).rejects.toThrow(/HTTP 404/);
  });

  it('throws when there is no "latest" dist-tag', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ 'dist-tags': {} }) });

    await expect(resolveLatestRange('lodash', fetchImpl)).rejects.toThrow(/No "latest" dist-tag/);
  });
});
