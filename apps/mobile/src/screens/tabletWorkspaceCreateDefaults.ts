import type {
  MobileCreateNoteDefaults,
  MobilePropertyValue,
  MobileSavedView,
  MobileTypeDefinition,
  MobileTypeDefinitions,
  MobileViewFilterCondition,
  MobileViewFilterGroup,
  MobileViewFilterNode,
} from '../workspace/mobileWorkspaceModel'
import { normalizeRelationshipKey } from '../workspace/mobileWorkspaceSuggestions'
import type { TabletSidebarSelection } from './tabletWorkspaceNavigation'

type MutableCreateDefaults = MobileCreateNoteDefaults & {
  properties: Record<string, MobilePropertyValue>
  relationships: Record<string, string[]>
  tags: string[]
}
type DefaultWriter = (defaults: MutableCreateDefaults, values: unknown[]) => void
type ScalarDefaultKey = keyof Pick<MobileCreateNoteDefaults, 'archived' | 'favorite' | 'folderPath' | 'organized' | 'status' | 'type'>

const ignoredDefaultFields = new Set(['created', 'date', 'links', 'modified', 'title'])
const relationshipDefaultFields = new Set(['belongs_to', 'related_to', 'has'])
const scalarDefaultKeys: ScalarDefaultKey[] = ['type', 'status', 'folderPath', 'archived', 'favorite', 'organized']
const builtInDefaultWriters: Record<string, DefaultWriter> = {
  archived: (defaults, values) => applyBooleanDefault(defaults, 'archived', values[0]),
  favorite: (defaults, values) => applyBooleanDefault(defaults, 'favorite', values[0]),
  organized: (defaults, values) => applyBooleanDefault(defaults, 'organized', values[0]),
  path: (defaults, values) => {
    defaults.folderPath = stringDefault(values) ?? defaults.folderPath
  },
  status: (defaults, values) => {
    defaults.status = stringDefault(values)
  },
  tags: (defaults, values) => {
    defaults.tags.push(...stringDefaults(values))
  },
  type: (defaults, values) => {
    defaults.type = stringDefault(values)
  },
}

export function createNoteDefaultsForSelection(
  selection: TabletSidebarSelection,
  views: MobileSavedView[],
  typeDefinitions?: MobileTypeDefinitions,
): MobileCreateNoteDefaults {
  if (selection.kind === 'folder') return { folderPath: selection.id }
  if (selection.sectionId === 'types') return defaultsForTypeSection(selection, typeDefinitions)
  if (selection.sectionId === 'views') return defaultsForSavedView(selection, views)
  if (selection.sectionId === 'primary' && selection.id === 'archive') return { archived: true }
  if (selection.sectionId === 'favorites') return { favorite: true }

  return {}
}

function defaultsForTypeSection(
  selection: Extract<TabletSidebarSelection, { kind: 'item' }>,
  typeDefinitions: MobileTypeDefinitions | undefined,
): MobileCreateNoteDefaults {
  const type = selection.typeName ?? singularLabel(selection.label)
  const defaults = emptyDefaults()
  defaults.type = type
  applyTypeDefinitionDefaults(defaults, typeDefinitions?.[type])
  return compactDefaults(defaults)
}

function applyTypeDefinitionDefaults(
  defaults: MutableCreateDefaults,
  definition: MobileTypeDefinition | undefined,
) {
  if (!definition) return

  Object.assign(defaults.properties, valuedProperties(definition.properties ?? {}))
  Object.assign(defaults.relationships, valuedRelationships(definition.relationships ?? {}))
}

function valuedProperties(properties: Record<string, MobilePropertyValue>) {
  return Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      return hasValuedPropertyDefault(value) && !isRelationshipDefaultField(normalizedFieldKey(key))
    }),
  )
}

function valuedRelationships(relationships: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(relationships).flatMap(([key, refs]) => {
      const values = refs.map((ref) => ref.trim()).filter(Boolean)
      return values.length > 0 ? [[normalizeRelationshipKey(key), values]] : []
    }),
  )
}

function hasValuedPropertyDefault(value: MobilePropertyValue): boolean {
  if (Array.isArray(value)) return value.length > 0
  return value !== ''
}

function defaultsForSavedView(
  selection: Extract<TabletSidebarSelection, { kind: 'item' }>,
  views: MobileSavedView[],
): MobileCreateNoteDefaults {
  const view = views.find((candidate) => candidate.id === selection.viewId || candidate.id === selection.id)
  if (!view) return {}

  return compactDefaults(defaultsFromFilterGroup(view.definition.filters))
}

function defaultsFromFilterGroup(group: MobileViewFilterGroup): MutableCreateDefaults {
  const defaults = emptyDefaults()
  if ('any' in group) return defaults

  for (const node of group.all) {
    mergeDefaults(defaults, defaultsFromFilterNode(node))
  }

  return defaults
}

function defaultsFromFilterNode(node: MobileViewFilterNode): MutableCreateDefaults {
  if ('all' in node || 'any' in node) return defaultsFromFilterGroup(node)
  return defaultsFromCondition(node)
}

