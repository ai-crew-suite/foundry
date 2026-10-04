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
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { httpUtils } from '@yarnpkg/core';
import { resolveLatestRange } from '../npmRegistry';

vi.mock('@yarnpkg/core', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    httpUtils: {
      get: vi.fn(),
    },
  };
});

describe('resolveLatestRange via Yarn Core Engine', () => {
  let mockConfiguration: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockConfiguration = {
      get: vi.fn((key: string) => {
        if (key === 'npmRegistryServer') return 'https://npmjs.org';
        if (key === 'npmScopes') {
          return {
            get: vi.fn().mockReturnValue(undefined),
          };
        }
        return undefined;
      }),
    };
  });

  it('returns a caret range for the "latest" dist-tag retrieved via target registry configuration', async () => {
    vi.mocked(httpUtils.get).mockResolvedValue({
      'dist-tags': { latest: '4.17.21' },
    });

    const result = await resolveLatestRange({
      packageName: 'lodash',
      configuration: mockConfiguration,
    });

    expect(result).toBe('^4.17.21');
    expect(httpUtils.get).toHaveBeenCalledWith(
      'https://npmjs.org/lodash',
      expect.objectContaining({ configuration: mockConfiguration, jsonResponse: true })
    );
  });

  it('correctly routes lookups to a specialized private scope registry if declared in workspace settings', async () => {
    vi.mocked(httpUtils.get).mockResolvedValue({
      'dist-tags': { latest: '1.0.0' },
    });

    const mockScopeMap = new Map();
    mockScopeMap.set('npmRegistryServer', 'https://ai-crew-suite.internal');

    mockConfiguration.get = vi.fn((key: string) => {
      if (key === 'npmRegistryServer') return 'https://npmjs.org';
      if (key === 'npmScopes') {
        return {
          get: vi.fn().mockReturnValue(mockScopeMap),
        };
      }
      return undefined;
    });

    const result = await resolveLatestRange({
      packageName: '@ai-crew-suite/shared-utils',
      configuration: mockConfiguration,
    });

    expect(result).toBe('^1.0.0');
    expect(httpUtils.get).toHaveBeenCalledWith(
      'https://ai-crew-suite.internal/@ai-crew-suite/shared-utils',
      expect.any(Object)
    );
  });

  it('throws an informative validation error if the requested package lacks a latest tag block', async () => {
    vi.mocked(httpUtils.get).mockResolvedValue({
      'dist-tags': {},
    });

    await expect(
      resolveLatestRange({ packageName: 'malformed-pkg', configuration: mockConfiguration })
    ).rejects.toThrow(/No "latest" dist-tag found/);
  });

  it('bubbles up HTTP exceptions and network failures wrapped in transparent auditable logs', async () => {
    vi.mocked(httpUtils.get).mockRejectedValue(new Error('401 Unauthorized - Invalid CI/CD Token'));

    await expect(
      resolveLatestRange({ packageName: 'secure-pkg', configuration: mockConfiguration })
    ).rejects.toThrow(/Failed to resolve latest version for "secure-pkg" via authenticated registry trace: 401 Unauthorized/);
  });
});
