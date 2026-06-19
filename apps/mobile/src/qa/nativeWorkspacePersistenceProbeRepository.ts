import type { Directory, Paths } from 'expo-file-system'
import { applyMobileWorkspaceEditWithWrites } from '../workspace/mobileWorkspaceEditing'
import type { MobileNote, MobilePropertyDisplayMode, MobileSavedView, MobileTypeDefinition, MobileViewDefinition, MobileWorkspaceSnapshot } from '../workspace/mobileWorkspaceModel'
import type { MobileTypeDefinitionPatch } from '../workspace/mobileTypeDefinitions'
import type { ReadOnlyWorkspaceRepository, ReadOnlyWorkspaceRequest } from '../workspace/readOnlyWorkspaceRepository'
import {
  nativeWorkspacePersistenceLogLine,
  nativeWorkspacePersistenceProbeVaultLabel,
  type NativeWorkspacePersistenceProof,
} from './nativeWorkspacePersistenceProbe'
import {
  nativeWorkspaceNotePathProof,
  nativeWorkspaceNotePathSeedWrites,
  nativeWorkspaceNotePathWrites,
  readNativeWorkspaceNotePathContent,
  type NativeWorkspaceNotePathPersistenceContent,
} from './nativeWorkspaceNotePathPersistenceProbe'

type ExpoFileSystemModule = {
  Directory: typeof Directory
  Paths: typeof Paths
}

declare const require: (moduleName: string) => ExpoFileSystemModule

const createdNotePath = 'Writing/Drafts/mobile-created.md'
const movedNoteFolderPath = 'Research'
const movedNotePath = 'Research/Seed.md'
const metadataNotePath = 'Metadata/Chrome State.md'
const oldTypeName = 'Retired Proof'
const oldViewName = 'Old Native Proof'
const propertyRelationshipNotePath = 'Properties/Relationship Proof.md'
const propertyRelationshipUrl = 'https://tolaria.local/mobile'
const relationshipSourcePath = 'Relationships/Source.md'
const relationshipTargetPath = 'Relationships/native-related-target.md'
const reorderedTypeAlphaName = 'Order Alpha'
const reorderedTypeBetaName = 'Order Beta'
const reorderedViewAlphaName = 'Order Alpha View'
const reorderedViewBetaName = 'Order Beta View'
const renamedTypeAssignedNotePath = 'Writing/Type Rename Assigned.md'
const renamedTypeName = 'Rename Target'
const renamedTypePath = 'rename-target.md'
const renamedTypeSchemaCarrierName = 'Schema Carrier'
const renamedTypeSourceName = 'Rename Source'
const renamedTypeSourcePath = 'rename-source.md'
const renamedFolderPath = 'Folders/Proof Queue'
const restoredFolderPath = 'Restored Folder'
const restoredNotePath = 'Restored Undo Note.md'
const restoredTypeName = 'Restored Type'
const restoredTypeOrder = 42
const restoredTypePath = 'restored-type.md'
const restoredViewFilename = 'restored-view.yml'
const restoredViewName = 'Restored View'
const textFilePath = 'Files/mobile-config.txt'
const textFileUpdatedContent = 'feature=mobile-editing\nmode=plain-text\n'
const typeName = 'Proof Decision'
const updatedTypeName = 'Section Proof'
const updatedTypeTemplate = '## Next\n\n- Keep desktop sections durable.'
const updatedViewName = 'Updated Native Proof'
const updatedViewSourceName = 'Update Native Proof'
const workspacePersistencePropertyDisplayModes = {
  Priority: 'number',
  Website: 'url',
} satisfies Record<string, MobilePropertyDisplayMode>
const workspaceProbeStartedRootUris = new Set<string>()

export function nativeWorkspacePersistenceProbeRepository(
  baseRepository: ReadOnlyWorkspaceRepository,
): ReadOnlyWorkspaceRepository {
  return {
    persistWrites: (writes, request) => baseRepository.persistWrites(
      writes,
      nativeWorkspacePersistenceProbeRequest(request),
    ),
    readNoteContent: (note, request) => baseRepository.readNoteContent(
      note,
      nativeWorkspacePersistenceProbeRequest(request),
    ),
    readSnapshot: (request) => {
      const probeRequest = nativeWorkspacePersistenceProbeRequest(request)
      queueWorkspacePersistenceProbe(baseRepository, probeRequest)
      return baseRepository.readSnapshot(probeRequest)
    },
  }
}

export function nativeWorkspacePersistenceProbeRequest(
  request?: ReadOnlyWorkspaceRequest,
): ReadOnlyWorkspaceRequest {
  return {
    ...request,
    source: 'native',
    vaultLabel: nativeWorkspacePersistenceProbeVaultLabel,
    vaultRootUri: workspacePersistenceProbeRootUri() ?? request?.vaultRootUri ?? null,
  }
}

