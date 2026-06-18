import type { TiptapJsonNode } from '../workspace/mobileDocumentContent'
import type { MobileNote } from '../workspace/mobileWorkspaceModel'

type MarkdownContent = string
type MutationLogText = string
type MutationLine = string
type NoteId = string
type FrontmatterKey = string
type FrontmatterValue = string
type ProofFailureId = string
type ProofFailureMessage = string

export type NativeWysiwygMutationProof = {
  codeBlockSaved: boolean
  contentLength: number
  dividerSaved: boolean
  favoritePreserved: boolean
  frontmatterPreserved: boolean
  inlineMarksSaved: boolean
  listBlocksSaved: boolean
  mutationTextSaved: boolean
  noteId: NoteId
  quoteSaved: boolean
  statusPreserved: boolean
  tagsPreserved: boolean
  tableLinesPreserved: boolean
  titleSaved: boolean
  typePreserved: boolean
  wikilinkSaved: boolean
}

export type NativeWysiwygMutationAssertionFailure = {
  id: string
  message: string
}

type NativeWysiwygMutationProofInput = {
  content: MarkdownContent
  noteId: NoteId
}

type NativeWysiwygMutationSeedNote = Pick<MobileNote, 'favorite' | 'snippet' | 'status' | 'tags' | 'title' | 'type'>
type NativeWysiwygMutationBooleanField = Exclude<keyof NativeWysiwygMutationProof, 'contentLength' | 'noteId'>

const mutationLogPrefix = 'TOLARIA_MOBILE_WYSIWYG_MUTATION_PROBE'
const mutationTitle = 'Native WYSIWYG Mutation Probe'
const mutationText = 'Native bridge mutation saved through TenTap.'
const mutationInlineSamples = ['**bold**', '*italic*', '~~strike~~', '`code`', '==highlight=='] as const
const mutationListSamples = ['- Bullet item', '1. Ordered item', '- [x] Task item'] as const
const mutationQuote = '> Quoted desktop parity'
const mutationCodeFenceLines = ['```ts', 'const parity = "desktop";', 'ship(parity)', '```'] as const
const mutationCodeFence = mutationCodeFenceLines.join('\n')
const mutationTableLines = ['| Surface | Target |', '| --- | --- |', '| Editor | Native WYSIWYG |'] as const
const mutationDividerBeforeTable = `\n---\n\n${mutationTableLines[0]}`
const mutationWikilink = '[[AI Ops Guide]]'
const mutationProofBooleanFields: readonly NativeWysiwygMutationBooleanField[] = [
  'codeBlockSaved',
  'dividerSaved',
  'favoritePreserved',
  'frontmatterPreserved',
  'inlineMarksSaved',
  'listBlocksSaved',
  'mutationTextSaved',
  'quoteSaved',
  'statusPreserved',
  'tagsPreserved',
  'tableLinesPreserved',
  'titleSaved',
  'typePreserved',
  'wikilinkSaved',
]
const mutationRichInlineParagraphNode: TiptapJsonNode = {
  content: [
    { text: 'Formatting: ', type: 'text' },
    { marks: [{ type: 'bold' }], text: 'bold', type: 'text' },
    { text: ', ', type: 'text' },
    { marks: [{ type: 'italic' }], text: 'italic', type: 'text' },
    { text: ', ', type: 'text' },
    { marks: [{ type: 'strike' }], text: 'strike', type: 'text' },
    { text: ', ', type: 'text' },
    { marks: [{ type: 'code' }], text: 'code', type: 'text' },
    { text: ', ', type: 'text' },
    { marks: [{ type: 'highlight' }], text: 'highlight', type: 'text' },
    { text: ', ', type: 'text' },
    {
      marks: [{ attrs: { href: 'tolaria://wikilink/AI%20Ops%20Guide' }, type: 'link' }],
      text: 'AI Ops Guide',
      type: 'text',
    },
    { text: '.', type: 'text' },
  ],
  type: 'paragraph',
}
const mutationBulletListNode: TiptapJsonNode = {
  content: [{ content: [paragraphNode('Bullet item')], type: 'listItem' }],
  type: 'bulletList',
}
const mutationOrderedListNode: TiptapJsonNode = {
  attrs: { start: 1 },
  content: [{ content: [paragraphNode('Ordered item')], type: 'listItem' }],
  type: 'orderedList',
}
const mutationTaskListNode: TiptapJsonNode = {
  content: [{ attrs: { checked: true }, content: [paragraphNode('Task item')], type: 'taskItem' }],
  type: 'taskList',
}
const mutationQuoteNode: TiptapJsonNode = {
  content: [paragraphNode('Quoted desktop parity')],
  type: 'blockquote',
}

