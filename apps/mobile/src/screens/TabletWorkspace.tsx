import { useCallback, useEffect, useMemo, useState } from 'react'
import { Animated as NativeAnimated, Dimensions, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { CaretLeft, CaretRight, SidebarSimple } from 'phosphor-react-native'
import { MobileCommandPalette } from '../components/workspace/MobileCommandPalette'
import { MobileNoteListPanel } from '../components/workspace/MobileNoteListPanel'
import { MobilePropertiesPanel } from '../components/workspace/MobilePropertiesPanel'
import { MobileSyncStatusBar } from '../components/workspace/MobileSyncStatusBar'
import { MobileWorkspaceActionSheet } from '../components/workspace/MobileWorkspaceActionSheet'
import { MobileWorkspaceSidebar } from '../components/workspace/MobileWorkspaceSidebar'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import {
  fixtureReadOnlyWorkspaceRepository,
  type ReadOnlyWorkspaceRepository,
  type ReadOnlyWorkspaceRequest,
} from '../workspace/readOnlyWorkspaceRepository'
import { desktopPanelParity } from '../ui/desktopParity'
import { mobileColors } from '../ui/tokens'
import { MobileIconButton } from '../ui/MobileIconButton'
import { mobileText } from '../i18n/mobileText'
import { useHorizontalSwipe } from '../ui/useHorizontalSwipe'
import { useMobileEditorCommandRegistry, type RegisterMobileEditorCommands } from '../workspace/mobileEditorCommands'
import { mobileNoteIdForWikilinkTarget } from '../workspace/mobileWikilinks'
import { buildMobileCommandPaletteCommands } from '../workspace/mobileCommandPalette'
import { useMobileWorkspaceKeyboardShortcuts } from '../workspace/mobileWorkspaceKeyboardShortcuts'
import { logNativeMobileCommandPaletteProof } from '../qa/nativeMobileCommandPaletteProbe'
import {
  mobileTableOfContentsHeadingTargetId,
  type MobileTableOfContentsTarget,
} from '../workspace/mobileTableOfContents'
import { TabletEditorPanel } from './TabletEditorPanel'
import { tabletScreenModeForWindow } from './tabletWorkspaceScreenMode'
import type { TabletPanel, TabletWorkspaceChromeProps } from './tabletWorkspaceTypes'
import { useTabletWorkspaceController } from './useTabletWorkspaceController'
import { useMobileInspectorReferenceGroups } from './useMobileInspectorReferenceGroups'
import {
  tabletLeftChromeDragOffset,
  tabletLeftChromeWidth,
  tabletPanelTransitionDurationMs,
  tabletPropertiesDragOffset,
} from './tabletWorkspacePanelTransitions'

export function TabletWorkspace({
  forceDesktopPanels = false,
  initialEditorEditing = true,
  initialEditorEditingMode = 'wysiwyg',
  commandPaletteProbe = false,
  layoutProbe = false,
  onOpenNativeVault,
  onTableOfContentsScrollProof,
  repository = fixtureReadOnlyWorkspaceRepository,
  repositoryRequest,
  sourceIdleSave = true,
  sourceSelectionProbe = false,
  snapshot,
  tableOfContentsProbe = false,
  wysiwygAutocompleteProbe = false,
  wysiwygExternalLinkProbe = false,
  wysiwygFormatCommandProbe = false,
  wysiwygInputTransformProbe = false,
  wysiwygMarkdownBlockProbe = false,
  wysiwygMathEditProbe = false,
  wysiwygTableCommandMutationProbe = false,
  wysiwygWikilinkInsertProbe = false,
  wysiwygMutationProbe = false,
}: {
  forceDesktopPanels?: boolean
  initialEditorEditing?: boolean
  initialEditorEditingMode?: TabletWorkspaceChromeProps['initialEditorEditingMode']
  commandPaletteProbe?: boolean
  layoutProbe?: boolean
  onOpenNativeVault?: () => void
  onTableOfContentsScrollProof?: TabletWorkspaceChromeProps['onTableOfContentsScrollProof']
  repository?: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  sourceIdleSave?: boolean
  sourceSelectionProbe?: boolean
  snapshot: MobileWorkspaceSnapshot
  tableOfContentsProbe?: boolean
  wysiwygAutocompleteProbe?: boolean
  wysiwygExternalLinkProbe?: boolean
  wysiwygFormatCommandProbe?: boolean
  wysiwygInputTransformProbe?: boolean
  wysiwygMarkdownBlockProbe?: boolean
  wysiwygMathEditProbe?: boolean
  wysiwygTableCommandMutationProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
}) {
  const controller = useTabletWorkspaceController({ repository, repositoryRequest, snapshot })
  const { compactTablet, defaultPropertiesVisible } = useTabletScreenMode(forceDesktopPanels)

  return (
    <View style={styles.shellRoot}>
      <TabletWorkspaceChrome
        compactTablet={compactTablet}
        commandPaletteProbe={commandPaletteProbe}
        defaultPropertiesVisible={defaultPropertiesVisible}
        initialEditorEditing={initialEditorEditing}
        initialEditorEditingMode={initialEditorEditingMode}
        layoutProbe={layoutProbe}
        onOpenNativeVault={onOpenNativeVault}
        onTableOfContentsScrollProof={onTableOfContentsScrollProof}
        sourceIdleSave={sourceIdleSave}
        sourceSelectionProbe={sourceSelectionProbe}
        tableOfContentsProbe={tableOfContentsProbe}
        wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
        wysiwygExternalLinkProbe={wysiwygExternalLinkProbe}
        wysiwygFormatCommandProbe={wysiwygFormatCommandProbe}
        wysiwygInputTransformProbe={wysiwygInputTransformProbe}
        wysiwygMarkdownBlockProbe={wysiwygMarkdownBlockProbe}
        wysiwygMathEditProbe={wysiwygMathEditProbe}
        wysiwygTableCommandMutationProbe={wysiwygTableCommandMutationProbe}
        wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
        wysiwygMutationProbe={wysiwygMutationProbe}
        {...controller}
      />
      <MobileSyncStatusBar sync={controller.snapshot.sync} onOpenLocalVault={onOpenNativeVault} />
    </View>
  )
}

function useTabletScreenMode(forceDesktopPanels: boolean) {
  const { height, width } = useWindowDimensions()
  const screen = Dimensions.get('screen')
  const nativeIpad = Platform.OS === 'ios' && Platform.isPad

  return tabletScreenModeForWindow({
    forceDesktopPanels,
    height,
    nativeIpad,
    screenHeight: screen.height,
    screenWidth: screen.width,
    width,
  })
}

function TabletWorkspaceChrome(props: TabletWorkspaceChromeProps) {
  const { commandPaletteProbe, compactTablet, defaultPropertiesVisible, onOpenNativeVault, onSelectNote, snapshot } = props
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [tableOfContentsTarget, setTableOfContentsTarget] = useState<TabletTableOfContentsTargetRequest | null>(null)
  const editorCommandRegistry = useMobileEditorCommandRegistry()
  const gestures = useTabletPanelGestures(compactTablet, defaultPropertiesVisible)
  const suggestionNotes = snapshot.allNotes ?? snapshot.notes
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), [])
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), [])
  const selectNextNote = useCallback(() => selectAdjacentVisibleNote(props.notes, props.selectedNoteId, props.onSelectNote, 1), [props.notes, props.onSelectNote, props.selectedNoteId])
  const selectPreviousNote = useCallback(() => selectAdjacentVisibleNote(props.notes, props.selectedNoteId, props.onSelectNote, -1), [props.notes, props.onSelectNote, props.selectedNoteId])
  useMobileWorkspaceKeyboardShortcuts({
    onCreateNote: props.onOpenCreateNote,
    onOpenFindInNote: props.onOpenFindInNote,
    onOpenCommandPalette: openCommandPalette,
    onOpenSearch: props.onOpenSearch,
    onSelectNextNote: selectNextNote,
    onSelectPreviousNote: selectPreviousNote,
    onToggleRawEditor: editorCommandRegistry.commands.toggleRawEditor,
  })
  const commandPaletteCommands = useMemo(() => buildMobileCommandPaletteCommands({
    ...props,
    onOpenCommandPalette: openCommandPalette,
    onOpenBacklinks: gestures.showProperties,
    onOpenNativeVault,
    onPastePlainText: editorCommandRegistry.commands.pastePlainText,
    onSaveActiveEditor: editorCommandRegistry.commands.save,
    onToggleRawEditor: editorCommandRegistry.commands.toggleRawEditor,
    onToggleProperties: gestures.toggleProperties,
    onViewAll: gestures.showAllPanels,
    onViewEditorList: gestures.showEditorList,
    onViewEditorOnly: gestures.showEditorOnly,
  }), [editorCommandRegistry.commands.pastePlainText, editorCommandRegistry.commands.save, editorCommandRegistry.commands.toggleRawEditor, gestures, onOpenNativeVault, openCommandPalette, props])
  const handleNavigateWikilink = useCallback((target: string) => {
    const noteId = mobileNoteIdForWikilinkTarget(suggestionNotes, target)
    if (noteId) onSelectNote(noteId)
  }, [onSelectNote, suggestionNotes])
  const handleSelectTableOfContentsTarget = useCallback((target: MobileTableOfContentsTarget) => {
    setTableOfContentsTarget((current) => ({
      ...target,
      requestId: (current?.requestId ?? 0) + 1,
    }))
  }, [])
  useEffect(() => {
    if (!props.tableOfContentsProbe || tableOfContentsTarget) return

    const timeout = setTimeout(() => {
      handleSelectTableOfContentsTarget({
        id: mobileTableOfContentsHeadingTargetId(0),
        level: 2,
        title: 'Target Section',
      })
    }, 600)

    return () => clearTimeout(timeout)
  }, [handleSelectTableOfContentsTarget, props.tableOfContentsProbe, tableOfContentsTarget])

  useEffect(() => {
    if (commandPaletteProbe) logNativeMobileCommandPaletteProof(commandPaletteCommands)
  }, [commandPaletteCommands, commandPaletteProbe])

  return (
    <View style={styles.shell}>
      <TabletLeftChromeHost {...props} gestures={gestures} onOpenCommandPalette={openCommandPalette} />
      <TabletEditorPanelHost
        {...props}
        gestures={gestures}
        suggestionNotes={suggestionNotes}
        tableOfContentsTarget={tableOfContentsTarget}
        typeDefinitions={snapshot.typeDefinitions}
        onRegisterEditorCommands={editorCommandRegistry.register}
        onNavigateWikilink={handleNavigateWikilink}
      />
      <TabletPropertiesPanelHost
        {...props}
        gestures={gestures}
        onFixInvalidFrontmatter={editorCommandRegistry.commands.toggleRawEditor}
      />
      <WorkspaceActionSheetHost
        {...props}
        suggestionNotes={suggestionNotes}
        onSelectTableOfContentsTarget={handleSelectTableOfContentsTarget}
      />
      {commandPaletteOpen ? <MobileCommandPalette commands={commandPaletteCommands} onClose={closeCommandPalette} /> : null}
    </View>
  )
}

