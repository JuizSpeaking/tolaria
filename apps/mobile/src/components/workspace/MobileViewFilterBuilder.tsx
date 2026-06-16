import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Plus, X } from 'phosphor-react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { MobileButton } from '../../ui/MobileButton'
import { MobileTextInput } from '../../ui/MobileTextInput'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type {
  MobileNote,
  MobileViewFilterCondition,
  MobileViewFilterGroup,
  MobileViewFilterNode,
  MobileViewFilterOp,
} from '../../workspace/mobileWorkspaceModel'
import {
  mobileViewFieldSuggestions,
  mobileViewValueSuggestionItems,
} from '../../workspace/mobileWorkspaceSuggestions'
import { MobileWorkspaceSuggestionList } from './MobileWorkspaceSuggestionList'

type FilterPath = string
type FilterMode = 'all' | 'any'
type FilterChange = (group: MobileViewFilterGroup) => void
type ConditionChange = (condition: MobileViewFilterCondition) => void

const emptyPath = 'root'
const defaultField = 'type'
const noValueOps = new Set<MobileViewFilterOp>(['is_empty', 'is_not_empty'])
const regexOps = new Set<MobileViewFilterOp>(['contains', 'equals', 'not_contains', 'not_equals'])
const operators: MobileViewFilterOp[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'is_empty',
  'is_not_empty',
  'before',
  'after',
]

export function MobileViewFilterBuilder({
  group,
  notes,
  onChange,
}: {
  group: MobileViewFilterGroup
  notes: MobileNote[]
  onChange: FilterChange
}) {
  return (
    <View style={styles.builder} testID="workspace-view-filter-builder">
      <Text style={styles.label}>{mobileText('viewDialog.filtersLabel')}</Text>
      <FilterGroupEditor
        group={group}
        notes={notes}
        path=""
        onChange={onChange}
      />
    </View>
  )
}

function FilterGroupEditor({
  group,
  notes,
  onChange,
  onRemove,
  path,
}: {
  group: MobileViewFilterGroup
  notes: MobileNote[]
  onChange: FilterChange
  onRemove?: () => void
  path: FilterPath
}) {
  const mode = groupMode(group)
  const nodes = groupNodes(group)

  return (
    <View style={[styles.group, path ? styles.nestedGroup : null]} testID={`workspace-view-filter-group-${testPath(path)}`}>
      <GroupHeader mode={mode} onRemove={onRemove} onToggleMode={() => onChange(groupWithNodes(nextMode(mode), nodes))} />
      <View style={styles.nodeList}>
        {nodes.map((node, index) => (
          <FilterNodeEditor
            key={`${testPath(path)}-${index}`}
            node={node}
            notes={notes}
            path={childPath(path, index)}
            onChange={(nextNode) => onChange(updateNode(group, index, nextNode))}
            onRemove={() => onChange(removeNode(group, index))}
          />
        ))}
      </View>
      <GroupActions
        onAddCondition={() => onChange(addNode(group, defaultCondition(notes)))}
        onAddGroup={() => onChange(addNode(group, { all: [defaultCondition(notes)] }))}
      />
    </View>
  )
}

function GroupHeader({
  mode,
  onRemove,
  onToggleMode,
}: {
  mode: FilterMode
  onRemove?: () => void
  onToggleMode: () => void
}) {
  return (
    <View style={styles.groupHeader}>
      <Pressable accessibilityRole="button" style={styles.modeButton} testID="workspace-view-filter-mode-toggle" onPress={onToggleMode}>
        <Text style={styles.modeButtonText}>{mobileText(mode === 'all' ? 'viewDialog.filter.and' : 'viewDialog.filter.or')}</Text>
      </Pressable>
      <Text style={styles.groupHint}>{mobileText(mode === 'all' ? 'viewDialog.filter.matchAll' : 'viewDialog.filter.matchAny')}</Text>
      {onRemove ? (
        <IconPressable accessibilityLabel={mobileText('common.remove')} testID="workspace-view-filter-remove-group" onPress={onRemove}>
          <X color={mobileColors.textMuted} size={14} />
        </IconPressable>
      ) : null}
    </View>
  )
}

