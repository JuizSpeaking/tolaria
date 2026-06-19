import { expect, test } from '@playwright/test'

const mobileClipboardAttemptsGlobalKey = '__TOLARIA_MOBILE_CLIPBOARD_ATTEMPTS__'

test.describe('phone note utility actions', () => {
  test('opens a selected note neighborhood from the phone editor more sheet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone utility actions run on the phone editor shell.')

    await page.goto('/?scenario=markdown-heavy')
    await page.getByTestId('note-row-workflow-orchestration').click()
    await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
    await page.getByTestId('editor-more-action').click()
    await page.getByTestId('workspace-action-open-neighborhood').click()

    await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
    await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
    await expect(page.getByTestId('note-list-toolbar-title')).toHaveText('Workflow Orchestration Essay')
    await expect(page.getByTestId('relationship-group-referenced-by')).toBeVisible()
    await expect(page.getByTestId('note-row-markdown-heavy-renderer')).toBeVisible()
  })

  test('copies the selected note path from the phone editor more sheet', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone utility actions run on the phone editor shell.')

    await page.goto('/')
    await page.getByTestId('note-row-workflow-orchestration').click()
    await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
    await page.getByTestId('editor-more-action').click()
    await page.getByTestId('workspace-action-copy-file-path').click()

    await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
    await expect(page.evaluate((key) => {
      const attempts = (window as unknown as Record<string, unknown>)[key]
      return Array.isArray(attempts) ? attempts.at(-1) : null
    }, mobileClipboardAttemptsGlobalKey)).resolves.toBe(
      'Tolaria/Mobile UI/Workflow Orchestration Essay.md',
    )
  })
})
