import type { ReactNode } from 'react'
import { Plus, WarningCircle, X } from 'phosphor-react-native'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '../ui/text'
import { mobileCopy, mobileText } from '../../i18n/mobileText'
import { probeProps, useMobileLayoutProbe, type MobileLayoutProbe } from '../../qa/mobileLayoutProbe'
import { MobileChip } from '../../ui/MobileChip'
import { MobilePanel, MobileToolbar, MobileToolbarTitle } from '../../ui/MobilePanel'
import { MobilePropertyRow } from '../../ui/MobilePropertyRow'
import { desktopPanelParity, desktopPropertyParity, desktopRelationshipParity } from '../../ui/desktopParity'
import { mobileColors, mobileRadius, mobileSpace, mobileType } from '../../ui/tokens'
import { resolveMobileMissingTypeName } from '../../workspace/mobileMissingType'
import { mobilePropertyDisplay, type MobilePropertyDisplay } from '../../workspace/mobilePropertyDisplay'
import type { MobileNote, MobileProperty, MobilePropertyDisplayMode, MobilePropertyValue, MobileRelationship, MobileTone, MobileTypeDefinitions } from '../../workspace/mobileWorkspaceModel'
import type { MobileNeighborhoodGroup } from '../../workspace/mobileNeighborhood'
import {
  mobileInspectorPropertySlots,
  mobileInspectorRelationshipSlots,
  type MobileInspectorPropertySlot,
  type MobileInspectorRelationshipSlot,
} from '../../workspace/mobileInspectorSchema'
import { MobileTypeIcon } from './MobileWorkspaceIcons'
import { chipTone, noteTypeColor, noteTypeSoftColor, statusTone, tagTone } from './mobileWorkspaceTone'
import { MobileFrontmatterStateNotice } from './MobileFrontmatterStateNotice'
import { mobileRelationshipValueMetricSegments } from './MobilePropertiesPanelModel'
import { mobileFrontmatterState, needsMobileFrontmatterNotice } from '../../workspace/mobileFrontmatterState'

export function MobilePropertiesPanel({
  compact,
  fullWidth = false,
  layoutProbe = false,
  note,
  onAddProperty,
  onAddRelationship,
  onDeleteProperty,
  onEditProperty,
  onEnterNeighborhood,
  onFixInvalidFrontmatter,
  onInitializeProperties,
  onCreateMissingType,
  onOpenChangeNoteType,
  onRemoveRelationship,
  onSelectNote,
  propertyDisplayModes,
  referenceGroups = [],
  typeDefinitions,
}: {
  compact: boolean
  fullWidth?: boolean
  layoutProbe?: boolean
  note: MobileNote | null
  onAddProperty: (key?: string) => void
  onAddRelationship: (key?: string) => void
  onDeleteProperty: (noteId: string, key: string) => void
  onEditProperty: (noteId: string, key: string, value: MobilePropertyValue) => void
  onEnterNeighborhood?: (noteId: string) => void
  onFixInvalidFrontmatter?: () => void
  onInitializeProperties: (noteId: string) => void
  onCreateMissingType: (typeName: string) => void
  onOpenChangeNoteType: () => void
  onRemoveRelationship: (noteId: string, key: string, ref: string) => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  referenceGroups?: MobileNeighborhoodGroup[]
  typeDefinitions?: MobileTypeDefinitions
}) {
  const propertyLayoutProbe = useMobileLayoutProbe(layoutProbe)

  return (
    <MobilePanel
      {...probeProps(propertyLayoutProbe.probe, 'properties.panel')}
      style={[panelStyles.panel, compact ? panelStyles.panelCompact : null, fullWidth ? panelStyles.panelFullWidth : null]}
      testID="properties-panel"
    >
      <MobileToolbar testID="properties-toolbar">
        <MobileToolbarTitle testID="properties-toolbar-title" title={mobileCopy.properties} variant="inspector" />
      </MobileToolbar>
      <ScrollView
        {...probeProps(propertyLayoutProbe.probe, 'properties.scroll')}
        contentContainerStyle={panelStyles.content}
        keyboardShouldPersistTaps="handled"
      >
        {note ? (
          <NoteProperties
            layoutProbe={propertyLayoutProbe.probe}
            note={note}
            onAddProperty={onAddProperty}
            onAddRelationship={onAddRelationship}
            onDeleteProperty={onDeleteProperty}
            onEditProperty={onEditProperty}
            onEnterNeighborhood={onEnterNeighborhood}
            onFixInvalidFrontmatter={onFixInvalidFrontmatter}
            onInitializeProperties={onInitializeProperties}
            onCreateMissingType={onCreateMissingType}
            onOpenChangeNoteType={onOpenChangeNoteType}
            onRemoveRelationship={onRemoveRelationship}
            onSelectNote={onSelectNote}
            propertyDisplayModes={propertyDisplayModes}
            referenceGroups={referenceGroups}
            typeDefinitions={typeDefinitions}
          />
        ) : <PropertiesEmptyState />}
      </ScrollView>
    </MobilePanel>
  )
}

