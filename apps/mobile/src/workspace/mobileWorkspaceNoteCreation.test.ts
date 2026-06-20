import { afterEach, describe, expect, it, vi } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { buildLocalVaultWorkspaceSnapshot } from './localVaultSnapshot'
import type { MobileNote } from './mobileWorkspaceModel'
import {
  applyMobileWorkspaceEdit,
  applyMobileWorkspaceEditWithWrites,
  type MobileWorkspaceEditResult,
} from './mobileWorkspaceEditing'
import { buildMobileDeepLinkForNote } from './mobileDeepLinks'

describe('mobile note creation parity', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a selected editable note with desktop-style frontmatter content', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      title: 'Mobile Editing Contract',
      type: 'createNote',
    })

    expect(snapshot.selectedNoteId).toBe('mobile-editing-contract.md')
    expect(snapshot.notes[0]).toMatchObject({
      id: 'mobile-editing-contract.md',
      rawContent: '---\ntitle: Mobile Editing Contract\ntype: Note\n---\n',
      title: 'Mobile Editing Contract',
      type: 'Note',
    })
  })

  it('creates typed notes with Type template body content', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      defaults: {
        status: 'Active',
        template: '## Objective\n\nLaunch mobile parity.\n',
        type: 'Project',
      },
      title: 'Mobile Template Contract',
      type: 'createNote',
    })

    const note = result.snapshot.notes[0]
    expect(note).toMatchObject({
      rawContent: [
        '---',
        'title: Mobile Template Contract',
        'type: Project',
        'status: Active',
        '---',
        '',
        '## Objective',
        '',
        'Launch mobile parity.',
        '',
      ].join('\n'),
      title: 'Mobile Template Contract',
      type: 'Project',
    })
    expect(note?.editorBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'heading', level: 2, text: 'Objective' }),
        expect.objectContaining({ kind: 'paragraph' }),
      ]),
    )
    expect(result.writes).toEqual([{
      content: note?.rawContent,
      kind: 'createNote',
      path: 'mobile-template-contract.md',
    }])
  })

  it('creates title-less typed notes for immediate type commands', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      defaults: {
        template: '## Objective\n\nLaunch mobile parity.\n',
        type: 'Project',
      },
      title: '',
      type: 'createNote',
    })
    const note = result.snapshot.notes[0]

    expect(note).toMatchObject({
      id: 'untitled-project-1700000000.md',
      rawContent: [
        '---',
        'type: Project',
        '---',
        '',
        '# ',
        '',
        '## Objective',
        '',
        'Launch mobile parity.',
        '',
      ].join('\n'),
      title: 'Untitled Project 1700000000',
      type: 'Project',
    })
    expect(result.writes).toEqual([{
      content: note?.rawContent,
      kind: 'createNote',
      path: 'untitled-project-1700000000.md',
    }])
  })

  it('does not prepend an empty H1 when a title-less typed note template starts with H1', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      defaults: {
        template: '\n\n# Week 2026.21\n\nWeekly note\n',
        type: 'Weekly',
      },
      title: '',
      type: 'createNote',
    })
    const note = result.snapshot.notes[0]

    expect(note.rawContent).toBe([
      '---',
      'type: Weekly',
      '---',
      '',
      '',
      '',
      '# Week 2026.21',
      '',
      'Weekly note',
      '',
    ].join('\n'))
    expect(note.rawContent).not.toContain('# \n\n\n\n# Week')
  })

  it('plans create writes for new notes', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      title: 'Mobile Persistence Contract',
      type: 'createNote',
    })

    expect(result.writes).toEqual([{
      content: '---\ntitle: Mobile Persistence Contract\ntype: Note\n---\n',
      kind: 'createNote',
      path: 'mobile-persistence-contract.md',
    }])
  })

  it('keeps fixture-created scratch notes on the default Tolaria vault label', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      title: 'Mobile QA Draft',
      type: 'createNote',
    })
    const note = result.snapshot.notes[0]

    expect(note).toMatchObject({
      path: 'mobile-qa-draft.md',
      workspace: 'Tolaria Vault',
      workspaceAlias: null,
    })
    expect(buildMobileDeepLinkForNote({ note, source: result.snapshot.source })).toEqual({
      ok: true,
      url: 'tolaria://tolaria-vault/mobile-qa-draft.md',
    })
  })

  it('creates notes in the selected folder with frontmatter defaults', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      defaults: {
        folderPath: 'Writing/Launch',
        organized: false,
        properties: { priority: 'High' },
        relationships: { belongs_to: ['[[Tolaria MVP]]'] },
        status: 'Active',
        tags: ['Design', 'Mobile'],
        type: 'Procedure',
      },
      title: 'Launch Checklist',
      type: 'createNote',
    })
    const note = result.snapshot.notes[0]

    expect(note).toMatchObject({
      id: 'Writing/Launch/launch-checklist.md',
      path: 'Writing/Launch/launch-checklist.md',
      status: 'Active',
      tags: ['Design', 'Mobile'],
      title: 'Launch Checklist',
      type: 'Procedure',
      typeTone: 'purple',
    })
    expect(note.relationships.find((relationship) => relationship.key === 'belongs_to')?.values).toContainEqual(
      expect.objectContaining({ title: 'Tolaria MVP', type: 'Note' }),
    )
    expect(note.rawContent).toContain('type: Procedure')
    expect(note.rawContent).toContain('status: Active')
    expect(note.rawContent).toContain('title: Launch Checklist')
    expect(note.rawContent).toContain('tags:\n  - Design\n  - Mobile')
    expect(note.rawContent).toContain('priority: High')
    expect(note.rawContent).toContain('belongs_to: "[[Tolaria MVP]]"')
    expect(result.writes).toEqual([{
      content: note.rawContent,
      kind: 'createNote',
      path: 'Writing/Launch/launch-checklist.md',
    }])
  })

  it('preserves desktop relationship key spelling from create-note defaults', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      defaults: {
        relationships: { 'Belongs to': ['[[Tolaria MVP]]'] },
        type: 'Project',
      },
      title: 'Relationship Key Contract',
      type: 'createNote',
    })
    const note = result.snapshot.notes[0]

    expect(note.relationships.find((relationship) => relationship.key === 'Belongs to')?.values).toContainEqual(
      expect.objectContaining({ title: 'Tolaria MVP' }),
    )
    expect(note.rawContent).toContain('Belongs to: "[[Tolaria MVP]]"')
    expect(note.rawContent).not.toContain('belongs_to:')
    expect(result.writes).toEqual([{
      content: note.rawContent,
      kind: 'createNote',
      path: 'relationship-key-contract.md',
    }])
  })

  it('creates relationship targets beside the source note and links the exact created path', () => {
    const { result, target, updatedSource } = createRelationshipTargetResult()

    expect(result.snapshot.selectedNoteId).toBe('Tolaria/Mobile UI/new-dependency.md')
    expect(target).toMatchObject({
      id: 'Tolaria/Mobile UI/new-dependency.md',
      path: 'Tolaria/Mobile UI/new-dependency.md',
      title: 'New Dependency',
      type: 'Note',
    })
    expect(updatedSource?.rawContent).toContain('Related to:\n  - "[[Tolaria/Mobile UI/new-dependency]]"')
    expect(updatedSource?.rawContent).not.toContain('related_to:')
    expect(updatedSource?.relationships.find((relationship) => relationship.key === 'Related to')?.values).toContainEqual(
      expect.objectContaining({
        id: target?.id,
        title: 'New Dependency',
      }),
    )
    expect(result.writes).toEqual([
      {
        content: '---\ntitle: New Dependency\ntype: Note\n---\n',
        kind: 'createNote',
        path: 'Tolaria/Mobile UI/new-dependency.md',
      },
      {
        content: updatedSource?.rawContent,
        kind: 'saveNote',
        path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      },
    ])
  })

  it('persists source relationship refs from local-vault relationship target creation', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        localVaultFile('Relationships/Source.md', [
          '---',
          'type: Essay',
          'status: Draft',
          '---',
          '# Relationship Source',
          '',
          'Create a relationship target from this note.',
          '',
        ].join('\n')),
      ],
      vaultLabel: 'Tolaria Vault',
      vaultPath: '/tmp/tolaria-vault',
    })
    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      key: 'related_to',
      sourceNoteId: 'Relationships/Source.md',
      targetTitle: 'Native Related Target',
      type: 'createRelationshipTarget',
    })

    expect(result.writes).toContainEqual({
      content: expect.stringContaining('related_to:\n  - "[[Relationships/native-related-target]]"'),
      kind: 'saveNote',
      path: 'Relationships/Source.md',
    })
  })

  it('creates same-workspace relationship target refs without adding the workspace alias prefix', () => {
    const base = workspaceScenarioForId('default')
    const sourceNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nSource body.\n',
      workspaceAlias: 'laputa',
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...base,
      allNotes: [sourceNote, ...base.notes.slice(1)],
      notes: [sourceNote, ...base.notes.slice(1)],
      source: {
        alias: 'laputa',
        kind: 'localVault',
        label: 'Laputa',
        totalNotes: base.notes.length,
        visibleNotes: base.notes.length,
      },
    }, {
      key: 'Related to',
      sourceNoteId: sourceNote.id,
      targetTitle: 'New Dependency',
      type: 'createRelationshipTarget',
    })
    const target = result.snapshot.allNotes?.find((note) => note.path === 'Tolaria/Mobile UI/new-dependency.md')
    const updatedSource = result.snapshot.allNotes?.find((note) => note.id === sourceNote.id)

    expect(target).toMatchObject({ workspaceAlias: 'laputa' })
    expect(updatedSource?.rawContent).toContain('Related to:\n  - "[[Tolaria/Mobile UI/new-dependency]]"')
    expect(updatedSource?.rawContent).not.toContain('[[laputa/Tolaria/Mobile UI/new-dependency]]')
  })

  it('creates relationship targets with the source Type relationship schema defaults', () => {
    expectSchemaBackedRelationshipTarget(
      applyMobileWorkspaceEditWithWrites(relationshipTargetSchemaSnapshot(), {
        key: 'has',
        sourceNoteId: 'workflow-orchestration',
        targetTitle: 'Launch Beta',
        type: 'createRelationshipTarget',
      }),
    )
  })

  it('blocks named note creation when the desktop target path already exists', () => {
    const base = workspaceScenarioForId('default')
    const existingNote = {
      ...base.notes[0],
      id: 'Writing/Launch/launch-checklist.md',
      path: 'Writing/Launch/launch-checklist.md',
    }
    const snapshot = {
      ...base,
      allNotes: [existingNote, ...base.notes],
      notes: [existingNote, ...base.notes],
    }
    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      defaults: { folderPath: 'Writing/Launch' },
      title: 'Launch Checklist',
      type: 'createNote',
    })

    expect(result.writes).toEqual([])
    expect(result.snapshot.notes).toHaveLength(snapshot.notes.length)
    expect(result.snapshot.selectedNoteId).toBe(snapshot.selectedNoteId)
  })

  it('blocks relationship target creation when the generated target path already exists', () => {
    const base = workspaceScenarioForId('default')
    const sourceNote = {
      ...base.notes[0],
      id: 'Writing/Launch/source.md',
      path: 'Writing/Launch/source.md',
      rawContent: '# Source\n\nSource body.\n',
      title: 'Source',
    }
    const existingTarget = {
      ...base.notes[1],
      id: 'Writing/Launch/launch-checklist.md',
      path: 'Writing/Launch/launch-checklist.md',
      title: 'Launch Checklist',
    }
    const snapshot = {
      ...base,
      allNotes: [sourceNote, existingTarget, ...base.notes.slice(2)],
      notes: [sourceNote, existingTarget, ...base.notes.slice(2)],
      selectedNoteId: sourceNote.id,
    }
    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      key: 'related_to',
      sourceNoteId: sourceNote.id,
      targetTitle: 'Launch Checklist',
      type: 'createRelationshipTarget',
    })

    expect(result.writes).toEqual([])
    expect(result.snapshot.notes).toHaveLength(snapshot.notes.length)
    expect(result.snapshot.notes[0]?.rawContent).toBe(sourceNote.rawContent)
    expect(result.snapshot.selectedNoteId).toBe(sourceNote.id)
  })
})

