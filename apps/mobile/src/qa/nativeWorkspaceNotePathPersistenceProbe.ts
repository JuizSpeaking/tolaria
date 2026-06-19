import { applyMobileWorkspaceEditWithWrites, type MobileWorkspaceWrite } from '../workspace/mobileWorkspaceEditing'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { ReadOnlyWorkspaceRepository, ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'

type WorkspaceProbeEdit = Parameters<typeof applyMobileWorkspaceEditWithWrites>[1]
type WorkspaceProbeWrites = ReturnType<typeof applyMobileWorkspaceEditWithWrites>['writes']

const bulkArchivedNotePath = 'Bulk/Archive Me.md'
const bulkOrganizedNotePath = 'Bulk/Organize Me.md'
const renamedNoteFileInboundPath = 'Renames/Inbound.md'
const renamedNoteFileOriginalPath = 'Renames/Original.md'
const renamedNoteFilePath = 'Renames/manual-proof.md'
const titleRenameInboundPath = 'Titles/Inbound.md'
const titleRenameOriginalPath = 'Titles/Original Title.md'
const titleRenamePath = 'Titles/native-title-rename.md'

export type NativeWorkspaceNotePathPersistenceContent = {
  bulkArchivedContent: string | null
  bulkOrganizedContent: string | null
  renamedNoteFileContent: string | null
  renamedNoteFileInboundContent: string | null
  titleRenameContent: string | null
  titleRenameInboundContent: string | null
}

export const nativeWorkspaceNotePathSeedWrites = [
  {
    content: [
      '---',
      'type: Essay',
      'status: Draft',
      '---',
      '# Organize Me',
      '',
      'Bulk organize seed.',
      '',
    ].join('\n'),
    kind: 'createNote',
    path: bulkOrganizedNotePath,
  },
  {
    content: [
      '---',
      'type: Essay',
      'status: Draft',
      '---',
      '# Archive Me',
      '',
      'Bulk archive seed.',
      '',
    ].join('\n'),
    kind: 'createNote',
    path: bulkArchivedNotePath,
  },
  {
    content: [
      '# Rename Original',
      '',
      'Manual filename rename seed.',
      '',
    ].join('\n'),
    kind: 'createNote',
    path: renamedNoteFileOriginalPath,
  },
  {
    content: [
      '---',
      'related_to:',
      '  - "[[Renames/Original]]"',
      '---',
      '# Rename Inbound',
      '',
      'Body link [[Renames/Original]].',
      '',
    ].join('\n'),
    kind: 'createNote',
    path: renamedNoteFileInboundPath,
  },
  {
    content: [
      '---',
      'title: Original Title',
      'type: Essay',
      '---',
      'Body without an H1.',
      '',
    ].join('\n'),
    kind: 'createNote',
    path: titleRenameOriginalPath,
  },
  {
    content: [
      '# Title Rename Inbound',
      '',
      'Body link [[Titles/Original Title]].',
      '',
    ].join('\n'),
    kind: 'createNote',
    path: titleRenameInboundPath,
  },
] satisfies MobileWorkspaceWrite[]

export function nativeWorkspaceNotePathWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return workspacePersistenceEditWrites(seedSnapshot, [
    {
      edits: [
        { noteId: bulkOrganizedNotePath, organized: true, type: 'setOrganized' },
        { archived: true, noteId: bulkArchivedNotePath, type: 'setArchived' },
      ],
      type: 'bulkEdit',
    },
    {
      filenameStem: 'manual-proof',
      noteId: renamedNoteFileOriginalPath,
      type: 'renameNoteFile',
    },
    {
      key: 'title',
      noteId: titleRenameOriginalPath,
      type: 'updateProperty',
      value: 'Native Title Rename',
    },
  ])
}

