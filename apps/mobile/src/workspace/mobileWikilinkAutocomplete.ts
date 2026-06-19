import type { MobileNote } from './mobileWorkspaceModel'
import { mobileNoteIdentityMatchesQuery, normalizedMobileSearchQuery } from './mobileNoteSearch'
import { mobileWikilinkTargetForNote } from './mobileWikilinks'
import { bestSearchRank } from '../../../../src/utils/fuzzyMatch'

type CursorOffset = number
type MarkdownContent = string
type WikilinkQuery = string
type WikilinkTarget = string
type PersonMentionQuery = string
type InlineQueryOptions = {
  invalidQuery: (query: string) => boolean
  replacement: (target: WikilinkTarget, nextCharacter: string) => string
  trigger: string
  validBoundary?: (text: string, triggerIndex: number) => boolean
}

export type MobileWikilinkAutocompleteMatch = {
  cursor: CursorOffset
  query: WikilinkQuery
  start: CursorOffset
}

export type MobileWikilinkAutocompleteReplacement = {
  cursor: CursorOffset
  text: MarkdownContent
}

const MAX_WIKILINK_SUGGESTIONS = 10
const MIN_WIKILINK_QUERY_LENGTH = 2
const wikilinkQueryOptions: InlineQueryOptions = {
  invalidQuery: (query) => query.includes(']') || query.includes('\n'),
  replacement: (target) => `[[${target}]]`,
  trigger: '[[',
}
const personMentionQueryOptions: InlineQueryOptions = {
  invalidQuery: (query) => query.includes('@') || query.includes(']') || /\s/u.test(query),
  replacement: personMentionReplacement,
  trigger: '@',
  validBoundary: hasPersonMentionBoundary,
}

export function activeMobileWikilinkQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
): MobileWikilinkAutocompleteMatch | null {
  return activeMobileInlineQuery(text, cursor, wikilinkQueryOptions)
}

export function replaceActiveMobileWikilinkQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
  target: WikilinkTarget,
): MobileWikilinkAutocompleteReplacement | null {
  return replaceActiveMobileInlineQuery(text, cursor, target, wikilinkQueryOptions)
}

export function mobileWikilinkAutocompleteSuggestions(
  notes: MobileNote[],
  query: WikilinkQuery,
): MobileNote[] {
  const candidates = notes.filter((note) => !note.archived)
  if (query.length < MIN_WIKILINK_QUERY_LENGTH) return []

  return finalizeMobileWikilinkSuggestions(rankMobileWikilinkSuggestions(
    candidates.filter((note) => mobileWikilinkMatchesQuery(note, query)),
    query,
  ))
}

export const mobileWikilinkAutocompleteTarget = mobileWikilinkTargetForNote

export type MobilePersonMentionAutocompleteMatch = {
  cursor: CursorOffset
  query: PersonMentionQuery
  start: CursorOffset
}

export function activeMobilePersonMentionQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
): MobilePersonMentionAutocompleteMatch | null {
  return activeMobileInlineQuery(text, cursor, personMentionQueryOptions)
}

export function replaceActiveMobilePersonMentionQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
  target: WikilinkTarget,
): MobileWikilinkAutocompleteReplacement | null {
  return replaceActiveMobileInlineQuery(text, cursor, target, personMentionQueryOptions)
}

export function mobilePersonMentionAutocompleteSuggestions(
  notes: MobileNote[],
  query: PersonMentionQuery,
): MobileNote[] {
  const normalizedQuery = normalizedMobileSearchQuery(query)
  if (normalizedQuery.length === 0) return []

  const matchingNotes = notes
    .filter((note) => !note.archived && note.type === 'Person')
    .filter((note) => mobilePersonMentionMatchesQuery(note, normalizedQuery))

  return finalizeMobileWikilinkSuggestions(
    rankMobileWikilinkSuggestions(matchingNotes, normalizedQuery),
  )
}

function rankMobileWikilinkSuggestions(notes: MobileNote[], query: WikilinkQuery): MobileNote[] {
  return notes
    .map((note, index) => ({
      index,
      note,
      rank: mobileWikilinkSuggestionRank(note, query),
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ note }) => note)
}

