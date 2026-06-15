export type NativeLayoutMetric = {
  height: number
  id: string
  platform: string
  width: number
  x: number
  y: number
}

export type NativeLayoutMetricMap = Record<string, NativeLayoutMetric>

export type NativeLayoutAssertionFailure = {
  actual: number | null
  expected: number
  id: string
  message: string
}

type SidebarPadding = {
  bottom: number
  left: number
  right: number
  top: number
}

type CountPillLayout = {
  compact?: boolean
  id: string
}

type LayoutExpectation = {
  actual: number | null
  expected: number
  id: string
  message: string
}

type MetricExpectation = {
  id: string
  message: string
  metric: NativeLayoutMetric | undefined
}

type SidebarItemMetricSpec = {
  contentHeight: number
  id: string
  padding: SidebarPadding
}

type SidebarItemMetrics = {
  content: NativeLayoutMetric | undefined
  label: NativeLayoutMetric | undefined
  row: NativeLayoutMetric | undefined
}

type NoteListItemMetricSpec = {
  id: string
}

type NoteListItemMetrics = {
  body: NativeLayoutMetric | undefined
  footer: NativeLayoutMetric | undefined
  frame: NativeLayoutMetric | undefined
  header: NativeLayoutMetric | undefined
  subtitle: NativeLayoutMetric | undefined
  title: NativeLayoutMetric | undefined
}

type SectionTitleMetricSpec = {
  firstContentMetricId: string
  sectionId: string
}

type FolderTreeMetrics = {
  root: NativeLayoutMetric | undefined
  tolaria: NativeLayoutMetric | undefined
  tolariaMobile: NativeLayoutMetric | undefined
  tolariaReleases: NativeLayoutMetric | undefined
  writing: NativeLayoutMetric | undefined
  writingDrafts: NativeLayoutMetric | undefined
  writingEssays: NativeLayoutMetric | undefined
}

const metricPrefix = 'TOLARIA_MOBILE_LAYOUT_METRIC'
const layoutTolerance = 1.5
const sidebarSectionOrder = ['primary', 'favorites', 'views', 'types', 'folders']
export const nativeSidebarMetricContract = {
  countPill: {
    compactHeight: 18,
    height: 20,
  },
  folderSectionContentPaddingBottom: 8,
  folderRowContentHeight: 18,
  folderRowContentInset: 12,
  folderRowHeight: 30,
  folderRowIndent: 25,
  itemContentHeight: {
    regular: 18,
    withCount: 20,
  },
  itemLabelLineHeight: 18,
  itemPadding: {
    regular: { bottom: 6, left: 12, right: 16, top: 6 },
    withCount: { bottom: 6, left: 12, right: 8, top: 6 },
  },
  primarySectionItemCount: 3,
  sectionHorizontalPadding: 6,
  sectionTitleMinHeight: 30,
  sectionTitleLineHeight: 14,
  topNavPadding: { bottom: 4, left: 6, right: 6, top: 4 },
} as const

export const nativeNoteListMetricContract = {
  contentGap: 8,
  frameX: 0,
  panelWidth: 340,
  padding: { bottom: 14, left: 16, right: 16, top: 14 },
  titleLineHeight: 18,
} as const

const sidebarItemMetricSpecs: SidebarItemMetricSpec[] = [
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.withCount, id: 'sidebar.item.inbox', padding: nativeSidebarMetricContract.itemPadding.withCount },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.withCount, id: 'sidebar.item.all-notes', padding: nativeSidebarMetricContract.itemPadding.withCount },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.withCount, id: 'sidebar.item.archive', padding: nativeSidebarMetricContract.itemPadding.withCount },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.regular, id: 'sidebar.item.personal-journal', padding: nativeSidebarMetricContract.itemPadding.regular },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.regular, id: 'sidebar.item.tolaria-mvp', padding: nativeSidebarMetricContract.itemPadding.regular },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.withCount, id: 'sidebar.item.view-active-procedures', padding: nativeSidebarMetricContract.itemPadding.withCount },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.withCount, id: 'sidebar.item.essays', padding: nativeSidebarMetricContract.itemPadding.withCount },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.withCount, id: 'sidebar.item.procedures', padding: nativeSidebarMetricContract.itemPadding.withCount },
  { contentHeight: nativeSidebarMetricContract.itemContentHeight.withCount, id: 'sidebar.item.responsibilities', padding: nativeSidebarMetricContract.itemPadding.withCount },
]

