import { describe, expect, it } from 'vitest'
import { createMobileAiProviderSecretStorage } from './mobileAiProviderSecretStorage'

describe('mobile AI provider secret storage', () => {
  it('stores API keys in secure provider-scoped records', async () => {
    const secrets = new Map<string, string>()
    const storage = createMobileAiProviderSecretStorage({
      deleteItemAsync: async (key) => {
        secrets.delete(key)
      },
      getItemAsync: async (key) => secrets.get(key) ?? null,
      setItemAsync: async (key, value) => {
        secrets.set(key, value)
      },
    })

    await storage.saveApiKey('Open-AI', 'secret')

    expect(await storage.loadApiKey('open-ai')).toBe('secret')

    await storage.removeApiKey('open-ai')

    expect(await storage.loadApiKey('open-ai')).toBeNull()
  })
})
