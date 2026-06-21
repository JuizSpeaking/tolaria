import {
  Check,
  Code,
  DotsThree,
  FileText,
  PencilSimple,
  Star,
} from 'phosphor-react-native'
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MobileEditorBlocks } from '../components/workspace/MobileEditorBlocks'
import { MobileMarkdownSourceEditor } from '../components/workspace/MobileMarkdownSourceEditor'
import { MobileNoteIcon, MobileTypeIcon } from '../components/workspace/MobileWorkspaceIcons'
import { MobileWysiwygMarkdownEditor } from '../components/workspace/MobileWysiwygMarkdownEditor'
import { Text } from '../components/ui/text'
import { mobileText } from '../i18n/mobileText'
import { MobileChip } from '../ui/MobileChip'
import { MobileIconButton } from '../ui/MobileIconButton'
import { MobilePanel, MobileToolbar, MobileToolbarTitle } from '../ui/MobilePanel'
import { desktopEditorParity, desktopToolbarActionParity } from '../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../ui/tokens'
import { MobileLayoutProbeReadout } from '../qa/MobileLayoutProbeReadout'
import { useMobileLayoutProbe, type MobileLayoutProbe } from '../qa/mobileLayoutProbe'
import type { MobileEditorBlock, MobileNote } from '../workspace/mobileWorkspaceModel'
import {
  type MobileTableOfContentsTarget,
} from '../workspace/mobileTableOfContents'
import {
  nativeTableOfContentsScrollProof,
  type NativeTableOfContentsProof,
} from '../qa/nativeTableOfContentsProbe'
import {
  useMobileAttachmentImporter,
  type MobileAttachmentImporter,
} from '../workspace/mobileAttachmentImport'
import {
  useMobileAttachmentLinkOpener,
  type MobileAttachmentLinkOpener,
} from '../workspace/mobileAttachmentOpen'
import {
  useRegisteredMobileEditorCommands,
  type RegisterMobileEditorCommands,
} from '../workspace/mobileEditorCommands'
import { mobileNoteActionMode } from '../workspace/mobileNoteActionMode'

