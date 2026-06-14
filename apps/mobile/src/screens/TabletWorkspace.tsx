import { useCallback, useMemo, useState } from 'react'
import { Dimensions, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { MobileNoteListPanel } from '../components/workspace/MobileNoteListPanel'
import { MobilePropertiesPanel } from '../components/workspace/MobilePropertiesPanel'
import { MobileSyncStatusBar } from '../components/workspace/MobileSyncStatusBar'
import { MobileWorkspaceActionSheet, type MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import { MobileWorkspaceSidebar } from '../components/workspace/MobileWorkspaceSidebar'
import type { MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import { mobileColors } from '../ui/tokens'
import { useHorizontalSwipe } from '../ui/useHorizontalSwipe'
import { TabletEditorPanel } from './TabletEditorPanel'
import {
  snapshotWithFavoriteOverrides,
  useTabletWorkspaceNavigation,
} from './tabletWorkspaceNavigation'
import type { TabletPanel, TabletReadOnlyForm, TabletWorkspaceChromeProps } from './tabletWorkspaceTypes'

const emptyReadOnlyForm: TabletReadOnlyForm = {
  createTitle: '',
  propertyName: '',
  propertyValue: '',
  relationshipName: '',
  relationshipNoteTitle: '',
}

export function TabletWorkspace({
  snapshot,
}: {
  snapshot: MobileWorkspaceSnapshot
}) {
  const { height, width } = useWindowDimensions()
  const [favoriteOverrides, setFavoriteOverrides] = useState<Record<string, boolean>>({})
  const [openAction, setOpenAction] = useState<MobileWorkspaceAction | null>(null)
  const [readOnlyForm, setReadOnlyForm] = useState<TabletReadOnlyForm>(emptyReadOnlyForm)
  const [searchQuery, setSearchQuery] = useState('')
  const workspaceSnapshot = useMemo(() => snapshotWithFavoriteOverrides(snapshot, favoriteOverrides), [favoriteOverrides, snapshot])
  const {
    activeFolderId,
    activeItemId,
    editorBlocks,
    editorBullets,
    noteListSubtitle,
    noteListTitle,
    notes,
    selectFolder,
    selectedNote,
    selectedNoteId,
    selectSidebarItem,
    setSelectedNoteId,
  } = useTabletWorkspaceNavigation(workspaceSnapshot, searchQuery)
  const screen = Dimensions.get('screen')
  const nativeIpad = Platform.OS === 'ios' && Platform.isPad
  const effectiveTabletWidth = nativeIpad ? Math.max(width, height, screen.width, screen.height) : width
  const compactTablet = !nativeIpad && width < 1080 && width < height && screen.width < screen.height
  const defaultPropertiesVisible = nativeIpad ? effectiveTabletWidth >= 1200 : true
  const updateReadOnlyForm = useCallback(<Key extends keyof TabletReadOnlyForm,>(key: Key, value: TabletReadOnlyForm[Key]) => {
    setReadOnlyForm((current) => ({ ...current, [key]: value }))
  }, [])
  const toggleFavorite = useCallback(() => {
    if (!selectedNote) return
    setFavoriteOverrides((current) => ({
      ...current,
      [selectedNote.id]: !(current[selectedNote.id] ?? selectedNote.favorite),
    }))
  }, [selectedNote])

  return (
    <View style={styles.shellRoot}>
      <TabletWorkspaceChrome
        activeFolderId={activeFolderId}
        activeItemId={activeItemId}
        compactTablet={compactTablet}
        defaultPropertiesVisible={defaultPropertiesVisible}
        editorBlocks={editorBlocks}
        editorBullets={editorBullets}
        noteListSubtitle={noteListSubtitle}
        noteListTitle={noteListTitle}
        notes={notes}
        openAction={openAction}
        readOnlyForm={readOnlyForm}
        searchQuery={searchQuery}
        selectedNote={selectedNote}
        selectedNoteId={selectedNoteId}
        snapshot={workspaceSnapshot}
        onAddProperty={() => setOpenAction('addProperty')}
        onAddRelationship={() => setOpenAction('addRelationship')}
        onCloseAction={() => setOpenAction(null)}
        onCreateTitleChange={(value) => updateReadOnlyForm('createTitle', value)}
        onOpenCreateNote={() => setOpenAction('createNote')}
        onOpenMoreActions={() => setOpenAction('moreActions')}
        onOpenSearch={() => setOpenAction('search')}
        onPropertyNameChange={(value) => updateReadOnlyForm('propertyName', value)}
        onPropertyValueChange={(value) => updateReadOnlyForm('propertyValue', value)}
        onRelationshipNameChange={(value) => updateReadOnlyForm('relationshipName', value)}
        onRelationshipNoteTitleChange={(value) => updateReadOnlyForm('relationshipNoteTitle', value)}
        onSearchQueryChange={setSearchQuery}
        onSelectFolder={selectFolder}
        onSelectNote={setSelectedNoteId}
        onSelectSidebarItem={selectSidebarItem}
        onToggleFavorite={toggleFavorite}
      />
      <MobileSyncStatusBar sync={snapshot.sync} />
    </View>
  )
}

function TabletWorkspaceChrome(props: TabletWorkspaceChromeProps) {
  const {
    activeFolderId,
    activeItemId,
    compactTablet,
    defaultPropertiesVisible,
    editorBlocks,
    editorBullets,
    noteListSubtitle,
    noteListTitle,
    notes,
    onAddProperty,
    onAddRelationship,
    onCloseAction,
    onCreateTitleChange,
    onOpenCreateNote,
    onOpenMoreActions,
    onOpenSearch,
    onPropertyNameChange,
    onPropertyValueChange,
    onRelationshipNameChange,
    onRelationshipNoteTitleChange,
    onSearchQueryChange,
    onSelectFolder,
    onSelectNote,
    onSelectSidebarItem,
    onToggleFavorite,
    openAction,
    readOnlyForm,
    searchQuery,
    selectedNote,
    selectedNoteId,
    snapshot,
  } = props
  const gestures = useTabletPanelGestures(compactTablet, defaultPropertiesVisible)

  return (
    <View style={styles.shell}>
      {gestures.showSidebar ? (
        <View {...gestures.sidebarSwipe} style={styles.panelHost}>
          <MobileWorkspaceSidebar
            activeFolderId={activeFolderId}
            activeItemId={activeItemId}
            sections={snapshot.sidebarSections}
            title={snapshot.source?.label}
            onSelectFolder={onSelectFolder}
            onSelectItem={onSelectSidebarItem}
          />
        </View>
      ) : <SwipeRail edge="left" swipeHandlers={gestures.sidebarRevealSwipe} />}
      {gestures.noteListVisible ? (
        <View {...gestures.noteListSwipe} style={styles.panelHost}>
          <MobileNoteListPanel
            compact={compactTablet}
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
        onOpenMoreActions={onOpenMoreActions}
        onToggleFavorite={onToggleFavorite}
      />
      {gestures.propertiesVisible ? (
        <View {...gestures.propertiesSwipe} style={styles.panelHost}>
          <MobilePropertiesPanel compact={compactTablet} note={selectedNote} onAddProperty={onAddProperty} onAddRelationship={onAddRelationship} />
        </View>
      ) : <SwipeRail edge="right" swipeHandlers={gestures.propertiesRevealSwipe} />}
      {openAction ? (
        <MobileWorkspaceActionSheet
          action={openAction}
          createTitle={readOnlyForm.createTitle}
          notes={notes}
          propertyName={readOnlyForm.propertyName}
          propertyValue={readOnlyForm.propertyValue}
          relationshipName={readOnlyForm.relationshipName}
          relationshipNoteTitle={readOnlyForm.relationshipNoteTitle}
          searchQuery={searchQuery}
          selectedNote={selectedNote}
          onClose={onCloseAction}
          onCreateTitleChange={onCreateTitleChange}
          onPropertyNameChange={onPropertyNameChange}
          onPropertyValueChange={onPropertyValueChange}
          onRelationshipNameChange={onRelationshipNameChange}
          onRelationshipNoteTitleChange={onRelationshipNoteTitleChange}
          onSearchQueryChange={onSearchQueryChange}
          onSelectNote={onSelectNote}
        />
      ) : null}
    </View>
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
