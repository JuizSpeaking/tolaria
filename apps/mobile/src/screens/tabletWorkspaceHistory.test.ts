import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { mobileNoteEditableContent } from '../workspace/mobileDocumentContent'
import { applyMobileWorkspaceEdit, type MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import type { MobileNote, MobileTypeDefinition, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import {
  emptyMobileWorkspaceHistory,
  mobileWorkspaceHistoryEntry,
  recordMobileWorkspaceHistory,
} from './tabletWorkspaceHistory'

describe('tablet workspace editing history', () => {
  it('records reversible markdown content edits from workspace snapshots', () => {
    const originalContent = '# Workflow Orchestration Essay\n\nOriginal body.\n'
    const previousSnapshot = snapshotWithEditableNote({
      id: 'workflow-orchestration',
      rawContent: originalContent,
    })
    const nextContent = '# Workflow Orchestration Essay\n\nUpdated body.\n'
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, {
      content: nextContent,
      noteId: 'workflow-orchestration',
      type: 'updateNoteContent',
    })

    const entry = mobileWorkspaceHistoryEntry(previousSnapshot, nextSnapshot)

    expect(entry).toEqual({
      redoEdits: [{ content: nextContent, noteId: 'workflow-orchestration', type: 'updateNoteContent' }],
      undoEdits: [{ content: originalContent, noteId: 'workflow-orchestration', type: 'updateNoteContent' }],
    })
    expect(noteById(applyMobileWorkspaceEdit(nextSnapshot, entry?.undoEdits[0] ?? neverEdit()), 'workflow-orchestration').rawContent).toBe(originalContent)
  })

  it('records text file edits without converting them into markdown notes', () => {
    const previousSnapshot = snapshotWithEditableNote({
      fileKind: 'text',
      id: 'workflow-orchestration',
      rawContent: 'plain=true\n',
    })
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, {
      content: 'plain=false\n',
      noteId: 'workflow-orchestration',
      type: 'updateTextFileContent',
    })

    const entry = mobileWorkspaceHistoryEntry(previousSnapshot, nextSnapshot)

    expect(entry?.undoEdits).toEqual([
      { content: 'plain=true\n', noteId: 'workflow-orchestration', type: 'updateTextFileContent' },
    ])
    expect(entry?.redoEdits).toEqual([
      { content: 'plain=false\n', noteId: 'workflow-orchestration', type: 'updateTextFileContent' },
    ])
  })

  it('records fixture editor-block edits when raw content has not been hydrated yet', () => {
    const previousSnapshot = workspaceScenarioForId('default')
    const selectedNote = noteById(previousSnapshot, 'workflow-orchestration')
    const content = mobileNoteEditableContent({
      ...selectedNote,
      editorBlocks: previousSnapshot.editorBlocks,
      editorBullets: previousSnapshot.editorBullets,
    })
    const nextContent = content.replace('lower-priority', 'quiet')
    const edit = {
      content: nextContent,
      noteId: 'workflow-orchestration',
      type: 'updateNoteContent',
    } as const
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, edit)

    const entry = mobileWorkspaceHistoryEntry(previousSnapshot, nextSnapshot, edit)

    const undoEdit = entry?.undoEdits.find(isUpdateNoteContentEdit)
    const redoEdit = entry?.redoEdits.find(isUpdateNoteContentEdit)

    expect(undoEdit).toMatchObject({
      noteId: 'workflow-orchestration',
      type: 'updateNoteContent',
    })
    expect(undoEdit?.content).toContain('lower-priority chrome')
    expect(redoEdit?.content).toContain('quiet chrome')
  })

  it('does not record hydration or structural edits without stable loaded content', () => {
    const previousSnapshot = workspaceScenarioForId('default')
    const hydratedSnapshot = applyMobileWorkspaceEdit(previousSnapshot, {
      noteId: 'workflow-orchestration',
      rawContent: '# Workflow Orchestration Essay\n\nLoaded body.\n',
      type: 'hydrateNoteContent',
    })
    const renamedSnapshot = applyMobileWorkspaceEdit(snapshotWithEditableNote({
      id: 'workflow-orchestration',
      rawContent: '# Workflow Orchestration Essay\n\nLoaded body.\n',
    }), {
      filenameStem: 'renamed-workflow',
      noteId: 'workflow-orchestration',
      type: 'renameNoteFile',
    })

    expect(mobileWorkspaceHistoryEntry(previousSnapshot, hydratedSnapshot, {
      noteId: 'workflow-orchestration',
      rawContent: '# Workflow Orchestration Essay\n\nLoaded body.\n',
      type: 'hydrateNoteContent',
    })).toBeNull()
    expect(mobileWorkspaceHistoryEntry(previousSnapshot, renamedSnapshot)).toBeNull()
  })

  it('appends new edits to the past stack and clears redo history', () => {
    const entry = {
      redoEdits: [{ content: 'next', noteId: 'workflow-orchestration', type: 'updateNoteContent' as const }],
      undoEdits: [{ content: 'previous', noteId: 'workflow-orchestration', type: 'updateNoteContent' as const }],
    }
    const history = recordMobileWorkspaceHistory({
      future: [entry],
      past: [],
    }, entry)

    expect(history).toEqual({
      future: [],
      past: [entry],
    })
    expect(recordMobileWorkspaceHistory(emptyMobileWorkspaceHistory, null)).toBe(emptyMobileWorkspaceHistory)
  })

  it('undoes and redoes created notes with the exact created markdown', () => {
    const previousSnapshot = workspaceScenarioForId('default')
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, {
      title: 'Mobile Structural History',
      type: 'createNote',
    })
    const entry = requiredHistoryEntry(previousSnapshot, nextSnapshot, {
      title: 'Mobile Structural History',
      type: 'createNote',
    })

    const undoneSnapshot = applyHistoryEdits(nextSnapshot, entry.undoEdits)
    const redoneSnapshot = applyHistoryEdits(undoneSnapshot, entry.redoEdits)

    expect(noteByIdOptional(undoneSnapshot, 'mobile-structural-history.md')).toBeNull()
    expect(noteById(redoneSnapshot, 'mobile-structural-history.md').rawContent).toBe(
      '---\ntitle: Mobile Structural History\ntype: Note\n---\n',
    )
  })

  it('undoes and redoes relationship target creation as one command', () => {
    const previousSnapshot = relationshipTargetHistorySnapshot()
    const edit: MobileWorkspaceEdit = {
      key: 'related_to',
      sourceNoteId: 'workflow-orchestration',
      targetTitle: 'New Dependency',
      type: 'createRelationshipTarget',
    }
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, edit)
    const entry = requiredHistoryEntry(previousSnapshot, nextSnapshot, edit)
    const undoneSnapshot = applyHistoryEdits(nextSnapshot, entry.undoEdits)
    const redoneSnapshot = applyHistoryEdits(undoneSnapshot, entry.redoEdits)

    expect(noteByIdOptional(undoneSnapshot, 'Tolaria/Mobile UI/new-dependency.md')).toBeNull()
    expect(noteById(undoneSnapshot, 'workflow-orchestration').rawContent).toBe('# Workflow Orchestration Essay\n\nSource body.\n')
    expect(noteById(redoneSnapshot, 'Tolaria/Mobile UI/new-dependency.md').rawContent).toBe('---\ntitle: New Dependency\ntype: Note\n---\n')
    expect(noteById(redoneSnapshot, 'workflow-orchestration').rawContent).toContain('related_to:\n  - "[[Tolaria/Mobile UI/new-dependency]]"')
  })

  it('undoes and redoes saved views without losing their generated filename', () => {
    const previousSnapshot = workspaceScenarioForId('default')
    const edit: MobileWorkspaceEdit = {
      definition: {
        color: 'purple',
        filters: { all: [{ field: 'type', op: 'equals', value: 'Procedure' }] },
        icon: 'star',
        name: 'Procedure History',
        sort: 'modified:desc',
      },
      type: 'createView',
    }
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, edit)
    const entry = requiredHistoryEntry(previousSnapshot, nextSnapshot, edit)

    const undoneSnapshot = applyHistoryEdits(nextSnapshot, entry.undoEdits)
    const redoneSnapshot = applyHistoryEdits(undoneSnapshot, entry.redoEdits)

    expect(undoneSnapshot.views?.some((view) => view.filename === 'procedure-history.yml')).toBe(false)
    expect(redoneSnapshot.views?.find((view) => view.filename === 'procedure-history.yml')?.definition).toMatchObject({
      color: 'purple',
      icon: 'star',
      name: 'Procedure History',
    })
  })

  it.each([
    {
      edit: {
        definition: {
          color: 'purple' as const,
          filters: { all: [{ field: 'status', op: 'equals' as const, value: 'Active' }] },
          icon: 'folder',
          listPropertiesDisplay: ['belongs_to', 'status'],
          name: 'Active Workflows',
          sort: 'property:Priority:asc',
        },
        type: 'updateView' as const,
        viewId: 'view-active-procedures',
      },
      label: 'saved-view edits',
      redoneViews: ['active-procedures.yml:Active Workflows'],
      undoneViews: ['active-procedures.yml:Active Procedures'],
    },
    {
      edit: {
        direction: 'up' as const,
        type: 'moveView' as const,
        viewId: 'view-essays',
      },
      label: 'saved-view reordering',
      previousSnapshot: savedViewMoveHistorySnapshot(),
      redoneViews: ['essays.yml:Essays', 'active-procedures.yml:Active Procedures'],
      undoneViews: ['active-procedures.yml:Active Procedures', 'essays.yml:Essays'],
    },
    {
      edit: {
        type: 'deleteView' as const,
        viewId: 'view-active-procedures',
      },
      label: 'saved-view deletion',
      redoneViews: [],
      undoneViews: ['active-procedures.yml:Active Procedures'],
    },
  ])('undoes and redoes $label exactly', ({ edit, previousSnapshot, redoneViews, undoneViews }) => {
    expectViewHistoryRoundTrip({
      edit,
      previousSnapshot: previousSnapshot ?? workspaceScenarioForId('default'),
      redoneViews,
      undoneViews,
    })
  })

  it('undoes and redoes type section metadata updates exactly', () => {
    const previousSnapshot = workspaceScenarioForId('default')
    const edit: MobileWorkspaceEdit = {
      patch: { label: 'Long Essays', tone: 'blue' },
      type: 'updateTypeDefinition',
      typeName: 'Essay',
    }
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, edit)
    const entry = requiredHistoryEntry(previousSnapshot, nextSnapshot, edit)

    const undoneSnapshot = applyHistoryEdits(nextSnapshot, entry.undoEdits)
    const redoneSnapshot = applyHistoryEdits(undoneSnapshot, entry.redoEdits)
    const undoneDefinition = typeDefinitionByName(undoneSnapshot, 'Essay')
    const redoneDefinition = typeDefinitionByName(redoneSnapshot, 'Essay')

    expect(undoneDefinition.label).toBeUndefined()
    expect(undoneDefinition.tone).toBe('green')
    expect(redoneDefinition.label).toBe('Long Essays')
    expect(redoneDefinition.tone).toBe('blue')
  })

  it.each([
    {
      edit: { type: 'createTypeDefinition' as const, typeName: 'Decision' },
      label: 'Type creation',
      redoneDefinitions: ['Decision', 'Essay', 'Procedure', 'Release'],
      redoneSections: ['Decision', 'Essay', 'Procedure', 'Release'],
      undoneDefinitions: ['Essay', 'Procedure', 'Release'],
      undoneSections: ['Essay', 'Procedure', 'Release'],
    },
    {
      edit: { type: 'deleteTypeDefinition' as const, typeName: 'Procedure' },
      label: 'Type deletion',
      redoneDefinitions: ['Essay', 'Release'],
      redoneSections: ['Essay', 'Procedure', 'Release'],
      undoneDefinitions: ['Essay', 'Procedure', 'Release'],
      undoneSections: ['Essay', 'Procedure', 'Release'],
    },
    {
      edit: { direction: 'up' as const, type: 'moveTypeSection' as const, typeName: 'Procedure' },
      label: 'Type reordering',
      redoneDefinitions: ['Essay', 'Procedure', 'Release'],
      redoneSections: ['Procedure', 'Essay', 'Release'],
      undoneDefinitions: ['Essay', 'Procedure', 'Release'],
      undoneSections: ['Essay', 'Procedure', 'Release'],
    },
  ])('undoes and redoes $label exactly', ({
    edit,
    redoneDefinitions,
    redoneSections,
    undoneDefinitions,
    undoneSections,
  }) => {
    expectTypeHistoryRoundTrip({
      edit,
      previousSnapshot: workspaceScenarioForId('default'),
      redoneDefinitions,
      redoneSections,
      undoneDefinitions,
      undoneSections,
    })
  })

  it('undoes and redoes note folder moves through path edits', () => {
    expectNotePathRoundTrip({
      edit: {
        folderPath: 'Writing/Essays',
        noteId: 'workflow-orchestration',
        type: 'moveNoteToFolder',
      },
      previousSnapshot: snapshotWithFolderPaths(['Tolaria/Mobile UI', 'Writing/Essays']),
      redonePath: 'Writing/Essays/Workflow Orchestration Essay.md',
      undonePath: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    })
  })

  it('undoes and redoes path-backed note filename renames', () => {
    expectNotePathRoundTrip({
      edit: {
        filenameStem: 'workflow-manual',
        noteId: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
        type: 'renameNoteFile',
      },
      noteId: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      previousSnapshot: snapshotWithPathBackedSelectedNote(),
      redoneNoteId: 'Tolaria/Mobile UI/workflow-manual.md',
      redonePath: 'Tolaria/Mobile UI/workflow-manual.md',
      undonePath: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    })
  })

  it.each([
    {
      edit: {
        filenameStem: 'manual-name',
        noteId: 'workflow-orchestration',
        type: 'renameNoteFile' as const,
      },
      label: 'filename renames',
      redonePath: 'Tolaria/Mobile UI/manual-name.md',
      redoneTargets: ['[[Tolaria/Mobile UI/manual-name]]', '[[Tolaria/Mobile UI/manual-name|Workflow]]'],
    },
    {
      edit: {
        folderPath: 'Writing/Essays',
        noteId: 'workflow-orchestration',
        type: 'moveNoteToFolder' as const,
      },
      label: 'folder moves',
      previousSnapshot: { ...titleRenameHistorySnapshot(), folderPaths: ['Tolaria/Mobile UI', 'Writing/Essays'] },
      redonePath: 'Writing/Essays/Workflow Orchestration Essay.md',
      redoneTargets: [
        '[[Writing/Essays/Workflow Orchestration Essay]]',
        '[[Writing/Essays/Workflow Orchestration Essay|Workflow]]',
      ],
    },
  ])('undoes and redoes $label with exact inbound wikilink content', ({ edit, previousSnapshot, redonePath, redoneTargets }) => {
    expectExactWikilinkPathRoundTrip({
      edit,
      previousSnapshot: previousSnapshot ?? titleRenameHistorySnapshot(),
      redonePath,
      redoneTargets,
    })
  })

  it('undoes and redoes title-property filename renames with inbound wikilinks', () => {
    const previousSnapshot = titleRenameHistorySnapshot()
    const edit: MobileWorkspaceEdit = {
      key: 'title',
      noteId: 'workflow-orchestration',
      type: 'updateProperty',
      value: 'Renamed Workflow Essay',
    }
    const { redoneSnapshot, undoneSnapshot } = historyRoundTrip(previousSnapshot, edit)
    const undoneSource = noteById(undoneSnapshot, 'workflow-orchestration')
    const undoneRef = noteById(undoneSnapshot, 'open-source-project')
    const redoneSource = noteById(redoneSnapshot, 'workflow-orchestration')
    const redoneRef = noteById(redoneSnapshot, 'open-source-project')

    expect(undoneSource.path).toBe('Tolaria/Mobile UI/Workflow Orchestration Essay.md')
    expect(undoneSource.rawContent).toContain('title: Workflow Orchestration Essay')
    expect(undoneRef.rawContent).toContain('[[Workflow Orchestration Essay]]')
    expect(undoneRef.rawContent).toContain('[[Tolaria/Mobile UI/Workflow Orchestration Essay|Workflow]]')
    expect(redoneSource.path).toBe('Tolaria/Mobile UI/renamed-workflow-essay.md')
    expect(redoneSource.rawContent).toContain('title: Renamed Workflow Essay')
    expect(redoneRef.rawContent).toContain('[[Tolaria/Mobile UI/renamed-workflow-essay]]')
    expect(redoneRef.rawContent).toContain('[[Tolaria/Mobile UI/renamed-workflow-essay|Workflow]]')
  })

  it('undoes and redoes folder subtree renames through folder edits', () => {
    expectNotePathRoundTrip({
      edit: {
        folderPath: 'Tolaria',
        name: 'Research',
        type: 'renameFolder',
      },
      previousSnapshot: snapshotWithFolderPaths(['Tolaria', 'Tolaria/Mobile UI']),
      redonePath: 'Research/Mobile UI/Workflow Orchestration Essay.md',
      undonePath: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    })
  })

  it('undoes and redoes primary note-list display property overrides', () => {
    const previousSnapshot = workspaceScenarioForId('default')
    const { redoneSnapshot, undoneSnapshot } = historyRoundTrip(previousSnapshot, {
      listPropertiesDisplay: [' status ', 'belongs_to', 'Status'],
      target: 'allNotes',
      type: 'updatePrimaryNoteListProperties',
    })

    expect(undoneSnapshot.noteListPropertyOverrides).toBeUndefined()
    expect(redoneSnapshot.noteListPropertyOverrides).toEqual({
      allNotes: ['status', 'belongs_to'],
    })
  })

  it('undoes primary note-list display resets back to the previous override', () => {
    const previousSnapshot = {
      ...workspaceScenarioForId('default'),
      noteListPropertyOverrides: { inbox: ['status', 'tags'] },
    }
    const { redoneSnapshot, undoneSnapshot } = historyRoundTrip(previousSnapshot, {
      listPropertiesDisplay: [],
      target: 'inbox',
      type: 'updatePrimaryNoteListProperties',
    })

    expect(undoneSnapshot.noteListPropertyOverrides).toEqual({
      inbox: ['status', 'tags'],
    })
    expect(redoneSnapshot.noteListPropertyOverrides).toBeUndefined()
  })

  it('records bulk note edits as one reversible history entry', () => {
    const previousSnapshot = snapshotWithEditableNotes([
      ['workflow-orchestration', '# Workflow Orchestration Essay\n\nBulk organize.\n'],
      ['open-source-project', '# How I Run an Open Source Project\n\nBulk organize.\n'],
    ])
    const edit: MobileWorkspaceEdit = {
      edits: previousSnapshot.notes.map((note) => ({ noteId: note.id, organized: true, type: 'setOrganized' })),
      type: 'bulkEdit',
    }
    const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, edit)
    const entry = requiredHistoryEntry(previousSnapshot, nextSnapshot, edit)
    const undoneSnapshot = applyHistoryEdits(nextSnapshot, entry.undoEdits)
    const redoneSnapshot = applyHistoryEdits(undoneSnapshot, entry.redoEdits)

    expect(entry.undoEdits).toHaveLength(2)
    expect(undoneSnapshot.notes.map((note) => note.organized)).toEqual([false, false])
    expect(redoneSnapshot.notes.map((note) => note.organized)).toEqual([true, true])
  })
})

