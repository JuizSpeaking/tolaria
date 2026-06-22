import type { MobileNote, MobileWorkspaceSnapshot } from './mobileWorkspaceModel'
import type { ReadOnlyWorkspaceRepository } from './readOnlyWorkspaceRepository'

export type DevVaultWorkspaceState = {
  noteContents: Record<string, string>
  snapshot: MobileWorkspaceSnapshot
}

type DevVaultWorkspacePayload = {
  noteContents?: unknown
  snapshot?: unknown
}

export async function fetchDevVaultWorkspaceState(
  baseUrl: string,
  signal?: AbortSignal,
): Promise<DevVaultWorkspaceState> {
  const response = await fetch(devVaultSnapshotUrl(baseUrl), { signal })
  if (!response.ok) {
    throw new Error(`Local vault bridge returned ${response.status}`)
  }

  const payload: unknown = await response.json()
  return parseDevVaultWorkspaceState(payload)
}

export function createDevVaultWorkspaceRepository(
  state: DevVaultWorkspaceState,
): ReadOnlyWorkspaceRepository {
  return {
    persistWrites: async () => {},
    readNoteContent: async (note) => (
      note.rawContent ?? devVaultNoteContent(state.noteContents, note)
    ),
    readSnapshot: () => state.snapshot,
  }
}

function devVaultSnapshotUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/u, '')
  if (!trimmed) throw new Error('Local vault bridge URL is missing')
  return trimmed.endsWith('/snapshot') ? trimmed : `${trimmed}/snapshot`
}

function parseDevVaultWorkspaceState(payload: unknown): DevVaultWorkspaceState {
  if (!isRecord(payload)) throw new Error('Local vault bridge returned invalid JSON')

  const { noteContents = {}, snapshot } = payload as DevVaultWorkspacePayload
  if (!isMobileWorkspaceSnapshot(snapshot)) {
    throw new Error('Local vault bridge returned an invalid workspace snapshot')
  }

  return {
    noteContents: isStringRecord(noteContents) ? noteContents : {},
    snapshot,
  }
}

function devVaultNoteContent(
  noteContents: Record<string, string>,
  note: MobileNote,
): string | null {
  if (note.path && noteContents[note.path] !== undefined) return noteContents[note.path]
  return noteContents[note.id] ?? null
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
