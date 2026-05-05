import type { MobileNote } from './mobileNoteProjection'

type MobileRelationshipInput = string
type MobileRelationshipRef = string
type MobileRelationshipRefs = MobileRelationshipRef[]
type MobileRelationshipKey = string

export function canonicalMobileRelationshipRef({
  notes,
  value,
}: {
  notes: MobileNote[]
  value: MobileRelationshipInput
}) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const note = resolveMobileRelationshipNote({ notes, target: trimmed })
  if (note) return mobileWikilinkForNote(note)
  if (isMobileWikilink(trimmed)) return trimmed

  const slug = slugifyMobileWikilinkTarget(trimmed)
  return `[[${slug}|${trimmed}]]`
}

export function filterMobileRelationshipRef({
  target,
  values,
}: {
  target: MobileRelationshipInput
  values: MobileRelationshipRefs
}) {
  const targetKey = mobileRelationshipRefKey(target)
  return values.filter((value) => mobileRelationshipRefKey(value) !== targetKey)
}

export function hasMobileRelationshipRef({
  target,
  values,
}: {
  target: MobileRelationshipInput
  values: MobileRelationshipRefs
}) {
  return filterMobileRelationshipRef({ target, values }).length !== values.length
}

export function mobileRelationshipDisplayLabel(value: MobileRelationshipInput) {
  const inner = mobileWikilinkInner(value)
  const [, alias] = inner.split('|')
  return alias?.trim() || titleFromTarget(inner.split('|')[0] ?? value)
}

export function mobileWikilinkForNote(note: Pick<MobileNote, 'id' | 'title'>) {
  return `[[${note.id}|${note.title}]]`
}

export function resolveMobileRelationshipNote({
  notes,
  target,
}: {
  notes: MobileNote[]
  target: MobileRelationshipInput
}) {
  const targetKeys = mobileRelationshipLookupKeys(target)
  return notes.find((note) => noteKeys(note).some((key) => targetKeys.has(key)))
}

export function uniqueMobileRelationshipRefs(values: MobileRelationshipRefs) {
  const refs = new Map<string, string>()
  for (const value of values) {
    refs.set(mobileRelationshipRefKey(value), value)
  }
  return [...refs.values()]
}

function mobileRelationshipRefKey(value: MobileRelationshipInput): MobileRelationshipKey {
  return slugifyMobileWikilinkTarget(mobileWikilinkInner(value).split('|')[0] ?? value)
}

function mobileRelationshipLookupKeys(value: MobileRelationshipInput) {
  const inner = mobileWikilinkInner(value)
  const [target, alias] = inner.split('|')
  return new Set([target, alias, inner].filter(isText).map(slugifyMobileWikilinkTarget))
}

function noteKeys(note: Pick<MobileNote, 'id' | 'title'>) {
  return [note.id, note.title].map(slugifyMobileWikilinkTarget)
}

function mobileWikilinkInner(value: MobileRelationshipInput): MobileRelationshipRef {
  return value.trim().replace(/^\[\[|\]\]$/g, '')
}

function titleFromTarget(value: MobileRelationshipRef) {
  const lastSegment = value.split('/').pop() ?? value
  return lastSegment.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function slugifyMobileWikilinkTarget(value: MobileRelationshipInput): MobileRelationshipKey {
  const slug = value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}/]+/gu, '-')
    .replace(/(^-|-$)/g, '')
  return slug || 'untitled'
}

function isMobileWikilink(value: MobileRelationshipInput) {
  return value.startsWith('[[') && value.endsWith(']]') && mobileWikilinkInner(value).length > 0
}

function isText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
