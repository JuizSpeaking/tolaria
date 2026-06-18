import { expect, test } from '@playwright/test'
import { performance } from 'node:perf_hooks'
import {
  firstSidebarFolder,
  installLocalVaultSnapshot,
  localVaultPath,
  type LocalVaultSnapshotState,
} from './local-vault-snapshot-loader'
import { workspaceScenarioForId } from '../src/fixtures/workspaceFixtures'
import {
  HOST_WORKSPACE_NOTE_CONTENTS_GLOBAL_KEY,
  HOST_WORKSPACE_SNAPSHOT_GLOBAL_KEY,
  HOST_WORKSPACE_SNAPSHOT_STORAGE_KEY,
  HOST_WORKSPACE_WRITE_FAILURE_GLOBAL_KEY,
} from '../src/workspace/readOnlyWorkspaceRepository'

const mobileClipboardAttemptsGlobalKey = '__TOLARIA_MOBILE_CLIPBOARD_ATTEMPTS__'

test.describe('mobile UI lab interactions', () => {
  test('exercises editable tablet workspace flows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Editable action flows use the full-width tablet layout.')

    await page.goto('/')
    await searchAndSelectRelease(page)
    await toggleFavorite(page)
    await retargetSelectedRelease(page)
    await createMobileQaDraft(page)
    await createSavedViewFromSidebar(page, { returnToInbox: true })
    await addDatePropertyFromSuggestion(page)
    await addRelationshipFromSuggestion(page)
    await editMarkdownWithWikilink(page)
    await archiveAndUnarchiveSelectedNote(page)
    await organizeUnorganizeAndDeleteSelectedDraft(page)
    await createRenameAndDeleteSidebarFolder(page)
  })

  test('navigates quick open search from the keyboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Keyboard quick-open checks use the full-width tablet layout.')

    await page.goto('/')
    await page.getByTestId('note-list-search-action').click()
    await expect(page.getByTestId('workspace-search-input')).toBeFocused()
    await expect(page.getByTestId('workspace-search-result-workflow-orchestration')).toBeVisible()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
    await expect(page.getByTestId('editor-title')).toHaveText('How I Run an Open Source Project')
  })

  test('opens the markdown source editor from the editor toolbar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Editor source mode checks use the full-width tablet layout.')

    await page.goto('/')
    await expect(page.getByTestId('editor-source-action')).toHaveAttribute('aria-label', 'Open the raw editor')
    await page.getByTestId('editor-source-action').click()
    await expect(page.getByTestId('editor-markdown-input')).toBeVisible()
    await expect(page.getByTestId('editor-formatting-toolbar')).toBeVisible()
    await expect(page.getByTestId('editor-source-action')).toHaveAttribute('aria-label', 'Return to the editor')
  })

  test('derives tablet metadata from raw frontmatter edits', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Raw frontmatter parity uses the full-width tablet layout.')

    await page.goto('/')
    await editRawFrontmatterContract(page)
  })

  test('navigates fixture saved views', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Saved-view navigation is exercised in the full-width tablet layout.')

    await page.goto('/')

    await page.getByRole('button', { name: 'Active Procedures' }).click()
    await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Active Procedures')
    await expect(page.getByText('How I Run an Open Source Project').first()).toBeVisible()
    await expect(page.getByTestId('note-row-open-source-project').getByText('Project Board')).toBeVisible()
    await expect(page.getByTestId('note-row-open-source-project').getByText('Process')).toBeVisible()
    await expect(page.getByText('Workflow Orchestration Essay').first()).toBeHidden()
    await editAndDeleteSavedView(page)
  })

  test('reorders created saved views', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Saved-view ordering is exercised in the full-width tablet layout.')

    await page.goto('/')
    await createSavedViewFromSidebar(page)
    await moveCreatedSavedView(page)
  })

  test('customizes saved view note-list columns', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Saved-view column editing is exercised in the full-width tablet layout.')

    await page.goto('/')
    await addPrioritySortFixtures(page)
    await createSavedViewFromSidebar(page)
    await customizeCreatedSavedViewColumns(page)
  })

  test('customizes type section metadata and note-list columns', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Type-section editing is exercised in the full-width tablet layout.')

    await page.goto('/')
    await customizeProcedureTypeSection(page)
  })

  test('creates and deletes Type documents from the sidebar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Type document actions are exercised in the full-width tablet layout.')

    await page.goto('/')
    await createAndDeleteTypeSection(page)
  })

  test('inserts @ person mentions as canonical wikilinks in the editor', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Editor autocomplete checks use the full-width tablet layout.')

    await page.goto('/')
    await createNote(page, 'Maria Rossi', 'maria-rossi.md')
    await changeSelectedNoteTypeTo(page, 'Person')
    await createNote(page, 'Mention Draft', 'mention-draft.md')
    await insertPersonMention(page)
  })

  test('renames a file to the selected note title from mobile more actions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Filename retargeting checks use the full-width tablet layout.')

    await page.goto('/')
    await renameSelectedFileToTitle(page)
  })

  test('exercises reducer-backed phone workspace flows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone real-workspace checks run on the phone layout.')

    await page.goto('/')
    await navigatePhoneSidebarSection(page)
    await openPhoneEditorAndProperties(page)
    await editPhoneProperty(page)
    await editPhoneMarkdownWithWikilink(page)
    await returnPhoneEditorToList(page)
    await navigatePhoneSwipeGestures(page)
  })

  test('keeps large local-vault read-only interactions within tablet budgets', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Large-vault performance checks run once on the primary tablet layout.')

    const state = await installRequiredLocalVaultSnapshot(page)
    assertSnapshotBuildBudgets(state)
    await assertLocalVaultRenderBudget(page, state)
    await assertNoteSwitchBudget(page, state)
    await assertHiddenNoteHydrationAndWrite(page, state)
    await assertSavedViewNavigationBudget(page, state)
    await assertTypeNavigationBudget(page, state)
    await assertFolderNavigationBudget(page, state)
  })

  test('surfaces host write failures in the tablet status bar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Host persistence status checks use the full-width tablet layout.')

    await installFixtureHostWorkspace(page)
    await page.goto('/?source=host-vault')

    await expect(page.getByTestId('editor-title')).toHaveText('Workflow Orchestration Essay')
    await page.getByTestId('note-list-create-action').click()
    await page.getByTestId('workspace-create-note-title-input').fill('Persistence Warmup Draft')
    await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { exact: true, name: 'Create' }).click()
    await expect(page.getByTestId('note-row-persistence-warmup-draft.md')).toBeVisible()
    await expect(hostWorkspaceWriteCount(page)).resolves.toBe(1)

    await page.evaluate((failureKey) => {
      Reflect.set(window, failureKey, 'Host write failed in QA')
    }, HOST_WORKSPACE_WRITE_FAILURE_GLOBAL_KEY)
    await expect(page.evaluate((failureKey) => {
      return (window as unknown as Record<string, unknown>)[failureKey]
    }, HOST_WORKSPACE_WRITE_FAILURE_GLOBAL_KEY)).resolves.toBe('Host write failed in QA')
    await page.getByTestId('note-list-create-action').click()
    await page.getByTestId('workspace-create-note-title-input').fill('Persistence Failure Draft')
    await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { exact: true, name: 'Create' }).click()
    await expect(page.getByTestId('note-row-persistence-failure-draft.md')).toBeVisible()

    await expect(page.getByTestId('sync-status-label')).toHaveText('Not synced')
    await expect(page.getByTestId('sync-status-detail')).toHaveText('Sync failed')
  })
})

