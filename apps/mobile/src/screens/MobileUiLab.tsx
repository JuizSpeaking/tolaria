import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Linking, StyleSheet, useWindowDimensions, View } from 'react-native'
import { PhoneWorkspace, type PhoneWorkspaceState } from './PhoneWorkspace'
import { TabletWorkspace } from './TabletWorkspace'
import type { TabletTransitionProbeMode } from './tabletWorkspaceTypes'
import { readOnlyWorkspaceRepository, type ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
import {
  createDevVaultWorkspaceRepository,
  fetchDevVaultWorkspaceState,
  type DevVaultWorkspaceState,
} from '../workspace/devVaultWorkspaceRepository'
import {
  pickNativeWorkspaceDirectory,
  type NativeWorkspaceSelection,
} from '../workspace/nativeWorkspacePicker'
import { initialMobileEditorStateFromMode } from './mobileEditorMode'
import {
  nativeSourceSelectionProbeEnabled,
} from '../qa/nativeSourceSelectionProbe'
import {
  nativeWysiwygMutationProbeEnabled,
  nativeWysiwygMutationProbeInitialContent,
} from '../qa/nativeWysiwygMutationProbe'
import {
  nativeWysiwygPersistenceProbeEnabled,
} from '../qa/nativeWysiwygPersistenceProbe'
import {
  nativeWysiwygAutocompleteProbeEnabled,
} from '../qa/nativeWysiwygAutocompleteProbe'
import {
  nativeWysiwygFormatCommandProbeEnabled,
} from '../qa/nativeWysiwygFormatCommandProbe'
import {
  nativeWysiwygInputTransformProbeEnabled,
} from '../qa/nativeWysiwygInputTransformProbe'
import {
  nativeWysiwygExternalLinkProbeEnabled,
} from '../qa/nativeWysiwygExternalLinkProbe'
import {
  nativeWysiwygWikilinkInsertProbeEnabled,
} from '../qa/nativeWysiwygWikilinkInsertProbe'
import {
  nativeWysiwygMarkdownBlockProbeEnabled,
} from '../qa/nativeWysiwygMarkdownBlockProbe'
import {
  nativeWysiwygMathEditProbeEnabled,
} from '../qa/nativeWysiwygMathEditProbe'
import {
  nativeWysiwygTableCommandMutationProbeEnabled,
} from '../qa/nativeWysiwygTableCommandMutationProbe'
import {
  nativeWysiwygPersistenceProbeRepository,
  nativeWysiwygPersistenceProbeRequest,
} from '../qa/nativeWysiwygPersistenceProbeRepository'
import {
  nativeWorkspacePersistenceProbeEnabled,
} from '../qa/nativeWorkspacePersistenceProbe'
import {
  nativeWorkspacePersistenceProbeRepository,
  nativeWorkspacePersistenceProbeRequest,
} from '../qa/nativeWorkspacePersistenceProbeRepository'
import {
  nativeTableOfContentsLogLine,
  nativeTableOfContentsProbeContent,
  nativeTableOfContentsProbeEnabled,
  nativeTableOfContentsProbeTitle,
  type NativeTableOfContentsProof,
} from '../qa/nativeTableOfContentsProbe'
import {
  nativeMobileActionAdapterLogLine,
  nativeMobileActionAdapterProbeEnabled,
  nativeMobileActionAdapterProof,
} from '../qa/nativeMobileActionAdapterProbe'
import {
  nativeMobileCommandPaletteProbeEnabled,
} from '../qa/nativeMobileCommandPaletteProbe'
import {
  nativeMobileKeyboardShortcutProbeEnabled,
} from '../qa/nativeMobileKeyboardShortcutProof'
import { setMobileLayoutMetricSinkUrl } from '../qa/mobileLayoutProbe'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import {
  localVaultEditorBlocks,
  localVaultEditorBullets,
  localVaultSnippet,
} from '../workspace/localVaultMarkdown'
import { Text } from '../components/ui/text'
import { mobileText } from '../i18n/mobileText'
import { mobileColors, mobileSpace, mobileType } from '../ui/tokens'
import {
  mobileSnapshotWithRequestedSelectedNote,
  requestedSelectedNoteId,
} from './mobileUiLabSelectedNote'
import { requestedActionSheetQaTarget } from './mobileActionSheetQaTarget'
import { tabletTransitionProbeMode } from './tabletTransitionProbeMode'

type DevVaultLoadState =
  | { status: 'idle' | 'loading' }
  | { message: string; status: 'error' }
  | { state: DevVaultWorkspaceState; status: 'ready' }

export function MobileUiLab() {
  const { width } = useWindowDimensions()
  const isWideEnoughForTablet = width >= 900
  const searchParams = useMobileUiSearchParams()
  const [nativeWorkspace, setNativeWorkspace] = useState<NativeWorkspaceSelection | null>(null)
  const workspacePersistenceProbe = nativeWorkspacePersistenceProbeEnabled(searchParams)
  const wysiwygPersistenceProbe = nativeWysiwygPersistenceProbeEnabled(searchParams)
  const workspaceSource = useMobileUiWorkspaceSource({
    nativeWorkspace,
    searchParams,
    workspacePersistenceProbe,
    wysiwygPersistenceProbe,
  })
  const { devVault, devVaultUrl, repository, repositoryRequest, scenarioId, source } = workspaceSource
  const qa = mobileUiQaFlags(searchParams, { wysiwygPersistenceProbe })
  const metricSinkUrl = qa.layoutProbe ? searchParams.get('metricSink') : null
  const actionAdapterProbeRunKey = searchParams.get('qaRun') ?? 'interactive'
  const selectedSnapshot = mobileSnapshotWithRequestedSelectedNote(
    workspaceSource.baseSnapshot,
    requestedSelectedNoteId(searchParams),
  )
  const snapshot = mobileSnapshotForProbes(selectedSnapshot, {
    tableOfContentsProbe: qa.tableOfContentsProbe,
    wysiwygMutationProbe: qa.wysiwygMutationProbe,
    wysiwygPersistenceProbe,
  })
  const workspaceKey = mobileWorkspaceKey({
    ...qa,
    qaRun: searchParams.get('qaRun'),
    scenarioId,
    snapshot,
    source,
    workspacePersistenceProbe,
    wysiwygPersistenceProbe,
  })
  const handleOpenNativeVault = useCallback(async () => {
    const selection = await pickNativeWorkspaceDirectory(repositoryRequest.vaultRootUri)
    if (selection) setNativeWorkspace(selection)
  }, [repositoryRequest.vaultRootUri])
  const handleTableOfContentsScrollProof = useCallback((proof: NativeTableOfContentsProof) => {
    console.info(nativeTableOfContentsLogLine(proof))
  }, [])

  useLayoutEffect(() => {
    setMobileLayoutMetricSinkUrl(metricSinkUrl)
    return () => setMobileLayoutMetricSinkUrl(null)
  }, [metricSinkUrl])
  useMobileActionAdapterProbe({
    devVaultStatus: devVault.status,
    enabled: qa.mobileActionAdapterProbe,
    repositoryRequest,
    runKey: actionAdapterProbeRunKey,
    snapshot,
    source,
  })

  if (source === 'dev' && devVault.status !== 'ready') {
    return <DevVaultStatusScreen state={devVault} url={devVaultUrl} />
  }

  if (isWideEnoughForTablet) {
    return (
      <TabletWorkspace
        key={workspaceKey}
        forceDesktopPanels={qa.forceDesktopPanels}
        initialCommandPaletteOpen={qa.initialCommandPaletteOpen}
        initialActionSheet={qa.initialActionSheet}
        initialEditorEditing={qa.initialEditorEditing}
        initialEditorEditingMode={qa.initialEditorEditingMode}
        commandPaletteProbe={qa.mobileCommandPaletteProbe}
        keyboardShortcutProbe={qa.mobileKeyboardShortcutProbe}
        layoutProbe={qa.layoutProbe}
        onOpenNativeVault={handleOpenNativeVault}
        repository={repository}
        repositoryRequest={repositoryRequest}
        sourceIdleSave={!editorIdleSaveDisabled(searchParams)}
        sourceSelectionProbe={qa.sourceSelectionProbe}
        snapshot={snapshot}
        tableOfContentsProbe={qa.tableOfContentsProbe}
        tabletTransitionProbe={qa.tabletTransitionProbe}
        onTableOfContentsScrollProof={qa.tableOfContentsProbe ? handleTableOfContentsScrollProof : undefined}
        wysiwygAutocompleteProbe={qa.wysiwygAutocompleteProbe}
        wysiwygExternalLinkProbe={qa.wysiwygExternalLinkProbe}
        wysiwygFormatCommandProbe={qa.wysiwygFormatCommandProbe}
        wysiwygInputTransformProbe={qa.wysiwygInputTransformProbe}
        wysiwygMarkdownBlockProbe={qa.wysiwygMarkdownBlockProbe}
        wysiwygMathEditProbe={qa.wysiwygMathEditProbe}
        wysiwygTableCommandMutationProbe={qa.wysiwygTableCommandMutationProbe}
        wysiwygWikilinkInsertProbe={qa.wysiwygWikilinkInsertProbe}
        wysiwygMutationProbe={qa.wysiwygMutationProbe}
      />
    )
  }

  return (
    <PhoneWorkspace
      key={workspaceKey}
      initialEditorEditing={qa.initialEditorEditing}
      initialEditorEditingMode={qa.initialEditorEditingMode}
      initialCommandPaletteOpen={qa.initialCommandPaletteOpen}
      initialActionSheet={qa.initialActionSheet}
      commandPaletteProbe={qa.mobileCommandPaletteProbe}
      keyboardShortcutProbe={qa.mobileKeyboardShortcutProbe}
      initialState={currentPhoneState(searchParams)}
      layoutProbe={qa.layoutProbe}
      onOpenNativeVault={handleOpenNativeVault}
      repository={repository}
      repositoryRequest={repositoryRequest}
      sourceIdleSave={!editorIdleSaveDisabled(searchParams)}
      sourceSelectionProbe={qa.sourceSelectionProbe}
      snapshot={snapshot}
      wysiwygAutocompleteProbe={qa.wysiwygAutocompleteProbe}
      wysiwygExternalLinkProbe={qa.wysiwygExternalLinkProbe}
      wysiwygFormatCommandProbe={qa.wysiwygFormatCommandProbe}
      wysiwygInputTransformProbe={qa.wysiwygInputTransformProbe}
      wysiwygMarkdownBlockProbe={qa.wysiwygMarkdownBlockProbe}
      wysiwygMathEditProbe={qa.wysiwygMathEditProbe}
      wysiwygTableCommandMutationProbe={qa.wysiwygTableCommandMutationProbe}
      wysiwygWikilinkInsertProbe={qa.wysiwygWikilinkInsertProbe}
      wysiwygMutationProbe={qa.wysiwygMutationProbe}
    />
  )
}

function currentScenarioId(searchParams: URLSearchParams) {
  return searchParams.get('scenario') || envValue('EXPO_PUBLIC_TOLARIA_SCENARIO')
}

function currentPhoneState(searchParams: URLSearchParams): PhoneWorkspaceState {
  const value = searchParams.get('phoneState')

  if (value === 'editor' || value === 'properties' || value === 'sidebar') return value

  return 'list'
}

function currentSnapshotSource(
  searchParams: URLSearchParams,
  nativeWorkspace: NativeWorkspaceSelection | null,
): NonNullable<ReadOnlyWorkspaceRequest['source']> {
  const requestedSource = searchParams.get('source') ?? envValue('EXPO_PUBLIC_TOLARIA_WORKSPACE_SOURCE')
  if (nativeWorkspace) return 'native'
  if (requestedSource === 'native-vault') return 'native'
  if (devVaultSourceRequested(requestedSource)) return 'dev'
  return requestedSource === 'host-vault' ? 'host' : 'fixture'
}

function devVaultSourceRequested(source: string | null) {
  return source === 'dev-vault' || source === 'local-vault'
}

function editorMode(searchParams: URLSearchParams) {
  return searchParams.get('editorMode')
}

function tabletPanelsMode(searchParams: URLSearchParams) {
  return searchParams.get('tabletPanels')
}

function mobileUiQaFlags(
  searchParams: URLSearchParams,
  { wysiwygPersistenceProbe }: { wysiwygPersistenceProbe: boolean },
) {
  const { initialEditorEditing, initialEditorEditingMode } = initialEditorState(searchParams)

  return {
    forceDesktopPanels: tabletPanelsMode(searchParams) === 'all',
    initialCommandPaletteOpen: initialCommandPaletteOpen(searchParams),
    initialActionSheet: requestedActionSheetQaTarget(searchParams),
    initialEditorEditing,
    initialEditorEditingMode,
    mobileCommandPaletteProbe: nativeMobileCommandPaletteProbeEnabled(searchParams),
    mobileKeyboardShortcutProbe: nativeMobileKeyboardShortcutProbeEnabled(searchParams),
    layoutProbe: layoutProbeEnabled(searchParams),
    mobileActionAdapterProbe: nativeMobileActionAdapterProbeEnabled(searchParams),
    sourceSelectionProbe: nativeSourceSelectionProbeEnabled(searchParams),
    tableOfContentsProbe: nativeTableOfContentsProbeEnabled(searchParams),
    tabletTransitionProbe: tabletTransitionProbeEnabled(searchParams),
    wysiwygAutocompleteProbe: nativeWysiwygAutocompleteProbeEnabled(searchParams),
    wysiwygExternalLinkProbe: nativeWysiwygExternalLinkProbeEnabled(searchParams),
    wysiwygFormatCommandProbe: nativeWysiwygFormatCommandProbeEnabled(searchParams),
    wysiwygInputTransformProbe: nativeWysiwygInputTransformProbeEnabled(searchParams),
    wysiwygMarkdownBlockProbe: nativeWysiwygMarkdownBlockProbeEnabled(searchParams),
    wysiwygMathEditProbe: nativeWysiwygMathEditProbeEnabled(searchParams),
    wysiwygMutationProbe: nativeWysiwygMutationProbeEnabled(searchParams) || wysiwygPersistenceProbe,
    wysiwygTableCommandMutationProbe: nativeWysiwygTableCommandMutationProbeEnabled(searchParams),
    wysiwygWikilinkInsertProbe: nativeWysiwygWikilinkInsertProbeEnabled(searchParams),
  }
}

function initialEditorState(searchParams: URLSearchParams) {
  const requestedMode = editorMode(searchParams)
  if (requestedMode) return initialMobileEditorStateFromMode(requestedMode)

  return {
    initialEditorEditing: true,
    initialEditorEditingMode: 'wysiwyg' as const,
  }
}

function mobileRepositoryForProbes({
  workspacePersistenceProbe,
  wysiwygPersistenceProbe,
}: {
  workspacePersistenceProbe: boolean
  wysiwygPersistenceProbe: boolean
}) {
  if (workspacePersistenceProbe) return nativeWorkspacePersistenceProbeRepository(readOnlyWorkspaceRepository)
  if (wysiwygPersistenceProbe) return nativeWysiwygPersistenceProbeRepository(readOnlyWorkspaceRepository)
  return readOnlyWorkspaceRepository
}

function mobileRepositoryRequestForProbes(
  request: ReadOnlyWorkspaceRequest,
  {
    workspacePersistenceProbe,
    wysiwygPersistenceProbe,
  }: {
    workspacePersistenceProbe: boolean
    wysiwygPersistenceProbe: boolean
  },
) {
  if (workspacePersistenceProbe) return nativeWorkspacePersistenceProbeRequest(request)
  if (wysiwygPersistenceProbe) return nativeWysiwygPersistenceProbeRequest(request)
  return request
}

function useMobileUiWorkspaceSource({
  nativeWorkspace,
  searchParams,
  workspacePersistenceProbe,
  wysiwygPersistenceProbe,
}: {
  nativeWorkspace: NativeWorkspaceSelection | null
  searchParams: URLSearchParams
  workspacePersistenceProbe: boolean
  wysiwygPersistenceProbe: boolean
}) {
  const scenarioId = currentScenarioId(searchParams)
  const source = currentSnapshotSource(searchParams, nativeWorkspace)
  const devVaultUrl = currentDevVaultUrl(searchParams)
  const devVault = useDevVaultWorkspaceState(source === 'dev', devVaultUrl)
  const repositoryRequest = mobileRepositoryRequestForProbes({
    scenarioId,
    source,
    vaultAlias: currentVaultAlias(searchParams, nativeWorkspace),
    vaultLabel: currentVaultLabel(searchParams, nativeWorkspace),
    vaultRootUri: currentVaultRootUri(searchParams, nativeWorkspace),
  }, { workspacePersistenceProbe, wysiwygPersistenceProbe })
  const probeRepository = mobileRepositoryForProbes({ workspacePersistenceProbe, wysiwygPersistenceProbe })
  const repository = source === 'dev' && devVault.status === 'ready'
    ? createDevVaultWorkspaceRepository(devVault.state)
    : probeRepository
  const baseSnapshot = source === 'dev' && devVault.status === 'ready'
    ? devVault.state.snapshot
    : repository.readSnapshot(repositoryRequest)

  return {
    baseSnapshot,
    devVault,
    devVaultUrl,
    repository,
    repositoryRequest,
    scenarioId,
    source,
  }
}

function currentVaultRootUri(
  searchParams: URLSearchParams,
  nativeWorkspace: NativeWorkspaceSelection | null,
): string | null {
  if (nativeWorkspace) return nativeWorkspace.vaultRootUri
  return searchParams.get('vaultUri') || envValue('EXPO_PUBLIC_TOLARIA_NATIVE_VAULT_URI')
}

function currentDevVaultUrl(searchParams: URLSearchParams): string | null {
  return searchParams.get('devVaultUrl') || envValue('EXPO_PUBLIC_TOLARIA_DEV_VAULT_URL')
}

function currentVaultLabel(
  searchParams: URLSearchParams,
  nativeWorkspace: NativeWorkspaceSelection | null,
): string | null {
  if (nativeWorkspace) return nativeWorkspace.vaultLabel
  return searchParams.get('vaultLabel') || envValue('EXPO_PUBLIC_TOLARIA_NATIVE_VAULT_LABEL')
}

function currentVaultAlias(
  searchParams: URLSearchParams,
  nativeWorkspace: NativeWorkspaceSelection | null,
): string | null {
  if (nativeWorkspace) return nativeWorkspace.vaultAlias
  return searchParams.get('vaultAlias') || envValue('EXPO_PUBLIC_TOLARIA_NATIVE_VAULT_ALIAS')
}

function layoutProbeEnabled(searchParams: URLSearchParams) {
  return searchParams.get('layoutProbe') === '1' || envFlagEnabled('EXPO_PUBLIC_TOLARIA_LAYOUT_PROBE')
}

function tabletTransitionProbeEnabled(searchParams: URLSearchParams): TabletTransitionProbeMode {
  return tabletTransitionProbeMode({
    envProbe: envValue('EXPO_PUBLIC_TOLARIA_TABLET_TRANSITION_PROBE'),
    queryProbe: searchParams.get('tabletTransitionProbe'),
  })
}

function editorIdleSaveDisabled(searchParams: URLSearchParams) {
  return searchParams.get('disableEditorIdleSave') === '1'
}

function mobileSnapshotForProbes(
  snapshot: MobileWorkspaceSnapshot,
  {
    tableOfContentsProbe,
    wysiwygMutationProbe,
    wysiwygPersistenceProbe,
  }: {
    tableOfContentsProbe: boolean
    wysiwygMutationProbe: boolean
    wysiwygPersistenceProbe: boolean
  },
) {
  if (tableOfContentsProbe) return snapshotWithTableOfContentsProbeContent(snapshot)
  if (wysiwygMutationProbe && !wysiwygPersistenceProbe) return snapshotWithWysiwygMutationProbeContent(snapshot)

  return snapshot
}

function snapshotWithTableOfContentsProbeContent(snapshot: MobileWorkspaceSnapshot): MobileWorkspaceSnapshot {
  const selectedNoteId = snapshot.selectedNoteId ?? snapshot.notes[0]?.id
  if (!selectedNoteId) return snapshot

  const rawContent = nativeTableOfContentsProbeContent()
  const editorBlocks = localVaultEditorBlocks(rawContent)
  const editorBullets = localVaultEditorBullets(editorBlocks)
  const seedSelectedNote = (note: MobileNote) => note.id === selectedNoteId
    ? {
        ...note,
        editorBlocks,
        editorBullets,
        rawContent,
        snippet: localVaultSnippet(rawContent),
        title: nativeTableOfContentsProbeTitle(),
      }
    : note

  return {
    ...snapshot,
    allNotes: snapshot.allNotes?.map(seedSelectedNote),
    editorBlocks,
    editorBullets,
    notes: snapshot.notes.map(seedSelectedNote),
    selectedNoteId,
  }
}

function snapshotWithWysiwygMutationProbeContent(snapshot: MobileWorkspaceSnapshot): MobileWorkspaceSnapshot {
  const selectedNoteId = snapshot.selectedNoteId ?? snapshot.notes[0]?.id
  if (!selectedNoteId) return snapshot

  const seedSelectedNote = (note: MobileNote) => {
    if (note.id !== selectedNoteId || note.rawContent !== undefined) return note

    return {
      ...note,
      rawContent: nativeWysiwygMutationProbeInitialContent(note),
    }
  }

  return {
    ...snapshot,
    allNotes: snapshot.allNotes?.map(seedSelectedNote),
    notes: snapshot.notes.map(seedSelectedNote),
  }
}

function mobileWorkspaceKey({
  initialEditorEditing,
  initialEditorEditingMode,
  initialCommandPaletteOpen,
  forceDesktopPanels,
  layoutProbe,
  mobileCommandPaletteProbe,
  mobileKeyboardShortcutProbe,
  qaRun,
  scenarioId,
  snapshot,
  source,
  sourceSelectionProbe,
  mobileActionAdapterProbe,
  tableOfContentsProbe,
  tabletTransitionProbe,
  workspacePersistenceProbe,
  wysiwygAutocompleteProbe,
  wysiwygExternalLinkProbe,
  wysiwygFormatCommandProbe,
  wysiwygInputTransformProbe,
  wysiwygMarkdownBlockProbe,
  wysiwygMathEditProbe,
  wysiwygTableCommandMutationProbe,
  wysiwygWikilinkInsertProbe,
  wysiwygMutationProbe,
  wysiwygPersistenceProbe,
}: {
  initialEditorEditing: boolean
  initialEditorEditingMode: string
  initialCommandPaletteOpen: boolean
  forceDesktopPanels: boolean
  layoutProbe: boolean
  mobileCommandPaletteProbe: boolean
  mobileKeyboardShortcutProbe: boolean
  qaRun: string | null
  scenarioId: string | null
  snapshot: ReturnType<typeof readOnlyWorkspaceRepository.readSnapshot>
  source: ReturnType<typeof currentSnapshotSource>
  sourceSelectionProbe: boolean
  mobileActionAdapterProbe: boolean
  tableOfContentsProbe: boolean
  tabletTransitionProbe: TabletTransitionProbeMode
  workspacePersistenceProbe: boolean
  wysiwygAutocompleteProbe: boolean
  wysiwygExternalLinkProbe: boolean
  wysiwygFormatCommandProbe: boolean
  wysiwygInputTransformProbe: boolean
  wysiwygMarkdownBlockProbe: boolean
  wysiwygMathEditProbe: boolean
  wysiwygTableCommandMutationProbe: boolean
  wysiwygWikilinkInsertProbe: boolean
  wysiwygMutationProbe: boolean
  wysiwygPersistenceProbe: boolean
}) {
  const sourceInfo = snapshot.source

  return [
    source,
    scenarioIdOrDefault(scenarioId),
    qaRun ?? 'interactive',
    flagKey(initialEditorEditing, 'raw-editor', 'read-editor'),
    initialEditorEditingMode,
    flagKey(initialCommandPaletteOpen, 'command-palette-open', 'command-palette-closed'),
    flagKey(forceDesktopPanels, 'desktop-panels', 'responsive-panels'),
    flagKey(mobileCommandPaletteProbe, 'mobile-command-palette-probe', 'no-mobile-command-palette-probe'),
    flagKey(mobileKeyboardShortcutProbe, 'mobile-keyboard-shortcut-probe', 'no-mobile-keyboard-shortcut-probe'),
    flagKey(sourceSelectionProbe, 'source-selection-probe', 'no-source-selection-probe'),
    flagKey(mobileActionAdapterProbe, 'mobile-action-adapter-probe', 'no-mobile-action-adapter-probe'),
    flagKey(tableOfContentsProbe, 'table-of-contents-probe', 'no-table-of-contents-probe'),
    tabletTransitionProbeKey(tabletTransitionProbe),
    flagKey(workspacePersistenceProbe, 'workspace-persistence-probe', 'no-workspace-persistence-probe'),
    flagKey(wysiwygAutocompleteProbe, 'wysiwyg-autocomplete-probe', 'no-wysiwyg-autocomplete-probe'),
    flagKey(wysiwygExternalLinkProbe, 'wysiwyg-external-link-probe', 'no-wysiwyg-external-link-probe'),
    flagKey(wysiwygFormatCommandProbe, 'wysiwyg-format-command-probe', 'no-wysiwyg-format-command-probe'),
    flagKey(wysiwygInputTransformProbe, 'wysiwyg-input-transform-probe', 'no-wysiwyg-input-transform-probe'),
    flagKey(wysiwygMarkdownBlockProbe, 'wysiwyg-markdown-block-probe', 'no-wysiwyg-markdown-block-probe'),
    flagKey(wysiwygMathEditProbe, 'wysiwyg-math-edit-probe', 'no-wysiwyg-math-edit-probe'),
    flagKey(wysiwygTableCommandMutationProbe, 'wysiwyg-table-command-mutation-probe', 'no-wysiwyg-table-command-mutation-probe'),
    flagKey(wysiwygWikilinkInsertProbe, 'wysiwyg-wikilink-insert-probe', 'no-wysiwyg-wikilink-insert-probe'),
    flagKey(wysiwygMutationProbe, 'wysiwyg-mutation-probe', 'no-wysiwyg-mutation-probe'),
    flagKey(wysiwygPersistenceProbe, 'wysiwyg-persistence-probe', 'no-wysiwyg-persistence-probe'),
    layoutProbeMode(layoutProbe),
    sourceInfo?.kind ?? 'fixture',
    sourceInfo?.alias ?? 'no-workspace-alias',
    sourceInfo?.label ?? 'Tolaria Vault',
    sourceInfo?.totalNotes ?? snapshot.notes.length,
    firstNoteId(snapshot),
    snapshot.selectedNoteId ?? 'no-selected-note',
  ].join(':')
}

function flagKey(enabled: boolean, enabledKey: string, disabledKey: string): string {
  return enabled ? enabledKey : disabledKey
}

function tabletTransitionProbeKey(mode: TabletTransitionProbeMode): string {
  if (!mode) return 'no-tablet-transition-probe'
  return `tablet-transition-probe-${mode}`
}

function scenarioIdOrDefault(scenarioId: string | null) {
  return scenarioId ?? 'default'
}

function layoutProbeMode(layoutProbe: boolean) {
  return layoutProbe ? 'probe' : 'view'
}

function initialCommandPaletteOpen(searchParams: URLSearchParams) {
  return searchParams.get('commandPalette') === '1'
}

function firstNoteId(snapshot: ReturnType<typeof readOnlyWorkspaceRepository.readSnapshot>) {
  return snapshot.notes[0]?.id ?? 'empty'
}

function DevVaultStatusScreen({
  state,
  url,
}: {
  state: Exclude<DevVaultLoadState, { status: 'ready' }>
  url: string | null
}) {
  const title = state.status === 'error'
    ? mobileText('ai.workspace.status.error')
    : mobileText('status.vault.reloading')
  const detail = state.status === 'error'
    ? state.message
    : url ?? mobileText('status.vault.devBridgeMissingUrl')

  return (
    <View style={devVaultStyles.root} testID="dev-vault-status">
      <Text style={devVaultStyles.title}>{title}</Text>
      <Text selectable style={devVaultStyles.detail}>{detail}</Text>
    </View>
  )
}

function useDevVaultWorkspaceState(
  enabled: boolean,
  url: string | null,
): DevVaultLoadState {
  const [state, setState] = useState<DevVaultLoadState>({ status: 'idle' })

  useEffect(() => {
    if (!enabled) {
      return scheduleDevVaultState(setState, { status: 'idle' })
    }
    if (!url?.trim()) {
      return scheduleDevVaultState(setState, { message: mobileText('status.vault.devBridgeMissingUrl'), status: 'error' })
    }

    const controller = new AbortController()
    const cancelLoadingState = scheduleDevVaultState(setState, { status: 'loading' })
    void fetchDevVaultWorkspaceState(url, controller.signal)
      .then((nextState) => {
        if (!controller.signal.aborted) setState({ state: nextState, status: 'ready' })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ message: devVaultErrorMessage(error), status: 'error' })
      })

    return () => {
      cancelLoadingState()
      controller.abort()
    }
  }, [enabled, url])

  return state
}

