import { expect, test, type Page } from '@playwright/test'
import { longPressTestId } from './mobile-phone-test-gestures'

test.describe('phone workspace editing parity', () => {
  test('exercises saved-view and type-section editing flows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone saved-view and type-section checks run on the phone layout.')

    await page.goto('/')
    await createEditAndDeletePhoneSavedView(page)
    await customizePhoneTypeSectionAndCreateTemplateNote(page)
  })

  test('exercises relationship suggestion and target creation flows', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone relationship checks run on the phone properties surface.')

    await createPhoneSourceNoteProperties(page, 'Phone Relationship Source')
    await addSuggestedPhoneRelationship(page)

    await createPhoneSourceNoteProperties(page, 'Phone Target Source')
    await createPhoneRelationshipTarget(page)
  })
})

async function createEditAndDeletePhoneSavedView(page: Page) {
  await openPhoneSidebar(page)
  await page.getByTestId('sidebar-section-create-views').click()
  await expect(page.getByTestId('workspace-create-view-name-input')).toBeVisible()
  await page.getByTestId('workspace-view-filter-remove-0').click()
  await page.getByTestId('workspace-create-view-name-input').fill('Phone Inbox View')
  await page.getByTestId('workspace-action-sheet-createView').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await openPhoneSidebar(page)
  await expect(page.getByTestId('sidebar-item-view-phone-inbox-view')).toContainText('Phone Inbox View')

  await longPressTestId(page, 'sidebar-item-view-phone-inbox-view')
  await expect(page.getByTestId('workspace-edit-view-name-input')).toHaveValue('Phone Inbox View')
  await page.getByTestId('workspace-edit-view-name-input').fill('Phone Active Work')
  await page.getByTestId('workspace-view-icon-star').click()
  await page.getByTestId('workspace-view-tone-green').click()
  await page.getByTestId('workspace-action-sheet-editView').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await openPhoneSidebar(page)
  await expect(page.getByTestId('sidebar-item-view-phone-inbox-view')).toContainText('Phone Active Work')

  await page.getByTestId('sidebar-item-view-phone-inbox-view').click()
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Phone Active Work')

  await openPhoneSidebar(page)
  await longPressTestId(page, 'sidebar-item-view-phone-inbox-view')
  await page.getByTestId('workspace-delete-view-action').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('sidebar-item-view-phone-inbox-view')).toBeHidden()
}

async function customizePhoneTypeSectionAndCreateTemplateNote(page: Page) {
  await openPhoneSidebar(page)
  await longPressTestId(page, 'sidebar-item-procedures')
  const sheet = page.getByTestId('workspace-action-sheet-editTypeSection')
  await expect(sheet).toBeVisible()
  await page.getByTestId('workspace-type-section-label-input').fill('Phone Runbooks')
  await page.getByTestId('workspace-type-icon-folder').click()
  await page.getByTestId('workspace-type-tone-green').click()
  await expect(page.getByTestId('workspace-type-selected-icon')).toContainText('folder')
  await expect(page.getByTestId('workspace-type-selected-color')).toContainText('green')
  await page.getByTestId('workspace-type-sort-custom-field-input').fill('Priority')
  await page.getByTestId('workspace-type-sort-custom-desc').click()
  await page.getByTestId('workspace-type-template-input').fill('## Phone Runbook\n\nPhone type template body.')
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
  await expect(page.getByTestId('sidebar-item-procedures')).toContainText('Phone Runbooks')
  const procedureSectionTestId = await hideAndRestorePhoneTypeSection(page)

  await longPressTestId(page, procedureSectionTestId)
  await expect(page.getByTestId('workspace-type-selected-icon')).toContainText('folder')
  await expect(page.getByTestId('workspace-type-selected-color')).toContainText('green')
  await expect(page.getByTestId('workspace-type-sort-custom-field-input')).toHaveValue('Priority')
  await page.getByTestId('workspace-action-sheet-toolbar').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()

  await page.getByTestId(procedureSectionTestId).click()
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Phone Runbooks')
  await expect(page.getByTestId('note-row-open-source-project').getByText('Project Board')).toBeVisible()
  await page.getByTestId('note-list-create-action').click()
  await page.getByTestId('workspace-create-note-title-input').fill('Phone Runbook From Type')
  await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('note-row-phone-runbook-from-type.md')).toBeVisible()
  await page.getByTestId('note-row-phone-runbook-from-type.md').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expect(page.getByTestId('editor-heading-2')).toContainText('Phone Runbook')
  await expect(page.getByTestId('editor-paragraph')).toContainText('Phone type template body.')
  await page.getByTestId('phone-properties-action').click()
  await expect(page.getByTestId('property-row-priority')).toContainText('High')
  await expect(page.getByTestId('relationship-row-workflow-orchestration-essay')).toBeVisible()
}