type TabletTableOfContentsTargetRequest = MobileTableOfContentsTarget & { requestId: number }
type TabletPanelGestures = ReturnType<typeof useTabletPanelGestures>
type TabletPanelHostProps = TabletWorkspaceChromeProps & { gestures: TabletPanelGestures }
type TabletSidebarHostProps = TabletPanelHostProps & { onOpenCommandPalette: () => void }
type TabletPropertiesPanelHostProps = TabletPanelHostProps & { onFixInvalidFrontmatter?: () => void }

function selectAdjacentVisibleNote(
  notes: MobileNote[],
  selectedNoteId: string | null,
  onSelectNote: (noteId: string) => void,
  direction: -1 | 1,
) {
  const noteId = adjacentVisibleNoteId(notes, selectedNoteId, direction)
  if (noteId) onSelectNote(noteId)
}

function adjacentVisibleNoteId(
  notes: MobileNote[],
  selectedNoteId: string | null,
  direction: -1 | 1,
) {
  if (notes.length === 0) return null
  const currentIndex = Math.max(0, notes.findIndex((note) => note.id === selectedNoteId))
  const nextIndex = Math.max(0, Math.min(notes.length - 1, currentIndex + direction))
  return notes[nextIndex]?.id ?? null
}

function TabletLeftChromeHost(props: TabletSidebarHostProps) {
  const { gestures } = props

  if (!gestures.leftChromeVisible) return <SwipeRail edge="left" swipeHandlers={gestures.leftChromeRevealSwipe} />

  return (
    <NativeAnimated.View
      {...gestures.leftChromeSwipe}
      style={[styles.leftChromeHost, gestures.leftChromeMotionStyle]}
    >
      <TabletSidebarHost {...props} />
      <TabletNoteListHost {...props} />
    </NativeAnimated.View>
  )
}

