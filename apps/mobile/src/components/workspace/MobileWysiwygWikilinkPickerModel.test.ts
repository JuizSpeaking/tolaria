import { describe, expect, it } from 'vitest'
import type { MobileNote } from '../../workspace/mobileWorkspaceModel'
import {
  mobileWysiwygEmojiPayloadForEntry,
  mobileWysiwygEmojiPickerSuggestions,
  mobileWysiwygWikilinkPayloadForNote,
  mobileWysiwygWikilinkPickerSuggestions,
} from './MobileWysiwygWikilinkPickerModel'

describe('native WYSIWYG wikilink picker model', () => {
  it('uses the shared mobile wikilink autocomplete candidates', () => {
    const suggestions = mobileWysiwygWikilinkPickerSuggestions([
      note({
        aliases: ['Important Alpha'],
        path: 'projects/project-alpha.md',
        title: 'Project Alpha',
        type: 'Project',
      }),
      note({ archived: true, path: 'archive/alpha.md', title: 'Archived Alpha' }),
    ], 'important')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual(['Project Alpha'])
  })

  it('uses the shared mobile person mention candidates for native @ autocomplete', () => {
    const suggestions = mobileWysiwygWikilinkPickerSuggestions([
      note({ title: 'Luca', type: 'Person' }),
      note({ title: 'Luca Project', type: 'Project' }),
    ], 'luc', 'personMention')

    expect(suggestions.map((suggestion) => suggestion.title)).toEqual(['Luca'])
  })

  it('uses the shared desktop emoji catalog and ranking for native : autocomplete', () => {
    const suggestions = mobileWysiwygEmojiPickerSuggestions('rocket')
    const firstSuggestion = suggestions[0]!

    expect(firstSuggestion).toMatchObject({
      emoji: '🚀',
      name: 'rocket',
    })
    expect(mobileWysiwygEmojiPayloadForEntry(firstSuggestion)).toEqual({ text: '🚀' })
  })

  it('does not expose slash-command suggestions in the mobile picker surface', () => {
    expect(mobileWysiwygWikilinkPickerSuggestions([
      note({ title: 'Table planning' }),
    ], 'table', 'slashCommand')).toEqual([])
  })

  it('builds the native insertion payload with the note title as label and canonical path target', () => {
    expect(mobileWysiwygWikilinkPayloadForNote(note({
      path: 'Tolaria/Mobile UI/How I Run an Open Source Project.md',
      title: 'How I Run an Open Source Project',
    }))).toEqual({
      label: 'How I Run an Open Source Project',
      target: 'Tolaria/Mobile UI/How I Run an Open Source Project',
    })
  })

  it('builds cross-workspace insertion payloads with the target workspace alias', () => {
    const source = note({
      path: 'source.md',
      title: 'Source',
      workspaceAlias: 'personal',
    })
    const target = note({
      path: 'projects/alpha.md',
      title: 'Alpha',
      workspaceAlias: 'team',
    })

    expect(mobileWysiwygWikilinkPayloadForNote(target, source)).toEqual({
      label: 'Alpha',
      target: 'team/projects/alpha',
    })
  })
})

function note(overrides: Partial<MobileNote>): MobileNote {
  return {
    created: 'today',
    date: 'today',
    favorite: false,
    id: overrides.path ?? `${overrides.title ?? 'Note'}.md`,
    links: 0,
    modified: 'today',
    relationships: [],
    snippet: '',
    status: '',
    tags: [],
    title: 'Note',
    type: 'Note',
    typeTone: 'gray',
    workspace: 'Vault',
    ...overrides,
  }
}