const sidebarItemRowOrder = [
  ['sidebar.item.inbox', 'sidebar.item.all-notes', 'sidebar.item.archive'],
  ['sidebar.item.personal-journal', 'sidebar.item.tolaria-mvp'],
  ['sidebar.item.essays', 'sidebar.item.procedures', 'sidebar.item.responsibilities'],
] as const

const folderMetricSpecs = [
  { expectedLeftInset: nativeSidebarMetricContract.folderRowContentInset, id: 'sidebar.folder.writing' },
  { expectedLeftInset: nativeSidebarMetricContract.folderRowContentInset + nativeSidebarMetricContract.folderRowIndent, id: 'sidebar.folder.writing-essays' },
  { expectedLeftInset: nativeSidebarMetricContract.folderRowContentInset + nativeSidebarMetricContract.folderRowIndent, id: 'sidebar.folder.writing-drafts' },
  { expectedLeftInset: nativeSidebarMetricContract.folderRowContentInset, id: 'sidebar.folder.tolaria' },
  { expectedLeftInset: nativeSidebarMetricContract.folderRowContentInset + nativeSidebarMetricContract.folderRowIndent, id: 'sidebar.folder.tolaria-mobile' },
  { expectedLeftInset: nativeSidebarMetricContract.folderRowContentInset + nativeSidebarMetricContract.folderRowIndent, id: 'sidebar.folder.tolaria-releases' },
] as const

const countPillMetricSpecs: CountPillLayout[] = [
  { id: 'sidebar.item.inbox.count' },
  { id: 'sidebar.item.all-notes.count' },
  { id: 'sidebar.item.archive.count' },
  { id: 'sidebar.item.view-active-procedures.count' },
  { id: 'sidebar.item.essays.count' },
  { id: 'sidebar.item.procedures.count' },
  { id: 'sidebar.item.responsibilities.count' },
  { compact: true, id: 'sidebar.section.types.count' },
]

const noteListItemMetricSpecs: NoteListItemMetricSpec[] = [
  { id: 'noteList.item.workflow-orchestration' },
  { id: 'noteList.item.open-source-project' },
]

const sectionTitleMetricSpecs: SectionTitleMetricSpec[] = [
  { firstContentMetricId: 'sidebar.item.personal-journal.row', sectionId: 'favorites' },
  { firstContentMetricId: 'sidebar.item.view-active-procedures.row', sectionId: 'views' },
  { firstContentMetricId: 'sidebar.item.essays.row', sectionId: 'types' },
  { firstContentMetricId: 'sidebar.folderTree.root', sectionId: 'folders' },
]

export function parseNativeLayoutMetrics(logText: string): NativeLayoutMetric[] {
  const metrics: NativeLayoutMetric[] = []

  for (const line of logText.split('\n')) {
    const prefixIndex = line.indexOf(metricPrefix)
    if (prefixIndex === -1) continue

    const rawJson = line.slice(prefixIndex + metricPrefix.length).trim()
    const metric = parseMetric(rawJson)
    if (metric) metrics.push(metric)
  }

  return metrics
}

export function latestNativeLayoutMetrics(metrics: NativeLayoutMetric[]): NativeLayoutMetricMap {
  return Object.fromEntries(metrics.map((metric) => [metric.id, metric]))
}

export function assertNativeSidebarLayoutMetrics(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return [
    ...assertSidebarSectionLayouts(metrics),
    ...assertSidebarItemLayouts(metrics),
    ...assertSectionTitleLayouts(metrics),
    ...assertFolderTreeLayout(metrics),
    ...assertFolderLayouts(metrics),
    ...assertCountPillLayouts(metrics),
  ]
}

export function assertNativeMobileLayoutMetrics(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return [
    ...assertNativeSidebarLayoutMetrics(metrics),
    ...assertNativeNoteListLayoutMetrics(metrics),
  ]
}

function assertNativeNoteListLayoutMetrics(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return [
    ...assertNoteListPanelLayout(metrics),
    ...noteListItemMetricSpecs.flatMap((spec) => assertNoteListItemLayout({ ...spec, metrics })),
  ]
}