type NotePropertiesProps = {
  layoutProbe: MobileLayoutProbe
  note: MobileNote
  onAddProperty: (key?: string) => void
  onAddRelationship: (key?: string) => void
  onDeleteProperty: (noteId: string, key: string) => void
  onEditProperty: (noteId: string, key: string, value: MobilePropertyValue) => void
  onEnterNeighborhood?: (noteId: string) => void
  onFixInvalidFrontmatter?: () => void
  onInitializeProperties: (noteId: string) => void
  onCreateMissingType: (typeName: string) => void
  onOpenChangeNoteType: () => void
  onRemoveRelationship: (noteId: string, key: string, ref: string) => void
  onSelectNote: (noteId: string) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  referenceGroups: MobileNeighborhoodGroup[]
  typeDefinitions?: MobileTypeDefinitions
}

function NoteProperties({
  layoutProbe,
  note,
  onAddProperty,
  onAddRelationship,
  onDeleteProperty,
  onEditProperty,
  onEnterNeighborhood,
  onFixInvalidFrontmatter,
  onInitializeProperties,
  onCreateMissingType,
  onOpenChangeNoteType,
  onRemoveRelationship,
  onSelectNote,
  propertyDisplayModes,
  referenceGroups,
  typeDefinitions,
}: NotePropertiesProps) {
  const frontmatterState = mobileFrontmatterState(note)
  const propertySlots = mobileInspectorPropertySlots(note, typeDefinitions)
  const relationshipSlots = mobileInspectorRelationshipSlots(note, typeDefinitions)
  const missingTypeName = resolveMobileMissingTypeName(note, typeDefinitions)

  if (needsMobileFrontmatterNotice(frontmatterState)) {
    return (
      <>
        <MobileFrontmatterStateNotice
          state={frontmatterState}
          onFixInvalidFrontmatter={onFixInvalidFrontmatter}
          onInitializeProperties={() => onInitializeProperties(note.id)}
        />
        <ReferenceGroups groups={referenceGroups} typeDefinitions={typeDefinitions} onSelectNote={onSelectNote} />
      </>
    )
  }

  return (
    <>
      <TypePropertyRow
        layoutProbe={layoutProbe}
        missingTypeName={missingTypeName}
        note={note}
        onCreateMissingType={onCreateMissingType}
        onOpenChangeNoteType={onOpenChangeNoteType}
      />
      {note.status ? (
        <MobilePropertyRow label={mobileText('noteList.sort.status')} testID="property-row-status" value={(
          <EditableChipValue
            label={note.status}
            testID="property-row-status-edit"
            tone={statusTone(note.status)}
            onPress={() => onEditProperty(note.id, 'Status', note.status)}
          />
        )} layoutProbe={layoutProbe} layoutProbeId="properties.row.status" />
      ) : null}
      <MobilePropertyRow label={mobileText('noteList.sort.created')} layoutProbe={layoutProbe} layoutProbeId="properties.row.created" testID="property-row-created" value={note.created} />
      <MobilePropertyRow label={mobileCopy.modified} layoutProbe={layoutProbe} layoutProbeId="properties.row.modified" testID="property-row-modified" value={note.modified} />
      <MobilePropertyRow label={mobileText('inspector.properties.workspace')} layoutProbe={layoutProbe} layoutProbeId="properties.row.workspace" testID="property-row-workspace" value={<WorkspaceBadge label={note.workspace} />} />
      <PropertySection label="Tags" layoutProbe={layoutProbe} layoutProbeId="properties.section.tags" testID="property-section-tags">
        <EditableTagsValue labels={note.tags} onPress={() => onEditProperty(note.id, 'tags', note.tags)} />
      </PropertySection>
      <MobilePropertyRow label="Links" layoutProbe={layoutProbe} layoutProbeId="properties.row.links" testID="property-row-links" value={`${note.links}`} />
      {note.icon ? (
        <EditablePropertyRow
          layoutProbe={layoutProbe}
          noteId={note.id}
          property={{ key: 'icon', label: 'Icon', value: note.icon }}
          onDeleteProperty={onDeleteProperty}
          onEditProperty={onEditProperty}
        />
      ) : null}
      {note.properties?.map((property) => (
        <EditablePropertyRow
          key={property.key}
          layoutProbe={layoutProbe}
          noteId={note.id}
          property={property}
          propertyDisplayModes={propertyDisplayModes}
          onDeleteProperty={onDeleteProperty}
          onEditProperty={onEditProperty}
        />
      ))}
      {propertySlots.map((slot) => (
        <PlaceholderPropertyRow
          key={`${slot.source}:${slot.key}`}
          slot={slot}
          onPress={() => onAddProperty(slot.key)}
        />
      ))}
      {note.relationships.map((relationship) => (
        <PropertySection
          key={`${relationship.kind}-${relationship.label ?? relationship.values.map((value) => value.title).join('-')}`}
          label={relationshipHeading(relationship)}
          layoutProbe={layoutProbe}
          layoutProbeId={`properties.section.${testIdSegment(relationshipHeading(relationship))}`}
          testID={`property-section-${relationship.kind}`}
        >
          <RelationshipValues
            layoutProbe={layoutProbe}
            noteId={note.id}
            relationship={relationship}
            onRemoveRelationship={onRemoveRelationship}
            onEnterNeighborhood={onEnterNeighborhood}
            typeDefinitions={typeDefinitions}
            onSelectNote={onSelectNote}
          />
        </PropertySection>
      ))}
      {relationshipSlots.map((slot) => (
        <PlaceholderRelationshipSection
          key={`${slot.source}:${slot.key}`}
          slot={slot}
          onPress={() => onAddRelationship(slot.key)}
        />
      ))}
      <PropertyActionRow label={mobileText('inspector.properties.addProperty')} testID="property-action-add-property" onPress={() => onAddProperty()} />
      <PropertyActionRow label={mobileText('inspector.relationship.addRelationship')} testID="property-action-add-relationship" onPress={() => onAddRelationship()} />
      <ReferenceGroups groups={referenceGroups} typeDefinitions={typeDefinitions} onSelectNote={onSelectNote} />
    </>
  )
}

