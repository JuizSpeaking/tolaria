import { describe, expect, it } from 'vitest'
import { createMobileAiSettingsStorage } from './mobileAiSettingsStorage'

describe('mobile AI settings storage', () => {
  it('loads default settings when no file exists and saves normalized settings', async () => {
    const files = new Map<string, string>()
    const storage = createMobileAiSettingsStorage({
      documentDirectory: 'file:///docs',
      getInfoAsync: async (uri) => ({ exists: files.has(uri) }),
      makeDirectoryAsync: async (uri) => {
        files.set(uri, '')
      },
      readAsStringAsync: async (uri) => files.get(uri) ?? '',
      writeAsStringAsync: async (uri, content) => {
        files.set(uri, content)
      },
    })

    expect(await storage.load()).toEqual({ defaultProviderId: null, providers: [] })

    await storage.save({
      defaultProviderId: 'provider',
      providers: [{
        baseUrl: 'https://api.openai.com/v1',
        id: 'provider',
        kind: 'open_ai',
        modelId: 'gpt-4.1-mini',
        name: 'OpenAI',
      }],
    })

    expect(await storage.load()).toMatchObject({ defaultProviderId: 'provider' })
  })
})
