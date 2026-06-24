import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { FileText } from 'phosphor-react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type { MobileSidebarIcon, MobileTone } from '../../workspace/mobileWorkspaceModel'
import { mobilePhosphorIconElement } from './MobileWorkspaceIconResolver'
import { noteTypeColor, noteTypeSoftColor } from './mobileWorkspaceTone'

type MobileMetadataPickerProps = {
  selectedIcon: string
  selectedTone: string | null
  testIDPrefix: string
  onIconSelect: (icon: MobileSidebarIcon) => void
  onToneSelect: (tone: MobileTone) => void
}

const iconOptions: MobileSidebarIcon[] = [
  'view',
  'file',
  'folder',
  'procedure',
  'archive',
  'star',
  'tag',
  'inbox',
  'book-bookmark',
  'calendar-blank',
  'gear',
  'ticket',
]
const toneOptions: MobileTone[] = ['gray', 'green', 'purple', 'orange', 'blue', 'yellow', 'red']

export function MobileMetadataPicker({
  onIconSelect,
  onToneSelect,
  selectedIcon,
  selectedTone,
  testIDPrefix,
}: MobileMetadataPickerProps) {
  return (
    <View style={styles.picker} testID={`${testIDPrefix}-metadata-picker`}>
      <PickerGroup
        label={mobileText('customize.icon')}
        selectedLabel={selectedText('viewDialog.selectedIcon', selectedIcon || 'view')}
        testID={`${testIDPrefix}-selected-icon`}
      >
        <View style={styles.iconRow}>
          {iconOptions.map((icon) => (
            <IconOption
              icon={icon}
              key={icon}
              selected={selectedIcon === icon}
              testID={`${testIDPrefix}-icon-${icon}`}
              onPress={() => onIconSelect(icon)}
            />
          ))}
        </View>
      </PickerGroup>
      <PickerGroup
        label={mobileText('customize.color')}
        selectedLabel={selectedText('viewDialog.selectedColor', selectedTone ?? mobileText('inspector.properties.none'))}
        testID={`${testIDPrefix}-selected-color`}
      >
        <View style={styles.swatches}>
          {toneOptions.map((tone) => (
            <Pressable
              accessibilityLabel={tone}
              accessibilityRole="button"
              key={tone}
              style={[
                styles.swatch,
                {
                  backgroundColor: noteTypeSoftColor(tone),
                  borderColor: selectedTone === tone ? noteTypeColor(tone) : 'transparent',
                },
              ]}
              testID={`${testIDPrefix}-tone-${tone}`}
              onPress={() => onToneSelect(tone)}
            >
              <View style={[styles.swatchDot, { backgroundColor: noteTypeColor(tone) }]} />
            </Pressable>
          ))}
        </View>
      </PickerGroup>
    </View>
  )
}

function PickerGroup({
  children,
  label,
  selectedLabel,
  testID,
}: {
  children: ReactNode
  label: string
  selectedLabel: string
  testID: string
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.selectedLabel} testID={testID}>
          {selectedLabel}
        </Text>
      </View>
      {children}
    </View>
  )
}

function IconOption({
  icon,
  onPress,
  selected,
  testID,
}: {
  icon: MobileSidebarIcon
  onPress: () => void
  selected: boolean
  testID: string
}) {
  const color = selected ? mobileColors.primary : mobileColors.textMuted

  return (
    <Pressable
      accessibilityLabel={icon}
      accessibilityRole="button"
      style={[
        styles.iconButton,
        selected ? styles.iconButtonSelected : null,
      ]}
      testID={testID}
      onPress={onPress}
    >
      {mobilePhosphorIconElement(icon, { color, size: 16 }) ?? <FileText color={color} size={16} />}
    </Pressable>
  )
}

function selectedText(key: 'viewDialog.selectedColor' | 'viewDialog.selectedIcon', value: string) {
  return mobileText(key).replace(/\{(?:color|icon)\}/u, value)
}

const styles = StyleSheet.create({
  group: {
    gap: mobileSpace.xs,
  },
  groupHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: mobileColors.border,
    backgroundColor: mobileColors.card,
  },
  iconButtonSelected: {
    borderColor: mobileColors.primary,
    backgroundColor: mobileColors.primarySoft,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.sm,
  },
  label: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
  },
  picker: {
    gap: mobileSpace.md,
  },
  selectedLabel: {
    flexShrink: 1,
    color: mobileColors.textFaint,
    fontSize: mobileType.caption,
  },
  swatch: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.sm,
  },
})