function expectExactWikilinkPathRoundTrip({
  edit,
  previousSnapshot,
  redonePath,
  redoneTargets,
}: {
  edit: MobileWorkspaceEdit
  previousSnapshot: MobileWorkspaceSnapshot
  redonePath: string
  redoneTargets: string[]
}) {
  const { redoneSnapshot, undoneSnapshot } = expectNotePathRoundTrip({
    edit,
    previousSnapshot,
    redonePath,
    undonePath: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
  })

  expect(noteById(undoneSnapshot, 'open-source-project').rawContent).toBe(pathHistoryRefContent())
  for (const target of redoneTargets) {
    expect(noteById(redoneSnapshot, 'open-source-project').rawContent).toContain(target)
  }
}

function expectNotePathRoundTrip({
  edit,
  noteId = 'workflow-orchestration',
  previousSnapshot,
  redoneNoteId = noteId,
  redonePath,
  undonePath,
}: {
  edit: MobileWorkspaceEdit
  noteId?: string
  previousSnapshot: MobileWorkspaceSnapshot
  redoneNoteId?: string
  redonePath: string
  undonePath: string
}) {
  const { redoneSnapshot, undoneSnapshot } = historyRoundTrip(previousSnapshot, edit)

  expect(noteById(undoneSnapshot, noteId).path).toBe(undonePath)
  expect(noteById(redoneSnapshot, redoneNoteId).path).toBe(redonePath)

  return { redoneSnapshot, undoneSnapshot }
}

