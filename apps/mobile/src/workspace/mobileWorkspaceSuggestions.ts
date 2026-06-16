import type { MobileNote, MobileRelationship, MobileTypeDefinitions } from './mobileWorkspaceModel'
import { mobileNoteIdentityMatchesQuery, normalizedMobileSearchQuery } from './mobileNoteSearch'

type PropertyKey = string
type PropertyValueText = string
type RelationshipKey = string
type SuggestionQuery = string
type SuggestionText = string
type NormalizedSuggestionKey = string
type ViewField = string
type ViewFieldValue = string
export type MobileViewValueSuggestion = {
  label: SuggestionText
  meta?: SuggestionText
  testId?: SuggestionText
  value: SuggestionText
}
type ViewValueResolver = (note: MobileNote) => ViewFieldValue[]
type FolderPath = string

const DESKTOP_SUGGESTED_PROPERTY_KEYS = ['Status', 'Date', 'URL'] as const
const DESKTOP_SUGGESTED_RELATIONSHIP_KEYS = ['belongs_to', 'related_to', 'has'] as const
const DESKTOP_VIEW_BUILT_IN_FIELDS = ['type', 'status', 'title', 'favorite', 'body'] as const
const BUILT_IN_VIEW_VALUE_RESOLVERS: Record<string, ViewValueResolver> = {
  archived: (note) => [String(note.archived === true)],
  body: (note) => note.snippet ? [note.snippet] : [],
  favorite: (note) => [String(note.favorite)],
  filename: (note) => [note.path?.split('/').at(-1) ?? note.id],
  isa: (note) => [note.type],
  status: (note) => note.status ? [note.status] : [],
  title: (note) => [note.title],
  type: (note) => [note.type],
}
const CANONICAL_RELATIONSHIP_KEYS: Partial<Record<NormalizedSuggestionKey, RelationshipKey>> = {
  belongs_to: 'belongs_to',
  has: 'has',
  related_to: 'related_to',
}
const RELATIONSHIP_KIND_KEYS: Partial<Record<MobileRelationship['kind'], RelationshipKey>> = {
  belongsTo: 'belongs_to',
  has: 'has',
  relatedTo: 'related_to',
}

export function mobilePropertyKeySuggestions(
  notes: MobileNote[],
  selectedNote: MobileNote | null,
  query: SuggestionQuery,
): PropertyKey[] {
  const selectedKeys = selectedPropertyKeys(selectedNote)
  return visibleSuggestions(propertyKeyCandidates(notes), query)
    .filter((key) => !selectedKeys.has(canonicalSuggestionKey(key)))
}

export function mobilePropertyValueSuggestions(
  notes: MobileNote[],
  key: PropertyKey,
  query: SuggestionQuery,
): PropertyValueText[] {
  const normalizedKey = canonicalSuggestionKey(key)
  if (!normalizedKey) return []
  const listQuery = propertyListQuery(query, normalizedKey)
  return visibleSuggestions(propertyValueCandidates(notes, normalizedKey), listQuery.query)
    .filter((value) => !listQuery.selected.has(canonicalSuggestionKey(value)))
}

export function mobileRelationshipKeySuggestions(
  notes: MobileNote[],
  query: SuggestionQuery,
): RelationshipKey[] {
  return visibleSuggestions(relationshipKeyCandidates(notes), query)
}

export function mobileRelationshipTargetSuggestions(
  notes: MobileNote[],
  query: SuggestionQuery,
): MobileNote[] {
  const normalizedQuery = normalizedMobileSearchQuery(query)
  if (!normalizedQuery) return []

  return notes
    .filter((note) => !note.archived && mobileNoteIdentityMatchesQuery(note, normalizedQuery))
    .slice(0, 6)
}

export function mobileTypeSuggestions(
  notes: MobileNote[],
  selectedNote: MobileNote | null,
  query: SuggestionQuery,
): string[] {
  const currentType = selectedNote?.type.trim().toLowerCase()
  return visibleSuggestions(notes.map((note) => note.type), query)
    .filter((type) => type.toLowerCase() !== currentType)
}