function defaultsFromCondition(condition: MobileViewFilterCondition): MutableCreateDefaults {
  const defaults = emptyDefaults()
  const values = conditionDefaultValues(condition)
  if (values.length === 0) return defaults

  applyConditionDefault(defaults, condition.field, values)
  return defaults
}

function applyConditionDefault(
  defaults: MutableCreateDefaults,
  field: string,
  values: unknown[],
) {
  const key = normalizedFieldKey(field)
  const propertyKey = propertyFieldKey(field)
  if (!key || ignoredDefaultFields.has(key)) return

  const writeBuiltInDefault = builtInDefaultWriters[key]
  if (writeBuiltInDefault) {
    writeBuiltInDefault(defaults, values)
    return
  }

  if (isRelationshipDefaultField(key)) {
    defaults.relationships[normalizeRelationshipKey(key)] = stringDefaults(values).map(wikilinkRef)
    return
  }

  applyPropertyDefault(defaults, propertyKey, values)
}

function conditionDefaultValues(condition: MobileViewFilterCondition): unknown[] {
  if (condition.op === 'equals' || condition.op === 'contains') return [condition.value]
  if (condition.op === 'any_of') return Array.isArray(condition.value) ? condition.value : [condition.value]
  return []
}

function applyBooleanDefault(
  defaults: MutableCreateDefaults,
  key: string,
  value: unknown,
) {
  const parsed = booleanDefault(value)
  if (parsed === null) return
  defaults[key as keyof Pick<MutableCreateDefaults, 'archived' | 'favorite' | 'organized'>] = parsed
}

function applyPropertyDefault(
  defaults: MutableCreateDefaults,
  key: string,
  values: unknown[],
) {
  const propertyValue = propertyDefaultValue(values)
  if (propertyValue !== null) defaults.properties[key] = propertyValue
}

function propertyDefaultValue(values: unknown[]) {
  const cleaned = values.filter((value) => value !== null && value !== undefined)
  if (cleaned.length === 0) return null
  if (cleaned.length === 1) return scalarDefault(cleaned[0])
  return stringDefaults(cleaned)
}

function scalarDefault(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return String(value)
}

function booleanDefault(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  if (['true', 'yes', '1', 'on'].includes(normalized)) return true
  if (['false', 'no', '0', 'off'].includes(normalized)) return false
  return null
}

function stringDefault(values: unknown[]): string | undefined {
  return stringDefaults(values)[0]
}

function stringDefaults(values: unknown[]): string[] {
  return values.map((value) => String(value ?? '').trim()).filter(Boolean)
}

function wikilinkRef(value: string): string {
  return /^\[\[[^\]]+\]\]$/u.test(value) ? value : `[[${value}]]`
}

function normalizedFieldKey(field: string): string {
  return field.trim().replace(/^property:/iu, '').toLowerCase().replaceAll(' ', '_')
}

function propertyFieldKey(field: string): string {
  return field.trim().replace(/^property:/iu, '').trim()
}

function isRelationshipDefaultField(key: string): boolean {
  return relationshipDefaultFields.has(key) || key.startsWith('has_')
}

function mergeDefaults(target: MutableCreateDefaults, source: MutableCreateDefaults) {
  if (source.type) target.type = source.type
  if (source.status) target.status = source.status
  if (source.folderPath) target.folderPath = source.folderPath
  if (source.archived !== undefined) target.archived = source.archived
  if (source.favorite !== undefined) target.favorite = source.favorite
  if (source.organized !== undefined) target.organized = source.organized
  target.tags.push(...source.tags)
  Object.assign(target.properties, source.properties)
  Object.assign(target.relationships, source.relationships)
}

function compactDefaults(defaults: MutableCreateDefaults): MobileCreateNoteDefaults {
  const compact = Object.fromEntries(
    scalarDefaultKeys.flatMap((key) => compactEntry(key, defaults[key])),
  ) as MobileCreateNoteDefaults

  addArrayDefault(compact, 'tags', [...new Set(defaults.tags)])
  addRecordDefault(compact, 'properties', defaults.properties)
  addRecordDefault(compact, 'relationships', defaults.relationships)

  return compact
}

function compactEntry(key: ScalarDefaultKey, value: MobileCreateNoteDefaults[ScalarDefaultKey]) {
  return value === undefined || value === '' ? [] : [[key, value]]
}

function addArrayDefault<Key extends keyof Pick<MobileCreateNoteDefaults, 'tags'>>(
  defaults: MobileCreateNoteDefaults,
  key: Key,
  values: NonNullable<MobileCreateNoteDefaults[Key]>,
) {
  if (values.length > 0) defaults[key] = values
}

function addRecordDefault<Key extends keyof Pick<MobileCreateNoteDefaults, 'properties' | 'relationships'>>(
  defaults: MobileCreateNoteDefaults,
  key: Key,
  values: NonNullable<MobileCreateNoteDefaults[Key]>,
) {
  if (Object.keys(values).length > 0) defaults[key] = values
}

function emptyDefaults(): MutableCreateDefaults {
  return {
    properties: {},
    relationships: {},
    tags: [],
  }
}

function singularLabel(label: string) {
  return label.replace(/s$/u, '')
}
