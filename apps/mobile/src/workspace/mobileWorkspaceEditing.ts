import {
  frontmatterFlag,
  frontmatterList,
  frontmatterProperties,
  frontmatterRelationships,
  frontmatterScalar,
  parseLocalVaultDocument,
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
  mobileSavedViewPath,
  moveMobileSavedView,
  nextMobileSavedViewOrder,
  orderedMobileSavedViews,
  serializeMobileSavedViewDefinition,
  type MobileViewMoveDirection,
} from './mobileSavedViews'
import { buildMobileSidebarSections } from './mobileSidebarSections'
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
  | { noteId: NoteId; title: NoteTitle; type: 'renameNoteTitle' }
  | { defaults?: MobileCreateNoteDefaults; title: NoteTitle; type: 'createNote' }
  | { noteId: NoteId; type: 'deleteNote' }
  | { noteId: NoteId; rawContent: MarkdownContent; type: 'hydrateNoteContent' }
  | { key: FrontmatterKey; noteId: NoteId; value: MobilePropertyValue; type: 'updateProperty' }
  | { key: FrontmatterKey; noteId: NoteId; type: 'deleteProperty' }
  | { key: FrontmatterKey; noteId: NoteId; targetTitle: NoteTitle; type: 'addRelationship' }
  | { key: FrontmatterKey; noteId: NoteId; ref: WikilinkRef; type: 'removeRelationship' }
  | { noteId: NoteId; type: 'changeNoteType'; value: NoteTitle }
  | { folderPath: FolderPath; noteId: NoteId; type: 'moveNoteToFolder' }
  | { filenameStem: FilenameStem; noteId: NoteId; type: 'renameNoteFile' }
  | { noteId: NoteId; type: 'toggleFavorite' }
  | { archived: boolean; noteId: NoteId; type: 'setArchived' }
  | { noteId: NoteId; organized: boolean; type: 'setOrganized' }
  | { definition: MobileViewDefinition; type: 'createView' }
  | { definition: MobileViewDefinition; viewId: string; type: 'updateView' }
  | { viewId: string; type: 'deleteView' }
  | { direction: MobileViewMoveDirection; viewId: string; type: 'moveView' }
type MobileViewEdit = Extract<MobileWorkspaceEdit, { type: 'createView' | 'deleteView' | 'moveView' | 'updateView' }>
type MobileSnapshotEdit = Extract<MobileWorkspaceEdit, { type: 'deleteNote' | 'moveNoteToFolder' | 'renameNoteFile' }>
type MobileNoteEdit = Exclude<MobileWorkspaceEdit, MobileSnapshotEdit | MobileViewEdit | { type: 'createNote' }>
type MobileWorkspaceResultHandlerMap = {
  [Type in MobileWorkspaceEdit['type']]?: (
    snapshot: MobileWorkspaceSnapshot,
    edit: Extract<MobileWorkspaceEdit, { type: Type }>,
  ) => MobileWorkspaceEditResult
}

export type MobileWorkspaceWrite =
  | { content: MarkdownContent; kind: 'createNote'; path: string }
  | { kind: 'deleteNote'; path: string }
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
type MobileNoteEditHandler = (context: MobileNoteEditContext, edit: MobileNoteEdit) => MobileNote

const mobileNoteEditHandlers: Record<MobileNoteEdit['type'], MobileNoteEditHandler> = {
  addRelationship: ({ editableNote, notes }, edit) => {
    if (edit.type !== 'addRelationship') return editableNote
    return addRelationship(editableNote, notes, edit.key, edit.targetTitle)
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
  renameNoteTitle: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'renameNoteTitle') return editableNote
    return deriveEditedNote(editableNote, replaceMarkdownTitle(editableNote.rawContent, edit.title), typeDefinitions)
  },
  setArchived: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'setArchived') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_archived', edit.archived), typeDefinitions)
  },
  setOrganized: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'setOrganized') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_organized', edit.organized), typeDefinitions)
  },
  toggleFavorite: ({ editableNote, note, typeDefinitions }, edit) => {
    if (edit.type !== 'toggleFavorite') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_favorite', !note.favorite), typeDefinitions)
  },
  updateNoteContent: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'updateNoteContent') return editableNote
    return deriveEditedNote(editableNote, contentEditWithPreservedFrontmatter(editableNote.rawContent, edit.content), typeDefinitions)
  },
  updateProperty: ({ editableNote, typeDefinitions }, edit) => {
    if (edit.type !== 'updateProperty') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, edit.key, edit.value), typeDefinitions)
  },
}