export function nativeWysiwygMutationProbeContent(): TiptapJsonNode {
  return {
    content: [
      headingNode(mutationTitle),
      paragraphNode(mutationText),
      mutationRichInlineParagraphNode,
      mutationBulletListNode,
      mutationOrderedListNode,
      mutationTaskListNode,
      mutationQuoteNode,
      paragraphNode(...mutationCodeFenceLines),
      paragraphNode('---'),
      paragraphNode(...mutationTableLines),
    ],
    type: 'doc',
  }
}

export function nativeWysiwygMutationProbeInitialContent(note: NativeWysiwygMutationSeedNote): MarkdownContent {
  const frontmatter = mutationProbeFrontmatter(note)
  const body = mutationProbeInitialBody(note)

  return `---\n${frontmatter.join('\n')}\n---\n${body}`
}

export function nativeWysiwygMutationProof({
  content,
  noteId,
}: NativeWysiwygMutationProofInput): NativeWysiwygMutationProof {
  return {
    codeBlockSaved: content.includes(mutationCodeFence),
    contentLength: content.length,
    dividerSaved: content.includes(mutationDividerBeforeTable),
    favoritePreserved: content.includes('\n_favorite: true\n'),
    frontmatterPreserved: content.startsWith('---\n'),
    inlineMarksSaved: mutationInlineSamples.every((sample) => content.includes(sample)),
    listBlocksSaved: mutationListSamples.every((sample) => content.includes(sample)),
    mutationTextSaved: content.includes(mutationText),
    noteId,
    quoteSaved: content.includes(mutationQuote),
    statusPreserved: content.includes('\nStatus: Draft\n'),
    tagsPreserved: content.includes('\ntags:\n  - Design\n  - AI\n'),
    tableLinesPreserved: mutationTableLines.every((line) => content.includes(line)),
    titleSaved: content.includes(`# ${mutationTitle}\n`),
    typePreserved: content.includes('\ntype: Essay\n'),
    wikilinkSaved: content.includes(mutationWikilink),
  }
}

