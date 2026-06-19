import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEditWithWrites } from './mobileWorkspaceEditing'
import type { MobileWorkspaceSnapshot } from './mobileWorkspaceModel'

describe('mobile Type visibility editing', () => {
  it('restores a hidden customized Type section without losing its label', () => {
    const customized = applyMobileWorkspaceEditWithWrites(workspaceScenarioForId('default'), {
      patch: { label: 'Phone Runbooks' },
      type: 'updateTypeDefinition',
      typeName: 'Procedure',
    }).snapshot

    const hidden = applyMobileWorkspaceEditWithWrites(customized, {
      patch: { visible: false },
      type: 'updateTypeDefinition',
      typeName: 'Procedure',
    }).snapshot

    expect(typeItems(hidden).some((item) => item.typeName === 'Procedure')).toBe(false)

    const restored = applyMobileWorkspaceEditWithWrites(hidden, {
      patch: { visible: null },
      type: 'updateTypeDefinition',
      typeName: 'Procedure',
    }).snapshot

    expect(typeItems(restored)).toContainEqual(expect.objectContaining({
      label: 'Phone Runbooks',
      typeName: 'Procedure',
    }))
  })
})

function typeItems(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.sidebarSections.find((section) => section.id === 'types')?.items ?? []
}
