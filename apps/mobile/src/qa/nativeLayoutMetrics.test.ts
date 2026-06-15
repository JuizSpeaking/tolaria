import { describe, expect, it } from 'vitest'
import {
  assertNativeMobileLayoutMetrics,
  formatNativeLayoutAssertionFailures,
  latestNativeLayoutMetrics,
  nativeNoteListMetricContract,
  nativeSidebarMetricContract,
  parseNativeLayoutMetrics,
  type NativeLayoutMetric,
} from './nativeLayoutMetrics'
import { desktopNoteItemParity, desktopPanelParity, desktopSidebarParity } from '../ui/desktopParity'

describe('native layout metrics', () => {
  it('keeps the native metric contract synced with desktop sidebar parity tokens', () => {
    expect(nativeSidebarMetricContract).toEqual({
      countPill: {
        compactHeight: desktopSidebarParity.countPillCompactHeight,
        height: desktopSidebarParity.countPillHeight,
      },
      folderSectionContentPaddingBottom: desktopSidebarParity.sectionContentPaddingBottom,
      folderRowContentHeight: desktopSidebarParity.folderRowContentHeight,
      folderRowContentInset: desktopSidebarParity.folderRowContentInset,
      folderRowHeight: desktopSidebarParity.folderRowHeight,
      folderRowIndent: desktopSidebarParity.folderRowIndent,
      itemContentHeight: desktopSidebarParity.itemContentHeight,
      itemLabelLineHeight: desktopSidebarParity.itemLabelLineHeight,
      itemPadding: desktopSidebarParity.itemPadding,
      primarySectionItemCount: 3,
      sectionHorizontalPadding: desktopSidebarParity.sectionHorizontalPadding,
      sectionTitleMinHeight: 30,
      sectionTitleLineHeight: desktopSidebarParity.sectionTitleLineHeight,
      topNavPadding: desktopSidebarParity.topNavPadding,
    })
    expect(nativeNoteListMetricContract).toEqual({
      contentGap: desktopNoteItemParity.contentGap,
      frameX: 0,
      panelWidth: desktopPanelParity.noteListWidth,
      padding: desktopNoteItemParity.padding,
      titleLineHeight: desktopNoteItemParity.titleLineHeight,
    })
  })

  it('parses simulator log metrics and keeps the latest metric per id', () => {
    const metrics = latestNativeLayoutMetrics(parseNativeLayoutMetrics([
      'noise before metric',
      'TOLARIA_MOBILE_LAYOUT_METRIC {"height":12,"id":"sidebar.item.inbox.row","platform":"ios","width":10,"x":1,"y":2}',
      'TOLARIA_MOBILE_LAYOUT_METRIC {"height":32,"id":"sidebar.item.inbox.row","platform":"ios","width":247.5,"x":6,"y":4}',
      'TOLARIA_MOBILE_LAYOUT_METRIC not-json',
    ].join('\n')))

    expect(metrics['sidebar.item.inbox.row']).toEqual({
      height: 32,
      id: 'sidebar.item.inbox.row',
      platform: 'ios',
      width: 247.5,
      x: 6,
      y: 4,
    })
  })

  it('accepts native sidebar metrics that match desktop spacing tokens', () => {
    const metrics = latestNativeLayoutMetrics([
      containerMetric({ height: 104, id: 'sidebar.section.primary.container', width: 259.5 }),
      itemMetric('sidebar.item.inbox', { hasCount: true, y: 4 }),
      itemMetric('sidebar.item.all-notes', { hasCount: true, y: 36 }),
      itemMetric('sidebar.item.archive', { hasCount: true, y: 68 }),
      containerMetric({ height: 90, id: 'sidebar.section.favorites.container', width: 259.5, y: 104 }),
      sectionMetric('favorites'),
      itemMetric('sidebar.item.personal-journal', { hasCount: false, y: 30 }),
      itemMetric('sidebar.item.tolaria-mvp', { hasCount: false, y: 60 }),
      containerMetric({ height: 72, id: 'sidebar.section.views.container', width: 259.5, y: 194 }),
      sectionMetric('views', 40),
      itemMetric('sidebar.item.view-active-procedures', { hasCount: true, y: 40 }),
      containerMetric({ height: 130, id: 'sidebar.section.types.container', width: 259.5, y: 266 }),
      sectionMetric('types'),
      itemMetric('sidebar.item.essays', { hasCount: true, y: 30 }),
      itemMetric('sidebar.item.procedures', { hasCount: true, y: 62 }),
      itemMetric('sidebar.item.responsibilities', { hasCount: true, y: 94 }),
      containerMetric({ height: 220, id: 'sidebar.section.folders.container', width: 259.5, y: 396 }),
      sectionMetric('folders'),
      countPillMetric('sidebar.item.archive.count'),
      countPillMetric('sidebar.item.view-active-procedures.count'),
      countPillMetric('sidebar.section.types.count', { compact: true }),
      folderTreeRootMetric(30, { height: 190, x: 6 }),
      containerMetric({ height: 90, id: 'sidebar.folder.writing.container' }),
      folderMetric('sidebar.folder.writing', 12),
      containerMetric({ height: 30, id: 'sidebar.folder.writing-essays.container' }),
      folderMetric('sidebar.folder.writing-essays', 37),
      containerMetric({ height: 30, id: 'sidebar.folder.writing-drafts.container', y: 30 }),
      folderMetric('sidebar.folder.writing-drafts', 37),
      containerMetric({ height: 90, id: 'sidebar.folder.tolaria.container', y: 90 }),
      folderMetric('sidebar.folder.tolaria', 12),
      containerMetric({ height: 30, id: 'sidebar.folder.tolaria-mobile.container' }),
      folderMetric('sidebar.folder.tolaria-mobile', 37),
      containerMetric({ height: 30, id: 'sidebar.folder.tolaria-releases.container', y: 30 }),
      folderMetric('sidebar.folder.tolaria-releases', 37),
      noteListPanelMetric(),
      noteListItemMetric('noteList.item.workflow-orchestration', { selected: true, y: 0 }),
      noteListItemMetric('noteList.item.open-source-project', { y: 118 }),
    ].flat())

    expect(assertNativeMobileLayoutMetrics(metrics)).toEqual([])
  })

  it('reports native sidebar rows that lose horizontal or vertical padding', () => {
    const metrics = latestNativeLayoutMetrics([
      containerMetric({ height: 94, id: 'sidebar.section.primary.container', width: 259.5 }),
      itemMetric('sidebar.item.inbox', { hasCount: true, rowHeight: 22, rowX: 0 }),
      itemMetric('sidebar.item.all-notes', { hasCount: true, y: 10 }),
      itemMetric('sidebar.item.archive', { hasCount: true, y: 64 }),
      containerMetric({ height: 76, id: 'sidebar.section.favorites.container', width: 259.5, y: 80 }),
      sectionMetric('favorites', 18),
      itemMetric('sidebar.item.personal-journal', { hasCount: false, y: 16 }),
      itemMetric('sidebar.item.tolaria-mvp', { hasCount: false, y: 46 }),
      containerMetric({ height: 72, id: 'sidebar.section.views.container', width: 259.5, y: 156 }),
      sectionMetric('views', 40),
      itemMetric('sidebar.item.view-active-procedures', { hasCount: true, y: 40 }),
      containerMetric({ height: 130, id: 'sidebar.section.types.container', width: 259.5, y: 220 }),
      sectionMetric('types'),
      itemMetric('sidebar.item.essays', { hasCount: true, y: 30 }),
      itemMetric('sidebar.item.procedures', { hasCount: true, y: 62 }),
      itemMetric('sidebar.item.responsibilities', { hasCount: true, y: 94 }),
      countPillMetric('sidebar.item.essays.count', { textY: 0 }),
      countPillMetric('sidebar.item.archive.count'),
      countPillMetric('sidebar.item.view-active-procedures.count'),
      containerMetric({ height: 180, id: 'sidebar.section.folders.container', width: 259.5, y: 350 }),
      sectionMetric('folders'),
      countPillMetric('sidebar.section.types.count', { compact: true }),
      folderTreeRootMetric(30, { height: 120, x: 0 }),
      containerMetric({ height: 70, id: 'sidebar.folder.writing.container' }),
      folderMetric('sidebar.folder.writing', 0),
      containerMetric({ height: 30, id: 'sidebar.folder.writing-essays.container' }),
      folderMetric('sidebar.folder.writing-essays', 37),
      containerMetric({ height: 30, id: 'sidebar.folder.writing-drafts.container' }),
      folderMetric('sidebar.folder.writing-drafts', 37),
      containerMetric({ height: 40, id: 'sidebar.folder.tolaria.container', y: 40 }),
      folderMetric('sidebar.folder.tolaria', 12),
      containerMetric({ height: 30, id: 'sidebar.folder.tolaria-mobile.container' }),
      folderMetric('sidebar.folder.tolaria-mobile', 37),
      containerMetric({ height: 30, id: 'sidebar.folder.tolaria-releases.container' }),
      folderMetric('sidebar.folder.tolaria-releases', 37),
      noteListPanelMetric({ width: 284 }),
      noteListItemMetric('noteList.item.workflow-orchestration', {
        frameWidth: 284,
        headerX: 0,
        headerY: 2,
        selected: true,
        titleHeight: 14,
      }),
      noteListItemMetric('noteList.item.open-source-project', {
        frameWidth: 284,
        headerX: 0,
        y: 22,
      }),
    ].flat())

    const failures = assertNativeMobileLayoutMetrics(metrics)
    const formatted = formatNativeLayoutAssertionFailures(failures)

    expect(formatted).toContain('sidebar.item.inbox: row keeps desktop section inset')
    expect(formatted).toContain('sidebar.item.inbox: row keeps desktop vertical padding')
    expect(formatted).toContain('sidebar.folder.writing: folder content keeps desktop indentation')
    expect(formatted).toContain('sidebar.section.favorites: section title keeps desktop header height')
    expect(formatted).toContain('sidebar.item.personal-journal.row: first row starts exactly after the sidebar section title')
    expect(formatted).toContain('sidebar.item.all-notes: row starts exactly after the previous sidebar row')
    expect(formatted).toContain('sidebar.item.essays.count: count text is vertically centered inside native pill')
    expect(formatted).toContain('sidebar.section.primary: primary section keeps desktop top padding')
    expect(formatted).toContain('sidebar.folderTree.root: folder tree keeps desktop section inset')
    expect(formatted).toContain('sidebar.folder.writing-drafts: metric starts after the previous metric')
    expect(formatted).toContain('noteList.panel: note list keeps desktop column width')
    expect(formatted).toContain('noteList.item.workflow-orchestration.frame: note row surface fills the desktop note-list column')
    expect(formatted).toContain('noteList.item.workflow-orchestration.header: note row content keeps desktop horizontal padding')
    expect(formatted).toContain('noteList.item.workflow-orchestration.header: note row content keeps desktop top padding')
    expect(formatted).toContain('noteList.item.workflow-orchestration.title: note row title keeps desktop line height')
  })
})