function assertSidebarSectionLayouts(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return [
    ...assertPrimarySectionLayout(metrics),
    ...assertStackedSections(metrics, sidebarSectionOrder),
  ]
}

function assertSidebarItemLayouts(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return [
    ...sidebarItemMetricSpecs.flatMap((spec) => assertSidebarItemLayout({ ...spec, metrics })),
    ...sidebarItemRowOrder.flatMap((ids) => assertStackedRows(metrics, ids)),
  ]
}

function assertSectionTitleLayouts(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return sectionTitleMetricSpecs.flatMap((spec) => assertSectionTitleLayout({ ...spec, metrics }))
}

function assertFolderLayouts(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return folderMetricSpecs.flatMap((spec) => assertFolderLayout({ ...spec, metrics }))
}

function assertPrimarySectionLayout(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  const container = metrics['sidebar.section.primary.container']
  const firstRow = metrics['sidebar.item.inbox.row']
  const lastRow = metrics['sidebar.item.archive.row']

  return [
    ...expectMetric({
      id: 'sidebar.section.primary',
      message: 'primary section container is captured before checking native sidebar spacing',
      metric: container,
    }),
    ...expectClose({
      actual: firstRow?.y ?? null,
      expected: nativeSidebarMetricContract.topNavPadding.top,
      id: 'sidebar.section.primary',
      message: 'primary section keeps desktop top padding',
    }),
    ...expectClose({
      actual: firstRow?.x ?? null,
      expected: nativeSidebarMetricContract.topNavPadding.left,
      id: 'sidebar.section.primary',
      message: 'primary section keeps desktop left padding',
    }),
    ...expectClose({
      actual: container && lastRow ? container.height - lastRow.y - lastRow.height : null,
      expected: nativeSidebarMetricContract.topNavPadding.bottom,
      id: 'sidebar.section.primary',
      message: 'primary section keeps desktop bottom padding',
    }),
  ]
}

function assertStackedSections(metrics: NativeLayoutMetricMap, ids: string[]): NativeLayoutAssertionFailure[] {
  return ids.slice(1).flatMap((id, index) => {
    const previousId = ids[index]
    const previous = metrics[`sidebar.section.${previousId}.container`]
    const current = metrics[`sidebar.section.${id}.container`]

    return [
      ...expectMetric({
        id: previousId,
        message: 'previous sidebar section is captured before checking section stacking',
        metric: previous,
      }),
      ...expectMetric({
        id,
        message: 'sidebar section is captured before checking section stacking',
        metric: current,
      }),
      ...expectClose({
        actual: previous && current ? current.y - previous.y - previous.height : null,
        expected: 0,
        id,
        message: 'section starts exactly after the previous sidebar section',
      }),
    ]
  })
}

function assertStackedRows(metrics: NativeLayoutMetricMap, ids: readonly string[]): NativeLayoutAssertionFailure[] {
  return ids.slice(1).flatMap((id, index) => {
    const previous = metrics[`${ids[index]}.row`]
    const current = metrics[`${id}.row`]

    return [
      ...expectMetric({
        id: ids[index],
        message: 'previous row is captured before checking sidebar row stacking',
        metric: previous,
      }),
      ...expectMetric({
        id,
        message: 'row is captured before checking sidebar row stacking',
        metric: current,
      }),
      ...expectClose({
        actual: previous && current ? current.y - previous.y - previous.height : null,
        expected: 0,
        id,
        message: 'row starts exactly after the previous sidebar row',
      }),
    ]
  })
}

