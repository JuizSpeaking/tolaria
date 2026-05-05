import { CaretLeft, GearSix, PaperPlaneTilt, Robot } from 'phosphor-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type { MobileNote } from './mobileNoteProjection'
import type { MobileAiProvider } from './mobileAiSettings'
import { styles } from './styles'
import { colors } from './theme'

export function MobileAiPanel({
  note,
  onClose,
  onOpenSettings,
  onSendPrompt,
  provider,
}: {
  note: MobileNote
  onClose?: () => void
  onOpenSettings: () => void
  onSendPrompt: (prompt: string, provider: MobileAiProvider) => Promise<string>
  provider: MobileAiProvider | null
}) {
  const [failed, setFailed] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')

  const sendPrompt = () => {
    if (!provider || prompt.trim().length === 0) return

    setFailed(false)
    setIsSending(true)
    void onSendPrompt(prompt, provider)
      .then(setResponse)
      .catch(() => setFailed(true))
      .finally(() => setIsSending(false))
  }

  return (
    <View style={styles.properties}>
      <AiToolbar onClose={onClose} onOpenSettings={onOpenSettings} />
      {provider ? (
        <AiChatSurface
          failed={failed}
          isSending={isSending}
          note={note}
          onChangePrompt={setPrompt}
          onSend={sendPrompt}
          prompt={prompt}
          provider={provider}
          response={response}
        />
      ) : (
        <AiEmptyState onOpenSettings={onOpenSettings} />
      )}
    </View>
  )
}

function AiToolbar({
  onClose,
  onOpenSettings,
}: {
  onClose?: () => void
  onOpenSettings: () => void
}) {
  return (
    <View style={styles.toolbar}>
      <Text style={styles.propertiesTitle}>AI</Text>
      <View style={styles.toolbarSpacer} />
      <Pressable onPress={onOpenSettings} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
        <GearSix size={23} color={colors.textSoft} />
      </Pressable>
      {onClose ? (
        <Pressable onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <CaretLeft size={23} color={colors.textSoft} />
        </Pressable>
      ) : null}
    </View>
  )
}

function AiEmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <View style={styles.aiEmptyState}>
      <Robot color={colors.iconMuted} size={26} />
      <Text style={styles.aiEmptyTitle}>No API model configured</Text>
      <Text style={styles.aiEmptyDescription}>Add an API model in Settings before using the AI panel.</Text>
      <Pressable onPress={onOpenSettings} style={({ pressed }) => [styles.aiSettingsButton, pressed ? styles.pressed : null]}>
        <GearSix color="#ffffff" size={17} />
        <Text style={styles.aiSettingsButtonText}>Open Settings</Text>
      </Pressable>
    </View>
  )
}

function AiChatSurface({
  failed,
  isSending,
  note,
  onChangePrompt,
  onSend,
  prompt,
  provider,
  response,
}: {
  failed: boolean
  isSending: boolean
  note: MobileNote
  onChangePrompt: (value: string) => void
  onSend: () => void
  prompt: string
  provider: MobileAiProvider
  response: string
}) {
  const canSend = prompt.trim().length > 0 && !isSending

  return (
    <ScrollView contentContainerStyle={styles.aiContent}>
      <View style={styles.aiContextCard}>
        <Text style={styles.aiContextTitle}>{provider.name} · {provider.modelId}</Text>
        <Text numberOfLines={2} style={styles.aiContextDetail}>{note.title}</Text>
      </View>
      {response ? <Text style={styles.aiResponse}>{response}</Text> : <Text style={styles.aiEmptyDescription}>Ask about the active note. API models run in chat mode only.</Text>}
      {failed ? <Text style={styles.propertyError}>AI request failed.</Text> : null}
      <TextInput
        multiline
        onChangeText={onChangePrompt}
        placeholder={`Ask about ${note.title}`}
        placeholderTextColor={colors.mutedText}
        style={styles.aiPrompt}
        textAlignVertical="top"
        value={prompt}
      />
      <Pressable
        disabled={!canSend}
        onPress={onSend}
        style={({ pressed }) => [
          styles.aiSendButton,
          !canSend ? styles.composeButtonDisabled : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <PaperPlaneTilt color="#ffffff" size={18} weight="fill" />
        <Text style={styles.aiSendButtonText}>{isSending ? 'Sending' : 'Send'}</Text>
      </Pressable>
    </ScrollView>
  )
}
