import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  CaretLeft,
  Command,
  Info,
  List,
} from 'phosphor-react-native'
import { Animated as NativeAnimated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Text } from '../components/ui/text'
import { MobileNoteListPanel } from '../components/workspace/MobileNoteListPanel'
import { MobilePropertiesPanel } from '../components/workspace/MobilePropertiesPanel'
import { MobileSyncStatusBar } from '../components/workspace/MobileSyncStatusBar'
import { MobileWorkspaceSidebar } from '../components/workspace/MobileWorkspaceSidebar'
import { mobileText } from '../i18n/mobileText'
import { probeProps, useMobileLayoutProbe, type MobileLayoutProbe } from '../qa/mobileLayoutProbe'
import { MobileIconButton } from '../ui/MobileIconButton'
import { mobileColors, mobileSpace } from '../ui/tokens'
import { useHorizontalSwipe } from '../ui/useHorizontalSwipe'
import { useMobileEditorCommandRegistry, type RegisterMobileEditorCommands } from '../workspace/mobileEditorCommands'
import { mobileNoteIdForWikilinkTarget } from '../workspace/mobileWikilinks'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import {
  fixtureReadOnlyWorkspaceRepository,
  type ReadOnlyWorkspaceRepository,
  type ReadOnlyWorkspaceRequest,
} from '../workspace/readOnlyWorkspaceRepository'
import { MobileCommandPalette } from '../components/workspace/MobileCommandPalette'
import { buildMobileCommandPaletteCommands } from '../workspace/mobileCommandPalette'
import { TabletEditorPanel } from './TabletEditorPanel'
import type { EditorEditingMode } from './TabletEditorPanel'
import { WorkspaceActionSheetHost } from './TabletWorkspace'
import { PhoneWorkspaceTransition } from './PhoneWorkspaceTransition'
import { useTabletWorkspaceController } from './useTabletWorkspaceController'
import { useMobileInspectorReferenceGroups } from './useMobileInspectorReferenceGroups'
import {
  phoneWorkspaceDragOffset,
  phoneWorkspaceSwipeDestination,
  type PhoneWorkspaceState,
  type PhoneWorkspaceSwipeDirection,
} from './phoneWorkspaceTransitions'

export type { PhoneWorkspaceState } from './phoneWorkspaceTransitions'

