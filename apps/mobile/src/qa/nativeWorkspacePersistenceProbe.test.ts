import { describe, expect, it } from 'vitest'
import {
  assertNativeWorkspacePersistenceProofs,
  nativeWorkspacePersistenceLogLine,
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

  it('reports incomplete relationship target persistence proofs', () => {
    expectProofFailures({
      relationshipMovedRefHydrated: false,
      relationshipSourceRefHydrated: false,
      relationshipTargetHydrated: false,
    }, [
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
      propertyDisplayModesHydrated: false,
      vaultConfigHydrated: false,
    }, [
      'workspace.persistence.propertyDisplayModes',
      'workspace.persistence.vaultConfig',
    ])
  })

  it('reports incomplete saved-view update persistence proofs', () => {
    expectProofFailures({ updatedViewHydrated: false }, ['workspace.persistence.updateView'])
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
    createdNoteHydrated: true,
    deletedTypeDefinitionRemoved: true,
    deletedViewRemoved: true,
    folderDeleteApplied: true,
    folderRenameApplied: true,
    movedNoteContentPreserved: true,
    noteChromeMetadataHydrated: true,
    noteStateMetadataHydrated: true,
    persistedToNativeRepository: true,
    propertyDisplayModesHydrated: true,
    relationshipMovedRefHydrated: true,
    relationshipSourceRefHydrated: true,
    relationshipTargetHydrated: true,
    renamedTypeAssignedNoteHydrated: true,
    renamedTypeDefinitionHydrated: true,
    renamedTypeSchemaRefsHydrated: true,
    savedViewHydrated: true,
    typeDefinitionHydrated: true,
    updatedViewHydrated: true,
    vaultConfigHydrated: true,
  }
}
