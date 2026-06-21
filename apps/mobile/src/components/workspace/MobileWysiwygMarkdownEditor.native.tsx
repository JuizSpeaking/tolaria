import { RichText, TenTapStartKit, useEditorBridge, type EditorBridge } from '@10play/tentap-editor'
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import {
  mobileDocumentBody,
  mobileMarkdownBodyToTentapHtml,
  mobileNoteEditableContent,
} from '../../workspace/mobileDocumentContent'
import {
  useRegisteredMobileEditorCommands,
  type RegisterMobileEditorCommands,
} from '../../workspace/mobileEditorCommands'
import { nativeWysiwygDocumentWithInputTransforms } from '../../workspace/mobileWysiwygInputTransforms'
import { readMobileClipboardText } from '../../workspace/mobileClipboard'
import { mobileHtmlWithResolvedAttachmentUris } from '../../workspace/mobileAttachmentUris'
import type { MobileEditorBlock, MobileNote } from '../../workspace/mobileWorkspaceModel'
import { probeProps, type MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { mobileColors, mobileSpace } from '../../ui/tokens'
import { MobileMarkdownFormattingToolbar } from './MobileMarkdownFormattingToolbar'
import { mobileWysiwygTentapEditorHtml } from './MobileWysiwygTentapEditorHtml'
import { MobileCodeBlockBridge } from './MobileWysiwygCodeBlockBridge'
import { MobileMathInlineBridge } from './MobileWysiwygMathBridge'
import { MobileTableBridge } from './MobileWysiwygTableBridge'
import { mobileTentapEditorCss } from './MobileWysiwygMarkdownEditorCss'
import {
  applyNativeWysiwygFormat,
  isNativeWysiwygMarkdownBlockAction,
  nativeWysiwygFormattingActions,
  type NativeWysiwygCommandBridge,
} from './MobileWysiwygFormatCommands'
import { MobileWysiwygExternalLinkSheet } from './MobileWysiwygExternalLinkSheet'
import { nativeWysiwygDocumentWithoutExternalLink } from './MobileWysiwygExternalLinkBridgeModel'
import { nativeWysiwygInitialExternalLinkValue } from './MobileWysiwygExternalLinkSheetModel'
import {
  nativeWysiwygDocumentContentFromJson,
  nativeWysiwygShouldPublishMutationProof,
} from './MobileWysiwygDocumentSerialization'
import { MobileWysiwygWikilinkPicker } from './MobileWysiwygWikilinkPicker'
import {
  nativeWysiwygDocumentWithInsertedWikilink,
  nativeWysiwygDocumentWithInsertedAttachment,
  nativeWysiwygDocumentWithInsertedMarkdownBlock,
  nativeWysiwygDocumentWithInsertedPlainText,
  nativeWysiwygDocumentWithInsertedSlashCommandBlock,
  nativeWysiwygInlineAutocompleteAtSelection,
  type NativeWysiwygAttachmentPayload,
  type NativeWysiwygInlineAutocomplete,
  type NativeWysiwygInlineAutocompleteKind,
  type NativeWysiwygMarkdownBlockPayload,
  type NativeWysiwygPlainTextPayload,
  type NativeWysiwygSelection,
  type NativeWysiwygSlashCommandPayload,
  type NativeWysiwygWikilinkPayload,
} from './MobileWysiwygWikilinkBridgeModel'
import {
  nativeWysiwygAutocompleteLogLine,
  nativeWysiwygAutocompleteProbeSteps,
  nativeWysiwygAutocompleteProof,
} from '../../qa/nativeWysiwygAutocompleteProbe'
import {
  nativeWysiwygExternalLinkLogLine,
  nativeWysiwygExternalLinkProof,
} from '../../qa/nativeWysiwygExternalLinkProbe'
import {
  nativeWysiwygInputTransformLogLine,
  nativeWysiwygInputTransformProbeSteps,
  nativeWysiwygInputTransformProof,
  type NativeWysiwygInputTransformProbeStep,
} from '../../qa/nativeWysiwygInputTransformProbe'
import {
  nativeWysiwygWikilinkInsertLogLine,
  nativeWysiwygWikilinkInsertProof,
} from '../../qa/nativeWysiwygWikilinkInsertProbe'
import {
  nativeWysiwygMarkdownBlockProbePayloads,
  nativeWysiwygMarkdownBlockProbePlainTextPayload,
  nativeWysiwygMarkdownBlockProbeSlashCommandJson,
  nativeWysiwygMarkdownBlockProbeTableGrowthJson,
  nativeWysiwygMarkdownBlockStructuredCodeBlock,
  nativeWysiwygMarkdownBlockStructuredTable,
  publishNativeWysiwygMarkdownBlockProof,
} from '../../qa/nativeWysiwygMarkdownBlockProbe'
import { useNativeWysiwygFormatCommandProbe } from './MobileWysiwygFormatCommandProbe.native'
import { useNativeWysiwygExternalLinkProbe } from './MobileWysiwygExternalLinkProbe.native'
import { insertNativeWysiwygWikilinkProbe } from './MobileWysiwygWikilinkInsertProbe.native'
import {
  publishNativeWysiwygMutationProof,
  useNativeWysiwygMutationProbe,
} from './MobileWysiwygMutationProbe.native'
import {
  publishNativeWysiwygTableCommandMutationProof,
  useNativeWysiwygTableCommandMutationProbe,
} from './MobileWysiwygTableCommandMutationProbe.native'
import { useNativeWysiwygMathEditProbe } from './MobileWysiwygMathEditProbe.native'

type MobileWysiwygMarkdownEditorProps = {
  blocks: MobileEditorBlock[]
  bullets: string[]
  compact: boolean
  layoutProbe?: MobileLayoutProbe
  note: MobileNote
  notes: MobileNote[]
  onImportAttachment?: () => Promise<NativeWysiwygAttachmentPayload | null>
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  onUpdateContent: (noteId: string, content: string) => void
  vaultRootUri?: string | null
  wysiwygAutocompleteProbe?: boolean
  wysiwygExternalLinkProbe?: boolean
  wysiwygFormatCommandProbe?: boolean
  wysiwygInputTransformProbe?: boolean
  wysiwygMarkdownBlockProbe?: boolean
  wysiwygMathEditProbe?: boolean
  wysiwygTableCommandMutationProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
}

type JsonReadableEditorBridge = EditorBridge & {
  getJSON: () => Promise<unknown>
}

type EditorStateReadableBridge = EditorBridge & {
  getEditorState: () => {
    activeLink?: unknown
    canSetLink?: unknown
    isLinkActive?: unknown
    selection?: {
      from?: unknown
      to?: unknown
    }
  }
}
type NativeWysiwygEditorState = ReturnType<EditorStateReadableBridge['getEditorState']>
type MathInlineRenderableEditorBridge = EditorBridge & {
  getMathInlineRenderProof: () => Promise<boolean>
}
type MathBlockRenderableEditorBridge = EditorBridge & {
  getMathBlockRenderProof: () => Promise<boolean>
}

type CssInjectableEditorBridge = EditorBridge & {
  injectCSS: (css: string, tag?: string) => void
}

type TimerHandle = ReturnType<typeof setTimeout>
type NativeWysiwygInputTransformProbeTimers = {
  nextStep: TimerHandle | null
  probe: TimerHandle | null
  transform: TimerHandle | null
}
type NativeWysiwygInputTransformProbeRun = {
  editor: ContentSettableEditorBridge & SelectionSettableEditorBridge
  step: NativeWysiwygInputTransformProbeStep
}
type NativeTentapEditorBridgeOptions = Omit<MobileWysiwygMarkdownEditorProps, 'notes'> & {
  initialDocumentContent: string
  onInlineAutocomplete: NativeWysiwygInlineAutocompleteHandler
}
type NativeTentapEditorSurfaceProps = {
  editor: EditorBridge
  externalLinkState: NativeWysiwygExternalLinkSheetState | null
  flushEditorDocument: () => void
  injectEditorCss: () => void
  insertWikilink: (payload: NativeWysiwygWikilinkPayload, selection?: NativeWysiwygSelection) => void
  insertAttachment: (payload: NativeWysiwygAttachmentPayload, selection?: NativeWysiwygSelection) => void
  insertMarkdownBlock: (payload: NativeWysiwygMarkdownBlockPayload, selection?: NativeWysiwygSelection) => void
  insertPlainText: (payload: NativeWysiwygPlainTextPayload, selection?: NativeWysiwygSelection) => void
  insertSlashCommandBlock: (payload: NativeWysiwygSlashCommandPayload, selection?: NativeWysiwygSelection) => void
  layoutProbe?: MobileLayoutProbe
  notes: MobileNote[]
  onCloseExternalLinkSheet: () => void
  onCloseWikilinkPicker: () => void
  onImportAttachment?: () => Promise<NativeWysiwygAttachmentPayload | null>
  onOpenExternalLinkSheet: () => void
  onOpenToolbarWikilinkPicker: () => void
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  pickerState: NativeWysiwygPickerState | null
  sourceNote: MobileNote
}
type NativeWysiwygExternalLinkSheetState = {
  initialUrl: string
  selection?: NativeWysiwygSelection
}
type NativeTentapEditorSurfaceActions = {
  handleApplyExternalLink: (url: string) => void
  handleFormat: (action: Parameters<typeof applyNativeWysiwygFormat>[1]) => Promise<void>
  handleInsertEmoji: (payload: NativeWysiwygPlainTextPayload) => void
  handleInsertSlashCommand: (payload: NativeWysiwygSlashCommandPayload) => void
  handleInsertWikilink: (payload: NativeWysiwygWikilinkPayload) => void
  handlePastePlainText: () => void
  handleRemoveExternalLink: () => void
}
type NativeTentapEditorRefs = {
  acceptsEditorChangesRef: MutableRefObject<boolean>
  contentRef: MutableRefObject<string>
  editorReadyTimerRef: MutableRefObject<TimerHandle | null>
  editorRef: MutableRefObject<EditorBridge | null>
  firstEditorSerializationRef: MutableRefObject<boolean>
  hasAcceptedEditorChangeRef: MutableRefObject<boolean>
  inlineAutocompleteTimerRef: MutableRefObject<TimerHandle | null>
  markdownBlockProofReadyRef: MutableRefObject<boolean>
  markdownBlockRenderProofRef: MutableRefObject<boolean>
  saveTimerRef: MutableRefObject<TimerHandle | null>
  tableCommandMutationProofReadyRef: MutableRefObject<boolean>
}
type NativeWysiwygInlineAutocompleteHandler = (match: NativeWysiwygInlineAutocomplete | null) => void
type NativeWysiwygPickerState = {
  kind: NativeWysiwygInlineAutocompleteKind
  query: string
  replacementRange?: NativeWysiwygSelection
  source: 'inline' | 'toolbar'
}
type NativeWysiwygDocumentBuilder<Payload> = (request: {
  json: unknown
  payload: Payload
  selection?: NativeWysiwygSelection
}) => unknown | null
type NativeWysiwygEditorMutation<Payload> = (
  editor: EditorBridge | null,
  payload: Payload,
  selection?: NativeWysiwygSelection,
) => Promise<boolean>

type ContentSettableEditorBridge = EditorBridge & {
  setContent: (content: unknown) => void
}
type SelectionSettableEditorBridge = EditorBridge & {
  setSelection: (from: number, to: number) => void
}

const mobileTenTapBridgeExtensions = [
  ...TenTapStartKit,
  MobileCodeBlockBridge,
  MobileMathInlineBridge,
  MobileTableBridge,
]

export function MobileWysiwygMarkdownEditor({
  blocks,
  bullets,
  compact,
  layoutProbe,
  note,
  notes,
  onImportAttachment,
  onRegisterEditorCommands,
  onUpdateContent,
  vaultRootUri = null,
  wysiwygAutocompleteProbe = false,
  wysiwygExternalLinkProbe = false,
  wysiwygFormatCommandProbe = false,
  wysiwygInputTransformProbe = false,
  wysiwygMarkdownBlockProbe = false,
  wysiwygMathEditProbe = false,
  wysiwygTableCommandMutationProbe = false,
  wysiwygWikilinkInsertProbe = false,
  wysiwygMutationProbe = false,
}: MobileWysiwygMarkdownEditorProps) {
  const [pickerState, setPickerState] = useState<NativeWysiwygPickerState | null>(null)
  const [externalLinkState, setExternalLinkState] = useState<NativeWysiwygExternalLinkSheetState | null>(null)
  const handleInlineAutocomplete = useCallback((match: NativeWysiwygInlineAutocomplete | null) => {
    setPickerState((current) => inlineAutocompletePickerState(current, match))
  }, [])
  const handleOpenToolbarWikilinkPicker = useCallback(() => {
    setPickerState({
      kind: 'wikilink',
      query: '',
      source: 'toolbar',
    })
  }, [])
  const handleCloseWikilinkPicker = useCallback(() => {
    setPickerState(null)
  }, [])
  const bridge = useNativeTentapEditorBridge({
    blocks,
    bullets,
    compact,
    initialDocumentContent: initialNativeEditorContent({ blocks, bullets, note }),
    note,
    onInlineAutocomplete: handleInlineAutocomplete,
    onUpdateContent,
    vaultRootUri,
    wysiwygAutocompleteProbe,
    wysiwygExternalLinkProbe,
    wysiwygFormatCommandProbe,
    wysiwygInputTransformProbe,
    wysiwygMarkdownBlockProbe,
    wysiwygMathEditProbe,
    wysiwygTableCommandMutationProbe,
    wysiwygWikilinkInsertProbe,
    wysiwygMutationProbe,
  })
  const handleOpenExternalLinkSheet = useCallback(() => {
    setExternalLinkState({
      initialUrl: nativeWysiwygInitialExternalLinkValue(nativeWysiwygEditorState(bridge.editor)),
      selection: nativeWysiwygEditorSelection(bridge.editor),
    })
  }, [bridge.editor])
  const handleCloseExternalLinkSheet = useCallback(() => {
    setExternalLinkState(null)
  }, [])

  return (
    <NativeTentapEditorSurface
      {...bridge}
      layoutProbe={layoutProbe}
      notes={notes}
      onImportAttachment={onImportAttachment}
      onRegisterEditorCommands={onRegisterEditorCommands}
      pickerState={pickerState}
      sourceNote={note}
      externalLinkState={externalLinkState}
      onCloseExternalLinkSheet={handleCloseExternalLinkSheet}
      onCloseWikilinkPicker={handleCloseWikilinkPicker}
      onOpenExternalLinkSheet={handleOpenExternalLinkSheet}
      onOpenToolbarWikilinkPicker={handleOpenToolbarWikilinkPicker}
    />
  )
}

function NativeTentapEditorSurface({
  editor,
  externalLinkState,
  flushEditorDocument,
  injectEditorCss,
  insertAttachment,
  insertMarkdownBlock,
  insertPlainText,
  insertSlashCommandBlock,
  insertWikilink,
  layoutProbe,
  notes,
  onCloseExternalLinkSheet,
  onCloseWikilinkPicker,
  onImportAttachment,
  onOpenExternalLinkSheet,
  onOpenToolbarWikilinkPicker,
  onRegisterEditorCommands,
  pickerState,
  sourceNote,
}: NativeTentapEditorSurfaceProps) {
  const actions = useNativeTentapEditorSurfaceActions({
    editor,
    externalLinkState,
    flushEditorDocument,
    insertAttachment,
    insertMarkdownBlock,
    insertPlainText,
    insertSlashCommandBlock,
    insertWikilink,
    onCloseExternalLinkSheet,
    onCloseWikilinkPicker,
    onImportAttachment,
    onOpenExternalLinkSheet,
    onOpenToolbarWikilinkPicker,
    pickerState,
  })
  useRegisteredMobileEditorCommands(onRegisterEditorCommands, {
    pastePlainText: actions.handlePastePlainText,
    save: flushEditorDocument,
  })

  return (
    <View {...probeProps(layoutProbe, 'editor.wysiwyg.form')} style={nativeEditorStyles.container} testID="editor-wysiwyg-form">
      <RichText
        editor={editor}
        {...probeProps(layoutProbe, 'editor.wysiwyg.richText')}
        style={nativeEditorStyles.richText}
        testID="editor-wysiwyg-input"
        onLoadEnd={injectEditorCss}
      />
      <KeyboardAvoidingView
        {...probeProps(layoutProbe, 'editor.wysiwyg.toolbarHost')}
        behavior="padding"
        style={nativeEditorStyles.toolbarHost}
      >
        <MobileMarkdownFormattingToolbar
          actions={nativeWysiwygFormattingActions}
          layoutProbe={layoutProbe}
          metricId="editor.wysiwyg.toolbar"
          onFormat={actions.handleFormat}
        />
      </KeyboardAvoidingView>
      <NativeWysiwygPickerOverlay
        actions={actions}
        notes={notes}
        pickerState={pickerState}
        sourceNote={sourceNote}
        onClose={onCloseWikilinkPicker}
      />
      <NativeWysiwygExternalLinkOverlay
        actions={actions}
        externalLinkState={externalLinkState}
        onClose={onCloseExternalLinkSheet}
      />
    </View>
  )
}

function useNativeTentapEditorSurfaceActions({
  editor,
  externalLinkState,
  flushEditorDocument,
  insertAttachment,
  insertMarkdownBlock,
  insertPlainText,
  insertSlashCommandBlock,
  insertWikilink,
  onCloseExternalLinkSheet,
  onCloseWikilinkPicker,
  onImportAttachment,
  onOpenExternalLinkSheet,
  onOpenToolbarWikilinkPicker,
  pickerState,
}: Pick<
  NativeTentapEditorSurfaceProps,
  'editor'
  | 'externalLinkState'
  | 'flushEditorDocument'
  | 'insertAttachment'
  | 'insertMarkdownBlock'
  | 'insertPlainText'
  | 'insertSlashCommandBlock'
  | 'insertWikilink'
  | 'onCloseExternalLinkSheet'
  | 'onCloseWikilinkPicker'
  | 'onImportAttachment'
  | 'onOpenExternalLinkSheet'
  | 'onOpenToolbarWikilinkPicker'
  | 'pickerState'
>): NativeTentapEditorSurfaceActions {
  const handleFormat = useNativeWysiwygToolbarHandler({
    editor,
    insertAttachment,
    insertMarkdownBlock,
    insertPlainText,
    onImportAttachment,
    onOpenExternalLinkSheet,
    onOpenToolbarWikilinkPicker,
  })
  const handlePastePlainText = useCallback(() => {
    void handleFormat('pastePlainText')
  }, [handleFormat])
  const replacementRange = pickerState?.replacementRange
  const handleInsertWikilink = useCallback((payload: NativeWysiwygWikilinkPayload) => {
    insertWikilink(payload, replacementRange)
    onCloseWikilinkPicker()
  }, [insertWikilink, onCloseWikilinkPicker, replacementRange])
  const handleInsertEmoji = useCallback((payload: NativeWysiwygPlainTextPayload) => {
    insertPlainText(payload, replacementRange)
    onCloseWikilinkPicker()
  }, [insertPlainText, onCloseWikilinkPicker, replacementRange])
  const handleInsertSlashCommand = useCallback((payload: NativeWysiwygSlashCommandPayload) => {
    insertSlashCommandBlock(payload, replacementRange)
    onCloseWikilinkPicker()
  }, [insertSlashCommandBlock, onCloseWikilinkPicker, replacementRange])
  const externalLinkSelection = externalLinkState?.selection
  const handleApplyExternalLink = useCallback((url: string) => {
    applyNativeWysiwygExternalLink(editor, url, flushEditorDocument, externalLinkSelection)
    onCloseExternalLinkSheet()
  }, [editor, externalLinkSelection, flushEditorDocument, onCloseExternalLinkSheet])
  const handleRemoveExternalLink = useCallback(() => {
    applyNativeWysiwygExternalLink(editor, null, flushEditorDocument, externalLinkSelection)
    onCloseExternalLinkSheet()
  }, [editor, externalLinkSelection, flushEditorDocument, onCloseExternalLinkSheet])

  return {
    handleApplyExternalLink,
    handleFormat,
    handleInsertEmoji,
    handleInsertSlashCommand,
    handleInsertWikilink,
    handlePastePlainText,
    handleRemoveExternalLink,
  }
}

function NativeWysiwygPickerOverlay({
  actions,
  notes,
  pickerState,
  sourceNote,
  onClose,
}: {
  actions: NativeTentapEditorSurfaceActions
  notes: MobileNote[]
  pickerState: NativeWysiwygPickerState | null
  sourceNote: MobileNote
  onClose: () => void
}) {
  if (!pickerState) return null

  return (
    <MobileWysiwygWikilinkPicker
      initialQuery={pickerState.query}
      key={wikilinkPickerKey(pickerState)}
      kind={pickerState.kind}
      notes={notes}
      sourceNote={sourceNote}
      onClose={onClose}
      onSelect={actions.handleInsertWikilink}
      onSelectEmoji={actions.handleInsertEmoji}
      onSelectMarkdownBlock={actions.handleInsertSlashCommand}
    />
  )
}

function NativeWysiwygExternalLinkOverlay({
  actions,
  externalLinkState,
  onClose,
}: {
  actions: NativeTentapEditorSurfaceActions
  externalLinkState: NativeWysiwygExternalLinkSheetState | null
  onClose: () => void
}) {
  if (!externalLinkState) return null

  return (
    <MobileWysiwygExternalLinkSheet
      initialUrl={externalLinkState.initialUrl}
      onApply={actions.handleApplyExternalLink}
      onClose={onClose}
      onRemove={actions.handleRemoveExternalLink}
    />
  )
}

function useNativeWysiwygToolbarHandler({
  editor,
  insertAttachment,
  insertMarkdownBlock,
  insertPlainText,
  onImportAttachment,
  onOpenExternalLinkSheet,
  onOpenToolbarWikilinkPicker,
}: Pick<
  NativeTentapEditorSurfaceProps,
  'editor'
  | 'insertAttachment'
  | 'insertMarkdownBlock'
  | 'insertPlainText'
  | 'onImportAttachment'
  | 'onOpenExternalLinkSheet'
  | 'onOpenToolbarWikilinkPicker'
>) {
  return useCallback(async (action: Parameters<typeof applyNativeWysiwygFormat>[1]) => {
    if (action === 'attachment') return insertImportedAttachment(onImportAttachment, insertAttachment)
    if (action === 'link') return onOpenExternalLinkSheet()
    if (action === 'pastePlainText') return insertClipboardPlainText(insertPlainText)
    if (action === 'wikilink') return onOpenToolbarWikilinkPicker()
    if (isNativeWysiwygMarkdownBlockAction(action)) return insertMarkdownBlock({ action })

    applyNativeWysiwygFormat(editor as NativeWysiwygCommandBridge, action)
  }, [
    editor,
    insertAttachment,
    insertMarkdownBlock,
    insertPlainText,
    onImportAttachment,
    onOpenExternalLinkSheet,
    onOpenToolbarWikilinkPicker,
  ])
}

async function insertImportedAttachment(
  onImportAttachment: NativeTentapEditorSurfaceProps['onImportAttachment'],
  insertAttachment: NativeTentapEditorSurfaceProps['insertAttachment'],
) {
  const attachment = await onImportAttachment?.()
  if (attachment) insertAttachment(attachment)
}

async function insertClipboardPlainText(
  insertPlainText: NativeTentapEditorSurfaceProps['insertPlainText'],
) {
  const text = await readMobileClipboardText()
  if (text) insertPlainText({ text })
}

function initialNativeEditorContent(
  props: Pick<MobileWysiwygMarkdownEditorProps, 'blocks' | 'bullets' | 'note'>,
): string {
  const { blocks, bullets, note } = props
  return mobileNoteEditableContent({
    ...note,
    editorBlocks: note.editorBlocks ?? blocks,
    editorBullets: bullets,
  })
}

function useNativeTentapEditorBridge({
  blocks,
  bullets,
  compact,
  initialDocumentContent,
  note,
  onInlineAutocomplete,
  onUpdateContent,
  vaultRootUri = null,
  wysiwygAutocompleteProbe = false,
  wysiwygExternalLinkProbe = false,
  wysiwygFormatCommandProbe = false,
  wysiwygInputTransformProbe = false,
  wysiwygMarkdownBlockProbe = false,
  wysiwygMathEditProbe = false,
  wysiwygTableCommandMutationProbe = false,
  wysiwygWikilinkInsertProbe = false,
  wysiwygMutationProbe = false,
}: NativeTentapEditorBridgeOptions) {
  const initialBody = mobileDocumentBody(initialDocumentContent)
  const initialBodyHasContent = initialBody.trim().length > 0
  const [initialContent] = useState(() => mobileHtmlWithResolvedAttachmentUris(
    mobileMarkdownBodyToTentapHtml(initialBody),
    vaultRootUri,
  ))
  const refs = useNativeTentapEditorRefs(initialDocumentContent)

  const flushEditorDocument = useFlushEditorDocument({
    externalLinkProbeEnabled: wysiwygExternalLinkProbe,
    initialBodyHasContent,
    markdownBlockProbeEnabled: wysiwygMarkdownBlockProbe,
    mutationProbeEnabled: wysiwygMutationProbe,
    noteId: note.id,
    onUpdateContent,
    refs,
    tableCommandMutationProbeEnabled: wysiwygTableCommandMutationProbe,
    vaultRootUri,
    wikilinkInsertProbeEnabled: wysiwygWikilinkInsertProbe,
  })
  const scheduleEditorChange = useScheduleEditorChange(refs, flushEditorDocument, onInlineAutocomplete)
  const injectEditorCss = useEditorCssInjection({ compact, noteWidth: note.noteWidth, refs })
  const insertWikilink = useNativeWysiwygInserter({
    flushEditorDocument,
    insertIntoEditor: insertWikilinkIntoNativeEditor,
    refs,
    warning: '[mobile-editor] Failed to insert native WYSIWYG wikilink:',
  })
  const insertAttachment = useNativeWysiwygInserter({
    flushEditorDocument,
    insertIntoEditor: insertAttachmentIntoNativeEditor,
    refs,
    warning: '[mobile-editor] Failed to insert native WYSIWYG attachment:',
  })
  const insertMarkdownBlock = useNativeWysiwygInserter({
    flushEditorDocument,
    insertIntoEditor: insertMarkdownBlockIntoNativeEditor,
    refs,
    warning: '[mobile-editor] Failed to insert native WYSIWYG markdown block:',
  })
  const insertSlashCommandBlock = useNativeWysiwygInserter({
    flushEditorDocument,
    insertIntoEditor: insertSlashCommandBlockIntoNativeEditor,
    refs,
    warning: '[mobile-editor] Failed to insert native WYSIWYG slash command block:',
  })
  const insertPlainText = useNativeWysiwygInserter({
    flushEditorDocument,
    insertIntoEditor: insertPlainTextIntoNativeEditor,
    refs,
    warning: '[mobile-editor] Failed to insert native WYSIWYG plain text:',
  })

  const editor = useEditorBridge({
    avoidIosKeyboard: true,
    bridgeExtensions: mobileTenTapBridgeExtensions,
    customSource: mobileWysiwygTentapEditorHtml,
    initialContent,
    onChange: scheduleEditorChange,
  })

  useEditorBridgeRef(refs.editorRef, editor)
  useEditableContentRef({ blocks, bullets, note, refs })
  useResetEditorChangeGate({ initialContent, noteId: note.id, refs })
  useNativeWysiwygAutocompleteProbe({ enabled: wysiwygAutocompleteProbe, refs })
  useNativeWysiwygExternalLinkProbe({
    enabled: wysiwygExternalLinkProbe,
    flushEditorDocument,
    refs,
  })
  useNativeWysiwygInputTransformProbe({ enabled: wysiwygInputTransformProbe, refs })
  useNativeWysiwygFormatCommandProbe({ enabled: wysiwygFormatCommandProbe, refs })
  useNativeWysiwygMathEditProbe({ enabled: wysiwygMathEditProbe, refs, vaultRootUri })
  useNativeWysiwygDeferredInsertionProbe({
    enabled: wysiwygMarkdownBlockProbe,
    flushEditorDocument,
    insertIntoEditor: (candidateEditor) => insertNativeWysiwygMarkdownBlockProbe(candidateEditor, refs),
    refs,
    warning: '[mobile-editor] Failed to run native WYSIWYG markdown block probe:',
  })
  useNativeWysiwygDeferredInsertionProbe({
    enabled: wysiwygWikilinkInsertProbe,
    flushEditorDocument,
    insertIntoEditor: insertNativeWysiwygWikilinkProbe,
    refs,
    warning: '[mobile-editor] Failed to run native WYSIWYG wikilink insert probe:',
  })
  useNativeWysiwygTableCommandMutationProbe({
    enabled: wysiwygTableCommandMutationProbe,
    flushEditorDocument,
    refs,
  })
  useNativeWysiwygMutationProbe({ enabled: wysiwygMutationProbe, flushEditorDocument, refs, vaultRootUri })
  useFlushOnUnmount(refs, flushEditorDocument)

  return {
    editor,
    flushEditorDocument,
    injectEditorCss,
    insertAttachment,
    insertMarkdownBlock,
    insertPlainText,
    insertSlashCommandBlock,
    insertWikilink,
  }
}

function useNativeTentapEditorRefs(initialDocumentContent: string): NativeTentapEditorRefs {
  const acceptsEditorChangesRef = useRef(false)
  const contentRef = useRef(initialDocumentContent)
  const editorReadyTimerRef = useRef<TimerHandle | null>(null)
  const editorRef = useRef<EditorBridge | null>(null)
  const firstEditorSerializationRef = useRef(true)
  const hasAcceptedEditorChangeRef = useRef(false)
  const inlineAutocompleteTimerRef = useRef<TimerHandle | null>(null)
  const markdownBlockProofReadyRef = useRef(false)
  const markdownBlockRenderProofRef = useRef(false)
  const saveTimerRef = useRef<TimerHandle | null>(null)
  const tableCommandMutationProofReadyRef = useRef(false)

  return useMemo(() => ({
    acceptsEditorChangesRef,
    contentRef,
    editorReadyTimerRef,
    editorRef,
    firstEditorSerializationRef,
    hasAcceptedEditorChangeRef,
    inlineAutocompleteTimerRef,
    markdownBlockProofReadyRef,
    markdownBlockRenderProofRef,
    saveTimerRef,
    tableCommandMutationProofReadyRef,
  }), [
    acceptsEditorChangesRef,
    contentRef,
    editorReadyTimerRef,
    editorRef,
    firstEditorSerializationRef,
    hasAcceptedEditorChangeRef,
    inlineAutocompleteTimerRef,
    markdownBlockProofReadyRef,
    markdownBlockRenderProofRef,
    saveTimerRef,
    tableCommandMutationProofReadyRef,
  ])
}

function useFlushEditorDocument({
  externalLinkProbeEnabled,
  initialBodyHasContent,
  markdownBlockProbeEnabled,
  mutationProbeEnabled,
  noteId,
  onUpdateContent,
  refs,
  tableCommandMutationProbeEnabled,
  vaultRootUri,
  wikilinkInsertProbeEnabled,
}: {
  externalLinkProbeEnabled: boolean
  initialBodyHasContent: boolean
  markdownBlockProbeEnabled: boolean
  mutationProbeEnabled: boolean
  noteId: string
  onUpdateContent: (noteId: string, content: string) => void
  refs: NativeTentapEditorRefs
  tableCommandMutationProbeEnabled: boolean
  vaultRootUri?: string | null
  wikilinkInsertProbeEnabled: boolean
}) {
  return useCallback(() => {
    flushEditorDocumentFromBridge({
      externalLinkProbeEnabled,
      initialBodyHasContent,
      markdownBlockProbeEnabled,
      mutationProbeEnabled,
      noteId,
      onUpdateContent,
      refs,
      tableCommandMutationProbeEnabled,
      vaultRootUri,
      wikilinkInsertProbeEnabled,
    })
  }, [
    externalLinkProbeEnabled,
    initialBodyHasContent,
    markdownBlockProbeEnabled,
    mutationProbeEnabled,
    noteId,
    onUpdateContent,
    refs,
    tableCommandMutationProbeEnabled,
    vaultRootUri,
    wikilinkInsertProbeEnabled,
  ])
}

function flushEditorDocumentFromBridge({
  externalLinkProbeEnabled,
  initialBodyHasContent,
  markdownBlockProbeEnabled,
  mutationProbeEnabled,
  noteId,
  onUpdateContent,
  refs,
  tableCommandMutationProbeEnabled,
  vaultRootUri,
  wikilinkInsertProbeEnabled,
}: {
  externalLinkProbeEnabled: boolean
  initialBodyHasContent: boolean
  markdownBlockProbeEnabled: boolean
  mutationProbeEnabled: boolean
  noteId: string
  onUpdateContent: (noteId: string, content: string) => void
  refs: NativeTentapEditorRefs
  tableCommandMutationProbeEnabled: boolean
  vaultRootUri?: string | null
  wikilinkInsertProbeEnabled: boolean
}) {
  const editor = refs.editorRef.current
  if (!isJsonReadableEditorBridge(editor)) return

  void editor.getJSON()
    .then((json) => writeEditorJsonToMarkdown({
      externalLinkProbeEnabled,
      initialBodyHasContent,
      json,
      markdownBlockProbeEnabled,
      mutationProbeEnabled,
      noteId,
      onUpdateContent,
      refs,
      tableCommandMutationProbeEnabled,
      vaultRootUri,
      wikilinkInsertProbeEnabled,
    }))
    .catch((error: unknown) => {
      console.warn('[mobile-editor] Failed to read TenTap JSON:', error)
    })
}

function writeEditorJsonToMarkdown({
  externalLinkProbeEnabled,
  initialBodyHasContent,
  json,
  markdownBlockProbeEnabled,
  mutationProbeEnabled,
  noteId,
  onUpdateContent,
  refs,
  tableCommandMutationProbeEnabled,
  vaultRootUri,
  wikilinkInsertProbeEnabled,
}: {
  externalLinkProbeEnabled: boolean
  initialBodyHasContent: boolean
  json: unknown
  markdownBlockProbeEnabled: boolean
  mutationProbeEnabled: boolean
  noteId: string
  onUpdateContent: (noteId: string, content: string) => void
  refs: NativeTentapEditorRefs
  tableCommandMutationProbeEnabled: boolean
  vaultRootUri?: string | null
  wikilinkInsertProbeEnabled: boolean
}) {
  const nextContent = nativeWysiwygDocumentContentFromJson({
    currentContent: refs.contentRef.current,
    initialBodyHasContent,
    isFirstSerialization: refs.firstEditorSerializationRef.current,
    json,
    vaultRootUri,
  })
  refs.firstEditorSerializationRef.current = false
  const contentChanged = !nextContent.skipped && nextContent.content !== refs.contentRef.current
  if (contentChanged) {
    onUpdateContent(noteId, nextContent.content)
    if (shouldPublishMarkdownBlockProof(markdownBlockProbeEnabled, refs)) {
      publishNativeWysiwygMarkdownBlockProof({
        codeBlockStructured: nativeWysiwygMarkdownBlockStructuredCodeBlock(json),
        content: nextContent.content,
        mathBlockRendered: refs.markdownBlockRenderProofRef.current,
        noteId,
        tableStructured: nativeWysiwygMarkdownBlockStructuredTable(json),
      })
    }
    if (wikilinkInsertProbeEnabled) publishNativeWysiwygWikilinkInsertProof(noteId, nextContent.content)
    if (externalLinkProbeEnabled) publishNativeWysiwygExternalLinkProof(noteId, nextContent.content)
  }
  if (nativeWysiwygShouldPublishMutationProof({ mutationProbeEnabled, skipped: nextContent.skipped })) {
    publishNativeWysiwygMutationProof(noteId, nextContent.content, json)
  }
  if (!nextContent.skipped && shouldPublishTableCommandMutationProof(tableCommandMutationProbeEnabled, refs)) {
    publishNativeWysiwygTableCommandMutationProof({ content: nextContent.content, json, noteId })
  }
}

function shouldPublishMarkdownBlockProof(
  markdownBlockProbeEnabled: boolean,
  refs: NativeTentapEditorRefs,
): boolean {
  if (!markdownBlockProbeEnabled) return false
  if (!refs.markdownBlockProofReadyRef.current) return false
  return Platform.OS !== 'web'
}

function shouldPublishTableCommandMutationProof(
  tableCommandMutationProbeEnabled: boolean,
  refs: NativeTentapEditorRefs,
): boolean {
  if (!tableCommandMutationProbeEnabled) return false
  if (!refs.tableCommandMutationProofReadyRef.current) return false
  return Platform.OS !== 'web'
}

function useNativeWysiwygAutocompleteProbe({
  enabled,
  refs,
}: {
  enabled: boolean
  refs: NativeTentapEditorRefs
}) {
  useEffect(() => {
    if (!enabled) return undefined

    let detectTimer: TimerHandle | null = null
    let nextStepTimer: TimerHandle | null = null
    let probeTimer: TimerHandle | null = null
    const runProbe = (stepIndex = 0) => {
      if (!refs.acceptsEditorChangesRef.current) {
        probeTimer = setTimeout(() => runProbe(stepIndex), 250)
        return
      }

      const editor = refs.editorRef.current
      if (!isContentSettableEditorBridge(editor) || !isSelectionSettableEditorBridge(editor)) return

      const step = nativeWysiwygAutocompleteProbeSteps()[stepIndex]
      if (!step) return

      editor.setContent(step.content)
      const selection = step.selection
      editor.setSelection(selection.from, selection.to)
      detectTimer = setTimeout(() => {
        void detectNativeWysiwygInlineAutocomplete(editor)
          .then((match) => {
            console.info(nativeWysiwygAutocompleteLogLine(nativeWysiwygAutocompleteProof(match, step.scenario)))
            nextStepTimer = setTimeout(() => runProbe(stepIndex + 1), 250)
          })
          .catch((error: unknown) => {
            console.warn('[mobile-editor] Failed to run native WYSIWYG autocomplete probe:', error)
          })
      }, 500)
    }

    probeTimer = setTimeout(runProbe, 500)

    return () => {
      if (detectTimer) clearTimeout(detectTimer)
      if (nextStepTimer) clearTimeout(nextStepTimer)
      if (probeTimer) clearTimeout(probeTimer)
    }
  }, [enabled, refs])
}

function useNativeWysiwygInputTransformProbe({
  enabled,
  refs,
}: {
  enabled: boolean
  refs: NativeTentapEditorRefs
}) {
  useEffect(() => {
    if (!enabled) return undefined

    const timers: NativeWysiwygInputTransformProbeTimers = {
      nextStep: null,
      probe: null,
      transform: null,
    }
    const runProbe = (stepIndex = 0) => {
      const run = nativeWysiwygInputTransformProbeRun({
        onRetry: () => {
          timers.probe = setTimeout(() => runProbe(stepIndex), 250)
        },
        refs,
        stepIndex,
      })
      if (!run) return

      run.editor.setContent(run.step.content)
      run.editor.setSelection(run.step.selection.from, run.step.selection.to)
      timers.transform = setTimeout(() => {
        void runNativeWysiwygInputTransformProbeStep(run.editor, run.step)
          .then(() => {
            timers.nextStep = setTimeout(() => runProbe(stepIndex + 1), 250)
          })
          .catch((error: unknown) => {
            console.warn('[mobile-editor] Failed to run native WYSIWYG input transform probe:', error)
          })
      }, 500)
    }

    timers.probe = setTimeout(runProbe, 500)

    return () => clearNativeWysiwygInputTransformProbeTimers(timers)
  }, [enabled, refs])
}

function nativeWysiwygInputTransformProbeRun({
  onRetry,
  refs,
  stepIndex,
}: {
  onRetry: () => void
  refs: NativeTentapEditorRefs
  stepIndex: number
}): NativeWysiwygInputTransformProbeRun | null {
  if (!refs.acceptsEditorChangesRef.current) {
    onRetry()
    return null
  }

  const editor = refs.editorRef.current
  if (!isContentSettableEditorBridge(editor) || !isSelectionSettableEditorBridge(editor)) return null

  const step = nativeWysiwygInputTransformProbeSteps()[stepIndex]
  return step ? { editor, step } : null
}

function clearNativeWysiwygInputTransformProbeTimers(
  timers: NativeWysiwygInputTransformProbeTimers,
) {
  clearTimer(timers.nextStep)
  clearTimer(timers.probe)
  clearTimer(timers.transform)
}

function clearTimer(timer: TimerHandle | null) {
  if (timer) clearTimeout(timer)
}

async function runNativeWysiwygInputTransformProbeStep(
  editor: EditorBridge,
  step: NativeWysiwygInputTransformProbeStep,
): Promise<void> {
  if (!isJsonReadableEditorBridge(editor) || !isContentSettableEditorBridge(editor)) return

  const json = await editor.getJSON()
  const insertedJson = nativeWysiwygDocumentWithInsertedPlainText({
    json,
    payload: { text: step.input },
    selection: step.selection,
  })
  if (!insertedJson) return

  const selection = {
    from: step.selection.from + step.input.length,
    to: step.selection.to + step.input.length,
  }
  const nextJson = nativeWysiwygDocumentWithInputTransforms({
    json: insertedJson,
    selection,
  })
  if (nextJson) editor.setContent(nextJson)
  const mathInlineRendered = nextJson ? await nativeWysiwygInputTransformMathRenderProof(editor) : false

  console.info(nativeWysiwygInputTransformLogLine(nativeWysiwygInputTransformProof({
    json: nextJson ?? insertedJson,
    mathInlineRendered,
    step: step.step,
    transformed: nextJson !== null,
  })))
}

async function nativeWysiwygInputTransformMathRenderProof(editor: EditorBridge): Promise<boolean> {
  if (!isMathInlineRenderableEditorBridge(editor)) return false
  await settleNativeWysiwygEditorContent()
  return editor.getMathInlineRenderProof()
}

async function nativeWysiwygBlockMathRenderProof(editor: EditorBridge): Promise<boolean> {
  if (!isMathBlockRenderableEditorBridge(editor)) return false
  await settleNativeWysiwygEditorContent()
  return editor.getMathBlockRenderProof()
}

function settleNativeWysiwygEditorContent(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 60)
  })
}