export function PhoneWorkspace({
  initialEditorEditing = false,
  initialEditorEditingMode = 'wysiwyg',
  initialState = 'list',
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
  initialEditorEditingMode?: EditorEditingMode
  initialState?: PhoneWorkspaceState
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
  const { phoneState, previousPhoneState, setPhoneState } = usePhoneState(initialState)
  const { width } = useWindowDimensions()
  const dragPreview = usePhoneDragPreview(phoneState, width)
  const editorCommandRegistry = useMobileEditorCommandRegistry()
  const phoneLayoutProbe = useMobileLayoutProbe(layoutProbe)
  const openList = useCallback(() => setPhoneState('list'), [setPhoneState])
  const openSidebar = useCallback(() => setPhoneState('sidebar'), [setPhoneState])
  const openProperties = useCallback(() => setPhoneState('properties'), [setPhoneState])
  const openEditor = useCallback((noteId?: string) => {
    if (noteId) controller.onSelectNote(noteId)
    setPhoneState('editor')
  }, [controller, setPhoneState])
  const openNeighborhoodList = useCallback((noteId: string) => {
    controller.onEnterNeighborhood(noteId)
    setPhoneState('list')
  }, [controller, setPhoneState])
  const commandPalette = usePhoneCommandPalette({
    controller,
    onOpenNativeVault,
    onPastePlainText: editorCommandRegistry.commands.pastePlainText,
    openEditor,
    openList,
    openNeighborhoodList,
    openProperties,
    openSidebar,
    phoneState,
  })
  const createRelationshipTargetAndOpenEditor = useCallback(() => {
    controller.onCreateRelationshipTarget()
    setPhoneState('editor')
  }, [controller, setPhoneState])
  const transitionSwipeHandlers = usePhoneSwipeHandlers({
    openEditor,
    openList,
    openProperties,
    openSidebar,
    phoneState,
  })
  const suggestionNotes = controller.snapshot.allNotes ?? controller.snapshot.notes
  const preview = phoneWorkspaceDragPreview({
    controller,
    dragPreview,
    initialEditorEditing,
    initialEditorEditingMode,
    openEditor,
    openCommandPalette: commandPalette.open,
    openList,
    openProperties,
    openSidebar,
    suggestionNotes,
  })
  return (
    <View {...phoneLayoutProbe.probe('phone.root')} style={styles.root}>
      <PhoneWorkspaceTransition
        dragX={dragPreview.dragX}
        preview={preview}
        previousState={previousPhoneState}
        state={phoneState}
        swipeHandlers={nativePhoneDragPreviewEnabled() ? undefined : transitionSwipeHandlers}
      >
        <PhoneWorkspaceStateView
          controller={controller}
          initialEditorEditing={initialEditorEditing}
          initialEditorEditingMode={initialEditorEditingMode}
          layoutProbe={layoutProbe}
          openEditor={openEditor}
          openCommandPalette={commandPalette.open}
          openList={openList}
          openProperties={openProperties}
          openSidebar={openSidebar}
          phoneLayoutProbe={phoneLayoutProbe.probe}
          phoneState={phoneState}
          phoneSwipePreview={dragPreview}
          onRegisterEditorCommands={editorCommandRegistry.register}
          sourceSelectionProbe={sourceSelectionProbe}
          suggestionNotes={suggestionNotes}
          wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
          wysiwygFormatCommandProbe={wysiwygFormatCommandProbe}
          wysiwygInputTransformProbe={wysiwygInputTransformProbe}
          wysiwygMarkdownBlockProbe={wysiwygMarkdownBlockProbe}
          wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
          wysiwygMutationProbe={wysiwygMutationProbe}
        />
      </PhoneWorkspaceTransition>
      <WorkspaceActionSheetHost
        {...controller}
        compactTablet
        defaultPropertiesVisible={false}
        initialEditorEditing={initialEditorEditing}
        layoutProbe={layoutProbe}
        suggestionNotes={suggestionNotes}
        onCreateRelationshipTarget={createRelationshipTargetAndOpenEditor}
        onEnterNeighborhood={openNeighborhoodList}
      />
      <MobileSyncStatusBar sync={controller.snapshot.sync} onOpenLocalVault={onOpenNativeVault} />
      {commandPalette.element}
    </View>
  )
}

function usePhoneCommandPalette({
  controller,
  onOpenNativeVault,
  onPastePlainText,
  openEditor,
  openList,
  openNeighborhoodList,
  openProperties,
  openSidebar,
  phoneState,
}: {
  controller: PhoneWorkspaceController
  onOpenNativeVault?: () => void
  onPastePlainText?: () => void
  openEditor: (noteId?: string) => void
  openList: () => void
  openNeighborhoodList: (noteId: string) => void
  openProperties: () => void
  openSidebar: () => void
  phoneState: PhoneWorkspaceState
}) {
  const [visible, setVisible] = useState(false)
  const open = useCallback(() => setVisible(true), [])
  const close = useCallback(() => setVisible(false), [])
  const toggleProperties = useCallback(() => {
    if (phoneState === 'properties') openEditor()
    else openProperties()
  }, [openEditor, openProperties, phoneState])
  const commands = useMemo(() => buildMobileCommandPaletteCommands({
    ...controller,
    onOpenBacklinks: openProperties,
    onOpenNativeVault,
    onEnterNeighborhood: openNeighborhoodList,
    onPastePlainText,
    onToggleProperties: toggleProperties,
    onViewAll: openSidebar,
    onViewEditorList: openList,
    onViewEditorOnly: openEditor,
  }), [controller, onOpenNativeVault, onPastePlainText, openEditor, openList, openNeighborhoodList, openProperties, openSidebar, toggleProperties])

  return {
    element: visible ? <MobileCommandPalette commands={commands} onClose={close} /> : null,
    open,
  }
}

function usePhoneState(initialState: PhoneWorkspaceState) {
  const [state, setState] = useState({
    current: initialState,
    previous: initialState,
  })
  const setPhoneState = useCallback((nextState: PhoneWorkspaceState) => {
    setState((currentState) => {
      if (currentState.current === nextState) return currentState
      return { current: nextState, previous: currentState.current }
    })
  }, [])

  return {
    phoneState: state.current,
    previousPhoneState: state.previous,
    setPhoneState,
  }
}

function usePhoneSwipeHandlers({
  openEditor,
  openList,
  openProperties,
  openSidebar,
  phoneState,
}: {
  openEditor: () => void
  openList: () => void
  openProperties: () => void
  openSidebar: () => void
  phoneState: PhoneWorkspaceState
}) {
  const editorSwipe = useHorizontalSwipe({ onSwipeLeft: openProperties, onSwipeRight: openList })
  const listSwipe = useHorizontalSwipe({ onSwipeRight: openSidebar })
  const propertiesSwipe = useHorizontalSwipe({ onSwipeRight: openEditor })
  const sidebarSwipe = useHorizontalSwipe({ onSwipeLeft: openList })

  if (phoneState === 'editor') return editorSwipe
  if (phoneState === 'properties') return propertiesSwipe
  if (phoneState === 'sidebar') return sidebarSwipe
  return listSwipe
}

function usePhoneDragPreview(phoneState: PhoneWorkspaceState, screenWidth: number) {
  const enabled = nativePhoneDragPreviewEnabled()
  const [dragX] = useState(() => new NativeAnimated.Value(0))
  const [previewState, setPreviewState] = useState<PhoneWorkspaceState | null>(null)
  const onSwipeProgress = useCallback(({ dx }: { dx: number }) => {
    if (!enabled) return

    const offset = phoneWorkspaceDragOffset(phoneState, dx, screenWidth)
    dragX.stopAnimation()
    if (offset === 0) {
      dragX.setValue(0)
      setPreviewState(null)
      return
    }

    dragX.setValue(offset)
    setPreviewState(phoneWorkspaceSwipeDestination(phoneState, swipeDirectionForOffset(offset)))
  }, [dragX, enabled, phoneState, screenWidth])
  const onSwipeEnd = useCallback((committed: boolean) => {
    if (!enabled) return

    dragX.stopAnimation()
    if (committed) {
      dragX.setValue(0)
      setPreviewState(null)
      return
    }

    NativeAnimated.timing(dragX, {
      duration: 120,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPreviewState(null)
    })
  }, [dragX, enabled])

  useEffect(() => () => {
    dragX.stopAnimation()
  }, [dragX])

  return {
    dragX,
    enabled,
    onSwipeEnd,
    onSwipeProgress,
    previewState,
  }
}

function swipeDirectionForOffset(offset: number): PhoneWorkspaceSwipeDirection {
  return offset < 0 ? 'left' : 'right'
}

function nativePhoneDragPreviewEnabled() {
  return Platform.OS !== 'web'
}

type PhoneWorkspaceController = ReturnType<typeof useTabletWorkspaceController>
type PhoneSwipePreview = ReturnType<typeof usePhoneDragPreview>

function phoneWorkspaceDragPreview({
  controller,
  dragPreview,
  initialEditorEditing,
  initialEditorEditingMode,
  openEditor,
  openCommandPalette,
  openList,
  openProperties,
  openSidebar,
  suggestionNotes,
}: {
  controller: PhoneWorkspaceController
  dragPreview: PhoneSwipePreview
  initialEditorEditing: boolean
  initialEditorEditingMode: EditorEditingMode
  openEditor: (noteId?: string) => void
  openCommandPalette: () => void
  openList: () => void
  openProperties: () => void
  openSidebar: () => void
  suggestionNotes: MobileNote[]
}): ReactNode {
  if (!dragPreview.previewState) return null

  return (
    <PhoneWorkspaceStateView
      controller={controller}
      initialEditorEditing={initialEditorEditing}
      initialEditorEditingMode={initialEditorEditingMode}
      layoutProbe={false}
      openEditor={openEditor}
      openCommandPalette={openCommandPalette}
      openList={openList}
      openProperties={openProperties}
      openSidebar={openSidebar}
      phoneLayoutProbe={disabledPhoneLayoutProbe}
      phoneState={dragPreview.previewState}
      phoneSwipePreview={dragPreview}
      sourceSelectionProbe={false}
      suggestionNotes={suggestionNotes}
      wysiwygAutocompleteProbe={false}
      wysiwygFormatCommandProbe={false}
      wysiwygInputTransformProbe={false}
      wysiwygMarkdownBlockProbe={false}
      wysiwygWikilinkInsertProbe={false}
      wysiwygMutationProbe={false}
    />
  )
}

type PhoneWorkspaceStateViewProps = {
  controller: PhoneWorkspaceController
  initialEditorEditing: boolean
  initialEditorEditingMode: EditorEditingMode
  layoutProbe: boolean
  openEditor: (noteId?: string) => void
  openCommandPalette: () => void
  openList: () => void
  openProperties: () => void
  openSidebar: () => void
  phoneLayoutProbe: MobileLayoutProbe
  phoneState: PhoneWorkspaceState
  phoneSwipePreview: PhoneSwipePreview
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  sourceSelectionProbe: boolean
  suggestionNotes: MobileNote[]
  wysiwygAutocompleteProbe: boolean
  wysiwygFormatCommandProbe: boolean
  wysiwygInputTransformProbe: boolean
  wysiwygMarkdownBlockProbe: boolean
  wysiwygWikilinkInsertProbe: boolean
  wysiwygMutationProbe: boolean
}

const disabledPhoneLayoutProbe: MobileLayoutProbe = () => ({})

function PhoneWorkspaceStateView(props: PhoneWorkspaceStateViewProps) {
  if (props.phoneState === 'sidebar') return <PhoneSidebarDrawer {...props} />
  if (props.phoneState === 'properties') return <PhonePropertiesScreen {...props} />
  if (props.phoneState === 'editor' && props.controller.selectedNote) return <PhoneEditorScreen {...props} />
  return <PhoneNoteListScreen {...props} />
}

function phoneSwipePreviewHandlers(phoneSwipePreview: PhoneSwipePreview) {
  return phoneSwipePreview.enabled
    ? {
      onSwipeEnd: phoneSwipePreview.onSwipeEnd,
      onSwipeProgress: phoneSwipePreview.onSwipeProgress,
    }
    : {}
}

function PhoneNoteListScreen({
  controller,
  layoutProbe,
  openCommandPalette,
  openEditor,
  openSidebar,
  phoneLayoutProbe,
  phoneSwipePreview,
}: PhoneWorkspaceStateViewProps) {
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeRight: openSidebar,
  })

  return (
    <View {...swipeHandlers} {...probeProps(phoneLayoutProbe, 'phone.list.screen')} style={styles.screen} testID="phone-note-list-screen">
      <MobileNoteListPanel
        compact
        bulkActions={{
          onArchive: controller.onBulkArchiveNotes,
          onDelete: controller.onBulkDeleteNotes,
          onOrganize: controller.onBulkOrganizeNotes,
        }}
        displayPropertyKeys={controller.noteListProperties}
        fullWidth
        layoutProbe={layoutProbe}
        leading={(
          <View style={styles.leadingActions}>
            <MobileIconButton accessibilityLabel={mobileText('sidebar.action.expand')} testID="phone-sidebar-action" onPress={openSidebar}>
              <List color={mobileColors.textMuted} size={18} />
            </MobileIconButton>
            <PhoneCommandPaletteButton onPress={openCommandPalette} />
          </View>
        )}
        neighborhood={controller.noteListNeighborhood}
        noteListFilter={controller.noteListFilter}
        noteListFilterCounts={controller.noteListFilterCounts}
        noteListFilterVisible={controller.noteListFilterVisible}
        notes={controller.notes}
        onNoteListFilterChange={controller.onNoteListFilterChange}
        searchQuery={controller.searchQuery || undefined}
        selectedNoteId={controller.selectedNoteId}
        subtitle={controller.noteListSubtitle}
        title={controller.noteListTitle}
        typeDefinitions={controller.snapshot.typeDefinitions}
        onOpenCreateNote={controller.onOpenCreateNote}
        onOpenSearch={controller.onOpenSearch}
        onSelectNote={openEditor}
      />
    </View>
  )
}

