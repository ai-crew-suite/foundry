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
import { ExitCodeError } from '@backstage/cli-common';
import type { CliCommandContext } from '@backstage/cli-node';
import { getWorkspaceContext } from './bin/utils/workspace';
import { runBuildPipeline } from './bin/commands/build/lib/orchestrate';
import { cleanWorkspace } from './bin/commands/clean/lib/clean';
import { runFormatPipeline } from './bin/commands/format/lib/orchestrate';
import { runLintPipeline } from './bin/commands/lint/lib/orchestrate';
import { runPublishPipeline } from './bin/commands/publish/lib/orchestrate';
import { runStorybookPipeline } from './bin/commands/storybook/lib/orchestrate';
import { runStorybookBuildPipeline } from './bin/commands/storybook-build/lib/orchestrate';
import { syncProjectReferences } from './bin/commands/sync-refs/lib/sync';
import { runE2EPipeline } from './bin/commands/test-e2e/lib/orchestrate';
import { runUnitCoveragePipeline } from './bin/commands/test-unit-coverage/lib/orchestrate';
import { runUnitTestsPipeline } from './bin/commands/test-unit/lib/orchestrate';
import { runTypecheckPipeline } from './bin/commands/typecheck/lib/orchestrate';

/** Runs a Crew command using Backstage's resolved arguments and exit handling. */
export default async function executeCrewCommand({ args, info }: CliCommandContext): Promise<void> {
  const command = info.name.slice('crew '.length);
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(`Usage: ${info.usage} [options]\n\nOptions are passed to the underlying tool.`);
    return;
  }

  let success: boolean;
  switch (command) {
    case 'build': success = runBuildPipeline(getWorkspaceContext(), args); break;
    case 'format': success = runFormatPipeline(getWorkspaceContext(), args); break;
    case 'lint': success = runLintPipeline(getWorkspaceContext(), args); break;
    case 'publish': success = runPublishPipeline(args); break;
    case 'storybook': success = runStorybookPipeline(getWorkspaceContext(), args); break;
    case 'storybook:build': success = runStorybookBuildPipeline(args); break;
    case 'test:e2e': success = runE2EPipeline(getWorkspaceContext(), args); break;
    case 'test:unit': success = runUnitTestsPipeline(getWorkspaceContext(), args); break;
    case 'test:unit:coverage': success = runUnitCoveragePipeline(getWorkspaceContext(), args); break;
    case 'typecheck': success = runTypecheckPipeline(args); break;
    case 'clean': {
      if (args.length) throw new Error(`Unexpected arguments for ${info.usage}: ${args.join(' ')}`);
      const { removed } = cleanWorkspace(getWorkspaceContext());
      if (removed.length === 0) console.log('No build artifacts found.');
      for (const target of removed) console.log(`Removed: ${target}`);
      return;
    }
    case 'sync:refs':
      if (args.length) throw new Error(`Unexpected arguments for ${info.usage}: ${args.join(' ')}`);
      syncProjectReferences();
      console.log('TypeScript project references synchronized.');
      return;
    default:
      throw new Error(`Unknown Crew command: ${info.name}`);
  }

  // Backstage exits with zero after a successful handler, regardless of exitCode.
  if (!success) throw new ExitCodeError(Number(process.exitCode) || 1, info.usage);
}
