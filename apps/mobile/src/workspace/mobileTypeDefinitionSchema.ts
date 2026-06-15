import type {
  MobileNote,
  MobilePropertyValue,
  MobileTypeDefinition,
} from './mobileWorkspaceModel'
import { normalizeRelationshipKey } from './mobileWorkspaceSuggestions'
import {
  mobileNoteForWikilinkTarget,
  mobileWikilinkTargetForNote,
  parseMobileWikilink,
} from './mobileWikilinks'

export type MobileTypeSchemaProperty = {
  key: SchemaKey
  value: MobilePropertyValue
}

export type MobileTypeSchemaRelationship = {
  key: RelationshipKey
  placeholderValue?: MobilePropertyValue
  refs: WikilinkRef[]
}

type FormValueText = string
type CanonicalSchemaKey = string
type QueryText = string
type RelationshipKey = string
type SchemaIndex = number
type SchemaKey = string
type WikilinkRef = string

const builtInRelationshipSchemaKeys = new Set(['belongs_to', 'has', 'related_to'])

export function typeSchemaPropertiesForForm(
  definition: MobileTypeDefinition | undefined,
): MobileTypeSchemaProperty[] {
  return Object.entries(definition?.properties ?? {})
    .filter(([key]) => !isBuiltInRelationshipSchemaKey(key))
    .map(([key, value]) => ({ key, value }))
}

export function typeSchemaRelationshipsForForm(
  definition: MobileTypeDefinition | undefined,
): MobileTypeSchemaRelationship[] {
  const relationships = new Map<RelationshipKey, MobileTypeSchemaRelationship>()
  addLinkedRelationships(relationships, definition)
  addPlaceholderRelationships(relationships, definition)
  return [...relationships.values()]
}

export function typeDefinitionSchemaPatch(
  properties: MobileTypeSchemaProperty[],
  relationships: MobileTypeSchemaRelationship[],
) {
  return {
    properties: propertiesPatch(properties, relationships),
    relationships: relationshipsPatch(relationships),
  }
}

export function addTypeSchemaProperty(
  properties: MobileTypeSchemaProperty[],
  key: SchemaKey,
  valueText: FormValueText,
): MobileTypeSchemaProperty[] {
  const trimmedKey = key.trim()
  if (!trimmedKey) return properties

  return upsertProperty(properties, {
    key: trimmedKey,
    value: parsePropertyValueText(valueText),
  })
}

export function removeTypeSchemaPropertyAt(
  properties: MobileTypeSchemaProperty[],
  index: SchemaIndex,
): MobileTypeSchemaProperty[] {
  return properties.filter((_, itemIndex) => itemIndex !== index)
}

export function addTypeSchemaRelationshipRef(
  relationships: MobileTypeSchemaRelationship[],
  key: RelationshipKey,
  targetTitle: FormValueText,
  notes: MobileNote[],
): MobileTypeSchemaRelationship[] {
  const relationshipKey = normalizeRelationshipKey(key)
  if (!relationshipKey) return relationships

  const ref = relationshipRefFromInput(targetTitle, notes)
  return upsertRelationship(relationships, relationshipKey, ref)
}

export function removeTypeSchemaRelationshipAt(
  relationships: MobileTypeSchemaRelationship[],
  index: SchemaIndex,
): MobileTypeSchemaRelationship[] {
  return relationships.filter((_, itemIndex) => itemIndex !== index)
}

export function typeSchemaRelationshipTargetSuggestions(
  notes: MobileNote[],
  query: QueryText,
): FormValueText[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  return notes
    .filter((note) => !note.archived && note.title.toLowerCase().includes(normalized))
    .map((note) => note.title)
    .slice(0, 6)
}