function PhoneSidebarDrawer({
  controller,
  layoutProbe,
  openCommandPalette,
  openEditor,
  openList,
  phoneLayoutProbe,
  phoneSwipePreview,
}: PhoneWorkspaceStateViewProps) {
  const { width } = useWindowDimensions()
  const drawerWidth = Math.min(320, Math.round(width * 0.78))
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeLeft: openList,
  })
  const selectFolder = useSelectAndOpenList(controller.onSelectFolder, openList)
  const selectItem = useSelectAndOpenList(controller.onSelectSidebarItem, openList)

  return (
    <View {...swipeHandlers} {...probeProps(phoneLayoutProbe, 'phone.sidebar.screen')} style={styles.drawerRoot} testID="phone-sidebar-screen">
      <View
        {...probeProps(phoneLayoutProbe, 'phone.sidebar.preview')}
        pointerEvents="none"
        style={[styles.drawerPreview, { left: drawerWidth, width }]}
      >
        <MobileNoteListPanel
          compact
          displayPropertyKeys={controller.noteListProperties}
          fullWidth
          layoutProbe={layoutProbe}
          neighborhood={controller.noteListNeighborhood}
          noteListFilter={controller.noteListFilter}
          noteListFilterCounts={controller.noteListFilterCounts}
          noteListFilterVisible={controller.noteListFilterVisible}
          notes={controller.notes}
          onNoteListFilterChange={controller.onNoteListFilterChange}
          selectedNoteId={controller.selectedNoteId}
          subtitle={controller.noteListSubtitle}
          title={controller.noteListTitle}
          typeDefinitions={controller.snapshot.typeDefinitions}
          onOpenCreateNote={controller.onOpenCreateNote}
          onOpenSearch={controller.onOpenSearch}
          onSelectNote={openEditor}
        />
      </View>
      <View {...probeProps(phoneLayoutProbe, 'phone.sidebar.drawer')} style={[styles.drawerPanel, { width: drawerWidth }]}>
        <MobileWorkspaceSidebar
          activeFolderId={controller.activeFolderId}
          activeItemId={controller.activeItemId}
          layoutProbe={layoutProbe}
          sections={controller.snapshot.sidebarSections}
          title={controller.snapshot.source?.label}
          onCreateFolder={controller.onOpenCreateFolder}
          onCreateType={controller.onOpenCreateType}
          onCreateView={controller.onOpenCreateView}
          onOpenFolderActions={controller.onOpenFolderActions}
          onOpenFavoriteActions={controller.onOpenFavoriteActions}
          onOpenPrimaryActions={controller.onOpenPrimaryActions}
          onOpenTypeActions={controller.onOpenTypeActions}
          onOpenTypeVisibility={controller.onOpenTypeVisibility}
          onOpenViewActions={controller.onOpenViewActions}
          onSelectFolder={selectFolder}
          onSelectItem={selectItem}
          onOpenCommandPalette={openCommandPalette}
          onCollapse={openList}
        />
      </View>
    </View>
  )
}