function assertSectionTitleLayout({
  firstContentMetricId,
  metrics,
  sectionId,
}: {
  firstContentMetricId: string
  metrics: NativeLayoutMetricMap
  sectionId: string
}): NativeLayoutAssertionFailure[] {
  const id = `sidebar.section.${sectionId}`
  const titleRow = metrics[`${id}.row`]
  const titleLabel = metrics[`${id}.label`]
  const firstContent = metrics[firstContentMetricId]

  return [
    ...expectMetric({
      id,
      message: 'section title row is captured before checking native sidebar spacing',
      metric: titleRow,
    }),
    ...expectMetric({
      id,
      message: 'section title label is captured before checking native text alignment',
      metric: titleLabel,
    }),
    ...expectMetric({
      id: firstContentMetricId,
      message: 'first section content is captured before checking native sidebar spacing',
      metric: firstContent,
    }),
    ...expectClose({
      actual: titleRow?.x ?? null,
      expected: nativeSidebarMetricContract.sectionHorizontalPadding,
      id,
      message: 'section title keeps desktop section inset',
    }),
    ...expectAtLeast({
      actual: titleRow?.height ?? null,
      expected: nativeSidebarMetricContract.sectionTitleMinHeight,
      id,
      message: 'section title keeps desktop header height',
    }),
    ...expectClose({
      actual: titleLabel?.height ?? null,
      expected: nativeSidebarMetricContract.sectionTitleLineHeight,
      id,
      message: 'section title label keeps desktop line height',
    }),
    ...expectClose({
      actual: titleLabel?.y ?? null,
      expected: titleRow
        ? (titleRow.height - nativeSidebarMetricContract.sectionTitleLineHeight) / 2
        : (nativeSidebarMetricContract.sectionTitleMinHeight - nativeSidebarMetricContract.sectionTitleLineHeight) / 2,
      id,
      message: 'section title label keeps desktop vertical placement',
    }),
    ...expectClose({
      actual: titleRow && firstContent ? firstContent.y - titleRow.y - titleRow.height : null,
      expected: 0,
      id: firstContentMetricId,
      message: 'first row starts exactly after the sidebar section title',
    }),
  ]
}

export function formatNativeLayoutAssertionFailures(failures: NativeLayoutAssertionFailure[]) {
  return failures
    .map((failure) => {
      const actual = failure.actual === null ? 'missing' : failure.actual.toFixed(1)
      return `${failure.id}: ${failure.message}; expected ${failure.expected.toFixed(1)}, got ${actual}`
    })
    .join('\n')
}

function assertSidebarItemLayout({
  contentHeight,
  id,
  metrics,
  padding,
}: {
  contentHeight: number
  id: string
  metrics: NativeLayoutMetricMap
  padding: SidebarPadding
}): NativeLayoutAssertionFailure[] {
  const item = sidebarItemMetrics(id, metrics)

  return [
    ...assertSidebarItemMetricsCaptured(id, item),
    ...assertSidebarItemFrameLayout({ contentHeight, id, item, padding }),
    ...assertSidebarItemContentLayout({ contentHeight, id, item, padding }),
    ...assertSidebarItemLabelLayout({ contentHeight, id, item }),
  ]
}

function sidebarItemMetrics(id: string, metrics: NativeLayoutMetricMap): SidebarItemMetrics {
  return {
    content: metrics[`${id}.content`],
    label: metrics[`${id}.label`],
    row: metrics[`${id}.row`],
  }
}

function assertSidebarItemMetricsCaptured(id: string, item: SidebarItemMetrics): NativeLayoutAssertionFailure[] {
  return [
    ...expectMetric({ id, message: 'row is captured before checking native padding', metric: item.row }),
    ...expectMetric({ id, message: 'content is captured before checking native padding', metric: item.content }),
    ...expectMetric({ id, message: 'label is captured before checking native text alignment', metric: item.label }),
  ]
}

function assertSidebarItemFrameLayout({
  contentHeight,
  id,
  item,
  padding,
}: {
  contentHeight: number
  id: string
  item: SidebarItemMetrics
  padding: SidebarPadding
}): NativeLayoutAssertionFailure[] {
  return [
    ...expectClose({
      actual: item.row?.x ?? null,
      expected: nativeSidebarMetricContract.sectionHorizontalPadding,
      id,
      message: 'row keeps desktop section inset',
    }),
    ...expectClose({
      actual: item.row?.height ?? null,
      expected: padding.top + contentHeight + padding.bottom,
      id,
      message: 'row keeps desktop row height',
    }),
  ]
}

