import type { MobileEditorBlock, MobileEditorInline } from './mobileWorkspaceModel'

type CodeLanguage = string
type LinkLabel = string
type MarkdownLine = string
type MarkdownLines = MarkdownLine[]
type MarkdownTableCell = string
type PlainText = string
type WikilinkTarget = string

export function mobileEditorBlocksToMarkdown(blocks: MobileEditorBlock[]): string {
  return blocks.map(mobileEditorBlockToMarkdown).filter(Boolean).join('\n\n')
}

export function mobileFallbackBulletsToMarkdown(bullets: MarkdownLines): string {
  return bullets.map((bullet) => `- ${escapeMarkdownLine(bullet)}`).join('\n')
}

function mobileEditorBlockToMarkdown(block: MobileEditorBlock): string {
  if (isSimpleEditorBlock(block)) return simpleEditorBlockToMarkdown(block)
  return collectionEditorBlockToMarkdown(block)
}

function isSimpleEditorBlock(block: MobileEditorBlock): block is SimpleEditorBlock {
  return block.kind === 'codeBlock'
    || block.kind === 'divider'
    || block.kind === 'heading'
    || block.kind === 'paragraph'
    || block.kind === 'quote'
}

type SimpleEditorBlock = Extract<MobileEditorBlock, {
  kind: 'codeBlock' | 'divider' | 'heading' | 'paragraph' | 'quote'
}>

type CollectionEditorBlock = Extract<MobileEditorBlock, {
  kind: 'bullets' | 'orderedList' | 'table' | 'tasks'
}>

function simpleEditorBlockToMarkdown(block: SimpleEditorBlock): string {
  switch (block.kind) {
    case 'codeBlock':
      return codeBlockToMarkdown(block.code, block.language ?? null)
    case 'divider':
      return '---'
    case 'heading':
      return `${'#'.repeat(block.level)} ${escapeMarkdownLine(block.text)}`
    case 'paragraph':
      return mobileEditorInlineToMarkdown(block.content)
    case 'quote':
      return `> ${mobileEditorInlineToMarkdown(block.content)}`
  }
}

function collectionEditorBlockToMarkdown(block: CollectionEditorBlock): string {
  switch (block.kind) {
    case 'bullets':
      return block.items.map((item) => `${listIndent(item.depth)}- ${mobileEditorInlineToMarkdown(item.content)}`).join('\n')
    case 'orderedList':
      return block.items.map((item) => `${listIndent(item.depth)}${item.marker} ${mobileEditorInlineToMarkdown(item.content)}`).join('\n')
    case 'table':
      return tableBlockToMarkdown(block.headers, block.rows)
    case 'tasks':
      return block.items.map((item) => `${listIndent(item.depth)}- [${item.checked ? 'x' : ' '}] ${mobileEditorInlineToMarkdown(item.content)}`).join('\n')
  }
}

function mobileEditorInlineToMarkdown(content: MobileEditorInline[]): string {
  return content.map(inlineSegmentToMarkdown).join('')
}

function inlineSegmentToMarkdown(segment: MobileEditorInline): string {
  let text = escapeInlineMarkdown(segment.text)
  if (segment.wikilinkTarget) text = wikilinkToMarkdown(segment.wikilinkTarget, segment.text)
  if (segment.linkHref) text = `[${escapeLinkLabel(segment.text)}](${segment.linkHref})`
  if (segment.code) text = `\`${segment.text.replaceAll('`', '\\`')}\``
  if (segment.bold) text = `**${text}**`
  if (segment.italic) text = `*${text}*`
  if (segment.strike) text = `~~${text}~~`
  return text
}

function wikilinkToMarkdown(target: WikilinkTarget, label: LinkLabel): string {
  return target === label ? `[[${target}]]` : `[[${target}|${label}]]`
}

function listIndent(depth: number | undefined): string {
  return '  '.repeat(depth ?? 0)
}

function codeBlockToMarkdown(code: PlainText, language: CodeLanguage | null): string {
  return `\`\`\`${language ?? ''}\n${code}\n\`\`\``
}

function tableBlockToMarkdown(headers: MarkdownTableCell[], rows: MarkdownTableCell[][]): string {
  return [
    `| ${headers.map(escapeTableCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escapeTableCell).join(' | ')} |`),
  ].join('\n')
}

function escapeMarkdownLine(text: PlainText): string {
  return text.replace(/\r?\n/gu, ' ')
}

function escapeInlineMarkdown(text: PlainText): string {
  return text.replaceAll('\\', '\\\\')
}

function escapeLinkLabel(text: LinkLabel): string {
  return text.replaceAll('[', '\\[').replaceAll(']', '\\]')
}

function escapeTableCell(text: MarkdownTableCell): string {
  return escapeMarkdownLine(text).replaceAll('|', '\\|')
}
