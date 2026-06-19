/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import appCommandManifest from '../../../../src/shared/appCommandManifest.json'
import {
  mobileDesktopCommandParityEntries,
  mobileDesktopCommandParityGaps,
  mobileDesktopCommandParityImplementedCount,
} from './mobileDesktopCommandParity'
import {
  mobileDesktopDynamicCommandParityEntries,
  mobileDesktopDynamicCommandParityGaps,
} from './mobileDesktopDynamicCommandParity'

type MobileDesktopDynamicCommandEntries = ReturnType<typeof mobileDesktopDynamicCommandParityEntries>
type DesktopDynamicCommandSource = MobileDesktopDynamicCommandEntries[number]['source']

const noteBuilderCommandsCoveredByManifest = new Set([
  'archive-note',
  'create-note',
  'create-type',
  'delete-note',
  'find-in-note',
  'paste-plain-text',
  'redo-action',
  'replace-in-note',
  'save-note',
  'toggle-favorite',
  'toggle-organized',
  'undo-action',
])

const templateIdExpansions = new Map<string, string[]>([
  ['`list-${slug}`', ['list-{type}']],
  ['`move-view-${directionKeyword}`', ['move-view-down', 'move-view-up']],
  ['`new-${slug}`', ['new-{type}']],
  ['`set-default-note-width-${mode}`', ['set-default-note-width-normal', 'set-default-note-width-wide']],
  ['`set-note-width-${mode}`', ['set-note-width-normal', 'set-note-width-wide']],
])

describe('mobile desktop command parity', () => {
  it('classifies every desktop app command for the mobile editing foundation', () => {
    const entries = mobileDesktopCommandParityEntries()

    expect(entries.map((entry) => entry.command).sort()).toEqual(Object.keys(appCommandManifest.commands).sort())
    expect(entries.every((entry) => entry.desktopId.length > 0)).toBe(true)
    expect(entries.every((entry) => entry.evidence.length > 0)).toBe(true)
  })

  it('keeps mobile-relevant desktop command gaps closed', () => {
    expect(mobileDesktopCommandParityGaps()).toEqual([])
  })

  it('proves most non-git desktop commands already have mobile editing or navigation coverage', () => {
    expect(mobileDesktopCommandParityImplementedCount()).toBeGreaterThan(24)
  })

  it('tracks desktop dynamic command parity outside the shared app manifest', () => {
    const entries = mobileDesktopDynamicCommandParityEntries()

    expect(entries.length).toBeGreaterThan(40)
    expect(entries.every((entry) => entry.desktopId.length > 0)).toBe(true)
    expect(entries.every((entry) => entry.evidence.length > 0)).toBe(true)
  })

  it('keeps the mobile dynamic inventory aligned with desktop command builders', () => {
    const expectedIdsBySource = desktopDynamicCommandIdsBySource()
    const entries = mobileDesktopDynamicCommandParityEntries()

    for (const source of Object.keys(expectedIdsBySource) as DesktopDynamicCommandSource[]) {
      expect(idsForSource(entries, source), source).toEqual(expectedIdsBySource[source])
    }
  })

  it('keeps mobile-relevant desktop dynamic command deferrals closed', () => {
    expect(mobileDesktopDynamicCommandParityGaps()).toEqual([])
  })
})

function desktopDynamicCommandIdsBySource(): Record<DesktopDynamicCommandSource, string[]> {
  return {
    'desktop-filter-commands': commandIdsFromDesktopSource('src/hooks/commands/filterCommands.ts'),
    'desktop-navigation-commands': commandIdsFromDesktopSource('src/hooks/commands/navigationCommands.ts'),
    'desktop-note-commands': commandIdsFromDesktopSource('src/hooks/commands/noteCommands.ts', {
      ignoredIds: noteBuilderCommandsCoveredByManifest,
    }),
    'desktop-type-commands': commandIdsFromDesktopSource('src/hooks/commands/typeCommands.ts'),
    'desktop-view-commands': commandIdsFromDesktopSource('src/hooks/commands/viewCommands.ts'),
  }
}

function commandIdsFromDesktopSource(
  sourcePath: string,
  options: {
    ignoredIds?: ReadonlySet<string>
  } = {},
): string[] {
  const sourceFilePath = resolve(process.cwd(), '../..', sourcePath)
  const sourceText = readFileSync(sourceFilePath, 'utf8')
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true)
  const ids: string[] = []

  function visit(node: ts.Node): void {
    if (isIdProperty(node)) {
      ids.push(...commandIdsFromInitializer(node.initializer, sourceFile))
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  const ignoredIds = options.ignoredIds ?? new Set<string>()
  return sortedUnique(ids.filter((id) => !ignoredIds.has(id)))
}

function isIdProperty(node: ts.Node): node is ts.PropertyAssignment {
  return ts.isPropertyAssignment(node)
    && ts.isIdentifier(node.name)
    && node.name.text === 'id'
}

function commandIdsFromInitializer(
  initializer: ts.Expression,
  sourceFile: ts.SourceFile,
): string[] {
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return [initializer.text]
  }

  if (ts.isTemplateExpression(initializer)) {
    return expandTemplateCommandId(initializer, sourceFile)
  }

  return []
}

function expandTemplateCommandId(
  initializer: ts.TemplateExpression,
  sourceFile: ts.SourceFile,
): string[] {
  const templateText = initializer.getText(sourceFile)
  const expansion = templateIdExpansions.get(templateText)
  return expansion ?? [`unsupported-template-command-id:${templateText}`]
}

function idsForSource(
  entries: MobileDesktopDynamicCommandEntries,
  source: DesktopDynamicCommandSource,
): string[] {
  return sortedUnique(entries
    .filter((entry) => entry.source === source)
    .map((entry) => entry.desktopId))
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
}
