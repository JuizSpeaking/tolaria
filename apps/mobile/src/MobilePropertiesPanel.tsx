import { CaretLeft, Plus, X } from 'phosphor-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type { MobileNote } from './demoData'
import { MobileEditablePropertyPickers } from './MobileEditablePropertyPickers'
import type { MobileNotePropertyPatch } from './mobileNoteProperties'
import { nextMobilePropertyPicker, type MobilePropertyPickerKey } from './mobilePropertyPicker'
import {
  canonicalMobileRelationshipRef,
  filterMobileRelationshipRef,
  hasMobileRelationshipRef,
  mobileRelationshipDisplayLabel,
  resolveMobileRelationshipNote,
  uniqueMobileRelationshipRefs,
} from './mobileRelationshipRefs'
import { mobileNoteSuggestions } from './mobileWikilinkAutocomplete'
import { mobileRelationshipAppearance } from './mobileTypeAppearance'
import { styles } from './styles'
import { colors } from './theme'

export function MobilePropertiesPanel({
  failed = false,
  isSaving = false,
  notes = [],
  note,
  onChangeProperties,
  onClose,
  onOpenNote,
}: {
  failed?: boolean
  isSaving?: boolean
  notes?: MobileNote[]
  note: MobileNote
  onChangeProperties?: (patch: MobileNotePropertyPatch) => void
  onClose?: () => void
  onOpenNote?: (noteId: string) => void
}) {
  const [openPicker, setOpenPicker] = useState<MobilePropertyPickerKey | null>(null)
  const selectPicker = (selected: MobilePropertyPickerKey) => {
    setOpenPicker((current) => nextMobilePropertyPicker({ current, selected }))
  }

  return (
    <View style={styles.properties}>
      <PanelToolbar onClose={onClose} />
      <ScrollView contentContainerStyle={styles.propertiesContent}>
        {failed ? <Text style={styles.propertyError}>Could not save property.</Text> : null}
        <MobileEditablePropertyPickers
          disabled={isSaving}
          note={note}
          openPicker={openPicker}
          onChangeProperties={onChangeProperties}
          onSelectPicker={selectPicker}
        />
        <RelationshipGroup
          label="Belongs to"
          notes={notes}
          targets={note.belongsTo}
          onChangeTargets={(belongsTo) => onChangeProperties?.({ belongsTo })}
          onOpenNote={onOpenNote}
        />
        <RelationshipGroup
          label="Related to"
          notes={notes}
          targets={[...note.relatedTo, ...note.outgoingLinks]}
          writableTargets={note.relatedTo}
          onChangeTargets={(relatedTo) => onChangeProperties?.({ relatedTo })}
          onOpenNote={onOpenNote}
        />
        <RelationshipGroup
          label="Has"
          notes={notes}
          targets={note.has}
          onChangeTargets={(has) => onChangeProperties?.({ has })}
          onOpenNote={onOpenNote}
        />
        {Object.entries(note.relationships).map(([key, targets]) => (
          <RelationshipGroup
            key={key}
            label={formatRelationshipLabel(key)}
            notes={notes}
            targets={targets}
            onChangeTargets={(nextTargets) => onChangeProperties?.({
              relationships: { ...note.relationships, [key]: nextTargets },
              removedRelationshipKeys: nextTargets.length === 0 ? [key] : undefined,
            })}
            onOpenNote={onOpenNote}
          />
        ))}
        <AddRelationshipGroup
          note={note}
          onAdd={(key) => onChangeProperties?.({ relationships: { ...note.relationships, [key]: [] } })}
        />
        <CustomProperties note={note} onChangeProperties={onChangeProperties} />
        <BacklinkGroup backlinks={note.backlinks} onOpenNote={onOpenNote} />
        <PropertyRow label="Words" value={String(note.words)} />
        <PropertyRow label="Modified" value={note.modified} />
        <Text style={styles.propertyGroupTitle}>History</Text>
        <Text style={styles.historyItem}>eb373865c - Updated 1 note</Text>
        <Text style={styles.historyItem}>5e853fdfe - Updated 1 note</Text>
      </ScrollView>
    </View>
  )
}

