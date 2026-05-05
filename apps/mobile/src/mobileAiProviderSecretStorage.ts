export type MobileAiProviderSecretStore = {
  deleteItemAsync: (key: string) => Promise<void>
  getItemAsync: (key: string) => Promise<string | null>
  setItemAsync: (key: string, value: string) => Promise<void>
}

export type MobileAiProviderSecretStorage = {
  loadApiKey: (providerId: string) => Promise<string | null>
  removeApiKey: (providerId: string) => Promise<void>
  saveApiKey: (providerId: string, apiKey: string) => Promise<void>
}

export function createMobileAiProviderSecretStorage(
  secureStore: MobileAiProviderSecretStore,
): MobileAiProviderSecretStorage {
  return {
    loadApiKey: async (providerId) => secureStore.getItemAsync(providerKey(providerId)),
    removeApiKey: async (providerId) => {
      await secureStore.deleteItemAsync(providerKey(providerId))
    },
    saveApiKey: async (providerId, apiKey) => {
      await secureStore.setItemAsync(providerKey(providerId), apiKey)
    },
  }
}

function providerKey(providerId: string) {
  return ['tolaria', 'ai-provider', providerId.trim().toLowerCase(), 'api-key'].join(':')
}