function assertSidebarItemContentLayout({
  contentHeight,
  id,
  item,
  padding,
}: {
  contentHeight: number
  id: string
  item: SidebarItemMetrics
  padding: SidebarPadding
}): NativeLayoutAssertionFailure[] {
  return [
    ...expectClose({
      actual: item.content?.x ?? null,
      expected: padding.left,
      id,
      message: 'content keeps desktop left padding',
    }),
    ...expectClose({
      actual: item.content?.y ?? null,
      expected: padding.top,
      id,
      message: 'content keeps desktop top padding',
    }),
    ...expectClose({
      actual: item.content?.height ?? null,
      expected: contentHeight,
      id,
      message: 'content keeps desktop content height',
    }),
    ...expectClose({
      actual: item.row && item.content ? item.row.width - item.content.x - item.content.width : null,
      expected: padding.right,
      id,
      message: 'content keeps desktop right padding',
    }),
    ...expectClose({
      actual: item.row && item.content ? item.row.height - item.content.height : null,
      expected: padding.top + padding.bottom,
      id,
      message: 'row keeps desktop vertical padding',
    }),
  ]
}

function assertSidebarItemLabelLayout({
  contentHeight,
  id,
  item,
}: {
  contentHeight: number
  id: string
  item: SidebarItemMetrics
}): NativeLayoutAssertionFailure[] {
  return [
    ...expectClose({
      actual: item.label?.height ?? null,
      expected: nativeSidebarMetricContract.itemLabelLineHeight,
      id,
      message: 'label keeps desktop line height',
    }),
    ...expectClose({
      actual: item.label?.y ?? null,
      expected: (contentHeight - nativeSidebarMetricContract.itemLabelLineHeight) / 2,
      id,
      message: 'label is vertically centered inside row content',
    }),
  ]
}

function assertNoteListPanelLayout(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  const panel = metrics['noteList.panel']

  return [
    ...expectMetric({
      id: 'noteList.panel',
      message: 'note-list panel is captured before checking native note row spacing',
      metric: panel,
    }),
    ...expectClose({
      actual: panel?.width ?? null,
      expected: nativeNoteListMetricContract.panelWidth,
      id: 'noteList.panel',
      message: 'note list keeps desktop column width',
    }),
  ]
}

function assertNoteListItemLayout({
  id,
  metrics,
}: {
  id: string
  metrics: NativeLayoutMetricMap
}): NativeLayoutAssertionFailure[] {
  const item = noteListItemMetrics(id, metrics)

  return [
    ...assertNoteListItemMetricsCaptured(id, item),
    ...assertNoteListItemSurfaceLayout(id, item),
    ...assertNoteListItemContentLayout(id, item),
    ...assertNoteListItemTextLayout(id, item),
  ]
}

function noteListItemMetrics(id: string, metrics: NativeLayoutMetricMap): NoteListItemMetrics {
  return {
    body: metrics[`${id}.body`],
    footer: metrics[`${id}.footer`],
    frame: metrics[`${id}.frame`],
    header: metrics[`${id}.header`],
    subtitle: metrics[`${id}.subtitle`],
    title: metrics[`${id}.title`],
  }
}

function assertNoteListItemMetricsCaptured(id: string, item: NoteListItemMetrics): NativeLayoutAssertionFailure[] {
  return [
    ...expectMetric({ id: `${id}.frame`, message: 'note row surface is captured before checking native note-list layout', metric: item.frame }),
    ...expectMetric({ id: `${id}.body`, message: 'note row body is captured before checking native note-list layout', metric: item.body }),
    ...expectMetric({ id: `${id}.header`, message: 'note row header is captured before checking native note-list layout', metric: item.header }),
    ...expectMetric({ id: `${id}.title`, message: 'note row title is captured before checking native note-list layout', metric: item.title }),
    ...expectMetric({ id: `${id}.subtitle`, message: 'note row preview is captured before checking native note-list layout', metric: item.subtitle }),
    ...expectMetric({ id: `${id}.footer`, message: 'note row footer is captured before checking native note-list layout', metric: item.footer }),
  ]
}

function assertNoteListItemSurfaceLayout(id: string, item: NoteListItemMetrics): NativeLayoutAssertionFailure[] {
  return [
    ...expectClose({
      actual: item.frame?.x ?? null,
      expected: nativeNoteListMetricContract.frameX,
      id: `${id}.frame`,
      message: 'note row surface starts at the note-list column edge',
    }),
    ...expectClose({
      actual: item.frame?.width ?? null,
      expected: nativeNoteListMetricContract.panelWidth,
      id: `${id}.frame`,
      message: 'note row surface fills the desktop note-list column',
    }),
  ]
}

