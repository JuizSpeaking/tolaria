import type { KeyboardTypeOptions } from 'react-native'
import { mobileText } from '../../i18n/mobileText'
import { MobileTextInput } from '../../ui/MobileTextInput'
import {
  mobilePropertySuggestionValue,
  type MobilePropertyValueKind,
} from '../../workspace/mobilePropertyValues'
import {
  MobileBooleanPropertyValuePicker,
  MobileColorPropertyValuePicker,
  MobilePropertyValueKindPicker,
  MobileStatusPropertyValuePicker,
} from './MobilePropertyValueKindPicker'
import { MobileWorkspaceSuggestionList } from './MobileWorkspaceSuggestionList'

type MobilePropertyValueEditorProps = {
  kind: MobilePropertyValueKind
  lockedListKind: boolean
  propertyName: string
  suggestions: string[]
  value: string
  onKindChange: (value: MobilePropertyValueKind) => void
  onValueChange: (value: string) => void
}

export function MobilePropertyValueEditor({
  kind,
  lockedListKind,
  onKindChange,
  onValueChange,
  propertyName,
  suggestions,
  value,
}: MobilePropertyValueEditorProps) {
  const inputConfig = propertyValueInputConfig(kind)

  return (
    <>
      <MobilePropertyValueKindPicker
        lockedListKind={lockedListKind}
        selectedKind={kind}
        onSelect={onKindChange}
      />
      <MobileTextInput
        autoCapitalize={inputConfig.autoCapitalize}
        keyboardType={inputConfig.keyboardType}
        label={inputConfig.label}
        placeholder={inputConfig.placeholder}
        testID="workspace-property-value-input"
        value={value}
        onChangeText={onValueChange}
      />
      <PropertyKindAccessory
        kind={kind}
        propertyName={propertyName}
        suggestions={suggestions}
        value={value}
        onValueChange={onValueChange}
      />
    </>
  )
}

function PropertyKindAccessory({
  kind,
  onValueChange,
  propertyName,
  suggestions,
  value,
}: Omit<MobilePropertyValueEditorProps, 'lockedListKind' | 'onKindChange'>) {
  if (kind === 'boolean') {
    return <MobileBooleanPropertyValuePicker value={value} onChange={onValueChange} />
  }

  if (kind === 'status') {
    return (
      <MobileStatusPropertyValuePicker
        options={suggestions}
        value={value}
        onChange={onValueChange}
      />
    )
  }

  if (kind === 'color') {
    return <MobileColorPropertyValuePicker value={value} onChange={onValueChange} />
  }

  return (
    <MobileWorkspaceSuggestionList
      labels={suggestions}
      testID="workspace-property-value-suggestions"
      testIDPrefix="workspace-property-value-suggestion"
      onSelect={(suggestion) => onValueChange(mobilePropertySuggestionValue({
        key: propertyName,
        kind,
        suggestion,
        valueText: value,
      }))}
    />
  )
}

function propertyValueInputConfig(kind: MobilePropertyValueKind): {
  autoCapitalize: 'none' | 'sentences'
  keyboardType: KeyboardTypeOptions
  label: string
  placeholder: string
} {
  if (kind === 'date') {
    return {
      autoCapitalize: 'none',
      keyboardType: 'numbers-and-punctuation',
      label: mobileText('inspector.properties.pickDate'),
      placeholder: 'YYYY-MM-DD',
    }
  }

  if (kind === 'number') {
    return {
      autoCapitalize: 'none',
      keyboardType: 'numeric',
      label: mobileText('inspector.properties.valuePlaceholder'),
      placeholder: mobileText('inspector.properties.valuePlaceholder'),
    }
  }

  if (kind === 'url') {
    return {
      autoCapitalize: 'none',
      keyboardType: 'url',
      label: mobileText('inspector.properties.valueKind.url'),
      placeholder: 'https://',
    }
  }

  if (kind === 'color') {
    return {
      autoCapitalize: 'none',
      keyboardType: 'default',
      label: mobileText('customize.color'),
      placeholder: '#RRGGBB',
    }
  }

  return {
    autoCapitalize: kind === 'status' ? 'sentences' : 'none',
    keyboardType: 'default',
    label: mobileText('inspector.properties.valuePlaceholder'),
    placeholder: mobileText('inspector.properties.valuePlaceholder'),
  }
}
