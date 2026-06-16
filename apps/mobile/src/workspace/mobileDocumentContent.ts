import { parseLocalVaultDocument } from './localVaultFrontmatter'
import {
  isMobileDisplayMathStart,
  normalizeMobileDisplayMathMarkdown,
  readMobileDisplayMathBlock,
} from './mobileDisplayMath'
import { mobileEditorBlocksToMarkdown, mobileFallbackBulletsToMarkdown } from './mobileEditorBlockMarkdown'
import { isMobileMarkdownCodeFenceClose, readMobileMarkdownCodeFence } from './mobileMarkdownCodeFence'
import { mobileMarkdownListHtml, type MobileMarkdownListItem } from './mobileMarkdownListHtml'
import { mobileImageNodeMarkdown, mobileMarkdownImageHtml } from './mobileMarkdownImage'
import {
  normalizeUnsupportedHtmlBlockMarkdown,
  readUnsupportedHtmlBlock,
  unsupportedHtmlBlockToParagraphHtml,
} from './mobileUnsupportedHtmlMarkdown'
import type { MobileNote } from './mobileWorkspaceModel'

type MarkdownContent = string
type MarkdownBody = string
type HtmlSnippet = string
type LinkLabel = string
type MarkdownLine = string
type MarkdownLines = MarkdownLine[]
type NoteTitleText = string
type PlainText = string
type ReadHtmlBlockResult = { html: HtmlSnippet; nextIndex: number }
type ReadParagraphResult = { lines: MarkdownLines; nextIndex: number }
type ReadQuoteResult = { paragraphs: MarkdownLines[]; nextIndex: number }
type UrlText = string
type WikilinkTarget = string

export type TiptapJsonMark = {
  attrs?: Record<string, unknown>
  type?: string
}

export type TiptapJsonNode = {
  attrs?: Record<string, unknown>
  content?: TiptapJsonNode[]
  marks?: TiptapJsonMark[]
  text?: string
  type?: string
}

type ListKind = 'bullet' | 'ordered' | 'task'

const WIKILINK_HREF_PREFIX = 'tolaria://wikilink/'
const FRONTMATTER_OPEN = /^---\r?\n/
const FRONTMATTER_CLOSE = /\r?\n---(?:\r?\n|$)/

type MobileEditableDocumentSource = Pick<MobileNote, 'editorBlocks' | 'rawContent' | 'title'> & {
  editorBullets?: string[]
}

export function mobileNoteEditableContent(note: MobileEditableDocumentSource): MarkdownContent {
  if (note.rawContent !== undefined) return note.rawContent

  const blocks = [
    optionalTitleHeading(note.title),
    mobileEditorBlocksToMarkdown(note.editorBlocks ?? []),
    mobileFallbackBulletsToMarkdown(note.editorBullets ?? []),
  ].filter(Boolean)

  return blocks.length > 0 ? `${blocks.join('\n\n')}\n` : ''
}

export function mobileDocumentBody(content: MarkdownContent): MarkdownBody {
  return parseLocalVaultDocument(content).body
}

export function mobileDocumentWithBody(
  content: MarkdownContent,
  body: MarkdownBody,
): MarkdownContent {
  const boundary = rawFrontmatterBoundary(content)
  if (!boundary) return body

  return `${content.slice(0, boundary.bodyStart)}${body}`
}

export function mobileMarkdownBodyToTentapHtml(body: MarkdownBody): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const blocks: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim()) {
      index += 1
      continue
    }

    const block = readHtmlBlock(lines, index) ?? readParagraphHtml(lines, index)
    blocks.push(block.html)
    index = block.nextIndex
  }

  return blocks.join('\n')
}

export function tiptapJsonToMobileMarkdown(node: unknown): MarkdownBody {
  if (!isTiptapJsonNode(node)) return ''
  return serializeBlockChildren(node.content ?? []).trimEnd()
}

function optionalTitleHeading(title: NoteTitleText): string {
  const text = title.trim()
  return text ? `# ${text.replace(/\r?\n/gu, ' ')}` : ''
}

