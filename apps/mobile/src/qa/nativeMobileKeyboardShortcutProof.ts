import { nativeMobileKeyCommandsAvailable } from '../native/mobileNativeKeyCommands'
import type { MobileWorkspaceKeyboardAction } from '../workspace/mobileWorkspaceKeyboardShortcuts'

type KeyboardShortcutProofLogText = string
type KeyboardShortcutProofLine = string
type KeyboardShortcutEventSource = 'dom' | 'native'

export type NativeMobileKeyboardShortcutBridgeProof = {
  kind: 'bridge'
  nativeModuleAvailable: boolean
}

export type NativeMobileKeyboardShortcutActionProof = {
  action: MobileWorkspaceKeyboardAction
  code: string | null
  kind: 'action'
  key: string
  metaKey: boolean
  source: KeyboardShortcutEventSource
}

export type NativeMobileKeyboardShortcutProof =
  | NativeMobileKeyboardShortcutActionProof
  | NativeMobileKeyboardShortcutBridgeProof

export type NativeMobileKeyboardShortcutAssertionFailure = {
  id: string
  message: string
}

export const nativeMobileKeyboardShortcutLogPrefix = 'TOLARIA_MOBILE_KEYBOARD_SHORTCUT_PROBE'

export function nativeMobileKeyboardShortcutProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('mobileKeyboardShortcutProbe') === '1'
}

export function nativeMobileKeyboardShortcutBridgeProof(): NativeMobileKeyboardShortcutBridgeProof {
  return {
    kind: 'bridge',
    nativeModuleAvailable: nativeMobileKeyCommandsAvailable(),
  }
}

export function nativeMobileKeyboardShortcutActionProof(
  action: MobileWorkspaceKeyboardAction,
  event: {
    code?: string
    key: string
    metaKey: boolean
    source?: 'native'
  },
): NativeMobileKeyboardShortcutActionProof {
  return {
    action,
    code: event.code ?? null,
    kind: 'action',
    key: event.key,
    metaKey: event.metaKey,
    source: event.source ?? 'dom',
  }
}

export function nativeMobileKeyboardShortcutLogLine(
  proof: NativeMobileKeyboardShortcutProof,
): KeyboardShortcutProofLine {
  return `${nativeMobileKeyboardShortcutLogPrefix} ${JSON.stringify(proof)}`
}

export function logNativeMobileKeyboardShortcutBridgeProof() {
  console.info(nativeMobileKeyboardShortcutLogLine(nativeMobileKeyboardShortcutBridgeProof()))
}

export function logNativeMobileKeyboardShortcutActionProof(
  action: MobileWorkspaceKeyboardAction,
  event: {
    code?: string
    key: string
    metaKey: boolean
    source?: 'native'
  },
) {
  console.info(nativeMobileKeyboardShortcutLogLine(nativeMobileKeyboardShortcutActionProof(action, event)))
}

export function parseNativeMobileKeyboardShortcutProofs(
  logText: KeyboardShortcutProofLogText,
): NativeMobileKeyboardShortcutProof[] {
  return logText
    .split('\n')
    .map(parseProofLine)
    .filter((proof): proof is NativeMobileKeyboardShortcutProof => proof !== null)
}

