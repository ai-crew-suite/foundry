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
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  createSourceFile,
  ScriptTarget,
  SyntaxKind,
  type SourceFile,
  type InterfaceDeclaration,
  type PropertySignature,
  type Identifier,
} from "typescript";

export interface SyncConfigTypesOptions {
  configDtsPath: string;
  targetTypesPath: string;
  propertyName?: string;
  exportedTypeName?: string;
}

/**
 * Extracts a specific top-level property type from a 'Config' interface within a TypeScript AST.
 */
export function extractConfigPropertyType(
  sourceFile: SourceFile,
  sourceText: string,
  propertyName: string,
): string | undefined {
  let configInterface: InterfaceDeclaration | undefined;

  // Walk the top-level statements to locate the explicit "Config" interface block
  for (const statement of sourceFile.statements) {
    if (
      statement.kind === SyntaxKind.InterfaceDeclaration &&
      (statement as InterfaceDeclaration).name.text === "Config"
    ) {
      configInterface = statement as InterfaceDeclaration;
      break;
    }
  }

  if (!configInterface) {
    return undefined;
  }

  // Iterate over members to isolate the requested property name matching target criteria
  for (const member of configInterface.members) {
    if (
      member.kind === SyntaxKind.PropertySignature &&
      (member as PropertySignature).name.kind === SyntaxKind.Identifier
    ) {
      const prop = member as PropertySignature;
      // HARDENING: Explicitly cast the property name to an Identifier to clear strict null and property checks
      const propNameIdentifier = prop.name as Identifier;

      if (propNameIdentifier.text === propertyName) {
        if (!prop.type) return undefined;

        // Capture the verbatim source code bounds of the target property's type literal block
        return sourceText.slice(prop.type.pos, prop.type.end).trim();
      }
    }
  }

  return undefined;
}

/**
 * Renders a standard machine-generated enterprise code asset wrapper.
 */
export function buildGeneratedFileContents(propertyTypeSource: string, exportedTypeName: string): string {
  return [
    "/**",
    " * ⚠️ MACHINE GENERATED DO NOT MODIFY DIRECTLY",
    " * This file was synchronized automatically via internal monorepo workflow configurations.",
    " */",
    "",
    `export type ${exportedTypeName} = ${propertyTypeSource};`,
    "",
  ].join("\n");
}

/**
 * Synchronizes 'config.d.ts' schema definitions into localized plugin type modules.
 */
export function syncConfigTypes(options: SyncConfigTypesOptions): void {
  const {
    configDtsPath,
    targetTypesPath,
    propertyName = "ai",
    exportedTypeName = "AiBackendConfig",
  } = options;

  const sourceCode = readFileSync(configDtsPath, "utf8");
  const sourceFile = createSourceFile(configDtsPath, sourceCode, ScriptTarget.Latest, true);

  const extractedType = extractConfigPropertyType(sourceFile, sourceCode, propertyName);

  if (!extractedType) {
    throw new Error(
      `Could not find "${propertyName}" configuration block declaration criteria inside the target ` +
      `"Config" interface of ${configDtsPath}. Please review schema alignments.`
    );
  }

  const generatedContents = buildGeneratedFileContents(extractedType, exportedTypeName);

  // Enforce recursive directory initialization to safeguard deep nesting flakiness
  const targetDir = dirname(targetTypesPath);
  mkdirSync(targetDir, { recursive: true });

  writeFileSync(targetTypesPath, generatedContents, "utf8");
}