function PhoneEditorScreen({
  controller,
  initialEditorEditing,
  initialEditorEditingMode,
  layoutProbe,
  openList,
  openCommandPalette,
  openProperties,
  onRegisterEditorCommands,
  phoneLayoutProbe,
  phoneSwipePreview,
  sourceSelectionProbe,
  suggestionNotes,
  wysiwygAutocompleteProbe,
  wysiwygFormatCommandProbe,
  wysiwygInputTransformProbe,
  wysiwygMarkdownBlockProbe,
  wysiwygWikilinkInsertProbe,
  wysiwygMutationProbe,
}: PhoneWorkspaceStateViewProps) {
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeLeft: openProperties,
    onSwipeRight: openList,
  })
  const handleNavigateWikilink = usePhoneWikilinkNavigation({ controller, suggestionNotes })

  return (
    <View {...swipeHandlers} {...probeProps(phoneLayoutProbe, 'phone.editor.screen')} style={styles.screen} testID="phone-editor-screen">
      <PhoneEditorTopBar
        title={controller.selectedNote?.title ?? ''}
        onBack={openList}
        onOpenCommandPalette={openCommandPalette}
        onOpenProperties={openProperties}
      />
      <PhoneEditorBody
        controller={controller}
        initialEditorEditing={initialEditorEditing}
        initialEditorEditingMode={initialEditorEditingMode}
        layoutProbe={layoutProbe}
        notes={suggestionNotes}
        onNavigateWikilink={handleNavigateWikilink}
        onRegisterEditorCommands={onRegisterEditorCommands}
        sourceSelectionProbe={sourceSelectionProbe}
        wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
        wysiwygFormatCommandProbe={wysiwygFormatCommandProbe}
        wysiwygInputTransformProbe={wysiwygInputTransformProbe}
        wysiwygMarkdownBlockProbe={wysiwygMarkdownBlockProbe}
        wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
        wysiwygMutationProbe={wysiwygMutationProbe}
      />
    </View>
  )
}

