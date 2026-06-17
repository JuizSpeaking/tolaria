import {
  frontmatterFlag,
  frontmatterList,
  frontmatterProperties,
  frontmatterRelationships,
  frontmatterScalar,
  parseLocalVaultDocument,
  serializeLocalVaultFrontmatterScalar,
  type LocalVaultFrontmatter,
  type LocalVaultFrontmatterValue,
} from './localVaultFrontmatter'
import {
  deriveLocalVaultTitle,
  localVaultEditorBlocks,
  localVaultEditorBullets,
  localVaultSnippet,
} from './localVaultMarkdown'
import type {
  MobileCreateNoteDefaults,
  MobileNote,
  MobileProperty,
  MobilePropertyValue,
  MobileRelationship,
  MobileRelationshipKind,
  MobileRelationshipValue,
  MobileSavedView,
  MobileTone,
  MobileTypeDefinitions,
  MobileViewDefinition,
  MobileWorkspaceSnapshot,
} from './mobileWorkspaceModel'
import {
  createMobileSavedViewFilename,
  mobileSavedViewId,
  mobileSavedViewOrderUpdates,
  mobileViewEvaluationModeForFilters,
  mobileSavedViewPath,
  moveMobileSavedView,
  nextMobileSavedViewOrder,
  orderedMobileSavedViews,
  serializeMobileSavedViewDefinition,
  type MobileViewMoveDirection,
} from './mobileSavedViews'
import { buildMobileSidebarSections } from './mobileSidebarSections'
import { isMobileInboxNote } from './mobileNoteFilters'
import { normalizedMobileFolderPath } from './mobileWorkspaceFolders'
import { applyMobileFolderEdit } from './mobileWorkspaceFolderEditing'
import {
  movedMobileNoteFilePath,
  mobileFilenameStemForTitle,
  renamedMobileNoteFilePath,
  uniqueMobileNotePath,
  validateMobileMoveNoteFolderPath,
  validateMobileRenameNoteFilePath,
} from './mobileNotePaths'
import {
  movedNoteWikilinkRewrite,
  noteWithWritePath,
  noteWritePath,
  rewriteMovedNoteWikilinks,
} from './mobileWorkspacePathRewrites'
import { writeMobileFrontmatterValue } from './mobileFrontmatterWrites'
import { normalizeMobileNoteWidth } from './mobileNoteWidth'
import { mobileNoteForWikilinkTarget } from './mobileWikilinks'
import type { MobileTypeDefinitionPatch } from './mobileTypeDefinitions'
import { applyMobileTypeEdit } from './mobileWorkspaceTypeEditing'
import { normalizeRelationshipKey } from './mobileWorkspaceSuggestions'

type EditableNoteInput = MobileNote & { rawContent: string }
type FrontmatterKey = string
type MarkdownContent = string
type NoteId = string
type NoteTitle = string
type FolderPath = string
type FilenameStem = string
type WikilinkRef = string
type WikilinkTarget = string

export type MobileWorkspaceEdit =
  | { content: MarkdownContent; noteId: NoteId; type: 'updateNoteContent' }
  | { defaults?: MobileCreateNoteDefaults; title: NoteTitle; type: 'createNote' }
  | { noteId: NoteId; type: 'deleteNote' }
  | { noteId: NoteId; rawContent: MarkdownContent; type: 'hydrateNoteContent' }
  | { key: FrontmatterKey; noteId: NoteId; value: MobilePropertyValue; type: 'updateProperty' }
  | { key: FrontmatterKey; noteId: NoteId; type: 'deleteProperty' }
  | { key: FrontmatterKey; noteId: NoteId; targetRef?: WikilinkRef; targetTitle: NoteTitle; type: 'addRelationship' }
  | { defaults?: MobileCreateNoteDefaults; key: FrontmatterKey; sourceNoteId: NoteId; targetTitle: NoteTitle; type: 'createRelationshipTarget' }
  | { key: FrontmatterKey; noteId: NoteId; ref: WikilinkRef; type: 'removeRelationship' }
  | { noteId: NoteId; type: 'changeNoteType'; value: NoteTitle }
  | { folderPath: FolderPath; noteId: NoteId; type: 'moveNoteToFolder' }
  | { filenameStem: FilenameStem; noteId: NoteId; type: 'renameNoteFile' }
  | { name: string; parentPath?: FolderPath; type: 'createFolder' }
  | { folderPath: FolderPath; name: string; type: 'renameFolder' }
  | { folderPath: FolderPath; type: 'deleteFolder' }
  | { noteId: NoteId; type: 'toggleFavorite' }
  | { archived: boolean; noteId: NoteId; type: 'setArchived' }
  | { noteId: NoteId; organized: boolean; type: 'setOrganized' }
  | { definition: MobileViewDefinition; type: 'createView' }
  | { definition: MobileViewDefinition; viewId: string; type: 'updateView' }
  | { viewId: string; type: 'deleteView' }
  | { direction: MobileViewMoveDirection; viewId: string; type: 'moveView' }
  | { direction: MobileViewMoveDirection; type: 'moveTypeSection'; typeName: NoteTitle }
  | { type: 'createTypeDefinition'; typeName: NoteTitle }
  | { type: 'deleteTypeDefinition'; typeName: NoteTitle }
  | { patch: MobileTypeDefinitionPatch; type: 'updateTypeDefinition'; typeName: NoteTitle }
type MobileViewEdit = Extract<MobileWorkspaceEdit, { type: 'createView' | 'deleteView' | 'moveView' | 'updateView' }>
type MobileTypeEdit = Extract<MobileWorkspaceEdit, { type: 'createTypeDefinition' | 'deleteTypeDefinition' | 'moveTypeSection' | 'updateTypeDefinition' }>
type MobileFolderEdit = Extract<MobileWorkspaceEdit, { type: 'createFolder' | 'deleteFolder' | 'renameFolder' }>
type MobileSnapshotEdit = Extract<MobileWorkspaceEdit, { type: 'createRelationshipTarget' | 'deleteNote' | 'moveNoteToFolder' | 'renameNoteFile' }>
type MobileNoteEdit = Exclude<MobileWorkspaceEdit, MobileFolderEdit | MobileSnapshotEdit | MobileTypeEdit | MobileViewEdit | { type: 'createNote' }>
type MobileWorkspaceResultHandlerMap = {
  [Type in MobileWorkspaceEdit['type']]?: (
    snapshot: MobileWorkspaceSnapshot,
    edit: Extract<MobileWorkspaceEdit, { type: Type }>,
  ) => MobileWorkspaceEditResult
}