function publishNativeWysiwygWikilinkInsertProof(noteId: string, content: string): void {
  if (Platform.OS === 'web') return

  console.info(nativeWysiwygWikilinkInsertLogLine(nativeWysiwygWikilinkInsertProof({ content, noteId })))
}

function publishNativeWysiwygExternalLinkProof(noteId: string, content: string): void {
  if (Platform.OS === 'web') return

  console.info(nativeWysiwygExternalLinkLogLine(nativeWysiwygExternalLinkProof({ content, noteId })))
}

function useNativeWysiwygInserter<Payload>({
  flushEditorDocument,
  insertIntoEditor,
  refs,
  warning,
}: {
  flushEditorDocument: () => void
  insertIntoEditor: NativeWysiwygEditorMutation<Payload>
  refs: NativeTentapEditorRefs
  warning: string
}) {
  const { editorRef, hasAcceptedEditorChangeRef, saveTimerRef } = refs

  return useCallback((payload: Payload, selection?: NativeWysiwygSelection) => {
    void insertIntoEditor(editorRef.current, payload, selection)
      .then((inserted) => {
        if (!inserted) return

        hasAcceptedEditorChangeRef.current = true
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
        saveTimerRef.current = setTimeout(flushEditorDocument, 250)
      })
      .catch((error: unknown) => {
        console.warn(warning, error)
      })
  }, [editorRef, flushEditorDocument, hasAcceptedEditorChangeRef, insertIntoEditor, saveTimerRef, warning])
}

