import { describe, expect, it } from 'vitest'
import { notes, sidebarSections } from './demoData'

describe('mobile demo data', () => {
  it('derives note titles and snippets through shared markdown utilities', () => {
    expect(notes[0].title).toBe('Workflow Orchestration Essay')
    expect(notes[0].snippet).toContain('The current narrative / temptation')
    expect(notes[0].words).toBeGreaterThan(20)
  })

  it('keeps the initial sidebar focused on inbox', () => {
    expect(sidebarSections[0].items[0]).toMatchObject({
      id: 'inbox',
      label: 'Inbox',
    })
  })
})
