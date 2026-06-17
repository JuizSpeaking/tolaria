export type LocalVaultFrontmatterValue = LocalVaultFrontmatterScalar | LocalVaultFrontmatterScalar[]
export type LocalVaultFrontmatterScalar = string | number | boolean | null
type FrontmatterBody = string
type FrontmatterKey = string
type FrontmatterLine = string
type FrontmatterText = string
type MarkdownContent = string
type LocalVaultFrontmatterKeys = readonly FrontmatterKey[]

export type LocalVaultFrontmatter = Record<string, LocalVaultFrontmatterValue>

export type LocalVaultDocument = {
  body: MarkdownContent
  frontmatter: LocalVaultFrontmatter
}

const FRONTMATTER_OPEN = /^---\r?\n/
const FRONTMATTER_CLOSE = /\r?\n---(?:\r?\n|$)/

export function serializeLocalVaultFrontmatterScalar(value: LocalVaultFrontmatterScalar): string {
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (value === null) return 'null'
  if (shouldQuoteFrontmatterScalar(value)) return JSON.stringify(value)
  return value
}

export function parseLocalVaultDocument(content: MarkdownContent): LocalVaultDocument {
  const open = content.match(FRONTMATTER_OPEN)
  if (!open) return { body: content, frontmatter: {} }

  const rest = content.slice(open[0].length)
  const close = rest.match(FRONTMATTER_CLOSE)
  if (!close || close.index === undefined) return { body: content, frontmatter: {} }

  const rawFrontmatter: FrontmatterBody = rest.slice(0, close.index)
  const body = rest.slice(close.index + close[0].length)

  return {
    body,
    frontmatter: parseFrontmatterLines(rawFrontmatter.split(/\r?\n/)),
  }
}

export function frontmatterScalar(
  frontmatter: LocalVaultFrontmatter,
  keys: LocalVaultFrontmatterKeys,
): string | null {
  return stringValue(firstFrontmatterValue(frontmatter, keys))
}

export function frontmatterList(
  frontmatter: LocalVaultFrontmatter,
  keys: LocalVaultFrontmatterKeys,
): string[] {
  const value = firstFrontmatterValue(frontmatter, keys)
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

export function frontmatterFlag(
  frontmatter: LocalVaultFrontmatter,
  keys: LocalVaultFrontmatterKeys,
): boolean {
  const value = firstFrontmatterValue(frontmatter, keys)
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return truthyText(value)
  return false
}

export function frontmatterRelationships(
  frontmatter: LocalVaultFrontmatter,
): Record<string, string[]> {
  const relationships: Record<string, string[]> = {}

  for (const [key, value] of Object.entries(frontmatter)) {
    if (isReservedFrontmatterKey(key)) continue

    const wikilinks = wikilinkValues(value)
    if (wikilinks.length > 0) relationships[key] = wikilinks
  }

  return relationships
}

export function frontmatterProperties(
  frontmatter: LocalVaultFrontmatter,
): Record<string, LocalVaultFrontmatterValue> {
  const properties: Record<string, LocalVaultFrontmatterValue> = {}

  for (const [key, value] of Object.entries(frontmatter)) {
    if (isReservedFrontmatterKey(key) || wikilinkValues(value).length > 0) continue
    properties[key] = value
  }

  return properties
}

function parseFrontmatterLines(lines: FrontmatterLine[]): LocalVaultFrontmatter {
  const frontmatter: LocalVaultFrontmatter = {}
  let listKey: string | null = null
  let listItems: LocalVaultFrontmatterScalar[] = []

  for (const line of lines) {
    const listItem = parseListItem(line)
    if (listKey && listItem !== null) {
      listItems.push(parseScalar(listItem))
      continue
    }

    flushList(frontmatter, listKey, listItems)
    listKey = null
    listItems = []

    const keyValue = parseKeyValueLine(line)
    if (!keyValue) continue

    const { key, value } = keyValue
    if (!value) {
      assignFrontmatterValue(frontmatter, key, '')
      listKey = key
      continue
    }

    const parsedValue = parseValue(value)
    if (parsedValue !== undefined) assignFrontmatterValue(frontmatter, key, parsedValue)
  }

  flushList(frontmatter, listKey, listItems)
  return frontmatter
}

function parseKeyValueLine(line: FrontmatterLine): { key: FrontmatterKey; value: FrontmatterText } | null {
  if (!line || line.startsWith(' ') || line.startsWith('\t')) return null

  const match = line.match(/^["']?([^"':]+)["']?\s*:\s*(.*)$/)
  if (!match) return null

  return {
    key: match[1].trim(),
    value: match[2].trim(),
  }
}

function parseListItem(line: FrontmatterLine): FrontmatterText | null {
  const match = line.match(/^\s+-\s+(.*)$/)
  return match ? match[1].trim() : null
}

function flushList(
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey | null,
  items: LocalVaultFrontmatterScalar[],
) {
  if (key && items.length > 0) assignFrontmatterValue(frontmatter, key, collapseList(items))
}

function collapseList(items: LocalVaultFrontmatterScalar[]): LocalVaultFrontmatterValue {
  return items.length === 1 ? items[0] : items
}

function assignFrontmatterValue(
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey,
  value: LocalVaultFrontmatterValue,
) {
  const previousKey = Object.keys(frontmatter).find((candidateKey) => (
    normalizedFrontmatterKey(candidateKey) === normalizedFrontmatterKey(key)
  ))
  if (previousKey && previousKey !== key) Reflect.deleteProperty(frontmatter, previousKey)
  frontmatter[key] = value
}

function parseValue(value: FrontmatterText): LocalVaultFrontmatterValue | undefined {
  if (isBlockScalar(value)) return undefined
  if (isInlineArrayLiteral(value)) return parseInlineArray(value)
  return parseScalar(value)
}

function isBlockScalar(value: FrontmatterText): boolean {
  return value === '|' || value === '>'
}

function isInlineArrayLiteral(value: FrontmatterText): boolean {
  return value.startsWith('[') && value.endsWith(']') && !value.startsWith('[[')
}

function parseInlineArray(value: FrontmatterText): LocalVaultFrontmatterValue {
  return collapseList(splitInlineArrayItems(value.slice(1, -1)).map((item) => parseScalar(item.trim())))
}

function splitInlineArrayItems(value: FrontmatterText): FrontmatterText[] {
  const items: FrontmatterText[] = []
  let quote: '"' | '\'' | null = null
  let start = 0

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (char === '\\' && quote === '"') {
      index += 1
      continue
    }
    if (isQuote(char)) {
      quote = quote === char ? null : quote ?? char
      continue
    }
    if (char === ',' && quote === null) {
      items.push(value.slice(start, index))
      start = index + 1
    }
  }

  items.push(value.slice(start))
  return items
}