function PhoneEditorTopBar({
  onBack,
  onOpenCommandPalette,
  onOpenProperties,
  title,
}: {
  onBack: () => void
  onOpenCommandPalette: () => void
  onOpenProperties: () => void
  title: string
}) {
  return (
    <PhoneTopBar title={title} onBack={onBack}>
      <MobileIconButton
        accessibilityLabel={mobileText('inspector.title.properties')}
        testID="phone-properties-action"
        onPress={onOpenProperties}
      >
        <Info color={mobileColors.textMuted} size={18} />
      </MobileIconButton>
      <PhoneCommandPaletteButton onPress={onOpenCommandPalette} />
    </PhoneTopBar>
  )
}

function PhoneEditorBody({
  controller,
  initialEditorEditing,
  initialEditorEditingMode,
  layoutProbe,
  notes,
  onNavigateWikilink,
  onRegisterEditorCommands,
  sourceSelectionProbe,
  wysiwygAutocompleteProbe,
  wysiwygFormatCommandProbe,
  wysiwygInputTransformProbe,
  wysiwygMarkdownBlockProbe,
  wysiwygWikilinkInsertProbe,
  wysiwygMutationProbe,
}: {
  controller: PhoneWorkspaceController
  initialEditorEditing: boolean
  initialEditorEditingMode: EditorEditingMode
  layoutProbe: boolean
  notes: MobileNote[]
  onNavigateWikilink: (target: string) => void
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  sourceSelectionProbe: boolean
  wysiwygAutocompleteProbe: boolean
  wysiwygFormatCommandProbe: boolean
  wysiwygInputTransformProbe: boolean
  wysiwygMarkdownBlockProbe: boolean
  wysiwygWikilinkInsertProbe: boolean
  wysiwygMutationProbe: boolean
}) {
  return (
    <TabletEditorPanel
      blocks={controller.editorBlocks}
      bullets={controller.editorBullets}
      compact
      initialEditing={initialEditorEditing}
      initialEditingMode={initialEditorEditingMode}
      layoutProbe={layoutProbe}
      note={controller.selectedNote}
      notes={notes}
      onNavigateWikilink={onNavigateWikilink}
      onOpenMoreActions={controller.onOpenMoreActions}
      onRegisterEditorCommands={onRegisterEditorCommands}
      onToggleFavorite={controller.onToggleFavorite}
      onUpdateContent={controller.onUpdateNoteContent}
      sourceSelectionProbe={sourceSelectionProbe}
      vaultRootUri={controller.vaultRootUri}
      wysiwygAutocompleteProbe={wysiwygAutocompleteProbe}
      wysiwygFormatCommandProbe={wysiwygFormatCommandProbe}
      wysiwygInputTransformProbe={wysiwygInputTransformProbe}
      wysiwygMarkdownBlockProbe={wysiwygMarkdownBlockProbe}
      wysiwygWikilinkInsertProbe={wysiwygWikilinkInsertProbe}
      wysiwygMutationProbe={wysiwygMutationProbe}
    />
  )
}

