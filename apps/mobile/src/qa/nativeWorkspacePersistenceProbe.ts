type NativeWorkspacePersistenceLogText = string
type NativeWorkspacePersistenceLine = string

export type NativeWorkspacePersistenceProof = {
  bulkEditHydrated: boolean
  createdNoteHydrated: boolean
  deletedTypeDefinitionRemoved: boolean
  deletedViewRemoved: boolean
  defaultNoteWidthHydrated: boolean
  fileVisibilityHydrated: boolean
  folderDeleteApplied: boolean
  folderRenameApplied: boolean
  movedNoteContentPreserved: boolean
  noteChromeMetadataHydrated: boolean
  noteStateMetadataHydrated: boolean
  persistedToNativeRepository: boolean
  propertyDisplayModesHydrated: boolean
  propertyValuesHydrated: boolean
  relationshipEditHydrated: boolean
  relationshipSourceRefHydrated: boolean
  relationshipMovedRefHydrated: boolean
  relationshipTargetHydrated: boolean
  reorderedTypeSectionHydrated: boolean
  reorderedViewHydrated: boolean
  restoredFolderHydrated: boolean
  restoredNoteHydrated: boolean
  restoredTypeDefinitionHydrated: boolean
  restoredViewHydrated: boolean
  renamedTypeAssignedNoteHydrated: boolean
  renamedTypeDefinitionHydrated: boolean
  renamedTypeSchemaRefsHydrated: boolean
  savedViewHydrated: boolean
  textFileContentHydrated: boolean
  titlePropertyRenameHydrated: boolean
  typeDefinitionHydrated: boolean
  renamedNoteFileHydrated: boolean
  updatedViewHydrated: boolean
  updatedTypeDefinitionHydrated: boolean
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
  return `${nativeWorkspacePersistenceLogPrefix} ${JSON.stringify(workspacePersistenceProofValues(proof))}`
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
    proofFailure(latest.renamedNoteFileHydrated, 'workspace.persistence.renameNoteFile', 'Explicit note filename renames and inbound wikilink rewrites rehydrate from native filesystem writes'),
    proofFailure(latest.titlePropertyRenameHydrated, 'workspace.persistence.titleRename', 'Title frontmatter edits rename files and rehydrate rewritten inbound wikilinks from native filesystem writes'),
    proofFailure(latest.bulkEditHydrated, 'workspace.persistence.bulkEdit', 'Bulk note action writes rehydrate from one native filesystem write batch'),
    proofFailure(latest.textFileContentHydrated, 'workspace.persistence.updateTextFileContent', 'Plain text file edits rehydrate from native filesystem writes'),
    proofFailure(latest.noteChromeMetadataHydrated, 'workspace.persistence.noteChromeMetadata', 'Note icon and width metadata rehydrate from native frontmatter writes'),
    proofFailure(latest.noteStateMetadataHydrated, 'workspace.persistence.noteStateMetadata', 'Note archive, organized, and favorite metadata rehydrate from native frontmatter writes'),
    proofFailure(latest.propertyDisplayModesHydrated, 'workspace.persistence.propertyDisplayModes', 'Property display modes rehydrate from native vault-scoped config storage'),
    proofFailure(latest.propertyValuesHydrated, 'workspace.persistence.propertyValues', 'Typed property values rehydrate from native frontmatter writes'),
    proofFailure(latest.relationshipEditHydrated, 'workspace.persistence.relationshipEdit', 'Relationship add/remove edits rehydrate from native frontmatter writes'),
    proofFailure(latest.relationshipTargetHydrated, 'workspace.persistence.relationshipTarget', 'Relationship target creation rehydrates the reducer-created target note'),
    proofFailure(latest.relationshipSourceRefHydrated, 'workspace.persistence.relationshipSourceRef', 'Relationship target creation rehydrates the saved source note relationship ref'),
    proofFailure(latest.relationshipMovedRefHydrated, 'workspace.persistence.relationshipMovedRef', 'Moved note relationship refs rehydrate from reducer-generated native rewrite writes'),
    proofFailure(latest.savedViewHydrated, 'workspace.persistence.saveView', 'Saved desktop-compatible views rehydrate from native views/*.yml'),
    proofFailure(latest.updatedViewHydrated, 'workspace.persistence.updateView', 'Updated desktop-compatible views rehydrate from reducer-generated native view writes'),
    proofFailure(latest.reorderedViewHydrated, 'workspace.persistence.moveView', 'Moved saved-view order rehydrates from reducer-generated native view order writes'),
    proofFailure(latest.deletedViewRemoved, 'workspace.persistence.deleteView', 'Deleted native view files disappear from the mobile snapshot'),
    proofFailure(latest.restoredViewHydrated, 'workspace.persistence.restoreView', 'Restored saved views rehydrate from undo/redo native view writes'),
    proofFailure(latest.folderRenameApplied, 'workspace.persistence.renameFolder', 'Renamed native folders rehydrate with the destination path'),
    proofFailure(latest.folderDeleteApplied, 'workspace.persistence.deleteFolder', 'Deleted native folders are absent from the mobile snapshot'),
    proofFailure(latest.restoredFolderHydrated, 'workspace.persistence.restoreFolder', 'Restored folders rehydrate from undo/redo native folder writes'),
    proofFailure(latest.typeDefinitionHydrated, 'workspace.persistence.createType', 'Created Type documents hydrate mobile Type definitions'),
    proofFailure(latest.deletedTypeDefinitionRemoved, 'workspace.persistence.deleteType', 'Deleted Type documents are removed from mobile Type definitions'),
    proofFailure(latest.renamedTypeDefinitionHydrated, 'workspace.persistence.renameType', 'Renamed Type documents rehydrate from reducer-generated native writes'),
    proofFailure(latest.renamedTypeAssignedNoteHydrated, 'workspace.persistence.renameType.assignedNote', 'Assigned notes rehydrate with renamed Type frontmatter and retargeted links'),
    proofFailure(latest.renamedTypeSchemaRefsHydrated, 'workspace.persistence.renameType.schemaRefs', 'Type schema relationship refs rehydrate with renamed Type wikilinks'),
    proofFailure(latest.updatedTypeDefinitionHydrated, 'workspace.persistence.updateType', 'Updated Type section metadata, schema, and templates rehydrate from reducer-generated native writes'),
    proofFailure(latest.reorderedTypeSectionHydrated, 'workspace.persistence.moveTypeSection', 'Moved Type section order rehydrates from reducer-generated native Type order writes'),
    proofFailure(latest.restoredTypeDefinitionHydrated, 'workspace.persistence.restoreType', 'Restored Type documents rehydrate from undo/redo native Type writes'),
    proofFailure(latest.restoredNoteHydrated, 'workspace.persistence.restoreNote', 'Restored notes rehydrate from undo/redo native note writes'),
    proofFailure(latest.vaultConfigHydrated, 'workspace.persistence.vaultConfig', 'Primary note-list config rehydrates from native vault-scoped config storage'),
    proofFailure(latest.defaultNoteWidthHydrated, 'workspace.persistence.defaultNoteWidth', 'Default note width rehydrates from native vault-scoped config storage'),
    proofFailure(latest.fileVisibilityHydrated, 'workspace.persistence.fileVisibility', 'All Notes file visibility rehydrates from native vault-scoped config storage'),
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
  if (isWorkspacePersistenceProofValueArray(value)) {
    return workspacePersistenceProofFromValues(value)
  }

  if (!isWorkspacePersistenceProofShape(value)) return null

  return workspacePersistenceProofFromValues(workspacePersistenceProofKeys.map((key) => value[key]))
}