function TabletSidebarHost({
  activeFolderId,
  activeItemId,
  gestures,
  layoutProbe,
  onOpenCreateFolder,
  onOpenCreateType,
  onOpenCreateView,
  onOpenFolderActions,
  onOpenFavoriteActions,
  onOpenCommandPalette,
  onOpenPrimaryActions,
  onOpenTypeActions,
  onOpenTypeVisibility,
  onOpenViewActions,
  onSelectFolder,
  onSelectSidebarItem,
  snapshot,
}: TabletSidebarHostProps) {
  if (!gestures.renderSidebar) return null

  return (
    <View style={styles.panelHost}>
      <MobileWorkspaceSidebar
        activeFolderId={activeFolderId}
        activeItemId={activeItemId}
        layoutProbe={layoutProbe}
        sections={snapshot.sidebarSections}
        title={snapshot.source?.label}
        onCreateFolder={onOpenCreateFolder}
        onCreateType={onOpenCreateType}
        onCreateView={onOpenCreateView}
        onOpenFolderActions={onOpenFolderActions}
        onOpenFavoriteActions={onOpenFavoriteActions}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenPrimaryActions={onOpenPrimaryActions}
        onOpenTypeActions={onOpenTypeActions}
        onOpenTypeVisibility={onOpenTypeVisibility}
        onOpenViewActions={onOpenViewActions}
        onSelectFolder={onSelectFolder}
        onSelectItem={onSelectSidebarItem}
      />
    </View>
  )
}

function TabletNoteListHost({
  compactTablet,
  gestures,
  layoutProbe,
  noteListNeighborhood,
  noteListProperties,
  noteListSubtitle,
  noteListTitle,
  notes,
  onBulkArchiveNotes,
  onBulkDeleteNotes,
  onBulkOrganizeNotes,
  onOpenCreateNote,
  onOpenSearch,
  onSelectNote,
  searchQuery,
  selectedNoteId,
  snapshot,
}: TabletPanelHostProps) {
  if (!gestures.renderNoteList) return null

  return (
    <View style={styles.panelHost}>
      <MobileNoteListPanel
        compact={compactTablet}
        bulkActions={{
          onArchive: onBulkArchiveNotes,
          onDelete: onBulkDeleteNotes,
          onOrganize: onBulkOrganizeNotes,
        }}
        displayPropertyKeys={noteListProperties}
        layoutProbe={layoutProbe}
        leading={(
          <MobileIconButton
            accessibilityLabel={mobileText(gestures.showSidebar ? 'sidebar.action.collapse' : 'sidebar.action.expand')}
            testID="tablet-note-list-sidebar-action"
            onPress={gestures.toggleSidebar}
          >
            <SidebarSimple color={mobileColors.textMuted} size={16} />
          </MobileIconButton>
        )}
        neighborhood={noteListNeighborhood}
        notes={notes}
        propertyDisplayModes={snapshot.vaultConfig?.propertyDisplayModes}
        searchQuery={searchQuery || undefined}
        selectedNoteId={selectedNoteId}
        subtitle={noteListSubtitle}
        title={noteListTitle}
        typeDefinitions={snapshot.typeDefinitions}
        onOpenCreateNote={onOpenCreateNote}
        onOpenSearch={onOpenSearch}
        onSelectNote={onSelectNote}
      />
    </View>
  )
}

