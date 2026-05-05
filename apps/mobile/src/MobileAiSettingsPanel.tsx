import { CaretLeft, Trash } from 'phosphor-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  mobileAiProviderPresets,
  type MobileAiProvider,
  type MobileAiProviderDraft,
  type MobileAiProviderKind,
  type MobileAiSettings,
} from './mobileAiSettings'
import { styles } from './styles'
import { colors } from './theme'

const providerKinds: MobileAiProviderKind[] = ['open_ai', 'anthropic', 'gemini', 'open_router', 'open_ai_compatible']

export function MobileAiSettingsPanel({
  failed,
  isSaving,
  onAddProvider,
  onClose,
  onRemoveProvider,
  settings,
}: {
  failed: boolean
  isSaving: boolean
  onAddProvider: (draft: MobileAiProviderDraft) => Promise<boolean>
  onClose?: () => void
  onRemoveProvider: (providerId: string) => Promise<boolean>
  settings: MobileAiSettings
}) {
  return (
    <View style={styles.properties}>
      <SettingsToolbar onClose={onClose} />
      <ScrollView contentContainerStyle={styles.aiSettingsContent}>
        <Text style={styles.aiSettingsSectionTitle}>API models</Text>
        <Text style={styles.aiSettingsDescription}>API keys are saved locally on this device and are not written to vault settings.</Text>
        <ProviderList providers={settings.providers} onRemoveProvider={onRemoveProvider} />
        <ProviderDraftForm failed={failed} isSaving={isSaving} onAddProvider={onAddProvider} />
      </ScrollView>
    </View>
  )
}

function ProviderDraftForm({
  failed,
  isSaving,
  onAddProvider,
}: {
  failed: boolean
  isSaving: boolean
  onAddProvider: (draft: MobileAiProviderDraft) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<MobileAiProviderDraft>(() => initialDraft('open_ai'))
  const canSave = isProviderDraftReady(draft)
  const isDisabled = !canSave || isSaving
  const submitProvider = () => {
    if (isDisabled) return

    void onAddProvider(draft).then((saved) => {
      if (saved) {
        setDraft(initialDraft(draft.kind))
      }
    })
  }

  return (
    <>
      <ProviderKindPicker value={draft.kind} onChange={(kind) => setDraft(initialDraft(kind))} />
      <TextInput
        onChangeText={(modelId) => setDraft((current) => ({ ...current, modelId }))}
        placeholder={mobileAiProviderPresets[draft.kind].placeholder}
        placeholderTextColor={colors.mutedText}
        style={styles.aiInput}
        value={draft.modelId}
      />
      <TextInput
        onChangeText={(apiKey) => setDraft((current) => ({ ...current, apiKey }))}
        placeholder="API key"
        placeholderTextColor={colors.mutedText}
        secureTextEntry
        style={styles.aiInput}
        value={draft.apiKey}
      />
      <ProviderSaveError failed={failed} />
      <ProviderSaveButton disabled={isDisabled} isSaving={isSaving} onPress={submitProvider} />
    </>
  )
}

function ProviderSaveError({ failed }: { failed: boolean }) {
  return failed ? <Text style={styles.propertyError}>Could not save AI settings.</Text> : null
}

function ProviderSaveButton({
  disabled,
  isSaving,
  onPress,
}: {
  disabled: boolean
  isSaving: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.aiSettingsButton,
        disabled ? styles.composeButtonDisabled : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text style={styles.aiSettingsButtonText}>{isSaving ? 'Saving' : 'Add API model'}</Text>
    </Pressable>
  )
}

function isProviderDraftReady(draft: MobileAiProviderDraft) {
  return draft.modelId.trim().length > 0 && draft.apiKey.trim().length > 0
}

function SettingsToolbar({ onClose }: { onClose?: () => void }) {
  return (
    <View style={styles.toolbar}>
      <Text style={styles.propertiesTitle}>Settings</Text>
      <View style={styles.toolbarSpacer} />
      {onClose ? (
        <Pressable onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <CaretLeft size={23} color={colors.textSoft} />
        </Pressable>
      ) : null}
    </View>
  )
}

function ProviderList({
  onRemoveProvider,
  providers,
}: {
  onRemoveProvider: (providerId: string) => void
  providers: MobileAiProvider[]
}) {
  if (providers.length === 0) {
    return <Text style={styles.aiSettingsEmpty}>No API models configured.</Text>
  }

  return (
    <View style={styles.aiProviderList}>
      {providers.map((provider) => (
        <View key={provider.id} style={styles.aiProviderRow}>
          <View style={styles.aiProviderText}>
            <Text style={styles.aiProviderTitle}>{provider.name}</Text>
            <Text numberOfLines={1} style={styles.aiProviderDetail}>{provider.modelId}</Text>
          </View>
          <Pressable onPress={() => onRemoveProvider(provider.id)} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
            <Trash size={18} color={colors.textSoft} />
          </Pressable>
        </View>
      ))}
    </View>
  )
}

function ProviderKindPicker({
  onChange,
  value,
}: {
  onChange: (value: MobileAiProviderKind) => void
  value: MobileAiProviderKind
}) {
  return (
    <View style={styles.aiProviderKindRow}>
      {providerKinds.map((kind) => (
        <Pressable
          key={kind}
          onPress={() => onChange(kind)}
          style={({ pressed }) => [
            styles.aiProviderKindChip,
            value === kind ? styles.aiProviderKindChipSelected : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.aiProviderKindText, value === kind ? styles.aiProviderKindTextSelected : null]}>{mobileAiProviderPresets[kind].name}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function initialDraft(kind: MobileAiProviderKind): MobileAiProviderDraft {
  return {
    apiKey: '',
    kind,
    modelId: '',
    name: mobileAiProviderPresets[kind].name,
  }
}
