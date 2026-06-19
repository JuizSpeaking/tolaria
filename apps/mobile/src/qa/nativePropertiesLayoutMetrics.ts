import type {
  NativeLayoutAssertionFailure,
  NativeLayoutMetric,
  NativeLayoutMetricMap,
} from './nativeLayoutMetrics'

type MetricExpectation = {
  id: string
  message: string
  metric: NativeLayoutMetric | undefined
}

type PropertyRowMetrics = {
  label: NativeLayoutMetric | undefined
  row: NativeLayoutMetric | undefined
  value: NativeLayoutMetric | undefined
}

type LayoutExpectation = {
  actual: number | null
  expected: number
  id: string
  message: string
}

type PropertyLayoutContext = {
  expectedPanelWidth: number
  metrics: NativeLayoutMetricMap
}

type PropertyLayoutSpec = PropertyLayoutContext & {
  id: string
}

type PropertyRowFrameSpec = {
  expectedPanelWidth: number
  id: string
  label: string
  row: PropertyRowMetrics
}

type PropertyRowContentSpec = {
  id: string
  label: string
  row: PropertyRowMetrics
}

type RelationshipLayoutSpec = {
  id: string
  metrics: NativeLayoutMetricMap
  sectionId: string
}

const layoutTolerance = 1.5

export const nativePropertiesMetricContract = {
  labelWidth: 86,
  panelPadding: 12,
  panelWidth: 300,
  relationshipRowMinHeight: 28,
  rowMinHeight: 28,
  rowPaddingHorizontal: 6,
} as const

export function assertNativePropertiesLayoutMetrics(context: PropertyLayoutContext): NativeLayoutAssertionFailure[] {
  const rowContext = (id: string): PropertyLayoutSpec => ({ ...context, id })

  return [
    ...assertPropertiesPanelLayout(context),
    ...assertPropertyRowLayout(rowContext('properties.row.type')),
    ...assertPropertyRowLayout(rowContext('properties.row.created')),
    ...assertPropertyRowLayout(rowContext('properties.row.modified')),
    ...assertPropertyRowLayout(rowContext('properties.row.workspace')),
    ...assertPropertyRowLayout(rowContext('properties.row.links')),
    ...assertPropertySectionLayout(rowContext('properties.section.tags')),
    ...assertPropertySectionLayout(rowContext('properties.section.belongs-to')),
    ...assertRelationshipRowLayout({
      id: 'properties.relationship.llm-workflow',
      metrics: context.metrics,
      sectionId: 'properties.section.belongs-to',
    }),
  ]
}

function assertPropertiesPanelLayout({
  expectedPanelWidth,
  metrics,
}: PropertyLayoutContext): NativeLayoutAssertionFailure[] {
  const panel = metrics['properties.panel']

  return [
    ...expectMetric({
      id: 'properties.panel',
      message: 'properties panel is captured before checking native inspector density',
      metric: panel,
    }),
    ...expectClose({
      actual: panel?.width ?? null,
      expected: expectedPanelWidth,
      id: 'properties.panel',
      message: 'properties panel keeps the expected inspector width',
    }),
  ]
}

function assertPropertyRowLayout({
  expectedPanelWidth,
  id,
  metrics,
}: PropertyLayoutSpec): NativeLayoutAssertionFailure[] {
  const row = propertyRowMetrics({ id, metrics })

  return [
    ...assertPropertyRowMetricsCaptured(id, row),
    ...assertPropertyRowFrameLayout({ expectedPanelWidth, id, label: 'property row', row }),
    ...assertPropertyRowContentLayout({ id, label: 'property', row }),
  ]
}

function assertPropertySectionLayout({
  expectedPanelWidth,
  id,
  metrics,
}: PropertyLayoutSpec): NativeLayoutAssertionFailure[] {
  const row = propertyRowMetrics({ id, metrics })

  return [
    ...assertPropertyRowMetricsCaptured(id, row),
    ...assertPropertyRowFrameLayout({ expectedPanelWidth, id, label: 'property section', row }),
    ...expectClose({
      actual: row.label?.x ?? null,
      expected: nativePropertiesMetricContract.rowPaddingHorizontal,
      id,
      message: 'property section label keeps desktop row inset',
    }),
    ...expectClose({
      actual: row.value?.x ?? null,
      expected: nativePropertiesMetricContract.rowPaddingHorizontal,
      id,
      message: 'property section value keeps desktop row inset',
    }),
  ]
}

