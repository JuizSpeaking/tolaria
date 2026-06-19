import { useCallback, useMemo, useState } from 'react'
import { Dimensions, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
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
import { mobileColors } from '../ui/tokens'
import { useHorizontalSwipe } from '../ui/useHorizontalSwipe'
import { useMobileEditorCommandRegistry, type RegisterMobileEditorCommands } from '../workspace/mobileEditorCommands'
import { mobileNoteIdForWikilinkTarget } from '../workspace/mobileWikilinks'
import { buildMobileCommandPaletteCommands } from '../workspace/mobileCommandPalette'
import { TabletEditorPanel } from './TabletEditorPanel'
import type { TabletPanel, TabletWorkspaceChromeProps } from './tabletWorkspaceTypes'
import { useTabletWorkspaceController } from './useTabletWorkspaceController'
import { useMobileInspectorReferenceGroups } from './useMobileInspectorReferenceGroups'

export function TabletWorkspace({
  initialEditorEditing = false,
  initialEditorEditingMode = 'wysiwyg',
  layoutProbe = false,
  onOpenNativeVault,
  repository = fixtureReadOnlyWorkspaceRepository,
  repositoryRequest,
  sourceSelectionProbe = false,
  snapshot,
  wysiwygAutocompleteProbe = false,
  wysiwygFormatCommandProbe = false,
  wysiwygInputTransformProbe = false,
  wysiwygMarkdownBlockProbe = false,
  wysiwygWikilinkInsertProbe = false,
  wysiwygMutationProbe = false,
}: {
  initialEditorEditing?: boolean
  initialEditorEditingMode?: TabletWorkspaceChromeProps['initialEditorEditingMode']
  layoutProbe?: boolean
  onOpenNativeVault?: () => void
  repository?: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  sourceSelectionProbe?: boolean
  snapshot: MobileWorkspaceSnapshot
  wysiwygAutocompleteProbe?: boolean
  wysiwygFormatCommandProbe?: boolean
  wysiwygInputTransformProbe?: boolean
  wysiwygMarkdownBlockProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  wysiwygMutationProbe?: boolean
}) {
  const controller = useTabletWorkspaceController({ repository, repositoryRequest, snapshot })
  const { compactTablet, defaultPropertiesVisible } = useTabletScreenMode()

  return (
    <View style={styles.shellRoot}>
      <TabletWorkspaceChrome
        compactTablet={compactTablet}
        defaultPropertiesVisible={defaultPropertiesVisible}
        initialEditorEditing={initialEditorEditing}
        initialEditorEditingMode={initialEditorEditingMode}
        layoutProbe={layoutProbe}
        onOpenNativeVault={onOpenNativeVault}
        sourceSelectionProbe={sourceSelectionProbe}
        wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
        wysiwygFormatCommandProbe={wysiwygFormatCommandProbe}
        wysiwygInputTransformProbe={wysiwygInputTransformProbe}
        wysiwygMarkdownBlockProbe={wysiwygMarkdownBlockProbe}
        wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
        wysiwygMutationProbe={wysiwygMutationProbe}
        {...controller}
      />
      <MobileSyncStatusBar sync={controller.snapshot.sync} onOpenLocalVault={onOpenNativeVault} />
    </View>
  )
}

function useTabletScreenMode() {
  const { height, width } = useWindowDimensions()
  const screen = Dimensions.get('screen')
  const nativeIpad = Platform.OS === 'ios' && Platform.isPad
  const effectiveTabletWidth = nativeIpad ? Math.max(width, height, screen.width, screen.height) : width

  return {
    compactTablet: !nativeIpad && width < 1080 && width < height && screen.width < screen.height,
    defaultPropertiesVisible: nativeIpad ? effectiveTabletWidth >= 1200 : true,
  }
}

function TabletWorkspaceChrome(props: TabletWorkspaceChromeProps) {
  const { compactTablet, defaultPropertiesVisible, onOpenNativeVault, onSelectNote, snapshot } = props
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const editorCommandRegistry = useMobileEditorCommandRegistry()
  const gestures = useTabletPanelGestures(compactTablet, defaultPropertiesVisible)
  const suggestionNotes = snapshot.allNotes ?? snapshot.notes
  const openCommandPalette = useCallback(() => setCommandPaletteOpen(true), [])
  const closeCommandPalette = useCallback(() => setCommandPaletteOpen(false), [])
  const commandPaletteCommands = useMemo(() => buildMobileCommandPaletteCommands({
    ...props,
    onOpenBacklinks: gestures.showProperties,
    onOpenNativeVault,
    onPastePlainText: editorCommandRegistry.commands.pastePlainText,
    onToggleProperties: gestures.toggleProperties,
    onViewAll: gestures.showAllPanels,
    onViewEditorList: gestures.showEditorList,
    onViewEditorOnly: gestures.showEditorOnly,
  }), [editorCommandRegistry.commands.pastePlainText, gestures, onOpenNativeVault, props])
  const handleNavigateWikilink = useCallback((target: string) => {
    const noteId = mobileNoteIdForWikilinkTarget(suggestionNotes, target)
    if (noteId) onSelectNote(noteId)
  }, [onSelectNote, suggestionNotes])

  return (
    <View style={styles.shell}>
      <TabletSidebarHost {...props} gestures={gestures} onOpenCommandPalette={openCommandPalette} />
      <TabletNoteListHost {...props} gestures={gestures} />
      <TabletEditorPanelHost
        {...props}
        suggestionNotes={suggestionNotes}
        onRegisterEditorCommands={editorCommandRegistry.register}
        onNavigateWikilink={handleNavigateWikilink}
      />
      <TabletPropertiesPanelHost {...props} gestures={gestures} />
      <WorkspaceActionSheetHost {...props} suggestionNotes={suggestionNotes} />
      {commandPaletteOpen ? <MobileCommandPalette commands={commandPaletteCommands} onClose={closeCommandPalette} /> : null}
    </View>
  )
}

type TabletPanelGestures = ReturnType<typeof useTabletPanelGestures>
type TabletPanelHostProps = TabletWorkspaceChromeProps & { gestures: TabletPanelGestures }
type TabletSidebarHostProps = TabletPanelHostProps & { onOpenCommandPalette: () => void }

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
  if (!gestures.showSidebar) return <SwipeRail edge="left" swipeHandlers={gestures.sidebarRevealSwipe} />

  return (
    <View {...gestures.sidebarSwipe} style={styles.panelHost}>
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
  noteListFilter,
  noteListFilterCounts,
  noteListFilterVisible,
  noteListProperties,
  noteListSubtitle,
  noteListTitle,
  notes,
  onBulkArchiveNotes,
  onBulkDeleteNotes,
  onBulkOrganizeNotes,
  onNoteListFilterChange,
  onOpenCreateNote,
  onOpenSearch,
  onSelectNote,
  searchQuery,
  selectedNoteId,
  snapshot,
}: TabletPanelHostProps) {
  if (!gestures.noteListVisible) return <SwipeRail edge="left" swipeHandlers={gestures.noteListRevealSwipe} />

  return (
    <View {...gestures.noteListSwipe} style={styles.panelHost}>
      <MobileNoteListPanel
        compact={compactTablet}
        bulkActions={{
          onArchive: onBulkArchiveNotes,
          onDelete: onBulkDeleteNotes,
          onOrganize: onBulkOrganizeNotes,
        }}
        displayPropertyKeys={noteListProperties}
        layoutProbe={layoutProbe}
        neighborhood={noteListNeighborhood}
        noteListFilter={noteListFilter}
        noteListFilterCounts={noteListFilterCounts}
        noteListFilterVisible={noteListFilterVisible}
        notes={notes}
        onNoteListFilterChange={onNoteListFilterChange}
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
  | 'onToggleFavorite'
  | 'onUpdateNoteContent'
  | 'selectedNote'
  | 'sourceSelectionProbe'
  | 'vaultRootUri'
  | 'wysiwygAutocompleteProbe'
  | 'wysiwygFormatCommandProbe'
  | 'wysiwygInputTransformProbe'
  | 'wysiwygMarkdownBlockProbe'
  | 'wysiwygWikilinkInsertProbe'
  | 'wysiwygMutationProbe'
> & {
  onNavigateWikilink: (target: string) => void
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  suggestionNotes: MobileNote[]
}

function TabletEditorPanelHost({
  compactTablet,
  editorBlocks,
  editorBullets,
  initialEditorEditing,
  initialEditorEditingMode,
  layoutProbe,
  onNavigateWikilink,
  onOpenMoreActions,
  onRegisterEditorCommands,
  onToggleFavorite,
  onUpdateNoteContent,
  selectedNote,
  sourceSelectionProbe,
  suggestionNotes,
  vaultRootUri,
  wysiwygAutocompleteProbe,
  wysiwygFormatCommandProbe,
  wysiwygInputTransformProbe,
  wysiwygMarkdownBlockProbe,
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
      layoutProbe={layoutProbe}
      note={selectedNote}
      notes={suggestionNotes}
      onNavigateWikilink={onNavigateWikilink}
      onOpenMoreActions={onOpenMoreActions}
      onRegisterEditorCommands={onRegisterEditorCommands}
      onToggleFavorite={onToggleFavorite}
      onUpdateContent={onUpdateNoteContent}
      sourceSelectionProbe={sourceSelectionProbe}
      vaultRootUri={vaultRootUri}
      wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
      wysiwygFormatCommandProbe={wysiwygFormatCommandProbe}
      wysiwygInputTransformProbe={wysiwygInputTransformProbe}
      wysiwygMarkdownBlockProbe={wysiwygMarkdownBlockProbe}
      wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
      wysiwygMutationProbe={wysiwygMutationProbe}
    />
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
  onOpenChangeNoteType,
  onEnterNeighborhood,
  onRemoveRelationship,
  onSelectNote,
  selectedNote,
  snapshot,
}: TabletPanelHostProps) {
  const referenceGroups = useMobileInspectorReferenceGroups(selectedNote, snapshot)

  if (!gestures.propertiesVisible) return <SwipeRail edge="right" swipeHandlers={gestures.propertiesRevealSwipe} />

  return (
    <View {...gestures.propertiesSwipe} style={styles.panelHost}>
      <MobilePropertiesPanel
        compact={compactTablet}
        layoutProbe={layoutProbe}
        note={selectedNote}
        onAddProperty={onAddProperty}
        onAddRelationship={onAddRelationship}
        onDeleteProperty={onDeleteProperty}
        onEditProperty={onEditProperty}
        onOpenChangeNoteType={onOpenChangeNoteType}
        onEnterNeighborhood={onEnterNeighborhood}
        onSelectNote={onSelectNote}
        onRemoveRelationship={onRemoveRelationship}
        referenceGroups={referenceGroups}
        typeDefinitions={snapshot.typeDefinitions}
      />
    </View>
  )
}

type ActionSheetHostProps = TabletWorkspaceChromeProps & { suggestionNotes: MobileNote[] }

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
    }, [hidePanel]),
    showProperties: useCallback(() => showPanel('properties'), [showPanel]),
    toggleProperties: useCallback(() => {
      if (propertiesVisible) hidePanel('properties')
      else showPanel('properties')
    }, [hidePanel, propertiesVisible, showPanel]),
    noteListRevealSwipe: useHorizontalSwipe({
      disabled: noteListVisible,
      onSwipeRight: () => showPanel('noteList'),
    }),
    noteListSwipe: useHorizontalSwipe({
      disabled: !noteListVisible,
      onSwipeLeft: () => hidePanel('noteList'),
    }),
    noteListVisible,
    propertiesRevealSwipe: useHorizontalSwipe({
      disabled: propertiesVisible,
      onSwipeLeft: () => showPanel('properties'),
    }),
    propertiesSwipe: useHorizontalSwipe({
      disabled: !propertiesVisible,
      onSwipeRight: () => hidePanel('properties'),
    }),
    propertiesVisible,
    showSidebar,
    sidebarRevealSwipe: useHorizontalSwipe({
      disabled: showSidebar || compactTablet,
      onSwipeRight: () => showPanel('sidebar'),
    }),
    sidebarSwipe: useHorizontalSwipe({
      disabled: !showSidebar,
      onSwipeLeft: () => hidePanel('sidebar'),
    }),
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
