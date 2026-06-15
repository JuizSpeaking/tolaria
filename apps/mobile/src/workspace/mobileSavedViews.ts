import type {
  MobileNote,
  MobileSavedView,
  MobileViewDefinition,
  MobileViewFilterCondition,
  MobileViewFilterGroup,
  MobileViewFilterNode,
  MobileViewFilterOp,
} from './mobileWorkspaceModel'

type ViewFileSource = {
  content: string
  relativePath: string
}

type YamlLine = {
  indent: number
  text: string
}

type FilterParseResult = {
  group: MobileViewFilterGroup
  nextIndex: number
}

type FieldKey = string
type MobileArrayFieldKind = 'property' | 'relationship'
type ResolvedMobileField =
  | { arrayKind: MobileArrayFieldKind; kind: 'array'; values: string[] }
  | { kind: 'scalar'; value: string | number | boolean | null }
type FilterGroupKind = 'all' | 'any'
type BuiltInFieldResolver = (note: MobileNote) => ResolvedMobileField
type IndentLevel = number
type LineIndex = number
type MobileTextValues = string[]
type SortDirection = 'asc' | 'desc'
type SortField = { key: FieldKey; kind: 'builtIn' | 'property' }
type SortValue = string | null
type ViewFilename = string
type ViewIndex = number
type ViewPath = string
type YamlText = string
type YamlScalar = string | number | boolean | null

const viewFilenameExtension = '.yml'
const fallbackViewFilenameStem = 'view'
const windowsReservedDeviceNames = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

const supportedFilterOps = new Set<MobileViewFilterOp>([
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'any_of',
  'none_of',
  'is_empty',
  'is_not_empty',
  'before',
  'after',
])
const builtInSortFields = new Set(['created', 'modified', 'status', 'title', 'type'])
const regexFilterOps = new Set<MobileViewFilterOp>(['contains', 'equals', 'not_contains', 'not_equals'])
const maxUserRegexLength = 256

const builtInFieldResolvers: Record<string, BuiltInFieldResolver> = {
  archived: (note) => scalarField(note.archived === true),
  body: (note) => scalarField(note.snippet),
  created: (note) => scalarField(note.createdAt ?? note.created),
  favorite: (note) => scalarField(note.favorite),
  filename: (note) => scalarField(note.path?.split('/').at(-1) ?? note.id),
  isa: (note) => scalarField(note.type),
  modified: (note) => scalarField(note.modifiedAt ?? note.modified),
  organized: (note) => scalarField(note.organized === true),
  path: (note) => scalarField(note.path ?? note.id),
  status: (note) => scalarField(note.status),
  tags: (note) => arrayField(note.tags, 'property'),
  title: (note) => scalarField(note.title),
  type: (note) => scalarField(note.type),
}

export function parseMobileSavedViewFile(file: ViewFileSource, index: ViewIndex): MobileSavedView | null {
  if (!isViewFile(file.relativePath)) return null

  const lines = yamlLines(file.content)
  const filename = file.relativePath.split('/').at(-1) ?? `view-${index + 1}.yml`
  const definition = parseViewDefinition(lines, filename, index)

  return {
    definition,
    filename,
    id: mobileSavedViewId(filename),
  }
}

export function orderedMobileSavedViews(views: MobileSavedView[]): MobileSavedView[] {
  return [...views].sort(compareSavedViews)
}

export type MobileViewMoveDirection = 'down' | 'up'

export function nextMobileSavedViewOrder(views: MobileSavedView[]): number {
  const explicitOrders = views
    .map((view) => view.definition.order)
    .filter((order): order is number => typeof order === 'number' && Number.isFinite(order))

  return explicitOrders.length > 0 ? Math.max(...explicitOrders) + 1 : views.length
}

export function canMoveMobileSavedView(
  views: MobileSavedView[],
  viewId: string,
  direction: MobileViewMoveDirection,
): boolean {
  const index = savedViewIndex(views, viewId)
  if (index === -1) return false

  const nextIndex = savedViewDestinationIndex(index, direction)
  return nextIndex >= 0 && nextIndex < views.length
}

