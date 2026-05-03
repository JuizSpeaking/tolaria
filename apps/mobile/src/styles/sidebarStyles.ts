import { StyleSheet } from 'react-native'
import { colors, radii, spacing } from '../theme'

export const sidebarStyles = StyleSheet.create({
  sidebar: {
    width: 272,
    borderRightColor: colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.sidebar,
  },
  sidebarContent: {
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  sidebarSection: {
    marginBottom: spacing.lg,
  },
  sidebarSectionTitle: {
    marginBottom: spacing.sm,
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sidebarItem: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
  },
  sidebarItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  sidebarItemText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  sidebarCount: {
    color: colors.mutedText,
    fontSize: 13,
  },
})
