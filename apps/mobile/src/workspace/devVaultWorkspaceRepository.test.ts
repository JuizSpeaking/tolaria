import { afterEach, describe, expect, it, vi } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import {
  createDevVaultWorkspaceRepository,
  fetchDevVaultWorkspaceState,
} from './devVaultWorkspaceRepository'

describe('dev vault workspace repository', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates summary notes from bridge-provided note contents', async () => {
    const snapshot = workspaceScenarioForId('default')
    const note = { ...snapshot.notes[0], rawContent: undefined }
    const repository = createDevVaultWorkspaceRepository({
      noteContents: { [note.path ?? note.id]: '# Real vault note\n' },
      snapshot,
    })

    await expect(repository.readNoteContent(note, { source: 'dev' })).resolves.toBe('# Real vault note\n')
    expect(repository.readSnapshot({ source: 'dev' })).toBe(snapshot)
  })

  it('loads a snapshot payload from the local bridge snapshot endpoint', async () => {
    const snapshot = workspaceScenarioForId('default')
    const fetch = vi.fn().mockResolvedValue(okJsonResponse({
      noteContents: { 'note.md': '# Loaded\n' },
      snapshot,
    }))
    vi.stubGlobal('fetch', fetch)

    await expect(fetchDevVaultWorkspaceState('http://127.0.0.1:8765')).resolves.toMatchObject({
      noteContents: { 'note.md': '# Loaded\n' },
      snapshot,
    })
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:8765/snapshot', { signal: undefined })
  })
})

function okJsonResponse(payload: unknown) {
  return {
    json: async () => payload,
    ok: true,
    status: 200,
  }
}
