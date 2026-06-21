import { useEffect, useRef, type MutableRefObject } from 'react'
import type { EditorBridge } from '@10play/tentap-editor'
import {
  nativeWysiwygMathEditBlockLatex,
  nativeWysiwygMathEditBlockSelection,
  nativeWysiwygMathEditInlineSelection,
  nativeWysiwygMathEditLogLine,
  nativeWysiwygMathEditProbeContent,
  nativeWysiwygMathEditProof,
} from '../../qa/nativeWysiwygMathEditProbe'
import { nativeWysiwygDocumentContentFromJson } from './MobileWysiwygDocumentSerialization'
import {
  nativeWysiwygDocumentWithEditableInlineMathSource,
  nativeWysiwygDocumentWithUpdatedMathBlock,
} from './MobileWysiwygMathEditBridgeModel'

type TimerHandle = ReturnType<typeof setTimeout>

type MathEditProbeEditorBridge = EditorBridge & {
  getJSON: () => Promise<unknown>
  setContent: (content: unknown) => void
}
type MathBlockRenderableEditorBridge = EditorBridge & {
  getMathBlockRenderProof: () => Promise<boolean>
}

export type NativeWysiwygMathEditProbeRefs = {
  acceptsEditorChangesRef: MutableRefObject<boolean>
  editorRef: MutableRefObject<EditorBridge | null>
}

export function useNativeWysiwygMathEditProbe({
  enabled,
  refs,
  vaultRootUri = null,
}: {
  enabled: boolean
  refs: NativeWysiwygMathEditProbeRefs
  vaultRootUri?: string | null
}) {
  const hasRunProbeRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      hasRunProbeRef.current = false
      return undefined
    }
    if (hasRunProbeRef.current) return undefined

    let probeTimer: TimerHandle | null = null
    const runProbe = () => {
      if (!refs.acceptsEditorChangesRef.current) {
        probeTimer = setTimeout(runProbe, 250)
        return
      }

      const editor = refs.editorRef.current
      if (!isMathEditProbeEditorBridge(editor)) {
        probeTimer = setTimeout(runProbe, 250)
        return
      }

      hasRunProbeRef.current = true
      void runNativeWysiwygMathEditProbe(editor, vaultRootUri)
        .catch((error: unknown) => {
          hasRunProbeRef.current = false
          console.warn('[mobile-editor] Failed to run native WYSIWYG math edit probe:', error)
          probeTimer = setTimeout(runProbe, 250)
        })
    }

    probeTimer = setTimeout(runProbe, 500)

    return () => {
      if (probeTimer) clearTimeout(probeTimer)
    }
  }, [enabled, refs, vaultRootUri])
}

async function runNativeWysiwygMathEditProbe(
  editor: MathEditProbeEditorBridge,
  vaultRootUri: string | null,
): Promise<void> {
  editor.setContent(nativeWysiwygMathEditProbeContent())
  await delay(120)

  const blockEditedJson = nativeWysiwygDocumentWithUpdatedMathBlock({
    json: await editor.getJSON(),
    latex: nativeWysiwygMathEditBlockLatex,
    selection: nativeWysiwygMathEditBlockSelection(),
  })
  if (!blockEditedJson) return

  const reopenedJson = nativeWysiwygDocumentWithEditableInlineMathSource({
    json: blockEditedJson,
    selection: nativeWysiwygMathEditInlineSelection(),
  })
  if (!reopenedJson) return

  editor.setContent(reopenedJson)
  await delay(120)

  const json = await editor.getJSON()
  const blockMathRendered = await nativeWysiwygMathEditRenderProof(editor)
  const content = nativeWysiwygDocumentContentFromJson({
    currentContent: '',
    initialBodyHasContent: true,
    isFirstSerialization: false,
    json,
    vaultRootUri,
  })
  console.info(nativeWysiwygMathEditLogLine(nativeWysiwygMathEditProof({
    blockMathRendered,
    content: content.content,
    json,
    noteId: 'native-wysiwyg-math-edit.md',
  })))
}

async function nativeWysiwygMathEditRenderProof(editor: EditorBridge): Promise<boolean> {
  if (!isMathBlockRenderableEditorBridge(editor)) return false
  await delay(80)
  return editor.getMathBlockRenderProof()
}

function isMathEditProbeEditorBridge(editor: EditorBridge | null): editor is MathEditProbeEditorBridge {
  return typeof (editor as Partial<MathEditProbeEditorBridge> | null)?.getJSON === 'function'
    && typeof (editor as Partial<MathEditProbeEditorBridge> | null)?.setContent === 'function'
}

function isMathBlockRenderableEditorBridge(
  editor: EditorBridge | null,
): editor is MathBlockRenderableEditorBridge {
  return typeof (editor as Partial<MathBlockRenderableEditorBridge> | null)?.getMathBlockRenderProof === 'function'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
