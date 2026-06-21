import { describe, expect, it } from 'vitest'
import { tiptapJsonToMobileMarkdown } from '../workspace/mobileDocumentContent'
import {
  nativeWysiwygDocumentWithEditableInlineMathSource,
  nativeWysiwygDocumentWithUpdatedMathBlock,
} from '../components/workspace/MobileWysiwygMathEditBridgeModel'
import {
  assertNativeWysiwygMathEditProofs,
  formatNativeWysiwygMathEditFailures,
  nativeWysiwygMathEditBlockLatex,
  nativeWysiwygMathEditBlockSelection,
  nativeWysiwygMathEditInlineSelection,
  nativeWysiwygMathEditLogLine,
  nativeWysiwygMathEditProbeContent,
  nativeWysiwygMathEditProbeEnabled,
  nativeWysiwygMathEditProof,
  parseNativeWysiwygMathEditProofs,
} from './nativeWysiwygMathEditProbe'

describe('native WYSIWYG math edit probe', () => {
  it('builds a deterministic native math edit document and selections', () => {
    expect(nativeWysiwygMathEditInlineSelection()).toEqual({ from: 8, to: 9 })
    expect(nativeWysiwygMathEditBlockSelection()).toEqual({ from: 17, to: 18 })
    expect(tiptapJsonToMobileMarkdown(nativeWysiwygMathEditProbeContent()).trim()).toContain('Inline $x^2$ source')
  })

  it('parses and asserts successful simulator log proofs', () => {
    const editedBlock = nativeWysiwygDocumentWithUpdatedMathBlock({
      json: nativeWysiwygMathEditProbeContent(),
      latex: nativeWysiwygMathEditBlockLatex,
      selection: nativeWysiwygMathEditBlockSelection(),
    })
    const edited = nativeWysiwygDocumentWithEditableInlineMathSource({
      json: editedBlock,
      selection: nativeWysiwygMathEditInlineSelection(),
    })
    const proof = nativeWysiwygMathEditProof({
      blockMathRendered: true,
      content: tiptapJsonToMobileMarkdown(edited),
      json: edited,
      noteId: 'note.md',
    })
    const logText = nativeWysiwygMathEditLogLine(proof)

    expect(parseNativeWysiwygMathEditProofs(logText)).toEqual([proof])
    expect(assertNativeWysiwygMathEditProofs([proof])).toEqual([])
  })

  it('reports missing and failed math edit proof fields', () => {
    expect(formatNativeWysiwygMathEditFailures(assertNativeWysiwygMathEditProofs([]))).toContain('editor.wysiwyg.mathEdit')
    expect(assertNativeWysiwygMathEditProofs([
      nativeWysiwygMathEditProof({
        blockMathRendered: false,
        content: 'Inline $x^2$ source',
        json: nativeWysiwygMathEditProbeContent(),
        noteId: 'note.md',
      }),
    ])).toEqual(expect.arrayContaining([
      {
        id: 'editor.wysiwyg.mathEdit.inlineNodeRemoved',
        message: 'Native WYSIWYG removes the inline math atom after reopening source',
      },
      {
        id: 'editor.wysiwyg.mathEdit.blockMath',
        message: 'Native WYSIWYG updates display math in the existing math block',
      },
      {
        id: 'editor.wysiwyg.mathEdit.blockRendered',
        message: 'Native WYSIWYG display math still renders as MathML after editing',
      },
    ]))
  })

  it('detects the native QA query flag', () => {
    expect(nativeWysiwygMathEditProbeEnabled(new globalThis.URLSearchParams('wysiwygMathEditProbe=1'))).toBe(true)
    expect(nativeWysiwygMathEditProbeEnabled(new globalThis.URLSearchParams('wysiwygMathEditProbe=0'))).toBe(false)
  })
})
