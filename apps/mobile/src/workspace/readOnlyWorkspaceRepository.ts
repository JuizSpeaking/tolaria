import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import type { MobileNote, MobileVaultConfig, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'
import type { MobileWorkspaceWrite } from './mobileWorkspaceEditing'
import { snapshotWithMobileVaultConfig } from './mobileVaultConfig'
import { expoWorkspaceFileSystem } from './expoWorkspaceFileSystem'
import { createFileSystemWorkspaceRepository } from './fileSystemWorkspaceRepository'

export type ReadOnlyWorkspaceRequest = {
  scenarioId?: string | null
  source?: 'dev' | 'fixture' | 'host' | 'native'
  vaultAlias?: string | null
  vaultLabel?: string | null
  vaultRootUri?: string | null
}

export type ReadOnlyWorkspaceRepository = {
  persistWrites: (writes: MobileWorkspaceWrite[], request?: ReadOnlyWorkspaceRequest) => Promise<void>
  readNoteContent: (note: MobileNote, request?: ReadOnlyWorkspaceRequest) => Promise<string | null>
  readSnapshot: (request?: ReadOnlyWorkspaceRequest) => MobileWorkspaceSnapshot
}

export const fixtureReadOnlyWorkspaceRepository: ReadOnlyWorkspaceRepository = {
  persistWrites: async () => {},
  readNoteContent: async (note) => note.rawContent ?? null,
  readSnapshot: (request) => workspaceScenarioForId(request?.scenarioId),
}

export const HOST_WORKSPACE_SNAPSHOT_STORAGE_KEY = 'tolaria:mobile-workspace-snapshot'
export const HOST_WORKSPACE_SNAPSHOT_GLOBAL_KEY = '__TOLARIA_MOBILE_WORKSPACE_SNAPSHOT__'
export const HOST_WORKSPACE_NOTE_CONTENTS_GLOBAL_KEY = '__TOLARIA_MOBILE_WORKSPACE_NOTE_CONTENTS__'
export const HOST_WORKSPACE_VAULT_CONFIG_GLOBAL_KEY = '__TOLARIA_MOBILE_WORKSPACE_VAULT_CONFIG__'
export const HOST_WORKSPACE_WRITES_GLOBAL_KEY = '__TOLARIA_MOBILE_WORKSPACE_WRITES__'
export const HOST_WORKSPACE_WRITE_FAILURE_GLOBAL_KEY = '__TOLARIA_MOBILE_WORKSPACE_WRITE_FAILURE__'

const nativeWorkspaceRepository = createFileSystemWorkspaceRepository(expoWorkspaceFileSystem)
const hostTextWriteKinds = new Set<MobileWorkspaceWrite['kind']>(['createNote', 'saveNote', 'saveView'])

export const readOnlyWorkspaceRepository: ReadOnlyWorkspaceRepository = {
  persistWrites: async (writes, request) => {
    if (request?.source === 'host') {
      throwHostWriteFailure()
      persistHostWrites(writes)
    } else if (request?.source === 'native') {
      await nativeWorkspaceRepository.persistWrites(writes, request)
    }
  },
  readNoteContent: async (note, request) => {
    if (note.rawContent !== undefined) return note.rawContent
    if (request?.source === 'native') {
      return nativeWorkspaceRepository.readNoteContent(note, request)
    }
    if (request?.source !== 'host') return null

    return hostNoteContent(note)
  },
  readSnapshot: (request) => {
    if (request?.source === 'host') {
      return readHostWorkspaceSnapshot() ?? fixtureReadOnlyWorkspaceRepository.readSnapshot(request)
    }
    if (request?.source === 'native') {
      return nativeWorkspaceRepository.readSnapshot(request)
    }

    return fixtureReadOnlyWorkspaceRepository.readSnapshot(request)
  },
}

function persistHostWrites(writes: MobileWorkspaceWrite[]) {
  const contents = ensureHostNoteContents()
  const writeLog = ensureHostWriteLog()

  for (const write of writes) {
    persistHostWrite(contents, write)
    writeLog.push(write)
  }
}

function persistHostWrite(contents: Record<string, string>, write: MobileWorkspaceWrite) {
  if (persistHostConfigWrite(write)) return
  if (persistHostFolderWrite(contents, write)) return
  if (persistHostMoveWrite(contents, write)) return
  if (persistHostDeletedTextWrite(contents, write)) return
  persistHostTextWrite(contents, write)
}

function persistHostConfigWrite(write: MobileWorkspaceWrite): boolean {
  if (write.kind !== 'saveVaultConfig') return false

  persistHostVaultConfig(write.config)
  return true
}

function persistHostFolderWrite(contents: Record<string, string>, write: MobileWorkspaceWrite): boolean {
  if (write.kind === 'createFolder') return true
  if (write.kind === 'deleteFolder') {
    deleteHostFolder(contents, write.path)
    return true
  }
  if (write.kind === 'renameFolder') {
    renameHostFolder(contents, write.path, write.toPath)
    return true
  }

  return false
}

function persistHostMoveWrite(contents: Record<string, string>, write: MobileWorkspaceWrite): boolean {
  if (write.kind !== 'moveNote') return false

  moveHostContent(contents, write.path, write.toPath)
  return true
}

function persistHostDeletedTextWrite(contents: Record<string, string>, write: MobileWorkspaceWrite): boolean {
  if (write.kind !== 'deleteNote' && write.kind !== 'deleteView') return false

  Reflect.deleteProperty(contents, write.path)
  return true
}

function persistHostTextWrite(contents: Record<string, string>, write: MobileWorkspaceWrite) {
  if (!isHostTextWrite(write)) return
  contents[write.path] = write.content
}

function isHostTextWrite(
  write: MobileWorkspaceWrite,
): write is Extract<MobileWorkspaceWrite, { kind: 'createNote' | 'saveNote' | 'saveView' }> {
  return hostTextWriteKinds.has(write.kind)
}

function moveHostContent(contents: Record<string, string>, previousPath: string, nextPath: string) {
  const content = contents[previousPath]
  if (content === undefined || contents[nextPath] !== undefined) return

  Reflect.deleteProperty(contents, previousPath)
  contents[nextPath] = content
}

function deleteHostFolder(contents: Record<string, string>, folderPath: string) {
  for (const path of Object.keys(contents)) {
    if (hostPathInFolder(folderPath, path)) Reflect.deleteProperty(contents, path)
  }
}

function renameHostFolder(contents: Record<string, string>, previousPath: string, nextPath: string) {
  for (const [path, content] of Object.entries(contents)) {
    if (!hostPathInFolder(previousPath, path)) continue

    Reflect.deleteProperty(contents, path)
    contents[`${nextPath}${path.slice(previousPath.length)}`] = content
  }
}

function hostPathInFolder(folderPath: string, candidatePath: string): boolean {
  return candidatePath === folderPath || candidatePath.startsWith(`${folderPath}/`)
}

function readHostWorkspaceSnapshot(): MobileWorkspaceSnapshot | null {
  const injectedSnapshot = hostGlobalSnapshot()
  if (injectedSnapshot) return snapshotWithHostVaultConfig(injectedSnapshot)

  const storage = hostStorage()
  if (!storage) return null

  const serialized = storage.getItem(HOST_WORKSPACE_SNAPSHOT_STORAGE_KEY)
  if (!serialized) return null

  try {
    const parsed: unknown = JSON.parse(serialized)
    return isMobileWorkspaceSnapshot(parsed) ? snapshotWithHostVaultConfig(parsed) : null
  } catch {
    return null
  }
}

function hostGlobalSnapshot(): MobileWorkspaceSnapshot | null {
  const maybeSnapshot = (globalThis as Record<string, unknown>)[HOST_WORKSPACE_SNAPSHOT_GLOBAL_KEY]
  return isMobileWorkspaceSnapshot(maybeSnapshot) ? maybeSnapshot : null
}

function hostNoteContent(note: MobileNote): string | null {
  const contents = hostNoteContents()
  if (!contents) return null

  return contentForNote(contents, note)
}

function contentForNote(contents: Record<string, string>, note: MobileNote): string | null {
  if (note.path && contents[note.path] !== undefined) return contents[note.path]
  return contents[note.id] ?? null
}

function hostNoteContents(): Record<string, string> | null {
  const maybeContents = (globalThis as Record<string, unknown>)[HOST_WORKSPACE_NOTE_CONTENTS_GLOBAL_KEY]
  return isStringRecord(maybeContents) ? maybeContents : null
}

function ensureHostNoteContents(): Record<string, string> {
  const existing = hostNoteContents()
  if (existing) return existing

  const contents: Record<string, string> = {}
  Reflect.set(globalThis, HOST_WORKSPACE_NOTE_CONTENTS_GLOBAL_KEY, contents)
  return contents
}

function persistHostVaultConfig(config: MobileVaultConfig | undefined) {
  if (config) Reflect.set(globalThis, HOST_WORKSPACE_VAULT_CONFIG_GLOBAL_KEY, config)
}

function snapshotWithHostVaultConfig(snapshot: MobileWorkspaceSnapshot): MobileWorkspaceSnapshot {
  const config = hostVaultConfig()
  return config ? snapshotWithMobileVaultConfig(snapshot, config) : snapshot
}

function hostVaultConfig(): MobileVaultConfig | null {
  const maybeConfig = (globalThis as Record<string, unknown>)[HOST_WORKSPACE_VAULT_CONFIG_GLOBAL_KEY]
  return isRecord(maybeConfig) ? maybeConfig : null
}

function ensureHostWriteLog(): MobileWorkspaceWrite[] {
  const maybeWrites = (globalThis as Record<string, unknown>)[HOST_WORKSPACE_WRITES_GLOBAL_KEY]
  if (Array.isArray(maybeWrites)) return maybeWrites as MobileWorkspaceWrite[]

  const writes: MobileWorkspaceWrite[] = []
  Reflect.set(globalThis, HOST_WORKSPACE_WRITES_GLOBAL_KEY, writes)
  return writes
}

function throwHostWriteFailure() {
  const writeFailure = hostWriteFailure()
  if (writeFailure) throw new Error(writeFailure)
}

function hostWriteFailure(): string | null {
  const failure = (globalThis as Record<string, unknown>)[HOST_WORKSPACE_WRITE_FAILURE_GLOBAL_KEY]
  if (failure instanceof Error) return failure.message
  if (typeof failure === 'string' && failure.trim()) return failure
  if (failure) return 'Host workspace write failed'

  return null
}

function hostStorage(): Pick<Storage, 'getItem'> | null {
  const maybeStorage = (globalThis as { localStorage?: Pick<Storage, 'getItem'> }).localStorage
  return maybeStorage ?? null
}

function isMobileWorkspaceSnapshot(value: unknown): value is MobileWorkspaceSnapshot {
  if (!isRecord(value)) return false

  return Array.isArray(value.notes)
    && Array.isArray(value.sidebarSections)
    && isRecord(value.sync)
    && typeof value.noteListSubtitle === 'string'
    && Array.isArray(value.editorBlocks)
    && Array.isArray(value.editorBullets)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false
  return Object.values(value).every((item) => typeof item === 'string')
}