function queueWorkspacePersistenceProbe(
  baseRepository: ReadOnlyWorkspaceRepository,
  request: ReadOnlyWorkspaceRequest,
) {
  const rootUri = request.vaultRootUri
  if (!rootUri || workspaceProbeStartedRootUris.has(rootUri)) return

  workspaceProbeStartedRootUris.add(rootUri)
  void logWorkspacePersistenceProof(baseRepository, request)
}

async function logWorkspacePersistenceProof(
  baseRepository: ReadOnlyWorkspaceRepository,
  request: ReadOnlyWorkspaceRequest,
) {
  resetWorkspacePersistenceProbeVault(request.vaultRootUri)
  await baseRepository.persistWrites(seedWorkspacePersistenceProbeWrites(), request)
  await baseRepository.persistWrites(workspacePersistenceProbeWrites(baseRepository.readSnapshot(request)), request)

  const snapshot = baseRepository.readSnapshot(request)
  const movedNote = snapshot.allNotes?.find((note) => note.path === movedNotePath)
    ?? snapshot.notes.find((note) => note.path === movedNotePath)
  const movedContent = movedNote ? await baseRepository.readNoteContent(movedNote, request) : null
  const propertyRelationshipContent = await readProbeNoteContent(baseRepository, snapshot, propertyRelationshipNotePath, request)
  const renamedAssignedContent = await readProbeNoteContent(baseRepository, snapshot, renamedTypeAssignedNotePath, request)
  const restoredNoteContent = await readProbeNoteContent(baseRepository, snapshot, restoredNotePath, request)
  const relationshipSourceContent = await readProbeNoteContent(baseRepository, snapshot, relationshipSourcePath, request)
  const metadataContent = await readProbeNoteContent(baseRepository, snapshot, metadataNotePath, request)
  const textFileContent = await readProbeNoteContent(baseRepository, snapshot, textFilePath, request)
  const notePathContent = await readNativeWorkspaceNotePathContent(baseRepository, snapshot, request)

  console.info(nativeWorkspacePersistenceLogLine(workspacePersistenceProof(snapshot, {
    metadataContent,
    movedContent,
    notePathContent,
    propertyRelationshipContent,
    relationshipSourceContent,
    renamedAssignedContent,
    restoredNoteContent,
    textFileContent,
  })))
}

function readProbeNoteContent(
  repository: ReadOnlyWorkspaceRepository,
  snapshot: MobileWorkspaceSnapshot,
  path: string,
  request: ReadOnlyWorkspaceRequest,
) {
  const note = noteByPath(snapshot, path)
  return note ? repository.readNoteContent(note, request) : null
}

function resetWorkspacePersistenceProbeVault(rootUri: string | null | undefined) {
  if (!rootUri) return

  const { Directory } = require('expo-file-system')
  const root = new Directory(rootUri)
  if (root.exists) root.delete()
  root.create({ idempotent: true, intermediates: true })
}

function workspacePersistenceProbeRootUri(): string | null {
  try {
    const { Directory, Paths } = require('expo-file-system')
    return new Directory(Paths.document, nativeWorkspacePersistenceProbeVaultLabel).uri
  } catch {
    return null
  }
}

function workspacePersistenceProbeWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return [
    ...workspacePersistenceNoteAndRelationshipWrites(seedSnapshot),
    ...workspacePersistenceMetadataWrites(seedSnapshot),
    ...workspacePersistencePropertyAndRelationshipWrites(seedSnapshot),
    ...workspacePersistenceRestorationWrites(seedSnapshot),
    ...workspacePersistenceViewWrites(seedSnapshot),
    ...workspacePersistenceConfigWrites(seedSnapshot),
    ...workspacePersistenceTextFileWrites(seedSnapshot),
    ...nativeWorkspaceNotePathWrites(seedSnapshot),
    ...workspacePersistenceFolderWrites(),
    ...workspacePersistenceTypeMoveWrites(seedSnapshot),
    ...workspacePersistenceTypeWrites(),
    ...workspacePersistenceTypeUpdateWrites(seedSnapshot),
    ...workspacePersistenceTypeRenameWrites(seedSnapshot),
  ]
}

function workspacePersistenceNoteAndRelationshipWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return workspacePersistenceEditWrites(seedSnapshot, [
    {
      defaults: {
        folderPath: 'Writing/Drafts',
        status: 'Draft',
        tags: ['Mobile'],
        type: 'Essay',
      },
      title: 'Mobile Created',
      type: 'createNote',
    },
    {
      content: seedNoteUpdatedContent(),
      noteId: 'Writing/Seed.md',
      type: 'updateNoteContent',
    },
    {
      folderPath: movedNoteFolderPath,
      noteId: 'Writing/Seed.md',
      type: 'moveNoteToFolder',
    },
    {
      key: 'related_to',
      sourceNoteId: relationshipSourcePath,
      targetTitle: 'Native Related Target',
      type: 'createRelationshipTarget',
    },
  ])
}

function workspacePersistencePropertyAndRelationshipWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return workspacePersistenceEditWrites(seedSnapshot, [
    { key: 'Priority', noteId: propertyRelationshipNotePath, type: 'updateProperty', value: 5 },
    { key: 'Published', noteId: propertyRelationshipNotePath, type: 'updateProperty', value: true },
    { key: 'Website', noteId: propertyRelationshipNotePath, type: 'updateProperty', value: propertyRelationshipUrl },
    { key: 'tags', noteId: propertyRelationshipNotePath, type: 'updateProperty', value: ['Mobile', 'QA'] },
    { key: 'related_to', noteId: propertyRelationshipNotePath, ref: '[[Writing/Seed]]', type: 'removeRelationship' },
    {
      key: 'belongs_to',
      noteId: propertyRelationshipNotePath,
      targetRef: '[[Metadata/Chrome State]]',
      targetTitle: 'Chrome State',
      type: 'addRelationship',
    },
  ])
}

function workspacePersistenceRestorationWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return workspacePersistenceEditWrites(seedSnapshot, [
    { note: restoredMobileNote(), noteIndex: 0, type: 'restoreNote' },
    { path: restoredFolderPath, type: 'restoreFolder' },
    { view: restoredMobileView(), viewIndex: 0, type: 'restoreView' },
    {
      definition: restoredTypeDefinition(),
      type: 'restoreTypeDefinition',
      typeName: restoredTypeName,
    },
  ])
}

type WorkspaceProbeEdit = Parameters<typeof applyMobileWorkspaceEditWithWrites>[1]
type WorkspaceProbeWrites = ReturnType<typeof applyMobileWorkspaceEditWithWrites>['writes']

function workspacePersistenceMetadataWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  const note = noteByPath(seedSnapshot, metadataNotePath)
  if (!note) return []

  return workspacePersistenceEditWrites(seedSnapshot, [
    { key: '_icon', noteId: note.id, type: 'updateProperty', value: 'star' },
    { key: '_width', noteId: note.id, type: 'updateProperty', value: 'wide' },
    { archived: true, noteId: note.id, type: 'setArchived' },
    { noteId: note.id, organized: true, type: 'setOrganized' },
    { noteId: note.id, type: 'toggleFavorite' },
  ])
}

function workspacePersistenceEditWrites(
  seedSnapshot: MobileWorkspaceSnapshot,
  edits: WorkspaceProbeEdit[],
) {
  const writes: WorkspaceProbeWrites = []
  let snapshot = seedSnapshot

  for (const edit of edits) {
    const result = applyMobileWorkspaceEditWithWrites(snapshot, edit)
    snapshot = result.snapshot
    writes.push(...result.writes)
  }

  return writes
}

function workspacePersistenceViewWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return [
    ...workspacePersistenceViewMoveWrites(seedSnapshot),
    ...workspacePersistenceViewUpdateWrites(seedSnapshot),
    {
      content: mobilePersistenceViewContent(),
      kind: 'saveView' as const,
      path: 'views/mobile-persistence.yml',
    },
    {
      kind: 'deleteView' as const,
      path: 'views/old-native-proof.yml',
    },
  ]
}

function workspacePersistenceViewMoveWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  const view = seedSnapshot.views?.find((candidate) => candidate.definition.name === reorderedViewBetaName)
  if (!view) return []

  return applyMobileWorkspaceEditWithWrites(seedSnapshot, {
    direction: 'up',
    type: 'moveView',
    viewId: view.id,
  }).writes
}

function workspacePersistenceViewUpdateWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  const view = seedSnapshot.views?.find((candidate) => candidate.definition.name === updatedViewSourceName)
  if (!view) return []

  return applyMobileWorkspaceEditWithWrites(seedSnapshot, {
    definition: updatedNativeProofViewDefinition(),
    type: 'updateView',
    viewId: view.id,
  }).writes
}

function updatedNativeProofViewDefinition(): MobileViewDefinition {
  return {
    color: 'purple',
    filters: { all: [{ field: 'status', op: 'equals', value: 'Active' }] },
    icon: 'folder',
    listPropertiesDisplay: ['status', 'Priority'],
    name: updatedViewName,
    sort: 'property:Priority:asc',
  }
}

function workspacePersistenceConfigWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return workspacePersistenceEditWrites(seedSnapshot, [
    { mode: 'wide', type: 'setDefaultNoteWidth' },
    { key: 'Priority', mode: workspacePersistencePropertyDisplayModes.Priority, type: 'updatePropertyDisplayMode' },
    { key: 'Website', mode: workspacePersistencePropertyDisplayModes.Website, type: 'updatePropertyDisplayMode' },
    {
      allNotesFileVisibility: { images: true, pdfs: true, unsupported: false },
      listPropertiesDisplay: ['status', 'belongs_to'],
      target: 'allNotes',
      type: 'updatePrimaryNoteListProperties',
    },
    {
      listPropertiesDisplay: ['tags'],
      target: 'inbox',
      type: 'updatePrimaryNoteListProperties',
    },
  ])
}

function workspacePersistenceTextFileWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return workspacePersistenceEditWrites(seedSnapshot, [
    {
      noteId: textFilePath,
      rawContent: textFileInitialContent(),
      type: 'hydrateTextFileContent',
    },
    {
      content: textFileUpdatedContent,
      noteId: textFilePath,
      type: 'updateTextFileContent',
    },
  ])
}

function workspacePersistenceFolderWrites() {
  return [
    {
      kind: 'renameFolder' as const,
      path: 'Folders/Queue',
      toPath: renamedFolderPath,
    },
    {
      kind: 'createFolder' as const,
      path: 'Scratch/To Delete',
    },
    {
      kind: 'deleteFolder' as const,
      path: 'Scratch',
    },
  ]
}

function workspacePersistenceTypeWrites() {
  return [
    {
      content: typeDefinitionContent(typeName, 'green'),
      kind: 'createNote' as const,
      path: `Types/${typeName}.md`,
    },
    {
      kind: 'deleteNote' as const,
      path: `Types/${oldTypeName}.md`,
    },
  ]
}

function workspacePersistenceTypeUpdateWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return applyMobileWorkspaceEditWithWrites(seedSnapshot, {
    patch: updatedTypeDefinitionPatch(),
    type: 'updateTypeDefinition',
    typeName: updatedTypeName,
  }).writes
}

function workspacePersistenceTypeMoveWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return applyMobileWorkspaceEditWithWrites(seedSnapshot, {
    direction: 'up',
    type: 'moveTypeSection',
    typeName: reorderedTypeBetaName,
  }).writes
}

function updatedTypeDefinitionPatch(): MobileTypeDefinitionPatch {
  return {
    icon: 'sparkles',
    label: 'Section Proofs',
    listPropertiesDisplay: ['status', 'Priority', 'belongs_to'],
    order: 3,
    properties: {
      Priority: 'High',
      ReviewScore: 5,
    },
    relationships: {
      depends_on: ['[[Relationships/Source]]'],
      related_to: ['[[Research/Seed]]'],
    },
    sort: 'property:Priority:desc',
    template: updatedTypeTemplate,
    tone: 'yellow',
    view: 'Mobile Persistence',
    visible: false,
  }
}

function workspacePersistenceTypeRenameWrites(seedSnapshot: MobileWorkspaceSnapshot) {
  return applyMobileWorkspaceEditWithWrites(seedSnapshot, {
    nextTypeName: renamedTypeName,
    type: 'renameTypeDefinition',
    typeName: renamedTypeSourceName,
  }).writes
}

function seedWorkspacePersistenceProbeWrites() {
  return [
    ...seedWorkspaceNoteWrites(),
    ...seedWorkspaceViewWrites(),
    ...seedWorkspaceTypeWrites(),
  ]
}

function seedWorkspaceNoteWrites() {
  return [
    {
      content: seedNoteInitialContent(),
      kind: 'createNote' as const,
      path: 'Writing/Seed.md',
    },
    {
      kind: 'createFolder' as const,
      path: movedNoteFolderPath,
    },
    {
      content: metadataNoteInitialContent(),
      kind: 'createNote' as const,
      path: metadataNotePath,
    },
    {
      content: '# Keep\n',
      kind: 'createNote' as const,
      path: 'Folders/Queue/Keep.md',
    },
    {
      content: relationshipSourceContent(),
      kind: 'createNote' as const,
      path: relationshipSourcePath,
    },
    {
      content: propertyRelationshipNoteContent(),
      kind: 'createNote' as const,
      path: propertyRelationshipNotePath,
    },
    {
      content: textFileInitialContent(),
      kind: 'createNote' as const,
      path: textFilePath,
    },
    ...nativeWorkspaceNotePathSeedWrites,
    {
      content: renamedTypeAssignedNoteContent(),
      kind: 'createNote' as const,
      path: renamedTypeAssignedNotePath,
    },
  ]
}

function seedWorkspaceViewWrites() {
  return [
    {
      content: oldNativeProofViewContent(),
      kind: 'saveView' as const,
      path: 'views/old-native-proof.yml',
    },
    {
      content: updateNativeProofViewContent(),
      kind: 'saveView' as const,
      path: 'views/update-native-proof.yml',
    },
    {
      content: orderedNativeProofViewContent(reorderedViewAlphaName, 30),
      kind: 'saveView' as const,
      path: 'views/order-alpha.yml',
    },
    {
      content: orderedNativeProofViewContent(reorderedViewBetaName, 31),
      kind: 'saveView' as const,
      path: 'views/order-beta.yml',
    },
  ]
}

function seedWorkspaceTypeWrites() {
  return [
    {
      content: typeDefinitionContent(oldTypeName, 'gray'),
      kind: 'createNote' as const,
      path: `Types/${oldTypeName}.md`,
    },
    {
      content: typeDefinitionContent(renamedTypeSourceName, 'purple'),
      kind: 'createNote' as const,
      path: renamedTypeSourcePath,
    },
    {
      content: typeDefinitionContent(updatedTypeName, 'gray'),
      kind: 'createNote' as const,
      path: 'section-proof.md',
    },
    {
      content: typeDefinitionContent(reorderedTypeAlphaName, 'green', 30),
      kind: 'createNote' as const,
      path: 'type-order-alpha.md',
    },
    {
      content: typeDefinitionContent(reorderedTypeBetaName, 'purple', 31),
      kind: 'createNote' as const,
      path: 'type-order-beta.md',
    },
    {
      content: renamedTypeSchemaCarrierContent(),
      kind: 'createNote' as const,
      path: 'schema-carrier.md',
    },
  ]
}

