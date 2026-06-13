import { expect, type Locator, type Page } from '@playwright/test'
import {
  desktopEditorParity,
  desktopNoteItemParity,
  desktopParityColors,
  desktopPropertyParity,
  desktopRelationshipParity,
  desktopSidebarParity,
  desktopStatusBarParity,
  desktopToolbarActionParity,
} from '../src/ui/desktopParity'

const layoutTolerance = 1.5

type CssQuery = {
  locator: Locator
  property: string
}

type CssExpectation = CssQuery & {
  expected: string
}

type LayoutExpectation = {
  actual: number
  expected: number
  message: string
}

type ColorNormalizationRequest = {
  color: string
  page: Page
}

export async function assertTabletDesktopParity(page: Page) {
  await assertNoteListParity(page)
  await assertSidebarParity(page)
  await assertPropertiesParity(page)
  await assertEditorParity(page)
  await assertToolbarActionParity(page)
  await assertStatusBarParity(page)
}

async function assertNoteListParity(page: Page) {
  const noteListPanel = page.getByTestId('note-list-panel')
  const selectedRow = page.getByTestId('note-row-workflow-orchestration')
  const nextRow = page.getByTestId('note-row-open-source-project')

  await expect(noteListPanel).toBeVisible()
  await expect(selectedRow).toBeVisible()
  await expect(nextRow).toBeVisible()

  const panelBox = await requiredBox(noteListPanel)
  const selectedBox = await requiredBox(selectedRow)
  const nextBox = await requiredBox(nextRow)

  expectClose({ actual: selectedBox.x, expected: panelBox.x, message: 'selected note row starts at the note-list panel edge' })
  expectClose({ actual: selectedBox.width, expected: panelBox.width, message: 'selected note row spans the full note-list panel' })
  expectClose({ actual: nextBox.y, expected: selectedBox.y + selectedBox.height, message: 'note rows are separated by the desktop border, not by wrapper margins' })

  await expectCssValue({ locator: selectedRow, property: 'background-color', expected: await cssColor({ page, color: desktopParityColors.accentGreenLight }) })
  await expectCssValue({ locator: selectedRow, property: 'border-left-color', expected: await cssColor({ page, color: desktopParityColors.accentGreen }) })
  await expectCssValue({ locator: selectedRow, property: 'border-left-width', expected: `${desktopNoteItemParity.borderLeftWidth}px` })
  await expectCssValue({ locator: selectedRow, property: 'border-bottom-color', expected: await cssColor({ page, color: desktopParityColors.borderDefault }) })
  await expectCssValue({ locator: selectedRow, property: 'border-top-left-radius', expected: '0px' })
  await expectCssValue({ locator: selectedRow, property: 'margin-bottom', expected: '0px' })
  await expectChildCssValue({ locator: selectedRow, property: 'padding-top', expected: `${desktopNoteItemParity.padding.top}px` })
  await expectChildCssValue({ locator: selectedRow, property: 'padding-left', expected: `${desktopNoteItemParity.selectedPaddingLeft}px` })
  await expectChildCssValue({ locator: selectedRow, property: 'padding-right', expected: `${desktopNoteItemParity.padding.right}px` })
}

async function assertSidebarParity(page: Page) {
  const primarySection = page.getByTestId('sidebar-section-primary')
  const favoritesTitle = page.getByTestId('sidebar-section-title-favorites')
  const favoritesTitleText = page.getByTestId('sidebar-section-title-text-favorites')
  const typesCount = page.getByTestId('sidebar-section-count-types')
  const inboxItem = page.getByTestId('sidebar-item-inbox')

  await expect(primarySection).toBeVisible()
  await expect(favoritesTitle).toBeVisible()
  await expect(inboxItem).toBeVisible()

  await expectCssValue({ locator: primarySection, property: 'padding-top', expected: `${desktopSidebarParity.topNavPadding.top}px` })
  await expectCssValue({ locator: primarySection, property: 'padding-left', expected: `${desktopSidebarParity.topNavPadding.left}px` })
  await expectCssValue({ locator: primarySection, property: 'border-bottom-color', expected: await cssColor({ page, color: desktopParityColors.borderDefault }) })
  await expectCssValue({ locator: favoritesTitle, property: 'padding-top', expected: `${desktopSidebarParity.groupHeaderPadding.withCount.top}px` })
  await expectCssValue({ locator: favoritesTitle, property: 'padding-left', expected: `${desktopSidebarParity.groupHeaderPadding.withCount.left}px` })
  await expectCssValue({ locator: favoritesTitleText, property: 'color', expected: await cssColor({ page, color: desktopParityColors.textSecondary }) })
  await expectCssValue({ locator: typesCount, property: 'font-size', expected: `${desktopSidebarParity.countPillTextSize}px` })
  await expectCssValue({ locator: typesCount, property: 'height', expected: '18px' })
  await expectCssValue({ locator: typesCount, property: 'border-radius', expected: `${desktopSidebarParity.countPillRadius}px` })
  await expectCssValue({ locator: inboxItem, property: 'background-color', expected: await cssColor({ page, color: desktopParityColors.accentBlueLight }) })
}

