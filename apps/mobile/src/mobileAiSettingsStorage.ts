import { defaultMobileAiSettings, normalizeMobileAiSettings, type MobileAiSettings } from './mobileAiSettings'

export type MobileAiSettingsFileInfo = {
  exists: boolean
  isDirectory?: boolean
}

export type MobileAiSettingsFileSystem = {
  documentDirectory: string | null
  getInfoAsync: (uri: string) => Promise<MobileAiSettingsFileInfo>
  makeDirectoryAsync: (uri: string, options: { intermediates: true }) => Promise<void>
  readAsStringAsync: (uri: string) => Promise<string>
  writeAsStringAsync: (uri: string, content: string) => Promise<void>
}

export type MobileAiSettingsStorage = {
  load: () => Promise<MobileAiSettings>
  save: (settings: MobileAiSettings) => Promise<void>
}

export function createMobileAiSettingsStorage(
  fileSystem: MobileAiSettingsFileSystem,
): MobileAiSettingsStorage {
  return {
    load: async () => loadMobileAiSettings(fileSystem),
    save: async (settings) => saveMobileAiSettings({ fileSystem, settings }),
  }
}

async function loadMobileAiSettings(fileSystem: MobileAiSettingsFileSystem) {
  const fileUri = settingsFileUri(fileSystem)
  const info = await fileSystem.getInfoAsync(fileUri)
  if (!info.exists || info.isDirectory) {
    return defaultMobileAiSettings
  }

  return parseMobileAiSettings(await fileSystem.readAsStringAsync(fileUri))
}

async function saveMobileAiSettings({
  fileSystem,
  settings,
}: {
  fileSystem: MobileAiSettingsFileSystem
  settings: MobileAiSettings
}) {
  await ensureDirectory({ fileSystem, uri: settingsRootUri(fileSystem) })
  await fileSystem.writeAsStringAsync(settingsFileUri(fileSystem), JSON.stringify(settings))
}

function parseMobileAiSettings(content: string) {
  try {
    return normalizeMobileAiSettings(JSON.parse(content))
  } catch {
    return defaultMobileAiSettings
  }
}

async function ensureDirectory({
  fileSystem,
  uri,
}: {
  fileSystem: MobileAiSettingsFileSystem
  uri: string
}) {
  const info = await fileSystem.getInfoAsync(uri)
  if (!info.exists) {
    await fileSystem.makeDirectoryAsync(uri, { intermediates: true })
  }
}

function settingsFileUri(fileSystem: MobileAiSettingsFileSystem) {
  return `${settingsRootUri(fileSystem)}/ai-settings.json`
}

function settingsRootUri(fileSystem: MobileAiSettingsFileSystem) {
  if (!fileSystem.documentDirectory) {
    throw new Error('Expo FileSystem documentDirectory is unavailable')
  }

  return `${fileSystem.documentDirectory.replace(/\/+$/, '')}/state`
}
