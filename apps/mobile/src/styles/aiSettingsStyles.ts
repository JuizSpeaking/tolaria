import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const aiSettingsStyles = StyleSheet.create({
  aiSettingsContent: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  aiSettingsSectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  aiSettingsDescription: {
    color: colors.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  aiSettingsEmpty: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.mutedText,
    fontSize: 13,
    padding: spacing.md,
    backgroundColor: colors.canvas,
  },
  aiProviderList: {
    gap: spacing.sm,
  },
  aiProviderRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.canvas,
  },
  aiProviderText: {
    flex: 1,
  },
  aiProviderTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  aiProviderDetail: {
    marginTop: 3,
    color: colors.mutedText,
    fontSize: 12,
  },
})