function scheduleDevVaultState(
  setState: (state: DevVaultLoadState) => void,
  state: DevVaultLoadState,
) {
  const timer = setTimeout(() => setState(state), 0)
  return () => clearTimeout(timer)
}

function devVaultErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : mobileText('status.vault.devBridgeFailed')
}

function useMobileActionAdapterProbe({
  devVaultStatus,
  enabled,
  repositoryRequest,
  runKey,
  snapshot,
  source,
}: {
  devVaultStatus: DevVaultLoadState['status']
  enabled: boolean
  repositoryRequest: ReadOnlyWorkspaceRequest
  runKey: string
  snapshot: MobileWorkspaceSnapshot
  source: NonNullable<ReadOnlyWorkspaceRequest['source']>
}) {
  const lastRunKey = useRef<string | null>(null)

  useEffect(() => {
    if (source === 'dev' && devVaultStatus !== 'ready') return
    if (!enabled) return
    if (lastRunKey.current === runKey) return

    lastRunKey.current = runKey
    void nativeMobileActionAdapterProof({ repositoryRequest, snapshot })
      .then((proof) => {
        console.info(nativeMobileActionAdapterLogLine(proof))
      })
      .catch((error) => {
        console.warn('[mobile-action-adapter-probe] Failed to collect proof:', error)
      })
  }, [devVaultStatus, enabled, repositoryRequest, runKey, snapshot, source])
}