async function searchAndSelectRelease(page: PageLike) {
  await page.getByTestId('note-list-search-action').click()
  await expect(page.getByTestId('workspace-search-input')).toBeVisible()
  await expect(page.getByTestId('workspace-search-input')).toBeFocused()
  await expect(page.getByTestId('workspace-search-result-workflow-orchestration')).toBeVisible()
  await page.getByTestId('workspace-search-input').fill('zzzzzzz')
  await expect(page.getByTestId('workspace-search-results').getByText('No matching notes')).toBeVisible()
  await page.getByTestId('workspace-search-input').fill('Release')
  await expect(page.getByTestId('workspace-search-result-release-2026-05-02')).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-list-toolbar-subtitle')).toHaveText('7 open notes')
  await expect(page.getByTestId('editor-title')).toHaveText('v2026-05-02')
}

async function toggleFavorite(page: PageLike) {
  await page.getByTestId('editor-favorite-action').click()
  await expect(page.getByLabel('Remove from Favorites')).toBeVisible()
}

async function retargetSelectedRelease(page: PageLike) {
  await changeSelectedReleaseType(page)
  await editSelectedReleaseStatus(page)
  await editSelectedReleaseTags(page)
  await addTypedProperties(page)
  await moveAndRenameSelectedRelease(page)
  await assertSelectedReleaseDeepLink(page)
}

async function changeSelectedReleaseType(page: PageLike) {
  await page.getByTestId('property-row-type-edit').click()
  await expect(page.getByTestId('workspace-change-type-input')).toBeVisible()
  await expect(page.getByTestId('workspace-change-type-input')).toHaveValue('Release')
  await page.getByTestId('workspace-change-type-input').fill('Proc')
  await page.getByTestId('workspace-change-type-suggestion-procedure').click()
  await page.getByTestId('workspace-action-sheet-changeNoteType').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('property-row-type')).toContainText('Procedure')
}

async function editSelectedReleaseStatus(page: PageLike) {
  await page.getByTestId('property-row-status-edit').click()
  await expect(page.getByTestId('workspace-action-sheet-editProperty')).toBeVisible()
  await expect(page.getByTestId('workspace-property-name-input')).toHaveValue('Status')
  await expect(page.getByTestId('workspace-property-status-picker')).toBeVisible()
  await expect(page.getByTestId('workspace-property-status-shipped')).toBeVisible()
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('Shipped')
  await page.getByTestId('workspace-property-value-input').fill('Active')
  await page.getByTestId('workspace-action-sheet-editProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-row-status')).toContainText('Active')
}

async function editSelectedReleaseTags(page: PageLike) {
  await page.getByTestId('property-tags-edit').click()
  await expect(page.getByTestId('workspace-property-name-input')).toHaveValue('tags')
  await expect(page.getByTestId('workspace-property-kind-list')).toBeVisible()
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('Tolaria MVP')
  await page.getByTestId('workspace-property-value-input').fill('Tolaria MVP, De')
  await page.getByTestId('workspace-property-value-suggestion-design').click()
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('Tolaria MVP, Design')
  await page.getByTestId('workspace-action-sheet-editProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-tags-wrap')).toContainText('Design')
}

async function addTypedProperties(page: PageLike) {
  await page.getByTestId('property-action-add-property').click()
  await expect(page.getByTestId('workspace-property-name-input')).toBeVisible()
  await page.getByTestId('workspace-property-name-input').fill('Estimate')
  await page.getByTestId('workspace-property-kind-number').click()
  await page.getByTestId('workspace-property-value-input').fill('13')
  await page.getByTestId('workspace-action-sheet-addProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-row-estimate')).toContainText('13')

  await page.getByTestId('property-action-add-property').click()
  await page.getByTestId('workspace-property-name-input').fill('Published')
  await page.getByTestId('workspace-property-kind-boolean').click()
  await expect(page.getByTestId('workspace-property-boolean-picker')).toBeVisible()
  await page.getByTestId('workspace-property-boolean-no').click()
  await page.getByTestId('workspace-action-sheet-addProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-row-published')).toContainText('No')

  await page.getByTestId('property-action-add-property').click()
  await page.getByTestId('workspace-property-name-input').fill('URL')
  await expect(page.getByTestId('workspace-property-kind-url')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('workspace-property-value-input')).toHaveAttribute('placeholder', 'https://')
  await page.getByTestId('workspace-property-value-input').fill('https://tolaria.app')
  await page.getByTestId('workspace-action-sheet-addProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-row-url')).toContainText('https://tolaria.app')

  await page.getByTestId('property-action-add-property').click()
  await page.getByTestId('workspace-property-name-input').fill('Brand color')
  await expect(page.getByTestId('workspace-property-kind-color')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('workspace-property-color-picker')).toBeVisible()
  await page.getByTestId('workspace-property-color-blue').click()
  await page.getByTestId('workspace-action-sheet-addProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-row-brand-color')).toContainText('#155DFF')
}