type TabletEditorPanelProps = {
  blocks: MobileEditorBlock[]
  bullets: string[]
  compact: boolean
  initialEditing?: boolean
  initialEditingMode?: EditorEditingMode
  layoutProbe?: boolean
  note: MobileNote | null
  notes: MobileNote[]
  onNavigateWikilink: (target: string) => void
  onOpenMoreActions: () => void
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  onTableOfContentsScrollProof?: (proof: NativeTableOfContentsProof) => void
  onToggleFavorite: () => void
  onUpdateContent: (noteId: string, content: string) => void
  sourceIdleSave?: boolean
  sourceSelectionProbe?: boolean
  tableOfContentsTarget?: MobileTableOfContentsTarget | null
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

type EditorToolbarProps = {
  editing: boolean
  editingMode: EditorEditingMode
  fileMode: EditorFileMode
  note: MobileNote
  onOpenMoreActions: () => void
  onToggleEditing: () => void
  onToggleSourceMode: () => void
  onToggleFavorite: () => void
}

type EditorPanelBodyProps = {
  compact: boolean
  contentProps: EditorContentProps
  fileMode: EditorFileMode
  note: MobileNote
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  onScrollViewRef: (node: ScrollView | null) => void
}

type EditorContentProps = {
  blocks: MobileEditorBlock[]
  bullets: string[]
  compact: boolean
  editing: boolean
  editingMode: EditorEditingMode
  note: MobileNote
  notes: MobileNote[]
  layoutProbe: MobileLayoutProbe
  plainText: boolean
  onNavigateWikilink: (target: string) => void
  onImportAttachment?: MobileAttachmentImporter
  onOpenLink: MobileAttachmentLinkOpener
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  onUpdateContent: (noteId: string, content: string) => void
  onTableOfContentsTargetLayout: (targetId: string, event: LayoutChangeEvent) => void
  sourceIdleSave: boolean
  sourceSelectionProbe?: boolean
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
type TableOfContentsScroll = {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  onTargetLayout: (targetId: string, event: LayoutChangeEvent) => void
  setScrollViewNode: (node: ScrollView | null) => void
}

export type EditorEditingMode = 'source' | 'wysiwyg'
type EditorFileMode = 'binary' | 'markdown' | 'text'

export function TabletEditorPanel(props: TabletEditorPanelProps) {
  const {
    blocks,
    bullets,
    compact,
    initialEditing = false,
    initialEditingMode = 'wysiwyg',
    layoutProbe: layoutProbeEnabled = false,
    note,
    notes,
    onNavigateWikilink,
    onOpenMoreActions,
    onRegisterEditorCommands,
    onTableOfContentsScrollProof,
    onToggleFavorite,
    onUpdateContent,
    sourceIdleSave = true,
    sourceSelectionProbe = false,
    tableOfContentsTarget = null,
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
  } = props
  const [editing, setEditing] = useState(initialEditing)
  const [editingMode, setEditingMode] = useState<EditorEditingMode>(initialEditingMode)
  const { onScroll, onTargetLayout, setScrollViewNode } = useTableOfContentsScroll(
    tableOfContentsTarget,
    onTableOfContentsScrollProof,
  )
  const importAttachment = useMobileAttachmentImporter(vaultRootUri)
  const openLink = useMobileAttachmentLinkOpener(vaultRootUri)
  const layoutProbe = useMobileLayoutProbe(layoutProbeEnabled)
  const toggleEditing = useCallback(() => {
    setEditing((current) => {
      if (!current) setEditingMode('wysiwyg')
      return !current
    })
  }, [])
  const toggleSourceMode = useCallback(() => {
    if (!editing) {
      setEditingMode('source')
      setEditing(true)
      return
    }
    setEditingMode((current) => current === 'source' ? 'wysiwyg' : 'source')
  }, [editing])
  useRegisteredMobileEditorCommands(onRegisterEditorCommands, {
    toggleRawEditor: note && editorFileMode(note) === 'markdown' ? toggleSourceMode : undefined,
  })

  if (!note) {
    return <EmptyEditorPanel />
  }

  const fileMode = editorFileMode(note)
  const plainText = fileMode === 'text'
  const effectiveEditing = editing || plainText
  const effectiveEditingMode = plainText ? 'source' : editingMode
  const contentProps: EditorContentProps = {
    blocks,
    bullets,
    compact,
    editing: effectiveEditing,
    editingMode: effectiveEditingMode,
    layoutProbe: layoutProbe.probe,
    note,
    notes,
    onImportAttachment: importAttachment,
    onNavigateWikilink,
    onOpenLink: openLink,
    onRegisterEditorCommands,
    onTableOfContentsTargetLayout: onTargetLayout,
    onUpdateContent,
    plainText,
    sourceIdleSave,
    sourceSelectionProbe,
    vaultRootUri,
    wysiwygAutocompleteProbe,
    wysiwygExternalLinkProbe,
    wysiwygFormatCommandProbe,
    wysiwygInputTransformProbe,
    wysiwygMarkdownBlockProbe,
    wysiwygMathEditProbe,
    wysiwygTableCommandMutationProbe,
    wysiwygMutationProbe,
    wysiwygWikilinkInsertProbe,
  }

  return (
    <MobilePanel {...layoutProbe.probe('editor.panel')} style={panelStyles.panel} testID="editor-panel">
      <EditorToolbar
        editingMode={effectiveEditingMode}
        editing={effectiveEditing}
        fileMode={fileMode}
        note={note}
        onOpenMoreActions={onOpenMoreActions}
        onToggleEditing={toggleEditing}
        onToggleSourceMode={toggleSourceMode}
        onToggleFavorite={onToggleFavorite}
      />
      <EditorPanelBody
        compact={compact}
        contentProps={contentProps}
        fileMode={fileMode}
        note={note}
        onScroll={onScroll}
        onScrollViewRef={setScrollViewNode}
      />
      {layoutProbeEnabled ? <MobileLayoutProbeReadout metrics={layoutProbe.metrics} testID="editor-layout-metrics" /> : null}
    </MobilePanel>
  )
}

function EditorPanelBody({
  compact,
  contentProps,
  fileMode,
  note,
  onScroll,
  onScrollViewRef,
}: EditorPanelBodyProps) {
  if (fileMode === 'binary') {
    return (
      <ScrollView contentContainerStyle={panelStyles.filePreviewContent} testID="editor-scroll">
        <MobileFilePreviewFallback note={note} />
      </ScrollView>
    )
  }

  if (contentProps.editing) {
    return (
      <View style={panelStyles.editorHost} testID="editor-scroll">
        <EditorContent {...contentProps} />
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={readModeContentStyle(note, compact)}
      onScroll={onScroll}
      ref={onScrollViewRef}
      scrollEventThrottle={16}
      style={panelStyles.editorHost}
      testID="editor-scroll"
    >
      <EditorContent {...contentProps} />
    </ScrollView>
  )
}

function useTableOfContentsScroll(
  target: MobileTableOfContentsTarget | null,
  onProof?: (proof: NativeTableOfContentsProof) => void,
): TableOfContentsScroll {
  const [layoutVersion, setLayoutVersion] = useState(0)
  const [scrollViewVersion, setScrollViewVersion] = useState(0)
  const scrollViewRef = useRef<ScrollView | null>(null)
  const scrollYRef = useRef(0)
  const targetOffsetsRef = useRef<Record<string, number>>({})
  const setScrollViewNode = useCallback((node: ScrollView | null) => {
    scrollViewRef.current = node
    setScrollViewVersion((current) => current + 1)
  }, [])
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y
  }, [])
  const onTargetLayout = useCallback((targetId: string, event: LayoutChangeEvent) => {
    targetOffsetsRef.current[targetId] = event.nativeEvent.layout.y
    setLayoutVersion((current) => current + 1)
  }, [])

  useEffect(() => {
    if (!target) return

    const y = targetOffsetsRef.current[target.id]
    if (typeof y !== 'number') return
    const scrollView = scrollViewRef.current
    if (!scrollView) return

    const beforeY = scrollYRef.current
    const expectedY = Math.max(0, y - desktopEditorParity.contentPaddingVertical)
    scrollView.scrollTo({
      animated: true,
      y: expectedY,
    })

    if (!onProof) return

    const proofTimeout = setTimeout(() => {
      onProof(nativeTableOfContentsScrollProof({
        afterY: scrollYRef.current,
        beforeY,
        expectedY,
        targetId: target.id,
      }))
    }, 900)

    return () => clearTimeout(proofTimeout)
  }, [layoutVersion, onProof, scrollViewVersion, target])

  return { onScroll, onTargetLayout, setScrollViewNode }
}

function EditorToolbar({
  editingMode,
  editing,
  fileMode,
  note,
  onOpenMoreActions,
  onToggleEditing,
  onToggleSourceMode,
  onToggleFavorite,
}: EditorToolbarProps) {
  return (
    <MobileToolbar testID="editor-toolbar">
      <FileText color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
      <EditorToolbarIcon fileMode={fileMode} note={note} />
      <MobileToolbarTitle testID="editor-toolbar-title" title={note.title} />
      <MobileChip label={editorToolbarChipLabel(fileMode, note)} tone="gray" />
      <EditorToolbarActions
        editing={editing}
        editingMode={editingMode}
        fileMode={fileMode}
        note={note}
        onOpenMoreActions={onOpenMoreActions}
        onToggleEditing={onToggleEditing}
        onToggleFavorite={onToggleFavorite}
        onToggleSourceMode={onToggleSourceMode}
      />
    </MobileToolbar>
  )
}

function EditorToolbarIcon({
  fileMode,
  note,
}: Pick<EditorToolbarProps, 'fileMode' | 'note'>) {
  if (fileMode === 'markdown') {
    return (
      <MobileNoteIcon
        color={mobileColors.textMuted}
        icon={note.icon}
        size={desktopToolbarActionParity.iconSize}
        testID="editor-toolbar-note-icon"
      />
    )
  }

  return <MobileTypeIcon fileKind={note.fileKind} size={desktopToolbarActionParity.iconSize} tone={note.typeTone} type={note.type} />
}

function EditorToolbarActions(props: EditorToolbarProps) {
  if (props.fileMode !== 'markdown') return <FileToolbarActions {...props} />

  return <MarkdownToolbarActions {...props} />
}

function FileToolbarActions({ onOpenMoreActions }: EditorToolbarProps) {
  return (
    <MobileIconButton accessibilityLabel={mobileText('editor.toolbar.moreActions')} testID="editor-more-action" onPress={onOpenMoreActions}>
      <DotsThree color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight="bold" />
    </MobileIconButton>
  )
}

function MarkdownToolbarActions({
  editing,
  editingMode,
  note,
  onOpenMoreActions,
  onToggleEditing,
  onToggleFavorite,
  onToggleSourceMode,
}: EditorToolbarProps) {
  const sourceModeActive = editing && editingMode === 'source'

  return (
    <>
      <MobileIconButton
        accessibilityLabel={mobileText(note.favorite ? 'command.note.removeFavorite' : 'command.note.addFavorite')}
        testID="editor-favorite-action"
        onPress={onToggleFavorite}
      >
        <Star color={note.favorite ? mobileColors.primary : mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight={note.favorite ? 'fill' : 'regular'} />
      </MobileIconButton>
      <MobileIconButton
        accessibilityLabel={mobileText(editing ? 'common.save' : 'menu.edit')}
        testID="editor-edit-action"
        onPress={onToggleEditing}
      >
        <EditorToggleIcon editing={editing} />
      </MobileIconButton>
      <MobileIconButton
        accessibilityLabel={mobileText(sourceModeActive ? 'editor.toolbar.rawReturn' : 'editor.toolbar.rawOpen')}
        selected={sourceModeActive}
        testID="editor-source-action"
        onPress={onToggleSourceMode}
      >
        <Code color={sourceModeActive ? mobileColors.primary : mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
      </MobileIconButton>
      <MobileIconButton accessibilityLabel={mobileText('editor.toolbar.moreActions')} testID="editor-more-action" onPress={onOpenMoreActions}>
        <DotsThree color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight="bold" />
      </MobileIconButton>
    </>
  )
}

function EditorToggleIcon({ editing }: { editing: boolean }) {
  return editing
    ? <Check color={mobileColors.primary} size={desktopToolbarActionParity.iconSize} weight="bold" />
    : <PencilSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
}

function EditorContent({
  blocks,
  bullets,
  compact,
  editing,
  editingMode,
  layoutProbe,
  note,
  notes,
  plainText,
  onImportAttachment,
  onNavigateWikilink,
  onOpenLink,
  onRegisterEditorCommands,
  onTableOfContentsTargetLayout,
  onUpdateContent,
  sourceIdleSave,
  sourceSelectionProbe = false,
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
}: EditorContentProps) {
  if (editing) {
    if (plainText || editingMode === 'source') {
      return (
        <MobileMarkdownSourceEditor
          key={`${note.id}:${plainText ? 'text' : 'source'}`}
          blocks={blocks}
          bullets={bullets}
          compact={compact}
          note={note}
          notes={notes}
          onImportAttachment={onImportAttachment}
          onRegisterEditorCommands={onRegisterEditorCommands}
          onUpdateContent={onUpdateContent}
          idleSave={sourceIdleSave}
          plainText={plainText}
          sourceSelectionProbe={sourceSelectionProbe}
        />
      )
    }

    return (
      <MobileWysiwygMarkdownEditor
        key={`${note.id}:wysiwyg`}
        blocks={blocks}
        bullets={bullets}
        compact={compact}
        layoutProbe={layoutProbe}
        note={note}
        notes={notes}
        onImportAttachment={onImportAttachment}
        onRegisterEditorCommands={onRegisterEditorCommands}
        onUpdateContent={onUpdateContent}
        vaultRootUri={vaultRootUri}
        wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
        wysiwygExternalLinkProbe={wysiwygExternalLinkProbe}
        wysiwygFormatCommandProbe={wysiwygFormatCommandProbe}
        wysiwygInputTransformProbe={wysiwygInputTransformProbe}
        wysiwygMarkdownBlockProbe={wysiwygMarkdownBlockProbe}
        wysiwygMathEditProbe={wysiwygMathEditProbe}
        wysiwygTableCommandMutationProbe={wysiwygTableCommandMutationProbe}
        wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
        wysiwygMutationProbe={wysiwygMutationProbe}
      />
    )
  }

  return (
    <MobileEditorBlocks
      blocks={blocks}
      fallbackBullets={bullets}
      tableOfContentsTitle={note.title}
      onTableOfContentsTargetLayout={onTableOfContentsTargetLayout}
      onOpenLink={onOpenLink}
      onNavigateWikilink={onNavigateWikilink}
    />
  )
}

function editorFileMode(note: MobileNote): EditorFileMode {
  const actionMode = mobileNoteActionMode(note)
  if (actionMode === 'binary-file') return 'binary'
  return actionMode === 'text-file' ? 'text' : 'markdown'
}

function editorToolbarChipLabel(fileMode: EditorFileMode, note: MobileNote): string {
  if (fileMode === 'text') return mobileText('filePreview.textFile')
  if (fileMode === 'binary') return mobileText('filePreview.file')
  return note.workspace
}

function readModeContentStyle(note: MobileNote, compact: boolean) {
  return [
    panelStyles.content,
    note.noteWidth === 'wide' ? panelStyles.contentWide : null,
    compact ? panelStyles.contentCompact : null,
  ]
}

function MobileFilePreviewFallback({ note }: { note: MobileNote }) {
  return (
    <View style={panelStyles.filePreviewFallback} testID="file-preview-fallback">
      <MobileTypeIcon fileKind={note.fileKind} size={32} tone={note.typeTone} type={note.type} />
      <Text style={panelStyles.filePreviewTitle}>{mobileText('filePreview.previewUnavailable')}</Text>
      <Text style={panelStyles.filePreviewDescription}>{mobileText('filePreview.previewUnavailableDescription')}</Text>
    </View>
  )
}

function EmptyEditorPanel() {
  return (
    <MobilePanel style={panelStyles.panel} testID="editor-panel">
      <MobileToolbar testID="editor-toolbar">
        <FileText color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
        <MobileToolbarTitle testID="editor-toolbar-title" title={mobileText('inspector.empty.noNoteSelected')} />
      </MobileToolbar>
      <View style={panelStyles.emptyState}>
        <Text style={panelStyles.emptyTitle}>{mobileText('editor.empty.selectNote')}</Text>
      </View>
    </MobilePanel>
  )
}

const panelStyles = StyleSheet.create({
  content: {
    alignSelf: 'center',
    maxWidth: desktopEditorParity.contentMaxWidth,
    paddingHorizontal: desktopEditorParity.contentPaddingHorizontal,
    paddingVertical: desktopEditorParity.contentPaddingVertical,
    width: '100%',
  },
  contentCompact: {
    paddingHorizontal: mobileSpace.xl,
  },
  contentWide: {
    alignSelf: 'stretch',
    maxWidth: '100%',
    paddingHorizontal: 56,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: mobileSpace.xxl,
  },
  emptyTitle: {
    color: mobileColors.textMuted,
    fontSize: mobileType.title,
    fontWeight: '600',
    textAlign: 'center',
  },
  editorHost: {
    flex: 1,
  },
  filePreviewContent: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: mobileSpace.xxl,
  },
  filePreviewDescription: {
    maxWidth: 360,
    color: mobileColors.textMuted,
    fontSize: mobileType.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  filePreviewFallback: {
    alignItems: 'center',
    gap: mobileSpace.md,
  },
  filePreviewTitle: {
    color: mobileColors.text,
    fontSize: mobileType.title,
    fontWeight: '600',
  },
  panel: {
    flex: 1,
  },
})
