import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { join } from 'node:path'

// Issue #935: blank lines between paragraphs disappear in the non-source
// view after a full app restart. Root cause: the editor theme applies
// `margin-bottom: var(--editor-paragraph-spacing)` to paragraph blocks, but
// the variable is referenced without ever being defined — so the property
// becomes invalid and falls back to its initial value (0). Consecutive
// paragraphs then render with no vertical spacing.

function readCss(filename: string): string {
  return readFileSync(join(process.cwd(), 'src', filename), 'utf8')
}

describe('Issue #935 — paragraph spacing CSS variable', () => {
  it('paragraph block rule uses a defined spacing variable', () => {
    const theme = readCss('components/EditorTheme.css')

    expect(
      theme,
      'EditorTheme.css applies margin-bottom via var(--editor-paragraph-spacing). The variable must be defined somewhere in the stylesheet bundle so the rule resolves to a non-zero value; otherwise the declaration falls back to margin-bottom: 0 and consecutive paragraphs render with no gap.',
    ).toMatch(/margin-bottom:\s*var\(--editor-paragraph-spacing\)/)
  })

  it('--editor-paragraph-spacing is defined to a non-zero length value', () => {
    // The theme references this variable. If it resolves to 0 the entire
    // paragraph-spacing rule is null and void. The fix is to define it.
    const css = readCss('index.css') + '\n' + readCss('components/EditorTheme.css')
    const definition = css.match(/--editor-paragraph-spacing\s*:\s*([^;]+);/i)
    expect(definition, '--editor-paragraph-spacing must be defined in CSS').not.toBeNull()
    const value = definition?.[1].trim() ?? ''
    expect(value).not.toBe('0')
    expect(value).not.toBe('0px')
    expect(value).toMatch(/\d/)
  })
})