function rawFrontmatterBoundary(content: MarkdownContent): { bodyStart: number } | null {
  const open = content.match(FRONTMATTER_OPEN)
  if (!open) return null

  const rest = content.slice(open[0].length)
  const close = rest.match(FRONTMATTER_CLOSE)
  if (!close || close.index === undefined) return null

  return {
    bodyStart: open[0].length + close.index + close[0].length,
  }
}

function readCodeBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const opening = readMobileMarkdownCodeFence(lines[startIndex] ?? '')
  if (!opening) return null

  const codeLines: string[] = []
  let index = startIndex + 1
  while (index < lines.length && !isMobileMarkdownCodeFenceClose(lines[index] ?? '', opening)) {
    codeLines.push(lines[index] ?? '')
    index += 1
  }

  const language = opening.info ? ` data-language="${escapeAttribute(opening.info)}"` : ''
  return {
    html: `<pre><code${language}>${escapeHtml(codeLines.join('\n'))}</code></pre>`,
    nextIndex: index < lines.length ? index + 1 : index,
  }
}

function readIndentedCodeFenceSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const opening = hasLeadingWhitespace(lines[startIndex] ?? '')
    ? readMobileMarkdownCodeFence(lines[startIndex] ?? '')
    : null
  if (!opening) return null

  let index = startIndex + 1
  while (index < lines.length && !isMobileMarkdownCodeFenceClose(lines[index] ?? '', opening)) {
    index += 1
  }

  const nextIndex = index < lines.length ? index + 1 : index
  return sourceLinesParagraphBlock(lines.slice(startIndex, nextIndex), nextIndex)
}

const htmlBlockReaders = [
  readIndentedCodeFenceSourceBlock,
  readCodeBlock,
  readIndentedDisplayMathSourceBlock,
  readDisplayMathBlock,
  readUnsupportedHtmlSourceBlock,
  readIndentedImageSourceBlock,
  readImageBlock,
  readTable,
  readHorizontalRule,
  readIndentedHeadingSourceBlock,
  readHeading,
  readQuote,
  readIndentedTextSourceBlock,
  readIndentedListSourceBlock,
  readList,
]

function readHtmlBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  for (const reader of htmlBlockReaders) {
    const block = reader(lines, startIndex)
    if (block) return block
  }

  return null
}

function readDisplayMathBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const displayMath = readMobileDisplayMathBlock(lines, startIndex)
  return displayMath
    ? { html: `<p>${displayMath.lines.map(escapeHtml).join('<br>')}</p>`, nextIndex: displayMath.nextIndex }
    : null
}

function readIndentedDisplayMathSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  if (!hasLeadingWhitespace(lines[startIndex] ?? '') || !isMobileDisplayMathStart(lines[startIndex] ?? '')) {
    return null
  }

  const displayMath = readMobileDisplayMathBlock(lines, startIndex)
  return displayMath
    ? sourceLinesParagraphBlock(lines.slice(startIndex, displayMath.nextIndex), displayMath.nextIndex)
    : null
}

function readUnsupportedHtmlSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const block = readUnsupportedHtmlBlock(lines, startIndex)
  return block
    ? { html: unsupportedHtmlBlockToParagraphHtml(block.lines, escapeHtml), nextIndex: block.nextIndex }
    : null
}

function readIndentedImageSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const line = lines[startIndex] ?? ''
  return /^\s+!\[/u.test(line) && mobileMarkdownImageHtml(line)
    ? { html: `<p>${escapeHtml(line)}</p>`, nextIndex: startIndex + 1 }
    : null
}

function readImageBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const html = mobileMarkdownImageHtml(lines[startIndex] ?? '')
  return html ? { html, nextIndex: startIndex + 1 } : null
}

function readTable(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const header = lines[startIndex]
  const divider = lines[startIndex + 1]
  if (!header || !divider || !isMarkdownTableDivider(divider)) return null

  const tableLines: string[] = [header, divider]
  let index = startIndex + 2
  while (index < lines.length && lines[index]?.includes('|')) {
    tableLines.push(lines[index] ?? '')
    index += 1
  }

  return { html: `<p>${tableLines.map(escapeHtml).join('<br>')}</p>`, nextIndex: index }
}