function workspacePersistenceProof(
  snapshot: MobileWorkspaceSnapshot,
  content: {
    metadataContent: string | null
    movedContent: string | null
    notePathContent: NativeWorkspaceNotePathPersistenceContent
    propertyRelationshipContent: string | null
    relationshipSourceContent: string | null
    renamedAssignedContent: string | null
    restoredNoteContent: string | null
    textFileContent: string | null
  },
): NativeWorkspacePersistenceProof {
  return {
    ...nativeWorkspaceNotePathProof(snapshot, content.notePathContent),
    createdNoteHydrated: snapshotContainsNotePath(snapshot, createdNotePath),
    deletedTypeDefinitionRemoved: !typeDefinitionExists(snapshot, oldTypeName),
    deletedViewRemoved: !viewExists(snapshot, oldViewName),
    defaultNoteWidthHydrated: snapshot.vaultConfig?.defaultNoteWidth === 'wide',
    fileVisibilityHydrated: fileVisibilityHydrated(snapshot),
    folderDeleteApplied: !folderPathStartsWith(snapshot, 'Scratch'),
    folderRenameApplied: folderRenameApplied(snapshot),
    movedNoteContentPreserved: movedContentPreserved(content.movedContent),
    noteChromeMetadataHydrated: noteChromeMetadataHydrated(snapshot, content.metadataContent),
    noteStateMetadataHydrated: noteStateMetadataHydrated(snapshot, content.metadataContent),
    persistedToNativeRepository: snapshot.source?.kind === 'localVault',
    propertyDisplayModesHydrated: propertyDisplayModesHydrated(snapshot),
    propertyValuesHydrated: propertyValuesHydrated(snapshot, content.propertyRelationshipContent),
    relationshipEditHydrated: relationshipEditHydrated(snapshot, content.propertyRelationshipContent),
    relationshipMovedRefHydrated: relationshipMovedRefHydrated(content.relationshipSourceContent),
    relationshipSourceRefHydrated: relationshipSourceRefHydrated(content.relationshipSourceContent),
    relationshipTargetHydrated: snapshotContainsNotePath(snapshot, relationshipTargetPath),
    reorderedTypeSectionHydrated: reorderedTypeSectionHydrated(snapshot),
    reorderedViewHydrated: reorderedViewHydrated(snapshot),
    restoredFolderHydrated: restoredFolderHydrated(snapshot),
    restoredNoteHydrated: restoredNoteHydrated(snapshot, content.restoredNoteContent),
    restoredTypeDefinitionHydrated: restoredTypeDefinitionHydrated(snapshot),
    restoredViewHydrated: restoredViewHydrated(snapshot),
    renamedTypeAssignedNoteHydrated: renamedTypeAssignedNoteHydrated(snapshot, content.renamedAssignedContent),
    renamedTypeDefinitionHydrated: renamedTypeDefinitionHydrated(snapshot),
    renamedTypeSchemaRefsHydrated: renamedTypeSchemaRefsHydrated(snapshot),
    savedViewHydrated: viewExists(snapshot, 'Mobile Persistence'),
    textFileContentHydrated: textFileContentHydrated(snapshot, content.textFileContent),
    typeDefinitionHydrated: snapshot.typeDefinitions?.[typeName]?.tone === 'green',
    updatedViewHydrated: updatedViewHydrated(snapshot),
    updatedTypeDefinitionHydrated: updatedTypeDefinitionHydrated(snapshot),
    vaultConfigHydrated: vaultConfigHydrated(snapshot),
  }
}

function folderRenameApplied(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.folderPaths?.includes(renamedFolderPath) === true
    && snapshotContainsNotePath(snapshot, `${renamedFolderPath}/Keep.md`)
}

function restoredFolderHydrated(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.folderPaths?.includes(restoredFolderPath) === true
}

function snapshotContainsNotePath(snapshot: MobileWorkspaceSnapshot, path: string) {
  return noteByPath(snapshot, path) !== null
}

function typeDefinitionExists(snapshot: MobileWorkspaceSnapshot, name: string) {
  return snapshot.typeDefinitions?.[name] !== undefined
}

function viewExists(snapshot: MobileWorkspaceSnapshot, name: string) {
  return snapshot.views?.some((view) => view.definition.name === name) === true
}

function reorderedViewHydrated(snapshot: MobileWorkspaceSnapshot) {
  const alpha = viewByName(snapshot, reorderedViewAlphaName)
  const beta = viewByName(snapshot, reorderedViewBetaName)
  return typeof alpha?.definition.order === 'number'
    && typeof beta?.definition.order === 'number'
    && beta.definition.order < alpha.definition.order
}

