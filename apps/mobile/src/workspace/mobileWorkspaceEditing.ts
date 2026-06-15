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
  MobileNote,
  MobileProperty,
  MobilePropertyValue,
  MobileRelationship,
  MobileRelationshipKind,
  MobileRelationshipValue,
  MobileSavedView,
  MobileViewDefinition,
  MobileWorkspaceSnapshot,
} from './mobileWorkspaceModel'
import {
  createMobileSavedViewFilename,
  mobileSavedViewId,
  mobileSavedViewPath,
  orderedMobileSavedViews,
  serializeMobileSavedViewDefinition,
} from './mobileSavedViews'
import { buildMobileSidebarSections } from './mobileSidebarSections'
import { normalizeRelationshipKey } from './mobileWorkspaceSuggestions'

type EditableNoteInput = MobileNote & { rawContent: string }
type FrontmatterKey = string
type MarkdownContent = string
type NoteId = string
type NoteTitle = string
type FolderPath = string
type WikilinkRef = string
type WikilinkTarget = string

export type MobileWorkspaceEdit =
  | { content: MarkdownContent; noteId: NoteId; type: 'updateNoteContent' }
  | { noteId: NoteId; title: NoteTitle; type: 'renameNoteTitle' }
  | { title: NoteTitle; type: 'createNote' }
  | { noteId: NoteId; type: 'deleteNote' }
  | { noteId: NoteId; rawContent: MarkdownContent; type: 'hydrateNoteContent' }
  | { key: FrontmatterKey; noteId: NoteId; value: MobilePropertyValue; type: 'updateProperty' }
  | { key: FrontmatterKey; noteId: NoteId; type: 'deleteProperty' }
  | { key: FrontmatterKey; noteId: NoteId; targetTitle: NoteTitle; type: 'addRelationship' }
  | { key: FrontmatterKey; noteId: NoteId; ref: WikilinkRef; type: 'removeRelationship' }
  | { noteId: NoteId; type: 'changeNoteType'; value: NoteTitle }
  | { folderPath: FolderPath; noteId: NoteId; type: 'moveNoteToFolder' }
  | { noteId: NoteId; type: 'toggleFavorite' }
  | { archived: boolean; noteId: NoteId; type: 'setArchived' }
  | { noteId: NoteId; organized: boolean; type: 'setOrganized' }
  | { definition: MobileViewDefinition; type: 'createView' }
  | { definition: MobileViewDefinition; viewId: string; type: 'updateView' }
  | { viewId: string; type: 'deleteView' }
type MobileViewEdit = Extract<MobileWorkspaceEdit, { type: 'createView' | 'deleteView' | 'updateView' }>
type MobileSnapshotEdit = Extract<MobileWorkspaceEdit, { type: 'deleteNote' | 'moveNoteToFolder' }>
type MobileNoteEdit = Exclude<MobileWorkspaceEdit, MobileSnapshotEdit | MobileViewEdit | { type: 'createNote' }>

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
}
type MobileNoteEditHandler = (context: MobileNoteEditContext, edit: MobileNoteEdit) => MobileNote