async function insertWikilinkIntoNativeEditor(
  editor: EditorBridge | null,
  payload: NativeWysiwygWikilinkPayload,
  selection?: NativeWysiwygSelection,
): Promise<boolean> {
  return insertPayloadIntoNativeEditor(editor, payload, selection, nativeWysiwygDocumentWithInsertedWikilink)
}

async function insertAttachmentIntoNativeEditor(
  editor: EditorBridge | null,
  payload: NativeWysiwygAttachmentPayload,
  selection?: NativeWysiwygSelection,
): Promise<boolean> {
  return insertPayloadIntoNativeEditor(editor, payload, selection, nativeWysiwygDocumentWithInsertedAttachment)
}

async function insertMarkdownBlockIntoNativeEditor(
  editor: EditorBridge | null,
  payload: NativeWysiwygMarkdownBlockPayload,
  selection?: NativeWysiwygSelection,
): Promise<boolean> {
  return insertPayloadIntoNativeEditor(editor, payload, selection, nativeWysiwygDocumentWithInsertedMarkdownBlock)
}

async function insertSlashCommandBlockIntoNativeEditor(
  editor: EditorBridge | null,
  payload: NativeWysiwygSlashCommandPayload,
  selection?: NativeWysiwygSelection,
): Promise<boolean> {
  return insertPayloadIntoNativeEditor(editor, payload, selection, nativeWysiwygDocumentWithInsertedSlashCommandBlock)
}

