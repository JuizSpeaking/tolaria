import {
  Check,
  Code,
  DotsThree,
  FileText,
  PencilSimple,
  Star,
} from 'phosphor-react-native'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useCallback, useState } from 'react'
import { MobileEditorBlocks } from '../components/workspace/MobileEditorBlocks'
import { MobileMarkdownSourceEditor } from '../components/workspace/MobileMarkdownSourceEditor'
import { MobileNoteIcon } from '../components/workspace/MobileWorkspaceIcons'
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
import { shouldRenderEditorDocumentTitle } from './tabletEditorDocumentTitle'

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
  onToggleFavorite: () => void
  onUpdateContent: (noteId: string, content: string) => void
  sourceSelectionProbe?: boolean
  wysiwygAutocompleteProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
}

type EditorToolbarProps = {
  editing: boolean
  editingMode: EditorEditingMode
  note: MobileNote
  onOpenMoreActions: () => void
  onToggleEditing: () => void
  onToggleSourceMode: () => void
  onToggleFavorite: () => void
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
  onNavigateWikilink: (target: string) => void
  onUpdateContent: (noteId: string, content: string) => void
  sourceSelectionProbe?: boolean
  wysiwygAutocompleteProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
}

export type EditorEditingMode = 'source' | 'wysiwyg'

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
    onToggleFavorite,
    onUpdateContent,
    sourceSelectionProbe = false,
    wysiwygAutocompleteProbe = false,
    wysiwygWikilinkInsertProbe = false,
    wysiwygMutationProbe = false,
  } = props
  const [editing, setEditing] = useState(initialEditing)
  const [editingMode, setEditingMode] = useState<EditorEditingMode>(initialEditingMode)
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

  if (!note) {
    return <EmptyEditorPanel />
  }

  return (
    <MobilePanel {...layoutProbe.probe('editor.panel')} style={panelStyles.panel} testID="editor-panel">
      <EditorToolbar
        editingMode={editingMode}
        editing={editing}
        note={note}
        onOpenMoreActions={onOpenMoreActions}
        onToggleEditing={toggleEditing}
        onToggleSourceMode={toggleSourceMode}
        onToggleFavorite={onToggleFavorite}
      />
      {editing ? (
        <View style={panelStyles.editorHost} testID="editor-scroll">
          <EditorContent
            blocks={blocks}
            bullets={bullets}
            compact={compact}
            editingMode={editingMode}
            editing={editing}
            layoutProbe={layoutProbe.probe}
            note={note}
            notes={notes}
            onNavigateWikilink={onNavigateWikilink}
            onUpdateContent={onUpdateContent}
            sourceSelectionProbe={sourceSelectionProbe}
            wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
            wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
            wysiwygMutationProbe={wysiwygMutationProbe}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[
          panelStyles.content,
          note.noteWidth === 'wide' ? panelStyles.contentWide : null,
          compact ? panelStyles.contentCompact : null,
        ]} testID="editor-scroll">
          <EditorContent
            blocks={blocks}
            bullets={bullets}
            compact={compact}
            editingMode={editingMode}
            editing={editing}
            layoutProbe={layoutProbe.probe}
            note={note}
            notes={notes}
            onNavigateWikilink={onNavigateWikilink}
            onUpdateContent={onUpdateContent}
            sourceSelectionProbe={sourceSelectionProbe}
            wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
            wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
            wysiwygMutationProbe={wysiwygMutationProbe}
          />
        </ScrollView>
      )}
      {layoutProbeEnabled ? <MobileLayoutProbeReadout metrics={layoutProbe.metrics} testID="editor-layout-metrics" /> : null}
    </MobilePanel>
  )
}

function EditorToolbar({
  editingMode,
  editing,
  note,
  onOpenMoreActions,
  onToggleEditing,
  onToggleSourceMode,
  onToggleFavorite,
}: EditorToolbarProps) {
  const sourceModeActive = editing && editingMode === 'source'

  return (
    <MobileToolbar testID="editor-toolbar">
      <FileText color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />
      <MobileNoteIcon color={mobileColors.textMuted} icon={note.icon} size={desktopToolbarActionParity.iconSize} testID="editor-toolbar-note-icon" />
      <MobileToolbarTitle testID="editor-toolbar-title" title={note.title} />
      <MobileChip label={note.workspace} tone="gray" />
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
        {editing
          ? <Check color={mobileColors.primary} size={desktopToolbarActionParity.iconSize} weight="bold" />
          : <PencilSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
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
    </MobileToolbar>
  )
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
  onNavigateWikilink,
  onUpdateContent,
  sourceSelectionProbe = false,
  wysiwygAutocompleteProbe = false,
  wysiwygWikilinkInsertProbe = false,
  wysiwygMutationProbe = false,
}: EditorContentProps) {
  if (editing) {
    if (editingMode === 'source') {
      return (
        <MobileMarkdownSourceEditor
          key={`${note.id}:source`}
          blocks={blocks}
          bullets={bullets}
          compact={compact}
          note={note}
          notes={notes}
          onUpdateContent={onUpdateContent}
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
        onUpdateContent={onUpdateContent}
        wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
        wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
        wysiwygMutationProbe={wysiwygMutationProbe}
      />
    )
  }

  return (
    <>
      {shouldRenderEditorDocumentTitle(note) ? (
        <View style={panelStyles.titleBlock} testID="editor-title-block">
          <Text style={[panelStyles.title, compact ? panelStyles.titleCompact : null]} testID="editor-title">{note.title}</Text>
        </View>
      ) : null}
      <MobileEditorBlocks blocks={blocks} fallbackBullets={bullets} onNavigateWikilink={onNavigateWikilink} />
    </>
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
  panel: {
    flex: 1,
  },
  title: {
    color: mobileColors.text,
    fontSize: desktopEditorParity.h1FontSize,
    fontWeight: '700',
    lineHeight: desktopEditorParity.h1LineHeight,
  },
  titleBlock: {
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: desktopEditorParity.h1MarginBottom,
    paddingBottom: desktopEditorParity.h1PaddingBottom,
  },
  titleCompact: {
    fontSize: 30,
    lineHeight: 36,
  },
})
