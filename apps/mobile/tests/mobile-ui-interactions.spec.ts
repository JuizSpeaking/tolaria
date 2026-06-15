import { expect, test } from '@playwright/test'
import { performance } from 'node:perf_hooks'
import {
  firstSidebarFolder,
  installLocalVaultSnapshot,
  localVaultPath,
  type LocalVaultSnapshotState,
} from './local-vault-snapshot-loader'

const mobileClipboardAttemptsGlobalKey = '__TOLARIA_MOBILE_CLIPBOARD_ATTEMPTS__'

test.describe('mobile UI lab interactions', () => {
  test('exercises editable tablet workspace flows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Editable action flows use the full-width tablet layout.')

    await page.goto('/')
    await searchAndSelectRelease(page)
    await toggleFavorite(page)
    await retargetSelectedRelease(page)
    await createMobileQaDraft(page)
    await createSavedViewFromSidebar(page)
    await addDatePropertyFromSuggestion(page)
    await addRelationshipFromSuggestion(page)
    await editMarkdownWithWikilink(page)
    await archiveAndUnarchiveSelectedNote(page)
    await organizeUnorganizeAndDeleteSelectedDraft(page)
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
    await createSavedViewFromSidebar(page)
    await customizeCreatedSavedViewColumns(page)
  })

  test('customizes type section metadata and note-list columns', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'tablet-landscape', 'Type-section editing is exercised in the full-width tablet layout.')

    await page.goto('/')
    await customizeProcedureTypeSection(page)
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
})

async function searchAndSelectRelease(page: PageLike) {
  await page.getByTestId('note-list-search-action').click()
  await expect(page.getByTestId('workspace-search-input')).toBeVisible()
  await page.getByTestId('workspace-search-input').fill('Release')
  await expect(page.getByTestId('workspace-search-result-release-2026-05-02')).toBeVisible()
  await page.getByTestId('workspace-search-result-release-2026-05-02').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-list-toolbar-subtitle')).toHaveText('7 open notes')
  await expect(page.getByTestId('editor-title')).toHaveText('v2026-05-02')
}

async function toggleFavorite(page: PageLike) {
  await page.getByTestId('editor-favorite-action').click()
  await expect(page.getByLabel('Remove from Favorites')).toBeVisible()
}

async function retargetSelectedRelease(page: PageLike) {
  await page.getByTestId('property-row-type-edit').click()
  await expect(page.getByTestId('workspace-change-type-input')).toBeVisible()
  await expect(page.getByTestId('workspace-change-type-input')).toHaveValue('Release')
  await page.getByTestId('workspace-change-type-input').fill('Proc')
  await page.getByTestId('workspace-change-type-suggestion-procedure').click()
  await page.getByTestId('workspace-action-sheet-changeNoteType').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('property-row-type')).toContainText('Procedure')

  await page.getByTestId('property-row-status-edit').click()
  await expect(page.getByTestId('workspace-action-sheet-editProperty')).toBeVisible()
  await expect(page.getByTestId('workspace-property-name-input')).toHaveValue('Status')
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('Shipped')
  await page.getByTestId('workspace-property-value-input').fill('Active')
  await page.getByTestId('workspace-action-sheet-editProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-row-status')).toContainText('Active')

  await page.getByTestId('property-tags-edit').click()
  await expect(page.getByTestId('workspace-property-name-input')).toHaveValue('tags')
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('Tolaria MVP')
  await page.getByTestId('workspace-property-value-input').fill('Tolaria MVP, De')
  await page.getByTestId('workspace-property-value-suggestion-design').click()
  await expect(page.getByTestId('workspace-property-value-input')).toHaveValue('Tolaria MVP, Design')
  await page.getByTestId('workspace-action-sheet-editProperty').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('property-tags-wrap')).toContainText('Design')

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByTestId('workspace-action-move-note-folder')).toBeVisible()
  await page.getByTestId('workspace-action-move-note-folder').click()
  await expect(page.getByTestId('workspace-move-folder-input')).toBeVisible()
  await page.getByTestId('workspace-move-folder-suggestion-tolaria-mobile-ui').click()
  await page.getByTestId('workspace-action-sheet-moveNoteToFolder').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-rename-file').click()
  await expect(page.getByTestId('workspace-rename-file-input')).toHaveValue('v2026-05-02')
  await page.getByTestId('workspace-rename-file-input').fill('release-cleanup')
  await page.getByTestId('workspace-action-sheet-renameNoteFile').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-copy-deep-link').click()
  await expect(page.evaluate((key) => {
    const attempts = (window as unknown as Record<string, unknown>)[key]
    return Array.isArray(attempts) ? attempts.at(-1) : null
  }, mobileClipboardAttemptsGlobalKey)).resolves.toBe('tolaria://tv/Tolaria/Mobile%20UI/release-cleanup.md')
}

async function createMobileQaDraft(page: PageLike) {
  await page.getByTestId('note-list-create-action').click()
  await expect(page.getByTestId('workspace-create-note-title-input')).toBeVisible()
  await page.getByTestId('workspace-create-note-title-input').fill('Mobile QA Draft')
  await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeVisible()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft')
}

