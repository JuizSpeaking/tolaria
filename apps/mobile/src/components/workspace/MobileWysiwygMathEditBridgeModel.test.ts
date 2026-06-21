import { describe, expect, it } from 'vitest'
import { tiptapJsonToMobileMarkdown } from '../../workspace/mobileDocumentContent'
import {
  nativeWysiwygDocumentHasInlineMathNode,
  nativeWysiwygDocumentHasInlineMathSource,
  nativeWysiwygDocumentWithEditableInlineMathSource,
  nativeWysiwygDocumentWithUpdatedMathBlock,
} from './MobileWysiwygMathEditBridgeModel'

describe('native WYSIWYG math edit bridge model', () => {
  it('reopens selected inline math as editable desktop markdown source', () => {
    const nextDocument = nativeWysiwygDocumentWithEditableInlineMathSource({
      json: mathProbeDocument(),
      selection: { from: 8, to: 9 },
    })

    expect(nextDocument?.content?.[0]).toMatchObject({
      content: [
        { text: 'Inline ', type: 'text' },
        { text: '$x^2$', type: 'text' },
        { text: ' source', type: 'text' },
      ],
      type: 'paragraph',
    })
    expect(nativeWysiwygDocumentHasInlineMathNode(nextDocument)).toBe(false)
    expect(nativeWysiwygDocumentHasInlineMathSource(nextDocument, 'x^2')).toBe(true)
    expect(tiptapJsonToMobileMarkdown(nextDocument).trim()).toContain('Inline $x^2$ source')
  })

  it('updates selected display math while preserving surrounding nodes', () => {
    const nextDocument = nativeWysiwygDocumentWithUpdatedMathBlock({
      json: mathProbeDocument(),
      latex: 'y = mx + b',
      selection: { from: 17, to: 18 },
    })

    expect(nextDocument).toMatchObject({
      content: [
        { type: 'paragraph' },
        { attrs: { latex: 'y = mx + b' }, type: 'mathBlock' },
        { type: 'paragraph' },
      ],
      type: 'doc',
    })
    expect(tiptapJsonToMobileMarkdown(nextDocument).trim()).toContain('$$\ny = mx + b\n$$')
  })

  it('targets the first math node of the requested kind when no selection is available', () => {
    const nextDocument = nativeWysiwygDocumentWithUpdatedMathBlock({
      json: mathProbeDocument(),
      latex: '\\int_0^1 x dx',
    })

    expect(tiptapJsonToMobileMarkdown(nextDocument).trim()).toContain('$$\n\\int_0^1 x dx\n$$')
  })

  it('does not edit when the selected range targets a different math kind', () => {
    expect(nativeWysiwygDocumentWithUpdatedMathBlock({
      json: mathProbeDocument(),
      latex: 'noop',
      selection: { from: 8, to: 9 },
    })).toBeNull()
  })
})

function mathProbeDocument() {
  return {
    content: [
      {
        content: [
          { text: 'Inline ', type: 'text' },
          { attrs: { latex: 'x^2' }, type: 'mathInline' },
          { text: ' source', type: 'text' },
        ],
        type: 'paragraph',
      },
      {
        attrs: { latex: 'E = mc^2' },
        type: 'mathBlock',
      },
      {
        content: [{ text: 'Tail', type: 'text' }],
        type: 'paragraph',
      },
    ],
    type: 'doc',
  }
}
