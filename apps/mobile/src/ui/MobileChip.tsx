import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Badge } from '../components/ui/badge'
import { Text } from '../components/ui/text'
import { cn } from '../components/ui/utils'
import { desktopPropertyParity } from './desktopParity'
import { mobileColors } from './tokens'

type MobileChipTone = 'blue' | 'gray' | 'green' | 'orange' | 'purple' | 'red' | 'yellow'
type MobileChipDensity = 'list' | 'property'

export function MobileChip({
  density = 'property',
  label,
  style,
  tone = 'green',
}: {
  density?: MobileChipDensity
  label: string
  style?: StyleProp<ViewStyle>
  tone?: MobileChipTone
}) {
  const chipStyle = density === 'list' ? listChipStyles[tone] : propertyChipStyles[tone]
  const badgeStyle = Platform.OS === 'web'
    ? [chipStyle, style]
    : [styles.base, nativeDensityStyles[density], chipStyle, style]
  const chipTextStyle = density === 'list' ? textStyles.list : textStyles.property

  return (
    <Badge className={cn('border-transparent', densityClassNames[density])} style={badgeStyle} variant="secondary">
      <Text numberOfLines={1} style={[chipTextStyle, { color: chipTextColors[tone] }]}>{label}</Text>
    </Badge>
  )
}

const densityClassNames: Record<MobileChipDensity, string> = {
  list: 'rounded-md px-1.5 py-0.5',
  property: 'rounded-md',
}

const chipBackgroundColors: Record<MobileChipTone, string> = {
  blue: mobileColors.blueSoft,
  gray: mobileColors.graySoft,
  green: mobileColors.greenSoft,
  orange: mobileColors.orangeSoft,
  purple: mobileColors.purpleSoft,
  red: mobileColors.redSoft,
  yellow: mobileColors.yellowSoft,
}

const chipTextColors: Record<MobileChipTone, string> = {
  blue: mobileColors.blue,
  gray: mobileColors.textMuted,
  green: mobileColors.green,
  orange: mobileColors.orange,
  purple: mobileColors.purple,
  red: mobileColors.red,
  yellow: mobileColors.yellow,
}

const listChipStyles = Object.fromEntries(
  Object.entries(chipBackgroundColors).map(([tone, backgroundColor]) => [tone, { backgroundColor }]),
) as Record<MobileChipTone, ViewStyle>

const propertyChipStyles = Object.fromEntries(
  Object.entries(chipBackgroundColors).map(([tone, backgroundColor]) => [
    tone,
    {
      backgroundColor,
      borderRadius: desktopPropertyParity.chipRadius,
      height: desktopPropertyParity.chipHeight,
      paddingHorizontal: desktopPropertyParity.chipPaddingHorizontal,
    },
  ]),
) as Record<MobileChipTone, ViewStyle>

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'transparent',
    borderWidth: 0,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  list: {
    minHeight: 18,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  property: {
    borderRadius: desktopPropertyParity.chipRadius,
  },
})

const nativeDensityStyles = {
  list: styles.list,
  property: styles.property,
} as const

const textStyles = {
  list: {
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
  property: {
    fontSize: desktopPropertyParity.chipTextSize,
    fontWeight: '500' as const,
    lineHeight: desktopPropertyParity.chipHeight,
  },
}