export function assertNativeMobileKeyboardShortcutProofs(
  proofs: NativeMobileKeyboardShortcutProof[],
): NativeMobileKeyboardShortcutAssertionFailure[] {
  const bridge = latestBridgeProof(proofs)
  const actions = actionProofs(proofs)

  return [
    proofFailure(Boolean(bridge), 'mobile.keyboard.bridge.logged', 'Native keyboard shortcut bridge proof was not logged'),
    proofFailure(bridge?.nativeModuleAvailable === true, 'mobile.keyboard.bridge.native', 'Native iOS key-command module is available in the running app'),
    proofFailure(hasNativeAction(actions, 'commandPalette'), 'mobile.keyboard.commandPalette', 'Cmd+K reaches the command-palette action through the native shortcut bridge'),
    proofFailure(hasNativeAction(actions, 'findInNote'), 'mobile.keyboard.findInNote', 'Cmd+F reaches the find-in-note action through the native shortcut bridge'),
    proofFailure(hasNativeSearchAction(actions, 'o'), 'mobile.keyboard.search.o', 'Cmd+O reaches all-notes search through the native shortcut bridge'),
    proofFailure(hasNativeSearchAction(actions, 'p'), 'mobile.keyboard.search.p', 'Cmd+P reaches all-notes search through the native shortcut bridge'),
    proofFailure(hasNativeAction(actions, 'toggleRawEditor'), 'mobile.keyboard.rawEditor', 'Cmd+Backslash reaches the raw-editor toggle through the native shortcut bridge'),
    proofFailure(hasNativeAction(actions, 'createNote'), 'mobile.keyboard.createNote', 'Cmd+N reaches direct note creation through the native shortcut bridge'),
    proofFailure(hasNativeAction(actions, 'previousNote'), 'mobile.keyboard.previousNote', 'ArrowUp reaches previous-note navigation through the native shortcut bridge'),
    proofFailure(hasNativeAction(actions, 'nextNote'), 'mobile.keyboard.nextNote', 'ArrowDown reaches next-note navigation through the native shortcut bridge'),
  ].filter((failure): failure is NativeMobileKeyboardShortcutAssertionFailure => failure !== null)
}

export function formatNativeMobileKeyboardShortcutFailures(
  failures: NativeMobileKeyboardShortcutAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

function parseProofLine(line: KeyboardShortcutProofLine): NativeMobileKeyboardShortcutProof | null {
  const prefixIndex = line.indexOf(nativeMobileKeyboardShortcutLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + nativeMobileKeyboardShortcutLogPrefix.length).trim()
  try {
    return parsedProof(JSON.parse(rawJson))
  } catch {
    return null
  }
}

function parsedProof(value: unknown): NativeMobileKeyboardShortcutProof | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>

  if (candidate.kind === 'bridge' && typeof candidate.nativeModuleAvailable === 'boolean') {
    return {
      kind: 'bridge',
      nativeModuleAvailable: candidate.nativeModuleAvailable,
    }
  }

  if (
    candidate.kind === 'action'
    && isMobileWorkspaceKeyboardAction(candidate.action)
    && (typeof candidate.code === 'string' || candidate.code === null)
    && typeof candidate.key === 'string'
    && typeof candidate.metaKey === 'boolean'
    && (candidate.source === 'dom' || candidate.source === 'native')
  ) {
    return {
      action: candidate.action,
      code: candidate.code,
      kind: 'action',
      key: candidate.key,
      metaKey: candidate.metaKey,
      source: candidate.source,
    }
  }

  return null
}

function latestBridgeProof(proofs: NativeMobileKeyboardShortcutProof[]) {
  return proofs.filter((proof): proof is NativeMobileKeyboardShortcutBridgeProof => proof.kind === 'bridge').at(-1)
}

function actionProofs(proofs: NativeMobileKeyboardShortcutProof[]) {
  return proofs.filter((proof): proof is NativeMobileKeyboardShortcutActionProof => proof.kind === 'action')
}

function hasNativeAction(actions: NativeMobileKeyboardShortcutActionProof[], action: MobileWorkspaceKeyboardAction) {
  return actions.some((proof) => proof.source === 'native' && proof.action === action)
}

function hasNativeSearchAction(actions: NativeMobileKeyboardShortcutActionProof[], key: 'o' | 'p') {
  return actions.some((proof) => (
    proof.source === 'native'
    && proof.action === 'search'
    && proof.metaKey
    && proof.key.toLowerCase() === key
  ))
}

function isMobileWorkspaceKeyboardAction(value: unknown): value is MobileWorkspaceKeyboardAction {
  return value === 'commandPalette'
    || value === 'createNote'
    || value === 'findInNote'
    || value === 'nextNote'
    || value === 'previousNote'
    || value === 'search'
    || value === 'toggleRawEditor'
}

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeMobileKeyboardShortcutAssertionFailure | null {
  return passed ? null : { id, message }
}