function assertNoteListItemContentLayout(id: string, item: NoteListItemMetrics): NativeLayoutAssertionFailure[] {
  return [
    ...expectClose({
      actual: item.body && item.header ? item.body.x + item.header.x : null,
      expected: nativeNoteListMetricContract.padding.left,
      id: `${id}.header`,
      message: 'note row content keeps desktop horizontal padding',
    }),
    ...expectClose({
      actual: item.body && item.frame && item.header
        ? item.frame.width - item.body.x - item.header.x - item.header.width
        : null,
      expected: nativeNoteListMetricContract.padding.right,
      id: `${id}.header`,
      message: 'note row content keeps desktop right padding',
    }),
    ...expectClose({
      actual: item.body && item.header ? item.body.y + item.header.y : null,
      expected: nativeNoteListMetricContract.padding.top,
      id: `${id}.header`,
      message: 'note row content keeps desktop top padding',
    }),
  ]
}

function assertNoteListItemTextLayout(id: string, item: NoteListItemMetrics): NativeLayoutAssertionFailure[] {
  return [
    ...expectClose({
      actual: item.title?.height ?? null,
      expected: nativeNoteListMetricContract.titleLineHeight,
      id: `${id}.title`,
      message: 'note row title keeps desktop line height',
    }),
    ...expectClose({
      actual: item.header && item.subtitle ? item.subtitle.y - item.header.y - item.header.height : null,
      expected: nativeNoteListMetricContract.contentGap,
      id: `${id}.subtitle`,
      message: 'note row preview starts after the desktop content gap',
    }),
    ...expectClose({
      actual: item.footer && item.subtitle ? item.footer.y - item.subtitle.y - item.subtitle.height : null,
      expected: nativeNoteListMetricContract.contentGap,
      id: `${id}.footer`,
      message: 'note row chip row starts after the desktop content gap',
    }),
  ]
}

function assertFolderTreeLayout(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  const tree = folderTreeMetrics(metrics)

  return [
    ...assertFolderTreeRootLayout(tree),
    ...assertStackedMetricPair({
      current: tree.tolaria,
      currentId: 'sidebar.folder.tolaria',
      previous: tree.writing,
      previousId: 'sidebar.folder.writing',
    }),
    ...assertStackedMetricPair({
      current: tree.writingDrafts,
      currentId: 'sidebar.folder.writing-drafts',
      previous: tree.writingEssays,
      previousId: 'sidebar.folder.writing-essays',
    }),
    ...assertStackedMetricPair({
      current: tree.tolariaReleases,
      currentId: 'sidebar.folder.tolaria-releases',
      previous: tree.tolariaMobile,
      previousId: 'sidebar.folder.tolaria-mobile',
    }),
  ]
}

function folderTreeMetrics(metrics: NativeLayoutMetricMap): FolderTreeMetrics {
  return {
    root: metrics['sidebar.folderTree.root'],
    tolaria: metrics['sidebar.folder.tolaria.container'],
    tolariaMobile: metrics['sidebar.folder.tolaria-mobile.container'],
    tolariaReleases: metrics['sidebar.folder.tolaria-releases.container'],
    writing: metrics['sidebar.folder.writing.container'],
    writingDrafts: metrics['sidebar.folder.writing-drafts.container'],
    writingEssays: metrics['sidebar.folder.writing-essays.container'],
  }
}

function assertFolderTreeRootLayout(tree: FolderTreeMetrics): NativeLayoutAssertionFailure[] {
  return [
    ...expectMetric({
      id: 'sidebar.folderTree.root',
      message: 'folder tree root is captured before checking native folder spacing',
      metric: tree.root,
    }),
    ...expectClose({
      actual: tree.root?.x ?? null,
      expected: nativeSidebarMetricContract.sectionHorizontalPadding,
      id: 'sidebar.folderTree.root',
      message: 'folder tree keeps desktop section inset',
    }),
    ...expectAtLeast({
      actual: tree.root && tree.tolaria ? tree.root.height - tree.tolaria.y - tree.tolaria.height : null,
      expected: nativeSidebarMetricContract.folderSectionContentPaddingBottom,
      id: 'sidebar.folderTree.root',
      message: 'folder tree keeps desktop bottom padding',
    }),
  ]
}

