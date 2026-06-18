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
type CodeFenceSourceMode = 'indented' | 'root'
type NoteTitleText = string
type PlainText = string
type ReadHtmlBlockResult = { html: HtmlSnippet; nextIndex: number }
type ReadListSourceLinesResult = {
  hasContinuation: boolean
  hasHardBreak: boolean
  lines: MarkdownLines
  nextIndex: number
}
type ReadParagraphResult = { lines: MarkdownLines; nextIndex: number }
type ReadQuoteResult = { paragraphs: MarkdownLines[]; nextIndex: number }
type UrlText = string
type WikilinkTarget = string
type MarkdownNormalizer = (markdown: MarkdownBody) => MarkdownBody

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
  readListContinuationSourceBlock,
  readListHardBreakSourceBlock,
  readOrderedParenListSourceBlock,
  readIrregularOrderedDotListSourceBlock,
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
  const heading = lines[startIndex]?.match(/^(#{1,6})(?:[ \t]+(.*)|[ \t]*)$/u)
  if (!heading) return null

  const level = heading[1].length
  return { html: `<h${level}>${inlineMarkdownToHtml(heading[2] ?? '')}</h${level}>`, nextIndex: startIndex + 1 }
}

function readQuote(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const quote = readQuoteParagraphs(lines, startIndex)
  return quote ? { html: blockquoteHtml(quote.paragraphs), nextIndex: quote.nextIndex } : null
}

function readQuoteParagraphs(lines: MarkdownLines, startIndex: number): ReadQuoteResult | null {
  const paragraphs: MarkdownLines[] = [[]]
  let index = startIndex
  let quoteMarkers = 0

  while (index < lines.length) {
    const match = lines[index]?.match(/^>\s?(.*)$/)
    if (!match) break

    quoteMarkers += 1
    appendQuoteLine(paragraphs, match[1])
    index += 1
  }

  const nonEmptyParagraphs = paragraphs.filter((paragraph) => paragraph.length > 0)
  if (nonEmptyParagraphs.length > 0) return { paragraphs: nonEmptyParagraphs, nextIndex: index }

  return quoteMarkers > 0 ? { paragraphs: [[]], nextIndex: index } : null
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

function readListContinuationSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const source = readListSourceLines(lines, startIndex)
  if (!source?.hasContinuation) return null

  return sourceLinesParagraphBlock(source.lines, source.nextIndex)
}

function readListHardBreakSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const source = readListSourceLines(lines, startIndex)
  if (!source?.hasHardBreak) return null

  return sourceLinesParagraphBlock(source.lines, source.nextIndex)
}

function readListSourceLines(lines: MarkdownLines, startIndex: number): ReadListSourceLinesResult | null {
  const firstLine = lines[startIndex] ?? ''
  const first = listLine(firstLine)
  if (!first) return null

  const baseIndent = leadingWhitespaceLength(firstLine)
  const sourceLines: string[] = []
  let hasContinuation = false
  let hasHardBreak = false
  let index = startIndex

  while (index < lines.length) {
    const sourceLine = readListSourceLine(lines[index] ?? '', baseIndent)
    if (!sourceLine) break

    hasContinuation ||= sourceLine.hasContinuation
    hasHardBreak ||= sourceLine.hasHardBreak
    sourceLines.push(sourceLine.line)
    index += 1
  }

  return { hasContinuation, hasHardBreak, lines: sourceLines, nextIndex: index }
}

function readListSourceLine(
  line: MarkdownLine,
  baseIndent: number,
): { hasContinuation: boolean; hasHardBreak: boolean; line: MarkdownLine } | null {
  if (!line.trim() || isOutdentedListSourceLine(line, baseIndent)) return null

  const hasContinuation = isListContinuationSourceLine(line, baseIndent)
  if (!listLine(line) && !hasContinuation) return null

  return { hasContinuation, hasHardBreak: isListHardBreakSourceLine(line), line }
}

function readOrderedParenListSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  if (!isOrderedParenListSourceLine(lines[startIndex] ?? '')) return null

  const sourceLines: string[] = []
  let index = startIndex
  while (index < lines.length && isOrderedParenListSourceLine(lines[index] ?? '')) {
    sourceLines.push(lines[index] ?? '')
    index += 1
  }

  return sourceLinesParagraphBlock(sourceLines, index)
}

function readIrregularOrderedDotListSourceBlock(lines: MarkdownLines, startIndex: number): ReadHtmlBlockResult | null {
  const source = readOrderedDotListSourceLines(lines, startIndex)
  if (!source || !isIrregularOrderedDotListSource(source.lines)) return null

  return sourceLinesParagraphBlock(source.lines, source.nextIndex)
}

