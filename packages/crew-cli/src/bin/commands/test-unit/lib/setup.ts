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
/**
 * Shared Vitest setup file for packages running tests through `crew test:unit`.
 *
 * NOTE: this setup deliberately does NOT register a global `beforeEach` that
 * calls `vi.resetAllMocks()`. A global reset silently wipes mock implementations
 * that consuming packages install at module scope or inside `beforeAll`
 * (for example `getOctokit: vi.fn().mockImplementation(...)`), breaking their
 * tests with "Cannot read properties of undefined" errors. Packages that want
 * per-test resets should register their own `beforeEach` hook instead.
 */
import { vi, afterEach, beforeAll, afterAll } from 'vitest';

declare global {
  var jest: {
    fn: (implementation?: (...args: any[]) => any) => ReturnType<typeof vi.fn>;
    spyOn: (target: object, method: string) => ReturnType<typeof vi.spyOn>;
  };
}

globalThis.jest = {
  fn: (implementation?: (...args: any[]) => any) => vi.fn(implementation),
  spyOn: (target: object, method: string) => vi.spyOn(target, method as never),
};

const isBrowserEnv = typeof window !== 'undefined';

if (isBrowserEnv) {
  Object.defineProperty(window.CSS, 'escape', {
    configurable: true,
    value: (value: string) => String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&'),
  });

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    return {} as unknown as RenderingContext;
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {
        /* no-op */
      },
      removeListener() {
        /* no-op */
      },
      addEventListener() {
        /* no-op */
      },
      removeEventListener() {
        /* no-op */
      },
      dispatchEvent: () => false,
    }),
  });

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    // Fixed: Added the missing scrollMargin layout property to satisfy modern lib.dom.d.ts specifications
    readonly scrollMargin: string = '';
    readonly thresholds: readonly number[] = [];
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    takeRecords = vi.fn(() => []);
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });
}

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((message) => {
    if (message?.toString().includes('Warning: ReactDOM.render is deprecated')) return;
    console.warn(message);
  });
});

afterEach(() => {
  if (isBrowserEnv) {
    document.body.innerHTML = '';
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});