async function moveAndRenameSelectedRelease(page: PageLike) {
  await page.getByTestId('editor-more-action').click()
  await expect(page.getByTestId('workspace-action-move-note-folder')).toBeVisible()
  await page.getByTestId('workspace-action-move-note-folder').click()
  await expect(page.getByTestId('workspace-move-folder-input')).toBeVisible()
  await page.getByTestId('workspace-move-folder-input').fill('Missing Folder')
  await expect(page.getByTestId('workspace-action-sheet-moveNoteToFolder').getByRole('button', { name: 'Save' })).toBeDisabled()
  await page.getByTestId('workspace-move-folder-input').fill('Tolaria')
  await page.getByTestId('workspace-move-folder-suggestion-tolaria-mobile-ui').click()
  const moveSaveButton = page.getByTestId('workspace-action-sheet-moveNoteToFolder').getByRole('button', { name: 'Save' })
  await expect(moveSaveButton).toBeEnabled()
  await moveSaveButton.click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-rename-file').click()
  await expect(page.getByTestId('workspace-rename-file-input')).toHaveValue('v2026-05-02')
  const renameSaveButton = page.getByTestId('workspace-action-sheet-renameNoteFile').getByRole('button', { name: 'Save' })
  await page.getByTestId('workspace-rename-file-input').fill('Workflow Orchestration Essay')
  await expect(renameSaveButton).toBeDisabled()
  await page.getByTestId('workspace-rename-file-input').fill('quarterly:plan')
  await expect(renameSaveButton).toBeDisabled()
  await page.getByTestId('workspace-rename-file-input').fill('release-cleanup')
  await expect(renameSaveButton).toBeEnabled()
  await renameSaveButton.click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
}

async function renameSelectedFileToTitle(page: PageLike) {
  await expect(page.getByTestId('editor-title')).toHaveText('Workflow Orchestration Essay')
  await page.getByTestId('editor-more-action').click()
  await expect(page.getByTestId('workspace-action-rename-file-to-title')).toBeVisible()
  await page.getByTestId('workspace-action-rename-file-to-title').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-row-workflow-orchestration')).toBeVisible()

  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-copy-deep-link').click()
  await expect(page.evaluate((key) => {
    const attempts = (window as unknown as Record<string, unknown>)[key]
    return Array.isArray(attempts) ? attempts.at(-1) : null
  }, mobileClipboardAttemptsGlobalKey)).resolves.toBe('tolaria://tv/Tolaria/Mobile%20UI/workflow-orchestration-essay.md')
}

async function assertSelectedReleaseDeepLink(page: PageLike) {
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-copy-deep-link').click()
  await expect(page.evaluate((key) => {
    const attempts = (window as unknown as Record<string, unknown>)[key]
    return Array.isArray(attempts) ? attempts.at(-1) : null
  }, mobileClipboardAttemptsGlobalKey)).resolves.toBe('tolaria://tv/Tolaria/Mobile%20UI/release-cleanup.md')
}

async function createMobileQaDraft(page: PageLike) {
  await createNote(page, 'Mobile QA Draft', 'mobile-qa-draft.md')
}

async function createNote(page: PageLike, title: string, rowId: string) {
  await page.getByTestId('note-list-create-action').click()
  await expect(page.getByTestId('workspace-create-note-title-input')).toBeVisible()
  await page.getByTestId('workspace-create-note-title-input').fill(title)
  await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId(`note-row-${rowId}`)).toBeVisible()
  await expectSelectedBodyOnlyNoteTitle(page, title)
}

async function expectSelectedBodyOnlyNoteTitle(page: PageLike, title: string) {
  await expect(page.getByTestId('editor-toolbar-title')).toHaveText(title)
  await expect(page.getByTestId('editor-title')).toBeHidden()
}

async function expectSelectedChromeTitle(page: PageLike, title: string) {
  await expect(page.getByTestId('editor-toolbar-title')).toHaveText(title)
}

async function changeSelectedNoteTypeTo(page: PageLike, type: string) {
  await page.getByTestId('property-row-type-edit').click()
  await expect(page.getByTestId('workspace-change-type-input')).toBeVisible()
  await page.getByTestId('workspace-change-type-input').fill(type)
  await page.getByTestId('workspace-action-sheet-changeNoteType').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('property-row-type')).toContainText(type)
}

async function insertPersonMention(page: PageLike) {
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-markdown-input')).toBeVisible()
  await page.getByTestId('editor-markdown-input').fill('# Mention Draft\n\nFollow up with @mar')
  await expect(page.getByTestId('editor-person-mention-suggestions')).toBeVisible()
  await page.getByTestId('editor-person-mention-suggestion-maria-rossi-md').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue('# Mention Draft\n\nFollow up with [[maria-rossi]] ')
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-wikilink-maria-rossi')).toBeVisible()
}

async function navigatePhoneSidebarSection(page: PageLike) {
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await expectToolbarLeadingActionBeforeTitle(page)
  await page.getByTestId('phone-sidebar-action').click()
  await expect(page.getByTestId('phone-sidebar-screen')).toBeVisible()
  await page.getByTestId('sidebar-collapse-action').click()
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await page.getByTestId('phone-sidebar-action').click()
  await expect(page.getByTestId('phone-sidebar-screen')).toBeVisible()
  await page.getByRole('button', { name: 'All Notes' }).click()
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('All Notes')
}

async function expectToolbarLeadingActionBeforeTitle(page: PageLike) {
  const actionBox = await page.getByTestId('phone-sidebar-action').boundingBox()
  const titleBox = await page.getByTestId('note-list-toolbar-title').boundingBox()
  if (!actionBox || !titleBox) throw new Error('Cannot measure phone note-list toolbar.')

  expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(titleBox.x)
}

