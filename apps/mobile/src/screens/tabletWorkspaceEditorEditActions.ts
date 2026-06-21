import type { MobileNote, MobileNoteWidth, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import { toggleMobileNoteWidth } from '../workspace/mobileNoteWidth'
import { mobileNoteActionMode } from '../workspace/mobileNoteActionMode'

type DeleteNoteEdit = Extract<MobileWorkspaceEdit, { type: 'deleteNote' }>
type SetArchivedEdit = Extract<MobileWorkspaceEdit, { type: 'setArchived' }>
type SetDefaultNoteWidthEdit = Extract<MobileWorkspaceEdit, { type: 'setDefaultNoteWidth' }>
type SetOrganizedEdit = Extract<MobileWorkspaceEdit, { type: 'setOrganized' }>
type ToggleFavoriteEdit = Extract<MobileWorkspaceEdit, { type: 'toggleFavorite' }>
type UpdateContentEdit = Extract<MobileWorkspaceEdit, { type: 'updateNoteContent' | 'updateTextFileContent' }>
type UpdatePropertyEdit = Extract<MobileWorkspaceEdit, { type: 'updateProperty' }>

export function deleteSelectedNoteEdit(note: MobileNote | null): DeleteNoteEdit | null {
  return note ? { noteId: note.id, type: 'deleteNote' } : null
}

export function setArchivedEdit(note: MobileNote | null, archived: boolean): SetArchivedEdit | null {
  return note ? { archived, noteId: note.id, type: 'setArchived' } : null
}

export function setDefaultNoteWidthEdit(mode: MobileNoteWidth): SetDefaultNoteWidthEdit {
  return { mode, type: 'setDefaultNoteWidth' }
}

export function setOrganizedEdit(note: MobileNote | null, organized: boolean): SetOrganizedEdit | null {
  return note ? { noteId: note.id, organized, type: 'setOrganized' } : null
}

export function toggleFavoriteEdit(note: MobileNote | null): ToggleFavoriteEdit | null {
  return note ? { noteId: note.id, type: 'toggleFavorite' } : null
}

export function toggleNoteWidthEdit(note: MobileNote | null): UpdatePropertyEdit | null {
  if (!note) return null

  return {
    key: '_width',
    noteId: note.id,
    type: 'updateProperty',
    value: toggleMobileNoteWidth(note.noteWidth),
  }
}

export function editorContentUpdateEdit(
  snapshot: MobileWorkspaceSnapshot,
  noteId: string,
  content: string,
): UpdateContentEdit | null {
  const trimmedNoteId = noteId.trim()
  if (!trimmedNoteId) return null

  const note = workspaceNotes(snapshot).find((candidate) => candidate.id === trimmedNoteId)
  if (!note) return null

  return note && mobileNoteActionMode(note) === 'text-file'
    ? { content, noteId: trimmedNoteId, type: 'updateTextFileContent' }
    : { content, noteId: trimmedNoteId, type: 'updateNoteContent' }
}

function workspaceNotes(snapshot: MobileWorkspaceSnapshot): MobileNote[] {
  return snapshot.allNotes ?? snapshot.notes
}