async function createSavedViewFromSidebar(page: PageLike) {
  await page.getByTestId('sidebar-section-create-views').click()
  await expect(page.getByTestId('workspace-create-view-name-input')).toBeVisible()
  await expect(page.getByTestId('workspace-create-view-name-input')).toHaveValue('Inbox')
  await page.getByTestId('workspace-create-view-name-input').fill('Mobile Inbox View')
  await page.getByTestId('workspace-action-sheet-createView').getByRole('button', { name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Mobile Inbox View' })).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Mobile Inbox View')
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
  await expect(page.getByTestId('workspace-view-property-picker')).toBeVisible()
  await page.getByTestId('workspace-view-property-search-input').fill('bel')
  await page.getByTestId('workspace-view-property-option-belongs-to').click()
  await page.getByTestId('workspace-action-sheet-editView').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  const workflowRow = page.getByTestId('note-row-workflow-orchestration')
  await expect(workflowRow.getByText('LLM Workflow')).toBeVisible()
  await expect(workflowRow.getByText('Tolaria MVP')).toBeVisible()
}

async function customizeProcedureTypeSection(page: PageLike) {
  await longPress(page, 'sidebar-item-procedures')
  const sheet = page.getByTestId('workspace-action-sheet-editTypeSection')
  await expect(sheet).toBeVisible()
  await expect(page.getByTestId('workspace-type-section-label-input')).toHaveValue('Procedures')
  await page.getByTestId('workspace-type-section-label-input').fill('Runbooks')
  await page.getByTestId('workspace-type-tone-green').click()
  await page.getByTestId('workspace-type-sort-title-asc').click()
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
  await expect(page.getByRole('button', { name: 'Runbooks' })).toBeVisible()

  await page.getByRole('button', { name: 'Runbooks' }).click()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Runbooks')
  await expect(page.getByTestId('note-row-open-source-project').getByText('Project Board')).toBeVisible()
  await page.getByTestId('note-list-create-action').click()
  await page.getByTestId('workspace-create-note-title-input').fill('Runbook From Type Defaults')
  await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { name: 'Create' }).click()
  await expect(page.getByTestId('note-row-runbook-from-type-defaults.md')).toBeVisible()
  await expect(page.getByTestId('property-row-priority')).toContainText('High')
  await expect(page.getByTestId('relationship-row-workflow-orchestration-essay')).toBeVisible()
}

async function longPress(page: PageLike, testId: string) {
  const target = page.getByTestId(testId)
  const box = await target.boundingBox()
  if (!box) throw new Error(`Cannot long-press missing target: ${testId}`)

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(360)
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
  await page.getByTestId('workspace-relationship-note-suggestion-open-source-project').click()
  await page.getByTestId('workspace-action-sheet-addRelationship').getByRole('button', { name: 'Add' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('relationship-row-how-i-run-an-open-source-project')).toBeVisible()
  await page.getByTestId('relationship-row-how-i-run-an-open-source-project-open').click()
  await expect(page.getByTestId('editor-title')).toHaveText('How I Run an Open Source Project')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft')
  await page.getByTestId('relationship-row-how-i-run-an-open-source-project').getByLabel('Remove').click()
  await expect(page.getByTestId('relationship-row-how-i-run-an-open-source-project')).toBeHidden()

  await page.getByTestId('property-action-add-relationship').click()
  await page.getByTestId('workspace-relationship-key-suggestion-related-to').click()
  await page.getByTestId('workspace-relationship-note-title-input').fill('Brand New Target')
  await expect(page.getByTestId('workspace-relationship-create-target')).toContainText('Brand New Target')
  await page.getByTestId('workspace-relationship-create-target').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('editor-title')).toHaveText('Brand New Target')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('relationship-row-brand-new-target')).toBeVisible()
  await page.getByTestId('relationship-row-brand-new-target-open').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Brand New Target')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft')
}

async function editMarkdownWithWikilink(page: PageLike) {
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-title-input')).toBeVisible()
  await page.getByTestId('editor-markdown-input').fill('# Mobile QA Draft Revised\n\nDraft body referencing [[open')
  await expect(page.getByTestId('editor-wikilink-suggestion-open-source-project')).toBeVisible()
  await page.getByTestId('editor-wikilink-suggestion-open-source-project').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue('# Mobile QA Draft Revised\n\nDraft body referencing [[Tolaria/Mobile UI/How I Run an Open Source Project]]')
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')
  await expect(page.getByTestId('editor-wikilink-tolaria-mobile-ui-how-i-run-an-open-source-project')).toBeVisible()
  await page.getByTestId('editor-wikilink-tolaria-mobile-ui-how-i-run-an-open-source-project').click()
  await expect(page.getByTestId('editor-title')).toHaveText('How I Run an Open Source Project')
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')
  await expect(page.getByText('Draft body referencing').first()).toBeVisible()
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
  await page.getByRole('button', { name: 'Mobile Inbox View' }).click()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeVisible()
  await page.getByTestId('note-row-mobile-qa-draft.md').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Mobile QA Draft Revised')

  await page.getByTestId('editor-more-action').click()
  await expect(page.getByText('Delete Note')).toBeVisible()
  await page.getByTestId('workspace-action-delete-note').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('note-row-mobile-qa-draft.md')).toBeHidden()
}

async function installRequiredLocalVaultSnapshot(page: PageLike): Promise<LocalVaultSnapshotState> {
  const state = await installLocalVaultSnapshot(page)
  test.skip(!state, `Local vault path is not readable: ${localVaultPath}`)
  if (!state) throw new Error(`Local vault path is not readable: ${localVaultPath}`)
  return state
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
  await expect(page.getByTestId('editor-title')).toHaveText(hiddenNote.title)
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

  const folderNavigationDurationMs = await measureDuration(async () => {
    await page.getByRole('button', { name: folder.name }).first().click()
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