function restoredViewHydrated(snapshot: MobileWorkspaceSnapshot) {
  const view = viewByName(snapshot, restoredViewName)
  return view?.filename === restoredViewFilename
    && view.definition.order === 7
    && view.definition.icon === 'rotate-ccw'
}

function viewByName(snapshot: MobileWorkspaceSnapshot, name: string) {
  return snapshot.views?.find((view) => view.definition.name === name)
}

function updatedViewHydrated(snapshot: MobileWorkspaceSnapshot) {
  const view = viewByName(snapshot, updatedViewName)
  return view?.filename === 'update-native-proof.yml'
    && view.definition.color === 'purple'
    && view.definition.icon === 'folder'
    && view.definition.sort === 'property:Priority:asc'
    && joinedProperties(view.definition.listPropertiesDisplay) === 'status|Priority'
    && updatedViewFilterHydrated(view.definition.filters)
}

function updatedViewFilterHydrated(filters: MobileViewDefinition['filters']) {
  const nodes = 'all' in filters ? filters.all : []
  const condition = nodes[0]
  return nodes.length === 1
    && condition !== undefined
    && 'field' in condition
    && condition.field === 'status'
    && condition.op === 'equals'
    && condition.value === 'Active'
}

function updatedTypeDefinitionHydrated(snapshot: MobileWorkspaceSnapshot) {
  const definition = snapshot.typeDefinitions?.[updatedTypeName]
  return definition !== undefined
    && updatedTypeMetadataHydrated(definition)
    && updatedTypeSchemaHydrated(definition)
    && updatedTypeRawContentHydrated(definition.rawContent ?? null)
}

function updatedTypeMetadataHydrated(definition: MobileTypeDefinition) {
  return [
    definition.path === 'section-proof.md',
    definition.tone === 'yellow',
    definition.icon === 'sparkles',
    definition.label === 'Section Proofs',
    definition.order === 3,
    definition.sort === 'property:Priority:desc',
    definition.template === updatedTypeTemplate,
    definition.view === 'Mobile Persistence',
    definition.visible === false,
    joinedProperties(definition.listPropertiesDisplay) === 'status|Priority|belongs_to',
  ].every(Boolean)
}

function updatedTypeSchemaHydrated(definition: MobileTypeDefinition) {
  return [
    definition.properties?.Priority === 'High',
    definition.properties?.ReviewScore === 5,
    joinedProperties(definition.relationships?.depends_on) === '[[Relationships/Source]]',
    joinedProperties(definition.relationships?.related_to) === '[[Research/Seed]]',
  ].every(Boolean)
}

function updatedTypeRawContentHydrated(rawContent: string | null) {
  return textContainsAll(rawContent, [
    '_sidebar_label: Section Proofs',
    '_list_properties_display:',
    'ReviewScore: 5',
    'template: |',
    'visible: false',
  ])
}

function reorderedTypeSectionHydrated(snapshot: MobileWorkspaceSnapshot) {
  const alpha = snapshot.typeDefinitions?.[reorderedTypeAlphaName]
  const beta = snapshot.typeDefinitions?.[reorderedTypeBetaName]
  return typeOrderHydrated(alpha)
    && typeOrderHydrated(beta)
    && beta.order < alpha.order
}

function restoredTypeDefinitionHydrated(snapshot: MobileWorkspaceSnapshot) {
  const definition = snapshot.typeDefinitions?.[restoredTypeName]
  return definition?.path === restoredTypePath
    && definition.order === restoredTypeOrder
    && definition.tone === 'blue'
    && textContainsAll(definition.rawContent ?? null, [`# ${restoredTypeName}`, `_order: ${restoredTypeOrder}`])
}

function typeOrderHydrated(definition: MobileTypeDefinition | undefined): definition is MobileTypeDefinition & { order: number } {
  return typeof definition?.order === 'number'
    && textContainsAll(definition.rawContent ?? null, ['_order:'])
}

function vaultConfigHydrated(snapshot: MobileWorkspaceSnapshot) {
  return joinedProperties(snapshot.noteListPropertyOverrides?.allNotes) === 'status|belongs_to'
    && joinedProperties(snapshot.noteListPropertyOverrides?.inbox) === 'tags'
    && snapshot.vaultConfig?.inbox?.explicitOrganization === true
}

function fileVisibilityHydrated(snapshot: MobileWorkspaceSnapshot) {
  const visibility = snapshot.vaultConfig?.allNotes?.fileVisibility
  return visibility?.images === true
    && visibility.pdfs === true
    && visibility.unsupported === false
}

function propertyDisplayModesHydrated(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.vaultConfig?.propertyDisplayModes?.Priority === 'number'
    && snapshot.vaultConfig.propertyDisplayModes.Website === 'url'
}

