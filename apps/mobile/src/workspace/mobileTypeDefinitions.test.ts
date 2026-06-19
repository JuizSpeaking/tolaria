import { describe, expect, it } from 'vitest'
import { applyMobileTypeDefinitionPatch, mobileTypeDefinitionContent } from './mobileTypeDefinitions'

describe('mobile type definitions', () => {
  it('writes desktop-canonical system metadata keys for Type documents', () => {
    const content = mobileTypeDefinitionContent('Project', undefined, {
      icon: 'rocket',
      label: 'Client Projects',
      order: 3,
      sort: 'property:Priority:asc',
      template: '## Objective\n\nLaunch mobile parity.\n',
      tone: 'green',
      view: 'editor-list',
    })

    expect(content).toContain('type: Type')
    expect(content).toContain('_icon: rocket')
    expect(content).toContain('_sidebar_label: Client Projects')
    expect(content).toContain('_order: 3')
    expect(content).toContain('_sort: "property:Priority:asc"')
    expect(content).toContain('template: |\n  ## Objective\n\n  Launch mobile parity.')
    expect(content).toContain('view: editor-list')
    expect(content).toContain('color: green')
    expect(content).not.toContain('\nicon:')
    expect(content).not.toContain('\nsidebar label:')
    expect(content).not.toContain('\norder:')
    expect(content).not.toContain('\nsort:')
  })

  it('canonicalizes existing system metadata aliases when updating Type documents', () => {
    const content = mobileTypeDefinitionContent('Project', {
      rawContent: `---
type: Type
icon: file
sidebar label: Projects
sidebar_label: Legacy Projects
order: 9
sort: modified:desc
_sort: title:asc
View: all
color: purple
---
# Project
`,
    }, {
      icon: 'rocket',
      label: 'Client Projects',
      order: 3,
      sort: 'property:Priority:asc',
      view: 'editor-list',
    })

    expect(content).toContain('_icon: rocket')
    expect(content).toContain('_sidebar_label: Client Projects')
    expect(content).toContain('_order: 3')
    expect(content).toContain('_sort: "property:Priority:asc"')
    expect(content).toContain('view: editor-list')
    expect(content).toContain('color: purple')
    expect(content).not.toContain('\nicon:')
    expect(content).not.toContain('\nsidebar label:')
    expect(content).not.toContain('\nsidebar_label:')
    expect(content).not.toContain('\norder:')
    expect(content).not.toContain('\nsort:')
    expect(content).not.toContain('\nView:')
  })

  it('removes all aliases when clearing Type system metadata', () => {
    const content = mobileTypeDefinitionContent('Project', {
      rawContent: `---
type: Type
icon: file
_icon: rocket
sidebar label: Projects
_sidebar_label: Client Projects
order: 9
_order: 3
sort: modified:desc
_sort: title:asc
---
# Project
`,
    }, {
      icon: null,
      label: null,
      order: null,
      sort: null,
    })

    expect(content).not.toContain('\nicon:')
    expect(content).not.toContain('\n_icon:')
    expect(content).not.toContain('\nsidebar label:')
    expect(content).not.toContain('\n_sidebar_label:')
    expect(content).not.toContain('\norder:')
    expect(content).not.toContain('\n_order:')
    expect(content).not.toContain('\nsort:')
    expect(content).not.toContain('\n_sort:')
  })

  it('canonicalizes desktop visible aliases when toggling Type section visibility', () => {
    const hiddenContent = mobileTypeDefinitionContent('Secret', {
      rawContent: `---
type: Type
Visible: false
---
# Secret
`,
    }, {
      visible: null,
    })

    expect(hiddenContent).not.toContain('\nVisible:')
    expect(hiddenContent).not.toContain('\nvisible:')

    const visibleContent = mobileTypeDefinitionContent('Secret', undefined, {
      visible: false,
    })

    expect(visibleContent).toContain('visible: false')
  })

  it('preserves omitted Type metadata when applying a visibility-only patch', () => {
    expect(applyMobileTypeDefinitionPatch({
      icon: 'stack',
      label: 'Phone Runbooks',
      properties: { Priority: 'High' },
      template: '## Checklist',
      tone: 'purple',
    }, {
      visible: false,
    })).toMatchObject({
      icon: 'stack',
      label: 'Phone Runbooks',
      properties: { Priority: 'High' },
      template: '## Checklist',
      tone: 'purple',
      visible: false,
    })
  })

  it('quotes Type schema frontmatter keys with desktop YAML rules', () => {
    const content = mobileTypeDefinitionContent('Project', undefined, {
      properties: { 'key:value': '2026-06-01' },
      relationships: { 'blocked#by': ['[[launch-plan]]'] },
    })

    expect(content).toContain('"key:value": 2026-06-01')
    expect(content).toContain('"blocked#by":\n  - "[[launch-plan]]"')
  })
})