export type MobileWorkspaceWrite =
  | { content: MarkdownContent; kind: 'createNote'; path: string }
  | { kind: 'createFolder'; path: string }
  | { kind: 'deleteFolder'; path: string }
  | { kind: 'deleteNote'; path: string }
  | { kind: 'moveNote'; path: string; toPath: string }
  | { kind: 'renameFolder'; path: string; toPath: string }
  | { content: MarkdownContent; kind: 'saveNote'; path: string }
  | { content: MarkdownContent; kind: 'saveView'; path: string }
  | { kind: 'deleteView'; path: string }

export type MobileWorkspaceEditResult = {
  snapshot: MobileWorkspaceSnapshot
  writes: MobileWorkspaceWrite[]
}

type DerivedNote = {
  note: MobileNote
  rawRelationships: Record<string, WikilinkRef[]>
}

type MobileNoteEditContext = {
  editableNote: EditableNoteInput
  note: MobileNote
  notes: MobileNote[]
  typeDefinitions?: MobileTypeDefinitions
}
type TitlePropertyUpdateEdit = Extract<MobileWorkspaceEdit, { type: 'updateProperty' }> & { value: string }
type RelationshipTargetRefContext = {
  relationshipKey: FrontmatterKey
  sourceNoteId: NoteId
  targetRef: WikilinkRef
  typeDefinitions?: MobileTypeDefinitions
}
type AddRelationshipInput = {
  key: FrontmatterKey
  note: EditableNoteInput
  notes: MobileNote[]
  targetRef?: WikilinkRef
  targetTitle: NoteTitle
}
type MobileNoteEditHandler = (context: MobileNoteEditContext, edit: MobileNoteEdit) => MobileNote

const mobileNoteEditHandlers: Record<MobileNoteEdit['type'], MobileNoteEditHandler> = {
  addRelationship: ({ editableNote, notes }, edit) => {
    if (edit.type !== 'addRelationship') return editableNote
    return addRelationship({
      key: edit.key,
      note: editableNote,
      notes,
      targetRef: edit.targetRef,
      targetTitle: edit.targetTitle,
    })
  },
  changeNoteType: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'changeNoteType') return editableNote
    return changeNoteType(editableNote, edit.value, typeDefinitions)
  },
  deleteProperty: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'deleteProperty') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, edit.key, null), typeDefinitions)
  },
  hydrateNoteContent: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'hydrateNoteContent') return editableNote
    return deriveEditedNote(editableNote, edit.rawContent, typeDefinitions)
  },
  removeRelationship: ({ editableNote }, edit) => {
    if (edit.type !== 'removeRelationship') return editableNote
    return removeRelationship(editableNote, edit.key, edit.ref)
  },
  setArchived: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'setArchived') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_archived', edit.archived), typeDefinitions)
  },
  setOrganized: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'setOrganized') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_organized', edit.organized), typeDefinitions)
  },
  toggleFavorite: ({ editableNote, note, notes, typeDefinitions }, edit) => {
    if (edit.type !== 'toggleFavorite') return editableNote
    return toggleFavorite(editableNote, note, notes, typeDefinitions)
  },
  updateNoteContent: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'updateNoteContent') return editableNote
    return deriveEditedNote(editableNote, edit.content, typeDefinitions)
  },
  updateProperty: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'updateProperty') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, edit.key, edit.value), typeDefinitions)
  },
}

const mobileWorkspaceResultHandlers: MobileWorkspaceResultHandlerMap = {
  createFolder: (snapshot, edit) => applyMobileFolderEdit(snapshot, edit, rebuildSnapshot),
  createNote: (snapshot, edit) => createMobileNoteResult(snapshot, edit.title, edit.defaults),
  createRelationshipTarget: (snapshot, edit) => createRelationshipTarget(snapshot, edit),
  createTypeDefinition: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  deleteFolder: (snapshot, edit) => applyMobileFolderEdit(snapshot, edit, rebuildSnapshot),
  createView: (snapshot, edit) => createMobileView(snapshot, edit.definition),
  deleteNote: (snapshot, edit) => deleteMobileNote(snapshot, edit.noteId),
  deleteTypeDefinition: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  deleteView: (snapshot, edit) => deleteMobileView(snapshot, edit.viewId),
  moveView: (snapshot, edit) => moveMobileView(snapshot, edit.viewId, edit.direction),
  moveTypeSection: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  moveNoteToFolder: (snapshot, edit) => moveNoteToFolder(snapshot, edit),
  renameFolder: (snapshot, edit) => applyMobileFolderEdit(snapshot, edit, rebuildSnapshot),
  renameNoteFile: (snapshot, edit) => renameNoteFile(snapshot, edit),
  updateTypeDefinition: (snapshot, edit) => applyMobileTypeEdit(snapshot, edit, rebuildSnapshot),
  updateProperty: (snapshot, edit) => updateMobileNoteProperty(snapshot, edit),
  updateView: (snapshot, edit) => updateMobileView(snapshot, edit.viewId, edit.definition),
}

const mobileNoteEditTypes = new Set<MobileWorkspaceEdit['type']>([
  'addRelationship',
  'changeNoteType',
  'deleteProperty',
  'hydrateNoteContent',
  'removeRelationship',
  'setArchived',
  'setOrganized',
  'toggleFavorite',
  'updateNoteContent',
  'updateProperty',
])

export function applyMobileWorkspaceEdit(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileWorkspaceEdit,
): MobileWorkspaceSnapshot {
  return applyMobileWorkspaceEditWithWrites(snapshot, edit).snapshot
}

export function applyMobileWorkspaceEditWithWrites(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileWorkspaceEdit,
): MobileWorkspaceEditResult {
  const handledResult = applyMobileWorkspaceResultHandler(snapshot, edit)
  if (handledResult) return handledResult
  if (!isMobileNoteEdit(edit)) return { snapshot, writes: [] }

  return applyMobileNoteEditResult(snapshot, edit)
}