function textFileContentHydrated(snapshot: MobileWorkspaceSnapshot, content: string | null) {
  const note = noteByPath(snapshot, textFilePath)
  return note?.fileKind === 'text'
    && note.snippet === 'feature=mobile-editing'
    && content === textFileUpdatedContent
}

function propertyValuesHydrated(snapshot: MobileWorkspaceSnapshot, content: string | null) {
  const note = noteByPath(snapshot, propertyRelationshipNotePath)
  return [
    notePropertyValue(note, 'Priority') === 5,
    notePropertyValue(note, 'Published') === true,
    notePropertyValue(note, 'Website') === propertyRelationshipUrl,
    joinedProperties(note?.tags) === 'Mobile|QA',
    textContainsAll(content, ['Priority: 5', 'Published: true', 'Website:', propertyRelationshipUrl]),
  ].every(Boolean)
}

function relationshipEditHydrated(snapshot: MobileWorkspaceSnapshot, content: string | null) {
  const note = noteByPath(snapshot, propertyRelationshipNotePath)
  return relationshipRefs(note, 'belongs_to').includes('[[Metadata/Chrome State]]')
    && textContainsAll(content, ['belongs_to:', '[[Metadata/Chrome State]]'])
    && content?.includes('[[Writing/Seed]]') === false
}

function notePropertyValue(note: ReturnType<typeof noteByPath>, key: string) {
  return note?.properties?.find((property) => property.key === key)?.value
}

function relationshipRefs(note: ReturnType<typeof noteByPath>, key: string) {
  return note?.relationships.find((relationship) => relationship.key === key)?.values
    .map((value) => value.ref)
    .filter((ref): ref is string => typeof ref === 'string') ?? []
}

function joinedProperties(properties: string[] | undefined) {
  return properties?.join('|') ?? ''
}

function folderPathStartsWith(snapshot: MobileWorkspaceSnapshot, pathPrefix: string) {
  return snapshot.folderPaths?.some((path) => path === pathPrefix || path.startsWith(`${pathPrefix}/`)) === true
}

function movedContentPreserved(content: string | null) {
  return content?.includes('saved before moving through native persistence') === true
}

function restoredNoteHydrated(snapshot: MobileWorkspaceSnapshot, content: string | null) {
  return snapshotContainsNotePath(snapshot, restoredNotePath)
    && textContainsAll(content, ['# Restored Undo Note', 'Restored from mobile history.'])
}

function noteChromeMetadataHydrated(snapshot: MobileWorkspaceSnapshot, content: string | null) {
  const note = noteByPath(snapshot, metadataNotePath)
  return noteMatches(note, { icon: 'star', noteWidth: 'wide' })
    && textContainsAll(content, ['_icon: star', '_width: wide'])
}

function noteStateMetadataHydrated(snapshot: MobileWorkspaceSnapshot, content: string | null) {
  const note = noteByPath(snapshot, metadataNotePath)
  return noteMatches(note, { archived: true, favorite: true, organized: true })
    && textContainsAll(content, ['_archived: true', '_organized: true', '_favorite: true', '_favorite_index:'])
}

function noteMatches(
  note: ReturnType<typeof noteByPath>,
  expected: Partial<Pick<NonNullable<ReturnType<typeof noteByPath>>, 'archived' | 'favorite' | 'icon' | 'noteWidth' | 'organized'>>,
) {
  return note !== null && Object.entries(expected).every(([key, value]) => note[key as keyof typeof expected] === value)
}

function textContainsAll(content: string | null, fragments: string[]) {
  return content !== null && fragments.every((fragment) => content.includes(fragment))
}

function relationshipSourceRefHydrated(content: string | null) {
  return content?.includes('related_to:') === true
    && content.includes('native-related-target')
}

function relationshipMovedRefHydrated(content: string | null) {
  return content?.includes('belongs_to:') === true
    && content.includes('Research/Seed')
    && !content.includes('Writing/Seed')
}

function renamedTypeDefinitionHydrated(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.typeDefinitions?.[renamedTypeName]?.tone === 'purple'
    && snapshot.typeDefinitions?.[renamedTypeSourceName] === undefined
    && snapshotContainsNotePath(snapshot, renamedTypePath)
    && !snapshotContainsNotePath(snapshot, renamedTypeSourcePath)
}

function renamedTypeAssignedNoteHydrated(
  snapshot: MobileWorkspaceSnapshot,
  content: string | null,
) {
  return noteByPath(snapshot, renamedTypeAssignedNotePath)?.type === renamedTypeName
    && content?.includes(`type: ${renamedTypeName}`) === true
    && content?.includes('[[rename-target]]') === true
}

function renamedTypeSchemaRefsHydrated(snapshot: MobileWorkspaceSnapshot) {
  const schemaCarrier = snapshot.typeDefinitions?.[renamedTypeSchemaCarrierName]
  return schemaCarrier?.relationships?.related_to?.includes('[[rename-target]]') === true
    && schemaCarrier.rawContent?.includes('[[rename-target]]') === true
}

