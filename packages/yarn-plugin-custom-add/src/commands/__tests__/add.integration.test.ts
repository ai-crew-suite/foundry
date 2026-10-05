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
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { execaSync } from 'execa';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';

const packageJson = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../package.json'), 'utf8'));
const COMPILED_PLUGIN_PATH = resolve(import.meta.dirname, `../../../dist/yarn-plugin-custom-add-v${packageJson.version}.cjs`);

describe('CustomAddCommand E2E Sandbox Integration', () => {
  let sandboxDir: string;
  let yarnrcPath: string;
  let packageJsonPath: string;

  beforeEach(() => {
    sandboxDir = join(tmpdir(), `yarn-plugin-e2e-sandbox-${Math.random().toString(36).slice(2)}`);
    mkdirSync(sandboxDir, { recursive: true });

    yarnrcPath = join(sandboxDir, '.yarnrc.yml');
    packageJsonPath = join(sandboxDir, 'package.json');

    const initialYarnrc = [
      "plugins:",
      `  - path: "${COMPILED_PLUGIN_PATH}"`,
      "    spec: \"@ai-crew-suite/yarn-plugin-custom-add\"",
      "",
      "catalogs:",
      "  prod:",
      '    "react": "^18.2.0"',
      "  dev:",
      ""
    ].join('\n');

    writeFileSync(yarnrcPath, initialYarnrc, 'utf8');
    writeFileSync(packageJsonPath, JSON.stringify({
      name: 'sandbox-monorepo',
      private: true,
      dependencies: {
        'react': 'catalog:prod'
      },
      devDependencies: {}
    }, null, 2) + '\n', 'utf8');

    if (!existsSync(COMPILED_PLUGIN_PATH)) {
      throw new Error(`Integration target file missing at ${COMPILED_PLUGIN_PATH}. Run your build package command first.`);
    }
  });

  afterEach(() => {
    if (sandboxDir && existsSync(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
    }
  });

  function executeYarnCommand(args: string[]) {
    return execaSync('yarn', args, {
      cwd: sandboxDir,
      reject: false
    });
  }

  describe('Transactional Scope Execution', () => {
    it('actively catches and blocks native "yarn add" invocations, printing custom redirect directions', () => {
      const result = executeYarnCommand(['add', 'lodash']);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('The native "yarn add" command is disabled in this repository');
      expect(result.stdout).toContain('yarn catalog-add <package-name>');

      const parsedYaml = parseYaml(readFileSync(yarnrcPath, 'utf8'));
      expect(parsedYaml.catalogs.prod).toEqual({ react: '^18.2.0' });
    });

    it('successfully appends a new dependency range inside .yarnrc.yml catalogs and targets package.json manifest', () => {
      const result = executeYarnCommand(['catalog-add', 'lodash@^4.17.21']);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Added "lodash" (^4.17.21) to "prod" catalog');

      const yarnrcContent = readFileSync(yarnrcPath, 'utf8');
      const parsedYaml = parseYaml(yarnrcContent);
      expect(parsedYaml.catalogs.prod.lodash).toBe('^4.17.21');

      const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      expect(manifest.dependencies.lodash).toBe('catalog:prod');
    });

    it('successfully routes target packages to dev catalog blocks when using --dev options flags', () => {
      const result = executeYarnCommand(['catalog-add', 'vitest@^2.0.0', '--dev']);

      expect(result.exitCode).toBe(0);

      const parsedYaml = parseYaml(readFileSync(yarnrcPath, 'utf8'));
      expect(parsedYaml.catalogs.dev.vitest).toBe('^2.0.0');

      const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      expect(manifest.devDependencies.vitest).toBe('catalog:dev');
    });

    it('retains preexisting format spacing blocks and inline notes inside files after mutations commit', () => {
      writeFileSync(yarnrcPath, [
        "plugins:",
        `  - path: "${COMPILED_PLUGIN_PATH}"`,
        "    spec: \"@ai-crew-suite/yarn-plugin-custom-add\"",
        "",
        '# SOC-2 Compliance Lock Configuration Boundary',
        'catalogs:',
        '  # Production core dependencies',
        '  prod:',
        '    "react": "^18.2.0"'
      ].join('\n'), 'utf8');

      const result = executeYarnCommand(['catalog-add', 'chalk@^5.0.0']);
      expect(result.exitCode).toBe(0);

      const postRunContent = readFileSync(yarnrcPath, 'utf8');
      expect(postRunContent).toContain('# SOC-2 Compliance Lock Configuration Boundary');
      expect(postRunContent).toContain('# Production core dependencies');
      expect(postRunContent).toContain('"chalk": "^5.0.0"');
    });

    it('fails safely and completely rolls back all changes if an argument is pass-validated as empty', () => {
      const result = executeYarnCommand(['catalog-add', 'lodash@']);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Range or tag declaration cannot be empty');

      const parsedYaml = parseYaml(readFileSync(yarnrcPath, 'utf8'));
      expect(parsedYaml.catalogs.prod).toEqual({ react: '^18.2.0' });
    });
  });
});