const mobileNoteEditHandlers: Record<MobileNoteEdit['type'], MobileNoteEditHandler> = {
  addRelationship: ({ editableNote, notes }, edit) => {
    if (edit.type !== 'addRelationship') return editableNote
    return addRelationship(editableNote, notes, edit.key, edit.targetTitle)
  },
  changeNoteType: ({ editableNote }, edit) => {
    if (edit.type !== 'changeNoteType') return editableNote
    return changeNoteType(editableNote, edit.value)
  },
  deleteProperty: ({ editableNote }, edit) => {
    if (edit.type !== 'deleteProperty') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, edit.key, null))
  },
  hydrateNoteContent: ({ editableNote }, edit) => {
    if (edit.type !== 'hydrateNoteContent') return editableNote
    return deriveEditedNote(editableNote, edit.rawContent)
  },
  removeRelationship: ({ editableNote }, edit) => {
    if (edit.type !== 'removeRelationship') return editableNote
    return removeRelationship(editableNote, edit.key, edit.ref)
  },
  renameNoteTitle: ({ editableNote }, edit) => {
    if (edit.type !== 'renameNoteTitle') return editableNote
    return deriveEditedNote(editableNote, replaceMarkdownTitle(editableNote.rawContent, edit.title))
  },
  setArchived: ({ editableNote }, edit) => {
    if (edit.type !== 'setArchived') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_archived', edit.archived))
  },
  setOrganized: ({ editableNote }, edit) => {
    if (edit.type !== 'setOrganized') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_organized', edit.organized))
  },
  toggleFavorite: ({ editableNote, note }, edit) => {
    if (edit.type !== 'toggleFavorite') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, '_favorite', !note.favorite))
  },
  updateNoteContent: ({ editableNote }, edit) => {
    if (edit.type !== 'updateNoteContent') return editableNote
    return deriveEditedNote(editableNote, contentEditWithPreservedFrontmatter(editableNote.rawContent, edit.content))
  },
  updateProperty: ({ editableNote }, edit) => {
    if (edit.type !== 'updateProperty') return editableNote
    return deriveEditedNote(editableNote, writeFrontmatterValue(editableNote.rawContent, edit.key, edit.value))
  },
}

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
  if (edit.type === 'createNote') {
    const nextSnapshot = createMobileNote(snapshot, edit.title)
    return { snapshot: nextSnapshot, writes: createNoteWrites(nextSnapshot) }
  }
  if (edit.type === 'createView') {
    return createMobileView(snapshot, edit.definition)
  }
  if (edit.type === 'updateView') {
    return updateMobileView(snapshot, edit.viewId, edit.definition)
  }
  if (edit.type === 'deleteView') {
    return deleteMobileView(snapshot, edit.viewId)
  }
  if (edit.type === 'deleteNote') {
    return deleteMobileNote(snapshot, edit.noteId)
  }
  if (edit.type === 'moveNoteToFolder') {
    return moveNoteToFolder(snapshot, edit)
  }

  const notePool = workspaceNotePool(snapshot)
  const notes = snapshot.notes.map((note) => applyMobileNoteEdit(note, notePool, edit))
  const allNotes = snapshot.allNotes?.map((note) => applyMobileNoteEdit(note, notePool, edit))
  const nextSnapshot = rebuildSnapshot({ ...snapshot, allNotes, notes }, notes, allNotes)

  return {
    snapshot: nextSnapshot,
    writes: saveNoteWrites(snapshot, nextSnapshot, edit),
  }
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

function createMobileNote(snapshot: MobileWorkspaceSnapshot, title: NoteTitle): MobileWorkspaceSnapshot {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return snapshot

  const notePool = workspaceNotePool(snapshot)
  const id = uniqueNoteId(notePool, `${slugifyTitle(trimmedTitle)}.md`)
  const now = Date.now()
  const rawContent = `# ${trimmedTitle}\n\n`
  const note = deriveEditableNote({
    fallback: {
      created: '0m ago',
      date: absoluteDate(now),
      favorite: false,
      id,
      links: 0,
      modified: '0m ago',
      path: id,
      rawContent,
      relationships: [],
      status: '',
      snippet: '',
      tags: [],
      title: trimmedTitle,
      type: 'Note',
      typeTone: 'gray',
      workspace: snapshot.source?.label ?? 'Tolaria Vault',
    },
    rawContent,
  }).note

  return rebuildSnapshot(
    { ...snapshot, selectedNoteId: id },
    [note, ...snapshot.notes],
    [note, ...notePool],
  )
}