export async function readNativeWorkspaceNotePathContent(
  repository: ReadOnlyWorkspaceRepository,
  snapshot: MobileWorkspaceSnapshot,
  request: ReadOnlyWorkspaceRequest,
): Promise<NativeWorkspaceNotePathPersistenceContent> {
  return {
    bulkArchivedContent: await readProbeNoteContent(repository, snapshot, bulkArchivedNotePath, request),
    bulkOrganizedContent: await readProbeNoteContent(repository, snapshot, bulkOrganizedNotePath, request),
    renamedNoteFileContent: await readProbeNoteContent(repository, snapshot, renamedNoteFilePath, request),
    renamedNoteFileInboundContent: await readProbeNoteContent(repository, snapshot, renamedNoteFileInboundPath, request),
    titleRenameContent: await readProbeNoteContent(repository, snapshot, titleRenamePath, request),
    titleRenameInboundContent: await readProbeNoteContent(repository, snapshot, titleRenameInboundPath, request),
  }
}

export function nativeWorkspaceNotePathProof(
  snapshot: MobileWorkspaceSnapshot,
  content: NativeWorkspaceNotePathPersistenceContent,
) {
  return {
    bulkEditHydrated: bulkEditHydrated(snapshot, content),
    renamedNoteFileHydrated: renamedNoteFileHydrated(snapshot, content),
    titlePropertyRenameHydrated: titlePropertyRenameHydrated(snapshot, content),
  }
}

function bulkEditHydrated(
  snapshot: MobileWorkspaceSnapshot,
  content: NativeWorkspaceNotePathPersistenceContent,
) {
  const organized = noteByPath(snapshot, bulkOrganizedNotePath)
  const archived = noteByPath(snapshot, bulkArchivedNotePath)

  return organized?.organized === true
    && archived?.archived === true
    && textContainsAll(content.bulkOrganizedContent, ['_organized: true'])
    && textContainsAll(content.bulkArchivedContent, ['_archived: true'])
}

function renamedNoteFileHydrated(
  snapshot: MobileWorkspaceSnapshot,
  content: NativeWorkspaceNotePathPersistenceContent,
) {
  return snapshotContainsNotePath(snapshot, renamedNoteFilePath)
    && !snapshotContainsNotePath(snapshot, renamedNoteFileOriginalPath)
    && textContainsAll(content.renamedNoteFileContent, ['# Rename Original', 'Manual filename rename seed.'])
    && textContainsAll(content.renamedNoteFileInboundContent, ['[[Renames/manual-proof]]'])
    && content.renamedNoteFileInboundContent?.includes('Renames/Original') === false
}

function titlePropertyRenameHydrated(
  snapshot: MobileWorkspaceSnapshot,
  content: NativeWorkspaceNotePathPersistenceContent,
) {
  const titleNote = noteByPath(snapshot, titleRenamePath)

  return titleNote?.title === 'Native Title Rename'
    && !snapshotContainsNotePath(snapshot, titleRenameOriginalPath)
    && textContainsAll(content.titleRenameContent, ['title: Native Title Rename', 'Body without an H1.'])
    && textContainsAll(content.titleRenameInboundContent, ['[[Titles/native-title-rename]]'])
    && content.titleRenameInboundContent?.includes('Titles/Original Title') === false
}

function workspacePersistenceEditWrites(
  seedSnapshot: MobileWorkspaceSnapshot,
  edits: WorkspaceProbeEdit[],
) {
  const writes: WorkspaceProbeWrites = []
  let snapshot = seedSnapshot

  for (const edit of edits) {
    const result = applyMobileWorkspaceEditWithWrites(snapshot, edit)
    snapshot = result.snapshot
    writes.push(...result.writes)
  }

  return writes
}

function readProbeNoteContent(
  repository: ReadOnlyWorkspaceRepository,
  snapshot: MobileWorkspaceSnapshot,
  path: string,
  request: ReadOnlyWorkspaceRequest,
) {
  const note = noteByPath(snapshot, path)
  return note ? repository.readNoteContent(note, request) : null
}

function snapshotContainsNotePath(snapshot: MobileWorkspaceSnapshot, path: string) {
  return noteByPath(snapshot, path) !== null
}

function noteByPath(snapshot: MobileWorkspaceSnapshot, path: string): MobileNote | null {
  return (snapshot.allNotes ?? snapshot.notes).find((note) => note.path === path) ?? null
}

function textContainsAll(content: string | null, fragments: string[]) {
  return content !== null && fragments.every((fragment) => content.includes(fragment))
}
