import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const aiStyles = StyleSheet.create({
  aiContent: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  aiContextCard: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    backgroundColor: colors.primarySoft,
  },
  aiContextTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  aiContextDetail: {
    marginTop: 3,
    color: colors.textSoft,
    fontSize: 12,
  },
  aiEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  aiEmptyTitle: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  aiEmptyDescription: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  aiResponse: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
})