export function moveMobileSavedView(
  views: MobileSavedView[],
  viewId: string,
  direction: MobileViewMoveDirection,
): MobileSavedView[] | null {
  if (!canMoveMobileSavedView(views, viewId, direction)) return null

  const index = savedViewIndex(views, viewId)
  const nextIndex = savedViewDestinationIndex(index, direction)
  const reordered = [...views]
  const [view] = reordered.splice(index, 1)
  reordered.splice(nextIndex, 0, view)
  return reordered
}

export function mobileSavedViewOrderUpdates(views: MobileSavedView[]): MobileSavedView[] {
  return views.map((view, order) => ({
    ...view,
    definition: { ...view.definition, order },
  }))
}

export function evaluateMobileSavedView(view: MobileSavedView, notes: MobileNote[]): MobileNote[] {
  const matchingNotes = notes.filter((note) => !note.archived && evaluateFilterGroup(view.definition.filters, note))
  return sortMobileNotesBySort(matchingNotes, view.definition.sort)
}

export function mobileSavedViewId(filename: string) {
  return `view-${slugify(filename.replace(/\.[^.]+$/, ''))}`
}

export function createMobileSavedViewFilename(name: string, existingFilenames: string[] = []): string {
  const baseStem = slugifyViewFilenameStem(name)
  const usedFilenames = new Set(existingFilenames.map((filename) => filename.toLocaleLowerCase()))
  let candidateStem = baseStem
  let suffix = 2

  while (usedFilenames.has(viewFilenameFromStem(candidateStem).toLocaleLowerCase())) {
    candidateStem = `${baseStem}-${suffix}`
    suffix += 1
  }

  return viewFilenameFromStem(candidateStem)
}

export function mobileSavedViewPath(filename: ViewFilename): ViewPath {
  return `views/${filename}`
}

export function serializeMobileSavedViewDefinition(definition: MobileViewDefinition): string {
  const lines = [
    `name: ${yamlScalar(definition.name)}`,
    `icon: ${yamlScalar(definition.icon)}`,
    `color: ${yamlScalar(definition.color)}`,
    `sort: ${yamlScalar(definition.sort)}`,
  ]

  if (typeof definition.order === 'number') lines.push(`order: ${definition.order}`)
  if (definition.listPropertiesDisplay?.length) {
    lines.push('listPropertiesDisplay:')
    lines.push(...definition.listPropertiesDisplay.map((item) => `  - ${yamlScalar(item)}`))
  }

  lines.push('filters:')
  lines.push(...serializedFilterGroup(definition.filters, 2))

  return `${lines.join('\n')}\n`
}

function isViewFile(path: ViewPath) {
  return /^views\/[^/]+\.ya?ml$/u.test(path)
}

function parseViewDefinition(lines: YamlLine[], filename: ViewFilename, index: ViewIndex): MobileViewDefinition {
  return {
    color: optionalTopLevelString(lines, 'color'),
    filters: parseFilters(lines),
    icon: optionalTopLevelString(lines, 'icon'),
    listPropertiesDisplay: topLevelList(lines, 'listPropertiesDisplay'),
    name: optionalTopLevelString(lines, 'name') ?? fallbackViewName(filename, index),
    order: topLevelNumber(lines, 'order'),
    sort: optionalTopLevelString(lines, 'sort'),
  }
}

function parseFilters(lines: YamlLine[]): MobileViewFilterGroup {
  const filtersIndex = lines.findIndex((line) => line.indent === 0 && line.text === 'filters:')
  if (filtersIndex === -1) return { all: [] }

  const groupLine = lines[filtersIndex + 1]
  if (!groupLine || groupLine.indent !== 2) return { all: [] }

  return parseGroupAt(lines, filtersIndex + 1).group
}

function parseGroupAt(lines: YamlLine[], index: LineIndex): FilterParseResult {
  const line = lines[index]
  const kind = groupKind(line?.text ?? '')
  if (!line || !kind) return { group: { all: [] }, nextIndex: index + 1 }

  return parseGroupItems(lines, index + 1, line.indent + 2, kind)
}

