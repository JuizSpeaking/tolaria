import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const aiControlStyles = StyleSheet.create({
  aiInput: {
    minHeight: 38,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.canvas,
  },
  aiPrompt: {
    minHeight: 126,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    padding: spacing.md,
    backgroundColor: colors.canvas,
  },
  aiSendButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  aiSendButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  aiSettingsButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
  },
  aiSettingsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
})
