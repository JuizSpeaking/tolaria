import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEdit } from './mobileWorkspaceEditing'
import { normalizeMobileNoteWidth } from './mobileNoteWidth'

describe('normalizeMobileNoteWidth', () => {
  it.each([
    ['normal', 'normal'],
    ['wide', 'wide'],
    [' Wide ', 'wide'],
  ] as const)('normalizes desktop note width value %s', (value, expected) => {
    expect(normalizeMobileNoteWidth(value)).toBe(expected)
  })

  it.each(['expanded', '', null, 2])('rejects unsupported note width value %s', (value) => {
    expect(normalizeMobileNoteWidth(value)).toBeNull()
  })
})

describe('mobile note width metadata', () => {
  it('re-derives desktop note width metadata after note content edits', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      content: '---\ntype: Essay\n_width: wide\n---\n# Revised Mobile Essay\n\nA body.\n',
      noteId: 'workflow-orchestration',
      type: 'updateNoteContent',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note?.noteWidth).toBe('wide')
  })
})