async function openPhoneEditorAndProperties(page: PageLike) {
  await page.getByTestId('note-row-workflow-orchestration').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expect(page.getByTestId('editor-title')).toHaveText('Workflow Orchestration Essay')
  await page.getByTestId('phone-properties-action').click()
  await expect(page.getByTestId('phone-properties-screen')).toBeVisible()
  await expect(page.getByTestId('properties-panel')).toBeVisible()
}

async function editPhoneProperty(page: PageLike) {
  await page.getByTestId('property-action-add-property').click()
  await expect(page.getByTestId('workspace-action-sheet-addProperty')).toBeVisible()
  await page.getByTestId('workspace-property-name-input').fill('Phone QA')
  await page.getByTestId('workspace-property-value-input').fill('Ready')
  await page.getByTestId('workspace-action-sheet-addProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('property-row-phone-qa')).toContainText('Ready')
}

async function editPhoneMarkdownWithWikilink(page: PageLike) {
  await page.getByTestId('phone-back-action').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-markdown-input')).toBeVisible()
  await page.getByTestId('editor-markdown-input').fill('# Workflow Orchestration Essay\n\nPhone editing links [[Proj')
  await expect(page.getByTestId('editor-wikilink-suggestions')).toBeVisible()
  await page.getByTestId('editor-wikilink-suggestion-open-source-project').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue('# Workflow Orchestration Essay\n\nPhone editing links [[Tolaria/Mobile UI/How I Run an Open Source Project]]')
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-wikilink-tolaria-mobile-ui-how-i-run-an-open-source-project')).toBeVisible()
}

async function returnPhoneEditorToList(page: PageLike) {
  await page.getByTestId('phone-back-action').click()
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await expect(page.getByTestId('note-row-workflow-orchestration')).toBeVisible()
}

async function navigatePhoneSwipeGestures(page: PageLike) {
  await swipeHorizontally(page, { x: 12, y: 300 }, { x: 180, y: 300 })
  await expect(page.getByTestId('phone-sidebar-screen')).toBeVisible()
  await swipeHorizontally(page, { x: 220, y: 300 }, { x: 40, y: 300 })
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()

  await page.getByTestId('note-row-workflow-orchestration').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await swipeHorizontally(page, { x: 360, y: 300 }, { x: 80, y: 300 })
  await expect(page.getByTestId('phone-properties-screen')).toBeVisible()
  await swipeHorizontally(page, { x: 80, y: 300 }, { x: 360, y: 300 })
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await swipeHorizontally(page, { x: 80, y: 300 }, { x: 360, y: 300 })
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
}

async function createSavedViewFromSidebar(
  page: PageLike,
  options: { returnToInbox?: boolean } = {},
) {
  await page.getByTestId('sidebar-section-create-views').click()
  await expect(page.getByTestId('workspace-create-view-name-input')).toBeVisible()
  await expect(page.getByTestId('workspace-create-view-name-input')).toHaveValue('')
  await expect(page.getByTestId('workspace-view-filter-value-input-0')).toHaveValue('')
  await page.getByTestId('workspace-view-filter-remove-0').click()
  await page.getByTestId('workspace-create-view-name-input').fill('Mobile Inbox View')
  await page.getByTestId('workspace-action-sheet-createView').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Mobile Inbox View' })).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Mobile Inbox View')
  if (options.returnToInbox) {
    await page.getByTestId('sidebar-item-inbox').click()
    await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Inbox')
  }
}

async function editAndDeleteSavedView(page: PageLike) {
  await longPress(page, 'sidebar-item-view-active-procedures')
  await expect(page.getByTestId('workspace-edit-view-name-input')).toBeVisible()
  await expect(page.getByTestId('workspace-edit-view-name-input')).toHaveValue('Active Procedures')
  await page.getByTestId('workspace-edit-view-name-input').fill('Active Workflows')
  await expect(page.getByTestId('workspace-view-filter-value-input-0')).toHaveValue('Procedure')
  await page.getByTestId('workspace-view-filter-value-input-0').fill('Essay')
  await page.getByTestId('workspace-view-filter-remove-1').click()
  await page.getByTestId('workspace-action-sheet-editView').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Active Workflows' })).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Active Workflows')
  await expect(page.getByText('Workflow Orchestration Essay').first()).toBeVisible()
  await expect(page.getByText('How I Run an Open Source Project').first()).toBeHidden()

  await longPress(page, 'sidebar-item-view-active-procedures')
  await page.getByTestId('workspace-delete-view-action').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Active Workflows' })).toBeHidden()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Inbox')
}

async function moveCreatedSavedView(page: PageLike) {
  const activeView = page.getByTestId('sidebar-item-view-active-procedures')
  const mobileView = page.getByTestId('sidebar-item-view-mobile-inbox-view')
  await expect(await rowY(mobileView)).toBeGreaterThan(await rowY(activeView))

  await longPress(page, 'sidebar-item-view-mobile-inbox-view')
  await expect(page.getByRole('button', { name: 'Move view up' })).toBeVisible()
  await page.getByRole('button', { name: 'Move view up' }).click()
  await expect(await rowY(mobileView)).toBeLessThan(await rowY(activeView))

  await page.getByRole('button', { name: 'Move view down' }).click()
  await expect(await rowY(mobileView)).toBeGreaterThan(await rowY(activeView))
  await page.getByTestId('workspace-action-sheet-toolbar').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
}