function createRelationshipTargetResult() {
  const base = workspaceScenarioForId('default')
  const sourceNote = {
    ...base.notes[0],
    rawContent: '# Workflow Orchestration Essay\n\nSource body.\n',
  }
  const result = applyMobileWorkspaceEditWithWrites({
    ...base,
    allNotes: [sourceNote, ...base.notes.slice(1)],
    notes: [sourceNote, ...base.notes.slice(1)],
    selectedNoteId: sourceNote.id,
  }, {
    key: 'Related to',
    sourceNoteId: sourceNote.id,
    targetTitle: 'New Dependency',
    type: 'createRelationshipTarget',
  })

  return {
    result,
    target: result.snapshot.allNotes?.find((note) => note.path === 'Tolaria/Mobile UI/new-dependency.md'),
    updatedSource: result.snapshot.allNotes?.find((note) => note.id === sourceNote.id),
  }
}

function localVaultFile(relativePath: string, content: string) {
  return {
    absolutePath: `/tmp/tolaria-vault/${relativePath}`,
    content,
    createdAt: null,
    modifiedAt: null,
    relativePath,
    size: content.length,
  }
}

function relationshipTargetSchemaSnapshot() {
  const base = workspaceScenarioForId('default')
  const sourceNote = {
    ...base.notes[0],
    rawContent: '# Workflow Orchestration Essay\n\nSource body.\n',
  }

  return {
    ...base,
    allNotes: [sourceNote, ...base.notes.slice(1)],
    notes: [sourceNote, ...base.notes.slice(1)],
    selectedNoteId: sourceNote.id,
    typeDefinitions: {
      ...base.typeDefinitions,
      Essay: {
        ...base.typeDefinitions?.Essay,
        properties: {
          ...base.typeDefinitions?.Essay?.properties,
          has: 'Milestone',
        },
      },
      Milestone: {
        properties: {
          Priority: 'High',
          status: 'Planned',
        },
        template: '## Outcome\n\n',
        tone: 'yellow' as const,
      },
    },
  }
}