function mobileWikilinkSuggestionRank(note: MobileNote, query: WikilinkQuery): number {
  return bestSearchRank(
    normalizedMobileSearchQuery(query),
    normalizedMobileSearchQuery(note.title),
    (note.aliases ?? []).map(normalizedMobileSearchQuery),
  )
}

function finalizeMobileWikilinkSuggestions(notes: MobileNote[]): MobileNote[] {
  return prepareMobileWikilinkSuggestions(notes)
    .slice(0, MAX_WIKILINK_SUGGESTIONS)
}

function prepareMobileWikilinkSuggestions(notes: MobileNote[]): MobileNote[] {
  return disambiguateMobileWikilinkTitles(deduplicateMobileWikilinksByPath(notes))
}

function mobileWikilinkMatchesQuery(note: MobileNote, query: WikilinkQuery): boolean {
  return mobileNoteIdentityMatchesQuery(note, query)
}

function deduplicateMobileWikilinksByPath(notes: MobileNote[]): MobileNote[] {
  const seen = new Set<string>()
  return notes.filter((note) => {
    const path = mobileWikilinkIdentityPath(note)
    if (seen.has(path)) return false
    seen.add(path)
    return true
  })
}

function disambiguateMobileWikilinkTitles(notes: MobileNote[]): MobileNote[] {
  const titleCounts = new Map<string, number>()
  for (const note of notes) {
    titleCounts.set(note.title, (titleCounts.get(note.title) ?? 0) + 1)
  }

  return notes.map((note) => {
    if ((titleCounts.get(note.title) ?? 0) <= 1) return note

    const parentFolder = mobileWikilinkParentFolder(note)
    return parentFolder ? { ...note, title: `${note.title} (${parentFolder})` } : note
  })
}

function mobileWikilinkParentFolder(note: MobileNote): string {
  const parts = mobileWikilinkIdentityPath(note).split('/').filter(Boolean)
  return parts.length >= 2 ? parts[parts.length - 2] : ''
}

function mobileWikilinkIdentityPath(note: MobileNote): string {
  return note.path ?? note.id
}

function boundedTextCursor(text: MarkdownContent, cursor: CursorOffset): CursorOffset {
  if (!Number.isFinite(cursor)) return text.length
  return Math.max(0, Math.min(cursor, text.length))
}

function hasPersonMentionBoundary(text: string, triggerIndex: number): boolean {
  const previous = text.at(triggerIndex - 1)
  return previous === undefined || /[\s([{:>,-]/u.test(previous)
}

function mobilePersonMentionMatchesQuery(note: MobileNote, normalizedQuery: string): boolean {
  return [
    note.title,
    ...(note.aliases ?? []),
  ].some((value) => normalizedMobileSearchQuery(value).includes(normalizedQuery))
}

function activeMobileInlineQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
  options: InlineQueryOptions,
): MobileWikilinkAutocompleteMatch | null {
  const boundedCursor = boundedTextCursor(text, cursor)
  const beforeCursor = text.slice(0, boundedCursor)
  const triggerIndex = beforeCursor.lastIndexOf(options.trigger)
  if (triggerIndex === -1 || options.validBoundary?.(beforeCursor, triggerIndex) === false) return null

  const query = beforeCursor.slice(triggerIndex + options.trigger.length)
  if (options.invalidQuery(query)) return null

  return {
    cursor: boundedCursor,
    query,
    start: triggerIndex,
  }
}

function replaceActiveMobileInlineQuery(
  text: MarkdownContent,
  cursor: CursorOffset,
  target: WikilinkTarget,
  options: InlineQueryOptions,
): MobileWikilinkAutocompleteReplacement | null {
  const match = activeMobileInlineQuery(text, cursor, options)
  if (!match) return null

  const replacement = options.replacement(target, text.at(match.cursor) ?? '')
  return {
    cursor: match.start + replacement.length,
    text: `${text.slice(0, match.start)}${replacement}${text.slice(match.cursor)}`,
  }
}

function personMentionReplacement(target: WikilinkTarget, nextCharacter: string): string {
  return `[[${target}]]${/\s/u.test(nextCharacter) ? '' : ' '}`
}
