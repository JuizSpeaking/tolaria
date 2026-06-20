import type { MobileMarkdownFormatAction } from '../workspace/mobileMarkdownFormatting'

type ProbeLogText = string
type ProbeLine = string

export type NativeWysiwygFormatCommandProof = {
  action: MobileMarkdownFormatAction
  args: readonly (number | string)[]
  forwarded: boolean
  method: string
}

export type NativeWysiwygFormatCommandAssertionFailure = {
  id: string
  message: string
}

type NativeWysiwygFormatCommandProbeSpec = {
  action: MobileMarkdownFormatAction
  args: readonly (number | string)[]
  method: string
}

export const nativeWysiwygFormatCommandLogPrefix = 'TOLARIA_MOBILE_WYSIWYG_FORMAT_COMMAND_PROBE'
export const nativeWysiwygFormatCommandHighlightColor = 'rgba(214, 158, 46, 0.1)'

export const nativeWysiwygFormatCommandProbeActions = [
  'bold',
  'italic',
  'strike',
  'code',
  'highlight',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'bulletList',
  'orderedList',
  'taskList',
  'quote',
  'tableAddColumnAfter',
  'tableAddRowAfter',
  'tableDeleteColumn',
  'tableDeleteRow',
] as const satisfies readonly MobileMarkdownFormatAction[]

const nativeWysiwygFormatCommandProbeSpecs = [
  { action: 'bold', args: [], method: 'toggleBold' },
  { action: 'italic', args: [], method: 'toggleItalic' },
  { action: 'strike', args: [], method: 'toggleStrike' },
  { action: 'code', args: [], method: 'toggleCode' },
  { action: 'highlight', args: [nativeWysiwygFormatCommandHighlightColor], method: 'toggleHighlight' },
  { action: 'heading1', args: [1], method: 'toggleHeading' },
  { action: 'heading2', args: [2], method: 'toggleHeading' },
  { action: 'heading3', args: [3], method: 'toggleHeading' },
  { action: 'heading4', args: [4], method: 'toggleHeading' },
  { action: 'heading5', args: [5], method: 'toggleHeading' },
  { action: 'heading6', args: [6], method: 'toggleHeading' },
  { action: 'bulletList', args: [], method: 'toggleBulletList' },
  { action: 'orderedList', args: [], method: 'toggleOrderedList' },
  { action: 'taskList', args: [], method: 'toggleTaskList' },
  { action: 'quote', args: [], method: 'toggleBlockquote' },
  { action: 'tableAddColumnAfter', args: [], method: 'addColumnAfter' },
  { action: 'tableAddRowAfter', args: [], method: 'addRowAfter' },
  { action: 'tableDeleteColumn', args: [], method: 'deleteColumn' },
  { action: 'tableDeleteRow', args: [], method: 'deleteRow' },
] as const satisfies readonly NativeWysiwygFormatCommandProbeSpec[]

export function nativeWysiwygFormatCommandProof({
  action,
  editor,
}: {
  action: MobileMarkdownFormatAction
  editor: unknown
}): NativeWysiwygFormatCommandProof {
  const spec = nativeWysiwygFormatCommandSpec(action)

  return {
    action,
    args: spec.args,
    forwarded: typeof (editor as Record<string, unknown> | null)?.[spec.method] === 'function',
    method: spec.method,
  }
}

export function nativeWysiwygFormatCommandLogLine(
  proof: NativeWysiwygFormatCommandProof,
): ProbeLine {
  return `${nativeWysiwygFormatCommandLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeWysiwygFormatCommandProofs(
  logText: ProbeLogText,
): NativeWysiwygFormatCommandProof[] {
  return logText
    .split('\n')
    .map(parseProofLine)
    .filter((proof): proof is NativeWysiwygFormatCommandProof => proof !== null)
}

export function assertNativeWysiwygFormatCommandProofs(
  proofs: NativeWysiwygFormatCommandProof[],
): NativeWysiwygFormatCommandAssertionFailure[] {
  if (proofs.length === 0) {
    return [{ id: 'editor.wysiwyg.formatCommands', message: 'Native WYSIWYG format command proof was not logged' }]
  }

  return nativeWysiwygFormatCommandProbeSpecs
    .map((spec) => proofFailure(
      hasFormatCommandProof(proofs, spec),
      `editor.wysiwyg.formatCommands.${spec.action}`,
      `Native WYSIWYG forwards ${spec.action} to TenTap ${spec.method}`,
    ))
    .filter((failure): failure is NativeWysiwygFormatCommandAssertionFailure => failure !== null)
}

export function formatNativeWysiwygFormatCommandFailures(
  failures: NativeWysiwygFormatCommandAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

export function nativeWysiwygFormatCommandProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('wysiwygFormatCommandProbe') === '1'
}

function nativeWysiwygFormatCommandSpec(
  action: MobileMarkdownFormatAction,
): NativeWysiwygFormatCommandProbeSpec {
  return nativeWysiwygFormatCommandProbeSpecs.find((spec) => spec.action === action) ?? {
    action,
    args: [],
    method: '',
  }
}

function parseProofLine(line: ProbeLine): NativeWysiwygFormatCommandProof | null {
  const prefixIndex = line.indexOf(nativeWysiwygFormatCommandLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + nativeWysiwygFormatCommandLogPrefix.length).trim()
  try {
    return parsedProof(JSON.parse(rawJson))
  } catch {
    return null
  }
}

function parsedProof(value: unknown): NativeWysiwygFormatCommandProof | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<NativeWysiwygFormatCommandProof>
  if (!isFormatProbeAction(candidate.action)) return null
  if (!Array.isArray(candidate.args)) return null
  if (typeof candidate.forwarded !== 'boolean') return null
  if (typeof candidate.method !== 'string') return null

  return {
    action: candidate.action,
    args: candidate.args.filter(isFormatProbeArg),
    forwarded: candidate.forwarded,
    method: candidate.method,
  }
}

function hasFormatCommandProof(
  proofs: NativeWysiwygFormatCommandProof[],
  expected: NativeWysiwygFormatCommandProbeSpec,
): boolean {
  return proofs.some((proof) => (
    proof.action === expected.action
    && proof.forwarded
    && proof.method === expected.method
    && sameArgs(proof.args, expected.args)
  ))
}

function sameArgs(actual: readonly (number | string)[], expected: readonly (number | string)[]): boolean {
  return actual.length === expected.length
    && actual.every((arg, index) => arg === expected[index])
}

function isFormatProbeAction(value: unknown): value is MobileMarkdownFormatAction {
  return typeof value === 'string'
    && (nativeWysiwygFormatCommandProbeActions as readonly string[]).includes(value)
}

function isFormatProbeArg(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string'
}

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeWysiwygFormatCommandAssertionFailure | null {
  return passed ? null : { id, message }
}