async function customizeCreatedSavedViewColumns(page: PageLike) {
  await longPress(page, 'sidebar-item-view-mobile-inbox-view')
  await page.getByTestId('workspace-view-icon-star').click()
  await page.getByTestId('workspace-view-tone-green').click()
  await expect(page.getByTestId('workspace-view-selected-icon')).toContainText('star')
  await expect(page.getByTestId('workspace-view-selected-color')).toContainText('green')
  await page.getByTestId('workspace-view-property-picker').scrollIntoViewIfNeeded()
  await expect(page.getByTestId('workspace-view-property-picker')).toBeVisible()
  await page.getByTestId('workspace-view-sort-custom-field-input').fill('Pri')
  await page.getByTestId('workspace-view-sort-custom-field-suggestion-priority').click()
  await page.getByTestId('workspace-view-property-search-input').fill('bel')
  await page.getByTestId('workspace-view-property-option-belongs-to').click()
  await page.getByTestId('workspace-action-sheet-editView').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await expect(await rowY(page.getByTestId('note-row-open-source-project'))).toBeLessThan(
    await rowY(page.getByTestId('note-row-workflow-orchestration')),
  )
  const workflowRow = page.getByTestId('note-row-workflow-orchestration')
  await expect(workflowRow.getByText('LLM Workflow')).toBeVisible()
  await expect(workflowRow.getByText('Tolaria MVP')).toBeVisible()

  await longPress(page, 'sidebar-item-view-mobile-inbox-view')
  await expect(page.getByTestId('workspace-view-selected-icon')).toContainText('star')
  await expect(page.getByTestId('workspace-view-selected-color')).toContainText('green')
  await page.getByTestId('workspace-action-sheet-toolbar').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
}

async function addPrioritySortFixtures(page: PageLike) {
  await addNumericPropertyToNote(page, 'note-row-workflow-orchestration', 'Priority', '2')
  await addNumericPropertyToNote(page, 'note-row-open-source-project', 'Priority', '1')
}

async function addNumericPropertyToNote(
  page: PageLike,
  rowTestId: string,
  propertyName: string,
  propertyValue: string,
) {
  await page.getByTestId(rowTestId).click()
  await page.getByTestId('property-action-add-property').click()
  await page.getByTestId('workspace-property-name-input').fill(propertyName)
  await page.getByTestId('workspace-property-kind-number').click()
  await page.getByTestId('workspace-property-value-input').fill(propertyValue)
  await page.getByTestId('workspace-action-sheet-addProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId(`property-row-${propertyName.toLowerCase()}`)).toContainText(propertyValue)
}

async function customizeProcedureTypeSection(page: PageLike) {
  await longPress(page, 'sidebar-item-procedures')
  const sheet = page.getByTestId('workspace-action-sheet-editTypeSection')
  await expect(sheet).toBeVisible()
  await expect(page.getByTestId('workspace-type-section-label-input')).toHaveValue('Procedures')
  await page.getByTestId('workspace-type-section-label-input').fill('Runbooks')
  await page.getByTestId('workspace-move-type-up-action').click()
  await page.getByTestId('workspace-type-icon-folder').click()
  await page.getByTestId('workspace-type-tone-green').click()
  await expect(page.getByTestId('workspace-type-selected-icon')).toContainText('folder')
  await expect(page.getByTestId('workspace-type-selected-color')).toContainText('green')
  await page.getByTestId('workspace-type-sort-custom-field-input').fill('Priority')
  await page.getByTestId('workspace-type-sort-custom-desc').click()
  await page.getByTestId('workspace-type-template-input').fill('## Checklist\n\nTemplate body from the Procedure type.')
  await page.getByTestId('workspace-type-property-search-input').fill('bel')
  await page.getByTestId('workspace-type-property-option-belongs-to').click()
  await page.getByTestId('workspace-type-schema-property-name-input').scrollIntoViewIfNeeded()
  await page.getByTestId('workspace-type-schema-property-name-input').fill('Priority')
  await page.getByTestId('workspace-type-schema-property-value-input').fill('High')
  await sheet.getByRole('button', { name: 'Add property' }).click()
  await expect(page.getByTestId('workspace-type-schema-property-priority')).toContainText('High')
  await page.getByTestId('workspace-type-schema-relationship-name-input').fill('belongs_to')
  await page.getByTestId('workspace-type-schema-relationship-target-input').fill('Workflow Orchestration Essay')
  await sheet.getByRole('button', { name: 'Add relationship' }).click()
  await expect(page.getByTestId('workspace-type-schema-relationship-belongs-to')).toContainText('Workflow Orchestration Essay')
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  const runbooksSection = page.getByTestId('sidebar-item-procedures')
  const essaysSection = page.getByTestId('sidebar-item-essays')
  await expect(runbooksSection).toContainText('Runbooks')
  await expect(await rowY(runbooksSection)).toBeLessThan(await rowY(essaysSection))

  await longPress(page, 'sidebar-item-procedures')
  await expect(page.getByTestId('workspace-type-selected-icon')).toContainText('folder')
  await expect(page.getByTestId('workspace-type-selected-color')).toContainText('green')
  await expect(page.getByTestId('workspace-type-sort-custom-field-input')).toHaveValue('Priority')
  await page.getByTestId('workspace-action-sheet-toolbar').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await runbooksSection.click()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Runbooks')
  await expect(page.getByTestId('note-row-open-source-project').getByText('Project Board')).toBeVisible()
  await page.getByTestId('note-list-create-action').click()
  await page.getByTestId('workspace-create-note-title-input').fill('Runbook From Type Defaults')
  await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('note-row-runbook-from-type-defaults.md')).toBeVisible()
  await expect(page.getByTestId('property-row-priority')).toContainText('High')
  await expect(page.getByTestId('relationship-row-workflow-orchestration-essay')).toBeVisible()
  await expect(page.getByTestId('editor-heading-2')).toContainText('Checklist')
  await expect(page.getByTestId('editor-paragraph')).toContainText('Template body from the Procedure type.')
}

async function createAndDeleteTypeSection(page: PageLike) {
  await page.getByTestId('sidebar-section-create-types').click()
  await expect(page.getByTestId('workspace-create-type-name-input')).toBeVisible()
  await page.getByTestId('workspace-create-type-name-input').fill('Decision')
  await page.getByTestId('workspace-action-sheet-createType').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  const decisionSection = page.getByTestId('sidebar-item-type-decision')
  await expect(decisionSection).toContainText('Decisions')
  await expect(decisionSection.getByTestId('sidebar-item-type-decision-count')).toHaveText('0')
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Decisions')
  await expect(page.getByTestId('note-list-toolbar-subtitle')).toHaveText('0')

  await longPress(page, 'sidebar-item-type-decision')
  await expect(page.getByTestId('workspace-action-sheet-editTypeSection')).toBeVisible()
  await page.getByTestId('workspace-delete-type-action').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(decisionSection).toBeHidden()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Inbox')
}

