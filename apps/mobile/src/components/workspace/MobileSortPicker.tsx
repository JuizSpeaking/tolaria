import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { MobileTextInput } from '../../ui/MobileTextInput'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import { MobileWorkspaceSuggestionList } from './MobileWorkspaceSuggestionList'
import {
  mobileCustomPropertySortValue,
  mobileCustomSortFromValue,
  mobileSortFieldMatches,
  type MobileSortDirection,
} from './MobileSortPickerModel'

const mobileSortOptions = [
  { label: `${mobileText('noteList.sort.modified')} ${mobileText('noteList.sort.descending')}`, value: 'modified:desc' },
  { label: `${mobileText('noteList.sort.modified')} ${mobileText('noteList.sort.ascending')}`, value: 'modified:asc' },
  { label: `${mobileText('noteList.sort.created')} ${mobileText('noteList.sort.descending')}`, value: 'created:desc' },
  { label: `${mobileText('noteList.sort.created')} ${mobileText('noteList.sort.ascending')}`, value: 'created:asc' },
  { label: `${mobileText('noteList.sort.title')} ${mobileText('noteList.sort.ascending')}`, value: 'title:asc' },
  { label: `${mobileText('noteList.sort.title')} ${mobileText('noteList.sort.descending')}`, value: 'title:desc' },
  { label: `${mobileText('noteList.sort.status')} ${mobileText('noteList.sort.ascending')}`, value: 'status:asc' },
  { label: `${mobileText('noteList.sort.status')} ${mobileText('noteList.sort.descending')}`, value: 'status:desc' },
]

export function MobileSortPicker({
  customPropertyOptions = [],
  selectedSort,
  testID = 'workspace-sort-picker',
  testIDPrefix = 'workspace-sort',
  onSelect,
}: {
  customPropertyOptions?: string[]
  selectedSort: string
  testID?: string
  testIDPrefix?: string
  onSelect: (value: string) => void
}) {
  const customSort = mobileCustomSortFromValue(selectedSort)
  const [customField, setCustomField] = useState(customSort.field)
  const customDirection = customSort.direction ?? 'asc'
  const customSuggestions = useMemo(() => {
    return customPropertyOptions
      .filter((property) => mobileSortFieldMatches(property, customField))
      .slice(0, 6)
  }, [customField, customPropertyOptions])

  const selectCustomSort = (field: string, direction: MobileSortDirection = customDirection) => {
    const trimmedField = field.trim()
    if (!trimmedField) return
    setCustomField(trimmedField)
    onSelect(mobileCustomPropertySortValue(trimmedField, direction))
  }

  return (
    <View style={styles.section} testID={testID}>
      <Text style={styles.label}>{sortLabel()}</Text>
      {mobileSortOptions.map((option) => (
        <SortRow
          key={option.value}
          label={option.label}
          selected={selectedSort === option.value}
          testIDPrefix={testIDPrefix}
          value={option.value}
          onSelect={onSelect}
        />
      ))}
      <View style={styles.customSort} testID={`${testIDPrefix}-custom-property`}>
        <MobileTextInput
          label={mobileText('viewDialog.filter.fieldLabel')}
          placeholder={mobileText('viewDialog.filter.fieldLabel')}
          testID={`${testIDPrefix}-custom-field-input`}
          value={customField}
          onChangeText={setCustomField}
        />
        <MobileWorkspaceSuggestionList
          labels={customSuggestions}
          testID={`${testIDPrefix}-custom-field-suggestions`}
          testIDPrefix={`${testIDPrefix}-custom-field-suggestion`}
          onSelect={(field) => selectCustomSort(field)}
        />
        <View style={styles.customDirectionRow}>
          <CustomDirectionButton
            disabled={customField.trim().length === 0}
            label={mobileText('noteList.sort.ascending')}
            selected={selectedSort === mobileCustomPropertySortValue(customField, 'asc')}
            testID={`${testIDPrefix}-custom-asc`}
            onPress={() => selectCustomSort(customField, 'asc')}
          />
          <CustomDirectionButton
            disabled={customField.trim().length === 0}
            label={mobileText('noteList.sort.descending')}
            selected={selectedSort === mobileCustomPropertySortValue(customField, 'desc')}
            testID={`${testIDPrefix}-custom-desc`}
            onPress={() => selectCustomSort(customField, 'desc')}
          />
        </View>
      </View>
    </View>
  )
}

function SortRow({
  label,
  onSelect,
  selected,
  testIDPrefix,
  value,
}: {
  label: string
  selected: boolean
  testIDPrefix: string
  value: string
  onSelect: (value: string) => void
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.sortRow,
        selected ? styles.sortRowSelected : null,
        pressed ? styles.pressed : null,
      ]}
      testID={`${testIDPrefix}-${value.replace(/[^a-z0-9]+/gu, '-')}`}
      onPress={() => onSelect(value)}
    >
      <Text style={[styles.rowText, selected ? styles.selectedText : null]}>{label}</Text>
    </Pressable>
  )
}

function CustomDirectionButton({
  disabled,
  label,
  onPress,
  selected,
  testID,
}: {
  disabled: boolean
  label: string
  onPress: () => void
  selected: boolean
  testID: string
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.directionButton,
        selected ? styles.sortRowSelected : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
      testID={testID}
      onPress={onPress}
    >
      <Text style={[styles.rowText, selected ? styles.selectedText : null, disabled ? styles.disabledText : null]}>
        {label}
      </Text>
    </Pressable>
  )
}

function sortLabel() {
  return mobileText('noteList.sort.menu').replace(/\s*\{label\}/u, '').trim()
}

const styles = StyleSheet.create({
  customDirectionRow: {
    flexDirection: 'row',
    gap: mobileSpace.xs,
  },
  customSort: {
    gap: mobileSpace.xs,
    paddingTop: mobileSpace.xs,
  },
  directionButton: {
    minHeight: 30,
    flex: 1,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: mobileSpace.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    color: mobileColors.textMuted,
  },
  label: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
  },
  pressed: {
    backgroundColor: mobileColors.graySoft,
  },
  rowText: {
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
  },
  section: {
    gap: mobileSpace.xs,
  },
  selectedText: {
    color: mobileColors.primary,
    fontWeight: '600',
  },
  sortRow: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: mobileSpace.sm,
  },
  sortRowSelected: {
    backgroundColor: mobileColors.primarySoft,
  },
})
