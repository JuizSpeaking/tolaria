import { StyleSheet } from 'react-native'
import { colors, radii, spacing } from '../theme'

export const commonStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.appBackground,
  },
  tabletShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.canvas,
  },
  toolbar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  toolbarSpacer: {
    flex: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#ffffff',
  },
  pressed: {
    opacity: 0.65,
  },
  tagRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    overflow: 'hidden',
    borderRadius: radii.sm,
    backgroundColor: colors.chipGreen,
    color: '#3f8a5c',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
})