export function mobileFolderSuggestions(
  notes: MobileNote[],
  selectedNote: MobileNote | null,
  query: SuggestionQuery,
  folderPaths: FolderPath[] = [],
): FolderPath[] {
  const currentFolder = folderPathForNote(selectedNote)
  return visibleSuggestions(folderSuggestionCandidates(notes, folderPaths), query)
    .filter((folderPath) => folderPath !== currentFolder)
}

export function mobileViewFieldSuggestions(
  notes: MobileNote[],
  query: SuggestionQuery,
): ViewField[] {
  return visibleSuggestions(viewFieldCandidates(notes), query)
}

export function mobileViewValueSuggestions(
  notes: MobileNote[],
  field: ViewField,
  query: SuggestionQuery,
): ViewFieldValue[] {
  return uniqueSuggestedKeys(mobileViewValueSuggestionItems(notes, field, query).map((item) => item.label))
}

export function mobileViewValueSuggestionItems(
  notes: MobileNote[],
  field: ViewField,
  query: SuggestionQuery,
): MobileViewValueSuggestion[] {
  const normalizedKey = canonicalSuggestionKey(field)
  if (!normalizedKey) return []
  return visibleSuggestionItems(viewValueSuggestionCandidates(notes, normalizedKey), query)
}

export function mobileListPropertySuggestions(
  notes: MobileNote[],
  query: SuggestionQuery,
): PropertyKey[] {
  return sortedVisibleSuggestions(listPropertyCandidates(notes), query)
}

export function mobileDefaultListPropertyDisplay(
  notes: MobileNote[],
  typeDefinitions: MobileTypeDefinitions | undefined,
): PropertyKey[] {
  const ordered: PropertyKey[] = []
  const seen = new Set<NormalizedSuggestionKey>()

  for (const note of notes) {
    for (const key of typeDefinitions?.[note.type]?.listPropertiesDisplay ?? []) {
      const normalized = canonicalSuggestionKey(key)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      ordered.push(key)
    }
  }

  return ordered
}

export function normalizeRelationshipKey(key: RelationshipKey): RelationshipKey {
  const trimmed = key.trim()
  const canonical = canonicalSuggestionKey(trimmed)
  const relationshipKey = CANONICAL_RELATIONSHIP_KEYS[canonical]
  return relationshipKey === undefined ? trimmed : relationshipKey
}

function propertyKeyCandidates(notes: MobileNote[]): PropertyKey[] {
  return [
    ...DESKTOP_SUGGESTED_PROPERTY_KEYS,
    ...notes.flatMap((note) => propertiesForNote(note).map((property) => property.key)),
  ]
}

function propertyValueCandidates(
  notes: MobileNote[],
  normalizedKey: NormalizedSuggestionKey,
): PropertyValueText[] {
  return notes.flatMap((note) => propertyValuesForSuggestion(note, normalizedKey))
}

function relationshipKeyCandidates(notes: MobileNote[]): RelationshipKey[] {
  return [
    ...DESKTOP_SUGGESTED_RELATIONSHIP_KEYS,
    ...notes.flatMap((note) => note.relationships.map(relationshipFrontmatterKey)),
  ]
}

function folderPathForNote(note: MobileNote | null): FolderPath {
  const path = note?.path ?? note?.id ?? ''
  return path.split('/').slice(0, -1).join('/')
}

function isFolderPath(value: FolderPath): value is FolderPath {
  return value.trim().length > 0
}

function folderSuggestionCandidates(notes: MobileNote[], folderPaths: FolderPath[]): FolderPath[] {
  return [
    ...folderPaths,
    ...notes.map(folderPathForNote),
  ].filter(isFolderPath)
}

