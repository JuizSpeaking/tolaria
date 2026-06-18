import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEditWithWrites } from './mobileWorkspaceEditing'

describe('mobile note icon editing', () => {
  it('sets and removes note icons through the desktop _icon frontmatter key', () => {
    const base = workspaceScenarioForId('default')
    const editableContent = '---\ntype: Essay\nStatus: Draft\n---\n# Workflow Orchestration Essay\n\nIcon body.\n'
    const editableSnapshot = {
      ...base,
      allNotes: base.allNotes?.map((note) => note.id === 'workflow-orchestration' ? { ...note, rawContent: editableContent } : note),
      notes: base.notes.map((note) => note.id === 'workflow-orchestration' ? { ...note, rawContent: editableContent } : note),
    }

    const withIcon = applyMobileWorkspaceEditWithWrites(editableSnapshot, {
      key: '_icon',
      noteId: 'workflow-orchestration',
      type: 'updateProperty',
      value: '🚀',
    })
    const iconNote = withIcon.snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')

    expect(iconNote?.icon).toBe('🚀')
    expect(iconNote?.rawContent).toContain('_icon: 🚀')
    expect(withIcon.writes).toEqual([{
      content: expect.stringContaining('_icon: 🚀'),
      kind: 'saveNote',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    }])

    const withoutIcon = applyMobileWorkspaceEditWithWrites(withIcon.snapshot, {
      key: '_icon',
      noteId: 'workflow-orchestration',
      type: 'deleteProperty',
    })
    const plainNote = withoutIcon.snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')

    expect(plainNote?.icon).toBeNull()
    expect(plainNote?.rawContent).not.toContain('_icon:')
  })
})
