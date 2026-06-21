import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Linking, useWindowDimensions } from 'react-native'
import { PhoneWorkspace, type PhoneWorkspaceState } from './PhoneWorkspace'
import { TabletWorkspace } from './TabletWorkspace'
import { readOnlyWorkspaceRepository, type ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
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
import { setMobileLayoutMetricSinkUrl } from '../qa/mobileLayoutProbe'
import type { MobileNote, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import {
  localVaultEditorBlocks,
  localVaultEditorBullets,
  localVaultSnippet,
} from '../workspace/localVaultMarkdown'

export function MobileUiLab() {
  const { width } = useWindowDimensions()
  const isWideEnoughForTablet = width >= 900
  const searchParams = useMobileUiSearchParams()
  const [nativeWorkspace, setNativeWorkspace] = useState<NativeWorkspaceSelection | null>(null)
  const workspacePersistenceProbe = nativeWorkspacePersistenceProbeEnabled(searchParams)
  const wysiwygPersistenceProbe = nativeWysiwygPersistenceProbeEnabled(searchParams)
  const scenarioId = currentScenarioId(searchParams)
  const source = currentSnapshotSource(searchParams, nativeWorkspace)
  const baseRepositoryRequest = {
    scenarioId,
    source,
    vaultAlias: currentVaultAlias(searchParams, nativeWorkspace),
    vaultLabel: currentVaultLabel(searchParams, nativeWorkspace),
    vaultRootUri: currentVaultRootUri(searchParams, nativeWorkspace),
  }
  const repository = mobileRepositoryForProbes({ workspacePersistenceProbe, wysiwygPersistenceProbe })
  const repositoryRequest = mobileRepositoryRequestForProbes(
    baseRepositoryRequest,
    { workspacePersistenceProbe, wysiwygPersistenceProbe },
  )
  const qa = mobileUiQaFlags(searchParams, { wysiwygPersistenceProbe })
  const metricSinkUrl = qa.layoutProbe ? searchParams.get('metricSink') : null
  const actionAdapterProbeRunKey = searchParams.get('qaRun') ?? 'interactive'
  const actionAdapterProbeLastRunKey = useRef<string | null>(null)
  const baseSnapshot = repository.readSnapshot(repositoryRequest)
  const snapshot = mobileSnapshotForProbes(baseSnapshot, {
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

  useEffect(() => {
    if (!qa.mobileActionAdapterProbe) return
    if (actionAdapterProbeLastRunKey.current === actionAdapterProbeRunKey) return

    actionAdapterProbeLastRunKey.current = actionAdapterProbeRunKey
    void nativeMobileActionAdapterProof({ repositoryRequest, snapshot })
      .then((proof) => {
        console.info(nativeMobileActionAdapterLogLine(proof))
      })
      .catch((error) => {
        console.warn('[mobile-action-adapter-probe] Failed to collect proof:', error)
      })
  }, [actionAdapterProbeRunKey, qa.mobileActionAdapterProbe, repositoryRequest, snapshot])

  if (isWideEnoughForTablet) {
    return (
      <TabletWorkspace
        key={workspaceKey}
        forceDesktopPanels={qa.forceDesktopPanels}
        initialEditorEditing={qa.initialEditorEditing}
        initialEditorEditingMode={qa.initialEditorEditingMode}
        commandPaletteProbe={qa.mobileCommandPaletteProbe}
        layoutProbe={qa.layoutProbe}
        onOpenNativeVault={handleOpenNativeVault}
        repository={repository}
        repositoryRequest={repositoryRequest}
        sourceIdleSave={!editorIdleSaveDisabled(searchParams)}
        sourceSelectionProbe={qa.sourceSelectionProbe}
        snapshot={snapshot}
        tableOfContentsProbe={qa.tableOfContentsProbe}
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
      commandPaletteProbe={qa.mobileCommandPaletteProbe}
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
  if (nativeWorkspace) return 'native'
  if (searchParams.get('source') === 'native-vault') return 'native'
  return searchParams.get('source') === 'host-vault' ? 'host' : 'fixture'
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
  const { initialEditorEditing, initialEditorEditingMode } = initialMobileEditorStateFromMode(editorMode(searchParams))

  return {
    forceDesktopPanels: tabletPanelsMode(searchParams) === 'all',
    initialEditorEditing,
    initialEditorEditingMode,
    mobileCommandPaletteProbe: nativeMobileCommandPaletteProbeEnabled(searchParams),
    layoutProbe: layoutProbeEnabled(searchParams),
    mobileActionAdapterProbe: nativeMobileActionAdapterProbeEnabled(searchParams),
    sourceSelectionProbe: nativeSourceSelectionProbeEnabled(searchParams),
    tableOfContentsProbe: nativeTableOfContentsProbeEnabled(searchParams),
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

function currentVaultRootUri(
  searchParams: URLSearchParams,
  nativeWorkspace: NativeWorkspaceSelection | null,
): string | null {
  if (nativeWorkspace) return nativeWorkspace.vaultRootUri
  return searchParams.get('vaultUri') || envValue('EXPO_PUBLIC_TOLARIA_NATIVE_VAULT_URI')
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
  forceDesktopPanels,
  layoutProbe,
  mobileCommandPaletteProbe,
  qaRun,
  scenarioId,
  snapshot,
  source,
  sourceSelectionProbe,
  mobileActionAdapterProbe,
  tableOfContentsProbe,
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
  forceDesktopPanels: boolean
  layoutProbe: boolean
  mobileCommandPaletteProbe: boolean
  qaRun: string | null
  scenarioId: string | null
  snapshot: ReturnType<typeof readOnlyWorkspaceRepository.readSnapshot>
  source: ReturnType<typeof currentSnapshotSource>
  sourceSelectionProbe: boolean
  mobileActionAdapterProbe: boolean
  tableOfContentsProbe: boolean
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
    flagKey(forceDesktopPanels, 'desktop-panels', 'responsive-panels'),
    flagKey(mobileCommandPaletteProbe, 'mobile-command-palette-probe', 'no-mobile-command-palette-probe'),
    flagKey(sourceSelectionProbe, 'source-selection-probe', 'no-source-selection-probe'),
    flagKey(mobileActionAdapterProbe, 'mobile-action-adapter-probe', 'no-mobile-action-adapter-probe'),
    flagKey(tableOfContentsProbe, 'table-of-contents-probe', 'no-table-of-contents-probe'),
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
  ].join(':')
}

function flagKey(enabled: boolean, enabledKey: string, disabledKey: string): string {
  return enabled ? enabledKey : disabledKey
}

function scenarioIdOrDefault(scenarioId: string | null) {
  return scenarioId ?? 'default'
}

function layoutProbeMode(layoutProbe: boolean) {
  return layoutProbe ? 'probe' : 'view'
}

function firstNoteId(snapshot: ReturnType<typeof readOnlyWorkspaceRepository.readSnapshot>) {
  return snapshot.notes[0]?.id ?? 'empty'
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