function applyMobileNoteEditResult(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileNoteEdit,
): MobileWorkspaceEditResult {
  const notePool = workspaceNotePool(snapshot)
  const notes = snapshot.notes.map((note) => applyMobileNoteEdit(note, notePool, edit, snapshot.typeDefinitions))
  const allNotes = snapshot.allNotes?.map((note) => applyMobileNoteEdit(note, notePool, edit, snapshot.typeDefinitions))
  const nextSnapshot = rebuildSnapshot({ ...snapshot, allNotes, notes }, notes, allNotes)

  return {
    snapshot: nextSnapshot,
    writes: saveNoteWrites(snapshot, nextSnapshot, edit),
  }
}

function updateMobileNoteProperty(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'updateProperty' }>,
): MobileWorkspaceEditResult {
  const result = applyMobileNoteEditResult(snapshot, edit)
  if (!isTitlePropertyUpdate(edit)) return result

  return renameNoteFileAfterTitlePropertyUpdate(snapshot, result, edit)
}

function renameNoteFileAfterTitlePropertyUpdate(
  previousSnapshot: MobileWorkspaceSnapshot,
  result: MobileWorkspaceEditResult,
  edit: TitlePropertyUpdateEdit,
): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(previousSnapshot, edit.noteId)
  const nextNote = workspaceNoteById(result.snapshot, edit.noteId)
  if (!previousNote || !nextNote?.rawContent) return result

  const filenameStem = mobileFilenameStemForTitle(edit.value)
  const validation = validateMobileRenameNoteFilePath({
    filenameStem,
    note: nextNote,
    notes: workspaceNotePool(previousSnapshot),
  })
  if (validation !== 'ok') return result

  const movedNoteResult = moveNoteToPath(
    result.snapshot,
    previousNote,
    renamedNoteFile(nextNote, filenameStem),
  )

  return {
    snapshot: movedNoteResult.snapshot,
    writes: [...result.writes, ...movedNoteResult.writes],
  }
}

function isTitlePropertyUpdate(
  edit: Extract<MobileWorkspaceEdit, { type: 'updateProperty' }>,
): edit is TitlePropertyUpdateEdit {
  return normalizedFrontmatterKey(edit.key) === 'title'
    && typeof edit.value === 'string'
    && edit.value.trim().length > 0
}

function isMobileNoteEdit(edit: MobileWorkspaceEdit): edit is MobileNoteEdit {
  return mobileNoteEditTypes.has(edit.type)
}

function applyMobileWorkspaceResultHandler(
  snapshot: MobileWorkspaceSnapshot,
  edit: MobileWorkspaceEdit,
): MobileWorkspaceEditResult | null {
  const handler = mobileWorkspaceResultHandlers[edit.type] as
    | ((snapshot: MobileWorkspaceSnapshot, edit: MobileWorkspaceEdit) => MobileWorkspaceEditResult)
    | undefined
  return handler?.(snapshot, edit) ?? null
}

export function mobileWikilinkSuggestions(notes: MobileNote[], query: string): MobileNote[] {
  const normalizedQuery = query.trim().toLowerCase()
  const activeNotes = notes.filter((note) => !note.archived)

  if (!normalizedQuery) {
    return activeNotes.slice(0, 8)
  }

  return activeNotes
    .filter((note) => wikilinkSearchText(note).includes(normalizedQuery))
    .slice(0, 8)
}

export function replaceTrailingWikilinkQuery(
  content: MarkdownContent,
  query: string,
  selectedNote: MobileNote,
): MarkdownContent {
  const target = wikilinkTargetForNote(selectedNote)
  const replacement = `[[${target}]]`
  const pattern = new RegExp(`\\[\\[${escapeRegExp(query)}$`)
  if (pattern.test(content)) return content.replace(pattern, replacement)
  return `${content}${replacement}`
}

