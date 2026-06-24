import { type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { FilePlus, LinkSimple, ListBullets, Star } from 'phosphor-react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { MobileChip } from '../../ui/MobileChip'
import { desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type { MobileNote } from '../../workspace/mobileWorkspaceModel'
import type { MobileWorkspaceActionSheetProps } from './MobileWorkspaceActionSheet'
import { MobileSourceBlockMoreActions } from './MobileSourceBlockMoreActions'
import { MobileTableMoreActions } from './MobileTableMoreActions'
import { MobileWhiteboardMoreActions } from './MobileWhiteboardMoreActions'
import { MobileTypeIcon } from './MobileWorkspaceIcons'
import { NoteMoreActionRows } from './MobileNoteMoreActions'
import { isMobileMarkdownActionNote } from './MobileNoteMoreActionsModel'
import { chipTone } from './mobileWorkspaceTone'

export function MoreActionsContent(props: MobileWorkspaceActionSheetProps) {
  const { selectedNote } = props
  if (!selectedNote) return <MoreActionsScroll />

  return (
    <MoreActionsScroll>
      <SelectedNoteSummary note={selectedNote} typeDefinitions={props.typeDefinitions} />
      <SelectedNoteActionRows note={selectedNote} props={props} />
      {isMobileMarkdownActionNote(selectedNote) ? <MarkdownNoteMoreActionRows note={selectedNote} props={props} /> : null}
      <DeepLinkActionRow onClose={props.onClose} onCopyDeepLink={props.onCopyDeepLink} />
    </MoreActionsScroll>
  )
}

function MoreActionsScroll({ children }: { children?: ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
      {children}
    </ScrollView>
  )
}

function SelectedNoteActionRows({
  note,
  props,
}: {
  note: MobileNote
  props: MobileWorkspaceActionSheetProps
}) {
  return (
    <NoteMoreActionRows
      note={note}
      canRedoWorkspaceEdit={props.canRedoWorkspaceEdit}
      canUndoWorkspaceEdit={props.canUndoWorkspaceEdit}
      onClose={props.onClose}
      onCopyFilePath={props.onCopyFilePath}
      onDeleteNote={props.onDeleteNote}
      onEnterNeighborhood={props.onEnterNeighborhood}
      onOpenChangeNoteType={props.onOpenChangeNoteType}
      onOpenFileInDefaultApp={props.onOpenFileInDefaultApp}
      onOpenFindInNote={props.onOpenFindInNote}
      onOpenMoveNoteToFolder={props.onOpenMoveNoteToFolder}
      onOpenReplaceInNote={props.onOpenReplaceInNote}
      onOpenRenameNoteFile={props.onOpenRenameNoteFile}
      onOpenSetNoteIcon={props.onOpenSetNoteIcon}
      onRevealFile={props.onRevealFile}
      onRenameNoteFileToTitle={props.onRenameNoteFileToTitle}
      onRedoWorkspaceEdit={props.onRedoWorkspaceEdit}
      onRemoveNoteIcon={props.onRemoveNoteIcon}
      onSetArchived={props.onSetArchived}
      onSetOrganized={props.onSetOrganized}
      onToggleFavorite={props.onToggleFavorite}
      onToggleNoteWidth={props.onToggleNoteWidth}
      onUndoWorkspaceEdit={props.onUndoWorkspaceEdit}
    />
  )
}

function MarkdownNoteMoreActionRows({
  note,
  props,
}: {
  note: MobileNote
  props: MobileWorkspaceActionSheetProps
}) {
  return (
    <>
      <MoreActionRow
        icon={<ListBullets color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('tableOfContents.title')}
        testID="workspace-action-table-of-contents"
        onPress={props.onOpenTableOfContents}
      />
      <MobileTableMoreActions
        editorBlocks={props.editorBlocks}
        editorBullets={props.editorBullets}
        note={note}
        onClose={props.onClose}
        onUpdateNoteContent={props.onUpdateNoteContent}
      />
      <MobileSourceBlockMoreActions
        editorBlocks={props.editorBlocks}
        editorBullets={props.editorBullets}
        note={note}
        onClose={props.onClose}
        onUpdateNoteContent={props.onUpdateNoteContent}
      />
      <MobileWhiteboardMoreActions
        editorBlocks={props.editorBlocks}
        editorBullets={props.editorBullets}
        note={note}
        onClose={props.onClose}
        onUpdateNoteContent={props.onUpdateNoteContent}
      />
      <MoreActionRow
        icon={<FilePlus color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.exportPdf')}
        testID="workspace-action-export-pdf"
        onPress={() => {
          props.onExportNoteAsPdf()
          props.onClose()
        }}
      />
    </>
  )
}

function DeepLinkActionRow({
  onClose,
  onCopyDeepLink,
}: {
  onClose: () => void
  onCopyDeepLink: () => void
}) {
  return (
    <MoreActionRow
      icon={<LinkSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
      label={mobileText('command.note.copyDeepLink')}
      testID="workspace-action-copy-deep-link"
      onPress={() => {
        onCopyDeepLink()
        onClose()
      }}
    />
  )
}

function SelectedNoteSummary({
  note,
  typeDefinitions,
}: {
  note: MobileNote
  typeDefinitions: MobileWorkspaceActionSheetProps['typeDefinitions']
}) {
  return (
    <View style={styles.summary} testID="workspace-action-sheet-note-summary">
      <MobileTypeIcon size={desktopToolbarActionParity.iconSize} tone={note.typeTone} type={note.type} typeDefinitions={typeDefinitions} />
      <Text numberOfLines={1} style={styles.summaryTitle}>{note.title}</Text>
      {note.favorite ? <Star color={mobileColors.primary} size={desktopToolbarActionParity.iconSize} weight="fill" /> : null}
      <MobileChip label={note.type} tone={chipTone(note.typeTone)} />
    </View>
  )
}

function MoreActionRow({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: ReactNode
  label: string
  onPress: () => void
  testID?: string
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" style={({ pressed }) => [styles.actionRow, pressed ? styles.actionRowPressed : null]} testID={testID} onPress={onPress}>
      <View style={styles.actionRowContent}>
        <View style={styles.actionIcon}>{icon}</View>
        <Text numberOfLines={1} style={styles.actionText}>{label}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  actionIcon: {
    width: desktopToolbarActionParity.iconSize,
    alignItems: 'center',
  },
  actionRow: {
    minWidth: 0,
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 4,
    paddingHorizontal: mobileSpace.sm,
    paddingVertical: mobileSpace.sm,
  },
  actionRowContent: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpace.sm,
  },
  actionRowPressed: {
    backgroundColor: mobileColors.control,
  },
  actionText: {
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
  },
  content: {
    gap: mobileSpace.md,
    padding: mobileSpace.md,
  },
  scrollArea: {
    flexShrink: 1,
  },
  summary: {
    minWidth: 0,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: mobileSpace.md,
  },
  summaryTitle: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
    fontWeight: '500',
  },
})
