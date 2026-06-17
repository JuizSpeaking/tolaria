import { useCallback, useMemo, useState } from 'react'
import type {
  MobileNote,
  MobileSavedView,
  MobileSidebarItem,
  MobileWorkspaceSnapshot,
} from '../workspace/mobileWorkspaceModel'
import { evaluateMobileSavedView, sortMobileNotesBySort } from '../workspace/mobileSavedViews'
import type {
  MobileSidebarFolderSelection,
  MobileSidebarItemSelection,
} from '../components/workspace/MobileWorkspaceSidebar'
import { mobileNoteListMatchesQuery, normalizedMobileSearchQuery } from '../workspace/mobileNoteSearch'

export type NoteCount = number
export type NoteCountText = string
export type NoteId = MobileNote['id']
export type ReadOnlyFormValue = string
export type SearchQuery = string
export type SidebarLabel = string
export type TabletSidebarSelection =
  | { count?: NoteCountText; id: string; kind: 'item'; label: SidebarLabel; sectionId: string; typeName?: string; viewId?: string }
  | { id: string; kind: 'folder'; label: SidebarLabel }
type TabletSidebarItemSelection = Extract<TabletSidebarSelection, { kind: 'item' }>
type SidebarNotesResolver = (
  snapshot: MobileWorkspaceSnapshot,
  notes: MobileNote[],
  selection: TabletSidebarItemSelection,
) => MobileNote[]
type NoteListPropertyResolver = (
  snapshot: MobileWorkspaceSnapshot,
  selection: TabletSidebarItemSelection,
) => string[]

const sidebarSectionResolvers: Record<string, SidebarNotesResolver> = {
  favorites: (_snapshot, notes, selection) => notesForFavoriteSelection(notes, selection),
  types: (snapshot, notes, selection) => notesForTypeSelection(snapshot, notes, selection),
  views: (snapshot, _notes, selection) => notesForSavedView(snapshot, selection),
}
const noteListPropertyResolvers: Record<string, NoteListPropertyResolver> = {
  types: (snapshot, selection) => typeDefinitionForSelection(snapshot, selection)?.listPropertiesDisplay ?? [],
  views: (snapshot, selection) => savedViewForSelection(snapshot, selection)?.definition.listPropertiesDisplay ?? [],
}

export function useTabletWorkspaceNavigation(snapshot: MobileWorkspaceSnapshot, searchQuery: SearchQuery) {
  const [sidebarSelection, setSidebarSelection] = useState<TabletSidebarSelection>(() => initialSidebarSelection(snapshot))
  const [selectedNoteId, setSelectedNoteId] = useState<NoteId | null>(initialSelectedNoteId(snapshot))
  const sidebarNotes = useMemo(() => notesForSidebarSelection(snapshot, sidebarSelection), [sidebarSelection, snapshot])
  const noteListProperties = useMemo(() => noteListPropertiesForSelection(snapshot, sidebarSelection), [sidebarSelection, snapshot])
  const notes = useMemo(() => filterNotesBySearch(sidebarNotes, searchQuery, noteListProperties), [noteListProperties, searchQuery, sidebarNotes])
  const selectedNote = selectedMobileNote(snapshot, notes, selectedNoteId)

  const selectSidebarSelection = useCallback((selection: TabletSidebarSelection, sourceSnapshot = snapshot) => {
    const nextNoteListProperties = noteListPropertiesForSelection(sourceSnapshot, selection)
    const nextNotes = filterNotesBySearch(notesForSidebarSelection(sourceSnapshot, selection), searchQuery, nextNoteListProperties)
    setSidebarSelection(selection)
    setSelectedNoteId(nextNotes[0]?.id ?? null)
  }, [searchQuery, snapshot])

  return {
    activeFolderId: sidebarSelection.kind === 'folder' ? sidebarSelection.id : null,
    activeItemId: sidebarSelection.kind === 'item' ? sidebarSelection.id : null,
    editorBlocks: editorBlocksForSelection(snapshot, selectedNote),
    editorBullets: editorBulletsForSelection(snapshot, selectedNote),
    noteListProperties,
    noteListSubtitle: noteListSubtitle(sidebarSelection, snapshot.noteListSubtitle, notes.length, searchQuery),
    noteListTitle: sidebarSelection.label,
    notes,
    sidebarSelection,
    selectDefaultSidebarItem: useCallback((sourceSnapshot = snapshot) => {
      selectSidebarSelection(initialSidebarSelection(sourceSnapshot), sourceSnapshot)
    }, [selectSidebarSelection, snapshot]),
    selectSavedView: useCallback((view: MobileSavedView, sourceSnapshot = snapshot) => {
      const matchingNotes = evaluateMobileSavedView(view, workspaceNotes(sourceSnapshot))
      selectSidebarSelection({
        count: matchingNotes.length.toLocaleString(),
        id: view.id,
        kind: 'item',
        label: view.definition.name,
        sectionId: 'views',
        viewId: view.id,
      }, sourceSnapshot)
    }, [selectSidebarSelection, snapshot]),
    selectFolder: useCallback((selection: MobileSidebarFolderSelection, sourceSnapshot = snapshot) => {
      selectSidebarSelection({
        id: selection.id,
        kind: 'folder',
        label: selection.name,
      }, sourceSnapshot)
    }, [selectSidebarSelection, snapshot]),
    selectSidebarItem: useCallback((selection: MobileSidebarItemSelection, sourceSnapshot = snapshot) => {
      selectSidebarSelection({
        count: selection.count,
        id: selection.id,
        kind: 'item',
        label: selection.label,
        sectionId: selection.sectionId,
        typeName: selection.typeName,
        viewId: selection.viewId,
      }, sourceSnapshot)
    }, [selectSidebarSelection, snapshot]),
    selectedNote,
    selectedNoteId: selectedNote?.id ?? selectedNoteId,
    setSelectedNoteId,
  }
}

