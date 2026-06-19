type NativeWorkspacePersistenceLogText = string
type NativeWorkspacePersistenceLine = string

export type NativeWorkspacePersistenceProof = {
  createdNoteHydrated: boolean
  deletedTypeDefinitionRemoved: boolean
  deletedViewRemoved: boolean
  folderDeleteApplied: boolean
  folderRenameApplied: boolean
  movedNoteContentPreserved: boolean
  noteChromeMetadataHydrated: boolean
  noteStateMetadataHydrated: boolean
  persistedToNativeRepository: boolean
  propertyDisplayModesHydrated: boolean
  relationshipSourceRefHydrated: boolean
  relationshipMovedRefHydrated: boolean
  relationshipTargetHydrated: boolean
  renamedTypeAssignedNoteHydrated: boolean
  renamedTypeDefinitionHydrated: boolean
  renamedTypeSchemaRefsHydrated: boolean
  savedViewHydrated: boolean
  typeDefinitionHydrated: boolean
  updatedViewHydrated: boolean
  vaultConfigHydrated: boolean
}

export type NativeWorkspacePersistenceAssertionFailure = {
  id: string
  message: string
}

export const nativeWorkspacePersistenceLogPrefix = 'TOLARIA_MOBILE_WORKSPACE_PERSISTENCE_PROBE'
export const nativeWorkspacePersistenceProbeVaultLabel = 'Tolaria Workspace QA Vault'

export function nativeWorkspacePersistenceProbeEnabled(searchParams: URLSearchParams): boolean {
  return searchParams.get('workspacePersistenceProbe') === '1'
}

export function nativeWorkspacePersistenceLogLine(
  proof: NativeWorkspacePersistenceProof,
): NativeWorkspacePersistenceLine {
  return `${nativeWorkspacePersistenceLogPrefix} ${JSON.stringify(proof)}`
}

export function parseNativeWorkspacePersistenceProofs(
  logText: NativeWorkspacePersistenceLogText,
): NativeWorkspacePersistenceProof[] {
  return logText
    .split('\n')
    .map(parseWorkspacePersistenceProofLine)
    .filter((proof): proof is NativeWorkspacePersistenceProof => proof !== null)
}

export function assertNativeWorkspacePersistenceProofs(
  proofs: NativeWorkspacePersistenceProof[],
): NativeWorkspacePersistenceAssertionFailure[] {
  const latest = proofs.at(-1)
  if (!latest) {
    return [{ id: 'workspace.persistence', message: 'Native workspace persistence proof was not logged' }]
  }

  return [
    proofFailure(latest.persistedToNativeRepository, 'workspace.persistence.native', 'Workspace writes ran through the native Expo filesystem repository'),
    proofFailure(latest.createdNoteHydrated, 'workspace.persistence.createNote', 'Created notes rehydrate from the native vault snapshot'),
    proofFailure(latest.movedNoteContentPreserved, 'workspace.persistence.moveNote', 'Saved and moved note content is read back from the native repository'),
    proofFailure(latest.noteChromeMetadataHydrated, 'workspace.persistence.noteChromeMetadata', 'Note icon and width metadata rehydrate from native frontmatter writes'),
    proofFailure(latest.noteStateMetadataHydrated, 'workspace.persistence.noteStateMetadata', 'Note archive, organized, and favorite metadata rehydrate from native frontmatter writes'),
    proofFailure(latest.propertyDisplayModesHydrated, 'workspace.persistence.propertyDisplayModes', 'Property display modes rehydrate from native vault-scoped config storage'),
    proofFailure(latest.relationshipTargetHydrated, 'workspace.persistence.relationshipTarget', 'Relationship target creation rehydrates the reducer-created target note'),
    proofFailure(latest.relationshipSourceRefHydrated, 'workspace.persistence.relationshipSourceRef', 'Relationship target creation rehydrates the saved source note relationship ref'),
    proofFailure(latest.relationshipMovedRefHydrated, 'workspace.persistence.relationshipMovedRef', 'Moved note relationship refs rehydrate from reducer-generated native rewrite writes'),
    proofFailure(latest.savedViewHydrated, 'workspace.persistence.saveView', 'Saved desktop-compatible views rehydrate from native views/*.yml'),
    proofFailure(latest.updatedViewHydrated, 'workspace.persistence.updateView', 'Updated desktop-compatible views rehydrate from reducer-generated native view writes'),
    proofFailure(latest.deletedViewRemoved, 'workspace.persistence.deleteView', 'Deleted native view files disappear from the mobile snapshot'),
    proofFailure(latest.folderRenameApplied, 'workspace.persistence.renameFolder', 'Renamed native folders rehydrate with the destination path'),
    proofFailure(latest.folderDeleteApplied, 'workspace.persistence.deleteFolder', 'Deleted native folders are absent from the mobile snapshot'),
    proofFailure(latest.typeDefinitionHydrated, 'workspace.persistence.createType', 'Created Type documents hydrate mobile Type definitions'),
    proofFailure(latest.deletedTypeDefinitionRemoved, 'workspace.persistence.deleteType', 'Deleted Type documents are removed from mobile Type definitions'),
    proofFailure(latest.renamedTypeDefinitionHydrated, 'workspace.persistence.renameType', 'Renamed Type documents rehydrate from reducer-generated native writes'),
    proofFailure(latest.renamedTypeAssignedNoteHydrated, 'workspace.persistence.renameType.assignedNote', 'Assigned notes rehydrate with renamed Type frontmatter and retargeted links'),
    proofFailure(latest.renamedTypeSchemaRefsHydrated, 'workspace.persistence.renameType.schemaRefs', 'Type schema relationship refs rehydrate with renamed Type wikilinks'),
    proofFailure(latest.vaultConfigHydrated, 'workspace.persistence.vaultConfig', 'Primary note-list config rehydrates from native vault-scoped config storage'),
  ].filter((failure): failure is NativeWorkspacePersistenceAssertionFailure => failure !== null)
}

