import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendMobileAiRequest } from './mobileAiClient'
import type { MobileNote } from './mobileNoteProjection'

describe('mobile AI client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends an OpenAI-compatible chat completion request with note context', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ choices: [{ message: { content: 'Answer' } }] }),
      ok: true,
    } as Response)

    await expect(sendMobileAiRequest({
      apiKey: 'key',
      note: note(),
      prompt: 'Summarize',
      provider: {
        baseUrl: 'https://api.example.com/v1/',
        id: 'provider',
        kind: 'open_ai_compatible',
        modelId: 'model',
        name: 'Provider',
      },
    })).resolves.toBe('Answer')

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/v1/chat/completions', expect.objectContaining({
      method: 'POST',
    }))
  })
})

function note(): MobileNote {
  return {
    archived: false,
    backlinks: [],
    belongsTo: [],
    content: '# Workflow\n\nBody',
    customProperties: {},
    date: '',
    favorite: false,
    favoriteIndex: null,
    has: [],
    icon: 'file-text',
    id: 'workflow',
    modified: '',
    outgoingLinks: [],
    relatedTo: [],
    relationships: {},
    snippet: '',
    tags: [],
    title: 'Workflow',
    type: 'Note',
    words: 1,
  }
}
