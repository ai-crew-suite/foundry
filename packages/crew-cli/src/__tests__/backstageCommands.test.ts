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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import execute from '../backstageCommands';
import { getWorkspaceContext } from '../bin/utils/workspace';
import { runBuildPipeline } from '../bin/commands/build/lib/orchestrate';
import { runFormatPipeline } from '../bin/commands/format/lib/orchestrate';
import { runLintPipeline } from '../bin/commands/lint/lib/orchestrate';
import { runPublishPipeline } from '../bin/commands/publish/lib/orchestrate';
import { runStorybookPipeline } from '../bin/commands/storybook/lib/orchestrate';
import { runStorybookBuildPipeline } from '../bin/commands/storybook-build/lib/orchestrate';
import { runE2EPipeline } from '../bin/commands/test-e2e/lib/orchestrate';
import { runUnitCoveragePipeline } from '../bin/commands/test-unit-coverage/lib/orchestrate';
import { runUnitTestsPipeline } from '../bin/commands/test-unit/lib/orchestrate';
import { runTypecheckPipeline } from '../bin/commands/typecheck/lib/orchestrate';
import { cleanWorkspace } from '../bin/commands/clean/lib/clean';
import { syncProjectReferences } from '../bin/commands/sync-refs/lib/sync';
import { mockWorkspaceContext } from '../bin/utils/test-utils';

vi.mock('../bin/utils/workspace', () => ({ getWorkspaceContext: vi.fn() }));
vi.mock('../bin/commands/build/lib/orchestrate', () => ({ runBuildPipeline: vi.fn() }));
vi.mock('../bin/commands/format/lib/orchestrate', () => ({ runFormatPipeline: vi.fn() }));
vi.mock('../bin/commands/lint/lib/orchestrate', () => ({ runLintPipeline: vi.fn() }));
vi.mock('../bin/commands/publish/lib/orchestrate', () => ({ runPublishPipeline: vi.fn() }));
vi.mock('../bin/commands/storybook/lib/orchestrate', () => ({ runStorybookPipeline: vi.fn() }));
vi.mock('../bin/commands/storybook-build/lib/orchestrate', () => ({ runStorybookBuildPipeline: vi.fn() }));
vi.mock('../bin/commands/test-e2e/lib/orchestrate', () => ({ runE2EPipeline: vi.fn() }));
vi.mock('../bin/commands/test-unit-coverage/lib/orchestrate', () => ({ runUnitCoveragePipeline: vi.fn() }));
vi.mock('../bin/commands/test-unit/lib/orchestrate', () => ({ runUnitTestsPipeline: vi.fn() }));
vi.mock('../bin/commands/typecheck/lib/orchestrate', () => ({ runTypecheckPipeline: vi.fn() }));
vi.mock('../bin/commands/clean/lib/clean', () => ({ cleanWorkspace: vi.fn() }));
vi.mock('../bin/commands/sync-refs/lib/sync', () => ({ syncProjectReferences: vi.fn() }));

const contextual = [
  ['build', runBuildPipeline],
  ['format', runFormatPipeline],
  ['lint', runLintPipeline],
  ['storybook', runStorybookPipeline],
  ['test:e2e', runE2EPipeline],
  ['test:unit', runUnitTestsPipeline],
  ['test:unit:coverage', runUnitCoveragePipeline],
] as const;
const standalone = [
  ['publish', runPublishPipeline],
  ['storybook:build', runStorybookBuildPipeline],
  ['typecheck', runTypecheckPipeline],
] as const;

function command(name: string, args: string[] = []) {
  return { args, info: { name: `crew ${name}`, usage: `backstage-cli crew ${name}` } };
}

describe('Backstage Crew command adapter', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceContext).mockReturnValue(mockWorkspaceContext);
    for (const [, pipeline] of [...contextual, ...standalone]) {
      vi.mocked(pipeline).mockReturnValue(true);
    }
    vi.mocked(cleanWorkspace).mockReturnValue({ removed: [] });
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it.each(contextual)('forwards %s arguments and workspace context', async (name, pipeline) => {
    const args = ['--flag', 'some value', '--', 'file.ts'];
    await execute(command(name, args));
    expect(pipeline).toHaveBeenCalledWith(mockWorkspaceContext, args);
  });

  it.each(standalone)('forwards %s arguments', async (name, pipeline) => {
    const args = ['--flag', 'some value'];
    await execute(command(name, args));
    expect(pipeline).toHaveBeenCalledWith(args);
  });

  it('runs clean and reference synchronization', async () => {
    await execute(command('clean'));
    await execute(command('sync:refs'));
    expect(cleanWorkspace).toHaveBeenCalledWith(mockWorkspaceContext);
    expect(syncProjectReferences).toHaveBeenCalledOnce();
  });

  it('throws an exit-code error for a failed pipeline', async () => {
    vi.mocked(runTypecheckPipeline).mockImplementation(() => {
      process.exitCode = 7;
      return false;
    });
    await expect(execute(command('typecheck'))).rejects.toMatchObject({ name: 'ExitCodeError', code: 7 });
  });
});