function expectSchemaBackedRelationshipTarget(result: MobileWorkspaceEditResult) {
  const target = schemaTargetNote(result)
  const updatedSource = schemaUpdatedSourceNote(result)

  expectSchemaTargetNote(target)
  expectSchemaSourceNote(updatedSource)
  expectSchemaTargetWrites(result, target, updatedSource)
}

function schemaTargetNote(result: MobileWorkspaceEditResult): MobileNote {
  const note = result.snapshot.allNotes?.find((candidate) => candidate.path === 'Tolaria/Mobile UI/launch-beta.md')
  expect(note).toBeDefined()
  return note!
}

function schemaUpdatedSourceNote(result: MobileWorkspaceEditResult): MobileNote {
  const note = result.snapshot.allNotes?.find((candidate) => candidate.id === 'workflow-orchestration')
  expect(note).toBeDefined()
  return note!
}

function expectSchemaTargetNote(target: MobileNote) {
  expect(target).toMatchObject({
    status: 'Planned',
    title: 'Launch Beta',
    type: 'Milestone',
    typeTone: 'yellow',
  })
  expect(target.rawContent).toContain('type: Milestone')
  expect(target.rawContent).toContain('Priority: High')
  expect(target.rawContent).toContain('status: Planned')
  expect(target.rawContent).toContain('## Outcome')
}

function expectSchemaSourceNote(updatedSource: MobileNote) {
  expect(updatedSource.rawContent).toContain('has:\n  - "[[Tolaria/Mobile UI/launch-beta]]"')
}

function expectSchemaTargetWrites(
  result: MobileWorkspaceEditResult,
  target: MobileNote,
  updatedSource: MobileNote,
) {
  expect(result.writes).toEqual([
    {
      content: target.rawContent,
      kind: 'createNote',
      path: 'Tolaria/Mobile UI/launch-beta.md',
    },
    {
      content: updatedSource.rawContent,
      kind: 'saveNote',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    },
  ])
}