export function trailingWikilinkQuery(content: MarkdownContent): string | null {
  const match = content.match(/\[\[([^\]\n]*)$/)
  return match ? match[1] : null
}

function createMobileNote(
  snapshot: MobileWorkspaceSnapshot,
  title: NoteTitle,
  defaults: MobileCreateNoteDefaults = {},
): MobileWorkspaceSnapshot {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return snapshot

  const notePool = workspaceNotePool(snapshot)
  const basePath = createNotePath(trimmedTitle, defaults.folderPath)
  const id = uniqueMobileNotePath(notePool, basePath)
  if (id !== basePath) return snapshot

  const now = Date.now()
  const type = cleanTypeName(defaults.type ?? 'Note') || 'Note'
  const rawContent = createNoteRawContent(trimmedTitle, type, defaults)
  const note = deriveEditableNote({
    fallback: {
      created: '0m ago',
      date: absoluteDate(now),
      favorite: defaults.favorite === true,
      id,
      links: 0,
      modified: '0m ago',
      path: id,
      rawContent,
      relationships: [],
      status: defaults.status ?? '',
      snippet: '',
      tags: defaults.tags ?? [],
      title: trimmedTitle,
      type,
      typeTone: 'gray',
      workspace: snapshot.source?.label ?? 'Tolaria Vault',
    },
    rawContent,
    typeDefinitions: snapshot.typeDefinitions,
  }).note

  return rebuildSnapshot(
    { ...snapshot, selectedNoteId: id },
    [note, ...snapshot.notes],
    [note, ...notePool],
  )
}

function createMobileNoteResult(
  snapshot: MobileWorkspaceSnapshot,
  title: NoteTitle,
  defaults?: MobileCreateNoteDefaults,
): MobileWorkspaceEditResult {
  const nextSnapshot = createMobileNote(snapshot, title, defaults)
  if (nextSnapshot === snapshot) return { snapshot, writes: [] }
  return { snapshot: nextSnapshot, writes: createNoteWrites(nextSnapshot) }
}

function createNotePath(title: NoteTitle, folderPath: FolderPath | undefined): NoteId {
  const filename = `${slugifyTitle(title)}.md`
  const folder = folderPath ? normalizedMobileFolderPath(folderPath) : ''
  return folder ? `${folder}/${filename}` : filename
}

function createNoteRawContent(
  title: NoteTitle,
  type: NoteTitle,
  defaults: MobileCreateNoteDefaults,
): MarkdownContent {
  return serializeDocument(createNoteFrontmatter(title, type, defaults), createNoteBody(defaults.template))
}

function createNoteBody(template?: MarkdownContent): MarkdownContent {
  return template ? `\n${template}` : ''
}

function createNoteFrontmatter(
  title: NoteTitle,
  type: NoteTitle,
  defaults: MobileCreateNoteDefaults,
): LocalVaultFrontmatter {
  const frontmatter: LocalVaultFrontmatter = {}

  addFrontmatterValue(frontmatter, 'title', title)
  addFrontmatterValue(frontmatter, 'type', type)
  addFrontmatterValue(frontmatter, 'status', defaults.status)
  addFrontmatterValue(frontmatter, 'tags', defaults.tags && defaults.tags.length > 0 ? defaults.tags : undefined)
  addFrontmatterValue(frontmatter, '_favorite', defaults.favorite === true ? true : undefined)
  addFrontmatterValue(frontmatter, '_archived', defaults.archived === true ? true : undefined)
  addFrontmatterValue(frontmatter, '_organized', defaults.organized === true ? true : undefined)
  mergeFrontmatter(frontmatter, defaults.properties ?? {})
  mergeFrontmatter(frontmatter, defaults.relationships ?? {})

  return frontmatter
}

function applyMobileNoteEdit(
  note: MobileNote,
  notes: MobileNote[],
  edit: MobileNoteEdit,
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  if (note.id !== edit.noteId) return note

  const editableNote = withEditableContent(note)
  return mobileNoteEditHandlers[edit.type]({ editableNote, note, notes, typeDefinitions }, edit)
}

function addRelationship({
  key,
  note,
  notes,
  targetRef,
  targetTitle,
}: AddRelationshipInput): MobileNote {
  const trimmedKey = normalizeRelationshipKey(key)
  const trimmedTitle = targetTitle.trim()
  if (!trimmedKey || !trimmedTitle) return note

  const ref = normalizedRelationshipRef(targetRef) ?? relationshipRefForTitle(trimmedTitle, notes)
  return addRelationshipRef(note, trimmedKey, ref)
}

function addRelationshipRef(
  note: EditableNoteInput,
  key: FrontmatterKey,
  ref: WikilinkRef,
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  const document = parseLocalVaultDocument(note.rawContent)
  const currentRefs = frontmatterRelationships(document.frontmatter)[key] ?? []
  const nextRefs = currentRefs.includes(ref) ? currentRefs : [...currentRefs, ref]

  return deriveEditableNote({
    fallback: note,
    rawContent: writeFrontmatterValue(note.rawContent, key, nextRefs),
    typeDefinitions,
  }).note
}

function removeRelationship(
  note: EditableNoteInput,
  key: FrontmatterKey,
  ref: WikilinkRef,
): MobileNote {
  const document = parseLocalVaultDocument(note.rawContent)
  const currentRefs = frontmatterRelationships(document.frontmatter)[key] ?? []
  const nextRefs = currentRefs.filter((candidate) => candidate !== ref)

  return deriveEditableNote({
    fallback: note,
    rawContent: writeFrontmatterValue(note.rawContent, key, nextRefs.length > 0 ? nextRefs : null),
  }).note
}

function changeNoteType(
  note: EditableNoteInput,
  value: NoteTitle,
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  const nextType = value.trim()
  if (!nextType || nextType === note.type) return note

  return deriveEditedNote(note, writeFrontmatterValue(note.rawContent, 'type', nextType), typeDefinitions)
}

function toggleFavorite(
  note: EditableNoteInput,
  currentNote: MobileNote,
  notes: MobileNote[],
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  if (currentNote.favorite) {
    const withoutFavorite = writeFrontmatterValue(note.rawContent, '_favorite', null)
    return deriveEditedNote(note, writeFrontmatterValue(withoutFavorite, '_favorite_index', null), typeDefinitions)
  }

  const withFavorite = writeFrontmatterValue(note.rawContent, '_favorite', true)
  return deriveEditedNote(note, writeFrontmatterValue(withFavorite, '_favorite_index', nextFavoriteIndex(notes)), typeDefinitions)
}

function nextFavoriteIndex(notes: MobileNote[]): number {
  return notes
    .filter((candidate) => candidate.favorite)
    .reduce((max, candidate) => Math.max(max, candidate.favoriteIndex ?? 0), 0) + 1
}

function deleteMobileNote(snapshot: MobileWorkspaceSnapshot, noteId: NoteId): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(snapshot, noteId)
  if (!previousNote) return { snapshot, writes: [] }

  const notes = snapshot.notes.filter((note) => note.id !== previousNote.id)
  const allNotes = snapshot.allNotes?.filter((note) => note.id !== previousNote.id)
  const nextSnapshot = rebuildSnapshot({ ...snapshot, allNotes }, notes, allNotes)

  return {
    snapshot: nextSnapshot,
    writes: [{ kind: 'deleteNote', path: noteWritePath(previousNote) }],
  }
}

function moveNoteToFolder(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'moveNoteToFolder' }>,
): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(snapshot, edit.noteId)
  if (!previousNote) return { snapshot, writes: [] }
  if (validateMobileMoveNoteFolderPath({
    folderPath: edit.folderPath,
    folderPaths: snapshot.folderPaths,
    note: previousNote,
    notes: workspaceNotePool(snapshot),
  }) !== 'ok') return { snapshot, writes: [] }

  return moveNoteToPath(snapshot, previousNote, movedNote(previousNote, edit.folderPath))
}

function renameNoteFile(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'renameNoteFile' }>,
): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(snapshot, edit.noteId)
  if (!previousNote) return { snapshot, writes: [] }
  if (validateMobileRenameNoteFilePath({
    filenameStem: edit.filenameStem,
    note: previousNote,
    notes: workspaceNotePool(snapshot),
  }) !== 'ok') return { snapshot, writes: [] }

  return moveNoteToPath(snapshot, previousNote, renamedNoteFile(previousNote, edit.filenameStem))
}

function moveNoteToPath(
  snapshot: MobileWorkspaceSnapshot,
  previousNote: MobileNote,
  nextNote: MobileNote,
): MobileWorkspaceEditResult {
  const previousPool = workspaceNotePool(snapshot)
  const nextPath = noteWritePath(nextNote)
  if (noteWritePath(previousNote) === nextPath) return { snapshot, writes: [] }

  const nextPool = moveWorkspaceNotes(previousPool, previousNote, nextNote)
  const nextNotes = moveWorkspaceNotes(snapshot.notes, previousNote, nextNote)
  const nextAllNotes = snapshot.allNotes ? nextPool : undefined
  const nextSelectedNoteId = snapshot.selectedNoteId === previousNote.id ? nextNote.id : snapshot.selectedNoteId
  const nextSnapshot = rebuildSnapshot(
    { ...snapshot, allNotes: nextAllNotes, selectedNoteId: nextSelectedNoteId },
    nextNotes,
    nextAllNotes,
  )

  return {
    snapshot: nextSnapshot,
    writes: moveNoteWrites(previousNote, nextNote, previousPool, nextPool),
  }
}