function parseScalar(value: FrontmatterText): LocalVaultFrontmatterScalar | null {
  const quoted = isQuotedScalar(value)
  const clean = unquote(value)
  const lower = clean.toLowerCase()

  if (lower === 'true' || lower === 'yes') return true
  if (lower === 'false' || lower === 'no') return false
  if (!quoted && isNumericScalar(clean)) return Number(clean)

  return clean
}

function isQuotedScalar(value: FrontmatterText): boolean {
  const quote = value.at(0)
  return isQuote(quote) && value.at(-1) === quote
}

function unquote(value: FrontmatterText): FrontmatterText {
  const quote = value.at(0)
  if (!isQuote(quote)) return value
  return value.at(-1) === quote ? value.slice(1, -1) : value
}

function isQuote(value: string | undefined): value is '"' | '\'' {
  return quoteCharacters.has(value ?? '')
}

function isNumericScalar(value: FrontmatterText): boolean {
  return /^-?\d+(?:\.\d+)?$/.test(value)
}

function truthyText(value: FrontmatterText): boolean {
  const lower = value.toLowerCase()
  return lower === 'true' || lower === 'yes' || lower === '1'
}

const quoteCharacters = new Set(['"', '\''])

const canonicalFrontmatterAliases = new Map([
  ['archived', '_archived'],
  ['favorite', '_favorite'],
  ['favorite_index', '_favorite_index'],
  ['icon', '_icon'],
  ['is_a', 'type'],
  ['sidebar_label', '_sidebar_label'],
  ['belongs_to', 'belongs_to'],
  ['related_to', 'related_to'],
  ['order', '_order'],
  ['sort', '_sort'],
  ['width', '_width'],
])

function wikilinkValues(value: LocalVaultFrontmatterValue): string[] {
  if (typeof value === 'string' && value.includes('[[')) return [value]
  if (!Array.isArray(value)) return []

  return value.filter((item): item is string => typeof item === 'string' && item.includes('[['))
}

const reservedFrontmatterKeys = new Set([
  'Archived',
  'Is A',
  'Status',
  '_archived',
  '_color',
  '_favorite',
  '_favorite_index',
  '_icon',
  '_list_properties_display',
  '_order',
  '_organized',
  '_sidebar_label',
  '_sort',
  '_width',
  'aliases',
  'archived',
  'color',
  'favorite',
  'favorite_index',
  'icon',
  'is_a',
  'order',
  'sidebar label',
  'sidebar_label',
  'sort',
  'status',
  'template',
  'title',
  'type',
  'Tags',
  'tags',
  'view',
  'visible',
  'width',
].map(normalizedFrontmatterKey))

function firstFrontmatterValue(
  frontmatter: LocalVaultFrontmatter,
  keys: LocalVaultFrontmatterKeys,
): LocalVaultFrontmatterValue | undefined {
  return keys.reduce<LocalVaultFrontmatterValue | undefined>(
    (match, key) => match === undefined ? frontmatterValueForKey(frontmatter, key) : match,
    undefined,
  )
}

function frontmatterValueForKey(
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey,
): LocalVaultFrontmatterValue | undefined {
  const exactValue = frontmatter[key]
  return exactValue === undefined ? normalizedFrontmatterValue(frontmatter, key) : exactValue
}

function normalizedFrontmatterValue(
  frontmatter: LocalVaultFrontmatter,
  key: FrontmatterKey,
): LocalVaultFrontmatterValue | undefined {
  const normalizedKey = normalizedFrontmatterKey(key)
  return Object.entries(frontmatter).find(([candidateKey]) => (
    normalizedFrontmatterKey(candidateKey) === normalizedKey
  ))?.[1]
}

function isReservedFrontmatterKey(key: FrontmatterKey): boolean {
  return reservedFrontmatterKeys.has(normalizedFrontmatterKey(key))
}

function normalizedFrontmatterKey(key: FrontmatterKey): FrontmatterKey {
  const normalizedKey = key.trim().toLowerCase().replace(/\s+/gu, '_')
  return canonicalFrontmatterAliases.get(normalizedKey) ?? normalizedKey
}

function stringValue(value: LocalVaultFrontmatterValue | undefined): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

function shouldQuoteFrontmatterScalar(value: string): boolean {
  return value === '' || /[:#\n\r]/u.test(value) || /^[\s[{]/u.test(value) || /\s$/u.test(value)
}
