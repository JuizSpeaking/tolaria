import { MagnifyingGlass, Plus } from 'phosphor-react-native'
import { FlatList, StyleSheet, View } from 'react-native'
import { Text } from '../ui/text'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { MobileChip } from '../../ui/MobileChip'
import { MobileIconButton } from '../../ui/MobileIconButton'
import { MobileListRow } from '../../ui/MobileListRow'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { desktopPanelParity, desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type { MobileNote } from '../../workspace/mobileWorkspaceModel'
import { MobileTypeIcon } from './MobileWorkspaceIcons'
import { chipTone, noteTypeColor, noteTypeSoftColor, statusTone, tagTone } from './mobileWorkspaceTone'

export function MobileNoteListPanel({
  compact,
  notes,
  onSelectNote,
  searchQuery,
  selectedNoteId,
  subtitle,
  title = mobileCopy.inbox,
}: {
  compact: boolean
  notes: MobileNote[]
  onSelectNote: (noteId: string) => void
  searchQuery?: string
  selectedNoteId: string | null
  subtitle: string
  title?: string
}) {
  const activeNoteId = selectedNoteId ?? notes[0]?.id ?? null

  return (
    <MobilePanel style={[styles.panel, compact ? styles.panelCompact : null]} testID="note-list-panel">
      <MobileToolbar>
        <View style={styles.toolbarTitleBlock}>
          <MobileToolbarTitle title={title} />
          <Text style={styles.toolbarSubtitle}>{subtitle}</Text>
        </View>
        <MobileToolbarSpacer />
        <MobileIconButton accessibilityLabel={mobileCopy.searchNotes} testID="note-list-search-action">
          <MagnifyingGlass color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        </MobileIconButton>
        <MobileIconButton accessibilityLabel={mobileCopy.createNote} testID="note-list-create-action">
          <Plus color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        </MobileIconButton>
      </MobileToolbar>
      {searchQuery ? <SearchPill searchQuery={searchQuery} /> : null}
      {notes.length === 0 ? (
        <NoteListEmptyState />
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={notes}
          extraData={selectedNoteId}
          initialNumToRender={16}
          keyExtractor={(note) => note.id}
          renderItem={({ item: note }) => (
            <MobileListRow
              chips={<NoteRowChips note={note} />}
              selected={note.id === activeNoteId}
              selectedBackgroundColor={noteTypeSoftColor(note.typeTone)}
              selectedBorderColor={noteTypeColor(note.typeTone)}
              subtitle={note.snippet}
              testID={`note-row-${note.id}`}
              title={note.title}
              trailing={<MobileTypeIcon size={16} tone={note.typeTone} type={note.type} />}
              onPress={() => onSelectNote(note.id)}
            />
          )}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          windowSize={5}
        />
      )}
    </MobilePanel>
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

function NoteListEmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{mobileText('noteList.empty.allOrganized')}</Text>
      <Text style={styles.emptyText}>{mobileText('noteList.empty.noNotes')}</Text>
    </View>
  )
}

function NoteRowChips({ note }: { note: MobileNote }) {
  return (
    <View style={styles.chipRow}>
      <MobileChip density="list" label={note.type} tone={chipTone(note.typeTone)} />
      {note.status ? <MobileChip density="list" label={note.status} tone={statusTone(note.status)} /> : null}
      {note.tags.slice(0, 1).map((tag) => <MobileChip density="list" key={tag} label={tag} tone={tagTone(tag)} />)}
    </View>
  )
}

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
  panel: {
    alignSelf: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    height: '100%',
    width: desktopPanelParity.noteListWidth,
  },
  panelCompact: {
    width: 336,
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
  toolbarSubtitle: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
    fontWeight: '500',
  },
  toolbarTitleBlock: {
    minWidth: 0,
  },
})
