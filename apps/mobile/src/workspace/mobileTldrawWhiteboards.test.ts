import { describe, expect, it } from 'vitest'
import {
  mobileTldrawFenceSource,
  readMobileTldrawWhiteboards,
  updateMobileTldrawWhiteboard,
} from './mobileTldrawWhiteboards'

describe('mobile tldraw whiteboards', () => {
  it('reads desktop durable tldraw fences with dimensions and snapshots', () => {
    const boards = readMobileTldrawWhiteboards({ markdown: [
      '# Planning',
      '',
      '```tldraw id="map" height="640" width="900"',
      '{ "store": { "shape": true } }',
      '```',
      '',
      'Done',
    ].join('\n') })

    expect(boards).toEqual([{
      boardId: 'map',
      endLine: 4,
      height: '640',
      key: 'map',
      metadataSuffix: '',
      snapshot: '{ "store": { "shape": true } }',
      startLine: 2,
      width: '900',
    }])
  })

  it('updates one whiteboard without rewriting the rest of the note', () => {
    const content = [
      '---',
      'type: Essay',
      '---',
      '# Planning',
      '',
      '```tldraw id="map" height="640"',
      '{}',
      '```',
      '',
      'Tail',
    ].join('\n')

    const result = updateMobileTldrawWhiteboard({
      markdown: content,
      update: {
        height: '720',
        key: 'map',
        snapshot: '{ "document": { "shape": true } }',
        width: '980',
      },
    })

    expect(result.updated).toBe(true)
    expect(result.markdown).toBe([
      '---',
      'type: Essay',
      '---',
      '# Planning',
      '',
      '```tldraw id="map" height="720" width="980"',
      '{ "document": { "shape": true } }',
      '```',
      '',
      'Tail',
    ].join('\n'))
  })

  it('preserves extra desktop tldraw fence metadata when editing dimensions and snapshot', () => {
    const content = [
      '# Planning',
      '',
      '```tldraw id="map" height="640" width="900" compact="true" data-owner="desktop"',
      '{}',
      '```',
    ].join('\n')

    const [board] = readMobileTldrawWhiteboards({ markdown: content })
    expect(board?.metadataSuffix).toBe('compact="true" data-owner="desktop"')

    const result = updateMobileTldrawWhiteboard({
      markdown: content,
      update: {
        height: '720',
        key: 'map',
        snapshot: '{ "document": true }',
      },
    })

    expect(result.updated).toBe(true)
    expect(result.markdown).toBe([
      '# Planning',
      '',
      '```tldraw id="map" height="720" width="900" compact="true" data-owner="desktop"',
      '{ "document": true }',
      '```',
    ].join('\n'))
  })

  it('uses a longer fence when the snapshot contains backticks', () => {
    expect(mobileTldrawFenceSource({
      boardId: 'quoted',
      height: '520',
      metadataSuffix: 'compact="true"',
      snapshot: '{ "text": "```" }',
      width: '',
    })).toBe([
      '````tldraw id="quoted" height="520" compact="true"',
      '{ "text": "```" }',
      '````',
    ].join('\n'))
  })

  it('leaves content unchanged when the target board is missing', () => {
    const content = '# No board\n'

    expect(updateMobileTldrawWhiteboard({
      markdown: content,
      update: {
        key: 'missing',
        snapshot: '{}',
      },
    })).toEqual({ markdown: content, updated: false })
  })
})
