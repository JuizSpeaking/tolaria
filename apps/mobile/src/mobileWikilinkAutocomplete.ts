import type { MobileNote } from './mobileNoteProjection'
import { mobileWikilinkForNote } from './mobileRelationshipRefs'

export type MobileWikilinkQuery = {
  end: number
  query: string
  start: number
}

const maxSuggestions = 6

export function activeMobileWikilinkQuery({
  cursor,
  markdown,
}: {
  cursor: number
  markdown: string
}): MobileWikilinkQuery | null {
  const prefix = markdown.slice(0, cursor)
  const start = prefix.lastIndexOf('[[')
  if (start < 0 || prefix.slice(start).includes(']]')) {
    return null
  }

  const query = prefix.slice(start + 2)
  return query.includes('\n') ? null : { end: cursor, query, start }
}

export function mobileNoteSuggestions({
  excludeNoteId,
  notes,
  query,
}: {
  excludeNoteId?: string
  notes: MobileNote[]
  query: string
}) {
  const normalizedQuery = normalizeSuggestionText(query)
  return notes
    .filter((note) => note.id !== excludeNoteId)
    .filter((note) => matchesSuggestion({ note, normalizedQuery }))
    .slice(0, maxSuggestions)
}

export function insertMobileWikilink({
  markdown,
  note,
  query,
}: {
  markdown: string
  note: MobileNote
  query: MobileWikilinkQuery
}) {
  const wikilink = mobileWikilinkForNote(note)
  return `${markdown.slice(0, query.start)}${wikilink}${markdown.slice(query.end)}`
}

function matchesSuggestion({
  note,
  normalizedQuery,
}: {
  note: MobileNote
  normalizedQuery: string
}) {
  return normalizedQuery.length === 0
    || normalizeSuggestionText(note.id).includes(normalizedQuery)
    || normalizeSuggestionText(note.title).includes(normalizedQuery)
}

function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase()
}