function readHorizontalRule(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  return isHorizontalRule(lines[startIndex] ?? '') ? { html: '<hr>', nextIndex: startIndex + 1 } : null
}

function readIndentedHeadingSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const line = lines[startIndex] ?? ''
  return /^\s+#{1,6}\s+/u.test(line) ? { html: `<p>${escapeHtml(line)}</p>`, nextIndex: startIndex + 1 } : null
}

function readHeading(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const heading = lines[startIndex]?.match(/^(#{1,6})\s+(.+)$/)
  if (!heading) return null

  const level = heading[1].length
  return { html: `<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`, nextIndex: startIndex + 1 }
}

function readQuote(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const quote = readQuoteParagraphs(lines, startIndex)
  return quote ? { html: blockquoteHtml(quote.paragraphs), nextIndex: quote.nextIndex } : null
}

function readQuoteParagraphs(lines: MarkdownLines, startIndex: number): ReadQuoteResult | null {
  const paragraphs: MarkdownLines[] = [[]]
  let index = startIndex

  while (index < lines.length) {
    const match = lines[index]?.match(/^>\s?(.*)$/)
    if (!match) break

    appendQuoteLine(paragraphs, match[1])
    index += 1
  }

  const nonEmptyParagraphs = paragraphs.filter((paragraph) => paragraph.length > 0)
  return nonEmptyParagraphs.length > 0 ? { paragraphs: nonEmptyParagraphs, nextIndex: index } : null
}

function appendQuoteLine(paragraphs: MarkdownLines[], line: MarkdownLine): void {
  if (line.trim()) {
    paragraphs[paragraphs.length - 1]?.push(line)
  } else if (paragraphs[paragraphs.length - 1]?.length) {
    paragraphs.push([])
  }
}

function blockquoteHtml(paragraphs: MarkdownLines[]): HtmlSnippet {
  return `<blockquote>${paragraphs.map(quoteParagraphHtml).join('')}</blockquote>`
}

function quoteParagraphHtml(lines: MarkdownLines): HtmlSnippet {
  return `<p>${paragraphLinesToHtml(lines)}</p>`
}

function readIndentedListSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  if (!isIndentedListSourceLine(lines[startIndex] ?? '')) return null

  const sourceLines: string[] = []
  let index = startIndex
  while (index < lines.length && isIndentedListSourceLine(lines[index] ?? '')) {
    sourceLines.push(lines[index] ?? '')
    index += 1
  }

  return {
    html: `<p>${sourceLines.map(escapeHtml).join('<br>')}</p>`,
    nextIndex: index,
  }
}

function readIndentedTextSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  if (!isIndentedTextSourceLine(lines[startIndex] ?? '')) return null

  const sourceLines: string[] = []
  let index = startIndex
  while (index < lines.length && isIndentedTextSourceLine(lines[index] ?? '')) {
    sourceLines.push(lines[index] ?? '')
    index += 1
  }

  return sourceLinesParagraphBlock(sourceLines, index)
}

function sourceLinesParagraphBlock(sourceLines: MarkdownLines, nextIndex: number): ReadHtmlBlockResult {
  return {
    html: `<p>${sourceLines.map(escapeHtml).join('<br>')}</p>`,
    nextIndex,
  }
}

function readList(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const first = listLine(lines[startIndex] ?? '')
  if (!first) return null

  const items: MobileMarkdownListItem[] = []
  let index = startIndex
  const kind: ListKind = first.kind

  while (index < lines.length) {
    const current = listLine(lines[index] ?? '')
    if (!current || current.kind !== kind) break
    items.push(current)
    index += 1
  }

  return {
    html: mobileMarkdownListHtml(kind, items, inlineMarkdownToHtml),
    nextIndex: index,
  }
}

function readParagraph(lines: MarkdownLines, startIndex: number): ReadParagraphResult {
  const paragraph: string[] = []
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim() || isBlockStart(lines, index)) break
    paragraph.push(line)
    index += 1
  }

  return { lines: paragraph, nextIndex: index }
}