function TypePropertyRow({
  layoutProbe,
  missingTypeName,
  note,
  onCreateMissingType,
  onOpenChangeNoteType,
}: {
  layoutProbe: MobileLayoutProbe
  missingTypeName: string | null
  note: MobileNote
  onCreateMissingType: (typeName: string) => void
  onOpenChangeNoteType: () => void
}) {
  return (
    <MobilePropertyRow label="Type" testID="property-row-type" value={(
      <View style={typeStyles.value}>
        <EditableChipValue
          label={note.type}
          testID="property-row-type-edit"
          tone={chipTone(note.typeTone)}
          onPress={onOpenChangeNoteType}
        />
        {missingTypeName ? (
          <MissingTypeButton
            typeName={missingTypeName}
            onPress={() => onCreateMissingType(missingTypeName)}
          />
        ) : null}
      </View>
    )} layoutProbe={layoutProbe} layoutProbeId="properties.row.type" />
  )
}

function MissingTypeButton({
  onPress,
  typeName,
}: {
  onPress: () => void
  typeName: string
}) {
  const label = mobileText('inspector.properties.missingTypeAria').replace('{type}', typeName)

  return (
    <Pressable
      accessibilityHint={mobileText('sidebar.action.createType')}
      accessibilityLabel={label}
      accessibilityRole="button"
      style={({ pressed }) => [typeStyles.missingButton, pressed ? propertyStyles.editableValuePressed : null]}
      testID="missing-type-warning"
      onPress={onPress}
    >
      <WarningCircle color={mobileColors.orange} size={14} weight="bold" />
      <Text numberOfLines={1} style={typeStyles.missingText}>
        {mobileText('inspector.properties.missingType')}
      </Text>
    </Pressable>
  )
}