function noteByPath(snapshot: MobileWorkspaceSnapshot, path: string) {
  return (snapshot.allNotes ?? snapshot.notes).find((note) => note.path === path) ?? null
}

function restoredMobileNote(): MobileNote {
  return {
    created: '2d ago',
    date: '2d ago',
    favorite: false,
    id: restoredNotePath,
    links: 0,
    modified: '2d ago',
    path: restoredNotePath,
    rawContent: restoredNoteContent(),
    relationships: [],
    snippet: 'Restored from mobile history.',
    status: 'Active',
    tags: ['Restored'],
    title: 'Restored Undo Note',
    type: 'Essay',
    typeTone: 'green',
    workspace: 'TV',
  }
}

function restoredMobileView(): MobileSavedView {
  return {
    definition: {
      color: 'blue',
      filters: { all: [] },
      icon: 'rotate-ccw',
      name: restoredViewName,
      order: 7,
      sort: 'modified:desc',
    },
    filename: restoredViewFilename,
    id: 'view-restored-view',
  }
}

function restoredTypeDefinition(): MobileTypeDefinition {
  return {
    icon: 'rotate-ccw',
    order: restoredTypeOrder,
    path: restoredTypePath,
    rawContent: typeDefinitionContent(restoredTypeName, 'blue', restoredTypeOrder),
    tone: 'blue',
  }
}

function seedNoteInitialContent() {
  return [
    '---',
    'type: Essay',
    'status: Draft',
    '---',
    '# Seeded Mobile Note',
    '',
    'Initial content.',
    '',
  ].join('\n')
}

function seedNoteUpdatedContent() {
  return [
    '---',
    'type: Essay',
    'status: Active',
    '---',
    '# Seeded Mobile Note',
    '',
    'This was saved before moving through native persistence.',
    '',
  ].join('\n')
}

function restoredNoteContent() {
  return [
    '---',
    'type: Essay',
    'status: Active',
    'tags:',
    '  - Restored',
    '---',
    '# Restored Undo Note',
    '',
    'Restored from mobile history.',
    '',
  ].join('\n')
}

function metadataNoteInitialContent() {
  return [
    '---',
    'type: Essay',
    'status: Draft',
    '---',
    '# Chrome State',
    '',
    'Metadata persistence proof seed.',
    '',
  ].join('\n')
}

function relationshipSourceContent() {
  return [
    '---',
    'type: Essay',
    'status: Draft',
    'belongs_to:',
    '  - [[Writing/Seed]]',
    '---',
    '# Relationship Source',
    '',
    'Create a relationship target from this note.',
    '',
  ].join('\n')
}

function propertyRelationshipNoteContent() {
  return [
    '---',
    'type: Essay',
    'status: Draft',
    'Related to:',
    '  - "[[Writing/Seed]]"',
    '---',
    '# Relationship Proof',
    '',
    'Property and relationship persistence seed.',
    '',
  ].join('\n')
}

function textFileInitialContent() {
  return 'feature=seed\nmode=plain-text\n'
}

function renamedTypeAssignedNoteContent() {
  return [
    '---',
    `type: ${renamedTypeSourceName}`,
    'status: Draft',
    '---',
    '# Type Rename Assigned',
    '',
    `References [[${renamedTypeSourceName}]].`,
    '',
  ].join('\n')
}

function renamedTypeSchemaCarrierContent() {
  return [
    '---',
    'type: Type',
    'color: orange',
    'icon: file-text',
    'related_to:',
    `  - "[[${renamedTypeSourceName}]]"`,
    '---',
    `# ${renamedTypeSchemaCarrierName}`,
    '',
  ].join('\n')
}

function typeDefinitionContent(name: string, color: string, order?: number) {
  return [
    '---',
    'type: Type',
    `color: ${color}`,
    'icon: file-text',
    ...(order === undefined ? [] : [`_order: ${order}`]),
    '---',
    `# ${name}`,
    '',
  ].join('\n')
}

function orderedNativeProofViewContent(name: string, order: number) {
  return [
    `name: ${name}`,
    'icon: file-text',
    'color: gray',
    'sort: null',
    `order: ${order}`,
    'filters:',
    '  all: []',
    '',
  ].join('\n')
}

function mobilePersistenceViewContent() {
  return [
    'name: Mobile Persistence',
    'icon: file-text',
    'color: green',
    'sort: modified:desc',
    'filters:',
    '  all:',
    '    - field: type',
    '      op: equals',
    '      value: Essay',
    '',
  ].join('\n')
}

function oldNativeProofViewContent() {
  return [
    `name: ${oldViewName}`,
    'icon: archive',
    'color: gray',
    'sort: null',
    'filters:',
    '  all: []',
    '',
  ].join('\n')
}

function updateNativeProofViewContent() {
  return [
    `name: ${updatedViewSourceName}`,
    'icon: archive',
    'color: gray',
    'sort: null',
    'listPropertiesDisplay:',
    '  - status',
    'filters:',
    '  all:',
    '    - field: type',
    '      op: equals',
    '      value: Essay',
    '',
  ].join('\n')
}
