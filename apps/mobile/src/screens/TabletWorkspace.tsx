import { useCallback, useState } from 'react'
import { Dimensions, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
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
import { mobileNoteIdForWikilinkTarget } from '../workspace/mobileWikilinks'
import { TabletEditorPanel } from './TabletEditorPanel'
import type { TabletPanel, TabletWorkspaceChromeProps } from './tabletWorkspaceTypes'
import { useTabletWorkspaceController } from './useTabletWorkspaceController'

export function TabletWorkspace({
  layoutProbe = false,
  repository = fixtureReadOnlyWorkspaceRepository,
  repositoryRequest,
  snapshot,
}: {
  layoutProbe?: boolean
  repository?: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  snapshot: MobileWorkspaceSnapshot
}) {
  const controller = useTabletWorkspaceController({ repository, repositoryRequest, snapshot })
  const { compactTablet, defaultPropertiesVisible } = useTabletScreenMode()

  return (
    <View style={styles.shellRoot}>
      <TabletWorkspaceChrome
        compactTablet={compactTablet}
        defaultPropertiesVisible={defaultPropertiesVisible}
        layoutProbe={layoutProbe}
        {...controller}
      />
      <MobileSyncStatusBar sync={snapshot.sync} />
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
  const {
    activeFolderId,
    activeItemId,
    compactTablet,
    defaultPropertiesVisible,
    editorBlocks,
    editorBullets,
    layoutProbe,
    noteListProperties,
    noteListSubtitle,
    noteListTitle,
    notes,
    onAddProperty,
    onAddRelationship,
    onDeleteProperty,
    onEditProperty,
    onOpenChangeNoteType,
    onOpenCreateNote,
    onOpenCreateView,
    onOpenMoreActions,
    onOpenSearch,
    onOpenViewActions,
    onRemoveRelationship,
    onSelectFolder,
    onSelectNote,
    onSelectSidebarItem,
    onToggleFavorite,
    onUpdateNoteContent,
    onUpdateNoteTitle,
    searchQuery,
    selectedNote,
    selectedNoteId,
    snapshot,
  } = props
  const gestures = useTabletPanelGestures(compactTablet, defaultPropertiesVisible)
  const suggestionNotes = snapshot.allNotes ?? snapshot.notes
  const handleNavigateWikilink = useCallback((target: string) => {
    const noteId = mobileNoteIdForWikilinkTarget(suggestionNotes, target)
    if (noteId) onSelectNote(noteId)
  }, [onSelectNote, suggestionNotes])

  return (
    <View style={styles.shell}>
      {gestures.showSidebar ? (
        <View {...gestures.sidebarSwipe} style={styles.panelHost}>
          <MobileWorkspaceSidebar
            activeFolderId={activeFolderId}
            activeItemId={activeItemId}
            layoutProbe={layoutProbe}
            sections={snapshot.sidebarSections}
            title={snapshot.source?.label}
            onCreateView={onOpenCreateView}
            onOpenViewActions={onOpenViewActions}
            onSelectFolder={onSelectFolder}
            onSelectItem={onSelectSidebarItem}
          />
        </View>
      ) : <SwipeRail edge="left" swipeHandlers={gestures.sidebarRevealSwipe} />}
      {gestures.noteListVisible ? (
        <View {...gestures.noteListSwipe} style={styles.panelHost}>
          <MobileNoteListPanel
            compact={compactTablet}
            displayPropertyKeys={noteListProperties}
            layoutProbe={layoutProbe}
            notes={notes}
            searchQuery={searchQuery || undefined}
            selectedNoteId={selectedNoteId}
            subtitle={noteListSubtitle}
            title={noteListTitle}
            onOpenCreateNote={onOpenCreateNote}
            onOpenSearch={onOpenSearch}
            onSelectNote={onSelectNote}
          />
        </View>
      ) : <SwipeRail edge="left" swipeHandlers={gestures.noteListRevealSwipe} />}
      <TabletEditorPanel
        blocks={editorBlocks}
        bullets={editorBullets}
        compact={compactTablet}
        note={selectedNote}
        notes={suggestionNotes}
        onNavigateWikilink={handleNavigateWikilink}
        onOpenMoreActions={onOpenMoreActions}
        onToggleFavorite={onToggleFavorite}
        onUpdateContent={onUpdateNoteContent}
        onUpdateTitle={onUpdateNoteTitle}
      />
      {gestures.propertiesVisible ? (
        <View {...gestures.propertiesSwipe} style={styles.panelHost}>
          <MobilePropertiesPanel
            compact={compactTablet}
            note={selectedNote}
            onAddProperty={onAddProperty}
            onAddRelationship={onAddRelationship}
            onDeleteProperty={onDeleteProperty}
            onEditProperty={onEditProperty}
            onOpenChangeNoteType={onOpenChangeNoteType}
            onSelectNote={onSelectNote}
            onRemoveRelationship={onRemoveRelationship}
            typeDefinitions={snapshot.typeDefinitions}
          />
        </View>
      ) : <SwipeRail edge="right" swipeHandlers={gestures.propertiesRevealSwipe} />}
      <WorkspaceActionSheetHost {...props} suggestionNotes={suggestionNotes} />
    </View>
  )
}

function WorkspaceActionSheetHost(props: TabletWorkspaceChromeProps & { suggestionNotes: MobileNote[] }) {
  const {
    onChangeNoteType,
    onChangeNoteTypeInputChange,
    canMoveViewDown,
    canMoveViewUp,
    onCloseAction,
    onCopyDeepLink,
    onCreateNote,
    onCreateRelationshipTarget,
    onCreateTitleChange,
    onCreateView,
    onDeleteNote,
    onDeleteView,
    onFilenameStemChange,
    onFolderPathChange,
    onMoveNoteToFolder,
    onMoveViewDown,
    onMoveViewUp,
    onOpenChangeNoteType,
    onOpenMoveNoteToFolder,
    onOpenRenameNoteFile,
    onPropertyNameChange,
    onPropertyValueChange,
    onRelationshipNameChange,
    onRelationshipNoteTitleChange,
    onSaveProperty,
    onSaveRelationship,
    onSaveView,
    onRenameNoteFile,
    onSearchQueryChange,
    onSelectNote,
    onSetArchived,
    onSetOrganized,
    onViewFiltersChange,
    onViewNameChange,
    openAction,
    readOnlyForm,
    searchQuery,
    selectedNote,
    suggestionNotes,
  } = props
  if (!openAction) return null

  return (
    <MobileWorkspaceActionSheet
      action={openAction}
      canMoveViewDown={canMoveViewDown}
      canMoveViewUp={canMoveViewUp}
      createTitle={readOnlyForm.createTitle}
      filenameStem={readOnlyForm.filenameStem}
      folderPath={readOnlyForm.folderPath}
      notes={suggestionNotes}
      noteType={readOnlyForm.noteType}
      propertyName={readOnlyForm.propertyName}
      propertyValue={readOnlyForm.propertyValue}
      relationshipName={readOnlyForm.relationshipName}
      relationshipNoteTitle={readOnlyForm.relationshipNoteTitle}
      searchQuery={searchQuery}
      selectedNote={selectedNote}
      viewFilters={readOnlyForm.viewFilters}
      onChangeNoteType={onChangeNoteType}
      onChangeNoteTypeInputChange={onChangeNoteTypeInputChange}
      onClose={onCloseAction}
      onCopyDeepLink={onCopyDeepLink}
      onCreateNote={onCreateNote}
      onCreateRelationshipTarget={onCreateRelationshipTarget}
      onCreateTitleChange={onCreateTitleChange}
      onCreateView={onCreateView}
      onDeleteView={onDeleteView}
      onDeleteNote={onDeleteNote}
      onFilenameStemChange={onFilenameStemChange}
      onFolderPathChange={onFolderPathChange}
      onMoveNoteToFolder={onMoveNoteToFolder}
      onMoveViewDown={onMoveViewDown}
      onMoveViewUp={onMoveViewUp}
      onOpenChangeNoteType={onOpenChangeNoteType}
      onOpenMoveNoteToFolder={onOpenMoveNoteToFolder}
      onOpenRenameNoteFile={onOpenRenameNoteFile}
      onPropertyNameChange={onPropertyNameChange}
      onPropertyValueChange={onPropertyValueChange}
      onRelationshipNameChange={onRelationshipNameChange}
      onRelationshipNoteTitleChange={onRelationshipNoteTitleChange}
      onSaveProperty={onSaveProperty}
      onSaveRelationship={onSaveRelationship}
      onSaveView={onSaveView}
      onRenameNoteFile={onRenameNoteFile}
      onSearchQueryChange={onSearchQueryChange}
      onSelectNote={onSelectNote}
      onSetArchived={onSetArchived}
      onSetOrganized={onSetOrganized}
      onViewFiltersChange={onViewFiltersChange}
      onViewNameChange={onViewNameChange}
      viewName={readOnlyForm.viewName}
    />
  )
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
