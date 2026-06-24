import type { MobileSidebarIcon, MobileTone } from './mobileWorkspaceModel'

const iconAliases: Record<string, MobileSidebarIcon> = {
  archive: 'archive',
  bookbookmark: 'bookbookmark',
  calendarblank: 'calendarblank',
  file: 'file',
  filetext: 'file',
  folder: 'folder',
  folderopen: 'folder',
  funnel: 'view',
  inbox: 'inbox',
  note: 'file',
  procedure: 'procedure',
  stack: 'procedure',
  stacksimple: 'procedure',
  star: 'star',
  tag: 'tag',
  tray: 'inbox',
  view: 'view',
}

export function mobileSidebarIconFromValue(
  value: string | null | undefined,
  fallback: MobileSidebarIcon,
): MobileSidebarIcon {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '')
  return normalized ? iconAliases[normalized] ?? normalized : fallback
}

export function mobileToneFromValue(
  value: string | null | undefined,
  fallback: MobileTone = 'gray',
): MobileTone {
  if (value === 'blue') return 'blue'
  if (value === 'green') return 'green'
  if (value === 'orange') return 'orange'
  if (value === 'purple') return 'purple'
  if (value === 'red') return 'red'
  if (value === 'yellow') return 'yellow'

  return value === 'gray' ? 'gray' : fallback
}
