import { describe, expect, it } from 'vitest'
import {
  canonicalMobileRelationshipRef,
  filterMobileRelationshipRef,
  mobileRelationshipDisplayLabel,
  resolveMobileRelationshipNote,
  uniqueMobileRelationshipRefs,
} from './mobileRelationshipRefs'
import type { MobileNote } from './mobileNoteProjection'

describe('mobile relationship refs', () => {
  it('canonicalizes selected notes as desktop-compatible wikilinks', () => {
    expect(canonicalMobileRelationshipRef({
      notes: [note({ id: 'projects/tolaria-mvp', title: 'Tolaria MVP' })],
      value: 'Tolaria MVP',
    })).toBe('[[projects/tolaria-mvp|Tolaria MVP]]')
  })

  it('wraps unmatched text instead of writing plain relationship values', () => {
    expect(canonicalMobileRelationshipRef({ notes: [], value: 'Release Notes' })).toBe('[[release-notes|Release Notes]]')
  })

  it('resolves aliased wikilinks and plain titles to notes', () => {
    const notes = [note({ id: 'people/luca', title: 'Luca' })]

    expect(resolveMobileRelationshipNote({ notes, target: '[[people/luca|Luca]]' })?.id).toBe('people/luca')
    expect(resolveMobileRelationshipNote({ notes, target: 'Luca' })?.id).toBe('people/luca')
  })

  it('deduplicates and removes relationship refs by canonical target', () => {
    const values = uniqueMobileRelationshipRefs(['Tolaria MVP', '[[tolaria-mvp|Tolaria MVP]]', '[[other]]'])

    expect(values).toEqual(['[[tolaria-mvp|Tolaria MVP]]', '[[other]]'])
    expect(filterMobileRelationshipRef({ target: 'Tolaria MVP', values })).toEqual(['[[other]]'])
  })

  it('renders aliases before falling back to humanized targets', () => {
    expect(mobileRelationshipDisplayLabel('[[projects/tolaria-mvp|Tolaria MVP]]')).toBe('Tolaria MVP')
    expect(mobileRelationshipDisplayLabel('[[release-notes]]')).toBe('Release Notes')
  })
})

function note({ id, title }: { id: string; title: string }): MobileNote {
  return {
    archived: false,
    backlinks: [],
    belongsTo: [],
    content: `# ${title}`,
    customProperties: {},
    date: '',
    favorite: false,
    favoriteIndex: null,
    has: [],
    icon: 'file-text',
    id,
    modified: '',
    outgoingLinks: [],
    relatedTo: [],
    relationships: {},
    snippet: '',
    status: undefined,
    tags: [],
    title,
    type: 'Note',
    words: 1,
  }
}
