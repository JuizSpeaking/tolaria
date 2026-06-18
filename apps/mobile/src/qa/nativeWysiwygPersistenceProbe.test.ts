import { describe, expect, it } from 'vitest'
import { nativeWysiwygMutationProof } from './nativeWysiwygMutationProbe'
import {
  assertNativeWysiwygPersistenceProofs,
  nativeWysiwygPersistenceLogLine,
  parseNativeWysiwygPersistenceProofs,
  type NativeWysiwygPersistenceProof,
} from './nativeWysiwygPersistenceProbe'

const probePath = 'Tolaria/Mobile UI/WYSIWYG Persistence Probe.md'

describe('native WYSIWYG persistence probe', () => {
  it('passes when the saved native file still has desktop markdown boundaries', () => {
    const proof = passingPersistenceProof()

    expect(assertNativeWysiwygPersistenceProofs([proof])).toEqual([])
  })

  it('parses simulator log lines and reports native repository failures', () => {
    const proof = {
      ...passingPersistenceProof(),
      path: 'Other.md',
      persistedToNativeRepository: false,
    }
    const parsed = parseNativeWysiwygPersistenceProofs(`noise\n${nativeWysiwygPersistenceLogLine(proof)}\n`)

    expect(parsed).toEqual([proof])
    expect(assertNativeWysiwygPersistenceProofs(parsed).map((failure) => failure.id)).toEqual([
      'editor.wysiwyg.persistence.native',
      'editor.wysiwyg.persistence.path',
    ])
  })

  it('keeps mutation/frontmatter failures visible after parsing', () => {
    const proof: NativeWysiwygPersistenceProof = {
      mutation: nativeWysiwygMutationProof({
        content: '# Native WYSIWYG Mutation Probe\n\nNative bridge mutation saved through TenTap.\n',
        noteId: probePath,
      }),
      path: probePath,
      persistedToNativeRepository: true,
    }

    expect(parseNativeWysiwygPersistenceProofs(nativeWysiwygPersistenceLogLine(proof))).toEqual([proof])
    expect(assertNativeWysiwygPersistenceProofs([proof]).map((failure) => failure.id)).toEqual([
      'editor.wysiwyg.persistence.mutation.frontmatter',
      'editor.wysiwyg.persistence.mutation.type',
      'editor.wysiwyg.persistence.mutation.status',
      'editor.wysiwyg.persistence.mutation.tags',
      'editor.wysiwyg.persistence.mutation.favorite',
      'editor.wysiwyg.persistence.mutation.inline',
      'editor.wysiwyg.persistence.mutation.wikilink',
      'editor.wysiwyg.persistence.mutation.lists',
      'editor.wysiwyg.persistence.mutation.quote',
      'editor.wysiwyg.persistence.mutation.codeBlock',
      'editor.wysiwyg.persistence.mutation.divider',
      'editor.wysiwyg.persistence.mutation.table',
    ])
  })
})

function passingPersistenceProof(): NativeWysiwygPersistenceProof {
  return {
    mutation: nativeWysiwygMutationProof({
      content: [
        '---',
        'type: Essay',
        'Status: Draft',
        'tags:',
        '  - Design',
        '  - AI',
        '_favorite: true',
        '---',
        '# Native WYSIWYG Mutation Probe',
        '',
        'Native bridge mutation saved through TenTap.',
        '',
        'Formatting: **bold**, *italic*, ~~strike~~, `code`, ==highlight==, [[AI Ops Guide]].',
        '',
        '- Bullet item',
        '',
        '1. Ordered item',
        '',
        '- [x] Task item',
        '',
        '> Quoted desktop parity',
        '',
        '```ts',
        'const parity = "desktop";',
        'ship(parity)',
        '```',
        '',
        '---',
        '',
        '| Surface | Target |',
        '| --- | --- |',
        '| Editor | Native WYSIWYG |',
        '',
      ].join('\n'),
      noteId: probePath,
    }),
    path: probePath,
    persistedToNativeRepository: true,
  }
}
