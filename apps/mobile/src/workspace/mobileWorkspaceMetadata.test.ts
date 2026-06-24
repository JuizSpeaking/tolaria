import { describe, expect, it } from 'vitest'
import { mobileSidebarIconFromValue } from './mobileWorkspaceMetadata'

describe('mobile workspace metadata', () => {
  it('keeps desktop Phosphor icon names instead of falling back to mock-era sidebar icons', () => {
    expect(mobileSidebarIconFromValue('book-bookmark', 'filetext')).toBe('bookbookmark')
    expect(mobileSidebarIconFromValue('calendar-blank', 'filetext')).toBe('calendarblank')
    expect(mobileSidebarIconFromValue('robot', 'filetext')).toBe('robot')
  })

  it('normalizes desktop aliases to the icon keys used by mobile rendering', () => {
    expect(mobileSidebarIconFromValue('file-text', 'inbox')).toBe('file')
    expect(mobileSidebarIconFromValue('folder-open', 'inbox')).toBe('folder')
    expect(mobileSidebarIconFromValue('funnel', 'inbox')).toBe('view')
    expect(mobileSidebarIconFromValue('tray', 'file')).toBe('inbox')
  })

  it('uses the fallback only when the icon value is absent', () => {
    expect(mobileSidebarIconFromValue('', 'file')).toBe('file')
    expect(mobileSidebarIconFromValue(null, 'file')).toBe('file')
  })
})
