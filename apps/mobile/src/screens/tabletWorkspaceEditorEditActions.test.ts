import { describe, expect, it } from 'vitest'
import { workspaceScenarios } from '../fixtures/workspaceFixtures'
import type { MobileNote } from '../workspace/mobileWorkspaceModel'
import {
  deleteSelectedNoteEdit,
  editorContentUpdateEdit,
  setArchivedEdit,
  setDefaultNoteWidthEdit,
  setOrganizedEdit,
  toggleFavoriteEdit,
  toggleNoteWidthEdit,
} from './tabletWorkspaceEditorEditActions'

describe('tablet workspace editor edit actions', () => {
  it('builds selected-note state edits with desktop frontmatter semantics', () => {
    const note = workspaceScenarios.default.notes[0]!

    expect(deleteSelectedNoteEdit(note)).toEqual({
      noteId: note.id,
      type: 'deleteNote',
    })
    expect(setArchivedEdit(note, true)).toEqual({
      archived: true,
      noteId: note.id,
      type: 'setArchived',
    })
    expect(setOrganizedEdit(note, false)).toEqual({
      noteId: note.id,
      organized: false,
      type: 'setOrganized',
    })
    expect(toggleFavoriteEdit(note)).toEqual({
      noteId: note.id,
      type: 'toggleFavorite',
    })
  })

  it('guards selected-note edits when no note is selected', () => {
    expect(deleteSelectedNoteEdit(null)).toBeNull()
    expect(setArchivedEdit(null, true)).toBeNull()
    expect(setOrganizedEdit(null, true)).toBeNull()
    expect(toggleFavoriteEdit(null)).toBeNull()
    expect(toggleNoteWidthEdit(null)).toBeNull()
  })

  it('builds default and selected note-width edits through desktop properties', () => {
    const note = {
      ...workspaceScenarios.default.notes[0]!,
      noteWidth: 'wide',
    } satisfies MobileNote

    expect(setDefaultNoteWidthEdit('wide')).toEqual({
      mode: 'wide',
      type: 'setDefaultNoteWidth',
    })
    expect(toggleNoteWidthEdit(note)).toEqual({
      key: '_width',
      noteId: note.id,
      type: 'updateProperty',
      value: 'normal',
    })
  })

  it('routes editor content saves to markdown or text-file desktop writes', () => {
    const markdownNote = workspaceScenarios.default.notes[0]!
    const textFile = {
      ...markdownNote,
      fileKind: 'text' as const,
      id: 'docs/config.yml',
      path: 'docs/config.yml',
      title: 'config.yml',
    }
    const snapshot = {
      ...workspaceScenarios.default,
      allNotes: [markdownNote, textFile],
      notes: [markdownNote, textFile],
    }

    expect(editorContentUpdateEdit(snapshot, ` ${markdownNote.id} `, '# Updated\n')).toEqual({
      content: '# Updated\n',
      noteId: markdownNote.id,
      type: 'updateNoteContent',
    })
    expect(editorContentUpdateEdit(snapshot, textFile.id, 'enabled: true\n')).toEqual({
      content: 'enabled: true\n',
      noteId: textFile.id,
      type: 'updateTextFileContent',
    })
    expect(editorContentUpdateEdit(snapshot, 'missing.md', 'fallback\n')).toBeNull()
    expect(editorContentUpdateEdit(snapshot, ' ', 'fallback\n')).toBeNull()
  })
})