function moveWorkspaceNotes(
  notes: MobileNote[],
  previousNote: MobileNote,
  nextNote: MobileNote,
): MobileNote[] {
  const rewrite = movedNoteWikilinkRewrite(previousNote, nextNote)
  return notes.map((note) => {
    if (note.id === previousNote.id) return nextNote
    return rewriteMovedNoteWikilinks(note, rewrite)
  })
}

function movedNote(note: MobileNote, folderPath: FolderPath): MobileNote {
  const nextPath = movedMobileNoteFilePath(note, folderPath) ?? noteWritePath(note)
  return noteWithWritePath(note, nextPath)
}

function renamedNoteFile(note: MobileNote, filenameStem: FilenameStem): MobileNote {
  const nextPath = renamedMobileNoteFilePath(note, filenameStem) ?? noteWritePath(note)
  return noteWithWritePath(note, nextPath)
}

function moveNoteWrites(
  previousNote: MobileNote,
  nextNote: MobileNote,
  previousPool: MobileNote[],
  nextPool: MobileNote[],
): MobileWorkspaceWrite[] {
  const previousPath = noteWritePath(previousNote)
  const nextPath = noteWritePath(nextNote)
  if (previousPath === nextPath) return []

  return [
    { kind: 'moveNote', path: previousPath, toPath: nextPath },
    ...movedWikilinkWrites(previousPool, nextPool, nextPath),
  ]
}

function movedWikilinkWrites(
  previousPool: MobileNote[],
  nextPool: MobileNote[],
  movedPath: string,
): MobileWorkspaceWrite[] {
  const previousRawContent = new Map(previousPool.map((note) => [noteWritePath(note), note.rawContent]))
  return nextPool.flatMap((note) => {
    const path = noteWritePath(note)
    if (path === movedPath || note.rawContent === undefined) return []
    if (previousRawContent.get(path) === note.rawContent) return []
    return [{ content: note.rawContent, kind: 'saveNote', path }]
  })
}

function rebuildSnapshot(
  snapshot: MobileWorkspaceSnapshot,
  notes: MobileNote[],
  allNotes = notes,
): MobileWorkspaceSnapshot {
  const derivedById = new Map(
    allNotes
      .map((note) => [note.id, deriveMobileNote(note, snapshot.typeDefinitions)] as const)
      .filter((entry): entry is readonly [NoteId, DerivedNote] => entry[1] !== null),
  )
  const relationshipTargets = allNotes.map((note) => derivedById.get(note.id)?.note ?? note)
  const resolvedAllNotes = allNotes.map((note) => {
    const derived = derivedById.get(note.id)
    if (!derived) return note

    return {
      ...derived.note,
      relationships: mobileRelationships(derived.rawRelationships, relationshipTargets),
    }
  })
  const resolvedNoteById = new Map(resolvedAllNotes.map((note) => [note.id, note]))
  const resolvedNotes = notes.map((note) => resolvedNoteById.get(note.id) ?? note)
  const selectedNote = resolvedNotes.find((note) => note.id === snapshot.selectedNoteId) ?? resolvedNotes[0] ?? null

  return {
    ...snapshot,
    allNotes: snapshot.allNotes ? resolvedAllNotes : undefined,
    editorBlocks: selectedNote?.editorBlocks ?? [],
    editorBullets: selectedNote?.editorBullets ?? [],
    noteListSubtitle: noteListSubtitle(resolvedNotes),
    notes: resolvedNotes,
    selectedNoteId: selectedNote?.id,
    sidebarSections: buildMobileSidebarSections({
      folderPaths: snapshot.folderPaths,
      notes: resolvedAllNotes,
      previousSections: snapshot.sidebarSections,
      typeDefinitions: snapshot.typeDefinitions,
      views: snapshot.views,
    }),
  }
}

function deriveMobileNote(note: MobileNote, typeDefinitions?: MobileTypeDefinitions): DerivedNote | null {
  if (note.rawContent === undefined) return null

  const editable = withEditableContent(note)
  return deriveEditableNote({ fallback: editable, rawContent: editable.rawContent, typeDefinitions })
}

function deriveEditedNote(
  fallback: EditableNoteInput,
  rawContent: MarkdownContent,
  typeDefinitions?: MobileTypeDefinitions,
): MobileNote {
  return deriveEditableNote({ fallback, rawContent, typeDefinitions }).note
}

function workspaceNotePool(snapshot: MobileWorkspaceSnapshot): MobileNote[] {
  return snapshot.allNotes ?? snapshot.notes
}

function workspaceNoteById(snapshot: MobileWorkspaceSnapshot, noteId: NoteId): MobileNote | null {
  return [
    ...snapshot.notes,
    ...(snapshot.allNotes ?? []),
  ].find((note) => note.id === noteId) ?? null
}

function createNoteWrites(snapshot: MobileWorkspaceSnapshot): MobileWorkspaceWrite[] {
  const note = workspaceNoteById(snapshot, snapshot.selectedNoteId ?? '')
  if (!note?.rawContent) return []

  return [{
    content: note.rawContent,
    kind: 'createNote',
    path: noteWritePath(note),
  }]
}

function createRelationshipTarget(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'createRelationshipTarget' }>,
): MobileWorkspaceEditResult {
  const sourceNote = workspaceNoteById(snapshot, edit.sourceNoteId)
  const targetTitle = edit.targetTitle.trim()
  const relationshipKey = normalizeRelationshipKey(edit.key)
  if (!sourceNote?.rawContent || !targetTitle || !relationshipKey) return { snapshot, writes: [] }

  const targetResult = createMobileNoteResult(
    snapshot,
    targetTitle,
    relationshipTargetDefaults(sourceNote, edit.defaults),
  )
  const targetSnapshot = targetResult.snapshot
  const targetNote = workspaceNoteById(targetSnapshot, targetSnapshot.selectedNoteId ?? '')
  if (!targetNote?.rawContent || targetResult.writes.length === 0) return { snapshot, writes: [] }

  const nextSnapshot = snapshotWithRelationshipTargetRef({
    relationshipKey,
    sourceNoteId: sourceNote.id,
    targetNote,
    targetSnapshot,
  })

  return {
    snapshot: nextSnapshot,
    writes: [
      ...targetResult.writes,
      ...saveNoteWrites(targetSnapshot, nextSnapshot, {
        key: relationshipKey,
        noteId: sourceNote.id,
        targetTitle: targetNote.title,
        type: 'addRelationship',
      }),
    ],
  }
}