function FilterNodeEditor({
  node,
  notes,
  onChange,
  onRemove,
  path,
}: {
  node: MobileViewFilterNode
  notes: MobileNote[]
  onChange: (node: MobileViewFilterNode) => void
  onRemove: () => void
  path: FilterPath
}) {
  if (isFilterGroup(node)) {
    return <FilterGroupEditor group={node} notes={notes} path={path} onChange={onChange} onRemove={onRemove} />
  }

  return (
    <FilterConditionEditor
      condition={node}
      notes={notes}
      path={path}
      onChange={onChange}
      onRemove={onRemove}
    />
  )
}

function FilterConditionEditor({
  condition,
  notes,
  onChange,
  onRemove,
  path,
}: {
  condition: MobileViewFilterCondition
  notes: MobileNote[]
  onChange: ConditionChange
  onRemove: () => void
  path: FilterPath
}) {
  const pathId = testPath(path)
  const fieldSuggestions = mobileViewFieldSuggestions(notes, condition.field)
  const valueText = String(condition.value ?? '')
  const valueSuggestions = mobileViewValueSuggestionItems(notes, condition.field, valueText)

  return (
    <View style={styles.condition} testID={`workspace-view-filter-row-${pathId}`}>
      <View style={styles.conditionHeader}>
        <Text style={styles.conditionTitle}>{condition.field || defaultField}</Text>
        <IconPressable accessibilityLabel={mobileText('common.remove')} testID={`workspace-view-filter-remove-${pathId}`} onPress={onRemove}>
          <X color={mobileColors.textMuted} size={14} />
        </IconPressable>
      </View>
      <MobileTextInput
        label={mobileText('viewDialog.filter.fieldLabel')}
        testID={`workspace-view-filter-field-input-${pathId}`}
        value={condition.field}
        onChangeText={(field) => onChange({ ...condition, field })}
      />
      <MobileWorkspaceSuggestionList
        labels={fieldSuggestions}
        testID={`workspace-view-filter-field-suggestions-${pathId}`}
        testIDPrefix={`workspace-view-filter-field-suggestion-${pathId}`}
        onSelect={(field) => onChange({ ...condition, field })}
      />
      <OperatorPicker condition={condition} pathId={pathId} onChange={onChange} />
      {noValueOps.has(condition.op) ? null : (
        <>
          <MobileTextInput
            label={mobileText('viewDialog.filter.valueLabel')}
            testID={`workspace-view-filter-value-input-${pathId}`}
            value={valueText}
            onChangeText={(value) => onChange({ ...condition, value })}
          />
          <MobileWorkspaceSuggestionList
            items={valueSuggestions}
            testID={`workspace-view-filter-value-suggestions-${pathId}`}
            testIDPrefix={`workspace-view-filter-value-suggestion-${pathId}`}
            onSelect={(value) => onChange({ ...condition, value })}
          />
        </>
      )}
    </View>
  )
}

function OperatorPicker({
  condition,
  onChange,
  pathId,
}: {
  condition: MobileViewFilterCondition
  onChange: ConditionChange
  pathId: string
}) {
  const regexSupported = regexOps.has(condition.op)
  const regexEnabled = regexSupported && condition.regex === true

  return (
    <View style={styles.operatorWrap}>
      {operators.map((operator) => (
        <OperatorPill
          active={condition.op === operator}
          key={operator}
          label={operatorLabel(operator)}
          testID={`workspace-view-filter-operator-${pathId}-${operator}`}
          onPress={() => onChange({ ...condition, op: operator, regex: nextRegex(operator, regexEnabled) })}
        />
      ))}
      {regexSupported ? (
        <OperatorPill
          active={regexEnabled}
          label=".*"
          testID={`workspace-view-filter-regex-${pathId}`}
          onPress={() => onChange({ ...condition, regex: regexEnabled ? undefined : true })}
        />
      ) : null}
    </View>
  )
}

function OperatorPill({
  active,
  label,
  onPress,
  testID,
}: {
  active: boolean
  label: string
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[styles.operatorPill, active ? styles.operatorPillActive : null]}
      testID={testID}
      onPress={onPress}
    >
      <Text style={[styles.operatorText, active ? styles.operatorTextActive : null]}>{label}</Text>
    </Pressable>
  )
}