async function longPress(page: PageLike, testId: string) {
  await longPressLocator(page, page.getByTestId(testId), testId)
}

async function swipeHorizontally(
  page: PageLike,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const client = await page.context().newCDPSession(page)
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }

  await client.send('Input.dispatchTouchEvent', {
    touchPoints: [start],
    type: 'touchStart',
  })
  await client.send('Input.dispatchTouchEvent', {
    touchPoints: [midpoint],
    type: 'touchMove',
  })
  await client.send('Input.dispatchTouchEvent', {
    touchPoints: [end],
    type: 'touchMove',
  })
  await client.send('Input.dispatchTouchEvent', {
    touchPoints: [],
    type: 'touchEnd',
  })
  await client.detach()
}

async function longPressRoleButton(page: PageLike, name: string) {
  await longPressLocator(page, page.getByRole('button', { name }).first(), name)
}

async function longPressLocator(
  page: PageLike,
  target: ReturnType<PageLike['getByTestId']>,
  label: string,
) {
  const box = await target.boundingBox()
  if (!box) throw new Error(`Cannot long-press missing target: ${label}`)

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(700)
  await page.mouse.up()
}

async function rowY(locator: ReturnType<PageLike['getByTestId']>) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Cannot measure missing sidebar row.')
  return box.y
}

async function addDatePropertyFromSuggestion(page: PageLike) {
  await expect(page.getByTestId('property-placeholder-suggested-date')).toBeVisible()
  await page.getByTestId('property-placeholder-suggested-date').click()
  await expect(page.getByTestId('workspace-property-name-input')).toBeVisible()
  await expect(page.getByTestId('workspace-property-name-input')).toHaveValue('Date')
  await expect(page.getByTestId('workspace-property-kind-date')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByTestId('workspace-property-value-input')).toHaveAttribute('placeholder', 'YYYY-MM-DD')
  await page.getByTestId('workspace-property-value-input').fill('2026-06-14')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('property-row-date')).toContainText('2026-06-14')
  await page.getByTestId('property-row-date-edit').click()
  await expect(page.getByTestId('workspace-action-sheet-editProperty')).toBeVisible()
  await expect(page.getByTestId('workspace-property-name-input')).toHaveValue('Date')
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('2026-06-14')
  await page.getByTestId('workspace-property-value-input').fill('2026-06-15')
  await page.getByTestId('workspace-action-sheet-editProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('property-row-date')).toContainText('2026-06-15')
}

async function addRelationshipFromSuggestion(page: PageLike) {
  await expect(page.getByTestId('relationship-placeholder-suggested-related-to-add')).toBeVisible()
  await page.getByTestId('relationship-placeholder-suggested-related-to-add').click()
  await expect(page.getByTestId('workspace-relationship-name-input')).toBeVisible()
  await expect(page.getByTestId('workspace-relationship-name-input')).toHaveValue('related_to')
  await page.getByTestId('workspace-relationship-note-title-input').fill('Open Source')
  await expect(page.getByTestId('workspace-relationship-note-suggestion-open-source-project')).toBeVisible()
  await expect(page.getByTestId('workspace-relationship-create-target')).toBeHidden()
  await page.getByTestId('workspace-relationship-note-suggestion-open-source-project').click()
  await page.getByTestId('workspace-action-sheet-addRelationship').getByRole('button', { name: 'Add' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('relationship-row-how-i-run-an-open-source-project')).toBeVisible()
  await page.getByTestId('relationship-row-how-i-run-an-open-source-project-open').click()
  await expect(page.getByTestId('editor-title')).toHaveText('How I Run an Open Source Project')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expectSelectedBodyOnlyNoteTitle(page, 'Mobile QA Draft')
  await page.getByTestId('relationship-row-how-i-run-an-open-source-project').getByLabel('Remove').click()
  await expect(page.getByTestId('relationship-row-how-i-run-an-open-source-project')).toBeHidden()

  await page.getByTestId('property-action-add-relationship').click()
  await page.getByTestId('workspace-relationship-key-suggestion-related-to').click()
  await page.getByTestId('workspace-relationship-note-title-input').fill('Brand New Target')
  await expect(page.getByTestId('workspace-relationship-create-target')).toContainText('Brand New Target')
  await page.getByTestId('workspace-relationship-create-target').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expectSelectedBodyOnlyNoteTitle(page, 'Brand New Target')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('relationship-row-brand-new-target')).toBeVisible()
  await page.getByTestId('relationship-row-brand-new-target-open').click()
  await expectSelectedBodyOnlyNoteTitle(page, 'Brand New Target')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expectSelectedBodyOnlyNoteTitle(page, 'Mobile QA Draft')
}

