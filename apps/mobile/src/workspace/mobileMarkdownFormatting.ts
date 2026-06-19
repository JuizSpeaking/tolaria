import {
  mobileMarkdownSourceBlockFormat,
  mobileMarkdownSourceBlockText,
  type MobileMarkdownSourceBlockFormat,
} from './mobileMarkdownSourceBlocks'

export type MobileMarkdownFormatAction =
  | 'attachment'
  | 'bold'
  | 'bulletList'
  | 'code'
  | 'codeBlock'
  | 'divider'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'highlight'
  | 'italic'
  | 'mathBlock'
  | 'mermaid'
  | 'orderedList'
  | 'pastePlainText'
  | 'quote'
  | 'strike'
  | 'table'
  | 'taskList'
  | 'whiteboard'
  | 'wikilink'

export type MobileMarkdownSelection = {
  end: number
  start: number
}

export type MobileMarkdownFormatResult = {
  selection: MobileMarkdownSelection
  text: string
}

type MarkdownEditRequest = {
  action: MobileMarkdownFormatAction
  selection: MobileMarkdownSelection
  text: string
}

type MarkdownInsertionRequest = {
  selection: MobileMarkdownSelection
  text: string
  value: string
}

type InlineFormat = {
  placeholder: string
  prefix: string
  suffix: string
}

type MarkdownLine = {
  value: string
}

type LineMarker = {
  value: '- ' | '- [ ] ' | '> ' | '# ' | '## ' | '### ' | '#### ' | '##### ' | '###### '
}

type MarkdownReplacement = {
  value: string
}

type NumberedLine = MarkdownLine & {
  index: number
}

const inlineFormats: Partial<Record<MobileMarkdownFormatAction, InlineFormat>> = {
  bold: { placeholder: 'bold text', prefix: '**', suffix: '**' },
  code: { placeholder: 'code', prefix: '`', suffix: '`' },
  highlight: { placeholder: 'highlighted text', prefix: '==', suffix: '==' },
  italic: { placeholder: 'italic text', prefix: '*', suffix: '*' },
  strike: { placeholder: 'strikethrough text', prefix: '~~', suffix: '~~' },
}

const lineMarkers: Partial<Record<MobileMarkdownFormatAction, LineMarker>> = {
  bulletList: { value: '- ' },
  heading1: { value: '# ' },
  heading2: { value: '## ' },
  heading3: { value: '### ' },
  heading4: { value: '#### ' },
  heading5: { value: '##### ' },
  heading6: { value: '###### ' },
  quote: { value: '> ' },
  taskList: { value: '- [ ] ' },
}

const markdownTableSnippet = mobileMarkdownSourceBlockText('table')

export function applyMobileMarkdownFormat(
  text: string,
  selection: MobileMarkdownSelection,
  action: MobileMarkdownFormatAction,
): MobileMarkdownFormatResult {
  return new MarkdownEditSession({ action, selection, text }).apply()
}

export function insertMobileMarkdownText({
  selection,
  text,
  value,
}: MarkdownInsertionRequest): MobileMarkdownFormatResult {
  return new MarkdownEditSession({ action: 'attachment', selection, text }).insertText(value)
}

export function insertMobileMarkdownPlainText({
  selection,
  text,
  value,
}: MarkdownInsertionRequest): MobileMarkdownFormatResult {
  return new MarkdownEditSession({ action: 'pastePlainText', selection, text }).insertPlainText(value)
}

class MarkdownEditSession {
  private readonly action: MobileMarkdownFormatAction
  private readonly range: MobileMarkdownSelection
  private readonly text: string

  constructor(request: MarkdownEditRequest) {
    this.action = request.action
    this.text = request.text
    this.range = this.normalizedSelection(request.selection)
  }

  apply(): MobileMarkdownFormatResult {
    const inlineFormat = inlineFormats[this.action]
    if (inlineFormat) return this.applyInlineFormat(inlineFormat)

    const lineMarker = lineMarkers[this.action]
    if (lineMarker) return this.applyMarkedLineTransform(lineMarker)

    if (this.action === 'orderedList') return this.applyLineTransform((line) => this.numberedLine(line))
    if (this.action === 'table') return this.insertTable()
    if (this.action === 'wikilink') return this.applyWikilinkFormat()

    const sourceBlockFormat = mobileMarkdownSourceBlockFormat(this.action)
    if (sourceBlockFormat) return this.insertSourceBlock(sourceBlockFormat)

    return { selection: this.range, text: this.text }
  }

  insertText(value: string): MobileMarkdownFormatResult {
    const replacement = `${this.blockPrefix()}${value}${this.blockSuffix()}`
    return {
      selection: collapsedSelection(this.range.start + replacement.length),
      text: this.replaceRange({ value: replacement }),
    }
  }

  insertPlainText(value: string): MobileMarkdownFormatResult {
    return {
      selection: collapsedSelection(this.range.start + value.length),
      text: this.replaceRange({ value }),
    }
  }

  private applyInlineFormat(format: InlineFormat): MobileMarkdownFormatResult {
    const selected = this.selectedText()
    const inner = selected || format.placeholder
    const replacement = `${format.prefix}${inner}${format.suffix}`
    const innerStart = this.range.start + format.prefix.length
    const innerEnd = innerStart + inner.length

    return {
      selection: selected ? collapsedSelection(this.range.start + replacement.length) : { start: innerStart, end: innerEnd },
      text: this.replaceRange({ value: replacement }),
    }
  }