function itemMetric(
  id: string,
  {
    hasCount,
    rowHeight = hasCount ? 32 : 30,
    rowX = 6,
    y = 0,
  }: {
    hasCount: boolean
    rowHeight?: number
    rowX?: number
    y?: number
  },
): NativeLayoutMetric[] {
  const contentHeight = hasCount ? 20 : 18
  const contentWidth = hasCount ? 227.5 : 219.5
  const rowWidth = 247.5

  return [
    {
      height: rowHeight,
      id: `${id}.row`,
      platform: 'ios',
      width: rowWidth,
      x: rowX,
      y,
    },
    {
      height: contentHeight,
      id: `${id}.content`,
      platform: 'ios',
      width: contentWidth,
      x: 12,
      y: hasCount ? 6 : 7,
    },
    {
      height: desktopSidebarParity.itemLabelLineHeight,
      id: `${id}.label`,
      platform: 'ios',
      width: hasCount ? 174.5 : 196.5,
      x: 23,
      y: hasCount ? 1 : 0,
    },
    ...(hasCount ? countPillMetric(`${id}.count`) : []),
  ]
}

function countPillMetric(
  id: string,
  {
    compact = false,
    textY = compact ? 2 : 3,
  }: {
    compact?: boolean
    textY?: number
  } = {},
): NativeLayoutMetric[] {
  const height = compact ? desktopSidebarParity.countPillCompactHeight : desktopSidebarParity.countPillHeight

  return [
    {
      height,
      id: `${id}.container`,
      platform: 'ios',
      width: 22,
      x: 202,
      y: 0,
    },
    {
      height: 14,
      id: `${id}.text`,
      platform: 'ios',
      width: 18,
      x: 2,
      y: textY,
    },
  ]
}