function RelationshipGroup({
  label,
  notes,
  onChangeTargets,
  onOpenNote,
  targets,
  writableTargets = targets,
}: {
  label: string
  notes: MobileNote[]
  onChangeTargets?: (targets: string[]) => void
  onOpenNote?: (noteId: string) => void
  targets: string[]
  writableTargets?: string[]
}) {
  const [query, setQuery] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const uniqueTargets = uniqueMobileRelationshipRefs(targets)
  const suggestions = isAdding ? mobileNoteSuggestions({ notes, query }) : []
  const addTarget = (value: string) => {
    const target = canonicalMobileRelationshipRef({ notes, value })
    if (!target) return

    onChangeTargets?.(uniqueMobileRelationshipRefs([...writableTargets, target]))
    setQuery('')
    setIsAdding(false)
  }

  return (
    <View style={styles.relationshipGroup}>
      <RelationshipHeader canAdd={Boolean(onChangeTargets)} label={label} onAdd={() => setIsAdding(true)} />
      <View style={styles.relationshipChipRow}>
        {uniqueTargets.map((target) => (
          <RelationshipChip
            key={target}
            note={resolveMobileRelationshipNote({ notes, target })}
            onRemove={hasMobileRelationshipRef({ target, values: writableTargets }) && onChangeTargets
              ? () => onChangeTargets(filterMobileRelationshipRef({ target, values: writableTargets }))
              : undefined}
            target={target}
            onOpenNote={onOpenNote}
          />
        ))}
      </View>
      {isAdding ? <RelationshipAddBox onAddTarget={addTarget} onChangeQuery={setQuery} query={query} suggestions={suggestions} /> : null}
    </View>
  )
}

function RelationshipHeader({
  canAdd,
  label,
  onAdd,
}: {
  canAdd: boolean
  label: string
  onAdd: () => void
}) {
  return (
    <View style={styles.relationshipHeader}>
      <Text style={styles.propertyGroupTitle}>{label}</Text>
      {canAdd ? (
        <Pressable onPress={onAdd} style={({ pressed }) => [styles.relationshipAddButton, pressed ? styles.pressed : null]}>
          <Plus color={colors.textSoft} size={14} />
        </Pressable>
      ) : null}
    </View>
  )
}

function RelationshipAddBox({
  onAddTarget,
  onChangeQuery,
  query,
  suggestions,
}: {
  onAddTarget: (target: string) => void
  onChangeQuery: (query: string) => void
  query: string
  suggestions: MobileNote[]
}) {
  return (
    <View style={styles.relationshipAddBox}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeQuery}
        onSubmitEditing={() => {
          if (query.trim().length > 0) {
            onAddTarget(query.trim())
          }
        }}
        placeholder="Add note"
        placeholderTextColor={colors.mutedText}
        style={styles.relationshipInput}
        value={query}
      />
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.id}
          onPress={() => onAddTarget(suggestion.title)}
          style={({ pressed }) => [styles.relationshipSuggestion, pressed ? styles.pressed : null]}
        >
          <Text style={styles.relationshipSuggestionText}>{suggestion.title}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function AddRelationshipGroup({
  note,
  onAdd,
}: {
  note: MobileNote
  onAdd: (key: string) => void
}) {
  const [name, setName] = useState('')

  return (
    <View style={styles.relationshipGroup}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setName}
        onSubmitEditing={() => {
          const key = relationshipKeyFromLabel(name)
          if (key && !note.relationships[key]) {
            onAdd(key)
            setName('')
          }
        }}
        placeholder="+ Add relationship"
        placeholderTextColor={colors.mutedText}
        style={styles.relationshipInput}
        value={name}
      />
    </View>
  )
}

