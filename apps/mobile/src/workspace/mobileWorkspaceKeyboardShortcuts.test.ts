import { describe, expect, it } from 'vitest'
import {
  installMobileWorkspaceKeyboardShortcuts,
  keyboardTargets,
  mobileWorkspaceKeyboardAction,
  shouldHandleMobileWorkspaceKeyboardAction,
} from './mobileWorkspaceKeyboardShortcuts'
import type { NativeMobileKeyCommandEvent } from '../native/mobileNativeKeyCommands'

describe('mobile workspace keyboard shortcuts', () => {
  it('opens quick search from desktop quick-open shortcuts', () => {
    expect(shortcut('o')).toBe('search')
    expect(shortcut('p')).toBe('search')
  })

  it('opens the command palette from the desktop command palette shortcut', () => {
    expect(shortcut('k')).toBe('commandPalette')
  })

  it('opens find in note from the desktop find shortcut', () => {
    expect(shortcut('f')).toBe('findInNote')
  })

  it('toggles the raw editor from the desktop raw-editor shortcut', () => {
    expect(shortcut('\\')).toBe('toggleRawEditor')
    expect(shortcut('Backslash')).toBe('toggleRawEditor')
    expect(shortcut('Unidentified', { code: 'Backslash' })).toBe('toggleRawEditor')
  })

  it('moves across visible notes with unmodified arrow keys', () => {
    expect(unmodifiedShortcut('ArrowDown')).toBe('nextNote')
    expect(unmodifiedShortcut('ArrowUp')).toBe('previousNote')
  })

  it('ignores shifted or unmodified keys', () => {
    expect(shortcut('k', { shiftKey: true })).toBeNull()
    expect(unmodifiedShortcut('k')).toBeNull()
  })

  it('uses document, window, and body key targets when the native runtime exposes them', () => {
    const document = keyboardTarget()
    const window = keyboardTarget()
    const body = keyboardTarget()

    expect(keyboardTargets({ document: { ...document, body }, window })).toHaveLength(3)
  })

  it('deduplicates native key targets before installing listeners', () => {
    const document = keyboardTarget()
    const remove = installMobileWorkspaceKeyboardShortcuts(() => undefined, {
      document: { ...document, body: document },
      window: document,
    })

    expect(document.added).toBe(1)
    remove?.()
    expect(document.removed).toBe(1)
  })

  it('ignores native runtime shims that do not expose key listeners', () => {
    const document = Object.assign(keyboardTarget(), { body: {} })
    const remove = installMobileWorkspaceKeyboardShortcuts(() => undefined, {
      document,
      window: {},
    })

    expect(document.added).toBe(1)
    remove?.()
    expect(document.removed).toBe(1)
  })

  it('subscribes to optional native key-command events', () => {
    const nativeModule = nativeKeyboardModule()
    const actions: Array<ReturnType<typeof mobileWorkspaceKeyboardAction>> = []
    const remove = installMobileWorkspaceKeyboardShortcuts(
      (event) => actions.push(mobileWorkspaceKeyboardAction(event)),
      {},
      nativeModule,
    )

    nativeModule.send(nativeShortcutEvent('k'))
    expect(actions).toEqual(['commandPalette'])
    remove?.()
    expect(nativeModule.removed).toBe(1)
  })

  it('can disable native note-list arrow navigation when the list is not active', () => {
    const event = nativeShortcutEvent('ArrowDown', { metaKey: false })
    const action = mobileWorkspaceKeyboardAction(event)

    expect(action).toBe('nextNote')
    if (!action) throw new Error('Expected ArrowDown to resolve to nextNote')

    expect(shouldHandleMobileWorkspaceKeyboardAction(action, event, {
      nativeNoteNavigationEnabled: false,
    })).toBe(false)
  })
})

function shortcut(
  key: string,
  overrides: Partial<Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> & { source?: 'native' } = {},
) {
  return mobileWorkspaceKeyboardAction(shortcutEvent(key, overrides))
}

function shortcutEvent(
  key: string,
  overrides: Partial<Pick<KeyboardEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> & { source?: 'native' } = {},
) {
  return {
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: true,
    shiftKey: false,
    ...overrides,
  }
}

function nativeShortcutEvent(
  key: string,
  overrides: Partial<Pick<NativeMobileKeyCommandEvent, 'altKey' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {},
): NativeMobileKeyCommandEvent {
  return {
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: true,
    shiftKey: false,
    source: 'native',
    ...overrides,
  }
}

function unmodifiedShortcut(key: string) {
  return mobileWorkspaceKeyboardAction({
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    shiftKey: false,
  })
}

function keyboardTarget() {
  return {
    added: 0,
    removed: 0,
    addEventListener() {
      this.added += 1
    },
    removeEventListener() {
      this.removed += 1
    },
  }
}

function nativeKeyboardModule() {
  let listener: ((event: NativeMobileKeyCommandEvent) => void) | null = null
  return {
    removed: 0,
    addListener(_eventName: 'onShortcut', nextListener: (event: NativeMobileKeyCommandEvent) => void) {
      listener = nextListener
      return {
        remove: () => {
          this.removed += 1
          listener = null
        },
      }
    },
    send(event: NativeMobileKeyCommandEvent) {
      listener?.(event)
    },
  }
}