function readOrderedDotListSourceLines(
  lines: MarkdownLines,
  startIndex: number,
): { lines: MarkdownLines; nextIndex: number } | null {
  if (orderedDotListSourceLineNumber(lines[startIndex] ?? '') === null) return null

  const sourceLines: string[] = []
  let index = startIndex
  while (index < lines.length && orderedDotListSourceLineNumber(lines[index] ?? '') !== null) {
    sourceLines.push(lines[index] ?? '')
    index += 1
  }

  return { lines: sourceLines, nextIndex: index }
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
  const depth = first.depth

  while (index < lines.length) {
    const current = listLine(lines[index] ?? '')
    if (!current || current.depth < depth || (current.depth === depth && current.kind !== kind)) break
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
  return hasInlineMarkdownImageSource(paragraph.lines.join('\n'))
    ? sourceLinesParagraphBlock(paragraph.lines, paragraph.nextIndex)
    : { html: `<p>${paragraphLinesToHtml(paragraph.lines)}</p>`, nextIndex: paragraph.nextIndex }
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
  const task = line.match(/^(\s*)[-*+]\s+\[([ xX])\](?:\s+(.*))?$/u)
  if (task) {
    return { checked: task[2].toLowerCase() === 'x', depth: listDepth(task[1]), kind: 'task', text: task[3] ?? '' }
  }

  const bullet = line.match(/^(\s*)[-*+](?:\s+(.*))?$/u)
  if (bullet) return { depth: listDepth(bullet[1]), kind: 'bullet', text: bullet[2] ?? '' }

  const ordered = line.match(/^(\s*)(\d+)[.)](?:\s+(.*))?$/u)
  if (ordered) {
    return { depth: listDepth(ordered[1]), kind: 'ordered', markerNumber: Number(ordered[2]), text: ordered[3] ?? '' }
  }

  return null
}

function isIndentedListSourceLine(line: MarkdownLine): boolean {
  return hasLeadingWhitespace(line) && listLine(line) !== null
}

function isOutdentedListSourceLine(line: MarkdownLine, baseIndent: number): boolean {
  return listLine(line) !== null && leadingWhitespaceLength(line) < baseIndent
}

function isListContinuationSourceLine(line: MarkdownLine, baseIndent: number): boolean {
  return listLine(line) === null && leadingWhitespaceLength(line) > baseIndent && line.trim().length > 0
}

function isListHardBreakSourceLine(line: MarkdownLine): boolean {
  const item = listLine(line)
  return Boolean(item && item.text.trim().length > 0 && explicitMarkdownHardBreak(line).break)
}

function isOrderedParenListSourceLine(line: MarkdownLine): boolean {
  return /^\d+\)(?:\s+.*)?$/u.test(line)
}

function isIrregularOrderedDotListSource(lines: MarkdownLines): boolean {
  if (lines.length < 2) return false

  const numbers = lines.map(orderedDotListSourceLineNumber)
  const start = numbers[0]
  if (start === null || numbers.some((number) => number === null)) return false

  return numbers.some((number, index) => number !== start + index)
}

function orderedDotListSourceLineNumber(line: MarkdownLine): number | null {
  const match = line.match(/^(\d+)\.(?:\s+.*)?$/u)
  return match ? Number(match[1]) : null
}

function isIndentedTextSourceLine(line: MarkdownLine): boolean {
  return /^(?: {4,}|\t)\S/u.test(line)
}

function hasLeadingWhitespace(line: MarkdownLine): boolean {
  return /^\s/u.test(line)
}

function leadingWhitespaceLength(line: MarkdownLine): number {
  return (line.match(/^\s*/u)?.[0] ?? '').replace(/\t/gu, '  ').length
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
  const escapedMarkdownChars: string[] = []
  const markdownWithoutCodeSpans = markdown.replace(/`([^`]+)`/g, (_match, code: PlainText) => {
    const token = codeSpanToken(codeSpans.length)
    codeSpans.push(`<code>${escapeHtml(code)}</code>`)
    return token
  })
  const protectedMarkdown = markdownWithoutCodeSpans.replace(
    /\\([\\`*_[\]{}()#+\-.!|<>~])/g,
    (_match, char: PlainText) => {
      const token = escapedMarkdownToken(escapedMarkdownChars.length)
      escapedMarkdownChars.push(escapeHtml(char))
      return token
    },
  )
  const escapedMarkdown = escapeHtml(protectedMarkdown)

  const html = linkifyInlineMarkdown(escapedMarkdown)
    .replace(/==([^=]+)==/g, '<mark>$1</mark>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')

  return restoreEscapedMarkdownTokens(restoreCodeSpanTokens(html, codeSpans), escapedMarkdownChars)
}