function readParagraphHtml(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult {
  const paragraph = readParagraph(lines, startIndex)
  return { html: `<p>${paragraphLinesToHtml(paragraph.lines)}</p>`, nextIndex: paragraph.nextIndex }
}

function paragraphLinesToHtml(lines: MarkdownLines): HtmlSnippet {
  return lines.reduce((html, line) => {
    const hardBreak = explicitMarkdownHardBreak(line)
    const text = inlineMarkdownToHtml(hardBreak.text)
    const separator = html && !html.endsWith('<br>') ? ' ' : ''
    return `${html}${separator}${text}${hardBreak.break ? '<br>' : ''}`
  }, '')
}

function explicitMarkdownHardBreak(line: MarkdownLine): { break: boolean; text: MarkdownLine } {
  if (line.endsWith('\\')) return { break: true, text: line.slice(0, -1).trim() }
  if (/ {2,}$/u.test(line)) return { break: true, text: line.replace(/ {2,}$/u, '').trim() }
  return { break: false, text: line.trim() }
}

function isBlockStart(lines: MarkdownLines, index: number): boolean {
  return readHtmlBlock(lines, index) !== null
}

function listLine(line: MarkdownLine): (MobileMarkdownListItem & { kind: ListKind }) | null {
  const task = line.match(/^(\s*)[-*+]\s+\[([ xX])]\s+(.+)$/)
  if (task) {
    return { checked: task[2].toLowerCase() === 'x', depth: listDepth(task[1]), kind: 'task', text: task[3] }
  }

  const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/)
  if (bullet) return { depth: listDepth(bullet[1]), kind: 'bullet', text: bullet[2] }

  const ordered = line.match(/^(\s*)\d+[.)]\s+(.+)$/)
  if (ordered) return { depth: listDepth(ordered[1]), kind: 'ordered', text: ordered[2] }

  return null
}

function isIndentedListSourceLine(line: MarkdownLine): boolean {
  return hasLeadingWhitespace(line) && listLine(line) !== null
}

function isIndentedTextSourceLine(line: MarkdownLine): boolean {
  return /^(?: {4,}|\t)\S/u.test(line)
}

function hasLeadingWhitespace(line: MarkdownLine): boolean {
  return /^\s/u.test(line)
}

function listDepth(indent: MarkdownLine): number {
  const expanded = indent.replace(/\t/g, '  ')
  return Math.min(Math.floor(expanded.length / 2), 3)
}

function isHorizontalRule(line: MarkdownLine): boolean {
  return /^[-*_]{3,}$/.test(line.trim())
}