function parseGroupItems(
  lines: YamlLine[],
  startIndex: LineIndex,
  itemIndent: IndentLevel,
  kind: FilterGroupKind,
): FilterParseResult {
  const nodes: MobileViewFilterNode[] = []
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index]
    if (line.indent < itemIndent) break
    if (line.indent !== itemIndent || !line.text.startsWith('- ')) {
      index += 1
      continue
    }

    const parsed = parseFilterNode(lines, index, itemIndent)
    nodes.push(parsed.node)
    index = parsed.nextIndex
  }

  return { group: kind === 'any' ? { any: nodes } : { all: nodes }, nextIndex: index }
}

function parseFilterNode(
  lines: YamlLine[],
  index: LineIndex,
  itemIndent: IndentLevel,
): { nextIndex: number; node: MobileViewFilterNode } {
  const inlineText = lines[index].text.slice(2).trim()
  const inlineGroup = groupKind(inlineText)
  if (inlineGroup) {
    const result = parseGroupItems(lines, index + 1, itemIndent + 4, inlineGroup)
    return { nextIndex: result.nextIndex, node: result.group }
  }

  return parseCondition(lines, index, itemIndent, inlineText)
}

function parseCondition(
  lines: YamlLine[],
  index: LineIndex,
  itemIndent: IndentLevel,
  inlineText: YamlText,
): { nextIndex: number; node: MobileViewFilterCondition } {
  const entries: Record<string, unknown> = {}
  applyKeyValue(entries, inlineText)

  let nextIndex = index + 1
  while (nextIndex < lines.length && lines[nextIndex].indent > itemIndent) {
    const line = lines[nextIndex]
    if (line.indent === itemIndent + 2) {
      const parsed = parseConditionProperty(lines, nextIndex, itemIndent + 2)
      if (parsed) {
        Reflect.set(entries, parsed.key, parsed.value)
        nextIndex = parsed.nextIndex
        continue
      }
    }
    nextIndex += 1
  }

  return {
    nextIndex,
    node: normalizeCondition(entries),
  }
}

function parseConditionProperty(lines: YamlLine[], index: LineIndex, indent: IndentLevel) {
  const keyValue = keyValueText(lines[index].text)
  if (!keyValue) return null

  if (keyValue.value !== '') {
    return { key: keyValue.key, nextIndex: index + 1, value: parseYamlValue(keyValue.value) }
  }

  return {
    key: keyValue.key,
    nextIndex: index + 1 + listValues(lines, index + 1, indent + 2).consumed,
    value: listValues(lines, index + 1, indent + 2).values,
  }
}

function normalizeCondition(entries: Record<string, unknown>): MobileViewFilterCondition {
  return {
    field: typeof entries.field === 'string' ? entries.field : '',
    op: normalizedFilterOp(entries.op),
    regex: entries.regex === true,
    value: entries.value,
  }
}

function normalizedFilterOp(value: unknown): MobileViewFilterOp {
  if (typeof value !== 'string') return 'equals'
  return supportedFilterOps.has(value as MobileViewFilterOp) ? value as MobileViewFilterOp : 'equals'
}

function evaluateFilterGroup(group: MobileViewFilterGroup, note: MobileNote): boolean {
  if ('any' in group) return group.any.some((node) => evaluateFilterNode(node, note))
  return group.all.every((node) => evaluateFilterNode(node, note))
}

function evaluateFilterNode(node: MobileViewFilterNode, note: MobileNote): boolean {
  if (isFilterGroup(node)) return evaluateFilterGroup(node, note)
  return evaluateCondition(node, note)
}

function evaluateCondition(condition: MobileViewFilterCondition, note: MobileNote): boolean {
  const field = resolveNoteField(note, condition.field)
  const emptyResult = emptyConditionResult(condition.op, field)
  if (emptyResult !== null) return emptyResult

  const regex = conditionRegex(condition)
  if (usesRegex(condition) && !regex) return false

  if (field.kind === 'array') return evaluateArrayCondition(condition, field, regex)
  return evaluateScalarCondition(condition, field.value, regex)
}

function evaluateArrayCondition(
  condition: MobileViewFilterCondition,
  field: Extract<ResolvedMobileField, { kind: 'array' }>,
  regex: RegExp | null,
) {
  if (field.arrayKind === 'relationship') return evaluateRelationshipArrayCondition(condition, field.values, regex)
  return evaluatePropertyArrayCondition(condition, field.values, regex)
}

