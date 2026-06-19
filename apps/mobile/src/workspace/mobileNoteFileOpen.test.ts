import { afterEach, describe, expect, it, vi } from 'vitest'
import { workspaceScenarioForId } from '../fixtures/workspaceFixtures'
import {
  MOBILE_FILE_OPEN_ATTEMPTS_GLOBAL_KEY,
  MOBILE_FILE_OPENS_GLOBAL_KEY,
  openMobileNoteFile,
  type MobileFileOpener,
} from './mobileNoteFileOpen'

describe('mobile note file open', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, MOBILE_FILE_OPEN_ATTEMPTS_GLOBAL_KEY)
    Reflect.deleteProperty(globalThis, MOBILE_FILE_OPENS_GLOBAL_KEY)
  })

  it('opens a selected file through the native opener', async () => {
    const opener: MobileFileOpener = vi.fn().mockResolvedValue({ opened: true, shared: true })
    const note = workspaceScenarioForId('default').notes[0]!

    await expect(openMobileNoteFile({
      note,
      opener,
      vaultRootUri: 'file:///vault/root',
    })).resolves.toEqual({
      ok: true,
      opened: true,
      path: 'file:///vault/root/Tolaria/Mobile%20UI/Workflow%20Orchestration%20Essay.md',
      shared: true,
    })

    expect(opener).toHaveBeenCalledWith('file:///vault/root/Tolaria/Mobile%20UI/Workflow%20Orchestration%20Essay.md')
    expect(globalValue(MOBILE_FILE_OPEN_ATTEMPTS_GLOBAL_KEY)).toEqual([{
      noteId: 'workflow-orchestration',
      path: 'file:///vault/root/Tolaria/Mobile%20UI/Workflow%20Orchestration%20Essay.md',
      title: 'Workflow Orchestration Essay',
    }])
    expect(globalValue(MOBILE_FILE_OPENS_GLOBAL_KEY)).toEqual([{
      ok: true,
      opened: true,
      path: 'file:///vault/root/Tolaria/Mobile%20UI/Workflow%20Orchestration%20Essay.md',
      shared: true,
    }])
  })

  it('records browser attempts without calling the native opener', async () => {
    const opener: MobileFileOpener = vi.fn()
    const note = workspaceScenarioForId('default').notes[0]!

    await expect(withBrowserRuntime(() => openMobileNoteFile({
      note,
      opener,
      vaultRootUri: null,
    }))).resolves.toEqual({
      ok: true,
      opened: false,
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      shared: false,
    })

    expect(opener).not.toHaveBeenCalled()
    expect(globalValue(MOBILE_FILE_OPEN_ATTEMPTS_GLOBAL_KEY)).toEqual([{
      noteId: 'workflow-orchestration',
      path: 'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
      title: 'Workflow Orchestration Essay',
    }])
    expect(globalValue(MOBILE_FILE_OPENS_GLOBAL_KEY)).toBeUndefined()
  })

  it('does not call the opener without a safe selected note', async () => {
    const opener: MobileFileOpener = vi.fn()

    await expect(openMobileNoteFile({ note: null, opener })).resolves.toEqual({
      ok: false,
      reason: 'missingNote',
    })
    await expect(openMobileNoteFile({
      note: { ...workspaceScenarioForId('default').notes[0]!, id: '../secret.md', path: '' },
      opener,
    })).resolves.toEqual({
      ok: false,
      reason: 'unsafePath',
    })

    expect(opener).not.toHaveBeenCalled()
    expect(globalValue(MOBILE_FILE_OPEN_ATTEMPTS_GLOBAL_KEY)).toBeUndefined()
  })
})

function globalValue(key: string): unknown {
  return (globalThis as Record<string, unknown>)[key]
}

async function withBrowserRuntime<T>(run: () => Promise<T>): Promise<T> {
  Reflect.set(globalThis, 'document', {})
  try {
    return await run()
  } finally {
    Reflect.deleteProperty(globalThis, 'document')
  }
}