function expectViewHistoryRoundTrip({
  edit,
  previousSnapshot,
  redoneViews,
  undoneViews,
}: {
  edit: MobileWorkspaceEdit
  previousSnapshot: MobileWorkspaceSnapshot
  redoneViews: string[]
  undoneViews: string[]
}) {
  const { redoneSnapshot, undoneSnapshot } = historyRoundTrip(previousSnapshot, edit)

  expect(viewHistoryLabels(undoneSnapshot)).toEqual(undoneViews)
  expect(viewHistoryLabels(redoneSnapshot)).toEqual(redoneViews)
}

function savedViewMoveHistorySnapshot(): MobileWorkspaceSnapshot {
  return applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
    definition: {
      color: 'green',
      filters: { all: [{ field: 'type', op: 'equals', value: 'Essay' }] },
      icon: null,
      name: 'Essays',
      sort: 'modified:desc',
    },
    type: 'createView',
  })
}

function viewHistoryLabels(snapshot: MobileWorkspaceSnapshot): string[] {
  return (snapshot.views ?? []).map((view) => `${view.filename}:${view.definition.name}`)
}

function expectTypeHistoryRoundTrip({
  edit,
  previousSnapshot,
  redoneDefinitions,
  redoneSections,
  undoneDefinitions,
  undoneSections,
}: {
  edit: MobileWorkspaceEdit
  previousSnapshot: MobileWorkspaceSnapshot
  redoneDefinitions: string[]
  redoneSections: string[]
  undoneDefinitions: string[]
  undoneSections: string[]
}) {
  const { redoneSnapshot, undoneSnapshot } = historyRoundTrip(previousSnapshot, edit)

  expect(typeDefinitionNames(undoneSnapshot)).toEqual(undoneDefinitions)
  expect(typeDefinitionNames(redoneSnapshot)).toEqual(redoneDefinitions)
  expect(typeSectionNames(undoneSnapshot)).toEqual(undoneSections)
  expect(typeSectionNames(redoneSnapshot)).toEqual(redoneSections)
}

