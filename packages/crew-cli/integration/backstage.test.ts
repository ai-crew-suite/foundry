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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageDir = path.resolve(import.meta.dirname, '..');
const backstageCli = path.join(path.dirname(require.resolve('@backstage/cli/package.json')), 'bin/backstage-cli');
const defaultsDir = path.dirname(require.resolve('@backstage/cli-defaults/package.json'));
let root: string;
let workspace: string;

function runCli(cwd: string, ...args: string[]) {
  return spawnSync(process.execPath, [backstageCli, ...args], { cwd, encoding: 'utf8' });
}

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-cli-consumer-'));
  workspace = path.join(root, 'packages', 'consumer');
  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules', '@ai-crew-suite'), { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules', '@backstage'), { recursive: true });
  const installedPackage = path.join(root, 'node_modules', '@ai-crew-suite', 'crew-cli');
  fs.mkdirSync(installedPackage);
  fs.copyFileSync(path.join(packageDir, 'package.json'), path.join(installedPackage, 'package.json'));
  fs.cpSync(path.join(packageDir, 'dist'), path.join(installedPackage, 'dist'), { recursive: true });
  fs.symlinkSync(path.resolve(packageDir, '../../node_modules'), path.join(installedPackage, 'node_modules'), 'dir');
  fs.symlinkSync(defaultsDir, path.join(root, 'node_modules', '@backstage', 'cli-defaults'), 'dir');
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    private: true,
    workspaces: ['packages/*'],
    devDependencies: { '@ai-crew-suite/crew-cli': '*', '@backstage/cli-defaults': '*' },
  }));
  fs.writeFileSync(path.join(root, 'backstage.json'), '{}');
  fs.writeFileSync(path.join(workspace, 'package.json'), JSON.stringify({
    name: 'consumer',
    backstage: { role: 'node-library' },
  }));
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('Backstage CLI module in a consumer monorepo', () => {
  it('discovers Crew and the default Backstage modules from a child workspace', () => {
    const rootHelp = runCli(workspace, '--help');
    expect(rootHelp.status, rootHelp.stderr).toBe(0);
    expect(rootHelp.stdout).toContain('crew');
    expect(rootHelp.stdout).toContain('package');

    const help = runCli(workspace, 'crew', '--help');
    expect(help.status, help.stderr).toBe(0);
    for (const command of [
      'build', 'clean', 'format', 'lint', 'publish', 'storybook', 'storybook:build',
      'sync:refs', 'test:e2e', 'test:unit', 'test:unit:coverage', 'typecheck',
    ]) {
      expect(help.stdout).toContain(command);
    }
  });

  it('cleans the invoking workspace, not the monorepo root', () => {
    const dist = path.join(workspace, 'dist');
    const rootDist = path.join(root, 'dist');
    fs.mkdirSync(dist);
    fs.mkdirSync(rootDist);
    const result = runCli(workspace, 'crew', 'clean');
    expect(result.status, result.stderr).toBe(0);
    expect(fs.existsSync(dist)).toBe(false);
    expect(fs.existsSync(rootDist)).toBe(true);
  });

  it('forwards flags and preserves a failing tool exit code', () => {
    const result = runCli(workspace, 'crew', 'typecheck', '--invalid-crew-test-flag');
    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('--invalid-crew-test-flag');
  });

  it('runs build prerequisites through Backstage without a standalone Crew binary', () => {
    fs.mkdirSync(path.join(workspace, 'src'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'src', 'index.ts'), 'export const value = 1;\n');
    fs.writeFileSync(path.join(workspace, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { composite: true, declaration: true, types: [], outDir: 'dist' },
      include: ['src'],
    }));

    const result = runCli(workspace, 'crew', 'build', '--help', '--unused');
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('Analyzing internal dependency graphs');
    expect(result.stdout).toContain('backstage-cli package build');
  });

  it('rejects invalid arguments and displays command help', () => {
    const invalid = runCli(workspace, 'crew', 'clean', '--invalid');
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toContain('Unexpected arguments');

    for (const command of [
      'build', 'clean', 'format', 'lint', 'publish', 'storybook', 'storybook:build',
      'sync:refs', 'test:e2e', 'test:unit', 'test:unit:coverage', 'typecheck',
    ]) {
      const help = runCli(workspace, 'crew', command, '--help');
      expect(help.status, help.stderr).toBe(0);
      expect(help.stdout).toContain(`backstage-cli crew ${command}`);
    }
  });
});