export function snapshotWithFavoriteOverrides(
  snapshot: MobileWorkspaceSnapshot,
  favoriteOverrides: Record<string, boolean>,
): MobileWorkspaceSnapshot {
  if (Object.keys(favoriteOverrides).length === 0) return snapshot

  return {
    ...snapshot,
    notes: snapshot.notes.map((note) => {
      const favorite = favoriteOverrides[note.id]
      return favorite === undefined ? note : { ...note, favorite }
    }),
  }
}

function initialSelectedNoteId(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.selectedNoteId ?? snapshot.notes[0]?.id ?? null
}

function initialSidebarSelection(snapshot: MobileWorkspaceSnapshot): TabletSidebarSelection {
  const primaryItem = snapshot.sidebarSections
    .find((section) => section.id === 'primary')
    ?.items
    ?.find(activeSidebarItem)

  return {
    count: primaryItem?.count,
    id: primaryItem?.id ?? 'inbox',
    kind: 'item',
    label: primaryItem?.label ?? 'Inbox',
    sectionId: 'primary',
  }
}

function activeSidebarItem(item: MobileSidebarItem) {
  return item.active === true
}

export function notesForSidebarSelection(snapshot: MobileWorkspaceSnapshot, selection: TabletSidebarSelection) {
  const notes = workspaceNotes(snapshot)
  if (selection.kind === 'folder') return notes.filter((note) => !note.archived && noteBelongsToFolder(note, selection))

  const sectionResolver = sidebarSectionResolvers[selection.sectionId]
  return sectionResolver?.(snapshot, notes, selection) ?? primaryNotesForSelection(notes, selection)
}

function primaryNotesForSelection(notes: MobileNote[], selection: TabletSidebarItemSelection) {
  if (selection.id === 'archive') return notes.filter((note) => note.archived)
  if (selection.id === 'all-notes') return notes.filter((note) => !note.archived)
  if (selection.id === 'inbox') return inboxNotes(notes)

  return notes
}

function workspaceNotes(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.allNotes ?? snapshot.notes
}

function notesForSavedView(
  snapshot: MobileWorkspaceSnapshot,
  selection: TabletSidebarItemSelection,
) {
  const view = savedViewForSelection(snapshot, selection)
  if (!view) return []

  return evaluateMobileSavedView(view, workspaceNotes(snapshot))
}

function notesForFavoriteSelection(notes: MobileNote[], selection: TabletSidebarItemSelection) {
  const selectedNoteId = favoriteNoteId(selection.id)
  return notes.filter((note) => !note.archived && note.favorite && (
    selectedNoteId ? note.id === selectedNoteId : note.title === selection.label
  ))
}

function favoriteNoteId(itemId: string) {
  const prefix = 'favorite-'
  return itemId.startsWith(prefix) ? itemId.slice(prefix.length) : null
}

function notesForTypeSelection(
  snapshot: MobileWorkspaceSnapshot,
  notes: MobileNote[],
  selection: TabletSidebarItemSelection,
) {
  const matchingNotes = notes.filter((note) => !note.archived && noteMatchesType(note, selection))
  return sortMobileNotesBySort(matchingNotes, typeDefinitionForSelection(snapshot, selection)?.sort ?? null)
}