function isWorkspacePersistenceProofShape(value: unknown): value is NativeWorkspacePersistenceProof {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<keyof NativeWorkspacePersistenceProof, unknown>
  return workspacePersistenceProofKeys.every((key) => typeof candidate[key] === 'boolean')
}

function isWorkspacePersistenceProofValueArray(value: unknown): value is boolean[] {
  return Array.isArray(value)
    && value.length === workspacePersistenceProofKeys.length
    && value.every((entry) => typeof entry === 'boolean')
}

function workspacePersistenceProofValues(proof: NativeWorkspacePersistenceProof): boolean[] {
  return workspacePersistenceProofKeys.map((key) => proof[key])
}

function workspacePersistenceProofFromValues(values: boolean[]): NativeWorkspacePersistenceProof {
  return Object.fromEntries(
    workspacePersistenceProofKeys.map((key, index) => [key, values[index]]),
  ) as NativeWorkspacePersistenceProof
}

const workspacePersistenceProofKeys = [
  'bulkEditHydrated',
  'createdNoteHydrated',
  'deletedTypeDefinitionRemoved',
  'deletedViewRemoved',
  'defaultNoteWidthHydrated',
  'fileVisibilityHydrated',
  'folderDeleteApplied',
  'folderRenameApplied',
  'movedNoteContentPreserved',
  'noteChromeMetadataHydrated',
  'noteStateMetadataHydrated',
  'persistedToNativeRepository',
  'propertyDisplayModesHydrated',
  'propertyValuesHydrated',
  'relationshipEditHydrated',
  'relationshipSourceRefHydrated',
  'relationshipMovedRefHydrated',
  'relationshipTargetHydrated',
  'reorderedTypeSectionHydrated',
  'reorderedViewHydrated',
  'restoredFolderHydrated',
  'restoredNoteHydrated',
  'restoredTypeDefinitionHydrated',
  'restoredViewHydrated',
  'renamedTypeAssignedNoteHydrated',
  'renamedTypeDefinitionHydrated',
  'renamedTypeSchemaRefsHydrated',
  'savedViewHydrated',
  'textFileContentHydrated',
  'titlePropertyRenameHydrated',
  'typeDefinitionHydrated',
  'renamedNoteFileHydrated',
  'updatedViewHydrated',
  'updatedTypeDefinitionHydrated',
  'vaultConfigHydrated',
] satisfies Array<keyof NativeWorkspacePersistenceProof>

function proofFailure(
  passed: boolean,
  id: string,
  message: string,
): NativeWorkspacePersistenceAssertionFailure | null {
  return passed ? null : { id, message }
}
