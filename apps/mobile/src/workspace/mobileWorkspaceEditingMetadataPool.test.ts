import { describe, expect, it } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import { applyMobileWorkspaceEditWithWrites, type MobileWorkspaceWrite } from './mobileWorkspaceEditing'
import type { MobileNote } from './mobileWorkspaceModel'

describe('mobile workspace metadata note pools', () => {
  it('plans inbound wikilink writes when allNotes is metadata-only', () => {
    const base = workspaceScenarioForId('default')
    const source = {
      ...base.notes[0],
      rawContent: '# Workflow Orchestration Essay\n\nMove me.\n',
    }
    const referrer = {
      ...base.notes[1],
      id: 'Refs.md',
      path: 'Refs.md',
      rawContent: movedReferenceContent(),
    }
    const result = applyMobileWorkspaceEditWithWrites({
      ...base,
      allNotes: [metadataOnlyNote(source), metadataOnlyNote(referrer)],
      folderPaths: ['Writing/Essays'],
      notes: [source, referrer],
    }, {
      filenameStem: 'manual-name.md',
      noteId: source.id,
      type: 'renameNoteFile',
    })

    expect(result.writes).toContainEqual({
      kind: 'moveNote',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      toPath: 'Tolaria/Mobile UI/manual-name.md',
    })
    expectSaveNoteContent(result.writes, 'Refs.md', [
      '[[Tolaria/Mobile UI/manual-name|Workflow]]',
      '[[Tolaria/Mobile UI/manual-name|essay]]',
    ])
  })
})

function metadataOnlyNote(note: MobileNote): MobileNote {
  return {
    ...note,
    editorBlocks: undefined,
    editorBullets: undefined,
    rawContent: undefined,
  }
}

function movedReferenceContent() {
  return [
    '---',
    'related_to:',
    '  - [[Workflow Orchestration Essay]]',
    'belongs_to:',
    '  - [[Tolaria/Mobile UI/Workflow Orchestration Essay|Workflow]]',
    '---',
    '# Ref',
    '',
    'See [[Tolaria/Mobile UI/Workflow Orchestration Essay|essay]] before launch.',
    '',
  ].join('\n')
}

function expectSaveNoteContent(
  writes: MobileWorkspaceWrite[],
  path: string,
  fragments: string[],
) {
  const write = writes.find((candidate): candidate is SaveNoteWrite => (
    candidate.kind === 'saveNote' && candidate.path === path
  ))

  expect(write?.content).toContain(fragments[0])
  expect(write?.content).toContain(fragments[1])
  expect(write?.content).not.toContain('Workflow Orchestration Essay')
}

type SaveNoteWrite = Extract<MobileWorkspaceWrite, { kind: 'saveNote' }>
