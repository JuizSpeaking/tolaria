import { describe, expect, it } from 'vitest'
import { createMobileSidebarSections, filterNotesForSidebarSelection, mobileSidebarTitle } from './mobileSidebarNavigation'
import type { MobileNote } from './mobileNoteProjection'
import { mobileFixtureViewDefinitions } from './mobileViewFilters'

describe('mobile sidebar navigation', () => {
  it('filters inbox, all notes, archive, and type selections', () => {
    const notes = [
      note({ id: 'draft', status: 'Draft', type: 'Essay' }),
      note({ id: 'active', status: 'Active', type: 'Project' }),
      note({ archived: true, id: 'archived', type: 'Essay' }),
    ]

    expect(filterNotesForSidebarSelection({ notes, selection: { kind: 'library', id: 'inbox' } }).map((item) => item.id)).toEqual(['draft'])
    expect(filterNotesForSidebarSelection({ notes, selection: { kind: 'library', id: 'all' } }).map((item) => item.id)).toEqual(['draft', 'active'])
    expect(filterNotesForSidebarSelection({ notes, selection: { kind: 'library', id: 'archive' } }).map((item) => item.id)).toEqual(['archived'])
    expect(filterNotesForSidebarSelection({ notes, selection: { kind: 'type', type: 'Project' } }).map((item) => item.id)).toEqual(['active'])
  })

  it('filters favorites and saved nested views', () => {
    const notes = [
      note({ favorite: true, id: 'essay', status: 'Active', tags: ['mobile'], type: 'Essay' }),
      note({ id: 'draft', relatedTo: ['mobile-roadmap'], status: 'Draft', type: 'Note' }),
      note({ id: 'ignored', status: 'Done', type: 'Project' }),
    ]

    expect(filterNotesForSidebarSelection({ notes, selection: { kind: 'library', id: 'favorites' } }).map((item) => item.id)).toEqual(['essay'])
    expect(filterNotesForSidebarSelection({
      notes,
      selection: { kind: 'view', id: 'active-drafts' },
      views: mobileFixtureViewDefinitions,
    }).map((item) => item.id)).toEqual(['draft'])
  })

  it('builds sidebar sections from current local notes', () => {
    const sections = createMobileSidebarSections([
      note({ id: 'draft', status: 'Draft', type: 'Essay' }),
      note({ id: 'active', status: 'Active', type: 'Project' }),
      note({ archived: true, id: 'archived', type: 'Essay' }),
    ])

    expect(sections[0].items.map((item) => [item.label, item.count])).toEqual([
      ['Inbox', 1],
      ['All Notes', 2],
      ['Archive', 1],
      ['Favorites', 0],
    ])
    expect(sections[1].items.map((item) => item.label)).toEqual(['Essays', 'Projects'])
  })

  it('does not expose fixture views unless persisted view definitions are supplied', () => {
    expect(createMobileSidebarSections([note({ id: 'draft', status: 'Draft', type: 'Essay' })]).map((section) => section.title)).toEqual(['Library', 'Types'])
    expect(createMobileSidebarSections([
      note({ id: 'draft', status: 'Draft', type: 'Essay' }),
    ], mobileFixtureViewDefinitions).map((section) => section.title)).toEqual(['Library', 'Views', 'Types'])
  })

  it('formats list titles for library and type selections', () => {
    expect(mobileSidebarTitle({ kind: 'library', id: 'all' })).toBe('All Notes')
    expect(mobileSidebarTitle({ kind: 'type', type: 'Essay' })).toBe('Essays')
  })
})

function note({
  archived = false,
  favorite = false,
  id,
  relatedTo = [],
  status,
  tags = [],
  type,
}: {
  archived?: boolean
  favorite?: boolean
  id: string
  relatedTo?: string[]
  status?: string
  tags?: string[]
  type: string
}): MobileNote {
  return {
    archived,
    backlinks: [],
    belongsTo: [],
    content: `# ${id}`,
    customProperties: {},
    date: '',
    favorite,
    favoriteIndex: null,
    has: [],
    icon: 'file-text',
    id,
    modified: '',
    outgoingLinks: [],
    relatedTo,
    relationships: {},
    snippet: '',
    status,
    tags,
    title: id,
    type,
    words: 1,
  }
}
