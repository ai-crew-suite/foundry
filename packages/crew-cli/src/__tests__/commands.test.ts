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
import { mockWorkspaceContext } from '../utils/test-utils';
import { getWorkspaceContext } from '../utils/workspace';
import build from '../commands/build';
import clean from '../commands/clean';
import format from '../commands/format';
import lint from '../commands/lint';
import publish from '../commands/publish';
import storybook from '../commands/storybook';
import storybookBuild from '../commands/storybook-build';
import syncRefs from '../commands/sync-refs';
import testE2e from '../commands/test-e2e';
import testUnit from '../commands/test-unit';
import testCoverage from '../commands/test-unit-coverage';
import typecheck from '../commands/typecheck';
import { runBuildPipeline } from '../commands/build/lib/orchestrate';
import { cleanWorkspace } from '../commands/clean/lib/clean';
import { runFormatPipeline } from '../commands/format/lib/orchestrate';
import { runLintPipeline } from '../commands/lint/lib/orchestrate';
import { runPublishPipeline } from '../commands/publish/lib/orchestrate';
import { runStorybookPipeline } from '../commands/storybook/lib/orchestrate';
import { runStorybookBuildPipeline } from '../commands/storybook-build/lib/orchestrate';
import { syncProjectReferences } from '../commands/sync-refs/lib/sync';
import { runE2EPipeline } from '../commands/test-e2e/lib/orchestrate';
import { runUnitTestsPipeline } from '../commands/test-unit/lib/orchestrate';
import { runUnitCoveragePipeline } from '../commands/test-unit-coverage/lib/orchestrate';
import { runTypecheckPipeline } from '../commands/typecheck/lib/orchestrate';

vi.mock('../utils/workspace', () => ({ getWorkspaceContext: vi.fn() }));
vi.mock('../commands/build/lib/orchestrate', () => ({ runBuildPipeline: vi.fn() }));
vi.mock('../commands/clean/lib/clean', () => ({ cleanWorkspace: vi.fn() }));
vi.mock('../commands/format/lib/orchestrate', () => ({ runFormatPipeline: vi.fn() }));
vi.mock('../commands/lint/lib/orchestrate', () => ({ runLintPipeline: vi.fn() }));
vi.mock('../commands/publish/lib/orchestrate', () => ({ runPublishPipeline: vi.fn() }));
vi.mock('../commands/storybook/lib/orchestrate', () => ({ runStorybookPipeline: vi.fn() }));
vi.mock('../commands/storybook-build/lib/orchestrate', () => ({ runStorybookBuildPipeline: vi.fn() }));
vi.mock('../commands/sync-refs/lib/sync', () => ({ syncProjectReferences: vi.fn() }));
vi.mock('../commands/test-e2e/lib/orchestrate', () => ({ runE2EPipeline: vi.fn() }));
vi.mock('../commands/test-unit/lib/orchestrate', () => ({ runUnitTestsPipeline: vi.fn() }));
vi.mock('../commands/test-unit-coverage/lib/orchestrate', () => ({ runUnitCoveragePipeline: vi.fn() }));
vi.mock('../commands/typecheck/lib/orchestrate', () => ({ runTypecheckPipeline: vi.fn() }));

const contextual = [
  ['build', build, runBuildPipeline],
  ['format', format, runFormatPipeline],
  ['lint', lint, runLintPipeline],
  ['storybook', storybook, runStorybookPipeline],
  ['test:e2e', testE2e, runE2EPipeline],
  ['test:unit', testUnit, runUnitTestsPipeline],
  ['test:unit:coverage', testCoverage, runUnitCoveragePipeline],
] as const;
const standalone = [
  ['publish', publish, runPublishPipeline],
  ['storybook:build', storybookBuild, runStorybookBuildPipeline],
  ['typecheck', typecheck, runTypecheckPipeline],
] as const;

const context = (name: string, args: string[] = []) => ({
  args,
  info: { name: `crew ${name}`, usage: `backstage-cli crew ${name}` },
});

describe('Backstage command handlers', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceContext).mockReturnValue(mockWorkspaceContext);
    for (const [, , pipeline] of [...contextual, ...standalone]) vi.mocked(pipeline).mockReturnValue(true);
    vi.mocked(cleanWorkspace).mockReturnValue({ removed: [] });
    process.exitCode = undefined;
  });

  afterEach(() => { process.exitCode = originalExitCode; });

  it.each(contextual)('forwards %s arguments and workspace context', async (name, execute, pipeline) => {
    const args = ['--flag', 'some value', '--', 'file.ts'];
    await execute(context(name, args));
    expect(pipeline).toHaveBeenCalledWith(mockWorkspaceContext, args);
  });

  it.each(standalone)('forwards %s arguments', async (name, execute, pipeline) => {
    const args = ['--flag', 'some value'];
    await execute(context(name, args));
    expect(pipeline).toHaveBeenCalledWith(args);
  });

  it('runs clean and reference synchronization', async () => {
    await clean(context('clean'));
    await syncRefs(context('sync:refs'));
    expect(cleanWorkspace).toHaveBeenCalledWith(mockWorkspaceContext);
    expect(syncProjectReferences).toHaveBeenCalledOnce();
  });

  it('propagates pipeline exit codes to Backstage', async () => {
    vi.mocked(runTypecheckPipeline).mockImplementation(() => {
      process.exitCode = 7;
      return false;
    });
    await expect(typecheck(context('typecheck'))).rejects.toMatchObject({ name: 'ExitCodeError', code: 7 });
  });
});
