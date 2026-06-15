import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import {
  applyMobileWorkspaceEdit,
  applyMobileWorkspaceEditWithWrites,
  replaceTrailingWikilinkQuery,
  trailingWikilinkQuery,
} from './mobileWorkspaceEditing'
import type { MobileSidebarFolder, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'

describe('applyMobileWorkspaceEdit', () => {
  it('creates a selected editable note with markdown content', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      title: 'Mobile Editing Contract',
      type: 'createNote',
    })

    expect(snapshot.selectedNoteId).toBe('mobile-editing-contract.md')
    expect(snapshot.notes[0]).toMatchObject({
      id: 'mobile-editing-contract.md',
      rawContent: '# Mobile Editing Contract\n\n',
      title: 'Mobile Editing Contract',
      type: 'Note',
    })
  })

  it('updates note content and re-derives title, snippet, links, and editor blocks', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      content: '# Revised Mobile Essay\n\nA body with [[open-source-project]].\n\n## Details\n\n- One\n',
      noteId: 'workflow-orchestration',
      type: 'updateNoteContent',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note).toMatchObject({
      favorite: true,
      links: 1,
      snippet: 'A body with open-source-project.',
      status: 'Draft',
      title: 'Revised Mobile Essay',
      type: 'Essay',
    })
    expect(note?.editorBlocks?.some((block) => block.kind === 'heading')).toBe(true)
    expect(note?.editorBlocks?.[0]).toMatchObject({
      content: expect.arrayContaining([
        { text: 'open-source-project', wikilinkTarget: 'open-source-project' },
      ]),
      kind: 'paragraph',
    })
  })

  it('removes existing fixture relationships without dropping the other relationship groups', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'related_to',
      noteId: 'workflow-orchestration',
      ref: '[[Release Notes]]',
      type: 'removeRelationship',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    const relatedToRefs = note?.relationships.find((candidate) => candidate.key === 'related_to')?.values.map((value) => value.ref)
    const belongsToRefs = note?.relationships.find((candidate) => candidate.key === 'belongs_to')?.values.map((value) => value.ref)

    expect(relatedToRefs ?? []).not.toContain('[[Release Notes]]')
    expect(belongsToRefs).toEqual(['[[LLM Workflow]]', '[[Tolaria MVP]]'])
  })

  it('writes scalar properties into frontmatter and exposes them as properties', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'priority',
      noteId: 'workflow-orchestration',
      type: 'updateProperty',
      value: 'High',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note?.rawContent).toContain('priority: High')
    expect(note?.properties).toContainEqual({ key: 'priority', label: 'Priority', value: 'High' })
  })

  it('writes tag lists as frontmatter arrays and re-derives note tags', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'tags',
      noteId: 'release-2026-05-02',
      type: 'updateProperty',
      value: ['Tolaria MVP', 'Design'],
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'release-2026-05-02')
    expect(note?.rawContent).toContain('tags:\n  - Tolaria MVP\n  - Design')
    expect(note?.tags).toEqual(['Tolaria MVP', 'Design'])
  })

  it('adds and removes typed relationships using exact wikilink refs', () => {
    const withRelationship = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'belongs_to',
      noteId: 'workflow-orchestration',
      targetTitle: 'How I Run an Open Source Project',
      type: 'addRelationship',
    })

    const note = withRelationship.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    const relationship = note?.relationships.find((candidate) => candidate.key === 'belongs_to')
    const ref = relationship?.values.find((value) => value.title === 'How I Run an Open Source Project')?.ref

    expect(ref).toBe('[[Tolaria/Mobile UI/How I Run an Open Source Project]]')
    expect(relationship?.values.at(-1)).toMatchObject({
      title: 'How I Run an Open Source Project',
      type: 'Procedure',
      typeTone: 'purple',
    })

    const withoutRelationship = applyMobileWorkspaceEdit(withRelationship, {
      key: 'belongs_to',
      noteId: 'workflow-orchestration',
      ref: ref ?? '',
      type: 'removeRelationship',
    })

    const updatedNote = withoutRelationship.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    const refs = updatedNote?.relationships.find((candidate) => candidate.key === 'belongs_to')?.values.map((value) => value.ref)
    expect(refs ?? []).not.toContain(ref)
  })

  it('changes note type through the desktop type frontmatter key', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nChange my type.\n',
    }
    const result = applyMobileWorkspaceEditWithWrites({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      noteId: 'workflow-orchestration',
      type: 'changeNoteType',
      value: 'Procedure',
    })
    const note = result.snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')

    expect(note).toMatchObject({
      type: 'Procedure',
    })
    expect(note?.rawContent).toContain('type: Procedure')
    expect(result.writes).toEqual([{
      content: expect.stringContaining('type: Procedure'),
      kind: 'saveNote',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    }])
    expect(sidebarItems(result.snapshot, 'types')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ count: '2', id: 'procedures', label: 'Procedures' }),
        expect.objectContaining({ count: '1', label: 'Releases' }),
      ]),
    )
    expect(sidebarItems(result.snapshot, 'types')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'essays' })]),
    )
  })

  it('moves notes to another folder by changing the relative path and planning delete plus save writes', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nMove me.\n',
    }
    const result = applyMobileWorkspaceEditWithWrites({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      folderPath: 'Writing/Essays',
      noteId: 'workflow-orchestration',
      type: 'moveNoteToFolder',
    })
    const note = result.snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')

    expect(note?.path).toBe('Writing/Essays/Workflow Orchestration Essay.md')
    expect(result.snapshot.selectedNoteId).toBe('workflow-orchestration')
    expect(result.writes).toEqual([
      { kind: 'deleteNote', path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md' },
      {
        content: expect.stringContaining('# Workflow Orchestration Essay'),
        kind: 'saveNote',
        path: 'Writing/Essays/Workflow Orchestration Essay.md',
      },
    ])
    expect(sidebarFolders(result.snapshot)).toContainEqual(
      expect.objectContaining({ id: 'Writing/Essays', name: 'Essays' }),
    )
  })

  it('retargets path-backed note ids when a local-vault note moves folders', () => {
    const base = workspaceScenarioForId('default')
    const pathBackedNote = {
      ...base.notes[0],
      id: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...base,
      notes: [pathBackedNote, ...base.notes.slice(1)],
      selectedNoteId: pathBackedNote.id,
    }, {
      folderPath: '/Writing/Essays/',
      noteId: pathBackedNote.id,
      type: 'moveNoteToFolder',
    })

    expect(result.snapshot.selectedNoteId).toBe('Writing/Essays/Workflow Orchestration Essay.md')
    expect(result.snapshot.notes[0]).toMatchObject({
      id: 'Writing/Essays/Workflow Orchestration Essay.md',
      path: 'Writing/Essays/Workflow Orchestration Essay.md',
    })
  })

  it('rebuilds primary and favorites sidebar sections after note state edits', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nArchive me.\n',
    }
    const archived = applyMobileWorkspaceEdit({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      archived: true,
      noteId: editableNote.id,
      type: 'setArchived',
    })

    expect(sidebarItems(archived, 'primary')).toEqual([
      expect.objectContaining({ count: '2', id: 'inbox' }),
      expect.objectContaining({ count: '2', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(sidebarItems(archived, 'favorites')).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Workflow Orchestration Essay' })]),
    )

    const favorited = applyMobileWorkspaceEdit(base, {
      noteId: 'open-source-project',
      type: 'toggleFavorite',
    })

    expect(sidebarItems(favorited, 'favorites')).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'How I Run an Open Source Project' })]),
    )
  })

  it('normalizes built-in relationship labels to desktop frontmatter keys', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'Related to',
      noteId: 'workflow-orchestration',
      targetTitle: 'How I Run an Open Source Project',
      type: 'addRelationship',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note?.rawContent).toContain('related_to:')
    expect(note?.rawContent).not.toContain('Related to:')
    expect(note?.relationships.find((candidate) => candidate.key === 'related_to')?.values).toContainEqual(
      expect.objectContaining({ title: 'How I Run an Open Source Project' }),
    )
  })

  it('archives notes through frontmatter and exposes the derived archive state', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nArchive me.\n',
    }
    const result = applyMobileWorkspaceEditWithWrites({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      archived: true,
      noteId: editableNote.id,
      type: 'setArchived',
    })
    const archivedNote = result.snapshot.notes.find((note) => note.id === editableNote.id)

    expect(archivedNote).toMatchObject({ archived: true })
    expect(archivedNote?.rawContent).toContain('_archived: true')
    expect(result.writes).toEqual([{
      content: expect.stringContaining('_archived: true'),
      kind: 'saveNote',
      path: archivedNote?.path,
    }])
  })

  it('marks notes organized through frontmatter and updates inbox counts', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nOrganize me.\n',
    }
    const result = applyMobileWorkspaceEditWithWrites({ ...base, notes: [editableNote, ...base.notes.slice(1)] }, {
      noteId: editableNote.id,
      organized: true,
      type: 'setOrganized',
    })
    const organizedNote = result.snapshot.notes.find((note) => note.id === editableNote.id)

    expect(organizedNote).toMatchObject({ organized: true })
    expect(organizedNote?.rawContent).toContain('_organized: true')
    expect(sidebarItems(result.snapshot, 'primary')).toEqual([
      expect.objectContaining({ count: '2', id: 'inbox' }),
      expect.objectContaining({ count: '3', id: 'all-notes' }),
      expect.objectContaining({ count: '0', id: 'archive' }),
    ])
    expect(result.writes).toEqual([{
      content: expect.stringContaining('_organized: true'),
      kind: 'saveNote',
      path: organizedNote?.path,
    }])
  })

  it('deletes notes from the visible and complete note pools with a delete write', () => {
    const base = workspaceScenarioForId('default')
    const result = applyMobileWorkspaceEditWithWrites({ ...base, allNotes: base.notes }, {
      noteId: 'workflow-orchestration',
      type: 'deleteNote',
    })

    expect(result.snapshot.notes.some((candidate) => candidate.id === 'workflow-orchestration')).toBe(false)
    expect(result.snapshot.allNotes?.some((candidate) => candidate.id === 'workflow-orchestration')).toBe(false)
    expect(result.snapshot.selectedNoteId).not.toBe('workflow-orchestration')
    expect(result.writes).toEqual([{
      kind: 'deleteNote',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    }])
  })

  it('hydrates metadata-only notes without creating a persistence write', () => {
    const base = workspaceScenarioForId('default')
    const metadataOnlyNote = {
      ...base.notes[1],
      editorBlocks: undefined,
      editorBullets: undefined,
      rawContent: undefined,
      snippet: 'Old metadata snippet',
    }
    const snapshot: MobileWorkspaceSnapshot = {
      ...base,
      allNotes: [base.notes[0], metadataOnlyNote],
      notes: [base.notes[0]],
      selectedNoteId: metadataOnlyNote.id,
    }

    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      noteId: metadataOnlyNote.id,
      rawContent: '# Hydrated Procedure\n\nFresh body with [[Workflow Orchestration Essay]].\n',
      type: 'hydrateNoteContent',
    })
    const hydrated = result.snapshot.allNotes?.find((note) => note.id === metadataOnlyNote.id)

    expect(result.writes).toEqual([])
    expect(hydrated).toMatchObject({
      rawContent: '# Hydrated Procedure\n\nFresh body with [[Workflow Orchestration Essay]].\n',
      snippet: 'Fresh body with Workflow Orchestration Essay.',
      title: 'Hydrated Procedure',
    })
    expect(hydrated?.editorBlocks?.[0]).toMatchObject({ kind: 'paragraph' })
  })

  it('does not inflate untouched metadata-only notes into fallback markdown after edits', () => {
    const base = workspaceScenarioForId('default')
    const editableNote = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nOriginal body.\n',
    }
    const metadataOnlyNote = {
      ...base.notes[1],
      rawContent: undefined,
    }
    const snapshot: MobileWorkspaceSnapshot = {
      ...base,
      allNotes: [editableNote, metadataOnlyNote],
      notes: [editableNote],
      selectedNoteId: editableNote.id,
    }

    const result = applyMobileWorkspaceEditWithWrites(snapshot, {
      content: '# Workflow Orchestration Essay\n\nUpdated body.\n',
      noteId: editableNote.id,
      type: 'updateNoteContent',
    })

    expect(result.snapshot.allNotes?.find((note) => note.id === metadataOnlyNote.id)?.rawContent).toBeUndefined()
    expect(result.writes).toEqual([{
      content: '# Workflow Orchestration Essay\n\nUpdated body.\n',
      kind: 'saveNote',
      path: editableNote.path,
    }])
  })

  it('plans create writes for new notes', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      title: 'Mobile Persistence Contract',
      type: 'createNote',
    })

    expect(result.writes).toEqual([{
      content: '# Mobile Persistence Contract\n\n',
      kind: 'createNote',
      path: 'mobile-persistence-contract.md',
    }])
  })

  it('creates saved-view YAML writes and updates the sidebar view section', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      definition: {
        color: 'purple',
        filters: { all: [{ field: 'type', op: 'equals', value: 'Procedure' }] },
        icon: null,
        name: 'Procedures',
        sort: 'modified:desc',
      },
      type: 'createView',
    })

    expect(result.writes).toEqual([{
      content: expect.stringContaining('name: "Procedures"'),
      kind: 'saveView',
      path: 'views/procedures.yml',
    }])
    expect(result.snapshot.views?.map((view) => view.definition.name)).toContain('Procedures')
    expect(result.snapshot.sidebarSections.find((section) => section.id === 'views')?.items).toContainEqual(
      expect.objectContaining({
        count: '1',
        id: 'view-procedures',
        label: 'Procedures',
        viewId: 'view-procedures',
      }),
    )
  })

  it('updates saved-view YAML without changing the filename', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      definition: {
        color: 'purple',
        filters: { all: [{ field: 'status', op: 'equals', value: 'Active' }] },
        icon: null,
        name: 'Active Workflows',
        sort: 'modified:desc',
      },
      type: 'updateView',
      viewId: 'view-active-procedures',
    })

    expect(result.writes).toEqual([{
      content: expect.stringContaining('name: "Active Workflows"'),
      kind: 'saveView',
      path: 'views/active-procedures.yml',
    }])
    expect(result.writes[0]).toEqual(expect.objectContaining({
      content: expect.stringContaining('value: "Active"'),
      kind: 'saveView',
    }))
    expect(result.snapshot.views?.[0]?.definition.name).toBe('Active Workflows')
    expect(result.snapshot.sidebarSections.find((section) => section.id === 'views')?.items?.[0]).toMatchObject({
      id: 'view-active-procedures',
      label: 'Active Workflows',
    })
  })

  it('deletes saved views and removes the sidebar section when none remain', () => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      type: 'deleteView',
      viewId: 'view-active-procedures',
    })

    expect(result.writes).toEqual([{
      kind: 'deleteView',
      path: 'views/active-procedures.yml',
    }])
    expect(result.snapshot.views).toEqual([])
    expect(result.snapshot.sidebarSections.some((section) => section.id === 'views')).toBe(false)
  })
})

describe('mobile wikilink editing helpers', () => {
  it('detects and replaces the trailing wikilink query', () => {
    const note = workspaceScenarioForId('default').notes[1]
    const content = '# Draft\n\nSee [[open'

    expect(trailingWikilinkQuery(content)).toBe('open')
    expect(replaceTrailingWikilinkQuery(content, 'open', note)).toBe(
      '# Draft\n\nSee [[Tolaria/Mobile UI/How I Run an Open Source Project]]',
    )
  })
})

function sidebarItems(snapshot: MobileWorkspaceSnapshot, sectionId: string) {
  return snapshot.sidebarSections.find((section) => section.id === sectionId)?.items ?? []
}

function sidebarFolders(snapshot: MobileWorkspaceSnapshot) {
  const folders = snapshot.sidebarSections.find((section) => section.id === 'folders')?.folders ?? []
  return flattenSidebarFolders(folders)
}

function flattenSidebarFolders(folders: MobileSidebarFolder[]): MobileSidebarFolder[] {
  return folders.flatMap((folder) => [folder, ...flattenSidebarFolders(folder.children)])
}