async function insertPlainTextIntoNativeEditor(
  editor: EditorBridge | null,
  payload: NativeWysiwygPlainTextPayload,
  selection?: NativeWysiwygSelection,
): Promise<boolean> {
  return insertPayloadIntoNativeEditor(editor, payload, selection, nativeWysiwygDocumentWithInsertedPlainText)
}

async function insertMarkdownBlocksIntoNativeEditor(
  editor: EditorBridge | null,
  payloads: NativeWysiwygMarkdownBlockPayload[],
  refs: NativeTentapEditorRefs,
): Promise<boolean> {
  if (!isJsonReadableEditorBridge(editor) || !isContentSettableEditorBridge(editor)) return false

  let nextJson: unknown = await editor.getJSON()
  const plainTextJson = nativeWysiwygDocumentWithInsertedPlainText({
    json: nextJson,
    payload: nativeWysiwygMarkdownBlockProbePlainTextPayload(),
  })
  if (!plainTextJson) return false

  nextJson = plainTextJson
  for (const payload of payloads) {
    const insertedJson = nativeWysiwygDocumentWithInsertedMarkdownBlock({ json: nextJson, payload })
    if (!insertedJson) return false
    nextJson = insertedJson
  }
  nextJson = nativeWysiwygMarkdownBlockProbeTableGrowthJson(nextJson)
  nextJson = nativeWysiwygMarkdownBlockProbeSlashCommandJson(nextJson)
  editor.setContent(nextJson)
  refs.markdownBlockRenderProofRef.current = await nativeWysiwygBlockMathRenderProof(editor)
  refs.markdownBlockProofReadyRef.current = true
  return true
}

