import { useEffect } from 'react'
import {
  optionalNativeMobileKeyCommandsModule,
  type NativeMobileKeyCommandEvent,
  type NativeMobileKeyCommandsModule,
} from '../native/mobileNativeKeyCommands'

type KeyboardShortcutHandlers = {
  nativeNoteNavigationEnabled?: boolean
  onCreateNote?: () => void
  onOpenFindInNote?: () => void
  onOpenCommandPalette: () => void
  onOpenSearch: () => void
  onSelectNextNote?: () => void
  onSelectPreviousNote?: () => void
  onToggleRawEditor?: () => void
}
type MobileWorkspaceKeyboardAction =
  | 'commandPalette'
  | 'createNote'
  | 'findInNote'
  | 'nextNote'
  | 'previousNote'
  | 'search'
  | 'toggleRawEditor'

type KeyboardDocument = {
  addEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void, options?: KeyboardListenerOptions) => void
  removeEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void, options?: KeyboardListenerOptions) => void
}
type KeyboardListenerOptions = { capture?: boolean } | boolean
type KeyboardTargetCandidate = Partial<KeyboardDocument> | null | undefined
type KeyboardShortcutSubscription = { remove: () => void }
type KeyboardTargetHost = {
  document?: (Partial<KeyboardDocument> & { body?: KeyboardTargetCandidate }) | null
  window?: KeyboardTargetCandidate
}
type MobileKeyboardShortcutEvent =
  Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'> &
  Partial<Pick<KeyboardEvent, 'code' | 'preventDefault' | 'target'>> & {
    source?: 'native'
  }

export function useMobileWorkspaceKeyboardShortcuts({
  nativeNoteNavigationEnabled = true,
  onCreateNote,
  onOpenFindInNote,
  onOpenCommandPalette,
  onOpenSearch,
  onSelectNextNote,
  onSelectPreviousNote,
  onToggleRawEditor,
}: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: MobileKeyboardShortcutEvent) => {
      const action = mobileWorkspaceKeyboardAction(event)
      if (!action) return
      if (!shouldHandleMobileWorkspaceKeyboardAction(action, event, { nativeNoteNavigationEnabled })) return

      event.preventDefault?.()
      if (action === 'commandPalette') onOpenCommandPalette()
      else if (action === 'findInNote') onOpenFindInNote?.()
      else if (action === 'nextNote') onSelectNextNote?.()
      else if (action === 'previousNote') onSelectPreviousNote?.()
      else if (action === 'search') onOpenSearch()
      else if (action === 'toggleRawEditor') onToggleRawEditor?.()
      else onCreateNote?.()
    }

    return installMobileWorkspaceKeyboardShortcuts(handleKeyDown)
  }, [
    onCreateNote,
    onOpenCommandPalette,
    onOpenFindInNote,
    onOpenSearch,
    onSelectNextNote,
    onSelectPreviousNote,
    onToggleRawEditor,
    nativeNoteNavigationEnabled,
  ])
}

export function installMobileWorkspaceKeyboardShortcuts(
  listener: (event: MobileKeyboardShortcutEvent) => void,
  host: KeyboardTargetHost = globalThis as KeyboardTargetHost,
  nativeModule: NativeMobileKeyCommandsModule | null = optionalNativeMobileKeyCommandsModule(),
) {
  const targets = keyboardTargets(host)
  const subscriptions: KeyboardShortcutSubscription[] = []

  const options = { capture: true }
  targets.forEach((target) => {
    const keyboardListener = listener as (event: KeyboardEvent) => void
    target.addEventListener('keydown', keyboardListener, options)
    subscriptions.push({ remove: () => target.removeEventListener('keydown', keyboardListener, options) })
  })
  if (nativeModule) subscriptions.push(nativeModule.addListener('onShortcut', listener))
  if (subscriptions.length === 0) return undefined

  return () => subscriptions.forEach((subscription) => subscription.remove())
}

export function keyboardTargets(host: KeyboardTargetHost): KeyboardDocument[] {
  return uniqueKeyboardTargets([
    host.document,
    host.window,
    host.document?.body ?? undefined,
  ])
}

function uniqueKeyboardTargets(targets: KeyboardTargetCandidate[]) {
  const seen = new Set<KeyboardDocument>()
  return targets.filter((target): target is KeyboardDocument => {
    if (!isKeyboardTarget(target) || seen.has(target)) return false
    seen.add(target)
    return true
  })
}

function isKeyboardTarget(target: KeyboardTargetCandidate): target is KeyboardDocument {
  return (
    typeof target?.addEventListener === 'function' &&
    typeof target.removeEventListener === 'function'
  )
}

export function mobileWorkspaceKeyboardAction(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'> & Partial<Pick<KeyboardEvent, 'code'>>,
): MobileWorkspaceKeyboardAction | null {
  const key = normalizedKeyboardKey(event)
  if (!event.metaKey && !event.ctrlKey) {
    if (event.altKey || event.shiftKey) return null
    if (key === 'arrowdown') return 'nextNote'
    if (key === 'arrowup') return 'previousNote'
    return null
  }
  if (event.altKey || event.shiftKey) return null

  if (key === 'k' || key === 'keyk') return 'commandPalette'
  if (key === 'f' || key === 'keyf') return 'findInNote'
  if (key === 'o' || key === 'keyo' || key === 'p' || key === 'keyp') return 'search'
  if (key === '\\' || key === 'backslash') return 'toggleRawEditor'
  if (key === 'n' || key === 'keyn') return 'createNote'
  return null
}

export function shouldHandleMobileWorkspaceKeyboardAction(
  action: MobileWorkspaceKeyboardAction,
  event: MobileKeyboardShortcutEvent | NativeMobileKeyCommandEvent,
  { nativeNoteNavigationEnabled = true }: { nativeNoteNavigationEnabled?: boolean } = {},
) {
  if (!noteNavigationAction(action)) return true
  if (keyboardEventTargetAcceptsTextInput(event)) return false
  return event.source !== 'native' || nativeNoteNavigationEnabled
}

function normalizedKeyboardKey(
  event: Pick<KeyboardEvent, 'key'> & Partial<Pick<KeyboardEvent, 'code'>>,
) {
  const key = event.key.toLowerCase()
  if (key === 'unidentified' || key.length === 0) return event.code?.toLowerCase() ?? ''
  if (key === '\\') return '\\'
  return key
}

function noteNavigationAction(action: MobileWorkspaceKeyboardAction) {
  return action === 'nextNote' || action === 'previousNote'
}

function keyboardEventTargetAcceptsTextInput(event: MobileKeyboardShortcutEvent | NativeMobileKeyCommandEvent) {
  const target = ('target' in event ? event.target : null) as { isContentEditable?: boolean; tagName?: string } | null
  if (!target) return false
  const tagName = target.tagName?.toLowerCase()

  return target.isContentEditable === true || tagName === 'input' || tagName === 'textarea'
}