const mobileWorkspaceResultHandlers: MobileWorkspaceResultHandlerMap = {
  createNote: (snapshot, edit) => {
    const nextSnapshot = createMobileNote(snapshot, edit.title, edit.defaults)
    return { snapshot: nextSnapshot, writes: createNoteWrites(nextSnapshot) }
  },
  createView: (snapshot, edit) => createMobileView(snapshot, edit.definition),
  deleteNote: (snapshot, edit) => deleteMobileNote(snapshot, edit.noteId),
  deleteView: (snapshot, edit) => deleteMobileView(snapshot, edit.viewId),
  moveView: (snapshot, edit) => moveMobileView(snapshot, edit.viewId, edit.direction),
  moveNoteToFolder: (snapshot, edit) => moveNoteToFolder(snapshot, edit),
  renameNoteFile: (snapshot, edit) => renameNoteFile(snapshot, edit),
  updateView: (snapshot, edit) => updateMobileView(snapshot, edit.viewId, edit.definition),
}

const mobileNoteEditTypes = new Set<MobileWorkspaceEdit['type']>([
  'addRelationship',
  'changeNoteType',
  'deleteProperty',
  'hydrateNoteContent',
  'removeRelationship',
  'renameNoteTitle',
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

  const notePool = workspaceNotePool(snapshot)
  const notes = snapshot.notes.map((note) => applyMobileNoteEdit(note, notePool, edit, snapshot.typeDefinitions))
  const allNotes = snapshot.allNotes?.map((note) => applyMobileNoteEdit(note, notePool, edit, snapshot.typeDefinitions))
  const nextSnapshot = rebuildSnapshot({ ...snapshot, allNotes, notes }, notes, allNotes)

  return {
    snapshot: nextSnapshot,
    writes: saveNoteWrites(snapshot, nextSnapshot, edit),
  }
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
  const id = uniqueNoteId(notePool, createNotePath(trimmedTitle, defaults.folderPath))
  const now = Date.now()
  const type = cleanTypeName(defaults.type ?? 'Note') || 'Note'
  const rawContent = createNoteRawContent(trimmedTitle, defaults)
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

function createNotePath(title: NoteTitle, folderPath: FolderPath | undefined): NoteId {
  const filename = `${slugifyTitle(title)}.md`
  const folder = folderPath ? normalizedFolderPath(folderPath) : ''
  return folder ? `${folder}/${filename}` : filename
}

function createNoteRawContent(
  title: NoteTitle,
  defaults: MobileCreateNoteDefaults,
): MarkdownContent {
  return serializeDocument(createNoteFrontmatter(defaults), `# ${title}\n\n`)
}

function createNoteFrontmatter(defaults: MobileCreateNoteDefaults): LocalVaultFrontmatter {
  const frontmatter: LocalVaultFrontmatter = {}
  const type = cleanTypeName(defaults.type ?? '')

  addFrontmatterValue(frontmatter, 'type', type && type !== 'Note' ? type : undefined)
  addFrontmatterValue(frontmatter, 'Status', defaults.status)
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

function addRelationship(
  note: EditableNoteInput,
  notes: MobileNote[],
  key: FrontmatterKey,
  targetTitle: NoteTitle,
): MobileNote {
  const trimmedKey = normalizeRelationshipKey(key)
  const trimmedTitle = targetTitle.trim()
  if (!trimmedKey || !trimmedTitle) return note

  const document = parseLocalVaultDocument(note.rawContent)
  const currentRefs = frontmatterRelationships(document.frontmatter)[trimmedKey] ?? []
  const ref = relationshipRefForTitle(trimmedTitle, notes)
  const nextRefs = currentRefs.includes(ref) ? currentRefs : [...currentRefs, ref]

  return deriveEditableNote({
    fallback: note,
    rawContent: writeFrontmatterValue(note.rawContent, trimmedKey, nextRefs),
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
  const folderPath = normalizedFolderPath(edit.folderPath)
  if (!previousNote || !folderPath) return { snapshot, writes: [] }

  return moveNoteToPath(snapshot, previousNote, movedNote(previousNote, folderPath))
}

function renameNoteFile(
  snapshot: MobileWorkspaceSnapshot,
  edit: Extract<MobileWorkspaceEdit, { type: 'renameNoteFile' }>,
): MobileWorkspaceEditResult {
  const previousNote = workspaceNoteById(snapshot, edit.noteId)
  const stem = normalizedFilenameStem(edit.filenameStem)
  if (!previousNote || !stem) return { snapshot, writes: [] }

  return moveNoteToPath(snapshot, previousNote, renamedNoteFile(previousNote, stem))
}

function moveNoteToPath(
  snapshot: MobileWorkspaceSnapshot,
  previousNote: MobileNote,
  nextNote: MobileNote,
): MobileWorkspaceEditResult {
  const previousPool = workspaceNotePool(snapshot)
  const nextPath = noteWritePath(nextNote)
  if (noteWritePath(previousNote) === nextPath) return { snapshot, writes: [] }
  if (notePathExists(previousPool, previousNote, nextPath)) return { snapshot, writes: [] }

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

function notePathExists(
  notes: MobileNote[],
  previousNote: MobileNote,
  nextPath: string,
): boolean {
  return notes.some((note) => note.id !== previousNote.id && noteWritePath(note) === nextPath)
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
  const previousPath = noteWritePath(note)
  const filename = noteFilename(previousPath)
  const nextPath = `${folderPath}/${filename}`
  return noteWithWritePath(note, nextPath)
}

function renamedNoteFile(note: MobileNote, filenameStem: FilenameStem): MobileNote {
  const previousPath = noteWritePath(note)
  const folderPath = noteFolderPath(previousPath)
  const nextFilename = `${filenameStem}.md`
  const nextPath = folderPath ? `${folderPath}/${nextFilename}` : nextFilename
  return noteWithWritePath(note, nextPath)
}

function noteWithWritePath(note: MobileNote, nextPath: string): MobileNote {
  const previousPath = noteWritePath(note)
  if (nextPath === previousPath) return note

  return {
    ...note,
    id: note.id === previousPath ? nextPath : note.id,
    path: nextPath,
  }
}

function moveNoteWrites(
  previousNote: MobileNote,
  nextNote: MobileNote,
  previousPool: MobileNote[],
  nextPool: MobileNote[],
): MobileWorkspaceWrite[] {
  const previousPath = noteWritePath(previousNote)
  const nextPath = noteWritePath(nextNote)
  if (previousPath === nextPath || nextNote.rawContent === undefined) return []

  return [
    { kind: 'deleteNote', path: previousPath },
    { content: nextNote.rawContent, kind: 'saveNote', path: nextPath },
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

type MovedNoteWikilinkRewrite = {
  newTarget: WikilinkTarget
  oldTargets: Set<WikilinkTarget>
}

function movedNoteWikilinkRewrite(
  previousNote: MobileNote,
  nextNote: MobileNote,
): MovedNoteWikilinkRewrite {
  return {
    newTarget: notePathStem(noteWritePath(nextNote)),
    oldTargets: new Set([
      previousNote.title,
      notePathStem(noteWritePath(previousNote)),
      filenameStem(noteWritePath(previousNote)),
    ].filter(Boolean)),
  }
}

function rewriteMovedNoteWikilinks(
  note: MobileNote,
  rewrite: MovedNoteWikilinkRewrite,
): MobileNote {
  if (note.rawContent === undefined) return note

  const rawContent = replaceMovedWikilinks(note.rawContent, rewrite)
  return rawContent === note.rawContent ? note : { ...note, rawContent }
}

function replaceMovedWikilinks(
  content: MarkdownContent,
  rewrite: MovedNoteWikilinkRewrite,
): MarkdownContent {
  return content.replace(/\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, (match, target: string, alias: string | undefined) => {
    return rewrite.oldTargets.has(target.trim()) ? `[[${rewrite.newTarget}${alias ?? ''}]]` : match
  })
}

function noteFilename(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? path
}

function noteFolderPath(path: string): string {
  return path.split('/').filter(Boolean).slice(0, -1).join('/')
}

function filenameStem(path: string): string {
  return noteFilename(path).replace(/\.md$/u, '')
}

function notePathStem(path: string): string {
  return path.replace(/\.md$/u, '')
}

function normalizedFolderPath(folderPath: FolderPath): FolderPath {
  return folderPath.trim().replace(/^\/+|\/+$/g, '')
}

const windowsReservedDeviceNames = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])
const invalidPortableNameChars = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])

function normalizedFilenameStem(value: FilenameStem): FilenameStem | null {
  const trimmed = value.trim()
  const stem = (trimmed.endsWith('.md') ? trimmed.slice(0, -3) : trimmed).trim()
  return isInvalidPortableNameSegment(stem) ? null : stem
}

function isInvalidPortableNameSegment(value: string): boolean {
  if (!value || value === '.' || value === '..') return true
  if (value.endsWith('.') || value.endsWith(' ')) return true
  if ([...value].some(isInvalidPortableNameChar)) return true

  const deviceName = value.split('.')[0]?.toUpperCase() ?? value.toUpperCase()
  return windowsReservedDeviceNames.has(deviceName)
}

function isInvalidPortableNameChar(char: string): boolean {
  const codePoint = char.codePointAt(0) ?? 0
  return codePoint < 32 || codePoint === 127 || invalidPortableNameChars.has(char)
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

function createMobileView(
  snapshot: MobileWorkspaceSnapshot,
  definition: MobileViewDefinition,
): MobileWorkspaceEditResult {
  const existingViews = snapshot.views ?? []
  const filename = createMobileSavedViewFilename(definition.name, existingViews.map((view) => view.filename))
  const view: MobileSavedView = {
    definition: {
      ...definition,
      order: nextMobileSavedViewOrder(existingViews),
    },
    filename,
    id: mobileSavedViewId(filename),
  }
  const views = mobileSavedViewOrderUpdates([...existingViews, view])
  const nextSnapshot = {
    ...snapshot,
    sidebarSections: buildMobileSidebarSections({
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

function noteWritePath(note: MobileNote): string {
  return note.path ?? note.id
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
      links: linkCount(document.body),
      modified: '0m ago',
      organized: frontmatterFlag(document.frontmatter, ['_organized', 'organized']),
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
  const nextFrontmatter = { ...document.frontmatter }

  if (shouldRemoveFrontmatterValue(value)) {
    Reflect.deleteProperty(nextFrontmatter, key)
  } else {
    nextFrontmatter[key] = value
  }

  return serializeDocument(nextFrontmatter, document.body)
}

function shouldRemoveFrontmatterValue(
  value: LocalVaultFrontmatterValue | undefined,
): value is undefined | null | [] {
  return value === undefined || value === null || isEmptyArray(value)
}

function contentEditWithPreservedFrontmatter(
  previousContent: MarkdownContent,
  nextContent: MarkdownContent,
): MarkdownContent {
  if (hasFrontmatter(nextContent)) return nextContent
  return serializeDocument(parseLocalVaultDocument(previousContent).frontmatter, nextContent)
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
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (value === null) return 'null'
  if (value === '' || /[:#\n\r]/.test(value)) return JSON.stringify(value)
  return value
}

function replaceMarkdownTitle(content: MarkdownContent, title: NoteTitle): MarkdownContent {
  const cleanTitle = title.trim()
  if (!cleanTitle) return content

  const document = parseLocalVaultDocument(content)
  const lines = document.body.split(/\r?\n/)
  const firstContentIndex = lines.findIndex((line) => line.trim())

  if (firstContentIndex >= 0 && lines[firstContentIndex]?.trim().startsWith('# ')) {
    lines[firstContentIndex] = `# ${cleanTitle}`
  } else {
    lines.unshift(`# ${cleanTitle}`, '')
  }

  return serializeDocument(document.frontmatter, lines.join('\n'))
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
  const normalizedTarget = normalizeTarget(target)
  return notes.find((note) => {
    const pathStem = note.path?.replace(/\.[^.]+$/, '') ?? note.id.replace(/\.[^.]+$/, '')
    return normalizeTarget(note.title) === normalizedTarget
      || (note.aliases ?? []).some((alias) => normalizeTarget(alias) === normalizedTarget)
      || normalizeTarget(note.id.replace(/\.[^.]+$/, '')) === normalizedTarget
      || normalizeTarget(pathStem) === normalizedTarget
  }) ?? null
}

function relationshipRefForTitle(title: NoteTitle, notes: MobileNote[]): WikilinkRef {
  if (/^\[\[[^\]]+\]\]$/.test(title)) return title
  const targetNote = notes.find((note) => normalizeTarget(note.title) === normalizeTarget(title))
  const target = targetNote ? wikilinkTargetForNote(targetNote) : slugifyTitle(title)
  return `[[${target}]]`
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
  const active = notes.filter((note) => !note.archived)
  const inbox = active.filter((note) => !note.organized)
  const count = inbox.length > 0 ? inbox.length : active.length
  return `${count.toLocaleString()} open notes`
}

function uniqueNoteId(notes: MobileNote[], baseId: NoteId): NoteId {
  const existing = new Set(notes.flatMap((note) => [note.id, note.path ?? '']).filter(Boolean))
  if (!existing.has(baseId)) return baseId

  const stem = baseId.replace(/\.md$/, '')
  let index = 2
  while (existing.has(`${stem}-${index}.md`)) index += 1
  return `${stem}-${index}.md`
}

function slugifyTitle(title: NoteTitle): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'
}

function normalizeTarget(value: string): string {
  return value.trim().toLowerCase()
}

function humanizeKey(key: FrontmatterKey): string {
  return key
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function isEmptyArray(value: LocalVaultFrontmatterValue | undefined): boolean {
  return Array.isArray(value) && value.length === 0
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

function hasFrontmatter(content: MarkdownContent): boolean {
  return /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(content)
}
