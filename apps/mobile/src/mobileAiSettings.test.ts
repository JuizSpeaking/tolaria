import { describe, expect, it } from 'vitest'
import {
  buildMobileAiProvider,
  normalizeMobileAiSettings,
  removeMobileAiProvider,
  selectedMobileAiProvider,
  upsertMobileAiProvider,
} from './mobileAiSettings'

describe('mobile AI settings', () => {
  it('builds API providers from presets without storing API keys', () => {
    expect(buildMobileAiProvider({
      draft: {
        apiKey: 'secret',
        kind: 'open_ai',
        modelId: ' gpt-4.1-mini ',
        name: '',
      },
      providerId: 'open-ai',
    })).toEqual({
      baseUrl: 'https://api.openai.com/v1',
      id: 'open-ai',
      kind: 'open_ai',
      modelId: 'gpt-4.1-mini',
      name: 'OpenAI',
    })
  })

  it('normalizes persisted settings and selected provider', () => {
    const settings = normalizeMobileAiSettings({
      defaultProviderId: 'open-ai',
      providers: [{
        baseUrl: 'https://api.openai.com/v1',
        id: 'open-ai',
        kind: 'open_ai',
        modelId: 'gpt-4.1-mini',
        name: 'OpenAI',
      }],
    })

    expect(selectedMobileAiProvider(settings)?.id).toBe('open-ai')
  })

  it('upserts and removes providers while maintaining the default target', () => {
    const settings = upsertMobileAiProvider({
      provider: provider('one'),
      settings: { defaultProviderId: null, providers: [] },
    })

    expect(settings.defaultProviderId).toBe('one')
    expect(removeMobileAiProvider({ providerId: 'one', settings })).toEqual({
      defaultProviderId: null,
      providers: [],
    })
  })
})

function provider(id: string) {
  return {
    baseUrl: 'https://api.openai.com/v1',
    id,
    kind: 'open_ai' as const,
    modelId: 'gpt-4.1-mini',
    name: 'OpenAI',
  }
}