export function formatNativeWorkspacePersistenceFailures(
  failures: NativeWorkspacePersistenceAssertionFailure[],
): string {
  return failures.map((failure) => `${failure.id}: ${failure.message}`).join('\n')
}

function parseWorkspacePersistenceProofLine(
  line: NativeWorkspacePersistenceLine,
): NativeWorkspacePersistenceProof | null {
  const prefixIndex = line.indexOf(nativeWorkspacePersistenceLogPrefix)
  if (prefixIndex === -1) return null

  const rawJson = line.slice(prefixIndex + nativeWorkspacePersistenceLogPrefix.length).trim()
  try {
    const parsed: unknown = JSON.parse(rawJson)
    return parsedWorkspacePersistenceProof(parsed)
  } catch {
    return null
  }
}

function parsedWorkspacePersistenceProof(value: unknown): NativeWorkspacePersistenceProof | null {
  if (!isWorkspacePersistenceProofShape(value)) return null

  return {
    createdNoteHydrated: value.createdNoteHydrated,
    deletedTypeDefinitionRemoved: value.deletedTypeDefinitionRemoved,
    deletedViewRemoved: value.deletedViewRemoved,
    folderDeleteApplied: value.folderDeleteApplied,
    folderRenameApplied: value.folderRenameApplied,
    movedNoteContentPreserved: value.movedNoteContentPreserved,
    noteChromeMetadataHydrated: value.noteChromeMetadataHydrated,
    noteStateMetadataHydrated: value.noteStateMetadataHydrated,
    persistedToNativeRepository: value.persistedToNativeRepository,
    propertyDisplayModesHydrated: value.propertyDisplayModesHydrated,
    relationshipSourceRefHydrated: value.relationshipSourceRefHydrated,
    relationshipMovedRefHydrated: value.relationshipMovedRefHydrated,
    relationshipTargetHydrated: value.relationshipTargetHydrated,
    renamedTypeAssignedNoteHydrated: value.renamedTypeAssignedNoteHydrated,
    renamedTypeDefinitionHydrated: value.renamedTypeDefinitionHydrated,
    renamedTypeSchemaRefsHydrated: value.renamedTypeSchemaRefsHydrated,
    savedViewHydrated: value.savedViewHydrated,
    typeDefinitionHydrated: value.typeDefinitionHydrated,
    updatedViewHydrated: value.updatedViewHydrated,
    vaultConfigHydrated: value.vaultConfigHydrated,
  }
}

function isWorkspacePersistenceProofShape(value: unknown): value is NativeWorkspacePersistenceProof {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<keyof NativeWorkspacePersistenceProof, unknown>
  return workspacePersistenceProofKeys.every((key) => typeof candidate[key] === 'boolean')
}

const workspacePersistenceProofKeys = [
  'createdNoteHydrated',
  'deletedTypeDefinitionRemoved',
  'deletedViewRemoved',
  'folderDeleteApplied',
  'folderRenameApplied',
  'movedNoteContentPreserved',
  'noteChromeMetadataHydrated',
  'noteStateMetadataHydrated',
  'persistedToNativeRepository',
  'propertyDisplayModesHydrated',
  'relationshipSourceRefHydrated',
  'relationshipMovedRefHydrated',
  'relationshipTargetHydrated',
  'renamedTypeAssignedNoteHydrated',
  'renamedTypeDefinitionHydrated',
  'renamedTypeSchemaRefsHydrated',
  'savedViewHydrated',
  'typeDefinitionHydrated',
  'updatedViewHydrated',
  'vaultConfigHydrated',
] satisfies Array<keyof NativeWorkspacePersistenceProof>

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeWorkspacePersistenceAssertionFailure | null {
  return passed ? null : { id, message }
}