async function editMarkdownWithWikilink(page: PageLike) {
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-markdown-input')).toBeVisible()
  await expect(page.getByTestId('editor-formatting-toolbar')).toBeVisible()
  await page.getByTestId('editor-markdown-input').fill('# Mobile QA Draft Revised\n\nDraft body referencing ')
  await page.getByTestId('editor-format-wikilink').click()
  await expect(page.getByTestId('editor-wikilink-suggestions')).toBeVisible()
  await page.getByTestId('editor-markdown-input').fill('# Mobile QA Draft Revised\n\nDraft body referencing [[open')
  await expect(page.getByTestId('editor-wikilink-suggestion-open-source-project')).toBeVisible()
  await page.getByTestId('editor-wikilink-suggestion-open-source-project').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue('# Mobile QA Draft Revised\n\nDraft body referencing [[Tolaria/Mobile UI/How I Run an Open Source Project]]')
  await page.getByTestId('editor-format-table').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue(/Column/)
  const formattedMarkdown = await page.getByTestId('editor-markdown-input').inputValue()
  await page.getByTestId('editor-markdown-input').fill([
    formattedMarkdown,
    '',
    '#### Deep detail',
    '',
    '1. First ordered step with [source](https://example.com) and ~~stale copy~~',
    '  1. Nested ordered step',
    '',
    '- [x] Complete the mobile renderer',
    '- [ ] Check native spacing',
    '',
    '```typescript',
    'const renderer = "native";',
    '```',
    '',
    '---',
  ].join('\n'))
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')
  await expect(page.getByTestId('editor-wikilink-tolaria-mobile-ui-how-i-run-an-open-source-project')).toBeVisible()
  await expect(page.getByTestId('editor-table')).toBeVisible()
  await expect(page.getByTestId('editor-heading-4')).toContainText('Deep detail')
  await expect(page.getByTestId('editor-ordered-row')).toHaveCount(2)
  await expect(page.getByTestId('editor-task-row')).toHaveCount(2)
  await expect(page.getByTestId('editor-code-block')).toContainText('renderer')
  await expect(page.getByTestId('editor-divider')).toBeVisible()
  await expect(page.getByTestId('editor-link-https-example-com')).toContainText('source')
  await expect(page.getByTestId('editor-strikethrough')).toContainText('stale copy')
  await page.getByTestId('editor-wikilink-tolaria-mobile-ui-how-i-run-an-open-source-project').click()
  await expect(page.getByTestId('editor-title')).toHaveText('How I Run an Open Source Project')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')
  await expect(page.getByText('Draft body referencing').first()).toBeVisible()
}

async function editRawFrontmatterContract(page: PageLike) {
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-markdown-input')).toBeVisible()
  await page.getByTestId('editor-markdown-input').fill([
    '---',
    'type: Procedure',
    'Status: Active',
    'tags:',
    '  - Mobile',
    '  - Parity',
    'Priority: High',
    'related_to:',
    '  - [[Tolaria/Mobile UI/How I Run an Open Source Project]]',
    '---',
    '# Raw Frontmatter Contract',
    '',
    'Body with [[Release Notes]].',
    '',
  ].join('\n'))
  await page.getByTestId('editor-edit-action').click()

  await expect(page.getByTestId('editor-title')).toHaveText('Raw Frontmatter Contract')
  await expect(page.getByTestId('note-row-workflow-orchestration')).toContainText('Raw Frontmatter Contract')
  await expect(page.getByTestId('note-row-workflow-orchestration')).toContainText('Mobile')
  await expect(page.getByTestId('property-row-type')).toContainText('Procedure')
  await expect(page.getByTestId('property-row-status')).toContainText('Active')
  await expect(page.getByTestId('property-tags-wrap')).toContainText('Parity')
  await expect(page.getByTestId('property-row-priority')).toContainText('High')
  await expect(page.getByTestId('relationship-row-how-i-run-an-open-source-project-text')).toHaveText('How I Run an Open Source Project')
}

async function archiveAndUnarchiveSelectedNote(page: PageLike) {
  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Archive Note')).toBeVisible()
  await expect(page.getByText('Copy deep link to current item')).toBeVisible()
  await page.getByTestId('workspace-action-copy-deep-link').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.evaluate((key) => {
    const attempts = (window as unknown as Record<string, unknown>)[key]
    return Array.isArray(attempts) ? attempts.at(-1) : null
  }, mobileClipboardAttemptsGlobalKey)).resolves.toBe('tolaria://tolaria-vault/mobile-qa-draft.md')

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Archive Note')).toBeVisible()
  await page.getByTestId('workspace-action-archive-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeHidden()

  await page.getByTestId('sidebar-item-archive').click()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Archive')
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeVisible()

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Unarchive Note')).toBeVisible()
  await page.getByTestId('workspace-action-archive-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeHidden()

  await page.getByRole('button', { name: 'Mobile Inbox View' }).click()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Mobile Inbox View')
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeVisible()
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')
}

async function organizeUnorganizeAndDeleteSelectedDraft(page: PageLike) {
  await page.getByTestId('sidebar-item-inbox').click()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Inbox')
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeVisible()
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Mark as Organized')).toBeVisible()
  await page.getByTestId('workspace-action-organize-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeHidden()

  await page.getByTestId('sidebar-item-all-notes').click()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeVisible()
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Mark as Unorganized')).toBeVisible()
  await page.getByTestId('workspace-action-organize-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await page.getByTestId('sidebar-item-inbox').click()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeVisible()
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Delete Note')).toBeVisible()
  await page.getByTestId('workspace-action-delete-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeHidden()
}

async function createRenameAndDeleteSidebarFolder(page: PageLike) {
  await page.getByTestId('sidebar-section-create-folders').click()
  await expect(page.getByTestId('workspace-create-folder-name-input')).toBeVisible()
  await page.getByTestId('workspace-create-folder-name-input').fill('Mobile Test Folder')
  await page.getByTestId('workspace-action-sheet-createFolder').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Mobile Test Folder' })).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Mobile Test Folder')

  await longPressRoleButton(page, 'Mobile Test Folder')
  await expect(page.getByTestId('workspace-rename-folder-input')).toHaveValue('Mobile Test Folder')
  await page.getByTestId('workspace-rename-folder-input').fill('Mobile Renamed Folder')
  await page.getByTestId('workspace-action-sheet-editFolder').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'Mobile Renamed Folder' })).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Mobile Renamed Folder')

  await longPressRoleButton(page, 'Mobile Renamed Folder')
  await page.getByTestId('workspace-action-create-child-folder').click()
  await page.getByTestId('workspace-create-folder-name-input').fill('Child Folder')
  await page.getByTestId('workspace-action-sheet-createFolder').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByRole('button', { name: 'Child Folder' })).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Child Folder')

  await longPressRoleButton(page, 'Child Folder')
  await page.getByTestId('workspace-action-delete-folder').click()
  await expect(page.getByRole('button', { name: 'Child Folder' })).toBeHidden()

  await longPressRoleButton(page, 'Mobile Renamed Folder')
  await page.getByTestId('workspace-action-delete-folder').click()
  await expect(page.getByRole('button', { name: 'Mobile Renamed Folder' })).toBeHidden()
}