function EditableChipValue({
  label,
  onPress,
  testID,
  tone,
}: {
  label: string
  onPress: () => void
  testID: string
  tone: Parameters<typeof MobileChip>[0]['tone']
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" testID={testID} onPress={onPress}>
      <MobileChip label={label} tone={tone} />
    </Pressable>
  )
}

function EditableTagsValue({
  labels,
  onPress,
}: {
  labels: string[]
  onPress: () => void
}) {
  if (labels.length > 0) {
    return (
      <Pressable
        accessibilityLabel="Tags"
        accessibilityRole="button"
        testID="property-tags-edit"
        onPress={onPress}
      >
        <TagWrap labels={labels} />
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityLabel="Tags"
      accessibilityRole="button"
      style={({ pressed }) => [propertyStyles.emptyEditableValue, pressed ? propertyStyles.editableValuePressed : null]}
      testID="property-tags-edit"
      onPress={onPress}
    >
      <Text style={propertyStyles.emptyEditableText}>{'\u2014'}</Text>
    </Pressable>
  )
}

function EditablePropertyRow({
  layoutProbe,
  noteId,
  onDeleteProperty,
  onEditProperty,
  propertyDisplayModes,
  property,
}: {
  layoutProbe: MobileLayoutProbe
  noteId: string
  onDeleteProperty: (noteId: string, key: string) => void
  onEditProperty: (noteId: string, key: string, value: MobilePropertyValue) => void
  propertyDisplayModes?: Record<string, MobilePropertyDisplayMode> | null
  property: MobileProperty
}) {
  const testId = `property-row-${testIdSegment(property.key)}`
  const display = mobilePropertyDisplay(property.key, property.value, {
    false: mobileText('inspector.properties.no'),
    true: mobileText('inspector.properties.yes'),
  }, propertyDisplayModes)

  return (
    <MobilePropertyRow
      label={property.label}
      layoutProbe={layoutProbe}
      layoutProbeId={`properties.row.${testIdSegment(property.key)}`}
      testID={testId}
      value={(
        <Pressable
          accessibilityLabel={`${property.label}: ${display.text}`}
          accessibilityRole="button"
          style={({ pressed }) => [propertyStyles.editableValue, pressed ? propertyStyles.editableValuePressed : null]}
          testID={`${testId}-edit`}
          onLongPress={() => onDeleteProperty(noteId, property.key)}
          onPress={() => onEditProperty(noteId, property.key, property.value)}
        >
          <EditablePropertyValueDisplay display={display} />
          <Pressable
            accessibilityLabel={mobileText('inspector.properties.deleteProperty')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onDeleteProperty(noteId, property.key)}
          >
            <X color={mobileColors.textMuted} size={desktopRelationshipParity.removeIconSize} weight="bold" />
          </Pressable>
        </Pressable>
      )}
    />
  )
}

function EditablePropertyValueDisplay({ display }: { display: MobilePropertyDisplay }) {
  if (display.kind === 'list' && display.listItems.length > 0) {
    return (
      <View style={propertyDisplayStyles.listValue}>
        {display.listItems.map((item) => <MobileChip key={item} label={item} tone={tagTone(item)} />)}
      </View>
    )
  }

  if (display.kind === 'status') {
    return <MobileChip label={display.text} tone={statusTone(display.text)} />
  }

  if (display.kind === 'color') {
    return (
      <View style={propertyDisplayStyles.colorValue}>
        <View style={[propertyDisplayStyles.colorSwatch, display.colorValue ? { backgroundColor: display.colorValue } : null]} />
        <Text numberOfLines={1} style={propertyStyles.editableText}>{display.text}</Text>
      </View>
    )
  }

  return (
    <Text
      numberOfLines={1}
      style={[
        propertyStyles.editableText,
        display.kind === 'number' ? propertyDisplayStyles.numberText : null,
        display.kind === 'url' ? propertyDisplayStyles.urlText : null,
      ]}
    >
      {display.text}
    </Text>
  )
}

function PropertiesEmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{mobileText('inspector.empty.noNoteSelected')}</Text>
      <Text style={styles.emptyText}>{mobileText('inspector.empty.noProperties')}</Text>
    </View>
  )
}