export function noteListPropertiesForSelection(
  snapshot: MobileWorkspaceSnapshot,
  selection: TabletSidebarSelection,
) {
  if (selection.kind !== 'item') return []
  return noteListPropertyResolvers[selection.sectionId]?.(snapshot, selection) ?? []
}

function savedViewForSelection(
  snapshot: MobileWorkspaceSnapshot,
  selection: TabletSidebarItemSelection,
) {
  return snapshot.views?.find((candidate) => candidate.id === selection.viewId || candidate.id === selection.id) ?? null
}

function typeDefinitionForSelection(
  snapshot: MobileWorkspaceSnapshot,
  selection: TabletSidebarItemSelection,
) {
  const typeName = typeNameForSelection(snapshot, selection)
  return typeName ? snapshot.typeDefinitions?.[typeName] : null
}

function typeNameForSelection(
  snapshot: MobileWorkspaceSnapshot,
  selection: TabletSidebarItemSelection,
) {
  if (selection.typeName) return selection.typeName

  return snapshot.sidebarSections
    .find((section) => section.id === 'types')
    ?.items
    ?.find((item) => item.id === selection.id)
    ?.typeName ?? null
}

export function filterNotesBySearch(notes: MobileNote[], searchQuery: SearchQuery, displayPropertyKeys: string[] = []) {
  const normalizedSearch = normalizedMobileSearchQuery(searchQuery)
  if (!normalizedSearch) return notes

  return notes.filter((note) => mobileNoteListMatchesQuery(note, normalizedSearch, displayPropertyKeys))
}

function inboxNotes(notes: MobileNote[]) {
  return notes.filter((note) => !note.archived && !note.organized && note.type !== 'Type')
}

function noteBelongsToFolder(note: MobileNote, selection: Extract<TabletSidebarSelection, { kind: 'folder' }>) {
  const folderPath = noteFolderPath(note)
  if (!folderPath) return false
  const normalizedNoteFolder = normalizedFolderPath(folderPath)
  const normalizedSelection = normalizedFolderPath(selection.id)
  return normalizedNoteFolder === normalizedSelection || normalizedNoteFolder.startsWith(`${normalizedSelection}/`)
}

function noteMatchesType(note: MobileNote, selection: TabletSidebarItemSelection) {
  if (selection.typeName) return normalizedLabel(note.type) === normalizedLabel(selection.typeName)

  return normalizedLabel(selection.id) === normalizedLabel(`type-${note.type}`)
    || normalizedLabel(selection.label).replace(/s$/, '') === normalizedLabel(note.type)
}

function normalizedLabel(label: SidebarLabel) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function normalizedFolderPath(path: SidebarLabel) {
  return path.toLowerCase().replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

function noteFolderPath(note: MobileNote) {
  return (note.path ?? note.id).split('/').slice(0, -1).join('/')
}

function noteListSubtitle(selection: TabletSidebarSelection, inboxSubtitle: NoteCountText, noteCount: NoteCount, searchQuery: SearchQuery) {
  const visibleCount = noteCount.toLocaleString()
  if (normalizedMobileSearchQuery(searchQuery) || selection.kind !== 'item') return visibleCount
  if (selection.id === 'inbox') return inboxSubtitle

  return selection.count ?? visibleCount
}

function selectedMobileNote(
  snapshot: MobileWorkspaceSnapshot,
  notes: MobileNote[],
  selectedNoteId: NoteId | null,
) {
  const selectedNote = notes.find((note) => note.id === selectedNoteId)
    ?? workspaceNotes(snapshot).find((note) => note.id === selectedNoteId)
    ?? notes[0]

  if (!selectedNote) return null
  return snapshot.notes.find((note) => note.id === selectedNote.id) ?? selectedNote
}

function editorBlocksForSelection(snapshot: MobileWorkspaceSnapshot, selectedNote: MobileNote | null) {
  if (!selectedNote) return snapshot.editorBlocks
  if (selectedNote.editorBlocks) return selectedNote.editorBlocks
  return snapshot.allNotes ? [] : snapshot.editorBlocks
}

function editorBulletsForSelection(snapshot: MobileWorkspaceSnapshot, selectedNote: MobileNote | null) {
  if (!selectedNote) return snapshot.editorBullets
  if (selectedNote.editorBullets) return selectedNote.editorBullets
  return snapshot.allNotes ? [] : snapshot.editorBullets
}
