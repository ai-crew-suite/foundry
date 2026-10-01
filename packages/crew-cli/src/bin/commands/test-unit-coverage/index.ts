/**
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
import { Command } from 'commander';
import { getWorkspaceContext } from '../../utils/workspace';
import { runUnitCoveragePipeline } from './lib/orchestrate';

const program = new Command();

program
  .name('test:unit:coverage')
  .description('Execute package unit tests matrix and write coverage metric distribution files')
  .allowUnknownOption(true)
  .action(() => {
    try {
      const context = getWorkspaceContext();
      const forwardedArgs = process.argv.slice(3);

      runUnitCoveragePipeline(context, forwardedArgs);
    } catch (error) {
      console.error(`\x1b[31m❌ Core test-unit-coverage orchestration framework error:\x1b[0m`, error);
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
