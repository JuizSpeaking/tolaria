export type LocalVaultFrontmatterValue = LocalVaultFrontmatterScalar | LocalVaultFrontmatterScalar[]
export type LocalVaultFrontmatterScalar = string | number | boolean | null
type FrontmatterBody = string
type FrontmatterKey = string
type FrontmatterLine = string
type FrontmatterText = string
type MarkdownContent = string
type LocalVaultFrontmatterKeys = readonly FrontmatterKey[]
type BlockScalarStyle = 'folded' | 'literal'
type BlockScalarState = {
  key: FrontmatterKey
  lines: FrontmatterLine[]
  style: BlockScalarStyle
}
type FrontmatterParseState = {
  blockScalar: BlockScalarState | null
  frontmatter: LocalVaultFrontmatter
  listItems: LocalVaultFrontmatterScalar[]
  listKey: FrontmatterKey | null
}

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
  if (value.includes('\n')) return frontmatterBlockScalar(value)
  if (shouldQuoteFrontmatterScalar(value)) return JSON.stringify(value)
  return value
}

export function serializeLocalVaultFrontmatterKey(key: FrontmatterKey): string {
  return shouldQuoteFrontmatterKey(key) ? JSON.stringify(key) : key
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
  if (typeof value === 'number') return value !== 0
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
  const state: FrontmatterParseState = {
    blockScalar: null,
    frontmatter: {},
    listItems: [],
    listKey: null,
  }

  for (const line of lines) {
    parseFrontmatterLine(state, line)
  }

  flushBlockScalar(state.frontmatter, state.blockScalar)
  flushList(state.frontmatter, state.listKey, state.listItems)
  return state.frontmatter
}

function parseFrontmatterLine(state: FrontmatterParseState, line: FrontmatterLine) {
  if (consumeBlockScalarLine(state, line)) return
  if (appendListItem(state, line)) return

  flushPendingList(state)
  const keyValue = parseKeyValueLine(line)
  if (keyValue) applyFrontmatterKeyValue(state, keyValue)
}

function consumeBlockScalarLine(state: FrontmatterParseState, line: FrontmatterLine): boolean {
  if (!state.blockScalar) return false
  if (isBlockScalarContentLine(line)) {
    state.blockScalar.lines.push(line)
    return true
  }

  flushBlockScalar(state.frontmatter, state.blockScalar)
  state.blockScalar = null
  return false
}

function appendListItem(state: FrontmatterParseState, line: FrontmatterLine): boolean {
  const listItem = parseListItem(line)
  if (!state.listKey || listItem === null) return false

  state.listItems.push(parseScalar(listItem))
  return true
}

function flushPendingList(state: FrontmatterParseState) {
  flushList(state.frontmatter, state.listKey, state.listItems)
  state.listKey = null
  state.listItems = []
}

function applyFrontmatterKeyValue(
  state: FrontmatterParseState,
  keyValue: { key: FrontmatterKey; value: FrontmatterText },
) {
  const { key, value } = keyValue
  if (isBlockScalar(value)) {
    state.blockScalar = supportedBlockScalarState(key, value)
    return
  }

  if (!value) {
    assignFrontmatterValue(state.frontmatter, key, '')
    state.listKey = key
    return
  }

  const parsedValue = parseValue(value)
  if (parsedValue !== undefined) assignFrontmatterValue(state.frontmatter, key, parsedValue)
}

function parseKeyValueLine(line: FrontmatterLine): { key: FrontmatterKey; value: FrontmatterText } | null {
  if (!line || line.startsWith(' ') || line.startsWith('\t')) return null

  return parseQuotedKeyValueLine(line) ?? parsePlainKeyValueLine(line)
}

function parseQuotedKeyValueLine(line: FrontmatterLine): { key: FrontmatterKey; value: FrontmatterText } | null {
  const quote = line.at(0)
  if (!isQuote(quote)) return null

  const endQuoteIndex = closingQuoteIndex(line, quote)
  if (endQuoteIndex === -1) return null

  const valueMatch = line.slice(endQuoteIndex + 1).match(/^\s*:\s*(.*)$/u)
  if (!valueMatch) return null

  return {
    key: unquoteFrontmatterKey(line.slice(1, endQuoteIndex), quote),
    value: valueMatch[1].trim(),
  }
}

