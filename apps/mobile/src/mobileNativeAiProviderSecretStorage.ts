import * as SecureStore from 'expo-secure-store'
import { createMobileAiProviderSecretStorage } from './mobileAiProviderSecretStorage'

export function createNativeMobileAiProviderSecretStorage() {
  return createMobileAiProviderSecretStorage(SecureStore)
}