function typeDefinitionNames(snapshot: MobileWorkspaceSnapshot): string[] {
  return Object.keys(snapshot.typeDefinitions ?? {}).sort()
}

function typeSectionNames(snapshot: MobileWorkspaceSnapshot): string[] {
  return (snapshot.sidebarSections.find((section) => section.id === 'types')?.items ?? [])
    .map((item) => item.typeName)
    .filter((typeName): typeName is string => Boolean(typeName))
}

function snapshotWithEditableNote(overrides: Partial<MobileNote> & { id: string; rawContent: string }): MobileWorkspaceSnapshot {
  const base = workspaceScenarioForId('default')
  const notes = base.notes.map((note) => note.id === overrides.id ? { ...note, ...overrides } : note)
  const allNotes = (base.allNotes ?? base.notes).map((note) => note.id === overrides.id ? { ...note, ...overrides } : note)

  return {
    ...base,
    allNotes,
    notes,
  }
}

function snapshotWithFolderPaths(folderPaths: string[]): MobileWorkspaceSnapshot {
  return {
    ...workspaceScenarioForId('default'),
    folderPaths,
  }
}

function snapshotWithPathBackedSelectedNote(): MobileWorkspaceSnapshot {
  const base = workspaceScenarioForId('default')
  const pathBackedNote = {
    ...base.notes[0],
    id: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
  }
  return {
    ...base,
    allNotes: [pathBackedNote, ...base.notes.slice(1)],
    notes: [pathBackedNote, ...base.notes.slice(1)],
    selectedNoteId: pathBackedNote.id,
  }
}

