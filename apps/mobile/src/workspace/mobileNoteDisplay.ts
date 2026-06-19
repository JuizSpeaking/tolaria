import { mobilePropertyDisplay } from './mobilePropertyDisplay'
import type { MobileNote, MobilePropertyValue, MobileTone, MobileTypeDefinitions } from './mobileWorkspaceModel'

export type MobileTagTone = 'blue' | 'green' | 'orange' | 'purple' | 'red'
type DisplayPropertyKey = string
type NormalizedDisplayPropertyKey = string
type StatusLabel = string
type TagLabel = string

export type MobileNoteDisplayChip = {
  label: string
  tone: MobileTone
}

export function mobileNoteRowChips(
  note: MobileNote,
  keys: DisplayPropertyKey[] = [],
  typeDefinitions?: MobileTypeDefinitions,
): MobileNoteDisplayChip[] {
  return configuredMobileNoteRowChips(note, displayPropertyKeysForNote(note, keys, typeDefinitions))
}

export function configuredMobileNoteRowChips(note: MobileNote, keys: DisplayPropertyKey[]): MobileNoteDisplayChip[] {
  return keys.flatMap((key) => displayPropertyChips(note, key))
}

export function mobileNoteDisplayLabels(
  note: MobileNote,
  keys: DisplayPropertyKey[] = [],
  typeDefinitions?: MobileTypeDefinitions,
): string[] {
  return mobileNoteRowChips(note, keys, typeDefinitions).map((chip) => chip.label)
}

function displayPropertyKeysForNote(
  note: MobileNote,
  keys: DisplayPropertyKey[],
  typeDefinitions: MobileTypeDefinitions | undefined,
) {
  return keys.length > 0 ? keys : typeDefinitions?.[note.type]?.listPropertiesDisplay ?? []
}

export function chipTone(tone: MobileTone) {
  return tone
}

export function statusTone(status: StatusLabel): 'blue' | 'green' | 'orange' {
  if (status === 'Shipped') return 'green'
  if (status === 'Active') return 'blue'
  return 'orange'
}

export function tagTone(label: TagLabel): MobileTagTone {
  const tones = ['blue', 'green', 'orange', 'purple', 'red'] as const
  const index = Array.from(label).reduce((sum, char) => sum + char.charCodeAt(0), 0) % tones.length

  return tones[index]
}

function displayPropertyChips(note: MobileNote, key: DisplayPropertyKey): MobileNoteDisplayChip[] {
  const normalizedKey = key.trim().toLowerCase()
  if (!normalizedKey) return []
  if (isTypePropertyKey(normalizedKey)) return [{ label: note.type, tone: chipTone(note.typeTone) }]
  if (normalizedKey === 'status') return note.status ? [{ label: note.status, tone: statusTone(note.status) }] : []
  if (normalizedKey === 'tags') return note.tags.map((tag) => ({ label: tag, tone: tagTone(tag) }))

  return relationshipChips(note, normalizedKey) ?? propertyChips(note, normalizedKey)
}

function isTypePropertyKey(normalizedKey: NormalizedDisplayPropertyKey) {
  return ['type', 'isa', 'is_a'].includes(normalizedKey)
}

function relationshipChips(note: MobileNote, normalizedKey: NormalizedDisplayPropertyKey): MobileNoteDisplayChip[] | null {
  const relationship = note.relationships.find((candidate) => relationshipKeys(candidate).includes(normalizedKey))
  if (!relationship) return null

  return relationship.values.map((value) => ({ label: value.title, tone: chipTone(value.typeTone) }))
}

function relationshipKeys(relationship: MobileNote['relationships'][number]) {
  return [
    relationship.key,
    relationship.label,
    relationship.kind,
    relationship.kind === 'belongsTo' ? 'belongs_to' : null,
    relationship.kind === 'relatedTo' ? 'related_to' : null,
  ].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase())
}

function propertyChips(note: MobileNote, normalizedKey: NormalizedDisplayPropertyKey): MobileNoteDisplayChip[] {
  const property = note.properties?.find((candidate) => candidate.key.toLowerCase() === normalizedKey)
  if (!property) return []

  const values = Array.isArray(property.value) ? property.value : [property.value]
  return values
    .map((value) => propertyChip(property.key, value))
    .filter((chip): chip is MobileNoteDisplayChip => chip !== null)
}

function propertyChip(key: DisplayPropertyKey, value: MobilePropertyValue): MobileNoteDisplayChip | null {
  const display = mobilePropertyDisplay(key, value, { false: 'false', true: 'true' })
  const label = display.kind === 'url' ? urlChipLabel(display.text) : truncateChipLabel(display.text)
  if (!label) return null

  return {
    label,
    tone: display.kind === 'status' ? statusTone(display.text) : propertyChipTone(display.kind),
  }
}

function propertyChipTone(kind: ReturnType<typeof mobilePropertyDisplay>['kind']): MobileTone {
  return kind === 'url' ? 'blue' : 'gray'
}

function urlChipLabel(value: string): string {
  const url = normalizedHttpUrl(value)
  return truncateChipLabel(url?.hostname ?? value)
}

function normalizedHttpUrl(value: string): URL | null {
  const trimmed = value.trim()
  const candidate = /^https?:\/\//iu.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function truncateChipLabel(value: string): string {
  const trimmed = value.trim()
  return trimmed.length > 40 ? `${trimmed.slice(0, 37)}...` : trimmed
}