async function installRequiredLocalVaultSnapshot(page: PageLike): Promise<LocalVaultSnapshotState> {
  const state = await installLocalVaultSnapshot(page)
  test.skip(!state, `Local vault path is not readable: ${localVaultPath}`)
  if (!state) throw new Error(`Local vault path is not readable: ${localVaultPath}`)
  return state
}

async function installFixtureHostWorkspace(page: PageLike) {
  const snapshot = workspaceScenarioForId('default')

  await page.addInitScript(
    ({ contentKey, globalKey, key, snapshot, value }) => {
      Reflect.set(window, globalKey, snapshot)
      Reflect.set(window, contentKey, {})
      window.localStorage.setItem(key, value)
    },
    {
      contentKey: HOST_WORKSPACE_NOTE_CONTENTS_GLOBAL_KEY,
      globalKey: HOST_WORKSPACE_SNAPSHOT_GLOBAL_KEY,
      key: HOST_WORKSPACE_SNAPSHOT_STORAGE_KEY,
      snapshot,
      value: JSON.stringify(snapshot),
    },
  )
}

async function hostWorkspaceWriteCount(page: PageLike): Promise<number> {
  return page.evaluate(() => {
    const writes = (window as unknown as { __TOLARIA_MOBILE_WORKSPACE_WRITES__?: unknown[] }).__TOLARIA_MOBILE_WORKSPACE_WRITES__
    return writes?.length ?? 0
  })
}

function assertSnapshotBuildBudgets(state: LocalVaultSnapshotState) {
  expect(state.fileCount).toBeGreaterThan(0)
  expect(state.totalDurationMs).toBeLessThan(10_000)
  expect(state.buildDurationMs).toBeLessThan(1_000)
}

async function assertLocalVaultRenderBudget(page: PageLike, state: LocalVaultSnapshotState) {
  const firstNote = state.snapshot.notes[0]
  if (!firstNote) throw new Error('Expected at least one visible local-vault note.')

  const renderDurationMs = await measureDuration(async () => {
    await page.goto('/?source=host-vault')
    await expect(page.getByText(firstNote.title).first()).toBeVisible()
  })
  expect(renderDurationMs).toBeLessThan(3_000)
}

async function assertNoteSwitchBudget(page: PageLike, state: LocalVaultSnapshotState) {
  const secondNote = state.snapshot.notes[1]
  if (!secondNote) throw new Error('Expected at least two visible local-vault notes.')

  const noteSwitchDurationMs = await measureDuration(async () => {
    await page.getByTestId(`note-row-${secondNote.id}`).click()
    await expect(page.getByTestId('editor-title')).toHaveText(secondNote.title)
  })
  expect(noteSwitchDurationMs).toBeLessThan(700)
}

async function assertHiddenNoteHydrationAndWrite(page: PageLike, state: LocalVaultSnapshotState) {
  const hiddenNote = state.snapshot.allNotes?.find((note) => {
    const visibleIds = new Set(state.snapshot.notes.map((candidate) => candidate.id))
    return !visibleIds.has(note.id) && note.path && state.noteContents[note.path]
  })
  if (!hiddenNote?.path) return

  await page.getByTestId('note-list-search-action').click()
  await page.getByTestId('workspace-search-input').fill(hiddenNote.path)
  await page.getByTestId(`workspace-search-result-${hiddenNote.id}`).click()
  await expectSelectedChromeTitle(page, hiddenNote.title)
  await expect(page.getByText(hiddenNote.snippet).first()).toBeVisible()

  await page.getByTestId('editor-edit-action').click()
  await page.getByTestId('editor-markdown-input').fill(`# ${hiddenNote.title}\n\nMobile hydration write check.\n`)
  await page.getByTestId('editor-edit-action').click()

  const writes = await page.evaluate(() => {
    const globalWrites = (window as unknown as { __TOLARIA_MOBILE_WORKSPACE_WRITES__?: unknown[] }).__TOLARIA_MOBILE_WORKSPACE_WRITES__
    return globalWrites ?? []
  })
  expect(writes).toContainEqual(expect.objectContaining({
    kind: 'saveNote',
    path: hiddenNote.path,
  }))
  expect(JSON.stringify(writes)).toContain(`# ${hiddenNote.title}\\n\\nMobile hydration write check.`)
}

async function assertTypeNavigationBudget(page: PageLike, state: LocalVaultSnapshotState) {
  const typeItem = state.snapshot.sidebarSections.find((section) => section.id === 'types')?.items?.[0]
  if (!typeItem) return

  const typeNavigationDurationMs = await measureDuration(async () => {
    await page.getByRole('button', { name: typeItem.label }).click()
    await expect(page.getByTestId('note-list-toolbar-title')).toHaveText(typeItem.label)
  })
  expect(typeNavigationDurationMs).toBeLessThan(700)
}

async function assertSavedViewNavigationBudget(page: PageLike, state: LocalVaultSnapshotState) {
  const viewItem = state.snapshot.sidebarSections.find((section) => section.id === 'views')?.items?.[0]
  if (!viewItem) return

  const viewNavigationDurationMs = await measureDuration(async () => {
    await page.getByRole('button', { name: viewItem.label }).click()
    await expect(page.getByTestId('note-list-toolbar-title')).toHaveText(viewItem.label)
  })
  expect(viewNavigationDurationMs).toBeLessThan(700)
}

async function assertFolderNavigationBudget(page: PageLike, state: LocalVaultSnapshotState) {
  const folder = firstSidebarFolder(state.snapshot)
  if (!folder) return
  const folderButton = page.getByRole('button', { name: folder.name }).first()
  await folderButton.scrollIntoViewIfNeeded()

  const folderNavigationDurationMs = await measureDuration(async () => {
    await folderButton.click()
    await expect(page.getByTestId('note-list-toolbar-title')).toHaveText(folder.name)
  })
  expect(folderNavigationDurationMs).toBeLessThan(700)
}

async function measureDuration(action: () => Promise<void>): Promise<number> {
  const startedAt = performance.now()
  await action()
  return performance.now() - startedAt
}

type PageLike = Parameters<typeof installLocalVaultSnapshot>[0]