function snapshotWithRelationshipTargetRef({
  relationshipKey,
  sourceNoteId,
  targetNote,
  targetSnapshot,
}: {
  relationshipKey: FrontmatterKey
  sourceNoteId: NoteId
  targetNote: MobileNote
  targetSnapshot: MobileWorkspaceSnapshot
}): MobileWorkspaceSnapshot {
  const targetRef = `[[${wikilinkTargetForNote(targetNote)}]]`
  const context = {
    relationshipKey,
    sourceNoteId,
    targetRef,
    typeDefinitions: targetSnapshot.typeDefinitions,
  }
  const notes = addRelationshipRefToNoteList(targetSnapshot.notes, context)
  const allNotes = targetSnapshot.allNotes
    ? addRelationshipRefToNoteList(targetSnapshot.allNotes, context)
    : undefined

  return rebuildSnapshot(targetSnapshot, notes, allNotes)
}

function addRelationshipRefToNoteList(
  notes: MobileNote[],
  context: RelationshipTargetRefContext,
): MobileNote[] {
  return notes.map((note) => {
    if (note.id !== context.sourceNoteId || note.rawContent === undefined) return note
    return addRelationshipRef(
      withEditableContent(note),
      context.relationshipKey,
      context.targetRef,
      context.typeDefinitions,
    )
  })
}

function relationshipTargetDefaults(
  sourceNote: MobileNote,
  defaults: MobileCreateNoteDefaults = {},
): MobileCreateNoteDefaults {
  const folderPath = defaults.folderPath ?? noteFolderPath(sourceNote)
  return {
    ...defaults,
    ...(folderPath ? { folderPath } : {}),
    type: defaults.type ?? 'Note',
  }
}

function noteFolderPath(note: MobileNote): FolderPath | undefined {
  const path = note.path ?? note.id
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  return parts.length > 0 ? parts.join('/') : undefined
}

function createMobileView(
  snapshot: MobileWorkspaceSnapshot,
  definition: MobileViewDefinition,
): MobileWorkspaceEditResult {
  const existingViews = snapshot.views ?? []
  const filename = createMobileSavedViewFilename(definition.name, existingViews.map((view) => view.filename))
  const view: MobileSavedView = {
    definition: {
      ...definition,
      evaluationMode: definition.evaluationMode ?? mobileViewEvaluationModeForFilters(definition.filters),
      order: nextMobileSavedViewOrder(existingViews),
    },
    filename,
    id: mobileSavedViewId(filename),
  }
  const views = mobileSavedViewOrderUpdates([...existingViews, view])
  const nextSnapshot = {
    ...snapshot,
    sidebarSections: buildMobileSidebarSections({
      folderPaths: snapshot.folderPaths,
      notes: workspaceNotePool(snapshot),
      previousSections: snapshot.sidebarSections,
      typeDefinitions: snapshot.typeDefinitions,
      views,
    }),
    views,
  }

  return {
    snapshot: nextSnapshot,
    writes: views.map((savedView) => ({
      content: serializeMobileSavedViewDefinition(savedView.definition),
      kind: 'saveView',
      path: mobileSavedViewPath(savedView.filename),
    })),
  }
}

function updateMobileView(
  snapshot: MobileWorkspaceSnapshot,
  viewId: string,
  definition: MobileViewDefinition,
): MobileWorkspaceEditResult {
  const existingView = findMobileView(snapshot.views, viewId)
  if (!existingView) return { snapshot, writes: [] }

  const view = { ...existingView, definition }
  const views = orderedMobileSavedViews((snapshot.views ?? []).map((candidate) => candidate.id === view.id ? view : candidate))

  return {
    snapshot: snapshotWithViews(snapshot, views),
    writes: [{
      content: serializeMobileSavedViewDefinition(definition),
      kind: 'saveView',
      path: mobileSavedViewPath(existingView.filename),
    }],
  }
}

function deleteMobileView(
  snapshot: MobileWorkspaceSnapshot,
  viewId: string,
): MobileWorkspaceEditResult {
  const existingView = findMobileView(snapshot.views, viewId)
  if (!existingView) return { snapshot, writes: [] }

  const views = orderedMobileSavedViews((snapshot.views ?? []).filter((view) => view.id !== existingView.id))

  return {
    snapshot: snapshotWithViews(snapshot, views),
    writes: [{
      kind: 'deleteView',
      path: mobileSavedViewPath(existingView.filename),
    }],
  }
}

function moveMobileView(
  snapshot: MobileWorkspaceSnapshot,
  viewId: string,
  direction: MobileViewMoveDirection,
): MobileWorkspaceEditResult {
  const views = moveMobileSavedView(snapshot.views ?? [], viewId, direction)
  if (!views) return { snapshot, writes: [] }

  const orderedViews = mobileSavedViewOrderUpdates(views)
  return {
    snapshot: snapshotWithViews(snapshot, orderedViews),
    writes: orderedViews.map((view) => ({
      content: serializeMobileSavedViewDefinition(view.definition),
      kind: 'saveView',
      path: mobileSavedViewPath(view.filename),
    })),
  }
}

function findMobileView(views: MobileSavedView[] | undefined, viewId: string): MobileSavedView | null {
  return views?.find((view) => view.id === viewId || view.filename === viewId) ?? null
}

function snapshotWithViews(
  snapshot: MobileWorkspaceSnapshot,
  views: MobileSavedView[],
): MobileWorkspaceSnapshot {
  return {
    ...snapshot,
    sidebarSections: buildMobileSidebarSections({
      folderPaths: snapshot.folderPaths,
      notes: workspaceNotePool(snapshot),
      previousSections: snapshot.sidebarSections,
      typeDefinitions: snapshot.typeDefinitions,
      views,
    }),
    views,
  }
}

