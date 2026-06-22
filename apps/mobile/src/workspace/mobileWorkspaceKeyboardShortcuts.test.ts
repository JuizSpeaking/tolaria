import { describe, expect, it } from 'vitest'
import { mobileWorkspaceKeyboardAction } from './mobileWorkspaceKeyboardShortcuts'

describe('mobile workspace keyboard shortcuts', () => {
  it('opens quick search from desktop quick-open shortcuts', () => {
    expect(shortcut('o')).toBe('search')
    expect(shortcut('p')).toBe('search')
  })

  it('opens the command palette from the desktop command palette shortcut', () => {
    expect(shortcut('k')).toBe('commandPalette')
  })

  it('ignores shifted or unmodified keys', () => {
    expect(shortcut('k', { shiftKey: true })).toBeNull()
    expect(mobileWorkspaceKeyboardAction({
      altKey: false,
      ctrlKey: false,
      key: 'k',
      metaKey: false,
      shiftKey: false,
    })).toBeNull()
  })
})

function shortcut(
  key: string,
  overrides: Partial<Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>> = {},
) {
  return mobileWorkspaceKeyboardAction({
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: true,
    shiftKey: false,
    ...overrides,
  })
}