function viewFieldCandidates(notes: MobileNote[]): ViewField[] {
  return [
    ...DESKTOP_VIEW_BUILT_IN_FIELDS,
    ...notes.flatMap((note) => propertiesForNote(note).map((property) => property.key)),
    ...notes.flatMap((note) => note.relationships.map(relationshipFrontmatterKey)),
  ]
}

function listPropertyCandidates(notes: MobileNote[]): PropertyKey[] {
  return [
    ...notes.flatMap((note) => note.status ? ['status'] : []),
    ...notes.flatMap((note) => note.tags.length > 0 ? ['tags'] : []),
    ...notes.flatMap((note) => propertiesForNote(note).map((property) => property.key)),
    ...notes.flatMap((note) => note.relationships.map(relationshipFrontmatterKey)),
  ]
}

function visibleSuggestions(
  values: readonly SuggestionText[],
  query: SuggestionQuery,
): SuggestionText[] {
  return uniqueSuggestedKeys(values)
    .filter((value) => matchesSuggestionQuery(value, query))
    .slice(0, 8)
}

function sortedVisibleSuggestions(
  values: readonly SuggestionText[],
  query: SuggestionQuery,
): SuggestionText[] {
  return visibleSuggestions([...uniqueSuggestedKeys(values)].sort((left, right) => left.localeCompare(right)), query)
}

function visibleSuggestionItems(
  items: readonly MobileViewValueSuggestion[],
  query: SuggestionQuery,
): MobileViewValueSuggestion[] {
  return uniqueSuggestionItems(items)
    .filter((item) => matchesValueSuggestionQuery(item, query))
    .slice(0, 8)
}

function viewValueSuggestionCandidates(
  notes: MobileNote[],
  normalizedKey: NormalizedSuggestionKey,
): MobileViewValueSuggestion[] {
  return notes.flatMap((note) => viewValueSuggestionsForNote(note, normalizedKey))
}

function viewValueSuggestionsForNote(
  note: MobileNote,
  normalizedKey: NormalizedSuggestionKey,
): MobileViewValueSuggestion[] {
  const builtInValues = builtInViewValues(note, normalizedKey)
  if (builtInValues !== null) return textSuggestionItems(builtInValues)

  return [
    ...textSuggestionItems(propertyValuesForSuggestion(note, normalizedKey)),
    ...relationshipValueSuggestionItems(note, normalizedKey),
  ]
}

function builtInViewValues(
  note: MobileNote,
  normalizedKey: NormalizedSuggestionKey,
): ViewFieldValue[] | null {
  return BUILT_IN_VIEW_VALUE_RESOLVERS[normalizedKey]?.(note) ?? null
}

function relationshipValueSuggestionItems(
  note: MobileNote,
  normalizedKey: NormalizedSuggestionKey,
): MobileViewValueSuggestion[] {
  const relationship = relationshipForSuggestion(note, normalizedKey)
  return relationship?.values.flatMap(relationshipValueSuggestionItem) ?? []
}

function relationshipForSuggestion(
  note: MobileNote,
  normalizedKey: NormalizedSuggestionKey,
): MobileRelationship | undefined {
  return note.relationships.find((candidate) => {
    return canonicalSuggestionKey(relationshipFrontmatterKey(candidate)) === normalizedKey
  })
}

function relationshipValueSuggestionItem(value: MobileRelationship['values'][number]): MobileViewValueSuggestion[] {
  const title = value.title.trim()
  const ref = value.ref?.trim()
  const label = title || ref
  if (!label) return []

  return [{
    label,
    meta: ref && ref !== label ? ref : undefined,
    value: ref ?? label,
  }]
}

function selectedPropertyKeys(note: MobileNote | null): Set<NormalizedSuggestionKey> {
  if (!note) return new Set()

  const keys = new Set(propertiesForNote(note).map((property) => canonicalSuggestionKey(property.key)))
  if (note.status) keys.add('status')
  if (note.tags.length > 0) keys.add('tags')
  return keys
}