function saveNoteWrites(
  previousSnapshot: MobileWorkspaceSnapshot,
  nextSnapshot: MobileWorkspaceSnapshot,
  edit: MobileNoteEdit,
): MobileWorkspaceWrite[] {
  if (edit.type === 'hydrateNoteContent') return []

  const previousNote = workspaceNoteById(previousSnapshot, edit.noteId)
  const nextNote = workspaceNoteById(nextSnapshot, edit.noteId)
  if (previousNote?.rawContent === undefined || nextNote?.rawContent === undefined) return []
  if (previousNote.rawContent === nextNote.rawContent) return []

  return [{
    content: nextNote.rawContent,
    kind: 'saveNote',
    path: noteWritePath(nextNote),
  }]
}

function deriveEditableNote({
  fallback,
  rawContent,
  typeDefinitions,
}: {
  fallback: EditableNoteInput
  rawContent: MarkdownContent
  typeDefinitions?: MobileTypeDefinitions
}): DerivedNote {
  const document = parseLocalVaultDocument(rawContent)
  const filename = fallback.path?.split('/').at(-1) ?? fallback.id
  const type = cleanTypeName(frontmatterScalar(document.frontmatter, ['type', 'Is A', 'is_a']) ?? fallback.type)
  const blocks = localVaultEditorBlocks(document.body)
  const properties = mobileProperties(frontmatterProperties(document.frontmatter))

  return {
    note: {
      ...fallback,
      aliases: frontmatterList(document.frontmatter, ['aliases', 'Aliases']),
      archived: frontmatterFlag(document.frontmatter, ['_archived', 'archived']),
      editorBlocks: blocks,
      editorBullets: localVaultEditorBullets(blocks),
      favorite: frontmatterFlag(document.frontmatter, ['_favorite', 'favorite']),
      favoriteIndex: frontmatterNumber(document.frontmatter, ['_favorite_index', 'favorite_index', 'favorite index']),
      links: linkCount(document.body),
      modified: '0m ago',
      noteWidth: normalizeMobileNoteWidth(frontmatterScalar(document.frontmatter, ['_width', 'width'])),
      organized: frontmatterFlag(document.frontmatter, ['_organized']),
      path: fallback.path ?? fallback.id,
      properties,
      rawContent,
      status: frontmatterScalar(document.frontmatter, ['Status', 'status']) ?? '',
      snippet: localVaultSnippet(document.body),
      tags: frontmatterList(document.frontmatter, ['tags', 'Tags']).slice(0, 8),
      title: deriveLocalVaultTitle({
        body: document.body,
        fallbackTitle: frontmatterScalar(document.frontmatter, ['title']),
        filename,
      }),
      type,
      typeTone: mobileTypeTone(type, typeDefinitions, fallback.typeTone),
    },
    rawRelationships: frontmatterRelationships(document.frontmatter),
  }
}

function mobileTypeTone(
  type: NoteTitle,
  typeDefinitions: MobileTypeDefinitions | undefined,
  fallback: MobileTone,
): MobileTone {
  return typeDefinitions?.[type]?.tone ?? typeToneFallbacks[type] ?? fallback
}

function withEditableContent(note: MobileNote): EditableNoteInput {
  return {
    ...note,
    rawContent: note.rawContent ?? fallbackMarkdownContent(note),
  }
}

function fallbackMarkdownContent(note: MobileNote): MarkdownContent {
  const snippet = note.snippet.trim()
  const body = snippet ? `# ${note.title}\n\n${snippet}\n` : `# ${note.title}\n\n`
  return serializeDocument(fallbackFrontmatter(note), body)
}

function fallbackFrontmatter(note: MobileNote): LocalVaultFrontmatter {
  const frontmatter = fallbackMetadataFrontmatter(note)
  mergeFrontmatter(frontmatter, fallbackPropertyFrontmatter(note))
  mergeFrontmatter(frontmatter, fallbackRelationshipFrontmatter(note))
  return frontmatter
}

function mergeFrontmatter(target: LocalVaultFrontmatter, source: LocalVaultFrontmatter) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = value
  }
}

function fallbackMetadataFrontmatter(note: MobileNote): LocalVaultFrontmatter {
  const frontmatter: LocalVaultFrontmatter = {}
  addFrontmatterValue(frontmatter, 'type', fallbackTypeValue(note))
  addFrontmatterValue(frontmatter, 'Status', note.status)
  addFrontmatterValue(frontmatter, 'aliases', nonEmptyStringList(note.aliases))
  addFrontmatterValue(frontmatter, 'tags', nonEmptyStringList(note.tags))
  addFrontmatterValue(frontmatter, '_favorite', trueFlagValue(note.favorite))
  addFrontmatterValue(frontmatter, '_favorite_index', favoriteIndexValue(note.favoriteIndex))
  addFrontmatterValue(frontmatter, '_archived', trueFlagValue(note.archived))
  addFrontmatterValue(frontmatter, '_organized', trueFlagValue(note.organized))
  return frontmatter
}

function fallbackTypeValue(note: MobileNote): string | undefined {
  return note.type && note.type !== 'Note' ? note.type : undefined
}

function nonEmptyStringList(values: string[] | undefined): string[] | undefined {
  return values && values.length > 0 ? values : undefined
}

function trueFlagValue(value: boolean | undefined): true | undefined {
  return value ? true : undefined
}

