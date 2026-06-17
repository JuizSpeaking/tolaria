import { describe, expect, it } from 'vitest'
import {
  filterNotesBySearch,
  noteListPropertiesForSelection,
  notesForSidebarSelection,
  type TabletSidebarSelection,
} from './tabletWorkspaceNavigation'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'

describe('tablet workspace navigation', () => {
  it('uses canonical type names for renamed desktop Type sidebar sections', () => {
    const snapshot = workspaceSnapshot([
      note({ archived: true, id: 'archived', properties: [{ key: 'Priority', label: 'Priority', value: 0 }], title: 'Archived', type: 'Project' }),
      note({ id: 'high', properties: [{ key: 'Priority', label: 'Priority', value: 1 }], title: 'High', type: 'Project' }),
      note({ id: 'low', properties: [{ key: 'Priority', label: 'Priority', value: 2 }], title: 'Low', type: 'Project' }),
      note({ id: 'label-match', title: 'Wrong Type', type: 'Client Work' }),
      note({ id: 'plain-note', title: 'Plain', type: 'Note' }),
    ])
    const selection: TabletSidebarSelection = {
      id: 'type-project',
      kind: 'item',
      label: 'Client Work',
      sectionId: 'types',
      typeName: 'Project',
    }

    expect(notesForSidebarSelection(snapshot, selection).map((candidate) => candidate.id)).toEqual(['high', 'low'])
    expect(noteListPropertiesForSelection(snapshot, selection)).toEqual(['Priority', 'belongs_to'])
  })

  it('filters note lists by displayed desktop property and relationship chips', () => {
    const notes = [
      note({
        id: 'workflow',
        properties: [{ key: 'Priority', label: 'Priority', value: 'High' }],
        relationships: [{
          kind: 'belongsTo',
          key: 'belongs_to',
          values: [{ id: 'parent', title: 'LLM Workflow', type: 'Essay', typeTone: 'green' }],
        }],
        title: 'Workflow Orchestration',
      }),
      note({
        id: 'release',
        properties: [{ key: 'Priority', label: 'Priority', value: 'Low' }],
        title: 'Release Notes',
      }),
    ]

    expect(filterNotesBySearch(notes, 'llm workflow', ['belongs_to']).map((candidate) => candidate.id)).toEqual(['workflow'])
    expect(filterNotesBySearch(notes, 'high', ['Priority']).map((candidate) => candidate.id)).toEqual(['workflow'])
    expect(filterNotesBySearch(notes, 'llm workflow', ['Priority'])).toEqual([])
  })

  it('opens the selected active favorite note instead of every favorite or title match', () => {
    const snapshot = workspaceSnapshot([
      note({ favorite: true, id: 'selected', title: 'Journal' }),
      note({ id: 'same-title', title: 'Journal' }),
      note({ archived: true, favorite: true, id: 'archived-favorite', title: 'Archived' }),
      note({ favorite: true, id: 'other-favorite', title: 'Other' }),
    ])

    expect(notesForSidebarSelection(snapshot, {
      id: 'favorite-selected',
      kind: 'item',
      label: 'Journal',
      sectionId: 'favorites',
    }).map((candidate) => candidate.id)).toEqual(['selected'])
  })

  it('keeps inbox limited to active unorganized non-Type notes', () => {
    const inboxSelection: TabletSidebarSelection = {
      id: 'inbox',
      kind: 'item',
      label: 'Inbox',
      sectionId: 'primary',
    }

    expect(notesForSidebarSelection(workspaceSnapshot([
      note({ id: 'organized', organized: true, title: 'Organized' }),
      note({ archived: true, id: 'archived', title: 'Archived' }),
    ]), inboxSelection)).toEqual([])

    expect(notesForSidebarSelection(workspaceSnapshot([
      note({ id: 'capture', title: 'Capture' }),
      note({ id: 'type-doc', title: 'Type Doc', type: 'Type' }),
      note({ organized: true, id: 'organized', title: 'Organized' }),
    ]), inboxSelection).map((candidate) => candidate.id)).toEqual(['capture'])
  })

  it('selects folders by path and includes descendants without matching duplicate labels', () => {
    const snapshot = workspaceSnapshot([
      note({ id: 'writing-root', path: 'Writing/Root.md', title: 'Root' }),
      note({ id: 'writing-project', path: 'Writing/Projects/Alpha.md', title: 'Alpha' }),
      note({ archived: true, id: 'writing-archived', path: 'Writing/Archived.md', title: 'Archived' }),
      note({ id: 'other-project', path: 'Other/Projects/Beta.md', title: 'Beta' }),
      note({ id: 'other-root', path: 'Other/Root.md', title: 'Other root' }),
    ])

    expect(notesForSidebarSelection(snapshot, {
      id: 'Writing',
      kind: 'folder',
      label: 'Writing',
    }).map((candidate) => candidate.id)).toEqual(['writing-root', 'writing-project'])

    expect(notesForSidebarSelection(snapshot, {
      id: 'Writing/Projects',
      kind: 'folder',
      label: 'Projects',
    }).map((candidate) => candidate.id)).toEqual(['writing-project'])
  })
})

function workspaceSnapshot(notes: MobileNote[]): MobileWorkspaceSnapshot {
  return {
    allNotes: notes,
    editorBlocks: [],
    editorBullets: [],
    noteListSubtitle: String(notes.length),
    notes,
    sidebarSections: [{
      id: 'types',
      items: [{
        count: '2',
        icon: 'file',
        id: 'type-project',
        label: 'Client Work',
        typeName: 'Project',
      }],
      label: 'Types',
    }],
    sync: { kind: 'synced', minutesAgo: 0 },
    typeDefinitions: {
      Project: {
        label: 'Client Work',
        listPropertiesDisplay: ['Priority', 'belongs_to'],
        sort: 'property:Priority:asc',
      },
    },
  }
}

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