type TabletEditorPanelHostProps = Pick<
  TabletWorkspaceChromeProps,
  | 'compactTablet'
  | 'editorBlocks'
  | 'editorBullets'
  | 'initialEditorEditing'
  | 'initialEditorEditingMode'
  | 'layoutProbe'
  | 'onOpenMoreActions'
  | 'onTableOfContentsScrollProof'
  | 'onToggleFavorite'
  | 'onUpdateNoteContent'
  | 'selectedNote'
  | 'sourceIdleSave'
  | 'sourceSelectionProbe'
  | 'vaultRootUri'
  | 'wysiwygAutocompleteProbe'
  | 'wysiwygExternalLinkProbe'
  | 'wysiwygFormatCommandProbe'
  | 'wysiwygInputTransformProbe'
  | 'wysiwygMarkdownBlockProbe'
  | 'wysiwygMathEditProbe'
  | 'wysiwygTableCommandMutationProbe'
  | 'wysiwygWikilinkInsertProbe'
  | 'wysiwygMutationProbe'
> & {
  gestures: TabletPanelGestures
  onNavigateWikilink: (target: string) => void
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  suggestionNotes: MobileNote[]
  tableOfContentsTarget: TabletTableOfContentsTargetRequest | null
  typeDefinitions: MobileWorkspaceSnapshot['typeDefinitions']
}

