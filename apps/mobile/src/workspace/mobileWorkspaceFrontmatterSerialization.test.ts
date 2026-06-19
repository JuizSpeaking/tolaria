import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEdit } from './mobileWorkspaceEditing'

describe('mobile workspace frontmatter serialization', () => {
  it('quotes desktop special-character property keys when editing notes', () => {
    const snapshot = applyMobileWorkspaceEdit(workspaceScenarioForId('default'), {
      key: 'key:value',
      noteId: 'workflow-orchestration',
      type: 'updateProperty',
      value: '2026-06-01',
    })

    const note = snapshot.notes.find((candidate) => candidate.id === 'workflow-orchestration')
    expect(note?.rawContent).toContain('"key:value": 2026-06-01')
    expect(note?.properties).toContainEqual({
      key: 'key:value',
      label: 'Key:Value',
      value: '2026-06-01',
    })
  })
})
