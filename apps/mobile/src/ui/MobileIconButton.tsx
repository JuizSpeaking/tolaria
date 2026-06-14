import type { ReactNode } from 'react'
import { StyleSheet } from 'react-native'
import { Button } from '../components/ui/button'
import { cn } from '../components/ui/utils'
import { desktopToolbarActionParity } from './desktopParity'

type MobileIconButtonDensity = 'default' | 'toolbar'

export function MobileIconButton({
  accessibilityLabel,
  children,
  density = 'toolbar',
  onPress,
  selected = false,
  testID,
}: {
  accessibilityLabel: string
  children: ReactNode
  density?: MobileIconButtonDensity
  onPress?: () => void
  selected?: boolean
  testID?: string
}) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      className={cn(iconButtonDensityClassNames[density], 'active:opacity-70', selected ? 'bg-accent' : 'bg-transparent')}
      hitSlop={desktopToolbarActionParity.hitSlop}
      onPress={onPress}
      size="icon"
      style={iconButtonStyles[density]}
      testID={testID}
      variant={selected ? 'secondary' : 'ghost'}
    >
      {children}
    </Button>
  )
}

const styles = StyleSheet.create({
  default: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 6,
    flexDirection: 'row',
  },
  toolbar: {
    alignItems: 'center',
    justifyContent: 'center',
    width: desktopToolbarActionParity.iconButtonSize,
    height: desktopToolbarActionParity.iconButtonSize,
    borderRadius: desktopToolbarActionParity.borderRadius,
    flexDirection: 'row',
  },
})

const iconButtonDensityClassNames: Record<MobileIconButtonDensity, string> = {
  default: '!h-9 !w-9 rounded-md',
  toolbar: '!h-6 !w-6 !rounded',
}

const iconButtonStyles = {
  default: styles.default,
  toolbar: styles.toolbar,
} as const