function PlaceholderPropertyRow({
  onPress,
  slot,
}: {
  onPress: () => void
  slot: MobileInspectorPropertySlot
}) {
  const sourceSegment = slot.source === 'typeDerived' ? 'type-derived' : 'suggested'

  return (
    <Pressable
      accessibilityLabel={slot.label}
      accessibilityRole="button"
      style={({ pressed }) => [propertyStyles.placeholderRow, pressed ? propertyStyles.editableValuePressed : null]}
      testID={`property-placeholder-${sourceSegment}-${testIdSegment(slot.key)}`}
      onPress={onPress}
    >
      <Text style={propertyStyles.placeholderLabel}>{slot.label}</Text>
      <View style={propertyStyles.placeholderAddValue}>
        <Plus color={mobileColors.textFaint} size={14} />
        <Text style={propertyStyles.placeholderValue}>{mobileText('inspector.relationship.add')}</Text>
      </View>
    </Pressable>
  )
}

function PropertySection({
  children,
  label,
  labelVariant = 'default',
  layoutProbe,
  layoutProbeId,
  testID,
}: {
  children: ReactNode
  label: string
  labelVariant?: 'default' | 'placeholder'
  layoutProbe?: MobileLayoutProbe
  layoutProbeId?: string
  testID?: string
}) {
  const metricId = layoutProbeId ?? testID

  return (
    <View {...propertyProbe(layoutProbe, metricId, 'row')} style={propertyStyles.sectionRow} testID={testID}>
      <Text
        {...propertyProbe(layoutProbe, metricId, 'label')}
        style={[propertyStyles.sectionLabel, labelVariant === 'placeholder' ? propertyStyles.placeholderLabel : null]}
        testID={testID ? `${testID}-label` : undefined}
      >
        {label}
      </Text>
      <View {...propertyProbe(layoutProbe, metricId, 'value')} style={propertyStyles.sectionValue} testID={testID ? `${testID}-value` : undefined}>{children}</View>
    </View>
  )
}

function PropertyActionRow({
  label,
  onPress,
  testID,
}: {
  label: string
  onPress: () => void
  testID: string
}) {
  const visibleLabel = label.replace(/^\+\s*/, '')

  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" style={({ pressed }) => [actionStyles.row, pressed ? actionStyles.rowPressed : null]} testID={testID} onPress={onPress}>
      <View style={actionStyles.label}>
        <View style={actionStyles.iconSlot}>
          <Plus color={mobileColors.textMuted} size={14} />
        </View>
        <Text numberOfLines={1} style={actionStyles.text}>{visibleLabel}</Text>
      </View>
      <View style={actionStyles.value} />
    </Pressable>
  )
}

function PlaceholderRelationshipSection({
  onPress,
  slot,
}: {
  onPress: () => void
  slot: MobileInspectorRelationshipSlot
}) {
  const sourceSegment = slot.source === 'typeDerived' ? 'type-derived' : 'suggested'
  const testID = `relationship-placeholder-${sourceSegment}-${testIdSegment(slot.key)}`

  return (
    <PropertySection label={slot.label} labelVariant="placeholder" testID={testID}>
      <Pressable
        accessibilityLabel={mobileText('inspector.relationship.add')}
        accessibilityRole="button"
        style={({ pressed }) => [propertyStyles.placeholderRelationshipButton, pressed ? propertyStyles.editableValuePressed : null]}
        testID={`${testID}-add`}
        onPress={onPress}
      >
        <View style={actionStyles.label}>
          <View style={actionStyles.iconSlot}>
            <Plus color={mobileColors.textFaint} size={14} />
          </View>
          <Text numberOfLines={1} style={[actionStyles.text, propertyStyles.placeholderButtonText]}>
            {mobileText('inspector.relationship.add')}
          </Text>
        </View>
      </Pressable>
    </PropertySection>
  )
}