async function assertPropertiesParity(page: Page) {
  const propertiesPanel = page.getByTestId('properties-panel')
  const typeRow = page.getByTestId('property-row-type')
  const typeLabel = page.getByTestId('property-row-type-label')
  const tagsWrap = page.getByTestId('property-tags-wrap')
  const belongsToSection = page.getByTestId('property-section-belongsTo')
  const relationshipRow = page.getByTestId('relationship-row-llm-workflow')
  const relationshipText = page.getByTestId('relationship-row-llm-workflow-text')
  const addPropertyRow = page.getByTestId('property-action-add-property')

  await expect(propertiesPanel).toBeVisible()
  await expect(typeRow).toBeVisible()
  await expect(belongsToSection).toBeVisible()

  await expectCssValue({ locator: typeRow, property: 'min-height', expected: `${desktopPropertyParity.rowMinHeight}px` })
  await expectCssValue({ locator: typeRow, property: 'padding-left', expected: `${desktopPropertyParity.rowPaddingHorizontal}px` })
  await expectCssValue({ locator: typeLabel, property: 'font-size', expected: `${desktopPropertyParity.labelTextSize}px` })
  await expectCssValue({ locator: typeLabel, property: 'color', expected: await cssColor({ page, color: desktopParityColors.textSecondary }) })
  await expectCssValue({ locator: tagsWrap, property: 'flex-wrap', expected: 'wrap' })
  await expectCssValue({ locator: relationshipRow, property: 'border-radius', expected: `${desktopRelationshipParity.rowRadius}px` })
  await expectCssValue({ locator: relationshipRow, property: 'padding-left', expected: `${desktopRelationshipParity.rowPaddingHorizontal}px` })
  await expectCssValue({ locator: relationshipRow, property: 'padding-top', expected: `${desktopRelationshipParity.rowPaddingVertical}px` })
  await expectCssValue({ locator: relationshipText, property: 'font-size', expected: `${desktopRelationshipParity.textFontSize}px` })
  await expectCssValue({ locator: relationshipText, property: 'font-weight', expected: desktopRelationshipParity.textFontWeight })
  await expectCssValue({ locator: relationshipText, property: 'color', expected: await cssColor({ page, color: desktopParityColors.accentGreen }) })
  await expectCssValue({ locator: addPropertyRow, property: 'min-height', expected: `${desktopPropertyParity.rowMinHeight}px` })
  await expectCssValue({ locator: addPropertyRow, property: 'border-radius', expected: `${desktopPropertyParity.actionRowRadius}px` })
}

async function assertEditorParity(page: Page) {
  const titleBlock = page.getByTestId('editor-title-block')
  const title = page.getByTestId('editor-title')
  const paragraph = page.getByTestId('editor-paragraph').first()
  const heading = page.getByTestId('editor-heading-2')
  const quote = page.getByTestId('editor-quote')
  const quoteText = page.getByTestId('editor-quote-text')
  const table = page.getByTestId('editor-table')

  await expect(titleBlock).toBeVisible()
  await expect(title).toBeVisible()
  await expect(table).toBeVisible()

  await expectCssValue({ locator: title, property: 'font-size', expected: `${desktopEditorParity.h1FontSize}px` })
  await expectCssValue({ locator: title, property: 'font-weight', expected: '700' })
  await expectCssValue({ locator: title, property: 'line-height', expected: `${desktopEditorParity.h1LineHeight}px` })
  await expectCssValue({ locator: titleBlock, property: 'padding-bottom', expected: `${desktopEditorParity.h1PaddingBottom}px` })
  await expectCssValue({ locator: titleBlock, property: 'margin-bottom', expected: `${desktopEditorParity.h1MarginBottom}px` })
  await expectCssValue({ locator: titleBlock, property: 'border-bottom-color', expected: await cssColor({ page, color: desktopParityColors.borderDefault }) })
  await expectCssValue({ locator: paragraph, property: 'font-size', expected: `${desktopEditorParity.bodyFontSize}px` })
  await expectCssValue({ locator: paragraph, property: 'line-height', expected: `${desktopEditorParity.bodyLineHeight}px` })
  await expectCssValue({ locator: heading, property: 'font-size', expected: `${desktopEditorParity.h2FontSize}px` })
  await expectCssValue({ locator: heading, property: 'font-weight', expected: '600' })
  await expectCssValue({ locator: quote, property: 'border-left-width', expected: '3px' })
  await expectCssValue({ locator: quote, property: 'padding-left', expected: `${desktopEditorParity.quotePaddingLeft}px` })
  await expectCssValue({ locator: quoteText, property: 'font-style', expected: 'italic' })
}

