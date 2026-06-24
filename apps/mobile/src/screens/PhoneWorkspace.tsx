import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
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
import { useMobileWorkspaceKeyboardShortcuts } from '../workspace/mobileWorkspaceKeyboardShortcuts'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { MobileTableOfContentsTarget } from '../workspace/mobileTableOfContents'
import {
  fixtureReadOnlyWorkspaceRepository,
  type ReadOnlyWorkspaceRepository,
  type ReadOnlyWorkspaceRequest,
} from '../workspace/readOnlyWorkspaceRepository'
import { MobileCommandPalette } from '../components/workspace/MobileCommandPalette'
import { buildMobileCommandPaletteCommands } from '../workspace/mobileCommandPalette'
import { logNativeMobileCommandPaletteProof } from '../qa/nativeMobileCommandPaletteProbe'
import {
  logNativeMobileKeyboardShortcutActionProof,
  logNativeMobileKeyboardShortcutBridgeProof,
} from '../qa/nativeMobileKeyboardShortcutProof'
import { TabletEditorPanel } from './TabletEditorPanel'
import type { EditorEditingMode } from './TabletEditorPanel'
import { WorkspaceActionSheetHost } from './TabletWorkspace'
import { PhoneWorkspaceTransition } from './PhoneWorkspaceTransition'
import { useTabletWorkspaceController } from './useTabletWorkspaceController'
import { useMobileInspectorReferenceGroups } from './useMobileInspectorReferenceGroups'
import { useInitialActionSheetQaTarget } from './useInitialActionSheetQaTarget'
import type { MobileActionSheetQaTarget } from './tabletWorkspaceTypes'
import {
  phoneWorkspaceDragCommitOffset,
  phoneWorkspaceDragOffset,
  phoneWorkspaceSidebarDrawerWidth,
  phoneWorkspaceSwipeDestination,
  phoneWorkspaceTransitionDurationMs,
  type PhoneWorkspaceState,
  type PhoneWorkspaceSwipeDirection,
} from './phoneWorkspaceTransitions'

export type { PhoneWorkspaceState } from './phoneWorkspaceTransitions'

