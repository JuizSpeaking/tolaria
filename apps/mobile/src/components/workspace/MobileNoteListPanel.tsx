import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { MagnifyingGlass, Plus } from 'phosphor-react-native'
import { FlatList, StyleSheet, View } from 'react-native'
import { Text } from '../ui/text'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { MobileLayoutProbeReadout } from '../../qa/MobileLayoutProbeReadout'
import { useMobileLayoutProbe, type MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileChip } from '../../ui/MobileChip'
import { MobileIconButton } from '../../ui/MobileIconButton'
import { MobileListRow } from '../../ui/MobileListRow'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { desktopPanelParity, desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import { mobileNoteRowChips } from '../../workspace/mobileNoteDisplay'
import type { MobileNeighborhood, MobileNeighborhoodGroup } from '../../workspace/mobileNeighborhood'
import type { MobileNote, MobilePropertyDisplayMode, MobileTypeDefinitions } from '../../workspace/mobileWorkspaceModel'
import { MobileNoteListBulkActionBar } from './MobileNoteListBulkActionBar'
import { MobileTypeIcon } from './MobileWorkspaceIcons'
import {
  addMobileNoteListSelection,
  mobileNoteListSelectionIsArchived,
  selectedMobileNoteListIds,
  selectedMobileNoteListNotes,
  toggleMobileNoteListSelection,
} from './mobileNoteListBulkSelection'
import { noteTypeSoftColor } from './mobileWorkspaceTone'

type MobileNoteListBulkActions = {
  onArchive: (noteIds: string[], archived: boolean) => void
  onDelete: (noteIds: string[]) => void
  onOrganize: (noteIds: string[]) => void
}
type MobileNoteListSelectionState = {
  noteIds: ReadonlySet<string>
  scope: string
}

type MobileNoteListPanelProps = {
  bulkActions?: MobileNoteListBulkActions
  compact: boolean
  displayPropertyKeys?: string[]
  fullWidth?: boolean
  leading?: ReactNode
  layoutProbe?: boolean
  neighborhood?: MobileNeighborhood | null
  notes: MobileNote[]
  onOpenCreateNote: () => void
  onOpenSearch: () => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  searchQuery?: string
  selectedNoteId: string | null
  subtitle: string
  title?: string
  typeDefinitions?: MobileTypeDefinitions
}

export function MobileNoteListPanel(props: MobileNoteListPanelProps) {
  const {
    bulkActions,
    compact,
    displayPropertyKeys = [],
    fullWidth = false,
    leading,
    layoutProbe: layoutProbeEnabled = false,
    neighborhood = null,
    notes,
    onOpenCreateNote,
    onOpenSearch,
    onSelectNote,
    propertyDisplayModes,
    searchQuery,
    selectedNoteId,
    title = mobileCopy.inbox,
    typeDefinitions,
  } = props
  const activeNoteId = selectedNoteId ?? notes[0]?.id ?? null
  const layoutProbe = useMobileLayoutProbe(layoutProbeEnabled)
  const bulkSelection = useMobileNoteListBulkSelection({
    bulkActions,
    neighborhood,
    notes,
    onSelectNote,
  })

  return (
    <MobilePanel {...layoutProbe.probe('noteList.panel')} style={[panelStyles.panel, compact ? panelStyles.panelCompact : null, fullWidth ? panelStyles.panelFullWidth : null]} testID="note-list-panel">
      <MobileToolbar testID="note-list-toolbar">
        {leading}
        <View style={styles.toolbarTitleBlock}>
          <MobileToolbarTitle testID="note-list-toolbar-title" title={title} />
        </View>
        <MobileToolbarSpacer />
        <MobileIconButton accessibilityLabel={mobileCopy.searchNotes} testID="note-list-search-action" onPress={onOpenSearch}>
          <MagnifyingGlass color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        </MobileIconButton>
        <MobileIconButton accessibilityLabel={mobileCopy.createNote} testID="note-list-create-action" onPress={onOpenCreateNote}>
          <Plus color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        </MobileIconButton>
      </MobileToolbar>
      {searchQuery ? <SearchPill searchQuery={searchQuery} /> : null}
      <NoteListContent
        activeNoteId={activeNoteId}
        bulkSelection={bulkSelection}
        displayPropertyKeys={displayPropertyKeys}
        layoutProbe={layoutProbe.probe}
        neighborhood={neighborhood}
        notes={notes}
        onSelectNote={onSelectNote}
        propertyDisplayModes={propertyDisplayModes}
        searchQuery={searchQuery}
        selectedNoteId={selectedNoteId}
        typeDefinitions={typeDefinitions}
      />
      <BulkSelectionBar bulkActions={bulkActions} bulkSelection={bulkSelection} />
      {layoutProbeEnabled ? <MobileLayoutProbeReadout metrics={layoutProbe.metrics} testID="note-list-layout-metrics" /> : null}
    </MobilePanel>
  )
}

function NoteListContent({
  activeNoteId,
  bulkSelection,
  displayPropertyKeys,
  layoutProbe,
  neighborhood,
  notes,
  onSelectNote,
  propertyDisplayModes,
  searchQuery,
  selectedNoteId,
  typeDefinitions,
}: {
  activeNoteId: string | null
  bulkSelection: ReturnType<typeof useMobileNoteListBulkSelection>
  displayPropertyKeys: string[]
  layoutProbe: MobileLayoutProbe
  neighborhood: MobileNeighborhood | null
  notes: MobileNote[]
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  searchQuery?: string
  selectedNoteId: string | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  if (neighborhood) {
    return (
      <NeighborhoodNoteList
        activeNoteId={activeNoteId}
        displayPropertyKeys={displayPropertyKeys}
        layoutProbe={layoutProbe}
        neighborhood={neighborhood}
        propertyDisplayModes={propertyDisplayModes}
        typeDefinitions={typeDefinitions}
        onSelectNote={onSelectNote}
      />
    )
  }

  if (notes.length === 0) return <NoteListEmptyState searchQuery={searchQuery} />

  return (
    <FlatList
      {...layoutProbe('noteList.list')}
      contentContainerStyle={styles.listContent}
      data={notes}
      extraData={bulkSelection.rowExtraData(selectedNoteId)}
      initialNumToRender={16}
      keyExtractor={(note) => note.id}
      renderItem={({ item: note }) => noteRow({
        activeNoteId,
        displayPropertyKeys,
        layoutProbe,
        multiSelected: bulkSelection.selectedNoteIds.has(note.id),
        note,
        onBeginSelection: bulkSelection.beginSelection,
        propertyDisplayModes,
        typeDefinitions,
        onSelectNote: bulkSelection.pressNote,
      })}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      windowSize={5}
    />
  )
}

function BulkSelectionBar({
  bulkActions,
  bulkSelection,
}: {
  bulkActions?: MobileNoteListBulkActions
  bulkSelection: ReturnType<typeof useMobileNoteListBulkSelection>
}) {
  if (!bulkActions || bulkSelection.selectedNotes.length === 0) return null

  return (
    <MobileNoteListBulkActionBar
      archivedMode={mobileNoteListSelectionIsArchived(bulkSelection.selectedNotes)}
      count={bulkSelection.selectedNotes.length}
      onArchiveToggle={bulkSelection.archiveSelected}
      onClear={bulkSelection.clearSelection}
      onDelete={bulkSelection.deleteSelected}
      onOrganize={bulkSelection.organizeSelected}
    />
  )
}

function useMobileNoteListBulkSelection({
  bulkActions,
  neighborhood,
  notes,
  onSelectNote,
}: {
  bulkActions?: MobileNoteListBulkActions
  neighborhood: MobileNeighborhood | null
  notes: MobileNote[]
  onSelectNote: (noteId: string) => void
}) {
  const selectionEnabled = Boolean(bulkActions && !neighborhood)
  const emptySelection = useMemo(() => new Set<string>(), [])
  const [selectionState, setSelectionState] = useState<MobileNoteListSelectionState>({
    noteIds: emptySelection,
    scope: '',
  })
  const visibleNoteIds = useMemo(() => notes.map((note) => note.id), [notes])
  const visibleNoteIdsSignature = visibleNoteIds.join('\u0000')
  const selectionScope = selectionEnabled ? visibleNoteIdsSignature : ''
  const selectedNoteIds = scopedSelectedNoteIds({ emptySelection, selectionScope, selectionState })
  const selectedNotes = useMemo(
    () => selectedMobileNoteListNotes(notes, selectedNoteIds),
    [notes, selectedNoteIds],
  )
  const selectedNoteIdsSignature = [...selectedNoteIds].join('\u0000')
  const clearSelection = useCallback(() => {
    setSelectionState({ noteIds: new Set(), scope: selectionScope })
  }, [selectionScope])

  const beginSelection = useCallback((noteId: string) => {
    if (!selectionEnabled) return
    setSelectionState((current) => selectionWithNote(current, selectionScope, noteId, addMobileNoteListSelection))
  }, [selectionEnabled, selectionScope])

  const pressNote = useCallback((noteId: string) => {
    if (shouldSelectNoteImmediately(selectionEnabled, selectedNoteIds)) {
      onSelectNote(noteId)
      return
    }
    setSelectionState((current) => selectionWithNote(current, selectionScope, noteId, toggleMobileNoteListSelection))
  }, [onSelectNote, selectedNoteIds, selectionEnabled, selectionScope])

  const selectedIdsInOrder = useCallback(() => selectedMobileNoteListIds(notes, selectedNoteIds), [notes, selectedNoteIds])

  const runBulkAction = useCallback((action: (noteIds: string[]) => void) => {
    const noteIds = selectedIdsInOrder()
    if (noteIds.length > 0) {
      clearSelection()
      action(noteIds)
    }
  }, [clearSelection, selectedIdsInOrder])
  const archiveSelected = useArchiveSelectionAction({ bulkActions, runBulkAction, selectedNotes })

  return {
    archiveSelected,
    beginSelection,
    clearSelection,
    deleteSelected: useOptionalBulkAction(bulkActions?.onDelete, runBulkAction),
    organizeSelected: useOptionalBulkAction(bulkActions?.onOrganize, runBulkAction),
    pressNote,
    rowExtraData: useCallback((selectedNoteId: string | null) => (
      `${selectedNoteId ?? ''}:${selectedNoteIdsSignature}`
    ), [selectedNoteIdsSignature]),
    selectedNoteIds,
    selectedNotes,
  }
}

function scopedSelectedNoteIds({
  emptySelection,
  selectionScope,
  selectionState,
}: {
  emptySelection: ReadonlySet<string>
  selectionScope: string
  selectionState: MobileNoteListSelectionState
}) {
  return selectionState.scope === selectionScope ? selectionState.noteIds : emptySelection
}

function selectionWithNote(
  current: MobileNoteListSelectionState,
  selectionScope: string,
  noteId: string,
  updateSelection: (noteIds: ReadonlySet<string>, noteId: string) => ReadonlySet<string>,
): MobileNoteListSelectionState {
  return {
    noteIds: updateSelection(scopedNoteSelection(current, selectionScope), noteId),
    scope: selectionScope,
  }
}

function shouldSelectNoteImmediately(selectionEnabled: boolean, selectedNoteIds: ReadonlySet<string>) {
  return !selectionEnabled || selectedNoteIds.size === 0
}

function useArchiveSelectionAction({
  bulkActions,
  runBulkAction,
  selectedNotes,
}: {
  bulkActions?: MobileNoteListBulkActions
  runBulkAction: (action: (noteIds: string[]) => void) => void
  selectedNotes: MobileNote[]
}) {
  return useCallback(() => {
    if (!bulkActions) return
    const archived = !mobileNoteListSelectionIsArchived(selectedNotes)
    runBulkAction((noteIds) => bulkActions.onArchive(noteIds, archived))
  }, [bulkActions, runBulkAction, selectedNotes])
}

function useOptionalBulkAction(
  action: ((noteIds: string[]) => void) | undefined,
  runBulkAction: (action: (noteIds: string[]) => void) => void,
) {
  return useCallback(() => {
    if (action) runBulkAction(action)
  }, [action, runBulkAction])
}

function scopedNoteSelection(state: MobileNoteListSelectionState, scope: string) {
  return state.scope === scope ? state.noteIds : new Set<string>()
}

type NeighborhoodRow =
  | { id: string; kind: 'source'; note: MobileNote }
  | { group: MobileNeighborhoodGroup; id: string; kind: 'header' }
  | { id: string; kind: 'note'; note: MobileNote }

function NeighborhoodNoteList({
  activeNoteId,
  displayPropertyKeys,
  layoutProbe,
  neighborhood,
  onSelectNote,
  propertyDisplayModes,
  typeDefinitions,
}: {
  activeNoteId: string | null
  displayPropertyKeys: string[]
  layoutProbe: MobileLayoutProbe
  neighborhood: MobileNeighborhood
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  const rows = useMemo(() => neighborhoodRows(neighborhood), [neighborhood])

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={rows}
      extraData={activeNoteId}
      initialNumToRender={18}
      keyExtractor={(row) => row.id}
      renderItem={({ item }) => neighborhoodRow({
        activeNoteId,
        displayPropertyKeys,
        item,
        layoutProbe,
        propertyDisplayModes,
        typeDefinitions,
        onSelectNote,
      })}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      windowSize={5}
    />
  )
}

function neighborhoodRows(neighborhood: MobileNeighborhood): NeighborhoodRow[] {
  return [
    { id: `source-${neighborhood.source.id}`, kind: 'source', note: neighborhood.source },
    ...neighborhood.groups.flatMap((group) => [
      { group, id: `group-${group.id}`, kind: 'header' } as const,
      ...group.notes.map((note) => ({ id: `group-${group.id}-${note.id}`, kind: 'note' as const, note })),
    ]),
  ]
}

function neighborhoodRow({
  activeNoteId,
  displayPropertyKeys,
  item,
  layoutProbe,
  onSelectNote,
  propertyDisplayModes,
  typeDefinitions,
}: {
  activeNoteId: string | null
  displayPropertyKeys: string[]
  item: NeighborhoodRow
  layoutProbe: MobileLayoutProbe
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  if (item.kind === 'header') return <RelationshipGroupHeader group={item.group} />

  return noteRow({
    activeNoteId,
    displayPropertyKeys,
    forceSelected: item.kind === 'source',
    layoutProbe,
    note: item.note,
    propertyDisplayModes,
    typeDefinitions,
    onSelectNote,
  })
}

function noteRow({
  activeNoteId,
  displayPropertyKeys,
  forceSelected = false,
  layoutProbe,
  multiSelected = false,
  note,
  onBeginSelection,
  onSelectNote,
  propertyDisplayModes,
  typeDefinitions,
}: {
  activeNoteId: string | null
  displayPropertyKeys: string[]
  forceSelected?: boolean
  layoutProbe: MobileLayoutProbe
  multiSelected?: boolean
  note: MobileNote
  onBeginSelection?: (noteId: string) => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  return (
    <MobileListRow
      chips={<NoteRowChips displayPropertyKeys={displayPropertyKeys} note={note} propertyDisplayModes={propertyDisplayModes} typeDefinitions={typeDefinitions} />}
      layoutProbe={layoutProbe}
      metricId={`noteList.item.${note.id}`}
      multiSelected={multiSelected}
      selected={forceSelected || note.id === activeNoteId}
      selectedBackgroundColor={noteTypeSoftColor(note.typeTone)}
      subtitle={note.snippet}
      testID={`note-row-${note.id}`}
      title={note.title}
      trailing={<MobileTypeIcon fileKind={note.fileKind} size={16} tone={note.typeTone} type={note.type} />}
      onLongPress={onBeginSelection ? () => onBeginSelection(note.id) : undefined}
      onPress={() => onSelectNote(note.id)}
    />
  )
}

function RelationshipGroupHeader({ group }: { group: MobileNeighborhoodGroup }) {
  return (
    <View style={styles.groupHeader} testID={`relationship-group-${group.id}`}>
      <Text style={styles.groupLabel}>{group.label}</Text>
      <Text style={styles.groupCount}>{group.notes.length}</Text>
    </View>
  )
}

function SearchPill({ searchQuery }: { searchQuery: string }) {
  return (
    <View style={styles.searchPill}>
      <MagnifyingGlass color={mobileColors.textMuted} size={16} />
      <Text numberOfLines={1} style={styles.searchText}>{searchQuery}</Text>
    </View>
  )
}

function NoteListEmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{mobileText(searchQuery ? 'noteList.empty.noMatching' : 'noteList.empty.allOrganized')}</Text>
      <Text style={styles.emptyText}>{mobileText('noteList.empty.noNotes')}</Text>
    </View>
  )
}

function NoteRowChips({
  displayPropertyKeys,
  note,
  propertyDisplayModes,
  typeDefinitions,
}: {
  displayPropertyKeys: string[]
  note: MobileNote
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  typeDefinitions?: MobileTypeDefinitions
}) {
  const chips = mobileNoteRowChips(note, displayPropertyKeys, typeDefinitions, propertyDisplayModes)
  if (chips.length === 0) return null

  return (
    <View style={styles.chipRow}>
      {chips.map((chip, index) => (
        <MobileChip density="list" key={`${chip.label}-${index}`} label={chip.label} tone={chip.tone} />
      ))}
    </View>
  )
}

const panelStyles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    height: '100%',
    width: desktopPanelParity.noteListWidth,
  },
  panelCompact: {
    width: 336,
  },
  panelFullWidth: {
    width: '100%',
  },
})

const styles = StyleSheet.create({
  chipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: mobileSpace.xl,
  },
  emptyText: {
    marginTop: mobileSpace.sm,
    color: mobileColors.textMuted,
    fontSize: mobileType.body,
    textAlign: 'center',
  },
  emptyTitle: {
    color: mobileColors.text,
    fontSize: mobileType.title,
    fontWeight: '600',
    textAlign: 'center',
  },
  groupCount: {
    color: mobileColors.textMuted,
    fontSize: mobileType.micro,
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
  groupHeader: {
    minHeight: 32,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: mobileColors.graySoft,
    paddingHorizontal: mobileSpace.lg,
  },
  groupLabel: {
    color: mobileColors.textMuted,
    fontSize: mobileType.micro,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  searchPill: {
    minHeight: 36,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: mobileSpace.lg,
  },
  searchText: {
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
    fontWeight: '500',
  },
  toolbarTitleBlock: {
    minWidth: 0,
  },
})