function insertNativeWysiwygMarkdownBlockProbe(
  editor: EditorBridge | null,
  refs: NativeTentapEditorRefs,
): Promise<boolean> {
  return insertMarkdownBlocksIntoNativeEditor(editor, nativeWysiwygMarkdownBlockProbePayloads(), refs)
}

async function insertPayloadIntoNativeEditor<Payload>(
  editor: EditorBridge | null,
  payload: Payload,
  selection: NativeWysiwygSelection | undefined,
  buildDocument: NativeWysiwygDocumentBuilder<Payload>,
): Promise<boolean> {
  if (!isJsonReadableEditorBridge(editor) || !isContentSettableEditorBridge(editor)) return false

  const json = await editor.getJSON()
  const nextJson = buildDocument({
    json,
    payload,
    selection: selection ?? nativeWysiwygEditorSelection(editor),
  })
  if (!nextJson) return false

  editor.setContent(nextJson)
  return true
}

function nativeWysiwygEditorSelection(editor: EditorBridge): NativeWysiwygSelection | undefined {
  const selection = nativeWysiwygEditorState(editor)?.selection
  if (typeof selection?.from !== 'number' || typeof selection.to !== 'number') return undefined

  return {
    from: selection.from,
    to: selection.to,
  }
}

function nativeWysiwygEditorState(editor: EditorBridge | null): NativeWysiwygEditorState | null {
  return isEditorStateReadableBridge(editor) ? editor.getEditorState() : null
}