type PhoneWorkspaceProps = {
  initialCommandPaletteOpen?: boolean
  initialEditorEditing?: boolean
  initialEditorEditingMode?: EditorEditingMode
  initialActionSheet?: MobileActionSheetQaTarget
  commandPaletteProbe?: boolean
  keyboardShortcutProbe?: boolean
  initialState?: PhoneWorkspaceState
  layoutProbe?: boolean
  onOpenNativeVault?: () => void
  repository?: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  sourceIdleSave?: boolean
  sourceSelectionProbe?: boolean
  snapshot: MobileWorkspaceSnapshot
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

type PhoneWorkspaceChromeProps = PhoneWorkspaceProps & {
  controller: PhoneWorkspaceController
}

type PhoneWorkspaceEditorOptions = {
  initialEditorEditing: boolean
  initialEditorEditingMode: EditorEditingMode
  layoutProbe: boolean
  sourceIdleSave: boolean
  sourceSelectionProbe: boolean
  wysiwygAutocompleteProbe: boolean
  wysiwygExternalLinkProbe: boolean
  wysiwygFormatCommandProbe: boolean
  wysiwygInputTransformProbe: boolean
  wysiwygMarkdownBlockProbe: boolean
  wysiwygMathEditProbe: boolean
  wysiwygTableCommandMutationProbe: boolean
  wysiwygWikilinkInsertProbe: boolean
  wysiwygMutationProbe: boolean
}

type PhoneStateTransitionOptions = {
  gestureHandoff?: boolean
}

const phoneGestureHandoffOptions = { gestureHandoff: true } satisfies PhoneStateTransitionOptions

export function PhoneWorkspace(props: PhoneWorkspaceProps) {
  const { repository = fixtureReadOnlyWorkspaceRepository, repositoryRequest, snapshot } = props
  const controller = useTabletWorkspaceController({ repository, repositoryRequest, snapshot })
  useInitialActionSheetQaTarget(controller.onOpenActionSheetQaTarget, props.initialActionSheet)
  return <PhoneWorkspaceChrome {...props} controller={controller} />
}

function PhoneWorkspaceChrome(props: PhoneWorkspaceChromeProps) {
  const {
    commandPaletteProbe = false,
    controller,
    initialState = 'list',
    keyboardShortcutProbe = false,
    onOpenNativeVault,
  } = props
  const options = phoneWorkspaceEditorOptions(props)
  const { clearGestureHandoff, gestureHandoffState, phoneState, previousPhoneState, setPhoneState } = usePhoneState(initialState)
  const [sourceModeRequest, setSourceModeRequest] = useState(0)
  const { width } = useWindowDimensions()
  const dragPreview = usePhoneDragPreview(phoneState, width, clearGestureHandoff)
  const editorCommandRegistry = useMobileEditorCommandRegistry()
  const tableOfContents = usePhoneTableOfContentsTarget(setPhoneState)
  const phoneLayoutProbe = useMobileLayoutProbe(options.layoutProbe)
  const navigation = usePhoneWorkspaceNavigation({ controller, setPhoneState, setSourceModeRequest })
  const selectNextNote = useCallback(() => selectAdjacentVisiblePhoneNote(controller.notes, controller.selectedNoteId, controller.onSelectNote, 1), [controller])
  const selectPreviousNote = useCallback(() => selectAdjacentVisiblePhoneNote(controller.notes, controller.selectedNoteId, controller.onSelectNote, -1), [controller])
  const commandPalette = usePhoneCommandPalette({
    controller,
    initialOpen: props.initialCommandPaletteOpen,
    onOpenNativeVault,
    onPastePlainText: editorCommandRegistry.commands.pastePlainText,
    onSaveActiveEditor: editorCommandRegistry.commands.save,
    onToggleRawEditor: editorCommandRegistry.commands.toggleRawEditor,
    openEditor: navigation.openEditor,
    openList: navigation.openList,
    openNeighborhoodList: navigation.openNeighborhoodList,
    openProperties: navigation.openProperties,
    openSidebar: navigation.openSidebar,
    phoneState,
  })
  useMobileWorkspaceKeyboardShortcuts({
    nativeNoteNavigationEnabled: phoneState === 'list',
    onCreateNote: controller.onOpenCreateNote,
    onOpenFindInNote: controller.onOpenFindInNote,
    onOpenCommandPalette: commandPalette.open,
    onOpenSearch: controller.onOpenSearch,
    onSelectNextNote: selectNextNote,
    onSelectPreviousNote: selectPreviousNote,
    onShortcutAction: keyboardShortcutProbe ? logNativeMobileKeyboardShortcutActionProof : undefined,
    onToggleRawEditor: editorCommandRegistry.commands.toggleRawEditor,
  })
  usePhoneCommandPaletteProof(commandPalette.commands, commandPaletteProbe)
  usePhoneKeyboardShortcutBridgeProof(keyboardShortcutProbe)
  const createRelationshipTargetAndOpenEditor = useCreateRelationshipTargetAndOpenEditor(controller, setPhoneState)
  const transitionSwipeHandlers = usePhoneSwipeHandlers({
    openEditor: navigation.openEditor,
    openList: navigation.openList,
    openProperties: navigation.openProperties,
    openSidebar: navigation.openSidebar,
    phoneState,
    phoneSwipePreview: dragPreview,
  })
  const suggestionNotes = controller.snapshot.allNotes ?? controller.snapshot.notes
  const preview = phoneWorkspaceDragPreview({
    controller,
    dragPreview,
    options,
    openEditor: navigation.openEditor,
    openSourceEditor: navigation.openSourceEditor,
    openCommandPalette: commandPalette.open,
    openList: navigation.openList,
    openProperties: navigation.openProperties,
    openSidebar: navigation.openSidebar,
    suggestionNotes,
    sourceModeRequest,
  })

  return (
    <PhoneWorkspaceRoot
      commandPaletteElement={commandPalette.element}
      controller={controller}
      createRelationshipTargetAndOpenEditor={createRelationshipTargetAndOpenEditor}
      dragPreview={dragPreview}
      editorCommandRegistry={editorCommandRegistry}
      navigation={navigation}
      openCommandPalette={commandPalette.open}
      options={options}
      phoneLayoutProbe={phoneLayoutProbe.probe}
      phoneState={phoneState}
      gestureHandoffState={gestureHandoffState}
      previousPhoneState={previousPhoneState}
      preview={preview}
      selectTableOfContentsTarget={tableOfContents.select}
      sourceModeRequest={sourceModeRequest}
      suggestionNotes={suggestionNotes}
      tableOfContentsTarget={tableOfContents.target}
      transitionSwipeHandlers={transitionSwipeHandlers}
      onOpenNativeVault={onOpenNativeVault}
    />
  )
}

function phoneWorkspaceEditorOptions(props: PhoneWorkspaceProps): PhoneWorkspaceEditorOptions {
  return {
    initialEditorEditing: props.initialEditorEditing ?? true,
    initialEditorEditingMode: props.initialEditorEditingMode ?? 'wysiwyg',
    layoutProbe: props.layoutProbe ?? false,
    sourceIdleSave: props.sourceIdleSave ?? true,
    sourceSelectionProbe: props.sourceSelectionProbe ?? false,
    wysiwygAutocompleteProbe: props.wysiwygAutocompleteProbe ?? false,
    wysiwygExternalLinkProbe: props.wysiwygExternalLinkProbe ?? false,
    wysiwygFormatCommandProbe: props.wysiwygFormatCommandProbe ?? false,
    wysiwygInputTransformProbe: props.wysiwygInputTransformProbe ?? false,
    wysiwygMarkdownBlockProbe: props.wysiwygMarkdownBlockProbe ?? false,
    wysiwygMathEditProbe: props.wysiwygMathEditProbe ?? false,
    wysiwygMutationProbe: props.wysiwygMutationProbe ?? false,
    wysiwygTableCommandMutationProbe: props.wysiwygTableCommandMutationProbe ?? false,
    wysiwygWikilinkInsertProbe: props.wysiwygWikilinkInsertProbe ?? false,
  }
}

type PhoneWorkspaceNavigation = ReturnType<typeof usePhoneWorkspaceNavigation>

function selectAdjacentVisiblePhoneNote(
  notes: MobileNote[],
  selectedNoteId: string | null,
  onSelectNote: (noteId: string) => void,
  direction: -1 | 1,
) {
  if (notes.length === 0) return
  const currentIndex = Math.max(0, notes.findIndex((note) => note.id === selectedNoteId))
  const nextIndex = Math.max(0, Math.min(notes.length - 1, currentIndex + direction))
  const noteId = notes[nextIndex]?.id
  if (noteId) onSelectNote(noteId)
}

function usePhoneWorkspaceNavigation({
  controller,
  setPhoneState,
  setSourceModeRequest,
}: {
  controller: PhoneWorkspaceController
  setPhoneState: (nextState: PhoneWorkspaceState, options?: PhoneStateTransitionOptions) => void
  setSourceModeRequest: Dispatch<SetStateAction<number>>
}) {
  const openList = useCallback((options?: PhoneStateTransitionOptions) => setPhoneState('list', options), [setPhoneState])
  const openSidebar = useCallback((options?: PhoneStateTransitionOptions) => setPhoneState('sidebar', options), [setPhoneState])
  const openProperties = useCallback((options?: PhoneStateTransitionOptions) => setPhoneState('properties', options), [setPhoneState])
  const openEditor = useCallback((noteIdOrOptions?: string | PhoneStateTransitionOptions, options?: PhoneStateTransitionOptions) => {
    if (typeof noteIdOrOptions === 'string') {
      controller.onSelectNote(noteIdOrOptions)
      setPhoneState('editor', options)
      return
    }

    setPhoneState('editor', noteIdOrOptions)
  }, [controller, setPhoneState])
  const openSourceEditor = useCallback(() => {
    setSourceModeRequest((current) => current + 1)
    setPhoneState('editor')
  }, [setPhoneState, setSourceModeRequest])
  const openNeighborhoodList = useCallback((noteId: string) => {
    controller.onEnterNeighborhood(noteId)
    setPhoneState('list')
  }, [controller, setPhoneState])

  return {
    openEditor,
    openList,
    openNeighborhoodList,
    openProperties,
    openSidebar,
    openSourceEditor,
  }
}

function usePhoneCommandPaletteProof(commands: ReturnType<typeof buildMobileCommandPaletteCommands>, enabled: boolean) {
  useEffect(() => {
    if (enabled) logNativeMobileCommandPaletteProof(commands)
  }, [commands, enabled])
}

function usePhoneKeyboardShortcutBridgeProof(enabled: boolean) {
  useEffect(() => {
    if (enabled) logNativeMobileKeyboardShortcutBridgeProof()
  }, [enabled])
}

function useCreateRelationshipTargetAndOpenEditor(
  controller: PhoneWorkspaceController,
  setPhoneState: (nextState: PhoneWorkspaceState, options?: PhoneStateTransitionOptions) => void,
) {
  return useCallback(() => {
    controller.onCreateRelationshipTarget()
    setPhoneState('editor')
  }, [controller, setPhoneState])
}

function usePhoneTableOfContentsTarget(setPhoneState: (nextState: PhoneWorkspaceState, options?: PhoneStateTransitionOptions) => void) {
  const [target, setTarget] = useState<PhoneTableOfContentsTargetRequest | null>(null)
  const select = useCallback((nextTarget: MobileTableOfContentsTarget) => {
    setTarget((current) => ({
      ...nextTarget,
      requestId: (current?.requestId ?? 0) + 1,
    }))
    setPhoneState('editor')
  }, [setPhoneState])

  return { select, target }
}

type PhoneWorkspaceRootProps = {
  commandPaletteElement: ReactNode
  controller: PhoneWorkspaceController
  createRelationshipTargetAndOpenEditor: () => void
  dragPreview: PhoneSwipePreview
  editorCommandRegistry: ReturnType<typeof useMobileEditorCommandRegistry>
  navigation: PhoneWorkspaceNavigation
  openCommandPalette: () => void
  options: PhoneWorkspaceEditorOptions
  phoneLayoutProbe: MobileLayoutProbe
  phoneState: PhoneWorkspaceState
  gestureHandoffState: PhoneWorkspaceState | null
  previousPhoneState: PhoneWorkspaceState
  preview: ReactNode
  selectTableOfContentsTarget: (target: MobileTableOfContentsTarget) => void
  sourceModeRequest: number
  suggestionNotes: MobileNote[]
  tableOfContentsTarget: PhoneTableOfContentsTargetRequest | null
  transitionSwipeHandlers: ReturnType<typeof usePhoneSwipeHandlers>
  onOpenNativeVault?: () => void
}

function PhoneWorkspaceRoot({
  commandPaletteElement,
  controller,
  createRelationshipTargetAndOpenEditor,
  dragPreview,
  editorCommandRegistry,
  navigation,
  openCommandPalette,
  options,
  phoneLayoutProbe,
  phoneState,
  gestureHandoffState,
  previousPhoneState,
  preview,
  selectTableOfContentsTarget,
  sourceModeRequest,
  suggestionNotes,
  tableOfContentsTarget,
  transitionSwipeHandlers,
  onOpenNativeVault,
}: PhoneWorkspaceRootProps) {
  return (
    <View {...phoneLayoutProbe('phone.root')} style={styles.root}>
      <PhoneWorkspaceTransition
        dragX={dragPreview.dragX}
        gestureHandoffActive={gestureHandoffState === phoneState}
        preview={preview}
        previousState={previousPhoneState}
        state={phoneState}
        swipeHandlers={nativePhoneDragPreviewEnabled() ? undefined : transitionSwipeHandlers}
      >
        <PhoneWorkspaceStateView
          controller={controller}
          options={options}
          openEditor={navigation.openEditor}
          openSourceEditor={navigation.openSourceEditor}
          openCommandPalette={openCommandPalette}
          openList={navigation.openList}
          openProperties={navigation.openProperties}
          openSidebar={navigation.openSidebar}
          phoneLayoutProbe={phoneLayoutProbe}
          phoneState={phoneState}
          phoneSwipePreview={dragPreview}
          onRegisterEditorCommands={editorCommandRegistry.register}
          sourceModeRequest={sourceModeRequest}
          suggestionNotes={suggestionNotes}
          tableOfContentsTarget={tableOfContentsTarget}
        />
      </PhoneWorkspaceTransition>
      <MobileSyncStatusBar sync={controller.snapshot.sync} onOpenLocalVault={onOpenNativeVault} />
      <WorkspaceActionSheetHost
        {...controller}
        compactTablet
        defaultPropertiesVisible={false}
        initialEditorEditing={options.initialEditorEditing}
        layoutProbe={options.layoutProbe}
        suggestionNotes={suggestionNotes}
        onCreateRelationshipTarget={createRelationshipTargetAndOpenEditor}
        onEnterNeighborhood={navigation.openNeighborhoodList}
        onSelectTableOfContentsTarget={selectTableOfContentsTarget}
      />
      {commandPaletteElement}
    </View>
  )
}

type PhoneTableOfContentsTargetRequest = MobileTableOfContentsTarget & { requestId: number }

function usePhoneCommandPalette({
  controller,
  initialOpen = false,
  onOpenNativeVault,
  onPastePlainText,
  onSaveActiveEditor,
  onToggleRawEditor,
  openEditor,
  openList,
  openNeighborhoodList,
  openProperties,
  openSidebar,
  phoneState,
}: {
  controller: PhoneWorkspaceController
  initialOpen?: boolean
  onOpenNativeVault?: () => void
  onPastePlainText?: () => void
  onSaveActiveEditor?: () => void
  onToggleRawEditor?: () => void
  openEditor: (noteId?: string) => void
  openList: () => void
  openNeighborhoodList: (noteId: string) => void
  openProperties: () => void
  openSidebar: () => void
  phoneState: PhoneWorkspaceState
}) {
  const [visible, setVisible] = useState(initialOpen)
  const open = useCallback(() => setVisible(true), [])
  const close = useCallback(() => setVisible(false), [])
  const toggleProperties = useCallback(() => {
    if (phoneState === 'properties') openEditor()
    else openProperties()
  }, [openEditor, openProperties, phoneState])
  const commands = useMemo(() => buildMobileCommandPaletteCommands({
    ...controller,
    onOpenCommandPalette: open,
    onOpenBacklinks: openProperties,
    onOpenNativeVault,
    onEnterNeighborhood: openNeighborhoodList,
    onPastePlainText,
    onSaveActiveEditor,
    onToggleRawEditor,
    onToggleProperties: toggleProperties,
    onViewAll: openSidebar,
    onViewEditorList: openList,
    onViewEditorOnly: openEditor,
  }), [
    controller,
    onOpenNativeVault,
    open,
    onPastePlainText,
    onSaveActiveEditor,
    onToggleRawEditor,
    openEditor,
    openList,
    openNeighborhoodList,
    openProperties,
    openSidebar,
    toggleProperties,
  ])

  return {
    commands,
    element: visible ? <MobileCommandPalette commands={commands} onClose={close} /> : null,
    open,
  }
}

function usePhoneState(initialState: PhoneWorkspaceState) {
  const [state, setState] = useState({
    current: initialState,
    gestureHandoff: null as PhoneWorkspaceState | null,
    previous: initialState,
  })
  const setPhoneState = useCallback((nextState: PhoneWorkspaceState, options?: PhoneStateTransitionOptions) => {
    setState((currentState) => {
      const gestureHandoff = options?.gestureHandoff ? nextState : null
      if (currentState.current === nextState) {
        if (currentState.gestureHandoff === gestureHandoff) return currentState
        return { ...currentState, gestureHandoff }
      }

      return { current: nextState, gestureHandoff, previous: currentState.current }
    })
  }, [])
  const clearGestureHandoff = useCallback(() => {
    setState((currentState) => {
      if (!currentState.gestureHandoff) return currentState
      return { ...currentState, gestureHandoff: null }
    })
  }, [])

  return {
    clearGestureHandoff,
    gestureHandoffState: state.gestureHandoff,
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
  phoneSwipePreview,
}: {
  openEditor: (options?: PhoneStateTransitionOptions) => void
  openList: (options?: PhoneStateTransitionOptions) => void
  openProperties: (options?: PhoneStateTransitionOptions) => void
  openSidebar: (options?: PhoneStateTransitionOptions) => void
  phoneState: PhoneWorkspaceState
  phoneSwipePreview: PhoneSwipePreview
}) {
  const commitEditor = useCallback(() => phoneSwipePreview.commit('editor', () => openEditor(phoneGestureHandoffOptions)), [openEditor, phoneSwipePreview])
  const commitList = useCallback(() => phoneSwipePreview.commit('list', () => openList(phoneGestureHandoffOptions)), [openList, phoneSwipePreview])
  const commitProperties = useCallback(() => phoneSwipePreview.commit('properties', () => openProperties(phoneGestureHandoffOptions)), [openProperties, phoneSwipePreview])
  const commitSidebar = useCallback(() => phoneSwipePreview.commit('sidebar', () => openSidebar(phoneGestureHandoffOptions)), [openSidebar, phoneSwipePreview])
  const editorSwipe = useHorizontalSwipe({ onSwipeLeft: commitProperties, onSwipeRight: commitList })
  const listSwipe = useHorizontalSwipe({ onSwipeRight: commitSidebar })
  const propertiesSwipe = useHorizontalSwipe({ onSwipeRight: commitEditor })
  const sidebarSwipe = useHorizontalSwipe({ onSwipeLeft: commitList })

  if (phoneState === 'editor') return editorSwipe
  if (phoneState === 'properties') return propertiesSwipe
  if (phoneState === 'sidebar') return sidebarSwipe
  return listSwipe
}

function usePhoneDragPreview(
  phoneState: PhoneWorkspaceState,
  screenWidth: number,
  clearGestureHandoff: () => void,
) {
  const enabled = nativePhoneDragPreviewEnabled()
  const [dragX] = useState(() => new NativeAnimated.Value(0))
  const [previewState, setPreviewState] = useState<PhoneWorkspaceState | null>(null)
  const commit = useCallback((nextState: PhoneWorkspaceState, action: () => void) => {
    if (!enabled) {
      action()
      return
    }

    dragX.stopAnimation()
    const commitOffset = phoneWorkspaceDragCommitOffset(phoneState, nextState, screenWidth)
    if (commitOffset === 0) {
      dragX.setValue(0)
      setPreviewState(null)
      action()
      return
    }

    setPreviewState(nextState)
    NativeAnimated.timing(dragX, {
      duration: phoneWorkspaceTransitionDurationMs,
      toValue: commitOffset,
      useNativeDriver: true,
    }).start(() => {
      action()
      requestAnimationFrame(() => {
        dragX.setValue(0)
        setPreviewState(null)
        clearGestureHandoff()
      })
    })
  }, [clearGestureHandoff, dragX, enabled, phoneState, screenWidth])
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
    if (committed) return

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
    commit,
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
  options,
  openEditor,
  openSourceEditor,
  openCommandPalette,
  openList,
  openProperties,
  openSidebar,
  suggestionNotes,
  sourceModeRequest,
}: {
  controller: PhoneWorkspaceController
  dragPreview: PhoneSwipePreview
  options: PhoneWorkspaceEditorOptions
  openEditor: (noteId?: string) => void
  openSourceEditor: () => void
  openCommandPalette: () => void
  openList: () => void
  openProperties: () => void
  openSidebar: () => void
  suggestionNotes: MobileNote[]
  sourceModeRequest: number
}): ReactNode {
  if (!dragPreview.previewState) return null

  return (
    <PhoneWorkspaceStateView
      controller={controller}
      options={phoneWorkspacePreviewOptions(options)}
      openEditor={openEditor}
      openSourceEditor={openSourceEditor}
      openCommandPalette={openCommandPalette}
      openList={openList}
      openProperties={openProperties}
      openSidebar={openSidebar}
      phoneLayoutProbe={disabledPhoneLayoutProbe}
      phoneState={dragPreview.previewState}
      phoneSwipePreview={dragPreview}
      sourceModeRequest={sourceModeRequest}
      suggestionNotes={suggestionNotes}
      tableOfContentsTarget={null}
    />
  )
}