function relationshipTargetHistorySnapshot(): MobileWorkspaceSnapshot {
  const base = workspaceScenarioForId('default')
  const source = {
    ...noteById(base, 'workflow-orchestration'),
    rawContent: '# Workflow Orchestration Essay\n\nSource body.\n',
  }
  return {
    ...base,
    allNotes: [source, ...base.notes.slice(1)],
    notes: [source, ...base.notes.slice(1)],
    selectedNoteId: source.id,
  }
}

function titleRenameHistorySnapshot(): MobileWorkspaceSnapshot {
  const base = workspaceScenarioForId('default')
  const source = {
    ...noteById(base, 'workflow-orchestration'),
    rawContent: [
      '---',
      'title: Workflow Orchestration Essay',
      'type: Essay',
      '---',
      'Body without an H1.',
      '',
    ].join('\n'),
  }
  const ref = {
    ...noteById(base, 'open-source-project'),
    rawContent: pathHistoryRefContent(),
  }

  return {
    ...base,
    allNotes: [source, ref],
    notes: [source, ref],
    selectedNoteId: source.id,
  }
}

function pathHistoryRefContent(): string {
  return '# Ref\n\n[[Workflow Orchestration Essay]] and [[Tolaria/Mobile UI/Workflow Orchestration Essay|Workflow]]\n'
}

