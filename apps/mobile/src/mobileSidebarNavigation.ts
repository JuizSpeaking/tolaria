import type { IconName } from './NamedIcon'
import type { MobileNote } from './mobileNoteProjection'
import { evaluateMobileView, type MobileViewDefinition } from './mobileViewFilters'

export type MobileSidebarSelection =
  | { kind: 'library'; id: 'all' | 'archive' | 'favorites' | 'inbox' }
  | { kind: 'type'; type: string }
  | { kind: 'view'; id: string }

export type MobileSidebarItem = {
  count: number
  icon: IconName
  label: string
  selection: MobileSidebarSelection
}

export type MobileSidebarSection = {
  items: MobileSidebarItem[]
  title: string
}

export const defaultMobileSidebarSelection: MobileSidebarSelection = { kind: 'library', id: 'inbox' }

export function createMobileSidebarSections(
  notes: MobileNote[],
  views: MobileViewDefinition[] = [],
): MobileSidebarSection[] {
  return [
    {
      title: 'Library',
      items: [
        libraryItem({ count: inboxNotes(notes).length, icon: 'tray', id: 'inbox', label: 'Inbox' }),
        libraryItem({ count: activeNotes(notes).length, icon: 'file-text', id: 'all', label: 'All Notes' }),
        libraryItem({ count: archivedNotes(notes).length, icon: 'archive', id: 'archive', label: 'Archive' }),
        libraryItem({ count: favoriteNotes(notes).length, icon: 'star', id: 'favorites', label: 'Favorites' }),
      ],
    },
    ...viewSections({ notes, views }),
    {
      title: 'Types',
      items: noteTypes(notes).map((type) => ({
        count: activeNotes(notes).filter((note) => note.type === type).length,
        icon: iconForType(type),
        label: pluralTypeLabel(type),
        selection: { kind: 'type', type },
      })),
    },
  ]
}

export function filterNotesForSidebarSelection({
  notes,
  selection,
  views = [],
}: {
  notes: MobileNote[]
  selection: MobileSidebarSelection
  views?: MobileViewDefinition[]
}) {
  if (selection.kind === 'type') {
    return activeNotes(notes).filter((note) => note.type === selection.type)
  }

  if (selection.kind === 'view') {
    const view = views.find((definition) => definition.id === selection.id)
    return view ? evaluateMobileView({ notes: activeNotes(notes), view }) : []
  }

  switch (selection.id) {
    case 'all':
      return activeNotes(notes)
    case 'archive':
      return archivedNotes(notes)
    case 'favorites':
      return favoriteNotes(notes)
    default:
      return inboxNotes(notes)
  }
}

export function mobileSidebarTitle(selection: MobileSidebarSelection, views: MobileViewDefinition[] = []) {
  if (selection.kind === 'type') {
    return pluralTypeLabel(selection.type)
  }

  if (selection.kind === 'view') {
    return views.find((definition) => definition.id === selection.id)?.name ?? 'View'
  }

  return libraryTitle(selection.id)
}

export function isMobileSidebarSelectionActive({
  candidate,
  current,
}: {
  candidate: MobileSidebarSelection
  current: MobileSidebarSelection
}) {
  return candidate.kind === current.kind
    && (candidate.kind === 'type' ? candidate.type === (current as { type: string }).type : candidate.id === (current as { id: string }).id)
}

function libraryItem({
  count,
  icon,
  id,
  label,
}: {
  count: number
  icon: IconName
  id: 'all' | 'archive' | 'favorites' | 'inbox'
  label: string
}): MobileSidebarItem {
  return {
    count,
    icon,
    label,
    selection: { kind: 'library', id },
  }
}

function viewSections({
  notes,
  views,
}: {
  notes: MobileNote[]
  views: MobileViewDefinition[]
}): MobileSidebarSection[] {
  return views.length > 0
    ? [{
        title: 'Views',
        items: views.map((view) => ({
          count: evaluateMobileView({ notes: activeNotes(notes), view }).length,
          icon: view.icon as IconName,
          label: view.name,
          selection: { kind: 'view', id: view.id } as const,
        })),
      }]
    : []
}

function inboxNotes(notes: MobileNote[]) {
  return activeNotes(notes).filter((note) => !note.status || note.status === 'Draft')
}

function activeNotes(notes: MobileNote[]) {
  return notes.filter((note) => !note.archived)
}

function archivedNotes(notes: MobileNote[]) {
  return notes.filter((note) => note.archived)
}

function favoriteNotes(notes: MobileNote[]) {
  return activeNotes(notes)
    .filter((note) => note.favorite)
    .sort((left, right) => (left.favoriteIndex ?? Number.MAX_SAFE_INTEGER) - (right.favoriteIndex ?? Number.MAX_SAFE_INTEGER))
}

function noteTypes(notes: MobileNote[]) {
  return [...new Set(activeNotes(notes).map((note) => note.type))].sort()
}

function libraryTitle(id: 'all' | 'archive' | 'favorites' | 'inbox') {
  if (id === 'all') return 'All Notes'
  if (id === 'archive') return 'Archive'
  if (id === 'favorites') return 'Favorites'
  return 'Inbox'
}

function pluralTypeLabel(type: string) {
  return type.endsWith('s') ? type : `${type}s`
}

function iconForType(type: string): IconName {
  if (type === 'Essay') {
    return 'pen-nib'
  }

  if (type === 'Project') {
    return 'wrench'
  }

  if (type === 'Resource') {
    return 'books'
  }

  if (type === 'Release Note') {
    return 'flag'
  }

  return 'file-text'
}