function applyMobileNoteEdit(
  note: MobileNote,
  notes: MobileNote[],
  edit: MobileNoteEdit,
): MobileNote {
  if (note.id !== edit.noteId) return note

  const editableNote = withEditableContent(note)
  return mobileNoteEditHandlers[edit.type]({ editableNote, note, notes }, edit)
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

function changeNoteType(note: EditableNoteInput, value: NoteTitle): MobileNote {
  const nextType = value.trim()
  if (!nextType || nextType === note.type) return note

  return deriveEditedNote(note, writeFrontmatterValue(note.rawContent, 'type', nextType))
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

  const nextNote = movedNote(previousNote, folderPath)
  if (nextNote === previousNote) return { snapshot, writes: [] }

  const nextNotes = snapshot.notes.map((note) => note.id === previousNote.id ? nextNote : note)
  const nextAllNotes = snapshot.allNotes?.map((note) => note.id === previousNote.id ? nextNote : note)
  const nextSelectedNoteId = snapshot.selectedNoteId === previousNote.id ? nextNote.id : snapshot.selectedNoteId
  const nextSnapshot = rebuildSnapshot(
    { ...snapshot, allNotes: nextAllNotes, selectedNoteId: nextSelectedNoteId },
    nextNotes,
    nextAllNotes,
  )

  return {
    snapshot: nextSnapshot,
    writes: moveNoteWrites(previousNote, nextNote),
  }
}

function movedNote(note: MobileNote, folderPath: FolderPath): MobileNote {
  const previousPath = noteWritePath(note)
  const filename = noteFilename(previousPath)
  const nextPath = `${folderPath}/${filename}`
  if (nextPath === previousPath) return note

  return {
    ...note,
    id: note.id === previousPath ? nextPath : note.id,
    path: nextPath,
  }
}

function moveNoteWrites(previousNote: MobileNote, nextNote: MobileNote): MobileWorkspaceWrite[] {
  const previousPath = noteWritePath(previousNote)
  const nextPath = noteWritePath(nextNote)
  if (previousPath === nextPath || nextNote.rawContent === undefined) return []

  return [
    { kind: 'deleteNote', path: previousPath },
    { content: nextNote.rawContent, kind: 'saveNote', path: nextPath },
  ]
}

function noteFilename(path: string): string {
  return path.split('/').filter(Boolean).at(-1) ?? path
}

function normalizedFolderPath(folderPath: FolderPath): FolderPath {
  return folderPath.trim().replace(/^\/+|\/+$/g, '')
}

function rebuildSnapshot(
  snapshot: MobileWorkspaceSnapshot,
  notes: MobileNote[],
  allNotes = notes,
): MobileWorkspaceSnapshot {
  const derivedById = new Map(
    allNotes
      .map((note) => [note.id, deriveMobileNote(note)] as const)
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
      views: snapshot.views,
    }),
  }
}

function deriveMobileNote(note: MobileNote): DerivedNote | null {
  if (note.rawContent === undefined) return null

  const editable = withEditableContent(note)
  return deriveEditableNote({ fallback: editable, rawContent: editable.rawContent })
}

function deriveEditedNote(fallback: EditableNoteInput, rawContent: MarkdownContent): MobileNote {
  return deriveEditableNote({ fallback, rawContent }).note
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
    definition,
    filename,
    id: mobileSavedViewId(filename),
  }
  const views = orderedMobileSavedViews([...existingViews, view])
  const nextSnapshot = {
    ...snapshot,
    sidebarSections: buildMobileSidebarSections({
      notes: workspaceNotePool(snapshot),
      previousSections: snapshot.sidebarSections,
      views,
    }),
    views,
  }

  return {
    snapshot: nextSnapshot,
    writes: [{
      content: serializeMobileSavedViewDefinition(definition),
      kind: 'saveView',
      path: mobileSavedViewPath(filename),
    }],
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
}: {
  fallback: EditableNoteInput
  rawContent: MarkdownContent
}): DerivedNote {
  const document = parseLocalVaultDocument(rawContent)
  const filename = fallback.path?.split('/').at(-1) ?? fallback.id
  const type = cleanTypeName(frontmatterScalar(document.frontmatter, ['type', 'Is A', 'is_a']) ?? fallback.type)
  const blocks = localVaultEditorBlocks(document.body)
  const properties = mobileProperties(frontmatterProperties(document.frontmatter))

  return {
    note: {
      ...fallback,
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
    },
    rawRelationships: frontmatterRelationships(document.frontmatter),
  }
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
  addFrontmatterValue(frontmatter, 'type', note.type && note.type !== 'Note' ? note.type : undefined)
  addFrontmatterValue(frontmatter, 'Status', note.status)
  addFrontmatterValue(frontmatter, 'tags', note.tags.length > 0 ? note.tags : undefined)
  addFrontmatterValue(frontmatter, '_favorite', note.favorite ? true : undefined)
  addFrontmatterValue(frontmatter, '_archived', note.archived ? true : undefined)
  addFrontmatterValue(frontmatter, '_organized', note.organized ? true : undefined)
  return frontmatter
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

function wikilinkSearchText(note: MobileNote): string {
  return [note.title, note.type, note.path ?? '', note.tags.join(' ')].join(' ').toLowerCase()
}

function noteListSubtitle(notes: MobileNote[]): string {
  const active = notes.filter((note) => !note.archived)
  const inbox = active.filter((note) => !note.organized)
  const count = inbox.length > 0 ? inbox.length : active.length
  return `${count.toLocaleString()} open notes`
}

function uniqueNoteId(notes: MobileNote[], baseId: NoteId): NoteId {
  const existing = new Set(notes.map((note) => note.id))
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
