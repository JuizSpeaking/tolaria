type MarkdownContent = string
type NoteId = string
type ProbeLine = string
type ProbeLogText = string
type TiptapJsonNode = {
  attrs?: Record<string, unknown>
  content?: TiptapJsonNode[]
  text?: string
  type?: string
}

export type NativeWysiwygMathEditProof = {
  blockMathRendered: boolean
  blockMathUpdated: boolean
  contentLength: number
  inlineMathNodeRemoved: boolean
  inlineSourceReopened: boolean
  noteId: NoteId
}

export type NativeWysiwygMathEditAssertionFailure = {
  id: string
  message: string
}

type NativeWysiwygMathEditProofInput = {
  blockMathRendered?: boolean
  content: MarkdownContent
  json: unknown
  noteId: NoteId
}
type ProofFieldName = keyof NativeWysiwygMathEditProof
type ProofFieldType = 'boolean' | 'number' | 'string'
type ProofFieldMap = {
  [Field in ProofFieldName]: NativeWysiwygMathEditProof[Field]
}

export const nativeWysiwygMathEditLogPrefix = 'TOLARIA_MOBILE_WYSIWYG_MATH_EDIT_PROBE'
export const nativeWysiwygMathEditInlineLatex = 'x^2'
export const nativeWysiwygMathEditBlockLatex = 'y = mx + b'

const expectedInlineMathSource = `Inline $${nativeWysiwygMathEditInlineLatex}$ source`
const expectedBlockMath = `$$\n${nativeWysiwygMathEditBlockLatex}\n$$`

const proofFieldTypes = {
  blockMathRendered: 'boolean',
  blockMathUpdated: 'boolean',
  contentLength: 'number',
  inlineMathNodeRemoved: 'boolean',
  inlineSourceReopened: 'boolean',
  noteId: 'string',
} as const satisfies Record<ProofFieldName, ProofFieldType>

const proofFields = Object.keys(proofFieldTypes) as ProofFieldName[]

export function nativeWysiwygMathEditProbeContent(): TiptapJsonNode {
  return {
    content: [
      {
        content: [
          { text: 'Inline ', type: 'text' },
          { attrs: { latex: nativeWysiwygMathEditInlineLatex }, type: 'mathInline' },
          { text: ' source', type: 'text' },
        ],
        type: 'paragraph',
      },
      {
        attrs: { latex: 'E = mc^2' },
        type: 'mathBlock',
      },
    ],
    type: 'doc',
  }
}

export function nativeWysiwygMathEditInlineSelection(): { from: number; to: number } {
  return { from: 8, to: 9 }
}

export function nativeWysiwygMathEditBlockSelection(): { from: number; to: number } {
  return { from: 17, to: 18 }
}

export function nativeWysiwygMathEditProof({
  blockMathRendered = false,
  content,
  json,
  noteId,
}: NativeWysiwygMathEditProofInput): NativeWysiwygMathEditProof {
  const normalizedContent = normalizedMarkdown(content)

  return {
    blockMathRendered,
    blockMathUpdated: normalizedContent.includes(expectedBlockMath),
    contentLength: content.length,
    inlineMathNodeRemoved: !containsNodeType(json, 'mathInline'),
    inlineSourceReopened: normalizedContent.includes(expectedInlineMathSource)
      && containsText(json, `$${nativeWysiwygMathEditInlineLatex}$`),
    noteId,
  }
}

export function nativeWysiwygMathEditLogLine(proof: NativeWysiwygMathEditProof): ProbeLine {
  return `${nativeWysiwygMathEditLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeWysiwygMathEditProofs(logText: ProbeLogText): NativeWysiwygMathEditProof[] {
  return logText
    .split('\n')
    .map(parseProofLine)
    .filter((proof): proof is NativeWysiwygMathEditProof => proof !== null)
}

export function assertNativeWysiwygMathEditProofs(
  proofs: NativeWysiwygMathEditProof[],
): NativeWysiwygMathEditAssertionFailure[] {
  const latest = proofs.at(-1)
  if (!latest) {
    return [{ id: 'editor.wysiwyg.mathEdit', message: 'Native WYSIWYG math edit proof was not logged' }]
  }

  return [
    proofFailure(
      latest.inlineSourceReopened,
      'editor.wysiwyg.mathEdit.inlineSource',
      'Native WYSIWYG reopens rendered inline math as editable desktop Markdown source',
    ),
    proofFailure(
      latest.inlineMathNodeRemoved,
      'editor.wysiwyg.mathEdit.inlineNodeRemoved',
      'Native WYSIWYG removes the inline math atom after reopening source',
    ),
    proofFailure(
      latest.blockMathUpdated,
      'editor.wysiwyg.mathEdit.blockMath',
      'Native WYSIWYG updates display math in the existing math block',
    ),
    proofFailure(
      latest.blockMathRendered,
      'editor.wysiwyg.mathEdit.blockRendered',
      'Native WYSIWYG display math still renders as MathML after editing',
    ),
  ].filter((failure): failure is NativeWysiwygMathEditAssertionFailure => failure !== null)
}

export function formatNativeWysiwygMathEditFailures(
  failures: NativeWysiwygMathEditAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

export function nativeWysiwygMathEditProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('wysiwygMathEditProbe') === '1'
}

function parseProofLine(line: ProbeLine): NativeWysiwygMathEditProof | null {
  const prefixIndex = line.indexOf(nativeWysiwygMathEditLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + nativeWysiwygMathEditLogPrefix.length).trim()
  try {
    return parsedProof(JSON.parse(rawJson))
  } catch {
    return null
  }
}

function parsedProof(value: unknown): NativeWysiwygMathEditProof | null {
  if (!isRecord(value)) return null
  if (!isNativeWysiwygMathEditProof(value)) return null

  return {
    blockMathRendered: value.blockMathRendered,
    blockMathUpdated: value.blockMathUpdated,
    contentLength: value.contentLength,
    inlineMathNodeRemoved: value.inlineMathNodeRemoved,
    inlineSourceReopened: value.inlineSourceReopened,
    noteId: value.noteId,
  }
}

function isNativeWysiwygMathEditProof(value: Record<string, unknown>): value is ProofFieldMap {
  return proofFields.every((field) => typeof value[field] === proofFieldTypes[field])
}

function containsNodeType(value: unknown, type: string): boolean {
  if (!isRecord(value)) return false
  if (value.type === type) return true

  return Array.isArray(value.content)
    && value.content.some((child) => containsNodeType(child, type))
}

function containsText(value: unknown, text: string): boolean {
  if (!isRecord(value)) return false
  if (typeof value.text === 'string' && value.text.includes(text)) return true

  return Array.isArray(value.content)
    && value.content.some((child) => containsText(child, text))
}

function normalizedMarkdown(content: MarkdownContent): MarkdownContent {
  return content.replace(/\r\n/g, '\n').trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeWysiwygMathEditAssertionFailure | null {
  return passed ? null : { id, message }
}