function phoneWorkspacePreviewOptions(options: PhoneWorkspaceEditorOptions): PhoneWorkspaceEditorOptions {
  return {
    ...options,
    layoutProbe: false,
    sourceSelectionProbe: false,
    wysiwygAutocompleteProbe: false,
    wysiwygExternalLinkProbe: false,
    wysiwygFormatCommandProbe: false,
    wysiwygInputTransformProbe: false,
    wysiwygMarkdownBlockProbe: false,
    wysiwygMathEditProbe: false,
    wysiwygMutationProbe: false,
    wysiwygTableCommandMutationProbe: false,
    wysiwygWikilinkInsertProbe: false,
  }
}

type PhoneWorkspaceStateViewProps = {
  controller: PhoneWorkspaceController
  options: PhoneWorkspaceEditorOptions
  openEditor: (noteId?: string) => void
  openSourceEditor: () => void
  openCommandPalette: () => void
  openList: () => void
  openProperties: () => void
  openSidebar: () => void
  phoneLayoutProbe: MobileLayoutProbe
  phoneState: PhoneWorkspaceState
  phoneSwipePreview: PhoneSwipePreview
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  sourceModeRequest: number
  suggestionNotes: MobileNote[]
  tableOfContentsTarget: PhoneTableOfContentsTargetRequest | null
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
  options,
  openCommandPalette,
  openEditor,
  openSidebar,
  phoneLayoutProbe,
  phoneSwipePreview,
}: PhoneWorkspaceStateViewProps) {
  const commitSidebar = useCallback(
    () => phoneSwipePreview.commit('sidebar', openSidebar),
    [openSidebar, phoneSwipePreview],
  )
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeRight: commitSidebar,
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
        layoutProbe={options.layoutProbe}
        leading={(
          <View style={styles.leadingActions}>
            <MobileIconButton accessibilityLabel={mobileText('sidebar.action.expand')} testID="phone-sidebar-action" onPress={openSidebar}>
              <List color={mobileColors.textMuted} size={18} />
            </MobileIconButton>
            <PhoneCommandPaletteButton onPress={openCommandPalette} />
          </View>
        )}
        neighborhood={controller.noteListNeighborhood}
        notes={controller.notes}
        propertyDisplayModes={controller.snapshot.vaultConfig?.propertyDisplayModes}
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
  options,
  openCommandPalette,
  openEditor,
  openList,
  phoneLayoutProbe,
  phoneSwipePreview,
}: PhoneWorkspaceStateViewProps) {
  const { width } = useWindowDimensions()
  const drawerWidth = phoneWorkspaceSidebarDrawerWidth(width)
  const commitList = useCallback(
    () => phoneSwipePreview.commit('list', openList),
    [openList, phoneSwipePreview],
  )
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeLeft: commitList,
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
          layoutProbe={options.layoutProbe}
          neighborhood={controller.noteListNeighborhood}
          notes={controller.notes}
          propertyDisplayModes={controller.snapshot.vaultConfig?.propertyDisplayModes}
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
          layoutProbe={options.layoutProbe}
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
  options,
  openList,
  openCommandPalette,
  openProperties,
  onRegisterEditorCommands,
  phoneLayoutProbe,
  phoneSwipePreview,
  sourceModeRequest,
  suggestionNotes,
  tableOfContentsTarget,
}: PhoneWorkspaceStateViewProps) {
  const commitList = useCallback(
    () => phoneSwipePreview.commit('list', openList),
    [openList, phoneSwipePreview],
  )
  const commitProperties = useCallback(
    () => phoneSwipePreview.commit('properties', openProperties),
    [openProperties, phoneSwipePreview],
  )
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeLeft: commitProperties,
    onSwipeRight: commitList,
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
        notes={suggestionNotes}
        onNavigateWikilink={handleNavigateWikilink}
        onRegisterEditorCommands={onRegisterEditorCommands}
        options={options}
        sourceModeRequest={sourceModeRequest}
        tableOfContentsTarget={tableOfContentsTarget}
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
  notes,
  onNavigateWikilink,
  onRegisterEditorCommands,
  options,
  sourceModeRequest,
  tableOfContentsTarget,
}: {
  controller: PhoneWorkspaceController
  notes: MobileNote[]
  onNavigateWikilink: (target: string) => void
  onRegisterEditorCommands?: RegisterMobileEditorCommands
  options: PhoneWorkspaceEditorOptions
  sourceModeRequest: number
  tableOfContentsTarget: PhoneTableOfContentsTargetRequest | null
}) {
  const sourceModeRequested = sourceModeRequest > 0

  return (
    <TabletEditorPanel
      key={`phone-editor-${controller.selectedNote?.id ?? 'none'}-${sourceModeRequest}`}
      blocks={controller.editorBlocks}
      bullets={controller.editorBullets}
      compact
      initialEditing={sourceModeRequested || options.initialEditorEditing}
      initialEditingMode={sourceModeRequested ? 'source' : options.initialEditorEditingMode}
      layoutProbe={options.layoutProbe}
      note={controller.selectedNote}
      notes={notes}
      onNavigateWikilink={onNavigateWikilink}
      onOpenMoreActions={controller.onOpenMoreActions}
      onRegisterEditorCommands={onRegisterEditorCommands}
      onToggleFavorite={controller.onToggleFavorite}
      onUpdateContent={controller.onUpdateNoteContent}
      sourceIdleSave={options.sourceIdleSave}
      sourceSelectionProbe={options.sourceSelectionProbe}
      tableOfContentsTarget={tableOfContentsTarget}
      typeDefinitions={controller.snapshot.typeDefinitions}
      vaultRootUri={controller.vaultRootUri}
      wysiwygAutocompleteProbe={options.wysiwygAutocompleteProbe}
      wysiwygExternalLinkProbe={options.wysiwygExternalLinkProbe}
      wysiwygFormatCommandProbe={options.wysiwygFormatCommandProbe}
      wysiwygInputTransformProbe={options.wysiwygInputTransformProbe}
      wysiwygMarkdownBlockProbe={options.wysiwygMarkdownBlockProbe}
      wysiwygMathEditProbe={options.wysiwygMathEditProbe}
      wysiwygTableCommandMutationProbe={options.wysiwygTableCommandMutationProbe}
      wysiwygWikilinkInsertProbe={options.wysiwygWikilinkInsertProbe}
      wysiwygMutationProbe={options.wysiwygMutationProbe}
    />
  )
}