function useMobileUiSearchParams() {
  const [nativeSearch, setNativeSearch] = useState('')
  const webSearch = currentWebSearch()

  useEffect(() => {
    let mounted = true
    const subscription = Linking.addEventListener('url', ({ url }) => {
      setNativeSearch(searchFromUrl(url))
    })

    Linking.getInitialURL()
      .then((url) => {
        if (mounted) setNativeSearch(searchFromUrl(url))
      })
      .catch(() => {
        if (mounted) setNativeSearch('')
      })

    return () => {
      mounted = false
      subscription.remove()
    }
  }, [])

  return useMemo(() => new URLSearchParams(nativeSearch || webSearch), [nativeSearch, webSearch])
}

function currentWebSearch() {
  const search = (globalThis as { location?: { search?: string } }).location?.search
  return search ?? ''
}

function searchFromUrl(url: string | null) {
  if (!url) return ''

  const queryStart = url.indexOf('?')
  if (queryStart === -1) return ''

  return url.slice(queryStart)
}

function envFlagEnabled(name: string) {
  return envValue(name) === '1'
}

function envValue(name: string) {
  const processGlobal = globalThis as { process?: { env?: Record<string, string | undefined> } }
  return processGlobal.process?.env?.[name] ?? null
}

const devVaultStyles = StyleSheet.create({
  detail: {
    maxWidth: 520,
    color: mobileColors.textMuted,
    fontSize: mobileType.body,
    lineHeight: 22,
    textAlign: 'center',
  },
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: mobileSpace.sm,
    backgroundColor: mobileColors.app,
    padding: mobileSpace.xxl,
  },
  title: {
    color: mobileColors.text,
    fontSize: mobileType.title,
    fontWeight: '600',
  },
})