function PhonePropertiesScreen({
  controller,
  layoutProbe,
  openEditor,
  openCommandPalette,
  openList,
  phoneLayoutProbe,
  phoneSwipePreview,
}: PhoneWorkspaceStateViewProps) {
  const returnToEditor = useCallback(() => openEditor(), [openEditor])
  const enterNeighborhood = useCallback((noteId: string) => {
    controller.onEnterNeighborhood(noteId)
    openList()
  }, [controller, openList])
  const referenceGroups = useMobileInspectorReferenceGroups(controller.selectedNote, controller.snapshot)
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeRight: returnToEditor,
  })

  return (
    <View {...swipeHandlers} {...probeProps(phoneLayoutProbe, 'phone.properties.screen')} style={styles.screen} testID="phone-properties-screen">
      <PhoneTopBar title={mobileText('inspector.title.properties')} onBack={returnToEditor}>
        <PhoneCommandPaletteButton onPress={openCommandPalette} />
      </PhoneTopBar>
      <MobilePropertiesPanel
        compact
        fullWidth
        layoutProbe={layoutProbe}
        note={controller.selectedNote}
        typeDefinitions={controller.snapshot.typeDefinitions}
        onAddProperty={controller.onAddProperty}
        onAddRelationship={controller.onAddRelationship}
        onDeleteProperty={controller.onDeleteProperty}
        onEditProperty={controller.onEditProperty}
        onEnterNeighborhood={enterNeighborhood}
        onOpenChangeNoteType={controller.onOpenChangeNoteType}
        onRemoveRelationship={controller.onRemoveRelationship}
        referenceGroups={referenceGroups}
        onSelectNote={openEditor}
      />
    </View>
  )
}