function linkifyInlineMarkdown(markdown: MarkdownLine): string {
  return markdown
    .replace(/\[\[([^\]|]+)\|([^\]]+)]]/g, (_match, target: WikilinkTarget, display: LinkLabel) => (
      wikilinkHtml(target, display)
    ))
    .replace(/\[\[([^\]]+)]]/g, (_match, target: WikilinkTarget) => wikilinkHtml(target, target))
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: LinkLabel, href: UrlText) => (
      `<a href="${escapeAttribute(markdownLinkHref(href))}">${label}</a>`
    ))
    .replace(/&lt;((?:https?|mailto):(?:(?!&gt;)\S)+)&gt;/g, (_match, href: UrlText) => (
      externalAutolinkHtml(href, href)
    ))
    .replace(/&lt;([A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})&gt;/g, (
      _match,
      email: LinkLabel,
    ) => emailAutolinkHtml(email))
}

function markdownLinkHref(href: UrlText): UrlText {
  const destination = unescapeHtml(href).trim()
  return destination.startsWith('<') && destination.endsWith('>')
    ? destination.slice(1, -1)
    : destination
}

function wikilinkHtml(target: WikilinkTarget, display: LinkLabel): string {
  const href = `${WIKILINK_HREF_PREFIX}${encodeURIComponent(unescapeHtml(target))}`
  return `<a href="${href}">${display}</a>`
}

function externalAutolinkHtml(href: UrlText, display: LinkLabel): string {
  return `<a href="${escapeAttribute(unescapeHtml(href))}">${display}</a>`
}

function emailAutolinkHtml(email: LinkLabel): string {
  return `<a href="mailto:${escapeAttribute(unescapeHtml(email))}">${email}</a>`
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
  paragraph: serializeParagraph,
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

function serializeParagraph(node: TiptapJsonNode): MarkdownBody {
  const rawMarkdown = serializeInlineChildren(node.content ?? [])
  const normalizedMarkdown = normalizeMobileFallbackParagraphMarkdown(rawMarkdown)
  return normalizedMarkdown !== rawMarkdown || hasInlineMarkdownImageSource(rawMarkdown)
    ? normalizedMarkdown
    : serializeInlineChildren(node.content ?? [], { escapePlainText: true })
}

function normalizeMobileFallbackParagraphMarkdown(markdown: MarkdownBody): MarkdownBody {
  for (const normalize of mobileFallbackParagraphNormalizers) {
    const normalizedMarkdown = normalize(markdown)
    if (normalizedMarkdown !== markdown) return normalizedMarkdown
  }

  return markdown
}

const mobileFallbackParagraphNormalizers: MarkdownNormalizer[] = [
  normalizeMobileDisplayMathMarkdown,
  normalizeInlineImageSourceMarkdown,
  normalizeCodeFenceSourceMarkdown,
  normalizeUnsupportedHtmlBlockMarkdown,
  normalizeIndentedCodeFenceSourceMarkdown,
  normalizeIndentedListSourceMarkdown,
  normalizeListContinuationSourceMarkdown,
  normalizeListHardBreakSourceMarkdown,
  normalizeOrderedParenListSourceMarkdown,
  normalizeIrregularOrderedDotListSourceMarkdown,
  normalizeIndentedTextSourceMarkdown,
  normalizeUnsupportedTableMarkdown,
]

function normalizeInlineImageSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  return lines.some(hasInlineMarkdownImageSource) ? lines.join('\n') : markdown
}

function hasInlineMarkdownImageSource(markdown: MarkdownBody): boolean {
  return /(^|[^\\])!\[(?:\\.|[^\]\\\n])*\]\(/u.test(markdown)
}

function normalizeCodeFenceSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!isCodeFenceSourceParagraph(lines, 'root')) return markdown

  return lines.join('\n')
}

function isCodeFenceSourceParagraph(lines: MarkdownLines, mode: CodeFenceSourceMode): boolean {
  const firstLine = lines[0] ?? ''
  if (mode === 'indented' && !hasLeadingWhitespace(firstLine)) return false
  if (mode === 'root' && hasLeadingWhitespace(firstLine)) return false

  const opening = readMobileMarkdownCodeFence(firstLine)
  return Boolean(
    opening
    && lines.length > 1
    && isMobileMarkdownCodeFenceClose(lines[lines.length - 1] ?? '', opening)
  )
}

function normalizeIndentedCodeFenceSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!isCodeFenceSourceParagraph(lines, 'indented')) return markdown

  return lines.join('\n')
}

function normalizeIndentedListSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!lines.every(isIndentedListSourceLine)) return markdown

  return lines.join('\n')
}

function normalizeListContinuationSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  const source = readListSourceLines(lines, 0)
  if (!source?.hasContinuation || source.nextIndex !== lines.length) return markdown

  return source.lines.join('\n')
}

function normalizeListHardBreakSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  const source = readListSourceLines(lines, 0)
  if (!source?.hasHardBreak || source.nextIndex !== lines.length) return markdown

  return source.lines.join('\n')
}

function normalizeOrderedParenListSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!lines.every(isOrderedParenListSourceLine)) return markdown

  return lines.join('\n')
}

function normalizeIrregularOrderedDotListSourceMarkdown(markdown: MarkdownBody): MarkdownBody {
  const lines = markdown.split('\n').map(stripHardBreakMarker)
  if (!isIrregularOrderedDotListSource(lines)) return markdown

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

function serializeInlineChildren(
  nodes: TiptapJsonNode[],
  options?: { escapePlainText?: boolean },
): string {
  return nodes.map((node) => serializeInlineNode(node, options)).join('')
}

function serializeInlineNode(node: TiptapJsonNode, options?: { escapePlainText?: boolean }): string {
  if (node.type === 'text') return serializeTextNode(node, options)
  if (node.type === 'hardBreak') return '  \n'
  if (node.type === 'image') return imageMarkdown(node)
  return serializeInlineChildren(node.content ?? [], options)
}

function serializeTextNode(node: TiptapJsonNode, options?: { escapePlainText?: boolean }): string {
  const text = node.text ?? ''
  const marks = node.marks ?? []
  return options?.escapePlainText === true && marks.length === 0
    ? escapePlainInlineMarkdown(text)
    : applyMarks(text, marks)
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
  const autolink = markdownAutolink(text, href)
  if (autolink) return autolink
  return `[${escapeMarkdownLinkLabel(text)}](${escapeMarkdownLinkDestination(href)})`
}

function markdownAutolink(text: LinkLabel, href: UrlText): string | null {
  if (href === text && isMarkdownUriAutolink(href)) return `<${href}>`
  if (href === `mailto:${text}` && isMarkdownEmailAutolink(text)) return `<${text}>`
  return null
}

function isMarkdownUriAutolink(value: UrlText): boolean {
  return /^(?:https?|mailto):\S+$/u.test(value) && !/[<>]/u.test(value)
}

function isMarkdownEmailAutolink(value: LinkLabel): boolean {
  return /^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/u.test(value)
}

function escapeMarkdownLinkLabel(text: LinkLabel): LinkLabel {
  return text.replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

function escapeMarkdownLinkDestination(href: UrlText): UrlText {
  if (/[\s<>]/u.test(href)) return `<${href.replace(/>/g, '%3E')}>`
  return href.replace(/\\/g, '\\\\').replace(/\)/g, '\\)')
}

function escapePlainInlineMarkdown(text: PlainText): PlainText {
  const plainSourceSpans: string[] = []
  const protectedText = text.replace(plainSourceSpanPattern, (span) => {
    const token = plainSourceSpanToken(plainSourceSpans.length)
    plainSourceSpans.push(span)
    return token
  })

  const escapedText = protectedText
    .replace(/\\/g, '\\\\')
    .replace(/([`*_[\]])/g, '\\$1')

  return restorePlainSourceSpanTokens(escapedText, plainSourceSpans)
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

function escapedMarkdownToken(index: number): string {
  return `\u0000ESCAPEDMARKDOWN${index}\u0000`
}

const plainSourceSpanPattern =
  /\b(?:https?|mailto):[^\s<>()]+(?:\([^\s<>()]*\)[^\s<>()]*)*|\b[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu

function plainSourceSpanToken(index: number): string {
  return `\u0000PLAINSOURCESPAN${index}\u0000`
}

function restoreCodeSpanTokens(html: HtmlSnippet, codeSpans: HtmlSnippet[]): HtmlSnippet {
  return codeSpans.reduce((current, codeSpan, index) => (
    current.replaceAll(codeSpanToken(index), codeSpan)
  ), html)
}

function restoreEscapedMarkdownTokens(html: HtmlSnippet, escapedMarkdownChars: HtmlSnippet[]): HtmlSnippet {
  return escapedMarkdownChars.reduce((current, escapedChar, index) => (
    current.replaceAll(escapedMarkdownToken(index), escapedChar)
  ), html)
}

function restorePlainSourceSpanTokens(text: PlainText, spans: PlainText[]): PlainText {
  return spans.reduce((current, span, index) => (
    current.replaceAll(plainSourceSpanToken(index), span)
  ), text)
}