function applyNativeWysiwygExternalLink(
  editor: EditorBridge,
  url: string | null,
  flushEditorDocument: () => void,
  selection?: NativeWysiwygSelection,
): void {
  if (selection && isSelectionSettableEditorBridge(editor)) {
    editor.setSelection(selection.from, selection.to)
  }
  if (url === null) {
    void removeNativeWysiwygExternalLink(editor, selection, flushEditorDocument)
    return
  }

  const commandBridge = editor as NativeWysiwygCommandBridge
  if (typeof commandBridge.setLink !== 'function') return

  commandBridge.setLink(url)
  setTimeout(flushEditorDocument, 250)
}

async function removeNativeWysiwygExternalLink(
  editor: EditorBridge,
  selection: NativeWysiwygSelection | undefined,
  flushEditorDocument: () => void,
): Promise<void> {
  if (!isJsonReadableEditorBridge(editor) || !isContentSettableEditorBridge(editor)) return

  const nextJson = nativeWysiwygDocumentWithoutExternalLink({
    json: await editor.getJSON(),
    selection,
  })
  if (!nextJson) return

  editor.setContent(nextJson)
  setTimeout(flushEditorDocument, 250)
}

function useNativeWysiwygDeferredInsertionProbe({
  enabled,
  flushEditorDocument,
  insertIntoEditor,
  refs,
  warning,
}: {
  enabled: boolean
  flushEditorDocument: () => void
  insertIntoEditor: (editor: EditorBridge | null) => Promise<boolean>
  refs: NativeTentapEditorRefs
  warning: string
}) {
  const hasInsertedRef = useRef(false)

  useEffect(() => {
    if (!enabled) {
      hasInsertedRef.current = false
      return undefined
    }
    if (hasInsertedRef.current) return undefined

    let insertTimer: TimerHandle | null = null
    let disposed = false
    const scheduleRetry = () => {
      if (disposed) return
      insertTimer = setTimeout(insertWhenReady, 250)
    }
    const insertWhenReady = () => {
      if (!refs.acceptsEditorChangesRef.current) {
        scheduleRetry()
        return
      }

      const editor = refs.editorRef.current
      hasInsertedRef.current = true
      void insertIntoEditor(editor)
        .then((inserted) => {
          if (!inserted) {
            hasInsertedRef.current = false
            scheduleRetry()
            return
          }

          refs.hasAcceptedEditorChangeRef.current = true
          if (refs.saveTimerRef.current) clearTimeout(refs.saveTimerRef.current)
          flushEditorDocument()
          refs.saveTimerRef.current = setTimeout(flushEditorDocument, 250)
        })
        .catch((error: unknown) => {
          hasInsertedRef.current = false
          console.warn(warning, error)
          scheduleRetry()
        })
    }

    scheduleRetry()

    return () => {
      disposed = true
      if (insertTimer) clearTimeout(insertTimer)
      if (refs.saveTimerRef.current) clearTimeout(refs.saveTimerRef.current)
    }
  }, [enabled, flushEditorDocument, insertIntoEditor, refs, warning])
}