async function assertStatusBarParity(page: Page) {
  const syncBar = page.getByTestId('sync-status-bar')
  const syncLabel = page.getByTestId('sync-status-label')
  const syncDetail = page.getByTestId('sync-status-detail')

  await expect(syncBar).toBeVisible()
  await expectCssValue({ locator: syncBar, property: 'height', expected: `${desktopStatusBarParity.height}px` })
  await expectCssValue({ locator: syncBar, property: 'min-height', expected: `${desktopStatusBarParity.height}px` })
  await expectCssValue({ locator: syncBar, property: 'padding-left', expected: `${desktopStatusBarParity.paddingHorizontal}px` })
  await expectCssValue({ locator: syncBar, property: 'background-color', expected: await cssColor({ page, color: desktopParityColors.surfaceSidebar }) })
  await expectCssValue({ locator: syncLabel, property: 'font-size', expected: `${desktopStatusBarParity.fontSize}px` })
  await expectCssValue({ locator: syncLabel, property: 'font-weight', expected: '500' })
  await expectCssValue({ locator: syncLabel, property: 'color', expected: await cssColor({ page, color: desktopParityColors.textSecondary }) })
  await expectCssValue({ locator: syncDetail, property: 'font-size', expected: `${desktopStatusBarParity.fontSize}px` })
}

async function assertToolbarActionParity(page: Page) {
  const actionButtons = [
    page.getByTestId('sidebar-collapse-action'),
    page.getByTestId('note-list-search-action'),
    page.getByTestId('note-list-create-action'),
    page.getByTestId('editor-favorite-action'),
    page.getByTestId('editor-more-action'),
  ]

  for (const button of actionButtons) {
    await expect(button).toBeVisible()
    await expectCssValue({ locator: button, property: 'height', expected: `${desktopToolbarActionParity.iconButtonSize}px` })
    await expectCssValue({ locator: button, property: 'width', expected: `${desktopToolbarActionParity.iconButtonSize}px` })
    await expectCssValue({ locator: button, property: 'border-radius', expected: `${desktopToolbarActionParity.borderRadius}px` })
    await expectCssValue({ locator: button, property: 'background-color', expected: 'rgba(0, 0, 0, 0)' })
  }
}

async function cssColor({ color, page }: ColorNormalizationRequest) {
  return page.evaluate((value) => {
    const node = document.createElement('div')
    node.style.color = value
    document.body.append(node)
    const computed = getComputedStyle(node).color
    node.remove()
    return computed
  }, color)
}

async function cssValue({ locator, property }: CssQuery) {
  return locator.evaluate((element, cssProperty) => getComputedStyle(element).getPropertyValue(cssProperty), property)
}

async function childCssValue({ locator, property }: CssQuery) {
  return locator.evaluate((element, cssProperty) => {
    const child = element.firstElementChild
    if (!child) throw new Error('Expected parity surface to have a child content element.')
    return getComputedStyle(child).getPropertyValue(cssProperty)
  }, property)
}

async function expectCssValue(expectation: CssExpectation) {
  expect(await cssValue(expectation)).toBe(expectation.expected)
}

async function expectChildCssValue(expectation: CssExpectation) {
  expect(await childCssValue(expectation)).toBe(expectation.expected)
}

async function requiredBox(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Expected element to have a bounding box.')
  return box
}

function expectClose({ actual, expected, message }: LayoutExpectation) {
  expect(Math.abs(actual - expected), message).toBeLessThanOrEqual(layoutTolerance)
}
