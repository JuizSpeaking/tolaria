import { describe, expect, it } from 'vitest'
import {
  mobileMarkdownBodyToTentapHtml,
  tiptapJsonToMobileMarkdown,
  type TiptapJsonNode,
} from './mobileDocumentContent'

describe('mobile document list continuations', () => {
  it('hydrates list items with continuation lines as structured list item paragraphs', () => {
    const html = mobileMarkdownBodyToTentapHtml('- Provide instructions\n  Teach your AI agent the workflow context\n- Run workflow\n')

    expect(html).toBe(
      '<ul><li><p>Provide instructions</p><p>Teach your AI agent the workflow context</p></li><li><p>Run workflow</p></li></ul>',
    )
  })

  it('keeps list items with indented images editable as source', () => {
    const html = mobileMarkdownBodyToTentapHtml('- Internet access\n  ![](https://example.com/search.png)\n')

    expect(html).toBe('<p>- Internet access<br>  ![](https://example.com/search.png)</p>')
    expect(html).not.toContain('<img')
  })

  it('serializes structured list item paragraphs as desktop markdown continuations after native saves', () => {
    const document: TiptapJsonNode = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                paragraphNode('Provide instructions'),
                paragraphNode('Teach your AI agent the workflow context'),
              ],
            },
            {
              type: 'listItem',
              content: [paragraphNode('Run workflow')],
            },
          ],
        },
      ],
    }

    expect(tiptapJsonToMobileMarkdown(document)).toBe(
      '- Provide instructions\n  Teach your AI agent the workflow context\n- Run workflow',
    )
  })
})

function paragraphNode(...lines: string[]): TiptapJsonNode {
  return {
    type: 'paragraph',
    content: lines.flatMap((line, index): TiptapJsonNode[] => [
      ...(index > 0 ? [{ type: 'hardBreak' }] : []),
      ...(line ? [{ text: line, type: 'text' }] : []),
    ]),
  }
}
