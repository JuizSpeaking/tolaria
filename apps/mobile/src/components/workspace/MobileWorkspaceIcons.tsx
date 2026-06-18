import {
  Archive,
  FileText,
  FolderOpen,
  Rocket,
  StackSimple,
  Star,
  Tag,
  Tray,
  type Icon,
} from 'phosphor-react-native'
import { StyleSheet } from 'react-native'
import { Text } from '../ui/text'
import type { MobileTone } from '../../workspace/mobileWorkspaceModel'
import { noteTypeColor } from './mobileWorkspaceTone'

export function MobileTypeIcon({
  size,
  tone,
  type,
}: {
  size: number
  tone: MobileTone
  type: string
}) {
  const color = noteTypeColor(tone)
  const normalizedType = type.toLowerCase()

  if (normalizedType.includes('release')) {
    return <Archive color={color} size={size} />
  }

  if (normalizedType.includes('procedure')) {
    return <StackSimple color={color} size={size} />
  }

  if (normalizedType.includes('project')) {
    return <FolderOpen color={color} size={size} />
  }

  return <FileText color={color} size={size} />
}

export function MobileNoteIcon({
  color,
  icon,
  size,
  testID,
}: {
  color: string
  icon: string | null | undefined
  size: number
  testID?: string
}) {
  const trimmedIcon = icon?.trim()
  if (!trimmedIcon) return null

  const iconElement = mobileNoteIconElement(trimmedIcon, { color, size, testID })
  if (iconElement) return iconElement

  return (
    <Text
      numberOfLines={1}
      style={[styles.noteIconText, { color, fontSize: size, lineHeight: size + 2 }]}
      testID={testID}
    >
      {trimmedIcon}
    </Text>
  )
}

function mobileNoteIconElement(
  icon: string,
  props: {
    color: string
    size: number
    testID?: string
  },
) {
  const normalized = icon.toLowerCase().replace(/[^a-z0-9]+/gu, '')
  const IconComponent = noteIconComponents[normalized]
  return IconComponent ? <IconComponent {...props} /> : null
}

const noteIconComponents: Record<string, Icon> = {
  archive: Archive,
  file: FileText,
  folder: FolderOpen,
  inbox: Tray,
  note: FileText,
  procedure: StackSimple,
  rocket: Rocket,
  stack: StackSimple,
  stacksimple: StackSimple,
  star: Star,
  tag: Tag,
  tray: Tray,
}

const styles = StyleSheet.create({
  noteIconText: {
    flexShrink: 0,
    minWidth: 0,
  },
})