function GroupActions({
  onAddCondition,
  onAddGroup,
}: {
  onAddCondition: () => void
  onAddGroup: () => void
}) {
  return (
    <View style={styles.actions}>
      <MobileButton icon={<Plus color={mobileColors.textMuted} size={12} />} label={mobileText('viewDialog.filter.addFilter')} variant="ghost" onPress={onAddCondition} />
      <MobileButton icon={<Plus color={mobileColors.textMuted} size={12} />} label={mobileText('viewDialog.filter.addGroup')} variant="ghost" onPress={onAddGroup} />
    </View>
  )
}

function IconPressable({
  accessibilityLabel,
  children,
  onPress,
  testID,
}: {
  accessibilityLabel: string
  children: ReactNode
  onPress: () => void
  testID: string
}) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" style={styles.iconButton} testID={testID} onPress={onPress}>
      {children}
    </Pressable>
  )
}

function defaultCondition(notes: MobileNote[]): MobileViewFilterCondition {
  return {
    field: mobileViewFieldSuggestions(notes, '')[0] ?? defaultField,
    op: 'equals',
    value: '',
  }
}

function groupMode(group: MobileViewFilterGroup): FilterMode {
  return 'any' in group ? 'any' : 'all'
}

function groupNodes(group: MobileViewFilterGroup): MobileViewFilterNode[] {
  return 'any' in group ? group.any : group.all
}

function groupWithNodes(mode: FilterMode, nodes: MobileViewFilterNode[]): MobileViewFilterGroup {
  return mode === 'any' ? { any: nodes } : { all: nodes }
}

function addNode(group: MobileViewFilterGroup, node: MobileViewFilterNode): MobileViewFilterGroup {
  return groupWithNodes(groupMode(group), [...groupNodes(group), node])
}

function updateNode(group: MobileViewFilterGroup, index: number, node: MobileViewFilterNode): MobileViewFilterGroup {
  return groupWithNodes(groupMode(group), groupNodes(group).map((candidate, candidateIndex) => candidateIndex === index ? node : candidate))
}

function removeNode(group: MobileViewFilterGroup, index: number): MobileViewFilterGroup {
  return groupWithNodes(groupMode(group), groupNodes(group).filter((_node, nodeIndex) => nodeIndex !== index))
}

function nextMode(mode: FilterMode): FilterMode {
  return mode === 'all' ? 'any' : 'all'
}

function nextRegex(operator: MobileViewFilterOp, enabled: boolean): true | undefined {
  return regexOps.has(operator) && enabled ? true : undefined
}

function isFilterGroup(node: MobileViewFilterNode): node is MobileViewFilterGroup {
  return 'all' in node || 'any' in node
}

function childPath(parent: FilterPath, index: number) {
  return parent ? `${parent}-${index}` : String(index)
}

function testPath(path: FilterPath) {
  return path || emptyPath
}

function operatorLabel(operator: MobileViewFilterOp) {
  return mobileText(`viewDialog.filter.operator.${operator}`)
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.xs,
  },
  builder: {
    gap: mobileSpace.sm,
  },
  condition: {
    gap: mobileSpace.sm,
    borderColor: mobileColors.border,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    padding: mobileSpace.sm,
  },
  conditionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
  },
  conditionTitle: {
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.caption,
    fontWeight: '600',
  },
  group: {
    gap: mobileSpace.sm,
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.xs,
  },
  groupHint: {
    flex: 1,
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    height: 24,
    width: 24,
  },
  label: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
    fontWeight: '500',
  },
  modeButton: {
    borderColor: mobileColors.borderStrong,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: mobileSpace.sm,
    paddingVertical: mobileSpace.xs,
  },
  modeButtonText: {
    color: mobileColors.text,
    fontSize: mobileType.micro,
    fontWeight: '600',
  },
  nestedGroup: {
    borderLeftColor: mobileColors.borderStrong,
    borderLeftWidth: 2,
    paddingLeft: mobileSpace.sm,
  },
  nodeList: {
    gap: mobileSpace.sm,
  },
  operatorPill: {
    borderColor: mobileColors.border,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: mobileSpace.sm,
    paddingVertical: mobileSpace.xs,
  },
  operatorPillActive: {
    backgroundColor: mobileColors.primarySoft,
    borderColor: mobileColors.primary,
  },
  operatorText: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
    fontWeight: '500',
  },
  operatorTextActive: {
    color: mobileColors.primary,
  },
  operatorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.xs,
  },
})