async function hideAndRestorePhoneTypeSection(page: Page) {
  await page.getByTestId('sidebar-section-visibility-types').click()
  const sheet = page.getByTestId('workspace-action-sheet-editTypeVisibility')
  const visibilityRow = page.getByTestId('workspace-type-visibility-procedure')
  await expect(sheet).toBeVisible()
  await expect(visibilityRow).toHaveAttribute('aria-checked', 'true')

  await visibilityRow.click()
  await expect(visibilityRow).not.toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: 'Phone Runbooks' })).toBeHidden()

  await visibilityRow.click()
  await expect(visibilityRow).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: 'Phone Runbooks' })).toBeVisible()
  await page.getByTestId('workspace-action-sheet-toolbar').getByRole('button', { name: 'Cancel' }).click()
  await expect(sheet).toBeHidden()
  return 'sidebar-item-type-procedure'
}

async function addSuggestedPhoneRelationship(page: Page) {
  await expect(page.getByTestId('phone-properties-screen')).toBeVisible()
  await page.getByTestId('property-action-add-relationship').click()
  await page.getByTestId('workspace-relationship-key-suggestion-related-to').click()
  await expect(page.getByTestId('workspace-relationship-name-input')).toHaveValue('related_to')
  await page.getByTestId('workspace-relationship-note-title-input').fill('Open Source')
  await expect(page.getByTestId('workspace-relationship-note-suggestion-open-source-project')).toBeVisible()
  await expect(page.getByTestId('workspace-relationship-create-target')).toContainText('Open Source')
  await page.getByTestId('workspace-relationship-note-suggestion-open-source-project').click()
  await page.getByTestId('workspace-action-sheet-addRelationship').getByRole('button', { name: 'Add' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('relationship-row-how-i-run-an-open-source-project')).toBeVisible()

  await page.getByTestId('relationship-row-how-i-run-an-open-source-project-open').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expect(page.getByTestId('editor-title')).toHaveText('How I Run an Open Source Project')
}

async function createPhoneSourceNoteProperties(page: Page, title: string) {
  await page.goto('/')
  await page.getByTestId('note-list-create-action').click()
  await page.getByTestId('workspace-create-note-title-input').fill(title)
  await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await page.getByTestId(`note-row-${noteRowSlug(title)}.md`).click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expectBodyOnlyPhoneNote(page, title)
  await page.getByTestId('phone-properties-action').click()
  await expect(page.getByTestId('phone-properties-screen')).toBeVisible()
}

async function createPhoneRelationshipTarget(page: Page) {
  await expect(page.getByTestId('phone-properties-screen')).toBeVisible()
  await page.getByTestId('property-action-add-relationship').click()
  await page.getByTestId('workspace-relationship-key-suggestion-related-to').click()
  await page.getByTestId('workspace-relationship-note-title-input').fill('Brand New Phone Target')
  await expect(page.getByTestId('workspace-relationship-create-target')).toContainText('Brand New Phone Target')
  await page.getByTestId('workspace-relationship-create-target').click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expectBodyOnlyPhoneNote(page, 'Brand New Phone Target')

  await page.getByTestId('phone-back-action').click()
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
  await page.getByTestId('note-row-phone-target-source.md').click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expectBodyOnlyPhoneNote(page, 'Phone Target Source')
  await page.getByTestId('phone-properties-action').click()
  await expect(page.getByTestId('relationship-row-brand-new-phone-target')).toBeVisible()
}

async function expectBodyOnlyPhoneNote(page: Page, title: string) {
  await expect(page.getByTestId('editor-toolbar-title')).toHaveText(title)
  await expect(page.getByTestId('editor-title')).toBeHidden()
}

function noteRowSlug(title: string) {
  return title.trim().toLowerCase().replace(/\s+/gu, '-')
}

async function openPhoneSidebar(page: Page) {
  if (await page.getByTestId('phone-sidebar-screen').isVisible()) return

  await page.getByTestId('phone-sidebar-action').click()
  await expect(page.getByTestId('phone-sidebar-screen')).toBeVisible()
}
