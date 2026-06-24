import * as PhosphorIcons from 'phosphor-react-native'
import type { Icon } from 'phosphor-react-native'

export function mobilePhosphorIconElement(
  icon: string | null | undefined,
  props: {
    color: string
    size: number
    testID?: string
  },
) {
  const IconComponent = mobilePhosphorIconComponent(icon)
  return IconComponent ? <IconComponent {...props} /> : null
}

export function mobilePhosphorIconComponent(value: string | null | undefined): Icon | null {
  const iconKey = mobilePhosphorIconKey(value)
  return iconKey ? phosphorIconComponents[iconKey] ?? null : null
}

export function mobilePhosphorIconKey(value: string | null | undefined): string | null {
  const normalized = normalizeIconKey(value)
  if (!normalized) return null

  const alias = phosphorIconAliases[normalized]
  if (alias) return alias

  return phosphorIconComponents[normalized] ? normalized : null
}

export function normalizeIconKey(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '')
  return normalized || null
}

export function requiredMobilePhosphorIcon(key: string): Icon {
  return phosphorIconComponents[key] ?? phosphorIconComponents.filetext
}

const phosphorIconAliases: Record<string, string> = {
  area: 'palette',
  archive: 'archive',
  bookbookmark: 'bookbookmark',
  calendarblank: 'calendarblank',
  file: 'filetext',
  filetext: 'filetext',
  folder: 'folderopen',
  folderopen: 'folderopen',
  goal: 'target',
  inbox: 'tray',
  journal: 'bookbookmark',
  movie: 'ticket',
  note: 'filetext',
  people: 'users',
  person: 'users',
  procedure: 'stacksimple',
  project: 'folderopen',
  quarter: 'calendarblank',
  resource: 'books',
  resources: 'books',
  responsibility: 'gear',
  sheet: 'calculator',
  stack: 'stacksimple',
  stacksimple: 'stacksimple',
  tray: 'tray',
  view: 'funnel',
  year: 'lighthouse',
}

const phosphorIconComponents = buildPhosphorIconComponents()

function buildPhosphorIconComponents(): Record<string, Icon> {
  return Object.entries(PhosphorIcons).reduce<Record<string, Icon>>((icons, [name, value]) => {
    const key = normalizeIconKey(name)
    if (!key || !isPhosphorIconExport(name, value)) return icons

    icons[key] = value as Icon
    if (key.endsWith('icon')) {
      icons[key.slice(0, -4)] ??= value as Icon
    }
    return icons
  }, {})
}

function isPhosphorIconExport(name: string, value: unknown): boolean {
  if (name === 'IconContext') return false
  if (!/^[A-Z]/u.test(name)) return false
  return typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value)
}
