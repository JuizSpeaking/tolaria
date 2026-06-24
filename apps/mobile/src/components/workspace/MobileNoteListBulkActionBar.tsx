import type { ReactNode } from 'react'
import { ArchiveIcon, CheckCircle, Trash, X } from 'phosphor-react-native'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { mobileColors, mobileRadius, mobileSpace } from '../../ui/tokens'

type MobileNoteListBulkActionBarProps = {
  archivedMode: boolean
  count: number
  onArchiveToggle: () => void
  onClear: () => void
  onDelete: () => void
  onOrganize: () => void
}

export function MobileNoteListBulkActionBar({
  archivedMode,
  count,
  onArchiveToggle,
  onClear,
  onDelete,
  onOrganize,
}: MobileNoteListBulkActionBarProps) {
  return (
    <View style={styles.bar} testID="note-list-bulk-action-bar">
      <Text style={styles.count} testID="note-list-bulk-selected-count">{selectedCountLabel(count)}</Text>
      <View style={styles.actions}>
        <BulkActionButton
          accessibilityLabel={mobileText('noteList.bulk.organize')}
          testID="note-list-bulk-organize"
          onPress={onOrganize}
        >
          <CheckCircle color={mobileColors.textInverse} size={16} weight="fill" />
        </BulkActionButton>
        <BulkActionButton
          accessibilityLabel={mobileText(archivedMode ? 'noteList.bulk.unarchive' : 'noteList.bulk.archive')}
          testID="note-list-bulk-archive"
          onPress={onArchiveToggle}
        >
          <ArchiveIcon color={mobileColors.textInverse} size={16} />
        </BulkActionButton>
        <BulkActionButton
          accessibilityLabel={mobileText('noteList.bulk.delete')}
          destructive
          testID="note-list-bulk-delete"
          onPress={onDelete}
        >
          <Trash color={mobileColors.textInverse} size={16} />
        </BulkActionButton>
        <BulkActionButton
          accessibilityLabel={mobileText('noteList.bulk.clear')}
          subtle
          testID="note-list-bulk-clear"
          onPress={onClear}
        >
          <X color={mobileColors.textInverse} size={16} />
        </BulkActionButton>
      </View>
    </View>
  )
}

function BulkActionButton({
  accessibilityLabel,
  children,
  destructive = false,
  onPress,
  subtle = false,
  testID,
}: {
  accessibilityLabel: string
  children: ReactNode
  destructive?: boolean
  onPress: () => void
  subtle?: boolean
  testID: string
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={[styles.action, destructive ? styles.destructiveAction : null, subtle ? styles.subtleAction : null]}
      testID={testID}
    >
      {children}
    </Pressable>
  )
}

function selectedCountLabel(count: number) {
  return mobileText('noteList.bulk.selectedCount').replace('{count}', count.toLocaleString())
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: mobileRadius.lg,
    height: 32,
    width: 32,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.xs,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: mobileColors.text,
    flexDirection: 'row',
    height: 44,
    justifyContent: 'space-between',
    paddingHorizontal: mobileSpace.md,
  },
  count: {
    color: mobileColors.textInverse,
    fontSize: 13,
    fontWeight: '500',
  },
  destructiveAction: {
    backgroundColor: mobileColors.danger,
  },
  subtleAction: {
    backgroundColor: 'transparent',
  },
})