function snapshotWithEditableNotes(notesById: Array<[string, string]>): MobileWorkspaceSnapshot {
  const base = workspaceScenarioForId('default')
  const editableNotes = notesById.map(([noteId, rawContent]) => ({
    ...noteById(base, noteId),
    rawContent,
  }))

  return {
    ...base,
    allNotes: editableNotes,
    notes: editableNotes,
    selectedNoteId: editableNotes[0]?.id,
  }
}

function noteById(snapshot: MobileWorkspaceSnapshot, noteId: string): MobileNote {
  const note = (snapshot.allNotes ?? snapshot.notes).find((candidate) => candidate.id === noteId)
  if (!note) throw new Error(`Expected note ${noteId}`)
  return note
}

function noteByIdOptional(snapshot: MobileWorkspaceSnapshot, noteId: string): MobileNote | null {
  return (snapshot.allNotes ?? snapshot.notes).find((candidate) => candidate.id === noteId) ?? null
}

function typeDefinitionByName(snapshot: MobileWorkspaceSnapshot, typeName: string): MobileTypeDefinition {
  const definition = snapshot.typeDefinitions?.[typeName]
  if (!definition) throw new Error(`Expected type definition ${typeName}`)
  return definition
}

function requiredHistoryEntry(
  previousSnapshot: MobileWorkspaceSnapshot,
  nextSnapshot: MobileWorkspaceSnapshot,
  sourceEdit: MobileWorkspaceEdit,
) {
  const entry = mobileWorkspaceHistoryEntry(previousSnapshot, nextSnapshot, sourceEdit)
  if (!entry) throw new Error('Expected history entry')
  return entry
}

function applyHistoryEdits(snapshot: MobileWorkspaceSnapshot, edits: MobileWorkspaceEdit[]) {
  return edits.reduce(applyMobileWorkspaceEdit, snapshot)
}

function historyRoundTrip(previousSnapshot: MobileWorkspaceSnapshot, edit: MobileWorkspaceEdit) {
  const nextSnapshot = applyMobileWorkspaceEdit(previousSnapshot, edit)
  const entry = requiredHistoryEntry(previousSnapshot, nextSnapshot, edit)
  const undoneSnapshot = applyHistoryEdits(nextSnapshot, entry.undoEdits)

  return {
    redoneSnapshot: applyHistoryEdits(undoneSnapshot, entry.redoEdits),
    undoneSnapshot,
  }
}

function neverEdit(): never {
  throw new Error('Expected history entry')
}

function isUpdateNoteContentEdit(
  edit: { type: string },
): edit is Extract<MobileWorkspaceEdit, { type: 'updateNoteContent' }> {
  return edit.type === 'updateNoteContent'
}
