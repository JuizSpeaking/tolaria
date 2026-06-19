export type MobileMarkdownSourceBlockAction =
  | 'codeBlock'
  | 'divider'
  | 'mathBlock'
  | 'mermaid'
  | 'table'
  | 'whiteboard'

export type MobileMarkdownSourceBlockFormat = {
  closing: string
  fallback: string
  opening: string
  replaceSelectedText: boolean
  selectFallback: boolean
}

const defaultMathBlockLatex = '\\sqrt{a^2 + b^2}'

const defaultMermaidDiagram = [
  'flowchart TD',
  '    edit["Switch to the raw editor to edit"]',
].join('\n')

const markdownTableSnippet = [
  '| Column | Value |',
  '| --- | --- |',
  '| Item | Detail |',
].join('\n')

const defaultTldrawHeight = '520'
const defaultTldrawSnapshot = '{}'

export const mobileMarkdownSourceBlockActions = [
  'divider',
  'codeBlock',
  'mathBlock',
  'mermaid',
  'table',
  'whiteboard',
] as const satisfies readonly MobileMarkdownSourceBlockAction[]

const mobileMarkdownSourceBlockFormats: Record<MobileMarkdownSourceBlockAction, MobileMarkdownSourceBlockFormat> = {
  codeBlock: { closing: '\n```', fallback: 'code', opening: '```text\n', replaceSelectedText: true, selectFallback: true },
  divider: { closing: '', fallback: '---', opening: '', replaceSelectedText: true, selectFallback: false },
  mathBlock: { closing: '\n$$', fallback: defaultMathBlockLatex, opening: '$$\n', replaceSelectedText: true, selectFallback: true },
  mermaid: { closing: '\n```', fallback: defaultMermaidDiagram, opening: '```mermaid\n', replaceSelectedText: true, selectFallback: true },
  table: { closing: '', fallback: markdownTableSnippet, opening: '', replaceSelectedText: true, selectFallback: false },
  whiteboard: { closing: '\n```', fallback: defaultTldrawSnapshot, opening: '', replaceSelectedText: false, selectFallback: false },
}

export function mobileMarkdownSourceBlockFormat(
  action: string,
): MobileMarkdownSourceBlockFormat | null {
  if (!isMobileMarkdownSourceBlockAction(action)) return null
  if (action === 'whiteboard') return mobileWhiteboardSourceBlockFormat()
  return mobileMarkdownSourceBlockFormats[action]
}

export function mobileMarkdownSourceBlockText(
  action: MobileMarkdownSourceBlockAction,
): string {
  const format = mobileMarkdownSourceBlockFormat(action) ?? mobileMarkdownSourceBlockFormats[action]
  return `${format.opening}${format.fallback}${format.closing}`
}

export function mobileMarkdownSourceBlockLines(
  action: MobileMarkdownSourceBlockAction,
): string[] {
  return mobileMarkdownSourceBlockText(action).split('\n')
}

function isMobileMarkdownSourceBlockAction(
  action: string,
): action is MobileMarkdownSourceBlockAction {
  return mobileMarkdownSourceBlockActions.some((candidate) => candidate === action)
}

function mobileWhiteboardSourceBlockFormat(): MobileMarkdownSourceBlockFormat {
  return {
    ...mobileMarkdownSourceBlockFormats.whiteboard,
    opening: `\`\`\`tldraw id="${createMobileWhiteboardBoardId()}" height="${defaultTldrawHeight}"\n`,
  }
}

function createMobileWhiteboardBoardId(): string {
  const randomUUID = globalThis.crypto?.randomUUID
  return typeof randomUUID === 'function'
    ? randomUUID.call(globalThis.crypto)
    : `whiteboard-${Date.now().toString(36)}`
}