function evaluatePropertyArrayCondition(
  condition: MobileViewFilterCondition,
  values: string[],
  regex: RegExp | null,
) {
  const target = textValue(condition.value)
  const normalizedValues = new Set(values.map(normalizedText))
  const contains = normalizedValues.has(target.toLowerCase())
  const equals = values.length === 1 && contains
  const matchesAny = conditionTextList(condition.value)?.some((value) => normalizedValues.has(value.toLowerCase())) ?? false
  const regexMatched = regex ? values.some((value) => regex.test(value)) : false

  if (regex) return textMatchResult(condition.op, regexMatched)
  return arrayMatchResult(condition.op, { contains, equals, matchesAny })
}

function evaluateRelationshipArrayCondition(
  condition: MobileViewFilterCondition,
  values: string[],
  regex: RegExp | null,
) {
  const field = relationshipArrayField(values)
  const contains = relationshipContains(field, textValue(condition.value))
  const equals = field.length === 1 && relationshipEquals(field[0] ?? '', textValue(condition.value))
  const matchesAny = conditionTextList(condition.value)?.some((value) => field.some((ref) => relationshipEquals(ref, value))) ?? false
  const regexMatched = regex ? field.some((ref) => relationshipRegexCandidates(ref).some((candidate) => regex.test(candidate))) : false

  if (regex) return textMatchResult(condition.op, regexMatched)
  return arrayMatchResult(condition.op, { contains, equals, matchesAny })
}

function arrayMatchResult(
  op: MobileViewFilterOp,
  result: { contains: boolean; equals: boolean; matchesAny: boolean },
) {
  if (op === 'contains') return result.contains
  if (op === 'not_contains') return !result.contains
  if (op === 'equals') return result.equals
  if (op === 'not_equals') return !result.equals
  if (op === 'any_of') return result.matchesAny
  if (op === 'none_of') return !result.matchesAny
  return false
}

function textMatchResult(op: MobileViewFilterOp, matched: boolean): boolean {
  if (op === 'contains' || op === 'equals') return matched
  if (op === 'not_contains' || op === 'not_equals') return !matched
  return false
}

function conditionRegex(condition: MobileViewFilterCondition): RegExp | null {
  if (!usesRegex(condition)) return null

  const source = textValue(condition.value)
  if (source.length > maxUserRegexLength) return null

  try {
    return new RegExp(source, 'i')
  } catch {
    return null
  }
}

function usesRegex(condition: MobileViewFilterCondition): boolean {
  return condition.regex === true && regexFilterOps.has(condition.op)
}

