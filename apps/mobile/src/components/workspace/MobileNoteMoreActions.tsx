import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import {
  Archive,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowSquareOut,
  ArrowsInLineHorizontal,
  ArrowsOutLineHorizontal,
  CheckCircle,
  ClipboardText,
  FolderOpen,
  MagnifyingGlass,
  MapTrifold,
  PencilSimple,
  ShareNetwork,
  Smiley,
  Star,
  Tag,
  TextAa,
  Trash,
} from 'phosphor-react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type { MobileNote } from '../../workspace/mobileWorkspaceModel'

type NoteMoreActionRowsProps = {
  canRedoWorkspaceEdit: boolean
  canUndoWorkspaceEdit: boolean
  note: MobileNote
  onClose: () => void
  onDeleteNote: () => void
  onEnterNeighborhood: (noteId: string) => void
  onCopyFilePath: () => void
  onOpenFileInDefaultApp: () => void
  onOpenChangeNoteType: () => void
  onOpenFindInNote: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenReplaceInNote: () => void
  onOpenRenameNoteFile: () => void
  onOpenSetNoteIcon: () => void
  onRevealFile: () => void
  onRenameNoteFileToTitle: () => void
  onRedoWorkspaceEdit: () => void
  onRemoveNoteIcon: () => void
  onSetArchived: (archived: boolean) => void
  onSetOrganized: (organized: boolean) => void
  onToggleFavorite: () => void
  onToggleNoteWidth: () => void
  onUndoWorkspaceEdit: () => void
}

export function NoteMoreActionRows(props: NoteMoreActionRowsProps) {
  const { note } = props
  if (!isMarkdownNote(note)) return <NonMarkdownFileActionRows {...props} />

  const wideNote = note.noteWidth === 'wide'

  return (
    <>
      <NoteStateActionRows {...props} />
      <NoteEditorActionRows {...props} />
      <NoteNavigationActionRows {...props} />
      <NoteHistoryActionRows {...props} />
      <NoteIconActionRows {...props} />
      <NoteFileActionRows {...props} />
      <NoteWidthActionRow noteWide={wideNote} onClose={props.onClose} onToggleNoteWidth={props.onToggleNoteWidth} />
      <DeleteActionRow onClose={props.onClose} onDeleteNote={props.onDeleteNote} />
    </>
  )
}

function NonMarkdownFileActionRows({
  onClose,
  onCopyFilePath,
  onOpenFileInDefaultApp,
  onRevealFile,
}: Pick<NoteMoreActionRowsProps, 'onClose' | 'onCopyFilePath' | 'onOpenFileInDefaultApp' | 'onRevealFile'>) {
  return (
    <>
      <NotePathActionRows
        onClose={onClose}
        onCopyFilePath={onCopyFilePath}
        onRevealFile={onRevealFile}
      />
      <ActionRow
        icon={<ShareNetwork color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('editor.toolbar.openFileInDefaultApp')}
        testID="workspace-action-open-default-app"
        onPress={() => {
          onOpenFileInDefaultApp()
          onClose()
        }}
      />
    </>
  )
}

