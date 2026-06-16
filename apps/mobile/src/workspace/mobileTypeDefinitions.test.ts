import { describe, expect, it } from 'vitest'
import { mobileTypeDefinitionContent } from './mobileTypeDefinitions'

describe('mobile type definitions', () => {
  it('writes desktop-canonical system metadata keys for Type documents', () => {
    const content = mobileTypeDefinitionContent('Project', undefined, {
      icon: 'rocket',
      label: 'Client Projects',
      order: 3,
      sort: 'property:Priority:asc',
      tone: 'green',
    })

    expect(content).toContain('type: Type')
    expect(content).toContain('_icon: rocket')
    expect(content).toContain('_sidebar_label: Client Projects')
    expect(content).toContain('_order: 3')
    expect(content).toContain('_sort: "property:Priority:asc"')
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
color: purple
---
# Project
`,
    }, {
      icon: 'rocket',
      label: 'Client Projects',
      order: 3,
      sort: 'property:Priority:asc',
    })

    expect(content).toContain('_icon: rocket')
    expect(content).toContain('_sidebar_label: Client Projects')
    expect(content).toContain('_order: 3')
    expect(content).toContain('_sort: "property:Priority:asc"')
    expect(content).toContain('color: purple')
    expect(content).not.toContain('\nicon:')
    expect(content).not.toContain('\nsidebar label:')
    expect(content).not.toContain('\nsidebar_label:')
    expect(content).not.toContain('\norder:')
    expect(content).not.toContain('\nsort:')
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
})
