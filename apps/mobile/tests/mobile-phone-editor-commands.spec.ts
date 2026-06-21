import { expect, test, type Page } from '@playwright/test'
import { MOBILE_ATTACHMENT_IMPORTS_GLOBAL_KEY } from '../src/workspace/mobileAttachmentImport'

test.describe('phone editor command parity', () => {
  test('exercises phone source editor autocomplete and formatting commands', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-portrait', 'Phone editor command checks run on the phone editor shell.')

    await page.goto('/')
    await createPhonePersonNote(page)
    await createPhoneCommandDraft(page)
    await insertPhonePersonMention(page)
    await insertPhoneWikilink(page)
    await insertPhoneEmojiShortcode(page)
    await applyPhoneFormattingCommands(page)
    await assertRenderedPhoneMarkdown(page)
    await openPhoneTableOfContents(page)
  })
})

async function createPhonePersonNote(page: Page) {
  await createPhoneNote(page, 'Phone Person Target')
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-change-note-type').click()
  await page.getByTestId('workspace-change-type-input').fill('Person')
  await page.getByTestId('workspace-action-sheet-changeNoteType').getByRole('button', { name: 'Save' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await page.getByTestId('phone-back-action').click()
  await expect(page.getByTestId('phone-note-list-screen')).toBeVisible()
}

async function createPhoneCommandDraft(page: Page) {
  await createPhoneNote(page, 'Phone Editor Commands')
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-markdown-input')).toBeVisible()
  await expect(page.getByTestId('editor-formatting-toolbar')).toBeVisible()
}

async function createPhoneNote(page: Page, title: string) {
  await page.getByTestId('note-list-create-action').click()
  await page.getByTestId('workspace-create-note-title-input').fill(title)
  await page.getByTestId('workspace-action-sheet-createNote').getByRole('button', { exact: true, name: 'Create' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
  await page.getByTestId(`note-row-${noteRowSlug(title)}.md`).click()
  await expect(page.getByTestId('phone-editor-screen')).toBeVisible()
  await expectBodyOnlyPhoneNote(page, title)
}

async function insertPhonePersonMention(page: Page) {
  await page.getByTestId('editor-markdown-input').fill('# Phone Editor Commands\n\nFollow up with @pho')
  await expect(page.getByTestId('editor-person-mention-suggestions')).toBeVisible()
  await page.getByTestId('editor-person-mention-suggestion-phone-person-target-md').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue('# Phone Editor Commands\n\nFollow up with [[phone-person-target]] ')
}

async function insertPhoneWikilink(page: Page) {
  await page.getByTestId('editor-markdown-input').fill('# Phone Editor Commands\n\nReference [[open')
  await expect(page.getByTestId('editor-wikilink-suggestions')).toBeVisible()
  await page.getByTestId('editor-wikilink-suggestion-open-source-project').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue(
    '# Phone Editor Commands\n\nReference [[Tolaria/Mobile UI/How I Run an Open Source Project]]',
  )
}

async function insertPhoneEmojiShortcode(page: Page) {
  await page.getByTestId('editor-markdown-input').fill('# Phone Editor Commands\n\nShip :rock')
  await expect(page.getByTestId('editor-emoji-suggestions')).toBeVisible()
  await page.getByTestId('editor-emoji-suggestion-rocket').click()
  await expect(page.getByTestId('editor-markdown-input')).toHaveValue('# Phone Editor Commands\n\nShip 🚀')
}

async function applyPhoneFormattingCommands(page: Page) {
  const input = page.getByTestId('editor-markdown-input')

  await input.fill('# Phone Editor Commands\n\n')
  await page.getByTestId('editor-format-bold').click()
  await expect(input).toHaveValue(/\*\*bold text\*\*/u)

  await input.fill('# Phone Editor Commands\n\nSection title')
  await page.getByTestId('editor-format-heading-2').click()
  await expect(input).toHaveValue(/## Section title/u)

  await input.fill('# Phone Editor Commands\n\n')
  await page.getByTestId('editor-format-link').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-link').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\n[link text](https://)')

  await input.fill('# Phone Editor Commands\n\nPaste: ')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(() => navigator.clipboard.writeText('Plain\nClipboard'))
  await page.getByTestId('editor-format-paste-plain-text').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\nPaste: Plain\nClipboard')

  await input.fill('# Phone Editor Commands\n\nAttachment: ')
  await page.evaluate((key) => {
    const target = window as unknown as Record<string, unknown>
    target[key] = {
      mimeType: 'application/pdf',
      name: 'Project Brief.pdf',
      path: 'attachments/project brief.pdf',
    }
  }, MOBILE_ATTACHMENT_IMPORTS_GLOBAL_KEY)
  await page.getByTestId('editor-format-attachment').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-attachment').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\nAttachment: \n\n[Project Brief.pdf](<attachments/project brief.pdf>)')

  await input.fill('# Phone Editor Commands\n\nFollow up')
  await page.getByTestId('editor-format-task-list').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-task-list').click()
  await expect(input).toHaveValue(/- \[ \] Follow up/u)

  const listDraft = '# Phone Editor Commands\n\n- One\n- Two'
  await input.fill(listDraft)
  await page.getByTestId('editor-format-indent').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-indent').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\n- One\n  - Two')
  await page.getByTestId('editor-format-outdent').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-outdent').click()
  await expect(input).toHaveValue(listDraft)

  await input.fill('# Phone Editor Commands\n\n')
  await page.getByTestId('editor-format-table').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-table').click()
  await expect(input).toHaveValue(/\| Column \| Value \|/u)

  await input.fill('# Phone Editor Commands\n\n/table')
  await expect(page.getByTestId('editor-slash-command-suggestions')).toBeVisible()
  await page.getByTestId('editor-slash-command-suggestion-table').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\n| Column | Value |\n| --- | --- |\n| Item | Detail |')

  await input.fill('# Phone Editor Commands\n\n/h2')
  await expect(page.getByTestId('editor-slash-command-suggestions')).toBeVisible()
  await page.getByTestId('editor-slash-command-suggestion-heading2').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\n## ')

  await input.fill('# Phone Editor Commands\n\n')
  await page.getByTestId('editor-format-math-block').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-math-block').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\n$$\n\\sqrt{a^2 + b^2}\n$$')

  await input.fill('# Phone Editor Commands\n\n')
  await page.getByTestId('editor-format-mermaid').scrollIntoViewIfNeeded()
  await page.getByTestId('editor-format-mermaid').click()
  await expect(input).toHaveValue('# Phone Editor Commands\n\n```mermaid\nflowchart TD\n    edit["Switch to the raw editor to edit"]\n```')
}

async function assertRenderedPhoneMarkdown(page: Page) {
  await page.getByTestId('editor-markdown-input').fill([
    '# Phone Editor Commands',
    '',
    'Follow up with [[phone-person-target]] and [[Tolaria/Mobile UI/How I Run an Open Source Project]].',
    '',
    '## Section title',
    '',
    '- [ ] Follow up',
    '',
    '| Column | Value |',
    '| --- | --- |',
    '| Phone | Parity |',
  ].join('\n'))
  await page.getByTestId('editor-edit-action').click()
  await expect(page.getByTestId('editor-title')).toHaveText('Phone Editor Commands')
  await expect(page.getByTestId('editor-wikilink-phone-person-target')).toBeVisible()
  await expect(page.getByTestId('editor-wikilink-tolaria-mobile-ui-how-i-run-an-open-source-project')).toBeVisible()
  await expect(page.getByTestId('editor-heading-2')).toContainText('Section title')
  await expect(page.getByTestId('editor-task-row')).toBeVisible()
  await expect(page.getByTestId('editor-table')).toBeVisible()
}

async function openPhoneTableOfContents(page: Page) {
  await page.getByTestId('editor-more-action').click()
  await page.getByTestId('workspace-action-table-of-contents').click()
  await expect(page.getByTestId('table-of-contents-panel')).toBeVisible()
  await expect(page.getByTestId('table-of-contents-row-toc-title')).toContainText('Phone Editor Commands')
  await expect(page.getByTestId('table-of-contents-row-toc-heading-0')).toContainText('Section title')
  await page.getByTestId('workspace-action-sheet-toolbar').getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('workspace-action-sheet')).toBeHidden()
}

async function expectBodyOnlyPhoneNote(page: Page, title: string) {
  await expect(page.getByTestId('editor-toolbar-title')).toHaveText(title)
  await expect(page.getByTestId('editor-title')).toBeHidden()
}

function noteRowSlug(title: string) {
  return title.trim().toLowerCase().replace(/\s+/gu, '-')
}
