import {
  Archive,
  Books,
  Drop,
  FileText,
  Flag,
  GitBranch,
  PenNib,
  Sun,
  Tray,
  Wrench,
} from 'phosphor-react-native'

export type IconName = 'archive' | 'books' | 'drop' | 'file-text' | 'flag' | 'git-branch' | 'pen-nib' | 'sun' | 'tray' | 'wrench'

const iconByName = {
  archive: Archive,
  books: Books,
  drop: Drop,
  'file-text': FileText,
  flag: Flag,
  'git-branch': GitBranch,
  'pen-nib': PenNib,
  sun: Sun,
  tray: Tray,
  wrench: Wrench,
} as const

export function NamedIcon({ color, name, size }: { color: string; name: IconName; size: number }) {
  const Icon = iconByName[name]
  return <Icon color={color} size={size} weight="regular" />
}
