import type { NativeWysiwygMarkdownBlockPayload } from '../components/workspace/MobileWysiwygWikilinkBridgeModel'

type MarkdownContent = string
type NoteId = string
type ProbeLogText = string
type ProbeLine = string

export type NativeWysiwygMarkdownBlockProof = {
  codeBlockSaved: boolean
  contentLength: number
  dividerSaved: boolean
  mathBlockSaved: boolean
  mermaidSaved: boolean
  noteId: NoteId
  tableSaved: boolean
  whiteboardSaved: boolean
}

export type NativeWysiwygMarkdownBlockAssertionFailure = {
  id: string
  message: string
}

export const nativeWysiwygMarkdownBlockLogPrefix = 'TOLARIA_MOBILE_WYSIWYG_MARKDOWN_BLOCK_PROBE'

type ProofFieldName = keyof NativeWysiwygMarkdownBlockProof
type ProofFieldType = 'boolean' | 'number' | 'string'
type ProofFieldMap = {
  [Field in ProofFieldName]: NativeWysiwygMarkdownBlockProof[Field]
}

const expectedDivider = '---'
const expectedCodeBlock = '```text\ncode\n```'
const expectedMathBlock = '$$\n\\sqrt{a^2 + b^2}\n$$'
const expectedMermaid = [
  '```mermaid',
  'flowchart TD',
  '    edit["Switch to the raw editor to edit"]',
  '```',
].join('\n')
const expectedTable = [
  '| Column | Value |',
  '| --- | --- |',
  '| Item | Detail |',
].join('\n')
const expectedWhiteboardFence = /```tldraw id="[^"]+" height="520"\n\{\}\n```/u

const proofFieldTypes = {
  codeBlockSaved: 'boolean',
  contentLength: 'number',
  dividerSaved: 'boolean',
  mathBlockSaved: 'boolean',
  mermaidSaved: 'boolean',
  noteId: 'string',
  tableSaved: 'boolean',
  whiteboardSaved: 'boolean',
} as const satisfies Record<ProofFieldName, ProofFieldType>

const proofFields = Object.keys(proofFieldTypes) as ProofFieldName[]

export function nativeWysiwygMarkdownBlockProbePayloads(): NativeWysiwygMarkdownBlockPayload[] {
  return [
    { action: 'divider' },
    { action: 'codeBlock' },
    { action: 'mathBlock' },
    { action: 'mermaid' },
    { action: 'table' },
    { action: 'whiteboard' },
  ]
}

export function nativeWysiwygMarkdownBlockProof({
  content,
  noteId,
}: {
  content: MarkdownContent
  noteId: NoteId
}): NativeWysiwygMarkdownBlockProof {
  const normalizedContent = normalizedMarkdown(content)

  return {
    codeBlockSaved: normalizedContent.includes(expectedCodeBlock),
    contentLength: content.length,
    dividerSaved: markdownBlocks(normalizedContent).includes(expectedDivider),
    mathBlockSaved: normalizedContent.includes(expectedMathBlock),
    mermaidSaved: normalizedContent.includes(expectedMermaid),
    noteId,
    tableSaved: normalizedContent.includes(expectedTable),
    whiteboardSaved: expectedWhiteboardFence.test(normalizedContent),
  }
}

export function nativeWysiwygMarkdownBlockLogLine(
  proof: NativeWysiwygMarkdownBlockProof,
): ProbeLine {
  return `${nativeWysiwygMarkdownBlockLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeWysiwygMarkdownBlockProofs(
  logText: ProbeLogText,
): NativeWysiwygMarkdownBlockProof[] {
  return logText
    .split('\n')
    .map(parseProofLine)
    .filter((proof): proof is NativeWysiwygMarkdownBlockProof => proof !== null)
}

export function assertNativeWysiwygMarkdownBlockProofs(
  proofs: NativeWysiwygMarkdownBlockProof[],
): NativeWysiwygMarkdownBlockAssertionFailure[] {
  const latest = proofs.at(-1)
  if (!latest) {
    return [{
      id: 'editor.wysiwyg.markdownBlocks',
      message: 'Native WYSIWYG markdown block insertion proof was not logged',
    }]
  }

  return [
    proofFailure(
      latest.dividerSaved,
      'editor.wysiwyg.markdownBlocks.divider',
      'Native WYSIWYG divider insertion saves as desktop horizontal-rule markdown',
    ),
    proofFailure(
      latest.codeBlockSaved,
      'editor.wysiwyg.markdownBlocks.codeBlock',
      'Native WYSIWYG code-block insertion saves as desktop fenced-code markdown',
    ),
    proofFailure(
      latest.mathBlockSaved,
      'editor.wysiwyg.markdownBlocks.mathBlock',
      'Native WYSIWYG math insertion saves as desktop display-math markdown',
    ),
    proofFailure(
      latest.mermaidSaved,
      'editor.wysiwyg.markdownBlocks.mermaid',
      'Native WYSIWYG Mermaid insertion saves as desktop fenced-diagram markdown',
    ),
    proofFailure(
      latest.tableSaved,
      'editor.wysiwyg.markdownBlocks.table',
      'Native WYSIWYG table insertion saves as desktop markdown table source lines',
    ),
    proofFailure(
      latest.whiteboardSaved,
      'editor.wysiwyg.markdownBlocks.whiteboard',
      'Native WYSIWYG whiteboard insertion saves as desktop tldraw fenced markdown',
    ),
  ].filter((failure): failure is NativeWysiwygMarkdownBlockAssertionFailure => failure !== null)
}

export function formatNativeWysiwygMarkdownBlockFailures(
  failures: NativeWysiwygMarkdownBlockAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

export function nativeWysiwygMarkdownBlockProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('wysiwygMarkdownBlockProbe') === '1'
}

function parseProofLine(line: ProbeLine): NativeWysiwygMarkdownBlockProof | null {
  const prefixIndex = line.indexOf(nativeWysiwygMarkdownBlockLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + nativeWysiwygMarkdownBlockLogPrefix.length).trim()
  try {
    return parsedProof(JSON.parse(rawJson))
  } catch {
    return null
  }
}

function parsedProof(value: unknown): NativeWysiwygMarkdownBlockProof | null {
  if (!isRecord(value)) return null
  if (!isNativeWysiwygMarkdownBlockProof(value)) return null

  return {
    codeBlockSaved: value.codeBlockSaved,
    contentLength: value.contentLength,
    dividerSaved: value.dividerSaved,
    mathBlockSaved: value.mathBlockSaved,
    mermaidSaved: value.mermaidSaved,
    noteId: value.noteId,
    tableSaved: value.tableSaved,
    whiteboardSaved: value.whiteboardSaved,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function isNativeWysiwygMarkdownBlockProof(
  value: Record<string, unknown>,
): value is ProofFieldMap {
  return proofFields.every((field) => typeof value[field] === proofFieldTypes[field])
}

function normalizedMarkdown(content: MarkdownContent): MarkdownContent {
  return content.replace(/\r\n/g, '\n')
}

function markdownBlocks(content: MarkdownContent): string[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeWysiwygMarkdownBlockAssertionFailure | null {
  return passed ? null : { id, message }
}
