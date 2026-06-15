import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { createNoteDefaultsForSelection } from './tabletWorkspaceCreateDefaults'
import type { TabletSidebarSelection } from './tabletWorkspaceNavigation'

describe('tablet workspace create-note defaults', () => {
  it('uses selected type sections as the new note type', () => {
    const selection: TabletSidebarSelection = {
      id: 'type-project',
      kind: 'item',
      label: 'Client Work',
      sectionId: 'types',
      typeName: 'Project',
    }

    expect(createNoteDefaultsForSelection(selection, [])).toEqual({ type: 'Project' })
  })

  it('copies valued Type document defaults when creating from a type section', () => {
    const selection: TabletSidebarSelection = {
      id: 'type-project',
      kind: 'item',
      label: 'Client Work',
      sectionId: 'types',
      typeName: 'Project',
    }

    expect(createNoteDefaultsForSelection(selection, [], {
      Project: {
        properties: {
          Empty: '',
          Priority: 'High',
          has: 'Milestone',
        },
        relationships: {
          belongs_to: ['[[Client Work]]'],
          related_to: [],
        },
      },
    })).toEqual({
      properties: { Priority: 'High' },
      relationships: { belongs_to: ['[[Client Work]]'] },
      type: 'Project',
    })
  })

  it('uses folder selections as the new note folder path', () => {
    expect(createNoteDefaultsForSelection({
      id: 'Writing/Essays',
      kind: 'folder',
      label: 'Essays',
    }, [])).toEqual({ folderPath: 'Writing/Essays' })
  })

  it('derives positive saved-view filters into note frontmatter defaults', () => {
    const view = workspaceScenarioForId('default').views?.[0]
    if (!view) throw new Error('fixture saved view is required')

    const selection: TabletSidebarSelection = {
      id: view.id,
      kind: 'item',
      label: view.definition.name,
      sectionId: 'views',
      viewId: view.id,
    }

    expect(createNoteDefaultsForSelection(selection, [view])).toEqual({
      status: 'Active',
      type: 'Procedure',
    })
  })

  it('derives tags, properties, relationship refs, and folder filters from saved views', () => {
    const selection: TabletSidebarSelection = {
      id: 'view-launch',
      kind: 'item',
      label: 'Launch',
      sectionId: 'views',
      viewId: 'view-launch',
    }

    expect(createNoteDefaultsForSelection(selection, [{
      definition: {
        color: 'green',
        filters: {
          all: [
            { field: 'path', op: 'contains', value: 'Writing/Launch' },
            { field: 'tags', op: 'any_of', value: ['Design', 'Mobile'] },
            { field: 'Priority', op: 'equals', value: 'High' },
            { field: 'belongs_to', op: 'equals', value: 'Tolaria MVP' },
            { field: 'organized', op: 'equals', value: false },
          ],
        },
        icon: null,
        name: 'Launch',
        sort: 'modified:desc',
      },
      filename: 'launch.yml',
      id: 'view-launch',
    }])).toEqual({
      folderPath: 'Writing/Launch',
      organized: false,
      properties: { Priority: 'High' },
      relationships: { belongs_to: ['[[Tolaria MVP]]'] },
      tags: ['Design', 'Mobile'],
    })
  })
})