function NoteHistoryActionRows({
  canRedoWorkspaceEdit,
  canUndoWorkspaceEdit,
  onClose,
  onRedoWorkspaceEdit,
  onUndoWorkspaceEdit,
}: {
  canRedoWorkspaceEdit: boolean
  canUndoWorkspaceEdit: boolean
  onClose: () => void
  onRedoWorkspaceEdit: () => void
  onUndoWorkspaceEdit: () => void
}) {
  return (
    <>
      {canUndoWorkspaceEdit ? (
        <ActionRow
          icon={<ArrowCounterClockwise color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
          label={mobileText('command.note.undo')}
          testID="workspace-action-undo-edit"
          onPress={() => {
            onUndoWorkspaceEdit()
            onClose()
          }}
        />
      ) : null}
      {canRedoWorkspaceEdit ? (
        <ActionRow
          icon={<ArrowClockwise color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
          label={mobileText('command.note.redo')}
          testID="workspace-action-redo-edit"
          onPress={() => {
            onRedoWorkspaceEdit()
            onClose()
          }}
        />
      ) : null}
    </>
  )
}

function NoteStateActionRows({
  note,
  onClose,
  onSetArchived,
  onSetOrganized,
  onToggleFavorite,
}: {
  note: MobileNote
  onClose: () => void
  onSetArchived: (archived: boolean) => void
  onSetOrganized: (organized: boolean) => void
  onToggleFavorite: () => void
}) {
  return (
    <>
      <NoteFlagActionRow
        active={note.favorite === true}
        activeLabelKey="command.note.removeFavorite"
        icon={<Star color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight={note.favorite ? 'fill' : 'regular'} />}
        inactiveLabelKey="command.note.addFavorite"
        testID="workspace-action-toggle-favorite"
        onPress={() => {
          onToggleFavorite()
          onClose()
        }}
      />
      <NoteFlagActionRow
        active={note.organized === true}
        activeLabelKey="command.note.markUnorganized"
        icon={<CheckCircle color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight={note.organized ? 'fill' : 'regular'} />}
        inactiveLabelKey="command.note.markOrganized"
        testID="workspace-action-organize-note"
        onPress={() => {
          onSetOrganized(!note.organized)
          onClose()
        }}
      />
      <NoteFlagActionRow
        active={note.archived === true}
        activeLabelKey="command.note.unarchiveNote"
        icon={<Archive color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        inactiveLabelKey="command.note.archiveNote"
        testID="workspace-action-archive-note"
        onPress={() => {
          onSetArchived(!note.archived)
          onClose()
        }}
      />
    </>
  )
}

function NoteEditorActionRows({
  onOpenFindInNote,
  onOpenReplaceInNote,
}: {
  onOpenFindInNote: () => void
  onOpenReplaceInNote: () => void
}) {
  return (
    <>
      <ActionRow
        icon={<MagnifyingGlass color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.findInNote')}
        testID="workspace-action-find-in-note"
        onPress={onOpenFindInNote}
      />
      <ActionRow
        icon={<TextAa color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.replaceInNote')}
        testID="workspace-action-replace-in-note"
        onPress={onOpenReplaceInNote}
      />
    </>
  )
}

function NoteNavigationActionRows({
  note,
  onClose,
  onEnterNeighborhood,
}: {
  note: MobileNote
  onClose: () => void
  onEnterNeighborhood: (noteId: string) => void
}) {
  return (
    <ActionRow
      icon={<MapTrifold color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
      label={mobileText('editor.toolbar.openNeighborhood')}
      testID="workspace-action-open-neighborhood"
      onPress={() => {
        onEnterNeighborhood(note.id)
        onClose()
      }}
    />
  )
}

function NoteIconActionRows({
  note,
  onOpenSetNoteIcon,
  onRemoveNoteIcon,
}: {
  note: MobileNote
  onOpenSetNoteIcon: () => void
  onRemoveNoteIcon: () => void
}) {
  return (
    <>
      <ActionRow
        icon={<Smiley color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.setIcon')}
        testID="workspace-action-set-note-icon"
        onPress={onOpenSetNoteIcon}
      />
      {note.icon ? (
        <ActionRow
          icon={<Smiley color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
          label={mobileText('command.note.removeIcon')}
          testID="workspace-action-remove-note-icon"
          onPress={onRemoveNoteIcon}
        />
      ) : null}
    </>
  )
}

function NoteFileActionRows({
  onClose,
  onCopyFilePath,
  onOpenChangeNoteType,
  onOpenMoveNoteToFolder,
  onOpenRenameNoteFile,
  onRevealFile,
  onRenameNoteFileToTitle,
}: {
  onClose: () => void
  onCopyFilePath: () => void
  onOpenChangeNoteType: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenRenameNoteFile: () => void
  onRevealFile: () => void
  onRenameNoteFileToTitle: () => void
}) {
  return (
    <>
      <ActionRow
        icon={<Tag color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.changeType')}
        testID="workspace-action-change-note-type"
        onPress={onOpenChangeNoteType}
      />
      <ActionRow
        icon={<PencilSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('editor.filename.rename')}
        testID="workspace-action-rename-file"
        onPress={onOpenRenameNoteFile}
      />
      <ActionRow
        icon={<PencilSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('editor.filename.renameToTitle')}
        testID="workspace-action-rename-file-to-title"
        onPress={() => {
          onRenameNoteFileToTitle()
          onClose()
        }}
      />
      <ActionRow
        icon={<FolderOpen color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.moveToFolder')}
        testID="workspace-action-move-note-folder"
        onPress={onOpenMoveNoteToFolder}
      />
      <NotePathActionRows
        onClose={onClose}
        onCopyFilePath={onCopyFilePath}
        onRevealFile={onRevealFile}
      />
    </>
  )
}

function NotePathActionRows({
  onClose,
  onCopyFilePath,
  onRevealFile,
}: Pick<NoteMoreActionRowsProps, 'onClose' | 'onCopyFilePath' | 'onRevealFile'>) {
  return (
    <>
      <ActionRow
        icon={<ClipboardText color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('editor.toolbar.copyFilePath')}
        testID="workspace-action-copy-file-path"
        onPress={() => {
          onCopyFilePath()
          onClose()
        }}
      />
      <ActionRow
        icon={<ArrowSquareOut color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('editor.toolbar.revealFile')}
        testID="workspace-action-reveal-file"
        onPress={() => {
          onRevealFile()
          onClose()
        }}
      />
    </>
  )
}

function NoteWidthActionRow({
  noteWide,
  onClose,
  onToggleNoteWidth,
}: {
  noteWide: boolean
  onClose: () => void
  onToggleNoteWidth: () => void
}) {
  return (
    <ActionRow
      icon={noteWide
        ? <ArrowsInLineHorizontal color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        : <ArrowsOutLineHorizontal color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
      label={mobileText(noteWide ? 'editor.toolbar.noteWidthNormal' : 'editor.toolbar.noteWidthWide')}
      testID="workspace-action-toggle-note-width"
      onPress={() => {
        onToggleNoteWidth()
        onClose()
      }}
    />
  )
}

function NoteFlagActionRow({
  active,
  activeLabelKey,
  icon,
  inactiveLabelKey,
  onPress,
  testID,
}: {
  active: boolean
  activeLabelKey: Parameters<typeof mobileText>[0]
  icon: ReactNode
  inactiveLabelKey: Parameters<typeof mobileText>[0]
  onPress: () => void
  testID: string
}) {
  return (
    <ActionRow
      icon={icon}
      label={mobileText(active ? activeLabelKey : inactiveLabelKey)}
      testID={testID}
      onPress={onPress}
    />
  )
}

function DeleteActionRow({
  onClose,
  onDeleteNote,
}: {
  onClose: () => void
  onDeleteNote: () => void
}) {
  return (
    <ActionRow
      destructive
      icon={<Trash color={mobileColors.red} size={desktopToolbarActionParity.iconSize} />}
      label={mobileText('command.note.deleteNote')}
      testID="workspace-action-delete-note"
      onPress={() => {
        onDeleteNote()
        onClose()
      }}
    />
  )
}

function ActionRow({
  icon,
  destructive = false,
  label,
  onPress,
  testID,
}: {
  destructive?: boolean
  icon: ReactNode
  label: string
  onPress: () => void
  testID?: string
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" style={({ pressed }) => [styles.actionRow, pressed ? styles.actionRowPressed : null]} testID={testID} onPress={onPress}>
      <View style={styles.actionRowContent}>
        <View style={styles.actionIcon}>{icon}</View>
        <Text numberOfLines={1} style={[styles.actionText, destructive ? styles.actionTextDestructive : null]}>{label}</Text>
      </View>
    </Pressable>
  )
}

function isMarkdownNote(note: MobileNote): boolean {
  return (note.fileKind ?? 'markdown') === 'markdown'
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
  actionTextDestructive: {
    color: mobileColors.red,
  },
})
