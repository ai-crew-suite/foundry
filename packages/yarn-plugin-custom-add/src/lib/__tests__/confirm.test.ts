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
import { PassThrough } from 'node:stream';

// Fabricate mock hooks to avoid touching immutable native ESM namespaces
const mockQuestion = vi.fn();
const mockClose = vi.fn();

vi.mock('node:readline/promises', () => ({
  createInterface: vi.fn(() => ({
    question: mockQuestion,
    close: mockClose,
  })),
}));

import { confirm } from '../confirm';

function createMockTerminal() {
  const stdin = new PassThrough() as PassThrough & { isTTY?: boolean };
  const stdout = new PassThrough();
  stdin.isTTY = true;
  return { stdin, stdout };
}

describe('confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false immediately if stdin is not a TTY (non-interactive / CI)', async () => {
    const stdin = new PassThrough() as PassThrough & { isTTY?: boolean };
    stdin.isTTY = false;
    const stdout = new PassThrough();

    const result = await confirm('Proceed?', { stdin, stdout });
    expect(result).toBe(false);
  });

  it('returns true for affirmative inputs ("y", "yes", case-insensitive, with whitespace)', async () => {
    const positiveInputs = ['y', 'Y', 'yes', 'YES', '  yes  ', ' y '];

    for (const input of positiveInputs) {
      mockQuestion.mockResolvedValueOnce(input);
      const { stdin, stdout } = createMockTerminal();

      const result = await confirm('Proceed?', { stdin, stdout });
      expect(result).toBe(true);
    }
  });

  it('returns false for negative or empty inputs ("n", "no", enter key)', async () => {
    const negativeInputs = ['n', 'N', 'no', 'NO', '', '   ', 'maybe', 'yep'];

    for (const input of negativeInputs) {
      mockQuestion.mockResolvedValueOnce(input);
      const { stdin, stdout } = createMockTerminal();

      const result = await confirm('Proceed?', { stdin, stdout });
      expect(result).toBe(false);
    }
  });

  it('formats the prompt string with standard (y/N): indicator', async () => {
    mockQuestion.mockResolvedValueOnce('y');
    const { stdin, stdout } = createMockTerminal();

    await confirm('Do you want to continue?', { stdin, stdout });
    expect(mockQuestion).toHaveBeenCalledWith('Do you want to continue? (y/N): ');
  });

  // --- Fixed Enterprise Recovery & Interface Robustness Assertions ---

  it('safely falls back to false if the user sends an EOF transmission (Ctrl+D) without content', async () => {
    // Audit Behavior: If stdin ends with empty string buffer, verify clean fallback
    mockQuestion.mockResolvedValueOnce('');
    const { stdin, stdout } = createMockTerminal();

    const result = await confirm('Proceed?', { stdin, stdout });
    expect(result).toBe(false);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('guarantees readline instances are closed atomically to prevent resource leaks during exceptional states', async () => {
    const { stdin, stdout } = createMockTerminal();

    // Force the internal question method to crash to replicate volatile terminal disruptions
    mockQuestion.mockImplementationOnce(() => {
      throw new Error('Fatal terminal hardware exception (Auditable Event)');
    });

    await expect(confirm('Proceed?', { stdin, stdout })).rejects.toThrow(
      'Fatal terminal hardware exception',
    );

    // ASSERT COMPLIANCE: Garbage collection cleanup hook fires regardless of execution trace failure
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
