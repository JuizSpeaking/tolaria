import * as FileSystem from 'expo-file-system/legacy'
import { createMobileAiSettingsStorage } from './mobileAiSettingsStorage'

export function createNativeMobileAiSettingsStorage() {
  return createMobileAiSettingsStorage(FileSystem)
}
