import type { ReactNode } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../components/ui/text'
import { desktopNoteItemParity } from './desktopParity'
import { mobileColors, mobileSpace, mobileType } from './tokens'

type MobileListRowProps = {
  chips?: ReactNode
  leading?: ReactNode
  meta?: string
  onPress?: () => void
  selected?: boolean
  selectedBackgroundColor?: string
  selectedBorderColor?: string
  subtitle: string
  testID?: string
  title: string
  trailing?: ReactNode
}

const nativeNoteRowPadding = {
  bottom: desktopNoteItemParity.padding.bottom + 2,
  left: desktopNoteItemParity.padding.left + 4,
  right: desktopNoteItemParity.padding.right + 4,
  top: desktopNoteItemParity.padding.top + 2,
} as const

const noteRowPadding = Platform.OS === 'web' ? desktopNoteItemParity.padding : nativeNoteRowPadding
const selectedPaddingLeft = Platform.OS === 'web'
  ? desktopNoteItemParity.selectedPaddingLeft
  : nativeNoteRowPadding.left
const baseContentStyle = {
  paddingBottom: noteRowPadding.bottom,
  paddingLeft: noteRowPadding.left,
  paddingRight: noteRowPadding.right,
  paddingTop: noteRowPadding.top,
} as const

export function MobileListRow(props: MobileListRowProps) {
  const selected = props.selected ?? false
  const frameColors = selected ? {
    backgroundColor: props.selectedBackgroundColor,
    borderLeftColor: props.selectedBorderColor,
  } : null

  return (
    <View
      testID={props.testID}
      style={[styles.frame, selected ? styles.selected : null, frameColors]}
    >
      <Pressable
        accessibilityRole="button"
        onPress={props.onPress}
        style={selected ? styles.baseSelected : styles.base}
      >
        <View style={styles.header}>
          {props.leading}
          <Text numberOfLines={1} style={[styles.title, selected ? styles.titleSelected : null]}>{props.title}</Text>
          {props.trailing}
        </View>
        <Text numberOfLines={2} style={styles.subtitle}>{props.subtitle}</Text>
        <View style={styles.footer}>
          {props.chips}
          {props.meta ? <Text style={styles.meta}>{props.meta}</Text> : null}
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  base: baseContentStyle,
  baseSelected: {
    ...baseContentStyle,
    paddingLeft: selectedPaddingLeft,
  },
  frame: {
    alignSelf: 'stretch',
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'transparent',
    borderLeftWidth: 0,
    overflow: 'hidden',
    width: '100%',
  },
  footer: {
    marginTop: desktopNoteItemParity.contentGap,
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
  },
  meta: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
  },
  selected: {
    borderLeftWidth: desktopNoteItemParity.borderLeftWidth,
  },
  subtitle: {
    marginTop: desktopNoteItemParity.contentGap,
    color: mobileColors.textMuted,
    fontSize: desktopNoteItemParity.snippetTextSize,
    lineHeight: desktopNoteItemParity.snippetLineHeight,
  },
  title: {
    flex: 1,
    color: mobileColors.text,
    fontSize: desktopNoteItemParity.titleTextSize,
    fontWeight: '500',
    lineHeight: desktopNoteItemParity.titleLineHeight,
  },
  titleSelected: {
    fontWeight: '600',
  },
})