function noteListPanelMetric({
  width = desktopPanelParity.noteListWidth,
}: {
  width?: number
} = {}): NativeLayoutMetric {
  return {
    height: 768,
    id: 'noteList.panel',
    platform: 'ios',
    width,
    x: 0,
    y: 0,
  }
}

function noteListItemMetric(
  id: string,
  {
    bodyX,
    frameWidth = desktopPanelParity.noteListWidth,
    headerX,
    headerY = desktopNoteItemParity.padding.top,
    selected = false,
    titleHeight = desktopNoteItemParity.titleLineHeight,
    y = 0,
  }: {
    bodyX?: number
    frameWidth?: number
    headerX?: number
    headerY?: number
    selected?: boolean
    titleHeight?: number
    y?: number
  } = {},
): NativeLayoutMetric[] {
  const bodyOffsetX = bodyX ?? (selected ? desktopNoteItemParity.borderLeftWidth : 0)
  const headerOffsetX = headerX ?? (selected
    ? desktopNoteItemParity.selectedPaddingLeft
    : desktopNoteItemParity.padding.left)
  const bodyWidth = frameWidth - bodyOffsetX
  const headerWidth = bodyWidth - headerOffsetX - desktopNoteItemParity.padding.right
  const subtitleHeight = desktopNoteItemParity.snippetLineHeight * 2
  const subtitleY = headerY + desktopNoteItemParity.titleLineHeight + desktopNoteItemParity.contentGap
  const footerY = subtitleY + subtitleHeight + desktopNoteItemParity.contentGap
  const rowHeight = footerY + 20 + desktopNoteItemParity.padding.bottom

  return [
    {
      height: rowHeight,
      id: `${id}.frame`,
      platform: 'ios',
      width: frameWidth,
      x: 0,
      y,
    },
    {
      height: rowHeight,
      id: `${id}.body`,
      platform: 'ios',
      width: bodyWidth,
      x: bodyOffsetX,
      y: 0,
    },
    {
      height: desktopNoteItemParity.titleLineHeight,
      id: `${id}.header`,
      platform: 'ios',
      width: headerWidth,
      x: headerOffsetX,
      y: headerY,
    },
    {
      height: titleHeight,
      id: `${id}.title`,
      platform: 'ios',
      width: headerWidth - 24,
      x: 0,
      y: 0,
    },
    {
      height: subtitleHeight,
      id: `${id}.subtitle`,
      platform: 'ios',
      width: headerWidth,
      x: headerOffsetX,
      y: subtitleY,
    },
    {
      height: 20,
      id: `${id}.footer`,
      platform: 'ios',
      width: headerWidth,
      x: headerOffsetX,
      y: footerY,
    },
  ]
}

