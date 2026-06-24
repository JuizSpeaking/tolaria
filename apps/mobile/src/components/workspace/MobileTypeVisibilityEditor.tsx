import { useMemo } from 'react'
import { CheckCircle } from 'phosphor-react-native'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type { MobileTypeDefinitions } from '../../workspace/mobileWorkspaceModel'
import { MobileTypeIcon } from './MobileWorkspaceIcons'

type MobileTypeVisibilityEditorProps = {
  typeDefinitions?: MobileTypeDefinitions
  onToggleTypeVisibility: (typeName: string) => void
}

export function MobileTypeVisibilityEditor({
  onToggleTypeVisibility,
  typeDefinitions,
}: MobileTypeVisibilityEditorProps) {
  const typeEntries = useMemo(() => sortedTypeDefinitionEntries(typeDefinitions), [typeDefinitions])

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.visibilitySection} testID="workspace-type-visibility-list">
        {typeEntries.length === 0 ? <EmptyTypeVisibilityState /> : null}
        {typeEntries.map(([typeName, definition]) => {
          const visible = definition.visible !== false
          const tone = definition.tone ?? 'gray'
          const label = typeVisibilityLabel(typeName, definition)

          return (
            <Pressable
              accessibilityLabel={toggleTypeVisibilityLabel(label)}
              accessibilityRole="switch"
              accessibilityState={{ checked: visible }}
              aria-checked={visible}
              key={typeName}
              style={({ pressed }) => [styles.visibilityRow, pressed ? styles.visibilityRowPressed : null]}
              testID={`workspace-type-visibility-${slugifyTypeVisibilityId(typeName)}`}
              onPress={() => onToggleTypeVisibility(typeName)}
            >
              <MobileTypeIcon
                size={15}
                tone={tone}
                type={typeName}
                typeDefinitions={typeDefinitions}
              />
              <View style={styles.visibilityText}>
                <Text numberOfLines={1} style={styles.visibilityLabel}>{label}</Text>
                <Text style={styles.visibilityDescription}>{mobileText('sidebar.section.showInSidebar')}</Text>
              </View>
              <CheckCircle color={visible ? mobileColors.primary : mobileColors.textFaint} size={16} weight={visible ? 'fill' : 'regular'} />
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}

function EmptyTypeVisibilityState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{mobileText('command.noMatches')}</Text>
    </View>
  )
}

function sortedTypeDefinitionEntries(typeDefinitions: MobileTypeDefinitions | undefined) {
  return Object.entries(typeDefinitions ?? {}).sort(compareTypeDefinitionEntries)
}

function compareTypeDefinitionEntries(
  left: [string, MobileTypeDefinitions[string]],
  right: [string, MobileTypeDefinitions[string]],
) {
  const orderResult = compareOptionalOrder(left[1].order, right[1].order)
  if (orderResult !== 0) return orderResult

  return typeVisibilityLabel(left[0], left[1]).localeCompare(typeVisibilityLabel(right[0], right[1]))
}

function compareOptionalOrder(left: number | null | undefined, right: number | null | undefined) {
  const leftOrder = left ?? Infinity
  const rightOrder = right ?? Infinity
  if (leftOrder === rightOrder) return 0
  return leftOrder < rightOrder ? -1 : 1
}

function typeVisibilityLabel(typeName: string, definition: MobileTypeDefinitions[string]) {
  return definition.label ?? pluralizedTypeLabel(typeName)
}

function pluralizedTypeLabel(typeName: string) {
  const cleanType = typeName.trim()
  if (cleanType.endsWith('s')) return cleanType
  if (cleanType.endsWith('y')) return `${cleanType.slice(0, -1)}ies`
  return `${cleanType}s`
}

function toggleTypeVisibilityLabel(label: string) {
  return mobileText('sidebar.section.toggle').replace('{label}', label)
}

function slugifyTypeVisibilityId(typeName: string) {
  return typeName.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/g, '') || 'type'
}

const styles = StyleSheet.create({
  content: {
    gap: mobileSpace.md,
    padding: mobileSpace.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  emptyText: {
    color: mobileColors.textMuted,
    fontSize: mobileType.body,
  },
  visibilityDescription: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
    lineHeight: 16,
  },
  visibilityLabel: {
    color: mobileColors.text,
    fontSize: mobileType.body,
    fontWeight: '500',
  },
  visibilityRow: {
    alignItems: 'flex-start',
    borderRadius: 6,
    flexDirection: 'row',
    gap: mobileSpace.sm,
    padding: mobileSpace.sm,
  },
  visibilityRowPressed: {
    backgroundColor: mobileColors.control,
  },
  visibilitySection: {
    borderColor: mobileColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: mobileSpace.xs,
    paddingTop: mobileSpace.md,
  },
  visibilityText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
})
