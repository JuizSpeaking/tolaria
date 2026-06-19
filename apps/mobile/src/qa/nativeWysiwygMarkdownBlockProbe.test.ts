import { describe, expect, it } from 'vitest'
import {
  assertNativeWysiwygMarkdownBlockProofs,
  formatNativeWysiwygMarkdownBlockFailures,
  nativeWysiwygMarkdownBlockLogLine,
  nativeWysiwygMarkdownBlockProbeEnabled,
  nativeWysiwygMarkdownBlockProbePayloads,
  nativeWysiwygMarkdownBlockProof,
  parseNativeWysiwygMarkdownBlockProofs,
} from './nativeWysiwygMarkdownBlockProbe'

describe('native WYSIWYG markdown block probe', () => {
  it('uses the canonical native markdown block payloads', () => {
    expect(nativeWysiwygMarkdownBlockProbePayloads()).toEqual([
      { action: 'divider' },
      { action: 'codeBlock' },
      { action: 'mathBlock' },
      { action: 'mermaid' },
      { action: 'table' },
      { action: 'whiteboard' },
    ])
  })

  it('builds a passing proof when inserted blocks save as desktop markdown', () => {
    expect(nativeWysiwygMarkdownBlockProof({
      content: [
        '# Note',
        '',
        '---',
        '',
        '```text',
        'code',
        '```',
        '',
        '$$',
        '\\sqrt{a^2 + b^2}',
        '$$',
        '',
        '```mermaid',
        'flowchart TD',
        '    edit["Switch to the raw editor to edit"]',
        '```',
        '',
        '| Column | Value |',
        '| --- | --- |',
        '| Item | Detail |',
        '',
        '```tldraw id="board-1" height="520"',
        '{}',
        '```',
      ].join('\n'),
      noteId: 'note.md',
    })).toMatchObject({
      codeBlockSaved: true,
      dividerSaved: true,
      mathBlockSaved: true,
      mermaidSaved: true,
      noteId: 'note.md',
      tableSaved: true,
      whiteboardSaved: true,
    })
  })

  it('does not confuse frontmatter delimiters with an inserted divider', () => {
    expect(nativeWysiwygMarkdownBlockProof({
      content: [
        '---',
        'title: Note',
        '---',
        '',
        '```text',
        'code',
        '```',
        '',
        '$$',
        '\\sqrt{a^2 + b^2}',
        '$$',
        '',
        '```mermaid',
        'flowchart TD',
        '    edit["Switch to the raw editor to edit"]',
        '```',
        '',
        '| Column | Value |',
        '| --- | --- |',
        '| Item | Detail |',
        '',
        '```tldraw id="board-1" height="520"',
        '{}',
        '```',
      ].join('\n'),
      noteId: 'note.md',
    })).toMatchObject({
      codeBlockSaved: true,
      dividerSaved: false,
      mathBlockSaved: true,
      mermaidSaved: true,
      tableSaved: true,
      whiteboardSaved: true,
    })
  })

  it('parses and asserts simulator log proofs', () => {
    const proof = nativeWysiwygMarkdownBlockProof({
      content: [
        'Intro',
        '',
        '---',
        '',
        '```text',
        'code',
        '```',
        '',
        '$$',
        '\\sqrt{a^2 + b^2}',
        '$$',
        '',
        '```mermaid',
        'flowchart TD',
        '    edit["Switch to the raw editor to edit"]',
        '```',
        '',
        '| Column | Value |',
        '| --- | --- |',
        '| Item | Detail |',
        '',
        '```tldraw id="board-1" height="520"',
        '{}',
        '```',
      ].join('\n'),
      noteId: 'note.md',
    })

    expect(parseNativeWysiwygMarkdownBlockProofs(nativeWysiwygMarkdownBlockLogLine(proof))).toEqual([proof])
    expect(assertNativeWysiwygMarkdownBlockProofs([proof])).toEqual([])
  })

  it('reports missing and failed block proofs', () => {
    expect(formatNativeWysiwygMarkdownBlockFailures(
      assertNativeWysiwygMarkdownBlockProofs([]),
    )).toContain('editor.wysiwyg.markdownBlocks')
    expect(assertNativeWysiwygMarkdownBlockProofs([
      nativeWysiwygMarkdownBlockProof({ content: '# Note', noteId: 'note.md' }),
    ])).toEqual([
      {
        id: 'editor.wysiwyg.markdownBlocks.divider',
        message: 'Native WYSIWYG divider insertion saves as desktop horizontal-rule markdown',
      },
      {
        id: 'editor.wysiwyg.markdownBlocks.codeBlock',
        message: 'Native WYSIWYG code-block insertion saves as desktop fenced-code markdown',
      },
      {
        id: 'editor.wysiwyg.markdownBlocks.mathBlock',
        message: 'Native WYSIWYG math insertion saves as desktop display-math markdown',
      },
      {
        id: 'editor.wysiwyg.markdownBlocks.mermaid',
        message: 'Native WYSIWYG Mermaid insertion saves as desktop fenced-diagram markdown',
      },
      {
        id: 'editor.wysiwyg.markdownBlocks.table',
        message: 'Native WYSIWYG table insertion saves as desktop markdown table source lines',
      },
      {
        id: 'editor.wysiwyg.markdownBlocks.whiteboard',
        message: 'Native WYSIWYG whiteboard insertion saves as desktop tldraw fenced markdown',
      },
    ])
  })

  it('detects the native QA query flag', () => {
    expect(nativeWysiwygMarkdownBlockProbeEnabled(new globalThis.URLSearchParams('wysiwygMarkdownBlockProbe=1'))).toBe(true)
    expect(nativeWysiwygMarkdownBlockProbeEnabled(new globalThis.URLSearchParams('wysiwygMarkdownBlockProbe=0'))).toBe(false)
  })
})