function folderMetric(id: string, contentX: number, y = 0): NativeLayoutMetric[] {
  return [
    {
      height: 30,
      id: `${id}.row`,
      platform: 'ios',
      width: 247.5,
      x: 0,
      y,
    },
    {
      height: 18,
      id: `${id}.content`,
      platform: 'ios',
      width: 219.5,
      x: contentX,
      y: 6,
    },
    {
      height: desktopSidebarParity.itemLabelLineHeight,
      id: `${id}.label`,
      platform: 'ios',
      width: 172.5,
      x: 52,
      y: 0,
    },
  ]
}

function folderTreeRootMetric(
  y: number,
  {
    height = 120,
    x = 0,
  }: {
    height?: number
    x?: number
  } = {},
): NativeLayoutMetric[] {
  return [{
    height,
    id: 'sidebar.folderTree.root',
    platform: 'ios',
    width: 247.5,
    x,
    y,
  }]
}

function sectionMetric(sectionId: string, rowHeight = 30): NativeLayoutMetric[] {
  const labelY = (rowHeight - desktopSidebarParity.sectionTitleLineHeight) / 2

  return [
    {
      height: rowHeight,
      id: `sidebar.section.${sectionId}.row`,
      platform: 'ios',
      width: 247.5,
      x: 6,
      y: 0,
    },
    {
      height: desktopSidebarParity.sectionTitleLineHeight,
      id: `sidebar.section.${sectionId}.label`,
      platform: 'ios',
      width: 206.5,
      x: 27,
      y: labelY,
    },
  ]
}

function containerMetric(
  {
    height,
    id,
    width = 247.5,
    x = 0,
    y = 0,
  }: {
    height: number
    id: string
    width?: number
    x?: number
    y?: number
  },
): NativeLayoutMetric {
  return {
    height,
    id,
    platform: 'ios',
    width,
    x,
    y,
  }
}