function RelationshipValues({
  layoutProbe,
  noteId,
  onRemoveRelationship,
  onEnterNeighborhood,
  onSelectNote,
  relationship,
  typeDefinitions,
}: {
  layoutProbe: MobileLayoutProbe
  noteId: string
  relationship: MobileRelationship
  typeDefinitions?: MobileTypeDefinitions
  onRemoveRelationship: (noteId: string, key: string, ref: string) => void
  onEnterNeighborhood?: (noteId: string) => void
  onSelectNote: (noteId: string) => void
}) {
  const rowSegments = mobileRelationshipValueMetricSegments(relationship.values)

  return (
    <View style={relationshipStyles.values}>
      {relationship.values.map((value, valueIndex) => {
        const rowSegment = rowSegments[valueIndex] ?? relationshipValueSegment(value, valueIndex)

        return (
          <View
            key={rowSegment}
            {...propertyProbe(layoutProbe, `properties.relationship.${rowSegment}`, 'row')}
            style={[relationshipStyles.row, relationshipRowTone(value.typeTone)]}
            testID={`relationship-row-${rowSegment}`}
          >
            <Pressable
              accessibilityLabel={value.title}
              accessibilityRole="button"
              disabled={!value.id}
              {...propertyProbe(layoutProbe, `properties.relationship.${rowSegment}`, 'target')}
              style={relationshipStyles.openTarget}
              testID={`relationship-row-${rowSegment}-open`}
              onPress={() => {
                if (!value.id) return
                onSelectNote(value.id)
              }}
              onLongPress={() => {
                if (value.id) onEnterNeighborhood?.(value.id)
              }}
            >
              <MobileTypeIcon
                size={desktopRelationshipParity.iconSize}
                tone={value.typeTone}
                type={value.type}
                typeDefinitions={typeDefinitions}
              />
              <Text
                numberOfLines={1}
                {...propertyProbe(layoutProbe, `properties.relationship.${rowSegment}`, 'text')}
                style={[relationshipStyles.text, relationshipTextTone(value.typeTone)]}
                testID={`relationship-row-${rowSegment}-text`}
              >
                {value.title}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={mobileText('common.remove')}
              accessibilityRole="button"
              hitSlop={8}
              style={relationshipStyles.remove}
              testID={`relationship-row-${rowSegment}-remove`}
              onPress={() => {
                if (relationship.key && value.ref) onRemoveRelationship(noteId, relationship.key, value.ref)
              }}
            >
              <X color={noteTypeColor(value.typeTone)} size={desktopRelationshipParity.removeIconSize} weight="bold" />
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}

function propertyProbe(layoutProbe: MobileLayoutProbe | undefined, metricId: string | undefined, part: string) {
  return metricId ? probeProps(layoutProbe, `${metricId}.${part}`) : {}
}

function ReferenceGroups({
  groups,
  typeDefinitions,
  onSelectNote,
}: {
  groups: MobileNeighborhoodGroup[]
  typeDefinitions?: MobileTypeDefinitions
  onSelectNote: (noteId: string) => void
}) {
  if (groups.length === 0) return null

  return (
    <View style={referenceStyles.container} testID="inspector-reference-groups">
      {groups.map((group) => (
        <PropertySection
          key={`${group.source}-${group.id}`}
          label={referenceGroupLabel(group)}
          testID={`inspector-reference-group-${group.id}`}
        >
          <ReferenceValues group={group} typeDefinitions={typeDefinitions} onSelectNote={onSelectNote} />
        </PropertySection>
      ))}
    </View>
  )
}

function ReferenceValues({
  group,
  typeDefinitions,
  onSelectNote,
}: {
  group: MobileNeighborhoodGroup
  typeDefinitions?: MobileTypeDefinitions
  onSelectNote: (noteId: string) => void
}) {
  return (
    <View style={relationshipStyles.values}>
      {group.notes.map((note) => (
        <Pressable
          key={`${group.id}-${note.id}`}
          accessibilityLabel={note.title}
          accessibilityRole="button"
          style={({ pressed }) => [referenceStyles.row, pressed ? propertyStyles.editableValuePressed : null]}
          testID={`inspector-reference-row-${testIdSegment(note.title)}`}
          onPress={() => onSelectNote(note.id)}
        >
          <MobileTypeIcon
            fileKind={note.fileKind}
            size={desktopRelationshipParity.iconSize}
            tone={note.typeTone}
            type={note.type}
            typeDefinitions={typeDefinitions}
          />
          <Text numberOfLines={1} style={[referenceStyles.text, relationshipTextTone(note.typeTone)]}>
            {note.title}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

function referenceGroupLabel(group: MobileNeighborhoodGroup) {
  return group.source === 'instances' ? `${group.label} (${group.notes.length})` : group.label
}

function relationshipHeading(relationship: MobileRelationship): string {
  if (relationship.kind === 'custom') {
    return relationship.label ?? 'Custom'
  }

  if (relationship.kind === 'belongsTo') return 'Belongs to'
  if (relationship.kind === 'has') return 'Has'
  return 'Related to'
}

function TagWrap({ labels }: { labels: string[] }) {
  return (
    <View style={propertyStyles.tagWrap} testID="property-tags-wrap">
      {labels.map((label) => <MobileChip key={label} label={label} tone={tagTone(label)} />)}
    </View>
  )
}

function WorkspaceBadge({ label }: { label: string }) {
  return <Text style={propertyStyles.workspaceBadge}>{label}</Text>
}

function relationshipRowTone(tone: MobileTone) {
  return { backgroundColor: noteTypeSoftColor(tone) }
}

function relationshipTextTone(tone: MobileTone) {
  return { color: noteTypeColor(tone) }
}

function relationshipValueSegment(
  value: MobileRelationship['values'][number],
  index: number,
) {
  return mobileRelationshipValueMetricSegments([value])[0] ?? `relationship-${index + 1}`
}

function testIdSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const panelStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: desktopPropertyParity.panelPadding,
  },
  panel: {
    alignSelf: 'stretch',
    borderLeftWidth: StyleSheet.hairlineWidth,
    height: '100%',
    width: desktopPanelParity.inspectorWidth,
  },
  panelCompact: {
    width: 280,
  },
  panelFullWidth: {
    width: '100%',
  },
})

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: mobileSpace.xxl,
  },
  emptyText: {
    marginTop: mobileSpace.sm,
    color: mobileColors.textMuted,
    fontSize: mobileType.body,
    textAlign: 'center',
  },
  emptyTitle: {
    color: mobileColors.text,
    fontSize: mobileType.title,
    fontWeight: '600',
    textAlign: 'center',
  },
})

const relationshipStyles = StyleSheet.create({
  remove: {
    minHeight: desktopRelationshipParity.removeIconSize,
    minWidth: desktopRelationshipParity.removeIconSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: mobileRadius.pill,
  },
  row: {
    minHeight: desktopPropertyParity.rowMinHeight,
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: desktopRelationshipParity.rowRadius,
    paddingHorizontal: desktopRelationshipParity.rowPaddingHorizontal,
    paddingVertical: desktopRelationshipParity.rowPaddingVertical,
    width: '100%',
  },
  openTarget: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: desktopRelationshipParity.rowGap,
  },
  text: {
    flex: 1,
    fontSize: desktopRelationshipParity.textFontSize,
    fontWeight: desktopRelationshipParity.textFontWeight,
  },
  values: {
    alignItems: 'stretch',
    gap: mobileSpace.xs,
  },
})

const referenceStyles = StyleSheet.create({
  container: {
    marginTop: mobileSpace.sm,
    borderTopColor: mobileColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: desktopPropertyParity.rowMinHeight,
    minWidth: 0,
    alignItems: 'center',
    flexDirection: 'row',
    gap: desktopRelationshipParity.rowGap,
    borderRadius: desktopRelationshipParity.rowRadius,
    paddingHorizontal: 0,
    paddingVertical: 4,
    width: '100%',
  },
  text: {
    minWidth: 0,
    flex: 1,
    fontSize: desktopRelationshipParity.textFontSize,
    fontWeight: desktopRelationshipParity.textFontWeight,
  },
})

const propertyStyles = StyleSheet.create({
  sectionLabel: {
    color: mobileColors.textMuted,
    fontSize: desktopPropertyParity.labelTextSize,
  },
  sectionRow: {
    minHeight: desktopPropertyParity.rowMinHeight,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: mobileSpace.sm,
    paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
    paddingVertical: mobileSpace.sm,
  },
  sectionValue: {
    alignSelf: 'stretch',
    minWidth: 0,
  },
  placeholderButton: {
    minHeight: desktopPropertyParity.rowMinHeight,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: mobileSpace.xs,
    borderRadius: desktopPropertyParity.actionRowRadius,
    paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
    width: '100%',
  },
  placeholderRelationshipButton: {
    minHeight: desktopPropertyParity.rowMinHeight,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: mobileSpace.xs,
    borderRadius: desktopRelationshipParity.rowRadius,
    paddingHorizontal: 0,
    width: '100%',
  },
  placeholderButtonText: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.textFaint,
    fontSize: desktopPropertyParity.labelTextSize,
  },
  placeholderLabel: {
    color: mobileColors.textFaint,
    fontSize: desktopPropertyParity.labelTextSize,
  },
  placeholderAddValue: {
    minWidth: 0,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: mobileSpace.xs,
    justifyContent: 'flex-end',
  },
  placeholderRow: {
    minHeight: desktopPropertyParity.rowMinHeight,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
  },
  placeholderValue: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.textFaint,
    fontSize: mobileType.caption,
    textAlign: 'right',
  },
  editableText: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.caption,
  },
  emptyEditableText: {
    color: mobileColors.textFaint,
    fontSize: mobileType.caption,
  },
  emptyEditableValue: {
    minHeight: desktopPropertyParity.rowMinHeight,
    minWidth: 0,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderRadius: 4,
    paddingHorizontal: mobileSpace.xs,
    paddingVertical: 2,
  },
  editableValue: {
    minWidth: 0,
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: mobileSpace.xs,
    justifyContent: 'flex-end',
    borderRadius: 4,
    paddingHorizontal: mobileSpace.xs,
    paddingVertical: 2,
  },
  editableValuePressed: {
    backgroundColor: mobileColors.graySoft,
  },
  tagWrap: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.xs,
  },
  workspaceBadge: {
    overflow: 'hidden',
    borderRadius: mobileRadius.pill,
    backgroundColor: mobileColors.graySoft,
    color: mobileColors.textMuted,
    fontSize: mobileType.micro,
    fontWeight: '400',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
})