function propertyValuesForSuggestion(
  note: MobileNote,
  normalizedKey: NormalizedSuggestionKey,
): PropertyValueText[] {
  const specialValues = specialPropertyValuesForSuggestion(note, normalizedKey)
  if (specialValues !== null) return specialValues
  return propertyValueTexts(note, normalizedKey)
}

function specialPropertyValuesForSuggestion(
  note: MobileNote,
  normalizedKey: NormalizedSuggestionKey,
): PropertyValueText[] | null {
  if (normalizedKey === 'status') return note.status ? [note.status] : []
  if (normalizedKey === 'tags') return note.tags
  return null
}

function propertyValueTexts(
  note: MobileNote,
  normalizedKey: NormalizedSuggestionKey,
): PropertyValueText[] {
  const property = propertiesForNote(note).find((candidate) => canonicalSuggestionKey(candidate.key) === normalizedKey)
  if (!property) return []
  return Array.isArray(property.value) ? property.value : [String(property.value)]
}

function propertyListQuery(
  query: SuggestionQuery,
  normalizedKey: NormalizedSuggestionKey,
): { query: SuggestionQuery; selected: Set<NormalizedSuggestionKey> } {
  if (normalizedKey !== 'tags') return { query, selected: new Set() }

  const parts = query.split(',').map((part) => part.trim())
  const activeQuery = parts.at(-1) ?? ''
  return {
    query: activeQuery,
    selected: new Set(parts.slice(0, -1).map(canonicalSuggestionKey)),
  }
}

function relationshipFrontmatterKey(relationship: MobileRelationship): RelationshipKey {
  const kindKey = relationshipKeyForKind(relationship)
  if (relationship.key) return relationship.key
  if (kindKey) return kindKey
  return relationship.label ? relationship.label : 'related_to'
}

function propertiesForNote(note: MobileNote) {
  return note.properties ? note.properties : []
}

function relationshipKeyForKind(relationship: MobileRelationship): RelationshipKey | null {
  return RELATIONSHIP_KIND_KEYS[relationship.kind] ?? null
}

function uniqueSuggestedKeys(values: readonly SuggestionText[]): SuggestionText[] {
  const seen = new Set<NormalizedSuggestionKey>()
  const result: SuggestionText[] = []

  for (const value of values) {
    const trimmed = value.trim()
    const canonical = canonicalSuggestionKey(trimmed)
    if (!trimmed || seen.has(canonical)) continue
    seen.add(canonical)
    result.push(trimmed)
  }

  return result
}

function uniqueSuggestionItems(items: readonly MobileViewValueSuggestion[]): MobileViewValueSuggestion[] {
  const seen = new Set<NormalizedSuggestionKey>()
  const result: MobileViewValueSuggestion[] = []

  for (const item of items) {
    const value = item.value.trim()
    const canonical = canonicalSuggestionKey(value)
    if (!value || seen.has(canonical)) continue
    seen.add(canonical)
    result.push({ ...item, value })
  }

  return result
}

function textSuggestionItems(values: readonly SuggestionText[]): MobileViewValueSuggestion[] {
  return values.map((value) => ({ label: value, value }))
}

function matchesValueSuggestionQuery(item: MobileViewValueSuggestion, query: SuggestionQuery): boolean {
  return matchesSuggestionQuery(item.label, query)
    || matchesSuggestionQuery(item.value, query)
    || (item.meta ? matchesSuggestionQuery(item.meta, query) : false)
}

function matchesSuggestionQuery(value: SuggestionText, query: SuggestionQuery): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  return value.toLowerCase().includes(normalizedQuery)
    || humanizeSuggestionLabel(value).toLowerCase().includes(normalizedQuery)
}

function canonicalSuggestionKey(key: SuggestionText): NormalizedSuggestionKey {
  return key.trim().toLowerCase().replace(/[-\s]+/g, '_')
}

function humanizeSuggestionLabel(label: SuggestionText): SuggestionText {
  return label
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
