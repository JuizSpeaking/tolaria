import type { SharingOptions } from 'expo-sharing'
import type { MobileNote } from './mobileWorkspaceModel'
import { buildMobileFilePathForNote } from './mobileNoteFilePath'

export const MOBILE_FILE_OPEN_ATTEMPTS_GLOBAL_KEY = '__TOLARIA_MOBILE_FILE_OPEN_ATTEMPTS__'
export const MOBILE_FILE_OPENS_GLOBAL_KEY = '__TOLARIA_MOBILE_FILE_OPENS__'

export type MobileFileOpenResult =
  | { ok: true; opened: boolean; path: string; shared: boolean }
  | { ok: false; reason: 'missingNote' | 'unsafePath' }

export type MobileFileOpener = (path: string) => Promise<MobileFileOpenerResult>
export type MobileFileOpenerResult = boolean | void | {
  opened?: boolean
  shared?: boolean
}

type ExpoSharingModule = {
  isAvailableAsync: () => Promise<boolean>
  shareAsync: (url: string, options?: SharingOptions) => Promise<void>
}
type LinkingModule = {
  Linking: {
    openURL: (url: string) => Promise<unknown>
  }
}

declare const require: (moduleName: string) => unknown

export async function openMobileNoteFile({
  note,
  opener = openNativeMobileFile,
  vaultRootUri,
}: {
  note: MobileNote | null
  opener?: MobileFileOpener
  vaultRootUri?: string | null
}): Promise<MobileFileOpenResult> {
  const result = buildMobileFilePathForNote({ note, vaultRootUri })
  if (!result.ok) return { ok: false, reason: result.error === 'missing_note' ? 'missingNote' : 'unsafePath' }

  recordGlobalValue(MOBILE_FILE_OPEN_ATTEMPTS_GLOBAL_KEY, openEvidence(result.path, note))
  if (isBrowserRuntime()) return { ok: true, opened: false, path: result.path, shared: false }

  const openResult = await opener(result.path)
  const opened = openedMobileFileResult(result.path, openResult)
  recordGlobalValue(MOBILE_FILE_OPENS_GLOBAL_KEY, opened)
  return opened
}

async function openNativeMobileFile(path: string): Promise<MobileFileOpenerResult> {
  const sharing = require('expo-sharing') as ExpoSharingModule
  if (await sharing.isAvailableAsync()) {
    await sharing.shareAsync(path, { dialogTitle: fileNameFromPath(path) })
    return { opened: true, shared: true }
  }

  const { Linking } = require('react-native') as LinkingModule
  await Linking.openURL(path)
  return { opened: true, shared: false }
}

function openedMobileFileResult(path: string, nativeResult: MobileFileOpenerResult): Extract<MobileFileOpenResult, { ok: true }> {
  if (nativeResult && typeof nativeResult === 'object') {
    return {
      ok: true,
      opened: nativeResult.opened !== false,
      path,
      shared: nativeResult.shared === true,
    }
  }

  return {
    ok: true,
    opened: nativeResult !== false,
    path,
    shared: false,
  }
}

function openEvidence(path: string, note: MobileNote | null) {
  return {
    noteId: note?.id ?? null,
    path,
    title: note?.title ?? null,
  }
}

function fileNameFromPath(path: string): string {
  const fileName = path.split(/[/?#]/u).filter(Boolean).at(-1)
  return fileName ? decodeURIComponent(fileName) : 'file'
}

function isBrowserRuntime(): boolean {
  return typeof document !== 'undefined'
}

function recordGlobalValue(key: string, value: unknown) {
  const target = globalThis as Record<string, unknown>
  const current = target[key]
  const values = Array.isArray(current) ? current : []
  values.push(value)
  target[key] = values
}