export function nativeWysiwygMutationLogLine(proof: NativeWysiwygMutationProof): MutationLine {
  return `${mutationLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeWysiwygMutationProofs(logText: MutationLogText): NativeWysiwygMutationProof[] {
  return logText
    .split('\n')
    .map(parseMutationProofLine)
    .filter((proof): proof is NativeWysiwygMutationProof => proof !== null)
}

export function nativeWysiwygMutationPreProofLogText(logText: MutationLogText): MutationLogText {
  const proofIndex = logText.lastIndexOf(mutationLogPrefix)
  return proofIndex === -1 ? logText : logText.slice(0, proofIndex)
}

export function assertNativeWysiwygMutationProofs(
  proofs: NativeWysiwygMutationProof[],
): NativeWysiwygMutationAssertionFailure[] {
  const latest = proofs.at(-1)
  if (!latest) {
    return [{ id: 'editor.wysiwyg.mutation', message: 'Native WYSIWYG mutation proof was not logged' }]
  }

  return [
    proofFailure(latest.frontmatterPreserved, 'editor.wysiwyg.mutation.frontmatter', 'Frontmatter boundary survives native WYSIWYG saves'),
    proofFailure(latest.typePreserved, 'editor.wysiwyg.mutation.type', 'Desktop type frontmatter survives native WYSIWYG saves'),
    proofFailure(latest.statusPreserved, 'editor.wysiwyg.mutation.status', 'Desktop status frontmatter survives native WYSIWYG saves'),
    proofFailure(latest.tagsPreserved, 'editor.wysiwyg.mutation.tags', 'Desktop tag frontmatter survives native WYSIWYG saves'),
    proofFailure(latest.favoritePreserved, 'editor.wysiwyg.mutation.favorite', 'Desktop boolean frontmatter survives native WYSIWYG saves'),
    proofFailure(latest.titleSaved, 'editor.wysiwyg.mutation.title', 'Optional H1 title is saved as document content'),
    proofFailure(latest.mutationTextSaved, 'editor.wysiwyg.mutation.body', 'TenTap body mutation reaches the markdown save pipeline'),
    proofFailure(latest.inlineMarksSaved, 'editor.wysiwyg.mutation.inline', 'Native WYSIWYG inline marks serialize to desktop markdown syntax'),
    proofFailure(latest.wikilinkSaved, 'editor.wysiwyg.mutation.wikilink', 'Native WYSIWYG links can preserve Tolaria wikilink markdown'),
    proofFailure(latest.listBlocksSaved, 'editor.wysiwyg.mutation.lists', 'Native WYSIWYG list blocks serialize to desktop markdown syntax'),
    proofFailure(latest.quoteSaved, 'editor.wysiwyg.mutation.quote', 'Native WYSIWYG quote blocks serialize to desktop markdown syntax'),
    proofFailure(latest.codeBlockSaved, 'editor.wysiwyg.mutation.codeBlock', 'Unsupported code-fence content remains editable desktop markdown lines'),
    proofFailure(latest.dividerSaved, 'editor.wysiwyg.mutation.divider', 'Unsupported divider content remains editable desktop markdown'),
    proofFailure(latest.tableLinesPreserved, 'editor.wysiwyg.mutation.table', 'Unsupported table content remains editable markdown lines'),
  ].filter((failure): failure is NativeWysiwygMutationAssertionFailure => failure !== null)
}

export function formatNativeWysiwygMutationFailures(
  failures: NativeWysiwygMutationAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

export function nativeWysiwygMutationProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('wysiwygMutationProbe') === '1'
}

function headingNode(text: FrontmatterValue): TiptapJsonNode {
  return {
    attrs: { level: 1 },
    content: [{ text, type: 'text' }],
    type: 'heading',
  }
}

function paragraphNode(...lines: readonly FrontmatterValue[]): TiptapJsonNode {
  return {
    content: lines.flatMap((line, index): TiptapJsonNode[] => [
      ...(index > 0 ? [{ type: 'hardBreak' }] : []),
      { text: line, type: 'text' },
    ]),
    type: 'paragraph',
  }
}

function mutationProbeFrontmatter(note: NativeWysiwygMutationSeedNote): FrontmatterValue[] {
  return [
    scalarFrontmatterLine('type', note.type),
    scalarFrontmatterLine('Status', note.status),
    listFrontmatterLines('tags', note.tags),
    booleanFrontmatterLine('_favorite', note.favorite),
  ].flat().filter((line): line is string => line !== null)
}

function mutationProbeInitialBody(note: NativeWysiwygMutationSeedNote): MarkdownContent {
  const body = [optionalHeading(note.title), note.snippet.trim()].filter(Boolean).join('\n\n')
  return body ? `${body}\n` : ''
}

function optionalHeading(title: FrontmatterValue): string | null {
  const text = title.trim()
  return text ? `# ${text.replace(/\r?\n/gu, ' ')}` : null
}

function scalarFrontmatterLine(key: FrontmatterKey, value: FrontmatterValue): string | null {
  const text = value.trim()
  return text ? `${key}: ${text}` : null
}

function listFrontmatterLines(key: FrontmatterKey, values: readonly FrontmatterValue[]): string[] | null {
  const items = values.map((value) => value.trim()).filter(Boolean)
  if (items.length === 0) return null

  return [`${key}:`, ...items.map((item) => `  - ${item}`)]
}

function booleanFrontmatterLine(key: FrontmatterKey, value: boolean): string | null {
  return value ? `${key}: true` : null
}

function parseMutationProofLine(line: MutationLine): NativeWysiwygMutationProof | null {
  const prefixIndex = line.indexOf(mutationLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + mutationLogPrefix.length).trim()
  try {
    const parsed: unknown = JSON.parse(rawJson)
    return isNativeWysiwygMutationProof(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isNativeWysiwygMutationProof(value: unknown): value is NativeWysiwygMutationProof {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<NativeWysiwygMutationProof>
  return typeof candidate.noteId === 'string'
    && typeof candidate.contentLength === 'number'
    && mutationProofBooleanFields.every((field) => typeof candidate[field] === 'boolean')
}

function proofFailure(
  passed: boolean,
  id: ProofFailureId,
  message: ProofFailureMessage,
): NativeWysiwygMutationAssertionFailure | null {
  return passed ? null : { id, message }
}
