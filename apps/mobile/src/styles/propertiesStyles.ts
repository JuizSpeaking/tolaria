import { StyleSheet } from 'react-native'
import { colors, spacing } from '../theme'

export const propertiesStyles = StyleSheet.create({
  properties: {
    width: 300,
    borderLeftColor: colors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.sidebar,
  },
  propertiesContent: {
    padding: spacing.lg,
  },
  propertiesTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  propertyRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  propertyLabel: {
    width: 92,
    color: colors.mutedText,
    fontSize: 14,
  },
  propertyValue: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  propertyGroupTitle: {
    marginTop: spacing.xl,
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  historyItem: {
    marginTop: spacing.md,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
})
