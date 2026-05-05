export type MobileAiProviderKind = 'anthropic' | 'gemini' | 'open_ai' | 'open_ai_compatible' | 'open_router'

export type MobileAiProvider = {
  baseUrl: string
  id: string
  kind: MobileAiProviderKind
  modelId: string
  name: string
}

export type MobileAiSettings = {
  defaultProviderId: string | null
  providers: MobileAiProvider[]
}

export type MobileAiProviderDraft = {
  apiKey: string
  kind: MobileAiProviderKind
  modelId: string
  name: string
}

export const defaultMobileAiSettings: MobileAiSettings = {
  defaultProviderId: null,
  providers: [],
}

export const mobileAiProviderPresets: Record<MobileAiProviderKind, { baseUrl: string; name: string; placeholder: string }> = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    name: 'Anthropic',
    placeholder: 'claude-3-5-sonnet-latest',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    name: 'Gemini',
    placeholder: 'gemini-2.5-flash',
  },
  open_ai: {
    baseUrl: 'https://api.openai.com/v1',
    name: 'OpenAI',
    placeholder: 'gpt-4.1-mini',
  },
  open_ai_compatible: {
    baseUrl: 'https://api.example.com/v1',
    name: 'Custom provider',
    placeholder: 'model-id',
  },
  open_router: {
    baseUrl: 'https://openrouter.ai/api/v1',
    name: 'OpenRouter',
    placeholder: 'openai/gpt-4.1-mini',
  },
}

export function buildMobileAiProvider({
  draft,
  providerId,
}: {
  draft: MobileAiProviderDraft
  providerId: string
}): MobileAiProvider {
  const preset = mobileAiProviderPresets[draft.kind]
  return {
    baseUrl: preset.baseUrl,
    id: providerId,
    kind: draft.kind,
    modelId: draft.modelId.trim(),
    name: draft.name.trim() || preset.name,
  }
}

export function normalizeMobileAiSettings(value: unknown): MobileAiSettings {
  if (!isSettingsRecord(value)) {
    return defaultMobileAiSettings
  }

  const providers = value.providers.flatMap(normalizeMobileAiProvider)
  return {
    defaultProviderId: defaultProviderId({ providers, value: value.defaultProviderId }),
    providers,
  }
}

export function selectedMobileAiProvider(settings: MobileAiSettings) {
  return settings.providers.find((provider) => provider.id === settings.defaultProviderId) ?? settings.providers[0] ?? null
}

export function upsertMobileAiProvider({
  provider,
  settings,
}: {
  provider: MobileAiProvider
  settings: MobileAiSettings
}): MobileAiSettings {
  const providers = [provider, ...settings.providers.filter((item) => item.id !== provider.id)]
  return { defaultProviderId: provider.id, providers }
}

export function removeMobileAiProvider({
  providerId,
  settings,
}: {
  providerId: string
  settings: MobileAiSettings
}): MobileAiSettings {
  const providers = settings.providers.filter((provider) => provider.id !== providerId)
  return {
    defaultProviderId: settings.defaultProviderId === providerId ? providers[0]?.id ?? null : settings.defaultProviderId,
    providers,
  }
}

function defaultProviderId({
  providers,
  value,
}: {
  providers: MobileAiProvider[]
  value: unknown
}) {
  return typeof value === 'string' && providers.some((provider) => provider.id === value)
    ? value
    : providers[0]?.id ?? null
}

function normalizeMobileAiProvider(value: unknown): MobileAiProvider[] {
  if (!isProviderRecord(value)) {
    return []
  }

  return [{
    baseUrl: value.baseUrl.trim(),
    id: value.id.trim(),
    kind: value.kind,
    modelId: value.modelId.trim(),
    name: value.name.trim(),
  }]
}

function isSettingsRecord(value: unknown): value is { defaultProviderId?: unknown; providers: unknown[] } {
  return typeof value === 'object'
    && value !== null
    && Array.isArray((value as { providers?: unknown }).providers)
}

function isProviderRecord(value: unknown): value is MobileAiProvider {
  return typeof value === 'object'
    && value !== null
    && hasText((value as MobileAiProvider).baseUrl)
    && hasText((value as MobileAiProvider).id)
    && isProviderKind((value as MobileAiProvider).kind)
    && hasText((value as MobileAiProvider).modelId)
    && hasText((value as MobileAiProvider).name)
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isProviderKind(value: unknown): value is MobileAiProviderKind {
  return value === 'anthropic'
    || value === 'gemini'
    || value === 'open_ai'
    || value === 'open_ai_compatible'
    || value === 'open_router'
}