function isMarkdownTableDivider(line: MarkdownLine): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function inlineMarkdownToHtml(markdown: MarkdownLine): string {
  const codeSpans: string[] = []
  const escapedMarkdown = escapeHtml(markdown).replace(/`([^`]+)`/g, (_match, code: PlainText) => {
    const token = codeSpanToken(codeSpans.length)
    codeSpans.push(`<code>${code}</code>`)
    return token
  })

  const html = linkifyInlineMarkdown(escapedMarkdown)
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')

  return restoreCodeSpanTokens(html, codeSpans)
}

function linkifyInlineMarkdown(markdown: MarkdownLine): string {
  return markdown
    .replace(/\[\[([^\]|]+)\|([^\]]+)]]/g, (_match, target: WikilinkTarget, display: LinkLabel) => (
      wikilinkHtml(target, display)
    ))
    .replace(/\[\[([^\]]+)]]/g, (_match, target: WikilinkTarget) => wikilinkHtml(target, target))
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: LinkLabel, href: UrlText) => (
      `<a href="${escapeAttribute(href)}">${label}</a>`
    ))
}

function wikilinkHtml(target: WikilinkTarget, display: LinkLabel): string {
  const href = `${WIKILINK_HREF_PREFIX}${encodeURIComponent(unescapeHtml(target))}`
  return `<a href="${href}">${display}</a>`
}

function serializeBlockChildren(nodes: TiptapJsonNode[]): MarkdownBody {
  return nodes
    .map((node) => serializeBlockNode(node))
    .filter((block) => block.length > 0)
    .join('\n\n')
}

function serializeBlockNode(node: TiptapJsonNode): MarkdownBody {
  const serializer = node.type ? blockNodeSerializers[node.type] : undefined
  return serializer ? serializer(node) : serializeBlockChildren(node.content ?? [])
}

const blockNodeSerializers: Record<string, (node: TiptapJsonNode) => MarkdownBody> = {
  paragraph: (node) => normalizeMobileFallbackParagraphMarkdown(serializeInlineChildren(node.content ?? [])),
  heading: (node) => `${'#'.repeat(headingLevel(node))} ${serializeInlineChildren(node.content ?? [])}`.trimEnd(),
  bulletList: (node) => serializeList(node, 'bullet'),
  orderedList: (node) => serializeList(node, 'ordered'),
  taskList: (node) => serializeList(node, 'task'),
  blockquote: (node) => prefixLines(serializeBlockChildren(node.content ?? []), '> '),
  codeBlock: codeBlockMarkdown,
  horizontalRule: () => '---',
  image: imageMarkdown,
  table: tableMarkdown,
}

function normalizeMobileFallbackParagraphMarkdown(markdown: MarkdownBody): MarkdownBody {
  const displayMathMarkdown = normalizeMobileDisplayMathMarkdown(markdown)
  if (displayMathMarkdown !== markdown) return displayMathMarkdown

  const htmlBlockMarkdown = normalizeUnsupportedHtmlBlockMarkdown(markdown)
  if (htmlBlockMarkdown !== markdown) return htmlBlockMarkdown

  const indentedCodeFenceSourceMarkdown = normalizeIndentedCodeFenceSourceMarkdown(markdown)
  if (indentedCodeFenceSourceMarkdown !== markdown) return indentedCodeFenceSourceMarkdown

  const indentedListSourceMarkdown = normalizeIndentedListSourceMarkdown(markdown)
  if (indentedListSourceMarkdown !== markdown) return indentedListSourceMarkdown

  const indentedTextSourceMarkdown = normalizeIndentedTextSourceMarkdown(markdown)
  if (indentedTextSourceMarkdown !== markdown) return indentedTextSourceMarkdown

  return normalizeUnsupportedTableMarkdown(markdown)
}

function normalizeIndentedCodeFenceSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!isIndentedCodeFenceSourceParagraph(lines)) return markdown

  return lines.join('\n')
}

function isIndentedCodeFenceSourceParagraph(lines: MarkdownLines): boolean {
  const opening = hasLeadingWhitespace(lines[0] ?? '')
    ? readMobileMarkdownCodeFence(lines[0] ?? '')
    : null
  return Boolean(
    opening
    && lines.length > 1
    && isMobileMarkdownCodeFenceClose(lines[lines.length - 1] ?? '', opening),
  )
}

function normalizeIndentedListSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!lines.every(isIndentedListSourceLine)) return markdown

  return lines.join('\n')
}

function normalizeIndentedTextSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!lines.every(isIndentedTextSourceLine)) return markdown

  return lines.join('\n')
}

function normalizeUnsupportedTableMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!isUnsupportedTableParagraph(lines)) return markdown

  return lines.join('\n')
}

function isUnsupportedTableParagraph(lines: MarkdownLines): boolean {
  const header = lines[0] ?? ''
  const divider = lines[1] ?? ''
  return lines.length >= 2
    && lines.every(isMarkdownTableLine)
    && header.includes('|')
    && isMarkdownTableDivider(divider)
}

function isMarkdownTableLine(line: MarkdownLine): boolean {
  return line.includes('|')
}

function stripHardBreakMarker(line: MarkdownLine): MarkdownLine {
  return line.endsWith('  ') ? line.slice(0, -2) : line
}

function serializeInlineChildren(nodes: TiptapJsonNode[]): string {
  return nodes.map((node) => serializeInlineNode(node)).join('')
}

function serializeInlineNode(node: TiptapJsonNode): string {
  if (node.type === 'text') return applyMarks(node.text ?? '', node.marks ?? [])
  if (node.type === 'hardBreak') return '  \n'
  if (node.type === 'image') return imageMarkdown(node)
  return serializeInlineChildren(node.content ?? [])
}

function serializeList(node: TiptapJsonNode, kind: ListKind): MarkdownBody {
  const start = numberAttr(node.attrs?.start) ?? 1
  return (node.content ?? []).map((item, index) => {
    if (kind === 'task') {
      const checked = item.attrs?.checked === true ? 'x' : ' '
      return `- [${checked}] ${serializeListItem(item)}`
    }

    const marker = kind === 'ordered' ? `${start + index}.` : '-'
    return `${marker} ${serializeListItem(item)}`
  }).join('\n')
}

function serializeListItem(item: TiptapJsonNode): string {
  const blocks = item.content ?? []
  const [first, ...rest] = blocks
  const firstText = first ? serializeBlockNode(first) : ''
  const nested = rest.map((block) => indentLines(serializeBlockNode(block), '  ')).filter(Boolean)
  return [firstText, ...nested].filter(Boolean).join('\n')
}

function tableMarkdown(node: TiptapJsonNode): MarkdownBody {
  const rows = (node.content ?? []).map((row) => (
    (row.content ?? []).map((cell) => serializeInlineChildren(cell.content ?? []))
  ))
  if (rows.length === 0) return ''

  const [header, ...body] = rows
  const divider = header.map(() => '---')
  return [header, divider, ...body]
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n')
}

function codeBlockMarkdown(node: TiptapJsonNode): MarkdownBody {
  const language = typeof node.attrs?.language === 'string' ? node.attrs.language : ''
  return `\`\`\`${language}\n${plainText(node.content ?? [])}\n\`\`\``
}

