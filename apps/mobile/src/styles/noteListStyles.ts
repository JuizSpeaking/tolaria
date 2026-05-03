import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const noteListStyles = StyleSheet.create({
  noteList: {
    width: 360,
    flex: 1,
    maxWidth: 390,
    borderRightColor: colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.canvas,
  },
  noteListContent: {
    paddingBottom: 104,
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  noteRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  noteRowSelected: {
    backgroundColor: colors.selected,
    borderLeftColor: '#59b57c',
    borderLeftWidth: 3,
  },
  noteRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  noteTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  noteSnippet: {
    marginTop: spacing.sm,
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 21,
  },
  noteMetaRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteMeta: {
    color: colors.mutedText,
    fontSize: 12,
  },
  composeButton: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: colors.primary,
  },
})