const typeStyles = StyleSheet.create({
  value: {
    minWidth: 0,
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.xs,
    justifyContent: 'flex-end',
  },
  missingButton: {
    minHeight: desktopPropertyParity.chipHeight,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    borderRadius: desktopPropertyParity.chipRadius,
    backgroundColor: mobileColors.orangeSoft,
    paddingHorizontal: desktopPropertyParity.chipPaddingHorizontal,
  },
  missingText: {
    color: mobileColors.orange,
    fontSize: desktopPropertyParity.chipTextSize,
    fontWeight: '500',
    lineHeight: desktopPropertyParity.chipHeight,
  },
})

const propertyDisplayStyles = StyleSheet.create({
  colorSwatch: {
    height: 12,
    width: 12,
    borderColor: mobileColors.borderStrong,
    borderRadius: mobileRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  colorValue: {
    minWidth: 0,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: mobileSpace.xs,
    justifyContent: 'flex-end',
  },
  listValue: {
    minWidth: 0,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.xs,
    justifyContent: 'flex-end',
  },
  numberText: {
    fontVariant: ['tabular-nums'],
  },
  urlText: {
    color: mobileColors.primary,
  },
})

const actionStyles = StyleSheet.create({
  iconSlot: {
    width: desktopPropertyParity.labelIconSlot,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    minWidth: 0,
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: mobileSpace.xs,
  },
  row: {
    minHeight: desktopPropertyParity.rowMinHeight,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderRadius: desktopPropertyParity.actionRowRadius,
    paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
  },
  rowPressed: {
    backgroundColor: mobileColors.graySoft,
  },
  text: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.textMuted,
    fontSize: desktopPropertyParity.labelTextSize,
  },
  value: {
    flex: 1,
  },
})