function PhonePropertiesScreen({
  controller,
  options,
  openEditor,
  openSourceEditor,
  openCommandPalette,
  openList,
  phoneLayoutProbe,
  phoneSwipePreview,
}: PhoneWorkspaceStateViewProps) {
  const returnToEditor = useCallback(() => openEditor(), [openEditor])
  const commitEditor = useCallback(
    () => phoneSwipePreview.commit('editor', returnToEditor),
    [phoneSwipePreview, returnToEditor],
  )
  const enterNeighborhood = useCallback((noteId: string) => {
    controller.onEnterNeighborhood(noteId)
    openList()
  }, [controller, openList])
  const referenceGroups = useMobileInspectorReferenceGroups(controller.selectedNote, controller.snapshot)
  const swipeHandlers = useHorizontalSwipe({
    ...phoneSwipePreviewHandlers(phoneSwipePreview),
    onSwipeRight: commitEditor,
  })

  return (
    <View {...swipeHandlers} {...probeProps(phoneLayoutProbe, 'phone.properties.screen')} style={styles.screen} testID="phone-properties-screen">
      <PhoneTopBar title={mobileText('inspector.title.properties')} onBack={returnToEditor}>
        <PhoneCommandPaletteButton onPress={openCommandPalette} />
      </PhoneTopBar>
      <MobilePropertiesPanel
        compact
        fullWidth
        layoutProbe={options.layoutProbe}
        note={controller.selectedNote}
        typeDefinitions={controller.snapshot.typeDefinitions}
        onAddProperty={controller.onAddProperty}
        onAddRelationship={controller.onAddRelationship}
        onDeleteProperty={controller.onDeleteProperty}
        onEditProperty={controller.onEditProperty}
        onEnterNeighborhood={enterNeighborhood}
        onFixInvalidFrontmatter={openSourceEditor}
        onInitializeProperties={controller.onInitializeProperties}
        onCreateMissingType={controller.onOpenCreateTypeWithName}
        onOpenChangeNoteType={controller.onOpenChangeNoteType}
        onRemoveRelationship={controller.onRemoveRelationship}
        propertyDisplayModes={controller.snapshot.vaultConfig?.propertyDisplayModes}
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
