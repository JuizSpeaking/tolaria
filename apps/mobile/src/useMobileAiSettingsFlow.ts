import { useCallback, useEffect, useState } from 'react'
import { sendMobileAiRequest } from './mobileAiClient'
import type { MobileNote } from './mobileNoteProjection'
import type { MobileAiProviderSecretStorage } from './mobileAiProviderSecretStorage'
import {
  buildMobileAiProvider,
  defaultMobileAiSettings,
  removeMobileAiProvider,
  selectedMobileAiProvider,
  upsertMobileAiProvider,
  type MobileAiProvider,
  type MobileAiProviderDraft,
  type MobileAiSettings,
} from './mobileAiSettings'
import type { MobileAiSettingsStorage } from './mobileAiSettingsStorage'

export function useMobileAiSettingsFlow({
  secretStorage,
  settingsStorage,
}: {
  secretStorage: MobileAiProviderSecretStorage
  settingsStorage: MobileAiSettingsStorage
}) {
  const [failed, setFailed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<MobileAiSettings>(defaultMobileAiSettings)

  useEffect(() => {
    void settingsStorage.load().then(setSettings).catch(() => setFailed(true))
  }, [settingsStorage])

  const addProvider = useCallback((draft: MobileAiProviderDraft) => {
    const provider = buildMobileAiProvider({ draft, providerId: `${draft.kind}-${Date.now().toString(36)}` })
    return saveSettings({
      nextSettings: upsertMobileAiProvider({ provider, settings }),
      secret: { apiKey: draft.apiKey, providerId: provider.id },
      secretStorage,
      setFailed,
      setIsSaving,
      setSettings,
      settingsStorage,
    })
  }, [secretStorage, settings, settingsStorage])

  const removeProvider = useCallback((providerId: string) => {
    return saveSettings({
      nextSettings: removeMobileAiProvider({ providerId, settings }),
      removeSecretProviderId: providerId,
      secretStorage,
      setFailed,
      setIsSaving,
      setSettings,
      settingsStorage,
    })
  }, [secretStorage, settings, settingsStorage])

  const sendPrompt = useCallback(async ({
    note,
    prompt,
    provider,
  }: {
    note: MobileNote
    prompt: string
    provider: MobileAiProvider
  }) => {
    const apiKey = await secretStorage.loadApiKey(provider.id)
    if (!apiKey) {
      throw new Error('Missing API key')
    }

    return sendMobileAiRequest({ apiKey, note, prompt, provider })
  }, [secretStorage])

  return {
    addProvider,
    failed,
    isSaving,
    removeProvider,
    selectedProvider: selectedMobileAiProvider(settings),
    sendPrompt,
    settings,
  }
}

async function saveSettings({
  nextSettings,
  removeSecretProviderId,
  secret,
  secretStorage,
  setFailed,
  setIsSaving,
  setSettings,
  settingsStorage,
}: {
  nextSettings: MobileAiSettings
  removeSecretProviderId?: string
  secret?: { apiKey: string; providerId: string }
  secretStorage: MobileAiProviderSecretStorage
  setFailed: (failed: boolean) => void
  setIsSaving: (isSaving: boolean) => void
  setSettings: (settings: MobileAiSettings) => void
  settingsStorage: MobileAiSettingsStorage
}): Promise<boolean> {
  setFailed(false)
  setIsSaving(true)
  try {
    if (secret) {
      await secretStorage.saveApiKey(secret.providerId, secret.apiKey)
    }
    if (removeSecretProviderId) {
      await secretStorage.removeApiKey(removeSecretProviderId)
    }
    await settingsStorage.save(nextSettings)
    setSettings(nextSettings)
    return true
  } catch {
    setFailed(true)
    return false
  } finally {
    setIsSaving(false)
  }
}
