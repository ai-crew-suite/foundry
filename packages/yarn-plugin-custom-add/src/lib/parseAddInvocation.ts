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

/** Parsed shape of the args following the `add` subcommand. */
export interface AddInvocation {
  /** Raw `name` or `name@range` specs passed to `yarn add`. */
  specs: string[];
  /** Whether `-D`/`--dev` was passed. */
  dev: boolean;
  /** Value of `--target <ref>` / `--target=<ref>`, if provided. */
  target?: string;
}

/** Splits `args` (everything after the `add` subcommand) into specs and flags. */
export function parseAddInvocationArgs(args: string[]): AddInvocation {
  const specs: string[] = [];
  let dev = false;
  let target: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '-D' || arg === '--dev') {
      dev = true;
      continue;
    }

    if (arg === '--target') {
      target = args[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith('--target=')) {
      target = arg.slice('--target='.length);
      continue;
    }

    if (arg.startsWith('-')) {
      continue;
    }

    specs.push(arg);
  }

  return { specs, dev, target };
}

/** A parsed `name` or `name@range` dependency spec. */
export interface PackageSpec {
  name: string;
  range?: string;
}

/** Splits a `yarn add` spec into its package name and optional version range. */
export function parsePackageSpec(spec: string): PackageSpec {
  const atIndex = spec.startsWith('@') ? spec.indexOf('@', 1) : spec.indexOf('@');

  if (atIndex === -1) {
    return { name: spec };
  }

  return { name: spec.slice(0, atIndex), range: spec.slice(atIndex + 1) };
}
