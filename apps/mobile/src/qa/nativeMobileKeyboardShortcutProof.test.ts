import { describe, expect, it } from 'vitest'
import {
  assertNativeMobileKeyboardShortcutProofs,
  nativeMobileKeyboardShortcutActionProof,
  nativeMobileKeyboardShortcutLogLine,
  nativeMobileKeyboardShortcutProbeEnabled,
  parseNativeMobileKeyboardShortcutProofs,
  type NativeMobileKeyboardShortcutProof,
} from './nativeMobileKeyboardShortcutProof'
import type { MobileWorkspaceKeyboardAction } from '../workspace/mobileWorkspaceKeyboardShortcuts'

describe('native mobile keyboard shortcut proof', () => {
  it('detects the native QA query flag', () => {
    expect(nativeMobileKeyboardShortcutProbeEnabled(new URLSearchParams('mobileKeyboardShortcutProbe=1'))).toBe(true)
    expect(nativeMobileKeyboardShortcutProbeEnabled(new URLSearchParams('mobileKeyboardShortcutProbe=0'))).toBe(false)
  })

  it('parses bridge and action proof lines', () => {
    const proofs: NativeMobileKeyboardShortcutProof[] = [
      { kind: 'bridge', nativeModuleAvailable: true },
      nativeMobileKeyboardShortcutActionProof('commandPalette', {
        key: 'k',
        metaKey: true,
        source: 'native',
      }),
    ]

    expect(parseNativeMobileKeyboardShortcutProofs(proofs.map(nativeMobileKeyboardShortcutLogLine).join('\n'))).toEqual(proofs)
  })

  it('requires the native bridge and every desktop shortcut action', () => {
    const proofs: NativeMobileKeyboardShortcutProof[] = [
      { kind: 'bridge', nativeModuleAvailable: true },
      action('commandPalette', 'k', true),
      action('findInNote', 'f', true),
      action('search', 'o', true),
      action('search', 'p', true),
      action('toggleRawEditor', '\\', true),
      action('createNote', 'n', true),
      action('previousNote', 'ArrowUp', false),
      action('nextNote', 'ArrowDown', false),
    ]

    expect(assertNativeMobileKeyboardShortcutProofs(proofs)).toEqual([])
  })

  it('does not accept Expo Go or DOM-only shortcut evidence as native proof', () => {
    const failures = assertNativeMobileKeyboardShortcutProofs([
      { kind: 'bridge', nativeModuleAvailable: false },
      { action: 'commandPalette', code: null, kind: 'action', key: 'k', metaKey: true, source: 'dom' },
    ])

    expect(failures.map((failure) => failure.id)).toEqual(expect.arrayContaining([
      'mobile.keyboard.bridge.native',
      'mobile.keyboard.commandPalette',
    ]))
  })
})

function action(action: MobileWorkspaceKeyboardAction, key: string, metaKey: boolean): NativeMobileKeyboardShortcutProof {
  return {
    action,
    code: null,
    kind: 'action',
    key,
    metaKey,
    source: 'native',
  }
}
