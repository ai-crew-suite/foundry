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

/** Adapts a synchronous pipeline to Backstage command execution. */
export function pipelineCommand(run: (args: string[]) => boolean) {
  return async ({ args, info }: CliCommandContext): Promise<void> => {
    if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
      console.log(`Usage: ${info.usage} [options]\n\nOptions are passed to the underlying tool.`);
      return;
    }
    if (!run(args)) {
      throw new ExitCodeError(Number(process.exitCode) || 1, info.usage);
    }
  };
}

/** Rejects unexpected arguments for commands without options. */
export function noArgs({ args, info }: CliCommandContext): boolean {
  if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
    console.log(`Usage: ${info.usage}`);
    return false;
  }
  if (args.length) throw new Error(`Unexpected arguments for ${info.usage}: ${args.join(' ')}`);
  return true;
}