function favoriteIndexValue(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function fallbackPropertyFrontmatter(note: MobileNote): LocalVaultFrontmatter {
  return Object.fromEntries((note.properties ?? []).map((property) => [property.key, property.value]))
}

function fallbackRelationshipFrontmatter(note: MobileNote): LocalVaultFrontmatter {
  const frontmatter: LocalVaultFrontmatter = {}
  for (const relationship of note.relationships) {
    frontmatter[relationshipFrontmatterKey(relationship)] = relationship.values.map(relationshipRefValue)
  }
  return frontmatter
}

function relationshipRefValue(value: MobileRelationshipValue): WikilinkRef {
  return value.ref ?? `[[${value.title}]]`
}

function addFrontmatterValue(
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey,
  value: LocalVaultFrontmatterValue | undefined,
) {
  if (value !== undefined && value !== '') frontmatter[key] = value
}

function writeFrontmatterValue(
  content: MarkdownContent,
  key: FrontmatterKey,
  value: LocalVaultFrontmatterValue | undefined,
): MarkdownContent {
  const document = parseLocalVaultDocument(content)
  const nextFrontmatter = writeMobileFrontmatterValue(document.frontmatter, key, value)
  return serializeDocument(nextFrontmatter, document.body)
}

function serializeDocument(frontmatter: LocalVaultFrontmatter, body: MarkdownContent): MarkdownContent {
  const entries = Object.entries(frontmatter).filter(([, value]) => value !== null && value !== undefined)
  if (entries.length === 0) return body

  const frontmatterText = entries
    .map(([key, value]) => serializeFrontmatterEntry(key, value))
    .join('\n')

  return `---\n${frontmatterText}\n---\n${body}`
}

function serializeFrontmatterEntry(key: FrontmatterKey, value: LocalVaultFrontmatterValue): string {
  if (Array.isArray(value)) {
    return `${key}:\n${value.map((item) => `  - ${serializeScalar(item)}`).join('\n')}`
  }

  return `${key}: ${serializeScalar(value)}`
}

function serializeScalar(value: Exclude<LocalVaultFrontmatterValue, LocalVaultFrontmatterValue[]>): string {
  return serializeLocalVaultFrontmatterScalar(value)
}

function mobileRelationships(
  relationships: Record<FrontmatterKey, WikilinkRef[]>,
  notes: MobileNote[],
): MobileRelationship[] {
  return Object.entries(relationships).map(([key, values]) => ({
    key,
    kind: relationshipKind(key),
    label: relationshipLabel(key),
    values: values.map((value) => relationshipValue(value, notes)),
  }))
}

function relationshipValue(rawValue: WikilinkRef, notes: MobileNote[]): MobileRelationshipValue {
  const target = wikilinkTarget(rawValue)
  const note = resolveRelationshipTarget(notes, target)
  if (!note) return unresolvedRelationshipValue(rawValue, target)

  return {
    id: note.id,
    ref: rawValue,
    title: note.title,
    type: note.type,
    typeTone: note.typeTone,
  }
}

function unresolvedRelationshipValue(rawValue: WikilinkRef, target: WikilinkTarget): MobileRelationshipValue {
  return {
    ref: rawValue,
    title: target,
    type: 'Note',
    typeTone: 'gray',
  }
}

function resolveRelationshipTarget(notes: MobileNote[], target: WikilinkTarget): MobileNote | null {
  return mobileNoteForWikilinkTarget(notes, target)
}

function relationshipRefForTitle(title: NoteTitle, notes: MobileNote[]): WikilinkRef {
  if (/^\[\[[^\]]+\]\]$/.test(title)) return title
  const targetNote = resolveRelationshipTarget(notes, title)
  const target = targetNote ? wikilinkTargetForNote(targetNote) : slugifyTitle(title)
  return `[[${target}]]`
}

function normalizedRelationshipRef(ref: WikilinkRef | undefined): WikilinkRef | null {
  const trimmed = ref?.trim()
  if (!trimmed) return null
  if (/^\[\[[^\]]+\]\]$/.test(trimmed)) return trimmed
  return `[[${trimmed}]]`
}

function wikilinkTargetForNote(note: MobileNote): WikilinkTarget {
  return (note.path ?? note.id).replace(/\.[^.]+$/, '')
}

function wikilinkTarget(value: WikilinkRef): WikilinkTarget {
  const match = value.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/)
  return (match?.[1] ?? value).trim()
}

function relationshipKind(label: FrontmatterKey): MobileRelationshipKind {
  const canonical = label.toLowerCase().replaceAll(' ', '_')
  if (canonical === 'belongs_to') return 'belongsTo'
  if (canonical === 'related_to') return 'relatedTo'
  if (canonical === 'has' || canonical.startsWith('has_')) return 'has'
  return 'custom'
}

function relationshipLabel(label: FrontmatterKey): string | undefined {
  return relationshipKind(label) === 'custom' ? humanizeKey(label) : undefined
}

function relationshipFrontmatterKey(relationship: MobileRelationship): FrontmatterKey {
  if (relationship.key) return relationship.key
  if (relationship.kind === 'belongsTo') return 'belongs_to'
  if (relationship.kind === 'relatedTo') return 'related_to'
  if (relationship.kind === 'has') return 'has'
  return relationship.label ?? 'related_to'
}

function mobileProperties(properties: Record<string, LocalVaultFrontmatterValue>): MobileProperty[] {
  return Object.entries(properties).map(([key, value]) => ({
    key,
    label: humanizeKey(key),
    value: mobilePropertyValue(value),
  }))
}

function mobilePropertyValue(value: LocalVaultFrontmatterValue): MobilePropertyValue {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return ''
}

function cleanTypeName(value: string): string {
  return wikilinkTarget(value).replace(/\.md$/, '')
}

const typeToneFallbacks: Record<string, MobileTone> = {
  Event: 'yellow',
  Experiment: 'red',
  Person: 'yellow',
  Procedure: 'purple',
  Project: 'red',
  Responsibility: 'purple',
  Topic: 'green',
  Type: 'blue',
}

function wikilinkSearchText(note: MobileNote): string {
  return [note.title, note.type, note.path ?? '', ...(note.aliases ?? []), note.tags.join(' ')].join(' ').toLowerCase()
}

function noteListSubtitle(notes: MobileNote[]): string {
  const count = notes.filter(isMobileInboxNote).length
  return `${count.toLocaleString()} open notes`
}

function slugifyTitle(title: NoteTitle): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'
}

function humanizeKey(key: FrontmatterKey): string {
  return key
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizedFrontmatterKey(key: FrontmatterKey): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_')
}

function frontmatterNumber(
  frontmatter: LocalVaultFrontmatter,
  keys: readonly FrontmatterKey[],
): number | null {
  for (const key of keys) {
    const value = frontmatterValueForKey(frontmatter, key)
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }

  return null
}

function frontmatterValueForKey(
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey,
): LocalVaultFrontmatterValue | undefined {
  const exactValue = frontmatter[key]
  if (exactValue !== undefined) return exactValue

  const normalizedKey = normalizedFrontmatterKey(key)
  return Object.entries(frontmatter).find(([candidateKey]) => (
    normalizedFrontmatterKey(candidateKey) === normalizedKey
  ))?.[1]
}

function linkCount(body: MarkdownContent): number {
  return body.match(/\[\[[^\]]+\]\]/g)?.length ?? 0
}

function absoluteDate(timestamp: number): string {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(timestamp))
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