function relationshipArrayField(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

function evaluateScalarCondition(
  condition: MobileViewFilterCondition,
  value: string | number | boolean | null,
  regex: RegExp | null,
) {
  const dateResult = dateConditionResult(condition, value)
  if (dateResult !== null) return dateResult

  const rawText = textValue(value)
  if (regex) return textMatchResult(condition.op, regex.test(rawText))

  return scalarTextConditionResult(condition, normalizedText(rawText), normalizedText(condition.value))
}

function scalarTextConditionResult(
  condition: MobileViewFilterCondition,
  text: string,
  target: string,
) {
  const comparisonResult = scalarTextComparisonResult(condition.op, text, target)
  if (comparisonResult !== null) return comparisonResult

  const setResult = scalarSetConditionResult(condition, text)
  if (setResult !== null) return setResult
  return false
}

function scalarTextComparisonResult(op: MobileViewFilterOp, text: string, target: string): boolean | null {
  if (op === 'equals') return text === target
  if (op === 'not_equals') return text !== target
  if (op === 'contains') return text.includes(target)
  if (op === 'not_contains') return !text.includes(target)
  return null
}

function scalarSetConditionResult(condition: MobileViewFilterCondition, text: string): boolean | null {
  if (condition.op === 'any_of') return conditionValues(condition.value).includes(text)
  if (condition.op === 'none_of') return !conditionValues(condition.value).includes(text)
  return null
}

function resolveNoteField(note: MobileNote, field: FieldKey): ResolvedMobileField {
  const lower = field.toLowerCase()
  return builtInFieldResolvers[lower]?.(note)
    ?? resolveRelationshipField(note, lower)
    ?? resolvePropertyField(note, lower)
    ?? scalarField(null)
}

function resolveRelationshipField(note: MobileNote, lowerField: FieldKey): ResolvedMobileField | null {
  const relationship = note.relationships.find((candidate) => relationshipKeys(candidate).includes(lowerField))
  if (!relationship) return null

  return arrayField(relationship.values.map((value) => value.ref ?? value.title), 'relationship')
}

function resolvePropertyField(note: MobileNote, lowerField: FieldKey): ResolvedMobileField | null {
  const property = note.properties?.find((candidate) => candidate.key.toLowerCase() === lowerField)
  if (!property) return null

  return Array.isArray(property.value) ? arrayField(property.value, 'property') : scalarField(property.value)
}

export function sortMobileNotesBySort(notes: MobileNote[], sort: SortValue): MobileNote[] {
  const sortSpec = sortConfig(sort)
  if (!sortSpec) return notes

  return [...notes].sort((left, right) => compareNotes(left, right, sortSpec.field, sortSpec.direction))
}

function compareNotes(left: MobileNote, right: MobileNote, field: SortField, direction: SortDirection) {
  const leftValue = sortFieldValue(left, field)
  const rightValue = sortFieldValue(right, field)
  const missingResult = compareMissingValues(leftValue, rightValue)
  if (missingResult !== null) return missingResult

  const result = comparePresentFieldValue(leftValue, rightValue)
  return direction === 'asc' ? result : -result
}

function sortFieldValue(note: MobileNote, field: SortField): string | number | boolean | null {
  if (field.kind === 'property') return sortPropertyValue(note, field.key)
  if (field.key === 'modified') return note.modifiedAt ?? 0
  if (field.key === 'created') return note.createdAt ?? 0
  if (field.key === 'title') return note.title
  if (field.key === 'type') return note.type
  if (field.key === 'status') return note.status
  return null
}

function sortPropertyValue(note: MobileNote, key: FieldKey): string | number | boolean | null {
  const property = note.properties?.find((candidate) => candidate.key.toLowerCase() === key.toLowerCase())
  const value = Array.isArray(property?.value) ? property.value[0] : property?.value
  return value ?? null
}

function sortConfig(sort: SortValue): { direction: SortDirection; field: SortField } | null {
  const rawSort = sort ?? ''
  const directionSeparator = rawSort.lastIndexOf(':')
  if (directionSeparator <= 0) return null

  const direction = rawSort.slice(directionSeparator + 1)
  const rawField = rawSort.slice(0, directionSeparator)
  if (direction !== 'asc' && direction !== 'desc') return null

  return { direction, field: sortField(rawField) }
}

function sortField(rawField: FieldKey): SortField {
  const propertyPrefix = 'property:'
  if (rawField.startsWith(propertyPrefix)) {
    return { key: rawField.slice(propertyPrefix.length), kind: 'property' }
  }

  const field = rawField.toLowerCase()
  return builtInSortFields.has(field) ? { key: field, kind: 'builtIn' } : { key: rawField, kind: 'property' }
}

function compareMissingValues(left: string | number | boolean | null, right: string | number | boolean | null) {
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1
  return null
}

function comparePresentFieldValue(left: string | number | boolean | null, right: string | number | boolean | null) {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
  return normalizedText(left).localeCompare(normalizedText(right))
}

function emptyConditionResult(op: MobileViewFilterOp, field: ResolvedMobileField): boolean | null {
  if (op !== 'is_empty' && op !== 'is_not_empty') return null

  const empty = field.kind === 'array'
    ? field.values.length === 0
    : field.value === null || field.value === '' || field.value === false

  return op === 'is_empty' ? empty : !empty
}

function dateConditionResult(
  condition: MobileViewFilterCondition,
  value: string | number | boolean | null,
): boolean | null {
  const left = dateTimestamp(value)
  const right = dateTimestamp(condition.value)
  if (left === null || right === null) return null

  if (condition.op === 'equals') return isSameLocalDay(left, right)
  if (condition.op === 'not_equals') return !isSameLocalDay(left, right)
  if (condition.op !== 'before' && condition.op !== 'after') return null

  return condition.op === 'before' ? left < right : left > right
}

function dateTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return normalizedTimestamp(value)
  if (typeof value !== 'string') return null

  const parsed = parseDateFilterInput(value)
  return parsed ? parsed.getTime() : null
}