function PhoneCommandPaletteButton({ onPress }: { onPress: () => void }) {
  return (
    <MobileIconButton
      accessibilityLabel={mobileText('menu.view.commandPalette')}
      testID="phone-command-palette-action"
      onPress={onPress}
    >
      <Command color={mobileColors.textMuted} size={18} />
    </MobileIconButton>
  )
}

function PhoneTopBar({
  children,
  onBack,
  title,
}: {
  children?: ReactNode
  onBack: () => void
  title: string
}) {
  return (
    <View style={styles.topBar} testID="phone-top-bar">
      <MobileIconButton accessibilityLabel={mobileText('command.navigation.goBack')} testID="phone-back-action" onPress={onBack}>
        <CaretLeft color={mobileColors.textMuted} size={18} />
      </MobileIconButton>
      <Text numberOfLines={1} style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topBarActions}>{children}</View>
    </View>
  )
}

function usePhoneWikilinkNavigation({
  controller,
  suggestionNotes,
}: {
  controller: PhoneWorkspaceController
  suggestionNotes: MobileNote[]
}) {
  return useCallback((target: string) => {
    const noteId = mobileNoteIdForWikilinkTarget(suggestionNotes, target)
    if (!noteId) return

    controller.onSelectNote(noteId)
  }, [controller, suggestionNotes])
}

function useSelectAndOpenList<Selection>(
  select: (selection: Selection) => void,
  openList: () => void,
) {
  return useCallback((selection: Selection) => {
    select(selection)
    openList()
  }, [select, openList])
}

const styles = StyleSheet.create({
  drawerPanel: {
    flex: 1,
    backgroundColor: mobileColors.sidebar,
    borderRightColor: mobileColors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  drawerPreview: {
    bottom: 0,
    opacity: 0.72,
    position: 'absolute',
    top: 0,
  },
  drawerRoot: {
    flex: 1,
    backgroundColor: mobileColors.sidebar,
    overflow: 'hidden',
  },
  root: {
    flex: 1,
    backgroundColor: mobileColors.app,
  },
  leadingActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.xs,
  },
  screen: {
    flex: 1,
    backgroundColor: mobileColors.app,
  },
  topBar: {
    minHeight: 44,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.xs,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: mobileColors.card,
    paddingHorizontal: mobileSpace.sm,
  },
  topBarActions: {
    minWidth: 32,
    alignItems: 'flex-end',
  },
  topBarTitle: {
    flex: 1,
    color: mobileColors.text,
    fontSize: 13,
    fontWeight: '600',
  },
})
