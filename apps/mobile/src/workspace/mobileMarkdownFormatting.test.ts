import { describe, expect, it } from 'vitest'
import { applyMobileMarkdownFormat, insertMobileMarkdownPlainText } from './mobileMarkdownFormatting'

describe('mobile markdown formatting', () => {
  it('wraps selected inline text and collapses after the inserted marker', () => {
    expect(applyMobileMarkdownFormat('Make this important', { start: 5, end: 9 }, 'bold')).toEqual({
      selection: { start: 13, end: 13 },
      text: 'Make **this** important',
    })
  })

  it('inserts placeholder inline formatting when no text is selected', () => {
    expect(applyMobileMarkdownFormat('Write ', { start: 6, end: 6 }, 'italic')).toEqual({
      selection: { start: 7, end: 18 },
      text: 'Write *italic text*',
    })
  })

  it('matches desktop durable highlight and strikethrough markdown', () => {
    expect(applyMobileMarkdownFormat('Make this visible', { start: 5, end: 9 }, 'highlight')).toEqual({
      selection: { start: 13, end: 13 },
      text: 'Make ==this== visible',
    })
    expect(applyMobileMarkdownFormat('Remove this later', { start: 7, end: 11 }, 'strike')).toEqual({
      selection: { start: 15, end: 15 },
      text: 'Remove ~~this~~ later',
    })
  })

  it('feeds the existing wikilink autocomplete when no text is selected', () => {
    expect(applyMobileMarkdownFormat('See ', { start: 4, end: 4 }, 'wikilink')).toEqual({
      selection: { start: 6, end: 6 },
      text: 'See [[',
    })
  })

  it('wraps selected wikilink text into desktop markdown syntax', () => {
    expect(applyMobileMarkdownFormat('See Project Alpha', { start: 4, end: 17 }, 'wikilink')).toEqual({
      selection: { start: 21, end: 21 },
      text: 'See [[Project Alpha]]',
    })
  })

  it.each([
    ['heading1', '# Old heading\nBody', 13],
    ['heading2', '## Old heading\nBody', 14],
    ['heading3', '### Old heading\nBody', 15],
    ['heading4', '#### Old heading\nBody', 16],
    ['heading5', '##### Old heading\nBody', 17],
    ['heading6', '###### Old heading\nBody', 18],
  ] as const)('normalizes selected lines with the %s command', (action, text, cursor) => {
    expect(applyMobileMarkdownFormat('# Old heading\nBody', { start: 2, end: 2 }, action)).toEqual({
      selection: { start: cursor, end: cursor },
      text,
    })
  })

  it.each([
    ['bulletList', '- One\n- Two', 11],
    ['quote', '> One\n> Two', 11],
    ['orderedList', '1. One\n2. Two', 13],
    ['taskList', '- [ ] One\n- [ ] Two', 19],
  ] as const)('formats selected lines with the %s command', (action, text, cursor) => {
    expect(applyMobileMarkdownFormat('One\nTwo', { start: 0, end: 7 }, action)).toEqual({
      selection: { start: cursor, end: cursor },
      text,
    })
  })

  it('inserts code blocks and dividers as separated markdown blocks', () => {
    expect(applyMobileMarkdownFormat('Intro', { start: 5, end: 5 }, 'codeBlock')).toEqual({
      selection: { start: 15, end: 19 },
      text: 'Intro\n\n```text\ncode\n```',
    })
    expect(applyMobileMarkdownFormat('Intro', { start: 5, end: 5 }, 'divider')).toEqual({
      selection: { start: 10, end: 10 },
      text: 'Intro\n\n---',
    })
  })

  it('inserts markdown tables as separated blocks and selects the first header cell', () => {
    expect(applyMobileMarkdownFormat('Intro', { start: 5, end: 5 }, 'table')).toEqual({
      selection: { start: 9, end: 15 },
      text: 'Intro\n\n| Column | Value |\n| --- | --- |\n| Item | Detail |',
    })
  })

  it('inserts desktop-compatible math and Mermaid source blocks', () => {
    expect(applyMobileMarkdownFormat('Intro', { start: 5, end: 5 }, 'mathBlock')).toEqual({
      selection: { start: 10, end: 26 },
      text: 'Intro\n\n$$\n\\sqrt{a^2 + b^2}\n$$',
    })
    expect(applyMobileMarkdownFormat('Intro', { start: 5, end: 5 }, 'mermaid')).toEqual({
      selection: { start: 18, end: 75 },
      text: 'Intro\n\n```mermaid\nflowchart TD\n    edit["Switch to the raw editor to edit"]\n```',
    })
  })

  it('inserts desktop-compatible whiteboard source blocks without wrapping selected text', () => {
    const result = applyMobileMarkdownFormat('Intro\nselected', { start: 6, end: 14 }, 'whiteboard')

    expect(result.selection).toEqual({ start: result.text.length, end: result.text.length })
    expect(result.text).toMatch(/^Intro\n\n```tldraw id="[^"]+" height="520"\n\{\}\n```$/u)
  })

  it('inserts clipboard text exactly at the current source selection', () => {
    expect(insertMobileMarkdownPlainText({
      selection: { start: 7, end: 11 },
      text: 'Before rich text',
      value: 'Plain\nText',
    })).toEqual({
      selection: { start: 17, end: 17 },
      text: 'Before Plain\nText text',
    })
  })
})
