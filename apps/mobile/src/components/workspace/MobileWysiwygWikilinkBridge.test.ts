import { describe, expect, it } from 'vitest'
import { tiptapJsonToMobileMarkdown, type TiptapJsonNode } from '../../workspace/mobileDocumentContent'
import {
  nativeWysiwygDocumentWithInsertedWikilink,
  nativeWysiwygDocumentWithInsertedAttachment,
  nativeWysiwygDocumentWithInsertedMarkdownBlock,
  nativeWysiwygDocumentWithInsertedPlainText,
  nativeWysiwygInlineAutocompleteAtSelection,
  nativeWysiwygAttachmentContent,
  nativeWysiwygPlainTextContent,
  nativeWysiwygWikilinkContent,
  type NativeWysiwygSelection,
  type NativeWysiwygWikilinkPayload,
} from './MobileWysiwygWikilinkBridgeModel'

describe('native WYSIWYG wikilink bridge', () => {
  it('builds TenTap inline content that serializes as a desktop wikilink', () => {
    expect(nativeWysiwygWikilinkContent({
      label: 'Mobile UI',
      target: 'Tolaria/Mobile UI',
    })).toEqual([
      {
        marks: [{ attrs: { href: 'tolaria://wikilink/Tolaria%2FMobile%20UI' }, type: 'link' }],
        text: 'Mobile UI',
        type: 'text',
      },
      { text: ' ', type: 'text' },
    ])
  })

  it('falls back to the target when the display label is blank', () => {
    expect(nativeWysiwygWikilinkContent({
      label: '   ',
      target: 'AI Ops Guide',
    })?.[0]).toMatchObject({
      text: 'AI Ops Guide',
    })
  })

  it('ignores blank targets', () => {
    expect(nativeWysiwygWikilinkContent({ label: 'Empty', target: '  ' })).toBeNull()
  })

  it('builds TenTap attachment links that serialize as portable vault attachment markdown', () => {
    expect(nativeWysiwygAttachmentContent({
      mimeType: 'application/pdf',
      name: 'project brief.pdf',
      path: 'attachments/project brief.pdf',
    })).toEqual([
      {
        marks: [{ attrs: { href: 'attachments/project brief.pdf' }, type: 'link' }],
        text: 'project brief.pdf',
        type: 'text',
      },
      { text: ' ', type: 'text' },
    ])
  })

  it('builds unmarked TenTap content for paste without formatting', () => {
    expect(nativeWysiwygPlainTextContent({ text: 'Plain\nText' })).toEqual([
      { text: 'Plain', type: 'text' },
      { type: 'hardBreak' },
      { text: 'Text', type: 'text' },
    ])
  })

  it('inserts non-image attachments at the current native editor selection', () => {
    const nextDocument = nativeWysiwygDocumentWithInsertedAttachment({
      json: documentNode(paragraphNode('See  today.')),
      payload: {
        mimeType: 'application/pdf',
        name: 'project brief.pdf',
        path: 'attachments/project brief.pdf',
      },
      selection: { from: 5, to: 5 },
    })

    expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe('See [project brief.pdf](<attachments/project brief.pdf>) today.')
  })

  it('inserts image attachments as portable image blocks after the active block', () => {
    const nextDocument = nativeWysiwygDocumentWithInsertedAttachment({
      json: documentNode(paragraphNode('Intro'), paragraphNode('Tail')),
      payload: {
        mimeType: 'image/png',
        name: 'mobile diagram.png',
        path: 'attachments/mobile diagram.png',
      },
      selection: { from: 3, to: 3 },
    })

    expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe('Intro\n\n![mobile diagram.png](<attachments/mobile diagram.png>)\n\nTail')
  })

  it.each([
    ['divider', 'Intro\n\n---\n\nTail'],
    ['codeBlock', 'Intro\n\n```text\ncode\n```\n\nTail'],
    ['mathBlock', 'Intro\n\n$$\n\\sqrt{a^2 + b^2}\n$$\n\nTail'],
    ['mermaid', 'Intro\n\n```mermaid\nflowchart TD\n    edit["Switch to the raw editor to edit"]\n```\n\nTail'],
    ['table', 'Intro\n\n| Column | Value |\n| --- | --- |\n| Item | Detail |\n\nTail'],
  ] as const)('inserts native WYSIWYG %s as durable markdown source lines', (action, expectedMarkdown) => {
    const nextDocument = nativeWysiwygDocumentWithInsertedMarkdownBlock({
      json: documentNode(paragraphNode('Intro'), paragraphNode('Tail')),
      payload: { action },
      selection: { from: 3, to: 3 },
    })

    expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(expectedMarkdown)
  })

  it('inserts native WYSIWYG whiteboards as desktop durable tldraw markdown', () => {
    const nextDocument = nativeWysiwygDocumentWithInsertedMarkdownBlock({
      json: documentNode(paragraphNode('Intro'), paragraphNode('Tail')),
      payload: { action: 'whiteboard' },
      selection: { from: 3, to: 3 },
    })

    expect(tiptapJsonToMobileMarkdown(nextDocument)).toMatch(
      /^Intro\n\n```tldraw id="[^"]+" height="520"\n\{\}\n```\n\nTail$/u,
    )
  })

  it('inserts the wikilink at the current native editor selection', () => {
    expect(insertedWikilinkMarkdown({
      text: 'Read  today.',
      payload: {
        label: 'Mobile UI',
        target: 'Tolaria/Mobile UI',
      },
      selection: { from: 6, to: 6 },
    })).toBe('Read [[Tolaria/Mobile UI|Mobile UI]] today.')
  })

  it('replaces selected native editor text with the wikilink', () => {
    expect(insertedWikilinkMarkdown({
      payload: {
        label: 'AI Ops Guide',
        target: 'AI Ops Guide',
      },
      selection: { from: 6, to: 10 },
      text: 'Read this note.',
    })).toBe('Read [[AI Ops Guide]] note.')
  })

  it('replaces selected native editor text with unformatted clipboard text', () => {
    const nextDocument = nativeWysiwygDocumentWithInsertedPlainText({
      json: documentNode(paragraphNode('Paste rich here.')),
      payload: { text: 'Plain\nText' },
      selection: { from: 7, to: 11 },
    })

    expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe('Paste Plain  \nText here.')
  })

  it('falls back to appending to the first paragraph when native selection is unavailable', () => {
    const nextDocument = nativeWysiwygDocumentWithInsertedWikilink({
      json: documentNode(headingNode(1, 'Title'), paragraphNode('Body')),
      payload: {
        label: 'AI Ops Guide',
        target: 'AI Ops Guide',
      },
    })

    expect(tiptapJsonToMobileMarkdown(nextDocument)).toBe(['# Title', '', 'Body[[AI Ops Guide]]'].join('\n'))
  })

  it('detects an active native wikilink autocomplete query and replacement range', () => {
    expectAutocomplete('See [[AI', 9, {
      kind: 'wikilink',
      query: 'AI',
      range: { from: 5, to: 9 },
    })
  })

  it('detects an active native person mention autocomplete query', () => {
    expectAutocomplete('Ask @lu', 8, {
      kind: 'personMention',
      query: 'lu',
      range: { from: 5, to: 8 },
    })
  })

  it('ignores empty native person mention queries', () => {
    expect(nativeWysiwygInlineAutocompleteAtSelection({
      json: documentNode(paragraphNode('Ask @')),
      selection: { from: 6, to: 6 },
    })).toBeNull()
  })

  it('replaces an active native autocomplete query with the selected wikilink', () => {
    const autocomplete = nativeWysiwygInlineAutocompleteAtSelection({
      json: documentNode(paragraphNode('See [[AI')),
      selection: { from: 9, to: 9 },
    })

    expect(insertedWikilinkMarkdown({
      payload: {
        label: 'AI Ops Guide',
        target: 'AI Ops Guide',
      },
      selection: autocomplete?.range,
      text: 'See [[AI',
    })).toBe('See [[AI Ops Guide]]')
  })
})

function expectAutocomplete(
  text: string,
  cursor: number,
  expected: ReturnType<typeof nativeWysiwygInlineAutocompleteAtSelection>,
): void {
  expect(nativeWysiwygInlineAutocompleteAtSelection({
    json: documentNode(paragraphNode(text)),
    selection: { from: cursor, to: cursor },
  })).toEqual(expected)
}

function insertedWikilinkMarkdown({
  payload,
  selection,
  text,
}: {
  payload: NativeWysiwygWikilinkPayload
  selection?: NativeWysiwygSelection
  text: string
}): string {
  return tiptapJsonToMobileMarkdown(nativeWysiwygDocumentWithInsertedWikilink({
    json: documentNode(paragraphNode(text)),
    payload,
    selection,
  }))
}

function documentNode(...content: TiptapJsonNode[]): TiptapJsonNode {
  return { content, type: 'doc' }
}

function headingNode(level: number, text: string): TiptapJsonNode {
  return {
    attrs: { level },
    content: [{ text, type: 'text' }],
    type: 'heading',
  }
}

function paragraphNode(text: string): TiptapJsonNode {
  return {
    content: [{ text, type: 'text' }],
    type: 'paragraph',
  }
}