function parsePlainKeyValueLine(line: FrontmatterLine): { key: FrontmatterKey; value: FrontmatterText } | null {
  const match = line.match(/^([^"':]+)\s*:\s*(.*)$/)
  if (!match) return null

  return {
    key: match[1].trim(),
    value: match[2].trim(),
  }
}

function closingQuoteIndex(line: FrontmatterLine, quote: '"' | '\''): number {
  for (let index = 1; index < line.length; index += 1) {
    if (line[index] === '\\' && quote === '"') {
      index += 1
      continue
    }
    if (line[index] === quote) return index
  }

  return -1
}

function unquoteFrontmatterKey(value: FrontmatterKey, quote: '"' | '\''): FrontmatterKey {
  if (quote === '\'') return value.replace(/''/gu, '\'')

  try {
    return JSON.parse(`"${value}"`) as FrontmatterKey
  } catch {
    return value.replace(/\\"/gu, '"')
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

function supportedBlockScalarState(key: FrontmatterKey, value: FrontmatterText): BlockScalarState | null {
  if (normalizedFrontmatterKey(key) !== 'template') return null
  return {
    key,
    lines: [],
    style: value === '>' ? 'folded' : 'literal',
  }
}

function isBlockScalarContentLine(line: FrontmatterLine): boolean {
  return line.trim() === '' || /^\s/u.test(line)
}

function flushBlockScalar(
  frontmatter: LocalVaultFrontmatter,
  blockScalar: BlockScalarState | null,
) {
  if (!blockScalar) return
  assignFrontmatterValue(frontmatter, blockScalar.key, blockScalarValue(blockScalar))
}

function blockScalarValue(blockScalar: BlockScalarState): FrontmatterText {
  const lines = normalizedBlockScalarLines(blockScalar.lines)
  if (blockScalar.style === 'literal') return lines.join('\n')
  return foldedBlockScalarValue(lines)
}

function normalizedBlockScalarLines(lines: FrontmatterLine[]): FrontmatterLine[] {
  const indent = minimumBlockScalarIndent(lines)
  return lines.map((line) => line.trim() === '' ? '' : line.slice(indent))
}

function minimumBlockScalarIndent(lines: FrontmatterLine[]): number {
  const indents = lines
    .filter((line) => line.trim() !== '')
    .map((line) => line.search(/\S/u))
    .filter((indent) => indent >= 0)

  return indents.length > 0 ? Math.min(...indents) : 0
}

function foldedBlockScalarValue(lines: FrontmatterLine[]): FrontmatterText {
  return lines.reduce<FrontmatterText>((text, line) => {
    if (line === '') return text.endsWith('\n') || text === '' ? text : `${text}\n`
    if (text === '' || text.endsWith('\n')) return `${text}${line}`
    return `${text} ${line}`
  }, '')
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
  return scalarQuote(value) !== null
}

function scalarQuote(value: FrontmatterText): '"' | '\'' | null {
  const quote = value.at(0)
  if (isQuote(quote) && value.at(-1) === quote) return quote
  return null
}

function unquote(value: FrontmatterText): FrontmatterText {
  const quote = scalarQuote(value)
  return quote === null ? value : unquoteFrontmatterKey(value.slice(1, -1), quote)
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

function frontmatterBlockScalar(value: string): string {
  const lines = value.replace(/\r\n/gu, '\n').split('\n')
  const clippedLines = lines.at(-1) === '' ? lines.slice(0, -1) : lines
  return `|\n${clippedLines.map(indentedBlockScalarLine).join('\n')}`
}

function indentedBlockScalarLine(line: string): string {
  return line === '' ? '' : `  ${line}`
}

function shouldQuoteFrontmatterScalar(value: string): boolean {
  return value === ''
    || /[:#\n\r]/u.test(value)
    || /^[\s[{]/u.test(value)
    || /\s$/u.test(value)
    || isAmbiguousPlainScalar(value)
}

function isAmbiguousPlainScalar(value: string): boolean {
  return /^(?:true|false|null)$/u.test(value) || isNumericScalar(value)
}

function shouldQuoteFrontmatterKey(key: FrontmatterKey): boolean {
  return key === '' || /[^A-Za-z0-9_ -]/u.test(key)
}
