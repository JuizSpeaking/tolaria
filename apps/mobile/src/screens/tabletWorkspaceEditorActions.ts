import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import { writeMobileClipboardText } from '../workspace/mobileClipboard'
import { buildMobileDeepLinkForNote } from '../workspace/mobileDeepLinks'
import { openMobileNoteFile } from '../workspace/mobileNoteFileOpen'
import { buildMobileFilePathForNote } from '../workspace/mobileNoteFilePath'
import { revealMobileNoteFile } from '../workspace/mobileNoteFileReveal'
import { exportMobileNoteAsPdf } from '../workspace/mobilePdfExport'
import { toggleMobileNoteWidth } from '../workspace/mobileNoteWidth'
import type { MobileWorkspaceEdit } from '../workspace/mobileWorkspaceEditing'
import type { ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
import { tabletWorkspaceBulkNoteActions } from './tabletWorkspaceBulkActions'

type ApplyWorkspaceEdit = (edit: MobileWorkspaceEdit) => void

export function editorWorkspaceActions({
  applyEdit,
  repositoryRequest,
  selectedNote,
  workspaceSnapshot,
}: {
  applyEdit: ApplyWorkspaceEdit
  repositoryRequest?: ReadOnlyWorkspaceRequest
  selectedNote: MobileNote | null
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onCopyDeepLink: () => {
      const result = buildMobileDeepLinkForNote({
        note: selectedNote,
        source: workspaceSnapshot.source,
        vaultRootUri: repositoryRequest?.vaultRootUri,
      })
      copyEditorClipboardText(result.ok ? result.url : null, 'mobile-deep-link', 'deep link')
    },
    onCopyFilePath: () => {
      const result = buildMobileFilePathForNote({
        note: selectedNote,
        vaultRootUri: repositoryRequest?.vaultRootUri,
      })
      copyEditorClipboardText(result.ok ? result.path : null, 'mobile-file-path', 'file path')
    },
    onDeleteNote: () => {
      if (selectedNote) applyEdit({ noteId: selectedNote.id, type: 'deleteNote' })
    },
    onExportNoteAsPdf: () => {
      void exportMobileNoteAsPdf(selectedNote).catch((error) => {
        console.warn('[mobile-pdf-export] Failed to export PDF:', error)
      })
    },
    onOpenFileInDefaultApp: () => {
      void openMobileNoteFile({
        note: selectedNote,
        vaultRootUri: repositoryRequest?.vaultRootUri,
      }).catch((error) => {
        console.warn('[mobile-file-open] Failed to open file:', error)
      })
    },
    onRevealFile: () => {
      void revealMobileNoteFile({
        note: selectedNote,
        vaultRootUri: repositoryRequest?.vaultRootUri,
      }).catch((error) => {
        console.warn('[mobile-file-reveal] Failed to reveal file:', error)
      })
    },
    onSetArchived: (archived: boolean) => {
      if (selectedNote) applyEdit({ archived, noteId: selectedNote.id, type: 'setArchived' })
    },
    onSetOrganized: (organized: boolean) => {
      if (selectedNote) applyEdit({ noteId: selectedNote.id, organized, type: 'setOrganized' })
    },
    onToggleFavorite: () => {
      if (selectedNote) applyEdit({ noteId: selectedNote.id, type: 'toggleFavorite' })
    },
    onToggleNoteWidth: () => {
      if (selectedNote) applyEdit({
        key: '_width',
        noteId: selectedNote.id,
        type: 'updateProperty',
        value: toggleMobileNoteWidth(selectedNote.noteWidth),
      })
    },
    onUpdateNoteContent: (noteId: string, content: string) => {
      applyEdit(editorContentUpdate(workspaceSnapshot, noteId, content))
    },
    ...tabletWorkspaceBulkNoteActions(applyEdit),
  }
}

function copyEditorClipboardText(text: string | null, source: string, label: string) {
  if (!text) return

  void writeMobileClipboardText(text).catch((error) => {
    console.warn(`[${source}] Failed to copy ${label}:`, error)
  })
}

function editorContentUpdate(
  snapshot: MobileWorkspaceSnapshot,
  noteId: string,
  content: string,
): MobileWorkspaceEdit {
  const note = workspaceNotes(snapshot).find((candidate) => candidate.id === noteId)
  return note?.fileKind === 'text'
    ? { content, noteId, type: 'updateTextFileContent' }
    : { content, noteId, type: 'updateNoteContent' }
}

function workspaceNotes(snapshot: MobileWorkspaceSnapshot): MobileNote[] {
  return snapshot.allNotes ?? snapshot.notes
}
