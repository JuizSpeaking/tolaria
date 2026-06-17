import { describe, expect, it } from 'vitest'
import { buildLocalVaultWorkspaceSnapshot, type LocalVaultFile } from './localVaultSnapshot'
import type { MobileSidebarFolder } from './mobileWorkspaceModel'

describe('buildLocalVaultWorkspaceSnapshot', () => {
  it('maps real vault frontmatter into mobile notes, relationships, and type colors', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: realVaultRelationshipFiles(),
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.source).toMatchObject({ kind: 'localVault', label: 'Laputa', totalNotes: 3 })
    expect(snapshot.notes).toHaveLength(1)
    expect(snapshot.notes[0]).toMatchObject({
      aliases: ['Mobile App'],
      rawContent: tolariaMobileContent,
      title: 'Tolaria Mobile',
      type: 'Project',
      noteWidth: 'wide',
      typeTone: 'red',
      workspace: 'Laputa',
    })
    expect(snapshot.notes[0]?.relationships[0]).toMatchObject({
      key: 'related_to',
    })
    expect(snapshot.notes[0]?.relationships[0]?.values[0]).toMatchObject({
      ref: '[[workflow-orchestration|Workflow Orchestration]]',
      title: 'Workflow Orchestration',
      type: 'Note',
    })
    expect((snapshot.notes[0]?.editorBlocks ?? []).some((block) => block.kind === 'table')).toBe(true)
    expect(snapshot.allNotes?.map((note) => note.title)).toContain('Workflow Orchestration')
  })

  it('resolves relationship refs through target aliases and folded title targets like desktop wikilinks', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('relationships/source.md', `---
type: Note
related_to:
  - "[[Newsletter]]"
has:
  - "[[Cafe Notes.md]]"
---
# Source
`),
        vaultFile('relationships/launch-plan.md', `---
type: Project
aliases:
  - Newsletter
---
# Longform Launch Plan
`),
        vaultFile('journal/cafe-notes.md', `---
type: Journal
---
# Café Notes
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.notes[0]?.relationships[0]?.values[0]).toMatchObject({
      id: 'relationships/launch-plan.md',
      ref: '[[Newsletter]]',
      title: 'Longform Launch Plan',
      type: 'Project',
    })
    expect(snapshot.notes[0]?.relationships[1]?.values[0]).toMatchObject({
      id: 'journal/cafe-notes.md',
      ref: '[[Cafe Notes.md]]',
      title: 'Café Notes',
      type: 'Journal',
    })
  })

  it('caps the rendered note list while keeping total vault counts and full navigation notes', () => {
    const files = Array.from({ length: 5 }, (_, index) => vaultFile(`note-${index}.md`, `---
type: Note
---
# Note ${index}

Body ${index}.
`, index))

    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files,
      maxNotes: 2,
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.notes.map((note) => note.title)).toEqual(['Note 4', 'Note 3'])
    expect(snapshot.allNotes?.map((note) => note.title)).toEqual(['Note 4', 'Note 3', 'Note 2', 'Note 1', 'Note 0'])
    expect(snapshot.noteListSubtitle).toBe('2 / 5')
    expect(snapshot.source).toMatchObject({ totalNotes: 5, visibleNotes: 2 })
  })

  it('orders local vault favorites by the desktop favorite index', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('unindexed.md', `---
type: Note
_favorite: true
---
# Unindexed Favorite
`, 30),
        vaultFile('later.md', `---
type: Note
_favorite: true
_favorite_index: 2
---
# Later Favorite
`, 20),
        vaultFile('first.md', `---
type: Note
_favorite: true
_favorite_index: 0
---
# First Favorite
`, 10),
        vaultFile('archived.md', `---
type: Note
_favorite: true
_favorite_index: 1
_archived: true
---
# Archived Favorite
`, 40),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.sidebarSections.find((section) => section.id === 'favorites')?.items?.map((item) => item.label)).toEqual([
      'First Favorite',
      'Later Favorite',
      'Unindexed Favorite',
    ])
  })

  it('keeps local vault Inbox empty instead of falling back to active notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('organized.md', `---
type: Note
_organized: true
---
# Organized
`),
        vaultFile('archived.md', `---
type: Note
_archived: true
---
# Archived
`),
        vaultFile('types/project.md', `---
type: Type
---
# Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.notes).toEqual([])
    expect(snapshot.selectedNoteId).toBeUndefined()
    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual([
      expect.objectContaining({ count: '0', id: 'inbox' }),
      expect.objectContaining({ count: '2', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(snapshot.source).toMatchObject({ totalNotes: 3, visibleNotes: 0 })
    expect(snapshot.allNotes?.map((note) => note.title)).toEqual(
      expect.arrayContaining(['Project', 'Organized', 'Archived']),
    )
    expect(snapshot.allNotes?.find((note) => note.title === 'Project')).toMatchObject({
      type: 'Type',
      typeTone: 'blue',
    })
  })

  it('keeps archived Type documents out of live type metadata while counting them as archived notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('types/recipe.md', `---
type: Type
_archived: true
color: orange
---
# Recipe
`),
        vaultFile('recipes/pasta.md', `---
type: Recipe
_organized: false
---
# Pasta
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.typeDefinitions?.Recipe).toBeUndefined()
    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual([
      expect.objectContaining({ count: '1', id: 'inbox' }),
      expect.objectContaining({ count: '1', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(snapshot.sidebarSections.find((section) => section.id === 'types')?.items).toEqual([
      expect.objectContaining({ count: '1', label: 'Recipes', tone: 'gray', typeName: 'Recipe' }),
    ])
  })

  it('parses saved views into the mobile sidebar and counts matching notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('views/active-projects.yml', `name: Active Projects
icon: rocket
color: blue
sort: "modified:desc"
filters:
  all:
    - field: type
      op: equals
      value: Project
`),
        vaultFile('project.md', projectTypeContent),
        vaultFile('active-project.md', `---
type: Project
_organized: false
---
# Active Project
`),
        vaultFile('active-note.md', `---
type: Note
_organized: false
---
# Active Note
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.views?.map((view) => view.definition.name)).toEqual(['Active Projects'])
    expect(snapshot.sidebarSections.find((section) => section.id === 'views')?.items?.[0]).toMatchObject({
      count: '1',
      icon: 'view',
      id: 'view-active-projects',
      label: 'Active Projects',
      viewId: 'view-active-projects',
    })
  })

  it('preserves desktop type document sidebar metadata for mobile navigation', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: typeMetadataVaultFiles(),
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.typeDefinitions?.Project).toMatchObject({
      label: 'Client Work',
      listPropertiesDisplay: ['Priority', 'belongs_to'],
      order: 2,
      path: 'types/project.md',
      properties: {
        Priority: 'Medium',
        has: 'Milestone',
      },
      relationships: {
        depends_on: ['[[project-template]]'],
      },
      sort: 'property:Priority:asc',
      tone: 'red',
    })
    expect(snapshot.typeDefinitions?.Project?.rawContent).toContain('sidebar_label: Client Work')
    expect(snapshot.typeDefinitions?.Secret).toMatchObject({ visible: false })

    const typeItems = snapshot.sidebarSections.find((section) => section.id === 'types')?.items ?? []
    expect(typeItems).toEqual([
      expect.objectContaining({ count: '2', label: 'Client Work', typeName: 'Project' }),
      expect.objectContaining({ count: '1', label: 'Notes', typeName: 'Note' }),
      expect.objectContaining({ count: '0', label: 'Topics', tone: 'green', typeName: 'Topic' }),
      expect.objectContaining({ count: '3', label: 'Types', tone: 'blue', typeName: 'Type' }),
    ])
    expect(typeItems).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ typeName: 'Secret' })]),
    )
  })

  it('normalizes desktop Type document metadata aliases before building mobile navigation', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('types/project.md', `---
Is A: Type
Color: red
Icon: folder
Order: 2
Sidebar Label: Client Work
Sort: property:Priority:asc
View: editor-list
Visible: false
---
# Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.typeDefinitions?.Project).toMatchObject({
      icon: 'folder',
      label: 'Client Work',
      order: 2,
      sort: 'property:Priority:asc',
      view: 'editor-list',
      visible: false,
    })
  })

  it('derives sidebar primary counts, type counts, and folder paths from local vault notes', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('types/project.md', projectTypeContent),
        vaultFile('Writing/Projects/Active Project.md', `---
type: Project
_organized: false
---
# Active Project
`),
        vaultFile('Writing/Drafts/Organized Note.md', `---
type: Note
_organized: true
---
# Organized Note
`),
        vaultFile('Archive/Old Project.md', `---
type: Project
_archived: true
---
# Old Project
`),
      ],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.sidebarSections.find((section) => section.id === 'primary')?.items).toEqual([
      expect.objectContaining({ count: '1', id: 'inbox' }),
      expect.objectContaining({ count: '3', id: 'all-notes' }),
      expect.objectContaining({ count: '1', id: 'archive' }),
    ])
    expect(snapshot.sidebarSections.find((section) => section.id === 'types')?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ count: '1', label: 'Projects' }),
        expect.objectContaining({ count: '1', label: 'Notes' }),
      ]),
    )
    expect(flattenSidebarFolders(snapshot.sidebarSections.find((section) => section.id === 'folders')?.folders ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Writing', name: 'Writing' }),
        expect.objectContaining({ id: 'Writing/Projects', name: 'Projects' }),
        expect.objectContaining({ id: 'Writing/Drafts', name: 'Drafts' }),
      ]),
    )
  })

  it('renders explicit empty vault folders in the sidebar', () => {
    const snapshot = buildLocalVaultWorkspaceSnapshot({
      files: [
        vaultFile('Writing/Projects/Active Project.md', '# Active Project\n'),
      ],
      folderPaths: ['Writing', 'Writing/Empty'],
      vaultLabel: 'Laputa',
      vaultPath: '/Users/luca/Laputa',
    })

    expect(snapshot.folderPaths).toEqual(['Writing', 'Writing/Empty'])
    expect(flattenSidebarFolders(snapshot.sidebarSections.find((section) => section.id === 'folders')?.folders ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'Writing/Empty', name: 'Empty' }),
      ]),
    )
  })
})

function vaultFile(relativePath: string, content: string, index = 0): LocalVaultFile {
  return {
    absolutePath: `/vault/${relativePath}`,
    content,
    createdAt: 1_700_000_000_000 + index,
    modifiedAt: 1_700_000_000_000 + index,
    relativePath,
    size: content.length,
  }
}

function realVaultRelationshipFiles(): LocalVaultFile[] {
  return [
    vaultFile('project.md', projectTypeContent),
    vaultFile('tolaria-mobile.md', tolariaMobileContent),
    vaultFile('workflow-orchestration.md', workflowOrchestrationContent),
  ]
}

const projectTypeContent = `---
type: Type
color: red
icon: folder
---
# Project
`

function typeMetadataVaultFiles(): LocalVaultFile[] {
  return [
    vaultFile('types/project.md', `---
type: Type
color: red
order: 2
sidebar_label: Client Work
sort: "property:Priority:asc"
_list_properties_display:
  - Priority
  - belongs_to
Priority: Medium
has: Milestone
depends_on:
  - [[project-template]]
---
# Project
`),
    vaultFile('types/secret.md', `---
type: Type
visible: false
---
# Secret
`),
    vaultFile('types/topic.md', `---
type: Type
---
# Topic
`),
    vaultFile('projects/high.md', `---
type: Project
Priority: High
_organized: false
---
# High Project
`),
    vaultFile('projects/low.md', `---
type: Project
Priority: Low
_organized: false
---
# Low Project
`),
    vaultFile('secret.md', `---
type: Secret
_organized: false
---
# Hidden Work
`),
    vaultFile('note.md', `---
type: Note
_organized: false
---
# Plain Note
`),
  ]
}

const tolariaMobileContent = `---
type: Project
_organized: false
_width: wide
aliases:
  - Mobile App
related_to:
  - "[[workflow-orchestration|Workflow Orchestration]]"
---
# Tolaria Mobile

Use **desktop parity** first.

## Tasks

- Keep relationships typed.
- Render tables.

| Area | State |
| --- | --- |
| UI | Draft |
`

const workflowOrchestrationContent = `---
type: Note
_organized: true
---
# Workflow Orchestration

Reference note.
`

function flattenSidebarFolders(folders: MobileSidebarFolder[]): MobileSidebarFolder[] {
  return folders.flatMap((folder) => [folder, ...flattenSidebarFolders(folder.children)])
}