function assertPropertyRowFrameLayout({
  expectedPanelWidth,
  id,
  label,
  row,
}: PropertyRowFrameSpec): NativeLayoutAssertionFailure[] {
  const expectedRowWidth = expectedPanelWidth - nativePropertiesMetricContract.panelPadding * 2

  return [
    ...expectClose({
      actual: row.row?.x ?? null,
      expected: nativePropertiesMetricContract.panelPadding,
      id,
      message: `${label} keeps desktop panel inset`,
    }),
    ...expectClose({
      actual: row.row?.width ?? null,
      expected: expectedRowWidth,
      id,
      message: `${label} spans the desktop inspector content width`,
    }),
    ...expectAtLeast({
      actual: row.row?.height ?? null,
      expected: nativePropertiesMetricContract.rowMinHeight,
      id,
      message: `${label} keeps desktop minimum height`,
    }),
  ]
}

function assertPropertyRowContentLayout({
  id,
  label,
  row,
}: PropertyRowContentSpec): NativeLayoutAssertionFailure[] {
  return [
    ...expectClose({
      actual: row.label?.x ?? null,
      expected: nativePropertiesMetricContract.rowPaddingHorizontal,
      id,
      message: `${label} label keeps desktop row inset`,
    }),
    ...expectClose({
      actual: row.label?.width ?? null,
      expected: nativePropertiesMetricContract.labelWidth,
      id,
      message: `${label} label keeps desktop label width`,
    }),
    ...expectClose({
      actual: row.row && row.value ? row.row.width - row.value.x - row.value.width : null,
      expected: nativePropertiesMetricContract.rowPaddingHorizontal,
      id,
      message: `${label} value keeps desktop right padding`,
    }),
  ]
}

function assertRelationshipRowLayout({
  id,
  metrics,
  sectionId,
}: RelationshipLayoutSpec): NativeLayoutAssertionFailure[] {
  const row = metrics[`${id}.row`]
  const text = metrics[`${id}.text`]
  const sectionValue = metrics[`${sectionId}.value`]

  return [
    ...expectMetric({
      id,
      message: 'relationship row is captured before checking native relationship density',
      metric: row,
    }),
    ...expectMetric({
      id,
      message: 'relationship text is captured before checking native relationship density',
      metric: text,
    }),
    ...expectMetric({
      id: sectionId,
      message: 'relationship section value is captured before checking full-width rows',
      metric: sectionValue,
    }),
    ...expectClose({
      actual: row?.x ?? null,
      expected: 0,
      id,
      message: 'relationship row starts at the property value edge',
    }),
    ...expectClose({
      actual: row && sectionValue ? row.width - sectionValue.width : null,
      expected: 0,
      id,
      message: 'relationship row fills the property value width',
    }),
    ...expectAtLeast({
      actual: row?.height ?? null,
      expected: nativePropertiesMetricContract.relationshipRowMinHeight,
      id,
      message: 'relationship row keeps desktop minimum height',
    }),
  ]
}

function propertyRowMetrics({
  id,
  metrics,
}: {
  id: string
  metrics: NativeLayoutMetricMap
}): PropertyRowMetrics {
  return {
    label: metrics[`${id}.label`],
    row: metrics[`${id}.row`],
    value: metrics[`${id}.value`],
  }
}

function assertPropertyRowMetricsCaptured(id: string, row: PropertyRowMetrics): NativeLayoutAssertionFailure[] {
  return [
    ...expectMetric({ id, message: 'property row is captured before checking native inspector spacing', metric: row.row }),
    ...expectMetric({ id, message: 'property label is captured before checking native inspector spacing', metric: row.label }),
    ...expectMetric({ id, message: 'property value is captured before checking native inspector spacing', metric: row.value }),
  ]
}

function expectMetric(expectation: MetricExpectation): NativeLayoutAssertionFailure[] {
  const { id, message, metric } = expectation
  if (metric) return []

  return [{ actual: null, expected: 1, id, message }]
}

function expectClose(expectation: LayoutExpectation): NativeLayoutAssertionFailure[] {
  const { actual, expected, id, message } = expectation
  if (actual !== null && Math.abs(actual - expected) <= layoutTolerance) return []

  return [{ actual, expected, id, message }]
}

function expectAtLeast(expectation: LayoutExpectation): NativeLayoutAssertionFailure[] {
  const { actual, expected, id, message } = expectation
  if (actual !== null && actual >= expected) return []

  return [{ actual, expected, id, message }]
}