  private applyWikilinkFormat(): MobileMarkdownFormatResult {
    const selected = this.selectedText().trim()
    if (!selected) {
      return {
        selection: collapsedSelection(this.range.start + 2),
        text: this.replaceRange({ value: '[[' }),
      }
    }

    const replacement = `[[${selected}]]`
    return {
      selection: collapsedSelection(this.range.start + replacement.length),
      text: this.replaceRange({ value: replacement }),
    }
  }

  private applyMarkedLineTransform(marker: LineMarker): MobileMarkdownFormatResult {
    return this.applyLineTransform((line) => (
      marker.value.startsWith('#') ? this.headingLine(line, marker) : this.prefixedLine(line, marker)
    ))
  }

  private applyLineTransform(transform: (line: NumberedLine) => string): MobileMarkdownFormatResult {
    const range = this.selectedLineRange()
    const segment = this.text.slice(range.start, range.end)
    const replacement = segment
      .split('\n')
      .map((line, index) => transform({ index, value: line }))
      .join('\n')

    return {
      selection: collapsedSelection(range.start + replacement.length),
      text: this.replaceRange({ value: replacement }, range),
    }
  }

  private headingLine(line: MarkdownLine, marker: LineMarker): string {
    if (line.value.trim().length === 0) return marker.value
    return `${marker.value}${line.value.replace(/^#{1,6}\s+/u, '')}`
  }

  private prefixedLine(line: MarkdownLine, marker: LineMarker): string {
    if (line.value.trim().length === 0) return marker.value
    if (line.value.startsWith(marker.value)) return line.value
    return `${marker.value}${line.value}`
  }

  private numberedLine(line: NumberedLine): string {
    const marker = `${line.index + 1}. `
    if (line.value.trim().length === 0) return marker
    return `${marker}${line.value.replace(/^\d+[.)]\s+/u, '')}`
  }

  private insertSourceBlock(format: MobileMarkdownSourceBlockFormat): MobileMarkdownFormatResult {
    const selected = this.selectedText()
    const content = format.replaceSelectedText && selected ? selected : format.fallback
    const before = this.blockPrefix()
    const after = this.blockSuffix()
    const replacement = `${before}${format.opening}${content}${format.closing}${after}`
    const contentStart = this.range.start + before.length + format.opening.length

    return {
      selection: this.sourceBlockSelection({ content, contentStart, replacement, selected, selectFallback: format.selectFallback }),
      text: this.replaceRange({ value: replacement }),
    }
  }

  private insertTable(): MobileMarkdownFormatResult {
    const before = this.blockPrefix()
    const after = this.blockSuffix()
    const replacement = `${before}${markdownTableSnippet}${after}`
    const placeholderStart = this.range.start + before.length + markdownTableSnippet.indexOf('Column')

    return {
      selection: {
        start: placeholderStart,
        end: placeholderStart + 'Column'.length,
      },
      text: this.replaceRange({ value: replacement }),
    }
  }

  private sourceBlockSelection({
    content,
    contentStart,
    replacement,
    selected,
    selectFallback,
  }: {
    content: string
    contentStart: number
    replacement: string
    selected: string
    selectFallback: boolean
  }): MobileMarkdownSelection {
    if (selected || !selectFallback) return collapsedSelection(this.range.start + replacement.length)
    return { start: contentStart, end: contentStart + content.length }
  }

  private blockPrefix(): string {
    if (this.range.start === 0 || this.text.slice(0, this.range.start).endsWith('\n\n')) return ''
    return this.text.slice(0, this.range.start).endsWith('\n') ? '\n' : '\n\n'
  }

  private blockSuffix(): string {
    if (this.range.end >= this.text.length || this.text.slice(this.range.end).startsWith('\n\n')) return ''
    return this.text.slice(this.range.end).startsWith('\n') ? '\n' : '\n\n'
  }

  private selectedLineRange(): MobileMarkdownSelection {
    const lineStart = this.text.lastIndexOf('\n', Math.max(0, this.range.start - 1)) + 1
    const nextLineBreak = this.text.indexOf('\n', this.range.end)

    return {
      start: lineStart,
      end: nextLineBreak === -1 ? this.text.length : nextLineBreak,
    }
  }

  private normalizedSelection(selection: MobileMarkdownSelection): MobileMarkdownSelection {
    const start = this.boundedOffset(Math.min(selection.start, selection.end))
    const end = this.boundedOffset(Math.max(selection.start, selection.end))

    return { start, end }
  }

  private boundedOffset(value: number): number {
    if (!Number.isFinite(value)) return this.text.length
    return Math.max(0, Math.min(this.text.length, value))
  }

  private selectedText(): string {
    return this.text.slice(this.range.start, this.range.end)
  }

  private replaceRange(replacement: MarkdownReplacement, range = this.range): string {
    return `${this.text.slice(0, range.start)}${replacement.value}${this.text.slice(range.end)}`
  }
}

function collapsedSelection(offset: number): MobileMarkdownSelection {
  return { start: offset, end: offset }
}