function CustomProperties({
  note,
  onChangeProperties,
}: {
  note: MobileNote
  onChangeProperties?: (patch: MobileNotePropertyPatch) => void
}) {
  const [draftKey, setDraftKey] = useState('')
  const [draftValue, setDraftValue] = useState('')
  const entries = Object.entries(note.customProperties)

  return (
    <View style={styles.relationshipGroup}>
      <Text style={styles.propertyGroupTitle}>Custom properties</Text>
      {entries.map(([key, value]) => (
        <View key={key} style={styles.customPropertyRow}>
          <Text style={styles.customPropertyKey}>{formatRelationshipLabel(key)}</Text>
          <TextInput
            onChangeText={(nextValue) => onChangeProperties?.({ customProperties: { ...note.customProperties, [key]: nextValue } })}
            style={styles.customPropertyValue}
            value={value}
          />
          <Pressable
            onPress={() => {
              const rest = customPropertiesWithoutKey({ key, properties: note.customProperties })
              onChangeProperties?.({ customProperties: rest, removedCustomPropertyKeys: [key] })
            }}
            style={({ pressed }) => [styles.relationshipRemoveButton, pressed ? styles.pressed : null]}
          >
            <X color={colors.mutedText} size={13} />
          </Pressable>
        </View>
      ))}
      <View style={styles.customPropertyAddRow}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setDraftKey}
          placeholder="Property"
          placeholderTextColor={colors.mutedText}
          style={styles.customPropertyAddInput}
          value={draftKey}
        />
        <TextInput
          onChangeText={setDraftValue}
          onSubmitEditing={() => {
            const key = relationshipKeyFromLabel(draftKey)
            if (key && draftValue.trim().length > 0) {
              onChangeProperties?.({ customProperties: { ...note.customProperties, [key]: draftValue.trim() } })
              setDraftKey('')
              setDraftValue('')
            }
          }}
          placeholder="Value"
          placeholderTextColor={colors.mutedText}
          style={styles.customPropertyAddInput}
          value={draftValue}
        />
      </View>
    </View>
  )
}

function BacklinkGroup({
  backlinks,
  onOpenNote,
}: {
  backlinks: MobileNote['backlinks']
  onOpenNote?: (noteId: string) => void
}) {
  if (backlinks.length === 0) {
    return null
  }

  return (
    <View style={styles.relationshipGroup}>
      <Text style={styles.propertyGroupTitle}>Linked from</Text>
      <View style={styles.relationshipChipRow}>
        {backlinks.map((backlink) => (
          <RelationshipChip
            key={backlink.id}
            note={backlink}
            target={backlink.title}
            onOpenNote={onOpenNote}
          />
        ))}
      </View>
    </View>
  )
}

function RelationshipChip({
  note,
  onOpenNote,
  onRemove,
  target,
}: {
  note?: { id: string; title: string; type?: string }
  onOpenNote?: (noteId: string) => void
  onRemove?: () => void
  target: string
}) {
  const appearance = mobileRelationshipAppearance(note?.type)
  const chip = <Text style={styles.relationshipChipText}>{note?.title ?? mobileRelationshipDisplayLabel(target)}</Text>

  const content = (
    <>
      {chip}
      {onRemove ? (
        <Pressable onPress={onRemove} style={styles.relationshipRemoveButton}>
          <X color={appearance.color} size={12} />
        </Pressable>
      ) : null}
    </>
  )

  return note && onOpenNote ? (
    <Pressable
      onPress={() => onOpenNote(note.id)}
      style={({ pressed }) => [
        styles.relationshipChip,
        { backgroundColor: appearance.backgroundColor, borderColor: appearance.borderColor },
        pressed ? styles.pressed : null,
      ]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={[styles.relationshipChip, { backgroundColor: appearance.backgroundColor, borderColor: appearance.borderColor }]}>{content}</View>
  )
}

function formatRelationshipLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function relationshipKeyFromLabel(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function customPropertiesWithoutKey({
  key,
  properties,
}: {
  key: string
  properties: Record<string, string>
}) {
  return Object.fromEntries(Object.entries(properties).filter(([candidate]) => candidate !== key))
}

function PanelToolbar({ onClose }: { onClose?: () => void }) {
  return (
    <View style={styles.toolbar}>
      <Text style={styles.propertiesTitle}>Properties</Text>
      <View style={styles.toolbarSpacer} />
      {onClose ? (
        <Pressable onPress={onClose} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <CaretLeft size={23} color={colors.textSoft} />
        </Pressable>
      ) : null}
    </View>
  )
}

function PropertyRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={styles.propertyRow}>
      <Text style={styles.propertyLabel}>{label}</Text>
      <Text style={styles.propertyValue}>{value}</Text>
    </View>
  )
}
