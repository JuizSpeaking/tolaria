import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMobileSavedViewFilename,
  mobileSavedViewOrderUpdates,
  moveMobileSavedView,
  nextMobileSavedViewOrder,
  evaluateMobileSavedView,
  parseMobileSavedViewFile,
  serializeMobileSavedViewDefinition,
} from './mobileSavedViews'
import type { MobileNote, MobileSavedView } from './mobileWorkspaceModel'

describe('mobile saved views', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('parses desktop saved-view YAML and evaluates filters against mobile notes', () => {
    const view = parseMobileSavedViewFile({
      relativePath: 'views/active-projects.yml',
      content: `name: Active Projects
icon: rocket
color: blue
sort: "modified:desc"
filters:
  all:
    - field: type
      op: equals
      value: Project
    - field: status
      op: any_of
      value: [Active, Draft]
`,
    }, 0)

    expect(view).toMatchObject({
      filename: 'active-projects.yml',
      id: 'view-active-projects',
      definition: {
        color: 'blue',
        icon: 'rocket',
        name: 'Active Projects',
        sort: 'modified:desc',
      },
    })
    expect(evaluateMobileSavedView(view!, [
      note({ id: 'draft-project', modifiedAt: 10, status: 'Draft', title: 'Draft project', type: 'Project' }),
      note({ id: 'active-project', modifiedAt: 20, status: 'Active', title: 'Active project', type: 'Project' }),
      note({ id: 'done-project', modifiedAt: 30, status: 'Done', title: 'Done project', type: 'Project' }),
      note({ id: 'active-procedure', modifiedAt: 40, status: 'Active', title: 'Active procedure', type: 'Procedure' }),
    ]).map((candidate) => candidate.id)).toEqual(['active-project', 'draft-project'])
  })

  it('sorts saved views with desktop custom-property sort strings', () => {
    const rankedView = parseMobileSavedViewFile({
      relativePath: 'views/ranked.yml',
      content: `name: Ranked
sort: "property:Priority:asc"
filters:
  all: []
`,
    }, 0)
    const datedView = parseMobileSavedViewFile({
      relativePath: 'views/dated.yml',
      content: `name: Dated
sort: "Due:desc"
filters:
  all: []
`,
    }, 1)
    const notes = [
      note({ id: 'missing' }),
      note({ id: 'low', properties: [{ key: 'Priority', label: 'Priority', value: 3 }, { key: 'Due', label: 'Due', value: '2026-06-10' }] }),
      note({ id: 'high', properties: [{ key: 'Priority', label: 'Priority', value: 1 }, { key: 'Due', label: 'Due', value: '2026-06-20' }] }),
    ]

    expect(evaluateMobileSavedView(rankedView!, notes).map((candidate) => candidate.id)).toEqual(['high', 'low', 'missing'])
    expect(evaluateMobileSavedView(datedView!, notes).map((candidate) => candidate.id)).toEqual(['high', 'low', 'missing'])
  })

  it('supports relationship and custom-property fields in saved-view filters', () => {
    const view = parseMobileSavedViewFile({
      relativePath: 'views/blocked-mobile.yml',
      content: `name: Blocked Mobile
filters:
  all:
    - field: depends_on
      op: contains
      value: Expo
    - field: priority
      op: equals
      value: High
`,
    }, 0)

    expect(evaluateMobileSavedView(view!, [
      note({
        id: 'match',
        properties: [{ key: 'priority', label: 'Priority', value: 'High' }],
        relationships: [
          {
            key: 'depends_on',
            kind: 'custom',
            values: [{ title: 'Expo Layout QA', type: 'Procedure', typeTone: 'purple' }],
          },
        ],
      }),
      note({
        id: 'wrong-priority',
        properties: [{ key: 'priority', label: 'Priority', value: 'Low' }],
        relationships: [
          {
            key: 'depends_on',
            kind: 'custom',
            values: [{ title: 'Expo Layout QA', type: 'Procedure', typeTone: 'purple' }],
          },
        ],
      }),
    ]).map((candidate) => candidate.id)).toEqual(['match'])
  })

  it('evaluates regex-enabled saved-view filters like desktop', () => {
    const view = parseMobileSavedViewFile({
      relativePath: 'views/regex.yml',
      content: `name: Regex
filters:
  all:
    - field: title
      op: contains
      value: "^Mobile\\s+QA"
      regex: true
`,
    }, 0)
    const invalidRegexView = parseMobileSavedViewFile({
      relativePath: 'views/invalid-regex.yml',
      content: `name: Invalid Regex
filters:
  all:
    - field: title
      op: contains
      value: "("
      regex: true
`,
    }, 1)
    const notes = [
      note({ id: 'match', title: 'Mobile QA Draft' }),
      note({ id: 'miss', title: 'Desktop QA Draft' }),
    ]

    expect(evaluateMobileSavedView(view!, notes).map((candidate) => candidate.id)).toEqual(['match'])
    expect(evaluateMobileSavedView(invalidRegexView!, notes)).toEqual([])
  })

  it('matches relationship array filters with desktop wikilink semantics', () => {
    const view = parseMobileSavedViewFile({
      relativePath: 'views/session-trail.yml',
      content: `name: Session Trail
filters:
  all:
    - field: related_to
      op: equals
      value: svc-session-trail
`,
    }, 0)

    expect(evaluateMobileSavedView(view!, [
      note({
        id: 'single',
        relationships: [relationship('related_to', [{ ref: '[[svc-session-trail]]', title: 'Trail' }])],
      }),
      note({
        id: 'aliased',
        relationships: [relationship('related_to', [{ ref: '[[svc-session-trail|Trail]]', title: 'Trail' }])],
      }),
      note({
        id: 'multiple',
        relationships: [relationship('related_to', [
          { ref: '[[svc-session-trail]]', title: 'Trail' },
          { ref: '[[other]]', title: 'Other' },
        ])],
      }),
    ]).map((candidate) => candidate.id)).toEqual(['single', 'aliased'])
  })

  it('uses exact desktop matching for property-array view filters', () => {
    const view = parseMobileSavedViewFile({
      relativePath: 'views/design-tags.yml',
      content: `name: Design Tags
filters:
  all:
    - field: tags
      op: contains
      value: Design
`,
    }, 0)

    expect(evaluateMobileSavedView(view!, [
      note({ id: 'exact', tags: ['Design'] }),
      note({ id: 'substring', tags: ['Design Systems'] }),
    ]).map((candidate) => candidate.id)).toEqual(['exact'])
  })

  it('matches relative date expressions in saved-view filters', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-07T12:00:00Z'))

    const todayView = parseMobileSavedViewFile({
      relativePath: 'views/today.yml',
      content: `name: Today
filters:
  all:
    - field: Date
      op: equals
      value: today
`,
    }, 0)
    const recentView = parseMobileSavedViewFile({
      relativePath: 'views/recent.yml',
      content: `name: Recent
filters:
  all:
    - field: Date
      op: after
      value: 10 days ago
`,
    }, 1)
    const notes = [
      note({ id: 'older', properties: [{ key: 'Date', label: 'Date', value: '2026-03-20' }] }),
      note({ id: 'recent', properties: [{ key: 'Date', label: 'Date', value: '2026-03-30' }] }),
      note({ id: 'today', properties: [{ key: 'Date', label: 'Date', value: '2026-04-07' }] }),
    ]

    expect(evaluateMobileSavedView(todayView!, notes).map((candidate) => candidate.id)).toEqual(['today'])
    expect(evaluateMobileSavedView(recentView!, notes).map((candidate) => candidate.id)).toEqual(['recent', 'today'])
  })

  it('serializes desktop-compatible saved-view YAML that can be parsed back', () => {
    const content = serializeMobileSavedViewDefinition({
      color: 'purple',
      filters: {
        all: [
          { field: 'type', op: 'equals', value: 'Procedure' },
          { field: 'status', op: 'any_of', value: ['Active', 'Draft'] },
        ],
      },
      icon: null,
      listPropertiesDisplay: ['Status', 'belongs_to'],
      name: 'Active Procedures',
      sort: 'modified:desc',
    })
    const parsed = parseMobileSavedViewFile({ content, relativePath: 'views/active-procedures.yml' }, 0)

    expect(content).toContain('name: "Active Procedures"')
    expect(content).toContain('listPropertiesDisplay:')
    expect(content).toContain('filters:')
    expect(parsed?.definition).toMatchObject({
      color: 'purple',
      filters: {
        all: [
          { field: 'type', op: 'equals', value: 'Procedure' },
          { field: 'status', op: 'any_of', value: ['Active', 'Draft'] },
        ],
      },
      listPropertiesDisplay: ['Status', 'belongs_to'],
      name: 'Active Procedures',
      sort: 'modified:desc',
    })
  })

  it('creates desktop-style unique view filenames', () => {
    expect(createMobileSavedViewFilename('Active Procedures', ['active-procedures.yml'])).toBe('active-procedures-2.yml')
    expect(createMobileSavedViewFilename('CON', [])).toBe('con-view.yml')
  })

  it('assigns new saved views after the highest desktop order', () => {
    expect(nextMobileSavedViewOrder([
      viewFixture('alpha.yml', 'Alpha', 0),
      viewFixture('beta.yml', 'Beta', 4),
      viewFixture('gamma.yml', 'Gamma', null),
    ])).toBe(5)
    expect(nextMobileSavedViewOrder([
      viewFixture('alpha.yml', 'Alpha', null),
      viewFixture('beta.yml', 'Beta', null),
    ])).toBe(2)
  })

  it('moves saved views and builds dense desktop order updates', () => {
    const views = [
      viewFixture('alpha.yml', 'Alpha', 0),
      viewFixture('beta.yml', 'Beta', 1),
      viewFixture('gamma.yml', 'Gamma', 2),
    ]
    const moved = moveMobileSavedView(views, 'view-gamma', 'up')

    expect(moved?.map((view) => view.filename)).toEqual(['alpha.yml', 'gamma.yml', 'beta.yml'])
    expect(mobileSavedViewOrderUpdates(moved ?? []).map(({ filename, definition }) => ({
      filename,
      order: definition.order,
    }))).toEqual([
      { filename: 'alpha.yml', order: 0 },
      { filename: 'gamma.yml', order: 1 },
      { filename: 'beta.yml', order: 2 },
    ])
    expect(moveMobileSavedView(views, 'alpha.yml', 'up')).toBeNull()
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

function relationship(key: string, values: Array<{ ref: string; title: string }>) {
  return {
    key,
    kind: 'custom' as const,
    values: values.map((value) => ({
      ...value,
      type: 'Note',
      typeTone: 'gray' as const,
    })),
  }
}

function viewFixture(filename: string, name: string, order: number | null): MobileSavedView {
  return {
    definition: {
      color: null,
      filters: { all: [] },
      icon: null,
      name,
      order,
      sort: null,
    },
    filename,
    id: `view-${filename.replace(/\.yml$/u, '')}`,
  }
}
