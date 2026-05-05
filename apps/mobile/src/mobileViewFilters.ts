import type { MobileNote } from './mobileNoteProjection'

export type MobileFilterOp =
  | 'after'
  | 'any_of'
  | 'before'
  | 'contains'
  | 'equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'none_of'
  | 'not_contains'
  | 'not_equals'

export type MobileFilterCondition = {
  field: string
  op: MobileFilterOp
  value?: string | string[]
}

export type MobileFilterGroup = { all: MobileFilterNode[] } | { any: MobileFilterNode[] }
export type MobileFilterNode = MobileFilterCondition | MobileFilterGroup

export type MobileViewDefinition = {
  color: string
  filters: MobileFilterGroup
  icon: string
  id: string
  name: string
}

export const mobileFixtureViewDefinitions: MobileViewDefinition[] = [
  {
    color: '#3f7f5f',
    filters: {
      all: [
        { field: 'favorite', op: 'equals', value: 'true' },
        { any: [{ field: 'type', op: 'equals', value: 'Essay' }, { field: 'tags', op: 'contains', value: 'mobile' }] },
      ],
    },
    icon: 'sun',
    id: 'favorite-mobile-work',
    name: 'Favorite mobile work',
  },
  {
    color: '#356fd6',
    filters: {
      all: [
        { field: 'archived', op: 'not_equals', value: 'true' },
        { any: [{ field: 'status', op: 'equals', value: 'Draft' }, { field: 'related_to', op: 'contains', value: 'mobile-roadmap' }] },
      ],
    },
    icon: 'git-branch',
    id: 'active-drafts',
    name: 'Active drafts',
  },
]

export function evaluateMobileView({
  notes,
  view,
}: {
  notes: MobileNote[]
  view: MobileViewDefinition
}) {
  return notes.filter((note) => evaluateGroup({ group: view.filters, note }))
}

type MobileFieldValue = string | string[] | undefined
type OperationMatcher = (value: MobileFieldValue, expected: string | string[] | undefined) => boolean

const operationMatchers: Record<MobileFilterOp, OperationMatcher> = {
  after: (value, expected) => scalarValue(value) > scalarValue(expected),
  any_of: (value, expected) => arrayValues(expected).some((item) => arrayValues(value).some((actual) => wikilinkEquals(actual, item))),
  before: (value, expected) => scalarValue(value) < scalarValue(expected),
  contains: (value, expected) => arrayValues(value).some((item) => containsValue({ actual: item, expected: scalarValue(expected) })),
  equals: (value, expected) => scalarValue(value) === scalarValue(expected),
  is_empty: (value) => arrayValues(value).length === 0 || arrayValues(value).every((item) => item.length === 0),
  is_not_empty: (value) => arrayValues(value).some((item) => item.length > 0),
  none_of: (value, expected) => !operationMatchers.any_of(value, expected),
  not_contains: (value, expected) => !operationMatchers.contains(value, expected),
  not_equals: (value, expected) => !operationMatchers.equals(value, expected),
}

function evaluateGroup({
  group,
  note,
}: {
  group: MobileFilterGroup
  note: MobileNote
}): boolean {
  return 'all' in group
    ? group.all.every((node) => evaluateNode({ node, note }))
    : group.any.some((node) => evaluateNode({ node, note }))
}

function evaluateNode({
  node,
  note,
}: {
  node: MobileFilterNode
  note: MobileNote
}) {
  return isFilterGroup(node) ? evaluateGroup({ group: node, note }) : evaluateCondition({ condition: node, note })
}

function evaluateCondition({
  condition,
  note,
}: {
  condition: MobileFilterCondition
  note: MobileNote
}) {
  return operationMatchers[condition.op](valueForField({ field: condition.field, note }), condition.value)
}

function valueForField({
  field,
  note,
}: {
  field: string
  note: MobileNote
}) {
  return standardFieldValues(note)[field.toLowerCase()] ?? note.relationships[field] ?? note.customProperties[field] ?? ''
}

function standardFieldValues(note: MobileNote): Record<string, MobileFieldValue> {
  return {
    archived: String(note.archived),
    belongs_to: note.belongsTo,
    favorite: String(note.favorite),
    has: note.has,
    related_to: note.relatedTo,
    status: note.status ?? '',
    tags: note.tags,
    type: note.type,
  }
}

function containsValue({
  actual,
  expected,
}: {
  actual: string
  expected: string
}) {
  return expected.startsWith('[[') ? wikilinkEquals(actual, expected) : wikilinkStem(actual).includes(wikilinkStem(expected))
}

function wikilinkEquals(left: string, right: string) {
  return wikilinkParts(left).some((part) => wikilinkParts(right).includes(part))
}

function wikilinkParts(value: string) {
  const [target, alias] = wikilinkStem(value).split('|')
  return [target, alias].filter(isText)
}

function wikilinkStem(value: string) {
  return value.trim().replace(/^\[\[|\]\]$/g, '').toLowerCase()
}

function scalarValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? ''
}

function arrayValues(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : isText(value) ? [value] : []
}

function isFilterGroup(node: MobileFilterNode): node is MobileFilterGroup {
  return 'all' in node || 'any' in node
}

function isText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