function TabletEditorPanelHost({
  compactTablet,
  editorBlocks,
  editorBullets,
  gestures,
  initialEditorEditing,
  initialEditorEditingMode,
  layoutProbe,
  onNavigateWikilink,
  onOpenMoreActions,
  onRegisterEditorCommands,
  onTableOfContentsScrollProof,
  onToggleFavorite,
  onUpdateNoteContent,
  selectedNote,
  sourceIdleSave,
  sourceSelectionProbe,
  suggestionNotes,
  tableOfContentsTarget,
  typeDefinitions,
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
}: TabletEditorPanelHostProps) {
  return (
    <TabletEditorPanel
      blocks={editorBlocks}
      bullets={editorBullets}
      compact={compactTablet}
      initialEditing={initialEditorEditing}
      initialEditingMode={initialEditorEditingMode}
      leading={<TabletEditorChromeToggle gestures={gestures} />}
      layoutProbe={layoutProbe}
      note={selectedNote}
      notes={suggestionNotes}
      onNavigateWikilink={onNavigateWikilink}
      onOpenMoreActions={onOpenMoreActions}
      onRegisterEditorCommands={onRegisterEditorCommands}
      onTableOfContentsScrollProof={onTableOfContentsScrollProof}
      onToggleFavorite={onToggleFavorite}
      onUpdateContent={onUpdateNoteContent}
      sourceIdleSave={sourceIdleSave}
      sourceSelectionProbe={sourceSelectionProbe}
      tableOfContentsTarget={tableOfContentsTarget}
      typeDefinitions={typeDefinitions}
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

function TabletEditorChromeToggle({ gestures }: { gestures: TabletPanelGestures }) {
  const chromeVisible = gestures.showSidebar || gestures.noteListVisible
  const Icon = chromeVisible ? CaretLeft : CaretRight

  return (
    <MobileIconButton
      accessibilityLabel={mobileText(chromeVisible ? 'sidebar.action.collapse' : 'sidebar.action.expand')}
      testID="tablet-editor-chrome-toggle"
      onPress={gestures.toggleSidebarAndNoteList}
    >
      <Icon color={mobileColors.textMuted} size={16} />
    </MobileIconButton>
  )
}

function TabletPropertiesPanelHost({
  compactTablet,
  gestures,
  layoutProbe,
  onAddProperty,
  onAddRelationship,
  onDeleteProperty,
  onEditProperty,
  onFixInvalidFrontmatter,
  onInitializeProperties,
  onOpenChangeNoteType,
  onOpenCreateTypeWithName,
  onEnterNeighborhood,
  onRemoveRelationship,
  onSelectNote,
  selectedNote,
  snapshot,
}: TabletPropertiesPanelHostProps) {
  const referenceGroups = useMobileInspectorReferenceGroups(selectedNote, snapshot)

  if (!gestures.propertiesPanelVisible) return <SwipeRail edge="right" swipeHandlers={gestures.propertiesRevealSwipe} />

  return (
    <NativeAnimated.View {...gestures.propertiesSwipe} style={[styles.panelHost, gestures.propertiesMotionStyle]}>
      <MobilePropertiesPanel
        compact={compactTablet}
        layoutProbe={layoutProbe}
        note={selectedNote}
        onAddProperty={onAddProperty}
        onAddRelationship={onAddRelationship}
        onDeleteProperty={onDeleteProperty}
        onEditProperty={onEditProperty}
        onCreateMissingType={onOpenCreateTypeWithName}
        onFixInvalidFrontmatter={onFixInvalidFrontmatter}
        onInitializeProperties={onInitializeProperties}
        onOpenChangeNoteType={onOpenChangeNoteType}
        onEnterNeighborhood={onEnterNeighborhood}
        onSelectNote={onSelectNote}
        onRemoveRelationship={onRemoveRelationship}
        propertyDisplayModes={snapshot.vaultConfig?.propertyDisplayModes}
        referenceGroups={referenceGroups}
        typeDefinitions={snapshot.typeDefinitions}
      />
    </NativeAnimated.View>
  )
}

type ActionSheetHostProps = TabletWorkspaceChromeProps & {
  onSelectTableOfContentsTarget?: (target: MobileTableOfContentsTarget) => void
  suggestionNotes: MobileNote[]
}

export function WorkspaceActionSheetHost(props: ActionSheetHostProps) {
  const { openAction } = props
  if (!openAction) return null

  return (
    <MobileWorkspaceActionSheet
      action={openAction}
      {...actionSheetValues(props)}
      {...actionSheetHandlers(props)}
    />
  )
}

function actionSheetValues(props: ActionSheetHostProps) {
  const {
    canRedoWorkspaceEdit,
    canUndoWorkspaceEdit,
    canMoveFavoriteDown,
    canMoveFavoriteUp,
    canMoveViewDown,
    canMoveViewUp,
    readOnlyForm,
    searchQuery,
    selectedNote,
    suggestionNotes,
    primaryPropertyOptions,
    typePropertyOptions,
    typeSchemaPropertyNameOptions,
    typeSchemaRelationshipNameOptions,
    typeRelationshipTargetOptions,
    typeSortPropertyOptions,
    viewPropertyOptions,
    viewSortPropertyOptions,
  } = props

  return {
    canDeleteType: props.canDeleteType,
    canMoveFavoriteDown,
    canMoveFavoriteUp,
    canMoveViewDown,
    canMoveViewUp,
    canRedoWorkspaceEdit,
    canUndoWorkspaceEdit,
    canMoveTypeDown: props.canMoveTypeDown,
    canMoveTypeUp: props.canMoveTypeUp,
    editorBlocks: props.editorBlocks,
    editorBullets: props.editorBullets,
    folderPaths: props.snapshot.folderPaths,
    notes: suggestionNotes,
    searchQuery,
    selectedNote,
    ...actionSheetFormValues(readOnlyForm),
    typeDefinitions: props.snapshot.typeDefinitions,
    primaryPropertyOptions,
    typePropertyOptions,
    typeSchemaPropertyNameOptions,
    typeSchemaRelationshipNameOptions,
    typeRelationshipTargetOptions,
    typeSortPropertyOptions,
    viewPropertyOptions,
    viewSortPropertyOptions,
  }
}

function actionSheetFormValues(readOnlyForm: ActionSheetHostProps['readOnlyForm']) {
  return {
    allNotesShowImages: readOnlyForm.allNotesShowImages,
    allNotesShowPdfs: readOnlyForm.allNotesShowPdfs,
    allNotesShowUnsupported: readOnlyForm.allNotesShowUnsupported,
    createTitle: readOnlyForm.createTitle,
    filenameStem: readOnlyForm.filenameStem,
    folderName: readOnlyForm.folderName,
    folderPath: readOnlyForm.folderPath,
    noteIcon: readOnlyForm.noteIcon,
    noteType: readOnlyForm.noteType,
    primaryDisplayProperties: readOnlyForm.primaryDisplayProperties,
    primaryItemId: readOnlyForm.primaryItemId,
    primaryPropertyQuery: readOnlyForm.primaryPropertyQuery,
    propertyName: readOnlyForm.propertyName,
    propertyValue: readOnlyForm.propertyValue,
    propertyValueKind: readOnlyForm.propertyValueKind,
    relationshipName: readOnlyForm.relationshipName,
    relationshipNoteTitle: readOnlyForm.relationshipNoteTitle,
    typeDisplayProperties: readOnlyForm.typeDisplayProperties,
    typeName: readOnlyForm.typeName,
    typePropertyQuery: readOnlyForm.typePropertyQuery,
    typeSchemaProperties: readOnlyForm.typeSchemaProperties,
    typeSchemaPropertyName: readOnlyForm.typeSchemaPropertyName,
    typeSchemaPropertyValue: readOnlyForm.typeSchemaPropertyValue,
    typeSchemaRelationships: readOnlyForm.typeSchemaRelationships,
    typeSchemaRelationshipName: readOnlyForm.typeSchemaRelationshipName,
    typeSchemaRelationshipTarget: readOnlyForm.typeSchemaRelationshipTarget,
    typeSectionLabel: readOnlyForm.typeSectionLabel,
    typeRenameName: readOnlyForm.typeRenameName,
    typeSort: readOnlyForm.typeSort,
    typeTemplate: readOnlyForm.typeTemplate,
    typeIcon: readOnlyForm.typeIcon,
    typeTone: readOnlyForm.typeTone,
    typeVisible: readOnlyForm.typeVisible,
    viewDisplayProperties: readOnlyForm.viewDisplayProperties,
    viewFilters: readOnlyForm.viewFilters,
    viewIcon: readOnlyForm.viewIcon,
    viewName: readOnlyForm.viewName,
    viewPropertyQuery: readOnlyForm.viewPropertyQuery,
    viewSort: readOnlyForm.viewSort,
    viewTone: readOnlyForm.viewTone,
  }
}

function actionSheetHandlers(props: ActionSheetHostProps) {
  return {
    onChangeNoteType: props.onChangeNoteType,
    onChangeNoteTypeInputChange: props.onChangeNoteTypeInputChange,
    onClose: props.onCloseAction,
    onCopyFolderPath: props.onCopyFolderPath,
    onCopyDeepLink: props.onCopyDeepLink,
    onCopyFilePath: props.onCopyFilePath,
    onCreateFolder: props.onCreateFolder,
    onCreateNote: props.onCreateNote,
    onCreateRelationshipTarget: props.onCreateRelationshipTarget,
    onCreateTitleChange: props.onCreateTitleChange,
    onCreateType: props.onCreateType,
    onCreateView: props.onCreateView,
    onDeleteFolder: props.onDeleteFolder,
    onDeleteNote: props.onDeleteNote,
    onEnterNeighborhood: props.onEnterNeighborhood,
    onExportNoteAsPdf: props.onExportNoteAsPdf,
    onDeleteType: props.onDeleteType,
    onDeleteView: props.onDeleteView,
    onFilenameStemChange: props.onFilenameStemChange,
    onFolderNameChange: props.onFolderNameChange,
    onFolderPathChange: props.onFolderPathChange,
    onMoveFavoriteDown: props.onMoveFavoriteDown,
    onMoveFavoriteUp: props.onMoveFavoriteUp,
    onMoveNoteToFolder: props.onMoveNoteToFolder,
    onMoveViewDown: props.onMoveViewDown,
    onMoveViewUp: props.onMoveViewUp,
    onMoveTypeDown: props.onMoveTypeDown,
    onMoveTypeUp: props.onMoveTypeUp,
    onNoteIconChange: props.onNoteIconChange,
    onOpenChangeNoteType: props.onOpenChangeNoteType,
    onOpenCreateChildFolder: props.onOpenCreateChildFolder,
    onOpenCreateNoteInFolder: props.onOpenCreateNoteInFolder,
    onOpenFileInDefaultApp: props.onOpenFileInDefaultApp,
    onOpenFindInNote: props.onOpenFindInNote,
    onOpenMoveNoteToFolder: props.onOpenMoveNoteToFolder,
    onOpenReplaceInNote: props.onOpenReplaceInNote,
    onOpenRenameNoteFile: props.onOpenRenameNoteFile,
    onOpenSetNoteIcon: props.onOpenSetNoteIcon,
    onOpenTableOfContents: props.onOpenTableOfContents,
    onSelectTableOfContentsTarget: props.onSelectTableOfContentsTarget,
    onPrimaryAllNotesShowImagesChange: props.onPrimaryAllNotesShowImagesChange,
    onPrimaryAllNotesShowPdfsChange: props.onPrimaryAllNotesShowPdfsChange,
    onPrimaryAllNotesShowUnsupportedChange: props.onPrimaryAllNotesShowUnsupportedChange,
    onPrimaryDisplayPropertiesChange: props.onPrimaryDisplayPropertiesChange,
    onPrimaryPropertyQueryChange: props.onPrimaryPropertyQueryChange,
    onPropertyNameChange: props.onPropertyNameChange,
    onPropertyValueChange: props.onPropertyValueChange,
    onPropertyValueKindChange: props.onPropertyValueKindChange,
    onRevealFile: props.onRevealFile,
    onRelationshipNameChange: props.onRelationshipNameChange,
    onRelationshipNoteSelect: props.onRelationshipNoteSelect,
    onRelationshipNoteTitleChange: props.onRelationshipNoteTitleChange,
    onRenameFolder: props.onRenameFolder,
    onRevealFolder: props.onRevealFolder,
    onRenameNoteFile: props.onRenameNoteFile,
    onRenameNoteFileToTitle: props.onRenameNoteFileToTitle,
    onRedoWorkspaceEdit: props.onRedoWorkspaceEdit,
    onRemoveNoteIcon: props.onRemoveNoteIcon,
    onSavePrimaryNoteListProperties: props.onSavePrimaryNoteListProperties,
    onSaveProperty: props.onSaveProperty,
    onSaveRelationship: props.onSaveRelationship,
    onSaveTypeDefinition: props.onSaveTypeDefinition,
    onSaveView: props.onSaveView,
    onSearchQueryChange: props.onSearchQueryChange,
    onSelectNote: props.onSelectNote,
    onSetArchived: props.onSetArchived,
    onSetNoteIcon: props.onSetNoteIcon,
    onSetOrganized: props.onSetOrganized,
    onToggleFavorite: props.onToggleFavorite,
    onToggleNoteWidth: props.onToggleNoteWidth,
    onToggleTypeVisibility: props.onToggleTypeVisibility,
    onUndoWorkspaceEdit: props.onUndoWorkspaceEdit,
    onTypeDisplayPropertiesChange: props.onTypeDisplayPropertiesChange,
    onTypeNameChange: props.onTypeNameChange,
    onTypePropertyQueryChange: props.onTypePropertyQueryChange,
    onTypeSchemaPropertyAdd: props.onTypeSchemaPropertyAdd,
    onTypeSchemaPropertyNameChange: props.onTypeSchemaPropertyNameChange,
    onTypeSchemaPropertyRemove: props.onTypeSchemaPropertyRemove,
    onTypeSchemaPropertyValueChange: props.onTypeSchemaPropertyValueChange,
    onTypeSchemaRelationshipAdd: props.onTypeSchemaRelationshipAdd,
    onTypeSchemaRelationshipNameChange: props.onTypeSchemaRelationshipNameChange,
    onTypeSchemaRelationshipRemove: props.onTypeSchemaRelationshipRemove,
    onTypeSchemaRelationshipTargetSelect: props.onTypeSchemaRelationshipTargetSelect,
    onTypeSchemaRelationshipTargetChange: props.onTypeSchemaRelationshipTargetChange,
    onTypeRenameNameChange: props.onTypeRenameNameChange,
    onTypeSectionLabelChange: props.onTypeSectionLabelChange,
    onTypeSortChange: props.onTypeSortChange,
    onTypeTemplateChange: props.onTypeTemplateChange,
    onTypeIconChange: props.onTypeIconChange,
    onTypeToneChange: props.onTypeToneChange,
    onTypeVisibleChange: props.onTypeVisibleChange,
    onUpdateNoteContent: props.onUpdateNoteContent,
    onViewIconChange: props.onViewIconChange,
    onViewDisplayPropertiesChange: props.onViewDisplayPropertiesChange,
    onViewFiltersChange: props.onViewFiltersChange,
    onViewNameChange: props.onViewNameChange,
    onViewPropertyQueryChange: props.onViewPropertyQueryChange,
    onViewSortChange: props.onViewSortChange,
    onViewToneChange: props.onViewToneChange,
  }
}

function SwipeRail({
  edge,
  swipeHandlers,
}: {
  edge: 'left' | 'right'
  swipeHandlers: ReturnType<typeof useHorizontalSwipe>
}) {
  return <View {...swipeHandlers} style={[styles.swipeRail, edge === 'right' ? styles.swipeRailRight : null]} />
}

function useTabletPanelVisibility(defaultPropertiesVisible: boolean) {
  const [panelOverrides, setPanelOverrides] = useState<Partial<Record<TabletPanel, boolean>>>({})
  const setPanelVisibility = useCallback((panel: TabletPanel, visible: boolean) => {
    setPanelOverrides((current) => current[panel] === visible ? current : { ...current, [panel]: visible })
  }, [])

  return {
    hidePanel: useCallback((panel: TabletPanel) => setPanelVisibility(panel, false), [setPanelVisibility]),
    noteListVisible: panelOverrides.noteList ?? true,
    propertiesVisible: panelOverrides.properties ?? defaultPropertiesVisible,
    showPanel: useCallback((panel: TabletPanel) => setPanelVisibility(panel, true), [setPanelVisibility]),
    sidebarVisible: panelOverrides.sidebar ?? true,
  }
}

function useTabletPanelGestures(compactTablet: boolean, defaultPropertiesVisible: boolean) {
  const { hidePanel, noteListVisible, propertiesVisible, showPanel, sidebarVisible } = useTabletPanelVisibility(defaultPropertiesVisible)
  const showSidebar = !compactTablet && sidebarVisible
  const leftChromeRendered = showSidebar || noteListVisible
  const [leftChromePreviewVisible, setLeftChromePreviewVisible] = useState(false)
  const [propertiesPreviewVisible, setPropertiesPreviewVisible] = useState(false)
  const [leftChromeOffset] = useState(() => new NativeAnimated.Value(0))
  const [propertiesOffset] = useState(() => new NativeAnimated.Value(0))
  const leftChromeTargetSidebarVisible = !compactTablet
  const renderSidebar = showSidebar || (leftChromePreviewVisible && leftChromeTargetSidebarVisible)
  const renderNoteList = noteListVisible || leftChromePreviewVisible
  const leftChromeCurrentWidth = tabletLeftChromeWidth({
    compactTablet,
    noteListVisible: renderNoteList,
    previewVisible: leftChromePreviewVisible,
    sidebarVisible: renderSidebar,
  })
  const leftChromeRevealWidth = tabletLeftChromeWidth({
    compactTablet,
    noteListVisible: true,
    previewVisible: true,
    sidebarVisible: leftChromeTargetSidebarVisible,
  })
  const propertiesPanelWidth = desktopPanelParity.inspectorWidth
  const animateLeftChrome = useCallback((toValue: number, onDone?: () => void) => {
    leftChromeOffset.stopAnimation()
    NativeAnimated.timing(leftChromeOffset, {
      duration: tabletPanelTransitionDurationMs,
      toValue,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onDone?.()
    })
  }, [leftChromeOffset])
  const animateProperties = useCallback((toValue: number, onDone?: () => void) => {
    propertiesOffset.stopAnimation()
    NativeAnimated.timing(propertiesOffset, {
      duration: tabletPanelTransitionDurationMs,
      toValue,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onDone?.()
    })
  }, [propertiesOffset])
  const showLeftChrome = useCallback((fromGesture = false) => {
    setLeftChromePreviewVisible(true)
    if (!fromGesture) leftChromeOffset.setValue(-leftChromeRevealWidth)
    animateLeftChrome(0, () => {
      if (!compactTablet) showPanel('sidebar')
      showPanel('noteList')
      setLeftChromePreviewVisible(false)
      leftChromeOffset.setValue(0)
    })
  }, [animateLeftChrome, compactTablet, leftChromeOffset, leftChromeRevealWidth, showPanel])
  const hideLeftChrome = useCallback(() => {
    if (leftChromeCurrentWidth <= 0) return
    animateLeftChrome(-leftChromeCurrentWidth, () => {
      hidePanel('sidebar')
      hidePanel('noteList')
      setLeftChromePreviewVisible(false)
      leftChromeOffset.setValue(0)
    })
  }, [animateLeftChrome, hidePanel, leftChromeCurrentWidth, leftChromeOffset])
  const showProperties = useCallback((fromGesture = false) => {
    setPropertiesPreviewVisible(true)
    if (!fromGesture) propertiesOffset.setValue(propertiesPanelWidth)
    animateProperties(0, () => {
      showPanel('properties')
      setPropertiesPreviewVisible(false)
      propertiesOffset.setValue(0)
    })
  }, [animateProperties, propertiesOffset, propertiesPanelWidth, showPanel])
  const hideProperties = useCallback(() => {
    animateProperties(propertiesPanelWidth, () => {
      hidePanel('properties')
      setPropertiesPreviewVisible(false)
      propertiesOffset.setValue(0)
    })
  }, [animateProperties, hidePanel, propertiesOffset, propertiesPanelWidth])
  const handleLeftChromeProgress = useCallback(({ dx }: { dx: number }) => {
    const width = leftChromeRendered ? leftChromeCurrentWidth : leftChromeRevealWidth
    if (width <= 0) return
    if (!leftChromeRendered && dx > 0) setLeftChromePreviewVisible(true)
    leftChromeOffset.stopAnimation()
    leftChromeOffset.setValue(tabletLeftChromeDragOffset({
      dx,
      visible: leftChromeRendered,
      width,
    }))
  }, [leftChromeCurrentWidth, leftChromeOffset, leftChromeRendered, leftChromeRevealWidth])
  const handleLeftChromeEnd = useCallback((committed: boolean) => {
    if (committed) return
    if (leftChromeRendered) {
      animateLeftChrome(0)
      return
    }

    animateLeftChrome(-leftChromeRevealWidth, () => {
      setLeftChromePreviewVisible(false)
      leftChromeOffset.setValue(0)
    })
  }, [animateLeftChrome, leftChromeOffset, leftChromeRendered, leftChromeRevealWidth])
  const handlePropertiesProgress = useCallback(({ dx }: { dx: number }) => {
    if (!propertiesVisible && dx < 0) setPropertiesPreviewVisible(true)
    propertiesOffset.stopAnimation()
    propertiesOffset.setValue(tabletPropertiesDragOffset({
      dx,
      visible: propertiesVisible,
      width: propertiesPanelWidth,
    }))
  }, [propertiesOffset, propertiesPanelWidth, propertiesVisible])
  const handlePropertiesEnd = useCallback((committed: boolean) => {
    if (committed) return
    if (propertiesVisible) {
      animateProperties(0)
      return
    }

    animateProperties(propertiesPanelWidth, () => {
      setPropertiesPreviewVisible(false)
      propertiesOffset.setValue(0)
    })
  }, [animateProperties, propertiesOffset, propertiesPanelWidth, propertiesVisible])

  useEffect(() => () => {
    leftChromeOffset.stopAnimation()
    propertiesOffset.stopAnimation()
  }, [leftChromeOffset, propertiesOffset])

  const leftChromeMotionStyle = useMemo(() => ({
    marginRight: leftChromeOffset,
    transform: [{ translateX: leftChromeOffset }],
  }), [leftChromeOffset])
  const propertiesMotionStyle = useMemo(() => ({
    marginLeft: NativeAnimated.multiply(propertiesOffset, -1),
    transform: [{ translateX: propertiesOffset }],
  }), [propertiesOffset])

  return {
    showAllPanels: useCallback(() => {
      showPanel('sidebar')
      showPanel('noteList')
      showPanel('properties')
    }, [showPanel]),
    showEditorList: useCallback(() => {
      hidePanel('sidebar')
      showPanel('noteList')
      hidePanel('properties')
    }, [hidePanel, showPanel]),
    showEditorOnly: useCallback(() => {
      hidePanel('sidebar')
      hidePanel('noteList')
      hidePanel('properties')
      setLeftChromePreviewVisible(false)
      setPropertiesPreviewVisible(false)
      leftChromeOffset.setValue(0)
      propertiesOffset.setValue(0)
    }, [hidePanel, leftChromeOffset, propertiesOffset]),
    toggleSidebar: useCallback(() => {
      if (showSidebar) hidePanel('sidebar')
      else showPanel('sidebar')
    }, [hidePanel, showPanel, showSidebar]),
    toggleSidebarAndNoteList: useCallback(() => {
      if (showSidebar || noteListVisible) {
        hideLeftChrome()
        return
      }
      showLeftChrome()
    }, [hideLeftChrome, noteListVisible, showLeftChrome, showSidebar]),
    leftChromeMotionStyle,
    leftChromeRevealSwipe: useHorizontalSwipe({
      disabled: leftChromeRendered,
      onSwipeEnd: handleLeftChromeEnd,
      onSwipeProgress: handleLeftChromeProgress,
      onSwipeRight: () => showLeftChrome(true),
    }),
    leftChromeSwipe: useHorizontalSwipe({
      disabled: !leftChromeRendered,
      onSwipeEnd: handleLeftChromeEnd,
      onSwipeLeft: hideLeftChrome,
      onSwipeProgress: handleLeftChromeProgress,
    }),
    leftChromeVisible: leftChromeRendered || leftChromePreviewVisible,
    noteListVisible,
    propertiesMotionStyle,
    propertiesPanelVisible: propertiesVisible || propertiesPreviewVisible,
    showProperties: useCallback(() => showProperties(), [showProperties]),
    toggleProperties: useCallback(() => {
      if (propertiesVisible) hideProperties()
      else showProperties()
    }, [hideProperties, propertiesVisible, showProperties]),
    propertiesRevealSwipe: useHorizontalSwipe({
      disabled: propertiesVisible,
      onSwipeEnd: handlePropertiesEnd,
      onSwipeLeft: () => showProperties(true),
      onSwipeProgress: handlePropertiesProgress,
    }),
    propertiesSwipe: useHorizontalSwipe({
      disabled: !propertiesVisible,
      onSwipeEnd: handlePropertiesEnd,
      onSwipeProgress: handlePropertiesProgress,
      onSwipeRight: hideProperties,
    }),
    propertiesVisible,
    renderNoteList,
    renderSidebar,
    showSidebar,
  }
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: mobileColors.app,
  },
  shellRoot: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: mobileColors.app,
  },
  panelHost: {
    alignSelf: 'stretch',
    height: '100%',
  },
  leftChromeHost: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    height: '100%',
  },
  swipeRail: {
    width: 18,
    backgroundColor: mobileColors.card,
    borderRightColor: mobileColors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  swipeRailRight: {
    borderLeftColor: mobileColors.border,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: 0,
  },
})
