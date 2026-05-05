import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const aiProviderKindStyles = StyleSheet.create({
  aiProviderKindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aiProviderKindChip: {
    minHeight: 32,
    justifyContent: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.canvas,
  },
  aiProviderKindChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  aiProviderKindText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  aiProviderKindTextSelected: {
    color: colors.primary,
  },
})
