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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  createSourceFile,
  forEachChild,
  isIdentifier,
  isInterfaceDeclaration,
  isPropertySignature,
  ScriptTarget,
  type Node,
  type SourceFile,
  type TypeNode,
} from 'typescript';

/** Options controlling how {@link syncConfigTypes} reads and writes config types. */
export interface SyncConfigTypesOptions {
  /** Absolute path to the `config.d.ts` file declaring the `Config` interface. */
  configDtsPath: string;
  /** Absolute path of the generated TypeScript file to write. */
  targetTypesPath: string;
  /** Property on the `Config` interface to extract. Defaults to `'ai'`. */
  propertyName?: string;
  /** Name of the generated exported type. Defaults to `'AiBackendConfig'`. */
  exportedTypeName?: string;
}

const DEFAULT_PROPERTY_NAME = 'ai';
const DEFAULT_EXPORTED_TYPE_NAME = 'AiBackendConfig';

/**
 * Walks a parsed `config.d.ts` AST for the top-level `Config` interface and
 * returns the raw source text of the `propertyName` member's type, if found.
 */
export function extractConfigPropertyType(
  sourceFile: SourceFile,
  sourceCode: string,
  propertyName: string,
): string | undefined {
  let propertyType: TypeNode | undefined;

  function visit(node: Node): void {
    if (isInterfaceDeclaration(node) && node.name.text === 'Config') {
      const property = node.members.find(
        (member) =>
          isPropertySignature(member) &&
          isIdentifier(member.name) &&
          member.name.text === propertyName,
      );

      if (property && isPropertySignature(property) && property.type) {
        propertyType = property.type;
      }
    }

    forEachChild(node, visit);
  }

  visit(sourceFile);

  return propertyType
    ? sourceCode.substring(propertyType.getStart(sourceFile), propertyType.getEnd())
    : undefined;
}

/** Renders the machine-generated runtime types file content. */
export function buildGeneratedFileContents(propertyTypeText: string, exportedTypeName: string): string {
  return `/**
 * MACHINE GENERATED DO NOT MODIFY DIRECTLY
 *
 * This file was automatically generated from config.d.ts.
 * Run \`yarn sync-config-types\` to update this file.
 *
 * The two declarations intentionally duplicate the same shape: config.d.ts
 * must stay self-contained for published config-schema loading, while src
 * code must not reference it so the emitted dist-types tree remains
 * resolvable by the declaration bundler.
 */

export type ${exportedTypeName} = ${propertyTypeText};
`;
}

/**
 * Synchronizes a single `Config` interface property from `config.d.ts` into a
 * standalone, machine-generated TypeScript file.
 *
 * @throws {Error} If `propertyName` is not declared on the `Config` interface.
 */
export function syncConfigTypes(options: SyncConfigTypesOptions): void {
  const propertyName = options.propertyName ?? DEFAULT_PROPERTY_NAME;
  const exportedTypeName = options.exportedTypeName ?? DEFAULT_EXPORTED_TYPE_NAME;

  const sourceCode = readFileSync(options.configDtsPath, 'utf8');
  const sourceFile = createSourceFile(options.configDtsPath, sourceCode, ScriptTarget.Latest, true);
  const propertyTypeText = extractConfigPropertyType(sourceFile, sourceCode, propertyName);

  if (!propertyTypeText) {
    throw new Error(
      `Could not find "${propertyName}" inside the Config interface in ${options.configDtsPath}`,
    );
  }

  const generatedContent = buildGeneratedFileContents(propertyTypeText, exportedTypeName);

  mkdirSync(dirname(options.targetTypesPath), { recursive: true });
  writeFileSync(options.targetTypesPath, generatedContent, 'utf8');
}

