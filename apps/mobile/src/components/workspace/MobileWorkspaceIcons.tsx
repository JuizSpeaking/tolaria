import { StyleSheet } from 'react-native'
import { Text } from '../ui/text'
import type { MobileFileKind, MobileTone } from '../../workspace/mobileWorkspaceModel'
import {
  mobilePhosphorIconElement,
  normalizeIconKey,
  requiredMobilePhosphorIcon,
} from './MobileWorkspaceIconResolver'
import { noteTypeColor } from './mobileWorkspaceTone'

export function MobileTypeIcon({
  size,
  tone,
  type,
  fileKind,
}: {
  fileKind?: MobileFileKind
  size: number
  tone: MobileTone
  type: string
}) {
  const color = noteTypeColor(tone)

  if (fileKind === 'binary') {
    return <FileDashedIcon color={color} size={size} />
  }

  if (fileKind === 'text') {
    return <FileTextIcon color={color} size={size} />
  }

  return mobilePhosphorIconElement(mobileTypeIconKey(type), { color, size }) ?? <FileTextIcon color={color} size={size} />
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

  if (isRemoteIcon(trimmedIcon)) return <FileTextIcon color={color} size={size} testID={testID} />

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
  return mobilePhosphorIconElement(icon, props)
}

function mobileTypeIconKey(type: string): string {
  const normalizedType = normalizeIconKey(type)
  const semanticIcon = semanticTypeIconKey(normalizedType)
  if (semanticIcon) return semanticIcon

  return type
}

function semanticTypeIconKey(normalizedType: string | null): string | null {
  if (!normalizedType) return null
  if (normalizedType.includes('release')) return 'archive'
  if (normalizedType.includes('procedure')) return 'stacksimple'
  if (normalizedType.includes('project')) return 'folderopen'
  return null
}

function isRemoteIcon(value: string) {
  return /^https?:\/\//iu.test(value)
}

const FileTextIcon = requiredMobilePhosphorIcon('filetext')
const FileDashedIcon = requiredMobilePhosphorIcon('filedashed')

const styles = StyleSheet.create({
  noteIconText: {
    flexShrink: 0,
    minWidth: 0,
  },
})
