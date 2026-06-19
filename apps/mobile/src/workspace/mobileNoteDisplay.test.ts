import { describe, expect, it } from 'vitest'
import { mobileNoteDisplayLabels, mobileNoteRowChips } from './mobileNoteDisplay'
import type { MobileNote } from './mobileWorkspaceModel'

describe('mobile note display', () => {
  it('formats configured custom property chips with desktop note-list semantics', () => {
    const candidate = note({
      properties: [
        { key: 'Due Date', label: 'Due Date', value: '2026-06-14' },
        { key: 'URL', label: 'URL', value: 'https://tolaria.app/docs' },
        { key: 'Published', label: 'Published', value: false },
        { key: 'Areas', label: 'Areas', value: ['Design', 'AI'] },
      ],
    })

    expect(mobileNoteDisplayLabels(candidate, ['Due Date', 'URL', 'Published', 'Areas'])).toEqual([
      'June 14, 2026',
      'tolaria.app',
      'false',
      'Design',
      'AI',
    ])
    expect(mobileNoteRowChips(candidate, ['URL'])[0]).toMatchObject({
      label: 'tolaria.app',
      tone: 'blue',
    })
  })
})

function note(overrides: Partial<MobileNote>): MobileNote {
  return {
    created: '-',
    date: '-',
    favorite: false,
    id: 'note',
    links: 0,
    modified: '-',
    relationships: [],
    snippet: '',
    status: '',
    tags: [],
    title: 'Note',
    type: 'Note',
    typeTone: 'gray',
    workspace: 'TV',
    ...overrides,
  }
}
