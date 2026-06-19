import { expect, test, type Page } from '@playwright/test'
import { buildLocalVaultWorkspaceSnapshot, mobileFileKindForPath, type LocalVaultFile } from '../src/workspace/localVaultSnapshot'
import {
  HOST_WORKSPACE_NOTE_CONTENTS_GLOBAL_KEY,
  HOST_WORKSPACE_SNAPSHOT_GLOBAL_KEY,
  HOST_WORKSPACE_SNAPSHOT_STORAGE_KEY,
} from '../src/workspace/readOnlyWorkspaceRepository'

const mobileClipboardAttemptsGlobalKey = '__TOLARIA_MOBILE_CLIPBOARD_ATTEMPTS__'
const mobileFileOpenAttemptsGlobalKey = '__TOLARIA_MOBILE_FILE_OPEN_ATTEMPTS__'
const mobileFileRevealAttemptsGlobalKey = '__TOLARIA_MOBILE_FILE_REVEAL_ATTEMPTS__'

test.describe('mobile non-markdown file action parity', () => {
  test('exposes active file actions for selected text and binary vault entries', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'File entry action checks use the full-width tablet layout.')

    await installFileEntryHostWorkspace(page)
    await page.goto('/?source=host-vault')
    await page.getByRole('button', { name: 'Files' }).click()
    await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Files')

    await page.getByTestId('note-row-Files/config.yml').click()
    await expect(page.getByTestId('editor-text-file-input')).toBeVisible()
    await assertFileActionSheet(page, {
      copiedPath: 'Files/config.yml',
      fileTitle: 'Mobile Config',
      revealNoteId: 'Files/config.yml',
    })

    await page.getByTestId('note-row-Files/diagram.png').click()
    await expect(page.getByTestId('file-preview-fallback')).toBeVisible()
    await assertFileActionSheet(page, {
      copiedPath: 'Files/diagram.png',
      fileTitle: 'diagram.png',
      revealNoteId: 'Files/diagram.png',
    })
  })
})

async function assertFileActionSheet(
  page: Page,
  {
    copiedPath,
    fileTitle,
    revealNoteId,
  }: {
    copiedPath: string
    fileTitle: string
    revealNoteId: string
  },
) {
  await page.getByTestId('editor-more-action').click()
  await expect(page.getByTestId('workspace-action-copy-file-path')).toBeVisible()
  await expect(page.getByTestId('workspace-action-open-default-app')).toBeVisible()
  await expect(page.getByTestId('workspace-action-reveal-file')).toBeVisible()
  await expect(page.getByTestId('workspace-action-copy-deep-link')).toBeVisible()
  await expect(page.getByTestId('workspace-action-table-of-contents')).toBeHidden()
  await expect(page.getByTestId('workspace-action-export-pdf')).toBeHidden()

  await page.getByTestId('workspace-action-copy-file-path').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(latestGlobalEntry(page, mobileClipboardAttemptsGlobalKey)).resolves.toBe(copiedPath)

  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-reveal-file').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(latestGlobalEntry(page, mobileFileRevealAttemptsGlobalKey)).resolves.toEqual({
    noteId: revealNoteId,
    path: copiedPath,
    title: fileTitle,
  })

  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-open-default-app').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(latestGlobalEntry(page, mobileFileOpenAttemptsGlobalKey)).resolves.toEqual({
    noteId: revealNoteId,
    path: copiedPath,
    title: fileTitle,
  })
}

function latestGlobalEntry(page: Page, key: string) {
  return page.evaluate((globalKey) => {
    const value = (window as unknown as Record<string, unknown>)[globalKey]
    return Array.isArray(value) ? value.at(-1) : null
  }, key)
}

async function installFileEntryHostWorkspace(page: Page) {
  const snapshot = buildLocalVaultWorkspaceSnapshot({
    files: [
      vaultFile('Inbox.md', '# Inbox\n\nA normal markdown note.\n', 0),
      vaultFile('Files/config.yml', 'name: Mobile Config\nstatus: active\n', 1),
      vaultFile('Files/diagram.png', '', 2),
    ],
    folderPaths: ['Files'],
    vaultAlias: 'tv',
    vaultLabel: 'Tolaria Vault',
    vaultPath: '/Mobile/Test Vault',
  })
  const noteContents = {
    'Inbox.md': '# Inbox\n\nA normal markdown note.\n',
    'Files/config.yml': 'name: Mobile Config\nstatus: active\n',
  }

  await page.addInitScript(
    ({ contentKey, globalKey, key, noteContents, snapshot, value }) => {
      Reflect.set(window, globalKey, snapshot)
      Reflect.set(window, contentKey, noteContents)
      window.localStorage.setItem(key, value)
    },
    {
      contentKey: HOST_WORKSPACE_NOTE_CONTENTS_GLOBAL_KEY,
      globalKey: HOST_WORKSPACE_SNAPSHOT_GLOBAL_KEY,
      key: HOST_WORKSPACE_SNAPSHOT_STORAGE_KEY,
      noteContents,
      snapshot,
      value: JSON.stringify(snapshot),
    },
  )
}

function vaultFile(relativePath: string, content: string, index: number): LocalVaultFile {
  return {
    absolutePath: `/Mobile/Test Vault/${relativePath}`,
    content,
    createdAt: 1_700_000_000_000 + index,
    fileKind: mobileFileKindForPath(relativePath),
    modifiedAt: 1_700_000_000_000 + index,
    relativePath,
    size: content.length,
  }
}