function inlineAutocompletePickerState(
  current: NativeWysiwygPickerState | null,
  match: NativeWysiwygInlineAutocomplete | null,
): NativeWysiwygPickerState | null {
  if (current?.source === 'toolbar') return current
  if (!match) return current?.source === 'inline' ? null : current

  return {
    kind: match.kind,
    query: match.query,
    replacementRange: match.range,
    source: 'inline',
  }
}

function wikilinkPickerKey(state: NativeWysiwygPickerState): string {
  return [
    state.source,
    state.kind,
    state.query,
    state.replacementRange?.from ?? 'selection',
    state.replacementRange?.to ?? 'selection',
  ].join(':')
}

function useScheduleEditorChange(
  refs: NativeTentapEditorRefs,
  flushEditorDocument: () => void,
  onInlineAutocomplete: NativeWysiwygInlineAutocompleteHandler,
) {
  const {
    acceptsEditorChangesRef,
    editorRef,
    hasAcceptedEditorChangeRef,
    inlineAutocompleteTimerRef,
    saveTimerRef,
  } = refs

  return useCallback(() => {
    if (!acceptsEditorChangesRef.current) return
    hasAcceptedEditorChangeRef.current = true
    scheduleNativeWysiwygSave({ flushEditorDocument, saveTimerRef })
    if (inlineAutocompleteTimerRef.current) clearTimeout(inlineAutocompleteTimerRef.current)
    inlineAutocompleteTimerRef.current = setTimeout(() => {
      void applyNativeWysiwygInputTransforms(editorRef.current)
        .then((transformed) => {
          if (transformed) scheduleNativeWysiwygSave({ flushEditorDocument, saveTimerRef })
          return detectNativeWysiwygInlineAutocomplete(editorRef.current)
        })
        .then(onInlineAutocomplete)
        .catch((error: unknown) => {
          console.warn('[mobile-editor] Failed to run native WYSIWYG change handlers:', error)
        })
    }, 80)
  }, [
    acceptsEditorChangesRef,
    editorRef,
    flushEditorDocument,
    hasAcceptedEditorChangeRef,
    inlineAutocompleteTimerRef,
    onInlineAutocomplete,
    saveTimerRef,
  ])
}