function assertStackedMetricPair({
  current,
  currentId,
  previous,
  previousId,
}: {
  current: NativeLayoutMetric | undefined
  currentId: string
  previous: NativeLayoutMetric | undefined
  previousId: string
}): NativeLayoutAssertionFailure[] {
  return [
    ...expectMetric({
      id: previousId,
      message: 'previous metric is captured before checking native stacking',
      metric: previous,
    }),
    ...expectMetric({
      id: currentId,
      message: 'metric is captured before checking native stacking',
      metric: current,
    }),
    ...expectAtLeast({
      actual: previous && current ? current.y - previous.y - previous.height : null,
      expected: 0,
      id: currentId,
      message: 'metric starts after the previous metric',
    }),
  ]
}

function assertFolderLayout({
  expectedLeftInset,
  id,
  metrics,
}: {
  expectedLeftInset: number
  id: string
  metrics: NativeLayoutMetricMap
}): NativeLayoutAssertionFailure[] {
  const row = metrics[`${id}.row`]
  const content = metrics[`${id}.content`]
  const label = metrics[`${id}.label`]

  return [
    ...expectMetric({ id, message: 'row is captured before checking native folder layout', metric: row }),
    ...expectMetric({ id, message: 'content is captured before checking native folder layout', metric: content }),
    ...expectMetric({ id, message: 'label is captured before checking native folder text alignment', metric: label }),
    ...expectClose({
      actual: content?.x ?? null,
      expected: expectedLeftInset,
      id,
      message: 'folder content keeps desktop indentation',
    }),
    ...expectClose({
      actual: row?.height ?? null,
      expected: nativeSidebarMetricContract.folderRowHeight,
      id,
      message: 'folder row keeps desktop row height',
    }),
    ...expectClose({
      actual: content?.y ?? null,
      expected: nativeSidebarMetricContract.itemPadding.regular.top,
      id,
      message: 'folder content keeps desktop top padding',
    }),
    ...expectClose({
      actual: content?.height ?? null,
      expected: nativeSidebarMetricContract.folderRowContentHeight,
      id,
      message: 'folder content keeps desktop content height',
    }),
    ...expectClose({
      actual: label?.height ?? null,
      expected: nativeSidebarMetricContract.itemLabelLineHeight,
      id,
      message: 'folder label keeps desktop line height',
    }),
    ...expectClose({
      actual: label?.y ?? null,
      expected: 0,
      id,
      message: 'folder label is vertically centered inside row content',
    }),
  ]
}

function assertCountPillLayouts(metrics: NativeLayoutMetricMap): NativeLayoutAssertionFailure[] {
  return countPillMetricSpecs.flatMap((spec) => assertCountPillLayout(metrics, spec))
}

function assertCountPillLayout(
  metrics: NativeLayoutMetricMap,
  { compact = false, id }: CountPillLayout,
): NativeLayoutAssertionFailure[] {
  const container = metrics[`${id}.container`]
  const text = metrics[`${id}.text`]
  const expectedHeight = compact
    ? nativeSidebarMetricContract.countPill.compactHeight
    : nativeSidebarMetricContract.countPill.height

  return [
    ...expectMetric({ id, message: 'count pill container is captured before checking native alignment', metric: container }),
    ...expectMetric({ id, message: 'count pill text is captured before checking native alignment', metric: text }),
    ...expectClose({
      actual: container?.height ?? null,
      expected: expectedHeight,
      id,
      message: 'count pill keeps desktop height',
    }),
    ...expectClose({
      actual: text ? text.y + text.height / 2 : null,
      expected: expectedHeight / 2,
      id,
      message: 'count text is vertically centered inside native pill',
    }),
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

function parseMetric(rawJson: string): NativeLayoutMetric | null {
  try {
    const value: unknown = JSON.parse(rawJson)
    return nativeLayoutMetricFromJson(value)
  } catch {
    return null
  }
}

function nativeLayoutMetricFromJson(value: unknown): NativeLayoutMetric | null {
  if (!isRecord(value)) return null

  const id = stringValue(value.id)
  const platform = stringValue(value.platform)
  const height = numberValue(value.height)
  const width = numberValue(value.width)
  const x = numberValue(value.x)
  const y = numberValue(value.y)
  if (!id || !platform || height === null || width === null || x === null || y === null) return null

  return { height, id, platform, width, x, y }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
