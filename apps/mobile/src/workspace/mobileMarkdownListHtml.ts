export type MobileMarkdownListKind = 'bullet' | 'ordered' | 'task'

export type MobileMarkdownListItem = {
  checked?: boolean
  depth: number
  kind?: MobileMarkdownListKind
  markerNumber?: number
  paragraphs?: string[]
  text: string
}

type InlineHtmlRenderer = (text: string) => string
type ResolvedMobileMarkdownListItem = MobileMarkdownListItem & {
  kind: MobileMarkdownListKind
}
type ListRenderOptions = {
  depth: number
  index: number
  inlineHtml: InlineHtmlRenderer
  items: ResolvedMobileMarkdownListItem[]
  kind: MobileMarkdownListKind
}
type RenderListResult = { html: string; nextIndex: number }

export function mobileMarkdownListHtml(
  kind: MobileMarkdownListKind,
  items: MobileMarkdownListItem[],
  inlineHtml: InlineHtmlRenderer,
): string {
  if (items.length === 0) return ''
  const resolvedItems = items.map((item) => ({ ...item, kind: item.kind ?? kind }))
  return renderList({ depth: resolvedItems[0]?.depth ?? 0, index: 0, inlineHtml, items: resolvedItems, kind }).html
}

function renderList({ depth, index, inlineHtml, items, kind }: ListRenderOptions): RenderListResult {
  const chunks = [listOpenTag(kind, items[index])]
  let cursor = index

  while (cursor < items.length) {
    const chunk = renderNextListChunk({ depth, index: cursor, inlineHtml, items, kind })
    if (!chunk) break
    chunks.push(chunk.html)
    cursor = chunk.nextIndex
  }

  chunks.push(listCloseTag(kind))
  return { html: chunks.join(''), nextIndex: cursor }
}

function renderNextListChunk(options: ListRenderOptions): RenderListResult | null {
  const item = options.items[options.index]
  if (!item || item.depth < options.depth) return null
  if (item.depth > options.depth) return renderList({ ...options, depth: item.depth, kind: item.kind })
  if (item.kind !== options.kind) return null

  const child = renderChildList({ ...options, index: options.index + 1 })
  return { html: listItemHtml(options.kind, item, options.inlineHtml, child.html), nextIndex: child.nextIndex }
}

function renderChildList(options: ListRenderOptions): RenderListResult {
  const nextItem = options.items[options.index]
  return nextItem && nextItem.depth > options.depth
    ? renderList({ ...options, depth: nextItem.depth, kind: nextItem.kind })
    : { html: '', nextIndex: options.index }
}

function listOpenTag(kind: MobileMarkdownListKind, firstItem?: MobileMarkdownListItem): string {
  if (kind === 'ordered') return orderedListOpenTag(firstItem)
  if (kind === 'task') return '<ul data-type="taskList">'
  return '<ul>'
}

function orderedListOpenTag(firstItem?: MobileMarkdownListItem): string {
  const start = firstItem?.markerNumber
  return start && start > 1 ? `<ol start="${start}">` : '<ol>'
}

function listCloseTag(kind: MobileMarkdownListKind): string {
  return kind === 'ordered' ? '</ol>' : '</ul>'
}

function listItemHtml(
  kind: MobileMarkdownListKind,
  item: MobileMarkdownListItem,
  inlineHtml: InlineHtmlRenderer,
  children: string,
): string {
  const paragraphs = listItemParagraphsHtml(item, inlineHtml)
  if (kind !== 'task') return `<li>${paragraphs}${children}</li>`

  const checkedAttr = item.checked ? 'true' : 'false'
  const inputChecked = item.checked ? ' checked="checked"' : ''
  return [
    `<li data-type="taskItem" data-checked="${checkedAttr}">`,
    `<label><input type="checkbox"${inputChecked}><span></span></label>`,
    `<div>${paragraphs}${children}</div>`,
    '</li>',
  ].join('')
}

function listItemParagraphsHtml(item: MobileMarkdownListItem, inlineHtml: InlineHtmlRenderer): string {
  return [item.text, ...(item.paragraphs ?? [])]
    .map((paragraph) => `<p>${inlineHtml(paragraph)}</p>`)
    .join('')
}