function scheduleNativeWysiwygSave({
  flushEditorDocument,
  saveTimerRef,
}: {
  flushEditorDocument: () => void
  saveTimerRef: MutableRefObject<TimerHandle | null>
}) {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  saveTimerRef.current = setTimeout(flushEditorDocument, 250)
}

async function applyNativeWysiwygInputTransforms(
  editor: EditorBridge | null,
): Promise<boolean> {
  if (!isJsonReadableEditorBridge(editor) || !isContentSettableEditorBridge(editor)) return false

  const nextJson = nativeWysiwygDocumentWithInputTransforms({
    json: await editor.getJSON(),
    selection: nativeWysiwygEditorSelection(editor),
  })
  if (!nextJson) return false

  editor.setContent(nextJson)
  return true
}

async function detectNativeWysiwygInlineAutocomplete(
  editor: EditorBridge | null,
): Promise<NativeWysiwygInlineAutocomplete | null> {
  if (!isJsonReadableEditorBridge(editor)) return null

  return nativeWysiwygInlineAutocompleteAtSelection({
    json: await editor.getJSON(),
    selection: nativeWysiwygEditorSelection(editor),
  })
}

function useEditorCssInjection({
  compact,
  noteWidth,
  refs,
}: {
  compact: boolean
  noteWidth: MobileNote['noteWidth']
  refs: NativeTentapEditorRefs
}) {
  const { acceptsEditorChangesRef, editorReadyTimerRef, editorRef } = refs

  return useCallback(() => {
    if (isCssInjectableEditorBridge(editorRef.current)) {
      editorRef.current.injectCSS(mobileTentapEditorCss(compact, noteWidth), 'tolaria-editor')
    }
    if (editorReadyTimerRef.current) clearTimeout(editorReadyTimerRef.current)
    editorReadyTimerRef.current = setTimeout(() => {
      acceptsEditorChangesRef.current = true
    }, 750)
  }, [acceptsEditorChangesRef, compact, editorReadyTimerRef, editorRef, noteWidth])
}

function useEditorBridgeRef(
  editorRef: MutableRefObject<EditorBridge | null>,
  editor: EditorBridge,
) {
  useEffect(() => {
    editorRef.current = editor
  }, [editor, editorRef])
}

function useEditableContentRef({
  blocks,
  bullets,
  note,
  refs,
}: {
  blocks: MobileEditorBlock[]
  bullets: string[]
  note: MobileNote
  refs: NativeTentapEditorRefs
}) {
  const { contentRef } = refs

  useEffect(() => {
    contentRef.current = mobileNoteEditableContent({
      ...note,
      editorBlocks: note.editorBlocks ?? blocks,
      editorBullets: bullets,
    })
  }, [blocks, bullets, contentRef, note])
}

function useResetEditorChangeGate({
  initialContent,
  noteId,
  refs,
}: {
  initialContent: string
  noteId: string
  refs: NativeTentapEditorRefs
}) {
  const {
    acceptsEditorChangesRef,
    firstEditorSerializationRef,
    hasAcceptedEditorChangeRef,
    markdownBlockProofReadyRef,
    markdownBlockRenderProofRef,
    tableCommandMutationProofReadyRef,
  } = refs

  useEffect(() => {
    acceptsEditorChangesRef.current = false
    firstEditorSerializationRef.current = true
    hasAcceptedEditorChangeRef.current = false
    markdownBlockProofReadyRef.current = false
    markdownBlockRenderProofRef.current = false
    tableCommandMutationProofReadyRef.current = false
  }, [
    acceptsEditorChangesRef,
    firstEditorSerializationRef,
    hasAcceptedEditorChangeRef,
    initialContent,
    markdownBlockProofReadyRef,
    markdownBlockRenderProofRef,
    noteId,
    tableCommandMutationProofReadyRef,
  ])
}

function useFlushOnUnmount(
  refs: NativeTentapEditorRefs,
  flushEditorDocument: () => void,
) {
  useEffect(() => () => {
    if (refs.editorReadyTimerRef.current) clearTimeout(refs.editorReadyTimerRef.current)
    if (refs.inlineAutocompleteTimerRef.current) clearTimeout(refs.inlineAutocompleteTimerRef.current)
    if (refs.saveTimerRef.current) clearTimeout(refs.saveTimerRef.current)
    if (refs.hasAcceptedEditorChangeRef.current) flushEditorDocument()
  }, [flushEditorDocument, refs])
}

function isJsonReadableEditorBridge(editor: EditorBridge | null): editor is JsonReadableEditorBridge {
  return typeof (editor as Partial<JsonReadableEditorBridge> | null)?.getJSON === 'function'
}

function isCssInjectableEditorBridge(editor: EditorBridge | null): editor is CssInjectableEditorBridge {
  return typeof (editor as Partial<CssInjectableEditorBridge> | null)?.injectCSS === 'function'
}

function isEditorStateReadableBridge(editor: EditorBridge | null): editor is EditorStateReadableBridge {
  return typeof (editor as Partial<EditorStateReadableBridge> | null)?.getEditorState === 'function'
}

function isMathInlineRenderableEditorBridge(
  editor: EditorBridge | null,
): editor is MathInlineRenderableEditorBridge {
  return typeof (editor as Partial<MathInlineRenderableEditorBridge> | null)?.getMathInlineRenderProof === 'function'
}

function isMathBlockRenderableEditorBridge(
  editor: EditorBridge | null,
): editor is MathBlockRenderableEditorBridge {
  return typeof (editor as Partial<MathBlockRenderableEditorBridge> | null)?.getMathBlockRenderProof === 'function'
}

function isContentSettableEditorBridge(editor: EditorBridge | null): editor is ContentSettableEditorBridge {
  return typeof (editor as Partial<ContentSettableEditorBridge> | null)?.setContent === 'function'
}

function isSelectionSettableEditorBridge(editor: EditorBridge | null): editor is SelectionSettableEditorBridge {
  return typeof (editor as Partial<SelectionSettableEditorBridge> | null)?.setSelection === 'function'
}

const nativeEditorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mobileColors.editor,
  },
  richText: {
    flex: 1,
    backgroundColor: mobileColors.editor,
  },
  toolbarHost: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: mobileColors.editor,
    borderTopColor: mobileColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: mobileSpace.md,
    paddingTop: mobileSpace.xs,
  },
})