function isSameLocalDay(leftTimestamp: number, rightTimestamp: number): boolean {
  const left = new Date(leftTimestamp)
  const right = new Date(rightTimestamp)
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function normalizedTimestamp(value: number): number {
  return value > 10_000_000_000 ? value : value * 1000
}

function yamlLines(content: string): YamlLine[] {
  return content
    .split(/\r?\n/u)
    .map((rawLine) => rawLine.replace(/\s+#.*$/u, ''))
    .filter((line) => line.trim().length > 0)
    .map((line) => ({ indent: line.search(/\S/u), text: line.trim() }))
}

function optionalTopLevelString(lines: YamlLine[], key: FieldKey) {
  const value = topLevelValue(lines, key)
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function topLevelNumber(lines: YamlLine[], key: FieldKey) {
  const value = topLevelValue(lines, key)
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function topLevelList(lines: YamlLine[], key: FieldKey) {
  const index = lines.findIndex((line) => line.indent === 0 && line.text === `${key}:`)
  if (index === -1) return undefined

  const { values } = listValues(lines, index + 1, 2)
  return values.length > 0 ? values.map(String) : undefined
}

function topLevelValue(lines: YamlLine[], key: FieldKey): unknown {
  const prefix = `${key}:`
  const line = lines.find((candidate) => candidate.indent === 0 && candidate.text.startsWith(prefix))
  if (!line) return null
  return parseYamlValue(line.text.slice(prefix.length).trim())
}

function listValues(lines: YamlLine[], startIndex: LineIndex, indent: IndentLevel) {
  const values: unknown[] = []
  let index = startIndex
  while (isListValue(lines[index], indent)) {
    values.push(parseYamlValue(lines[index].text.slice(2).trim()))
    index += 1
  }
  return { consumed: index - startIndex, values }
}

function isListValue(line: YamlLine | undefined, indent: number) {
  return line?.indent === indent && line.text.startsWith('- ')
}

function applyKeyValue(target: Record<string, unknown>, text: YamlText) {
  const parsed = keyValueText(text)
  if (parsed) Reflect.set(target, parsed.key, parseYamlValue(parsed.value))
}

function keyValueText(text: YamlText) {
  const separatorIndex = text.indexOf(':')
  if (separatorIndex === -1) return null

  return {
    key: text.slice(0, separatorIndex).trim(),
    value: text.slice(separatorIndex + 1).trim(),
  }
}

function parseYamlValue(value: YamlText): unknown {
  const unquoted = unquote(value)
  const lower = unquoted.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  if (lower === 'null') return null
  if (/^-?\d+(?:\.\d+)?$/u.test(unquoted)) return Number(unquoted)
  if (unquoted.startsWith('[') && unquoted.endsWith(']')) return parseInlineList(unquoted)
  return unquoted
}

function parseInlineList(value: YamlText) {
  return value.slice(1, -1).split(',').map((item) => parseYamlValue(item.trim()))
}

function unquote(value: YamlText) {
  const quote = value.at(0)
  if ((quote === '"' || quote === '\'') && value.at(-1) === quote) return value.slice(1, -1)
  return value
}

function groupKind(text: YamlText): FilterGroupKind | null {
  if (text === 'all:') return 'all'
  if (text === 'any:') return 'any'
  return null
}

function isFilterGroup(node: MobileViewFilterNode): node is MobileViewFilterGroup {
  return 'all' in node || 'any' in node
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

function scalarField(value: string | number | boolean | null): ResolvedMobileField {
  return { kind: 'scalar', value }
}

function arrayField(values: MobileTextValues, arrayKind: MobileArrayFieldKind): ResolvedMobileField {
  return { arrayKind, kind: 'array', values }
}

function conditionValues(value: unknown): string[] {
  return Array.isArray(value) ? value.map(normalizedText) : [normalizedText(value)]
}

function normalizedText(value: unknown) {
  return textValue(value).toLowerCase()
}

function textValue(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function conditionTextList(value: unknown): string[] | null {
  return Array.isArray(value) ? value.map(textValue) : null
}

function fallbackViewName(filename: ViewFilename, index: ViewIndex) {
  const fallback = filename.replace(/\.[^.]+$/, '').replaceAll('-', ' ').trim()
  return fallback ? titleCase(fallback) : `View ${index + 1}`
}

function titleCase(value: YamlText) {
  return value.replace(/\b\w/gu, (char) => char.toUpperCase())
}

function slugifyViewFilenameStem(name: string): string {
  const stem = name
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/(^-+|-+$)/gu, '')

  return avoidReservedDeviceName(stem || fallbackViewFilenameStem)
}

function viewFilenameFromStem(stem: string): ViewFilename {
  return `${stem}${viewFilenameExtension}`
}

function avoidReservedDeviceName(stem: string): string {
  return windowsReservedDeviceNames.has(stem.toLocaleUpperCase()) ? `${stem}-view` : stem
}

const relativeNumberWords = new Map([
  ['a', 1],
  ['an', 1],
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['eleven', 11],
  ['twelve', 12],
])
const relativeDayOffsets = new Map([
  ['today', 0],
  ['yesterday', -1],
  ['tomorrow', 1],
])

function parseDateFilterInput(value: string, reference = new Date()): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const relative = parseRelativeDateInput(trimmed, reference)
  if (relative) return relative

  const isoDate = parseIsoDateOnly(trimmed)
  if (isoDate) return isoDate

  const timestamp = Date.parse(trimmed)
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function parseIsoDateOnly(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseRelativeDateInput(value: string, reference: Date): Date | null {
  const normalized = value.trim().toLowerCase()
  const base = startOfLocalDay(reference)
  const namedOffset = relativeDayOffsets.get(normalized)
  if (namedOffset !== undefined) return shiftDate(base, 'day', namedOffset)

  const relative = relativeDateParts(normalized)
  if (!relative) return null

  return shiftDate(base, relative.unit, relative.future ? relative.amount : -relative.amount)
}

function relativeDateParts(value: string): { amount: number; future: boolean; unit: 'day' | 'month' | 'week' | 'year' } | null {
  const tokens = value.split(/\s+/u)
  return futureRelativeDateParts(tokens) ?? pastRelativeDateParts(tokens)
}

function futureRelativeDateParts(tokens: string[]): { amount: number; future: true; unit: 'day' | 'month' | 'week' | 'year' } | null {
  if (tokens.length !== 3 || tokens[0] !== 'in') return null
  const amount = relativeAmount(tokens[1] ?? '')
  const unit = relativeUnit(tokens[2] ?? '')
  if (amount === null || unit === null) return null

  return { amount, future: true, unit }
}

function pastRelativeDateParts(tokens: string[]): { amount: number; future: false; unit: 'day' | 'month' | 'week' | 'year' } | null {
  if (tokens.length !== 3 || tokens[2] !== 'ago') return null
  const amount = relativeAmount(tokens[0] ?? '')
  const unit = relativeUnit(tokens[1] ?? '')
  if (amount === null || unit === null) return null

  return { amount, future: false, unit }
}

function relativeAmount(value: string): number | null {
  if (/^\d+$/u.test(value)) return Number(value)
  return relativeNumberWords.get(value) ?? null
}

function relativeUnit(value: string): 'day' | 'month' | 'week' | 'year' | null {
  const unit = value.toLowerCase().replace(/s$/u, '')
  if (unit === 'day' || unit === 'week' || unit === 'month' || unit === 'year') return unit
  return null
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function shiftDate(value: Date, unit: 'day' | 'month' | 'week' | 'year', amount: number): Date {
  const next = new Date(value)
  if (unit === 'day') next.setDate(next.getDate() + amount)
  if (unit === 'week') next.setDate(next.getDate() + amount * 7)
  if (unit === 'month') next.setMonth(next.getMonth() + amount)
  if (unit === 'year') next.setFullYear(next.getFullYear() + amount)
  return next
}

function relationshipContains(values: string[], targetValue: string): boolean {
  const target = relationshipValue(targetValue)
  return values.some((value) => {
    const candidate = relationshipValue(value)
    return target.bracketed
      ? relationshipEquals(value, targetValue)
      : candidate.stem.toLowerCase().includes(target.stem.toLowerCase())
  })
}

function relationshipEquals(value: string, targetValue: string): boolean {
  const candidateParts = relationshipValue(value).parts
  const targetParts = relationshipValue(targetValue).parts
  return candidateParts.some((candidate) => targetParts.includes(candidate))
}

function relationshipRegexCandidates(value: string): string[] {
  const trimmed = value.trim()
  const parsed = relationshipValue(trimmed)
  return [trimmed, parsed.stem, ...parsed.parts].filter(Boolean)
}

function relationshipValue(value: string) {
  const trimmed = value.trim()
  const inner = trimmed.replace(/^\[\[/u, '').replace(/\]\]$/u, '')
  const pipeIndex = inner.indexOf('|')
  const stem = pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner
  const alias = pipeIndex >= 0 ? inner.slice(pipeIndex + 1) : null

  return {
    bracketed: trimmed.startsWith('[['),
    parts: [stem, alias].filter((part): part is string => Boolean(part)).map((part) => part.toLowerCase()),
    stem,
  }
}

function serializedFilterGroup(group: MobileViewFilterGroup, indent: number): string[] {
  const kind = 'any' in group ? 'any' : 'all'
  const nodes = 'any' in group ? group.any : group.all
  const prefix = spaces(indent)

  return [
    `${prefix}${kind}:`,
    ...nodes.flatMap((node) => serializedFilterNode(node, indent + 2)),
  ]
}

function serializedFilterNode(node: MobileViewFilterNode, indent: number): string[] {
  if (isFilterGroup(node)) return serializedNestedFilterGroup(node, indent)
  return serializedFilterCondition(node, indent)
}

function serializedNestedFilterGroup(group: MobileViewFilterGroup, indent: number): string[] {
  const kind = 'any' in group ? 'any' : 'all'
  const nodes = 'any' in group ? group.any : group.all
  const prefix = spaces(indent)

  return [
    `${prefix}- ${kind}:`,
    ...nodes.flatMap((node) => serializedFilterNode(node, indent + 4)),
  ]
}

function serializedFilterCondition(condition: MobileViewFilterCondition, indent: number): string[] {
  const prefix = spaces(indent)
  const childPrefix = spaces(indent + 2)
  const lines = [
    `${prefix}- field: ${yamlScalar(condition.field)}`,
    `${childPrefix}op: ${yamlScalar(condition.op)}`,
  ]

  if (condition.regex === true) lines.push(`${childPrefix}regex: true`)
  if (condition.value !== undefined) lines.push(...serializedYamlValue('value', condition.value, indent + 2))

  return lines
}

function serializedYamlValue(key: string, value: unknown, indent: number): string[] {
  const prefix = spaces(indent)
  if (!Array.isArray(value)) return [`${prefix}${key}: ${yamlScalar(yamlSerializableScalar(value))}`]

  return [
    `${prefix}${key}:`,
    ...value.map((item) => `${spaces(indent + 2)}- ${yamlScalar(yamlSerializableScalar(item))}`),
  ]
}

function yamlSerializableScalar(value: unknown): YamlScalar {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) return value
  return String(value)
}

function yamlScalar(value: YamlScalar): string {
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function spaces(count: number) {
  return ' '.repeat(count)
}

function compareSavedViews(left: MobileSavedView, right: MobileSavedView) {
  const leftOrder = left.definition.order
  const rightOrder = right.definition.order
  if (typeof leftOrder === 'number' && typeof rightOrder === 'number') return leftOrder - rightOrder
  if (typeof leftOrder === 'number') return -1
  if (typeof rightOrder === 'number') return 1
  return left.definition.name.localeCompare(right.definition.name)
}

function savedViewIndex(views: MobileSavedView[], viewId: string): number {
  return views.findIndex((view) => view.id === viewId || view.filename === viewId)
}

function savedViewDestinationIndex(index: number, direction: MobileViewMoveDirection): number {
  return direction === 'up' ? index - 1 : index + 1
}

function slugify(value: YamlText) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '') || 'view'
}
