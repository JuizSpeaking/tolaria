import { describe, expect, it } from 'vitest'
import type { MobileNote } from './mobileWorkspaceModel'
import {
  activeMobilePersonMentionQuery,
  activeMobileWikilinkQuery,
  mobilePersonMentionAutocompleteSuggestions,
  mobileWikilinkAutocompleteSuggestions,
  mobileWikilinkAutocompleteTarget,
  replaceActiveMobilePersonMentionQuery,
  replaceActiveMobileWikilinkQuery,
} from './mobileWikilinkAutocomplete'

describe('mobile wikilink autocomplete', () => {
  it('detects the active unclosed wikilink query at the cursor', () => {
    expect(activeMobileWikilinkQuery('Before [[Proj after', 13)).toEqual({
      cursor: 13,
      query: 'Proj',
      start: 7,
    })
  })

  it('ignores closed and multiline wikilinks', () => {
    expect(activeMobileWikilinkQuery('[[Project]]', 11)).toBeNull()
    expect(activeMobileWikilinkQuery('[[Project\nNext', 10)).toBeNull()
  })

  it('replaces only the active query and preserves trailing text', () => {
    expect(replaceActiveMobileWikilinkQuery('See [[Proj today', 10, 'projects/alpha')).toEqual({
      cursor: 22,
      text: 'See [[projects/alpha]] today',
    })
  })

  it('matches desktop-style title, alias, filename, type, tag, and path candidates', () => {
    const suggestions = mobileWikilinkAutocompleteSuggestions([
      note({
        aliases: ['Important Alpha'],
        path: 'projects/project-alpha.md',
        tags: ['Strategy'],
        title: 'Project Alpha',
        type: 'Project',
      }),
      note({ archived: true, title: 'Archived Alpha' }),
    ], 'important')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual(['Project Alpha'])
    expect(mobileWikilinkAutocompleteSuggestions(suggestions, 'al')).toHaveLength(1)
    expect(mobileWikilinkAutocompleteSuggestions(suggestions, 'str')).toHaveLength(1)
    expect(mobileWikilinkAutocompleteSuggestions(suggestions, 'project-alpha')).toHaveLength(1)
  })

  it('matches wikilink targets when the query omits title diacritics', () => {
    const suggestions = mobileWikilinkAutocompleteSuggestions([
      note({ path: 'journal/cafe-notes.md', title: 'Café Notes' }),
    ], 'Cafe')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual(['Café Notes'])
  })

  it('suppresses wikilink suggestions until the desktop two-character query threshold', () => {
    const notes = [
      note({ path: 'zeta.md', title: 'Zeta' }),
      note({ path: 'alpha.md', title: 'Alpha' }),
      note({ archived: true, path: 'archived-alpha.md', title: 'Archived Alpha' }),
    ]

    expect(mobileWikilinkAutocompleteSuggestions(notes, '')).toEqual([])
    expect(mobileWikilinkAutocompleteSuggestions(notes, 'a')).toEqual([])
    expect(mobileWikilinkAutocompleteSuggestions(notes, 'al').map((suggestion) => suggestion.title)).toEqual(['Alpha'])
  })

  it('ranks desktop-style exact title, alias, and prefix matches ahead of vault order', () => {
    const suggestions = mobileWikilinkAutocompleteSuggestions([
      note({ aliases: ['Refactoring'], path: 'ideas.md', title: 'Refactoring Ideas' }),
      note({ path: 'manual.md', title: 'Refactoring Manual' }),
      note({ path: 'refactoring.md', title: 'Refactoring' }),
    ], 'Refactoring')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual([
      'Refactoring',
      'Refactoring Ideas',
      'Refactoring Manual',
    ])
  })

  it('ranks desktop-style alias exact matches above title prefix matches', () => {
    const suggestions = mobileWikilinkAutocompleteSuggestions([
      note({ path: 'reference.md', title: 'Reference Manual' }),
      note({ aliases: ['ref'], path: 'meeting.md', title: 'Meeting Notes' }),
    ], 'ref')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual([
      'Meeting Notes',
      'Reference Manual',
    ])
  })

  it('deduplicates path collisions and disambiguates duplicate titles by parent folder', () => {
    const suggestions = mobileWikilinkAutocompleteSuggestions([
      note({ path: 'work/standup.md', title: 'Standup' }),
      note({ path: 'work/standup.md', title: 'Standup Duplicate' }),
      note({ path: 'personal/standup.md', title: 'Standup' }),
    ], 'stand')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual([
      'Standup (work)',
      'Standup (personal)',
    ])
  })

  it('uses the canonical vault-relative path stem as the inserted target', () => {
    expect(mobileWikilinkAutocompleteTarget(note({
      path: 'projects/project-alpha.md',
      title: 'Project Alpha',
    }))).toBe('projects/project-alpha')
  })

  it('detects desktop-style @ person mention queries at text boundaries', () => {
    expect(activeMobilePersonMentionQuery('Talk to @Mat today', 12)).toEqual({
      cursor: 12,
      query: 'Mat',
      start: 8,
    })
    expect(activeMobilePersonMentionQuery('mail@example.com', 14)).toBeNull()
    expect(activeMobilePersonMentionQuery('Talk to @Mat teo', 16)).toBeNull()
  })

  it('suggests only Person notes for @ mentions and matches aliases', () => {
    const suggestions = mobilePersonMentionAutocompleteSuggestions([
      note({ aliases: ['Meri'], path: 'people/maria.md', title: 'Maria Rossi', type: 'Person' }),
      note({ aliases: ['Meri'], path: 'projects/meri.md', title: 'Meri Project', type: 'Project' }),
      note({ archived: true, path: 'people/matteo.md', title: 'Matteo', type: 'Person' }),
    ], 'meri')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual(['Maria Rossi'])
  })

  it('ranks @ mention exact person titles before alias matches', () => {
    const suggestions = mobilePersonMentionAutocompleteSuggestions([
      note({ aliases: ['Luca'], path: 'people/lucas.md', title: 'Lucas Smith', type: 'Person' }),
      note({ path: 'people/luca.md', title: 'Luca', type: 'Person' }),
    ], 'luca')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual(['Luca', 'Lucas Smith'])
  })

  it('replaces @ mention queries with canonical wikilinks and a trailing space', () => {
    expect(replaceActiveMobilePersonMentionQuery('Talk to @Mer today', 12, 'people/maria')).toEqual({
      cursor: 24,
      text: 'Talk to [[people/maria]] today',
    })
    expect(replaceActiveMobilePersonMentionQuery('Talk to @Mer', 12, 'people/maria')).toEqual({
      cursor: 25,
      text: 'Talk to [[people/maria]] ',
    })
  })
})

function note(overrides: Partial<MobileNote>): MobileNote {
  return {
    created: 'today',
    date: 'today',
    favorite: false,
    id: overrides.path ?? `${overrides.title ?? 'Note'}.md`,
    links: 0,
    modified: 'today',
    relationships: [],
    snippet: '',
    status: '',
    tags: [],
    title: 'Note',
    type: 'Note',
    typeTone: 'gray',
    workspace: 'Vault',
    ...overrides,
  }
}
