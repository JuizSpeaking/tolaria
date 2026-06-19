import { describe, expect, it } from 'vitest'
import {
  assertNativeWorkspacePersistenceProofs,
  nativeWorkspacePersistenceLogLine,
  nativeWorkspacePersistenceLogPrefix,
  parseNativeWorkspacePersistenceProofs,
  type NativeWorkspacePersistenceProof,
} from './nativeWorkspacePersistenceProbe'

describe('native workspace persistence probe', () => {
  it('passes when native workspace writes rehydrate from the Expo filesystem repository', () => {
    expect(assertNativeWorkspacePersistenceProofs([passingWorkspaceProof()])).toEqual([])
  })

  it('parses simulator log lines and reports repository failures', () => {
    const proof = {
      ...passingWorkspaceProof(),
      createdNoteHydrated: false,
      persistedToNativeRepository: false,
    }
    const parsed = parseNativeWorkspacePersistenceProofs(`noise\n${nativeWorkspacePersistenceLogLine(proof)}\n`)

    expect(parsed).toEqual([proof])
    expect(assertNativeWorkspacePersistenceProofs(parsed).map((failure) => failure.id)).toEqual([
      'workspace.persistence.native',
      'workspace.persistence.createNote',
    ])
  })

  it('reports incomplete note path and bulk persistence proofs', () => {
    expectProofFailures({
      bulkEditHydrated: false,
      renamedNoteFileHydrated: false,
      titlePropertyRenameHydrated: false,
    }, [
      'workspace.persistence.renameNoteFile',
      'workspace.persistence.titleRename',
      'workspace.persistence.bulkEdit',
    ])
  })

  it('keeps native proof log lines compact for simulator log capture', () => {
    const line = nativeWorkspacePersistenceLogLine(passingWorkspaceProof())

    expect(line.length).toBeLessThan(512)
  })

  it('parses legacy object-shaped proof lines', () => {
    const proof = { ...passingWorkspaceProof(), savedViewHydrated: false }
    const line = `${nativeWorkspacePersistenceLogPrefix} ${JSON.stringify(proof)}`

    expect(parseNativeWorkspacePersistenceProofs(line)).toEqual([proof])
  })

  it('reports incomplete Type rename persistence proofs', () => {
    expectProofFailures({
      renamedTypeAssignedNoteHydrated: false,
      renamedTypeDefinitionHydrated: false,
      renamedTypeSchemaRefsHydrated: false,
    }, [
      'workspace.persistence.renameType',
      'workspace.persistence.renameType.assignedNote',
      'workspace.persistence.renameType.schemaRefs',
    ])
  })

  it('reports incomplete Type section update persistence proofs', () => {
    expectProofFailures({ updatedTypeDefinitionHydrated: false }, ['workspace.persistence.updateType'])
  })

  it('reports incomplete relationship target persistence proofs', () => {
    expectProofFailures({
      relationshipEditHydrated: false,
      relationshipMovedRefHydrated: false,
      relationshipSourceRefHydrated: false,
      relationshipTargetHydrated: false,
    }, [
      'workspace.persistence.relationshipEdit',
      'workspace.persistence.relationshipTarget',
      'workspace.persistence.relationshipSourceRef',
      'workspace.persistence.relationshipMovedRef',
    ])
  })

  it('reports incomplete note metadata persistence proofs', () => {
    expectProofFailures({
      noteChromeMetadataHydrated: false,
      noteStateMetadataHydrated: false,
    }, [
      'workspace.persistence.noteChromeMetadata',
      'workspace.persistence.noteStateMetadata',
    ])
  })

  it('reports incomplete vault config persistence proofs', () => {
    expectProofFailures({
      defaultNoteWidthHydrated: false,
      fileVisibilityHydrated: false,
      propertyDisplayModesHydrated: false,
      propertyValuesHydrated: false,
      vaultConfigHydrated: false,
    }, [
      'workspace.persistence.propertyDisplayModes',
      'workspace.persistence.propertyValues',
      'workspace.persistence.vaultConfig',
      'workspace.persistence.defaultNoteWidth',
      'workspace.persistence.fileVisibility',
    ])
  })

  it('reports incomplete text file persistence proofs', () => {
    expectProofFailures({ textFileContentHydrated: false }, ['workspace.persistence.updateTextFileContent'])
  })

  it('reports incomplete saved-view update persistence proofs', () => {
    expectProofFailures({ updatedViewHydrated: false }, ['workspace.persistence.updateView'])
  })

  it('reports incomplete section ordering persistence proofs', () => {
    expectProofFailures({
      reorderedTypeSectionHydrated: false,
      reorderedViewHydrated: false,
    }, [
      'workspace.persistence.moveView',
      'workspace.persistence.moveTypeSection',
    ])
  })

  it('reports incomplete restoration persistence proofs', () => {
    expectProofFailures({
      restoredFolderHydrated: false,
      restoredNoteHydrated: false,
      restoredTypeDefinitionHydrated: false,
      restoredViewHydrated: false,
    }, [
      'workspace.persistence.restoreView',
      'workspace.persistence.restoreFolder',
      'workspace.persistence.restoreType',
      'workspace.persistence.restoreNote',
    ])
  })

  it('ignores malformed and incomplete proof lines', () => {
    const logText = [
      'TOLARIA_MOBILE_WORKSPACE_PERSISTENCE_PROBE not-json',
      nativeWorkspacePersistenceLogLine({ ...passingWorkspaceProof(), savedViewHydrated: false }),
      'TOLARIA_MOBILE_WORKSPACE_PERSISTENCE_PROBE {"savedViewHydrated":true}',
    ].join('\n')

    expect(parseNativeWorkspacePersistenceProofs(logText)).toEqual([
      { ...passingWorkspaceProof(), savedViewHydrated: false },
    ])
  })
})

function expectProofFailures(
  proofPatch: Partial<NativeWorkspacePersistenceProof>,
  expectedIds: string[],
) {
  const proof = { ...passingWorkspaceProof(), ...proofPatch }
  expect(assertNativeWorkspacePersistenceProofs([proof]).map((failure) => failure.id)).toEqual(expectedIds)
}

function passingWorkspaceProof(): NativeWorkspacePersistenceProof {
  return {
    bulkEditHydrated: true,
    createdNoteHydrated: true,
    deletedTypeDefinitionRemoved: true,
    deletedViewRemoved: true,
    defaultNoteWidthHydrated: true,
    fileVisibilityHydrated: true,
    folderDeleteApplied: true,
    folderRenameApplied: true,
    movedNoteContentPreserved: true,
    noteChromeMetadataHydrated: true,
    noteStateMetadataHydrated: true,
    persistedToNativeRepository: true,
    propertyDisplayModesHydrated: true,
    propertyValuesHydrated: true,
    relationshipEditHydrated: true,
    relationshipMovedRefHydrated: true,
    relationshipSourceRefHydrated: true,
    relationshipTargetHydrated: true,
    reorderedTypeSectionHydrated: true,
    reorderedViewHydrated: true,
    restoredFolderHydrated: true,
    restoredNoteHydrated: true,
    restoredTypeDefinitionHydrated: true,
    restoredViewHydrated: true,
    renamedTypeAssignedNoteHydrated: true,
    renamedTypeDefinitionHydrated: true,
    renamedTypeSchemaRefsHydrated: true,
    renamedNoteFileHydrated: true,
    savedViewHydrated: true,
    textFileContentHydrated: true,
    titlePropertyRenameHydrated: true,
    typeDefinitionHydrated: true,
    updatedViewHydrated: true,
    updatedTypeDefinitionHydrated: true,
    vaultConfigHydrated: true,
  }
}