export function mobileTypeSchemaPropertyValueText(value: MobilePropertyValue): string {
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function mobileTypeSchemaRelationshipValueText(
  relationship: MobileTypeSchemaRelationship,
  notes: MobileNote[],
): FormValueText {
  const labels = relationship.refs.map((ref) => relationshipRefLabel(ref, notes))
  if (labels.length > 0) return labels.join(', ')
  return placeholderValueText(relationship.placeholderValue)
}

function addLinkedRelationships(
  relationships: Map<RelationshipKey, MobileTypeSchemaRelationship>,
  definition: MobileTypeDefinition | undefined,
) {
  for (const [key, refs] of Object.entries(definition?.relationships ?? {})) {
    const relationshipKey = normalizeRelationshipKey(key)
    if (!relationshipKey) continue
    relationships.set(relationshipKey, {
      key: relationshipKey,
      refs: uniqueRefs(refs),
    })
  }
}

function addPlaceholderRelationships(
  relationships: Map<RelationshipKey, MobileTypeSchemaRelationship>,
  definition: MobileTypeDefinition | undefined,
) {
  for (const [key, value] of Object.entries(definition?.properties ?? {})) {
    if (!isBuiltInRelationshipSchemaKey(key)) continue
    const relationshipKey = normalizeRelationshipKey(key)
    const current = relationships.get(relationshipKey)
    relationships.set(relationshipKey, {
      key: relationshipKey,
      placeholderValue: value,
      refs: current?.refs ?? [],
    })
  }
}

function propertiesPatch(
  properties: MobileTypeSchemaProperty[],
  relationships: MobileTypeSchemaRelationship[],
) {
  const next: Record<string, MobilePropertyValue> = {}
  for (const { key, value } of normalizedProperties(properties)) next[key] = value
  for (const relationship of relationships) addPlaceholderProperty(next, relationship)
  return next
}

function relationshipsPatch(
  relationships: MobileTypeSchemaRelationship[],
) {
  const next: Record<string, string[]> = {}
  for (const relationship of normalizedRelationships(relationships)) {
    if (relationship.refs.length > 0) next[relationship.key] = relationship.refs
  }
  return next
}

function normalizedProperties(
  properties: MobileTypeSchemaProperty[],
): MobileTypeSchemaProperty[] {
  const seen = new Set<string>()
  return properties.filter(({ key }) => {
    const canonicalKey = canonicalSchemaKey(key)
    if (!canonicalKey || seen.has(canonicalKey)) return false
    seen.add(canonicalKey)
    return true
  })
}

function normalizedRelationships(
  relationships: MobileTypeSchemaRelationship[],
): MobileTypeSchemaRelationship[] {
  return relationships.flatMap((relationship) => {
    const key = normalizeRelationshipKey(relationship.key)
    if (!key) return []
    return [{ ...relationship, key, refs: uniqueRefs(relationship.refs) }]
  })
}

function addPlaceholderProperty(
  properties: Record<string, MobilePropertyValue>,
  relationship: MobileTypeSchemaRelationship,
) {
  if (relationship.refs.length > 0 || !isBuiltInRelationshipSchemaKey(relationship.key)) return
  properties[relationship.key] = relationship.placeholderValue ?? ''
}

function upsertProperty(
  properties: MobileTypeSchemaProperty[],
  property: MobileTypeSchemaProperty,
) {
  const canonicalKey = canonicalSchemaKey(property.key)
  const next = properties.filter((item) => canonicalSchemaKey(item.key) !== canonicalKey)
  return [...next, property]
}

function upsertRelationship(
  relationships: MobileTypeSchemaRelationship[],
  key: string,
  ref: string | null,
) {
  const index = relationships.findIndex((item) => canonicalSchemaKey(item.key) === canonicalSchemaKey(key))
  if (index === -1) return [...relationships, { key, refs: ref ? [ref] : [] }]

  return relationships.map((relationship, itemIndex) => {
    if (itemIndex !== index) return relationship
    return {
      ...relationship,
      key,
      refs: ref ? uniqueRefs([...relationship.refs, ref]) : relationship.refs,
    }
  })
}

function relationshipRefFromInput(input: FormValueText, notes: MobileNote[]): WikilinkRef | null {
  const trimmedInput = input.trim()
  if (!trimmedInput) return null
  if (parseMobileWikilink(trimmedInput)) return trimmedInput

  const note = notes.find((candidate) => candidate.title.trim().toLowerCase() === trimmedInput.toLowerCase())
  return `[[${note ? mobileWikilinkTargetForNote(note) : trimmedInput}]]`
}

function relationshipRefLabel(ref: WikilinkRef, notes: MobileNote[]): FormValueText {
  const parsed = parseMobileWikilink(ref)
  if (!parsed) return ref
  return mobileNoteForWikilinkTarget(notes, parsed.target)?.title ?? parsed.display
}

function placeholderValueText(value: MobilePropertyValue | undefined): FormValueText {
  if (value === undefined || value === '') return ''
  return mobileTypeSchemaPropertyValueText(value)
}

function parsePropertyValueText(value: FormValueText): MobilePropertyValue {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.includes(',')) return trimmed.split(',').map((item) => item.trim()).filter(Boolean)
  if (isBooleanText(trimmed)) return ['true', 'yes'].includes(trimmed.toLowerCase())
  if (/^-?\d+(?:\.\d+)?$/u.test(trimmed)) return Number(trimmed)
  return trimmed
}

function isBooleanText(value: FormValueText) {
  return ['false', 'no', 'true', 'yes'].includes(value.toLowerCase())
}

function uniqueRefs(refs: WikilinkRef[]): WikilinkRef[] {
  const seen = new Set<string>()
  return refs.map((ref) => ref.trim()).filter((ref) => {
    const normalized = ref.toLowerCase()
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

function isBuiltInRelationshipSchemaKey(key: SchemaKey | RelationshipKey): boolean {
  return builtInRelationshipSchemaKeys.has(canonicalSchemaKey(key))
}

function canonicalSchemaKey(key: SchemaKey | RelationshipKey): CanonicalSchemaKey {
  return key.trim().toLowerCase().replace(/[-\s]+/gu, '_')
}