function imageMarkdown(node: TiptapJsonNode): MarkdownBody {
  return mobileImageNodeMarkdown(node.attrs)
}

function applyMarks(text: PlainText, marks: TiptapJsonMark[]): string {
  return marks.reduce((current, mark) => applyMark(current, mark), text)
}

function applyMark(text: PlainText, mark: TiptapJsonMark): string {
  if (mark.type === 'code') return `\`${text.replace(/`/g, '\\`')}\``
  if (mark.type === 'bold') return `**${text}**`
  if (mark.type === 'italic') return `*${text}*`
  if (mark.type === 'strike') return `~~${text}~~`
  if (mark.type === 'highlight') return `==${text}==`
  if (mark.type === 'link') return linkMarkdown(text, mark.attrs)
  return text
}

function linkMarkdown(text: LinkLabel, attrs: Record<string, unknown> | undefined): string {
  const href = typeof attrs?.href === 'string' ? attrs.href : ''
  if (!href) return text
  if (href.startsWith(WIKILINK_HREF_PREFIX)) {
    const target = decodeURIComponent(href.slice(WIKILINK_HREF_PREFIX.length))
    return target === text ? `[[${target}]]` : `[[${target}|${text}]]`
  }
  return `[${text}](${href})`
}

function plainText(nodes: TiptapJsonNode[]): string {
  return nodes.map((node) => (
    node.type === 'text' ? node.text ?? '' : plainText(node.content ?? [])
  )).join('')
}

function headingLevel(node: TiptapJsonNode): number {
  const level = numberAttr(node.attrs?.level)
  if (!level) return 1
  return Math.max(1, Math.min(6, level))
}

function numberAttr(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function prefixLines(text: PlainText, prefix: MarkdownLine): string {
  return text.split('\n').map((line) => `${prefix}${line}`).join('\n')
}

function indentLines(text: PlainText, indent: MarkdownLine): string {
  return text.split('\n').map((line) => `${indent}${line}`).join('\n')
}

function isTiptapJsonNode(value: unknown): value is TiptapJsonNode {
  if (!value || typeof value !== 'object') return false
  const candidate = value as TiptapJsonNode
  return typeof candidate.type === 'string' || Array.isArray(candidate.content)
}

function escapeHtml(value: PlainText): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function unescapeHtml(value: PlainText): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

function escapeAttribute(value: UrlText): string {
  return escapeHtml(value)
}

function codeSpanToken(index: number): string {
  return `\u0000CODESPAN${index}\u0000`
}

function restoreCodeSpanTokens(html: HtmlSnippet, codeSpans: HtmlSnippet[]): HtmlSnippet {
  return codeSpans.reduce((current, codeSpan, index) => (
    current.replaceAll(codeSpanToken(index), codeSpan)
  ), html)
}
