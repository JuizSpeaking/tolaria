import type { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Archive, CheckCircle, FilePlus, FolderOpen, LinkSimple, PencilSimple, Star, Tag, Trash } from 'phosphor-react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { MobileButton } from '../../ui/MobileButton'
import { MobileChip } from '../../ui/MobileChip'
import { MobileListRow } from '../../ui/MobileListRow'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { MobileTextInput } from '../../ui/MobileTextInput'
import { desktopPanelParity, desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileSpace, mobileType } from '../../ui/tokens'
import type { MobileNote, MobileViewFilterGroup } from '../../workspace/mobileWorkspaceModel'
import {
  mobilePropertyKeySuggestions,
  mobilePropertyValueSuggestions,
  mobileFolderSuggestions,
  mobileRelationshipKeySuggestions,
  mobileTypeSuggestions,
} from '../../workspace/mobileWorkspaceSuggestions'
import { MobileTypeIcon } from './MobileWorkspaceIcons'
import { MobileViewFilterBuilder } from './MobileViewFilterBuilder'
import { MobileWorkspaceSuggestionList } from './MobileWorkspaceSuggestionList'
import { chipTone, statusTone, tagTone } from './mobileWorkspaceTone'

export type MobileWorkspaceAction =
  | 'addProperty'
  | 'addRelationship'
  | 'changeNoteType'
  | 'createNote'
  | 'createView'
  | 'editProperty'
  | 'editView'
  | 'moreActions'
  | 'moveNoteToFolder'
  | 'renameNoteFile'
  | 'search'

type MobileWorkspaceActionSheetProps = {
  action: MobileWorkspaceAction
  createTitle: string
  filenameStem: string
  folderPath: string
  notes: MobileNote[]
  noteType: string
  onChangeNoteType: () => void
  onChangeNoteTypeInputChange: (value: string) => void
  onClose: () => void
  onCreateNote: () => void
  onCreateRelationshipTarget: () => void
  onCreateTitleChange: (value: string) => void
  onCopyDeepLink: () => void
  onCreateView: () => void
  onDeleteNote: () => void
  onDeleteView: () => void
  onFilenameStemChange: (value: string) => void
  onFolderPathChange: (value: string) => void
  onMoveNoteToFolder: () => void
  onOpenChangeNoteType: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenRenameNoteFile: () => void
  onPropertyNameChange: (value: string) => void
  onPropertyValueChange: (value: string) => void
  onRelationshipNameChange: (value: string) => void
  onRelationshipNoteTitleChange: (value: string) => void
  onSaveProperty: () => void
  onSaveRelationship: () => void
  onRenameNoteFile: () => void
  onSaveView: () => void
  onSearchQueryChange: (value: string) => void
  onSelectNote: (noteId: string) => void
  onSetArchived: (archived: boolean) => void
  onSetOrganized: (organized: boolean) => void
  onViewFiltersChange: (value: MobileViewFilterGroup) => void
  onViewNameChange: (value: string) => void
  propertyName: string
  propertyValue: string
  relationshipName: string
  relationshipNoteTitle: string
  searchQuery: string
  selectedNote: MobileNote | null
  viewFilters: MobileViewFilterGroup
  viewName: string
}

type SingleTextFieldConfig = {
  extraContent?: ReactNode
  inputLabel: string
  inputPlaceholder: string
  inputTestId: string
  inputValue: string
  onCancel: () => void
  onChangeText: (value: string) => void
  onSubmit: () => void
  submitLabel: string
  secondaryAction?: ReactNode
}

type SuggestionInputActionConfig = {
  inputLabel: string
  inputPlaceholder: string
  inputTestId: string
  inputValue: string
  onCancel: () => void
  onChangeText: (value: string) => void
  onSubmit: () => void
  submitLabel: string
  suggestionTestId: string
  suggestionTestIdPrefix: string
  suggestions: string[]
}
type RetargetNoteAction = 'changeType' | 'moveFolder'

export function MobileWorkspaceActionSheet({
  action,
  createTitle,
  filenameStem,
  folderPath,
  notes,
  noteType,
  onChangeNoteType,
  onChangeNoteTypeInputChange,
  onClose,
  onCreateNote,
  onCreateRelationshipTarget,
  onCreateTitleChange,
  onCopyDeepLink,
  onCreateView,
  onDeleteNote,
  onDeleteView,
  onFilenameStemChange,
  onFolderPathChange,
  onMoveNoteToFolder,
  onOpenChangeNoteType,
  onOpenMoveNoteToFolder,
  onOpenRenameNoteFile,
  onPropertyNameChange,
  onPropertyValueChange,
  onRelationshipNameChange,
  onRelationshipNoteTitleChange,
  onSaveProperty,
  onSaveRelationship,
  onRenameNoteFile,
  onSaveView,
  onSearchQueryChange,
  onSelectNote,
  onSetArchived,
  onSetOrganized,
  onViewFiltersChange,
  onViewNameChange,
  propertyName,
  propertyValue,
  relationshipName,
  relationshipNoteTitle,
  searchQuery,
  selectedNote,
  viewFilters,
  viewName,
}: MobileWorkspaceActionSheetProps) {
  return (
    <View style={styles.overlay} testID="workspace-action-sheet">
      <Pressable accessibilityLabel={mobileText('common.cancel')} style={styles.backdrop} testID="workspace-action-sheet-backdrop" onPress={onClose} />
      <MobilePanel style={styles.sheet} testID={`workspace-action-sheet-${action}`}>
        <MobileToolbar testID="workspace-action-sheet-toolbar">
          <MobileToolbarTitle title={actionTitle(action, propertyName)} />
          <MobileToolbarSpacer />
          <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={onClose} />
        </MobileToolbar>
        <ActionContent
          action={action}
          createTitle={createTitle}
          filenameStem={filenameStem}
          folderPath={folderPath}
          notes={notes}
          noteType={noteType}
          onChangeNoteType={onChangeNoteType}
          onChangeNoteTypeInputChange={onChangeNoteTypeInputChange}
          onClose={onClose}
          onCreateNote={onCreateNote}
          onCreateRelationshipTarget={onCreateRelationshipTarget}
          onCreateTitleChange={onCreateTitleChange}
          onCopyDeepLink={onCopyDeepLink}
          onCreateView={onCreateView}
          onDeleteNote={onDeleteNote}
          onDeleteView={onDeleteView}
          onFilenameStemChange={onFilenameStemChange}
          onFolderPathChange={onFolderPathChange}
          onMoveNoteToFolder={onMoveNoteToFolder}
          onOpenChangeNoteType={onOpenChangeNoteType}
          onOpenMoveNoteToFolder={onOpenMoveNoteToFolder}
          onOpenRenameNoteFile={onOpenRenameNoteFile}
          onPropertyNameChange={onPropertyNameChange}
          onPropertyValueChange={onPropertyValueChange}
          onRelationshipNameChange={onRelationshipNameChange}
          onRelationshipNoteTitleChange={onRelationshipNoteTitleChange}
          onSaveProperty={onSaveProperty}
          onSaveRelationship={onSaveRelationship}
          onRenameNoteFile={onRenameNoteFile}
          onSaveView={onSaveView}
          onSearchQueryChange={onSearchQueryChange}
          onSelectNote={onSelectNote}
          onSetArchived={onSetArchived}
          onSetOrganized={onSetOrganized}
          onViewFiltersChange={onViewFiltersChange}
          onViewNameChange={onViewNameChange}
          propertyName={propertyName}
          propertyValue={propertyValue}
          relationshipName={relationshipName}
          relationshipNoteTitle={relationshipNoteTitle}
          searchQuery={searchQuery}
          selectedNote={selectedNote}
          viewFilters={viewFilters}
          viewName={viewName}
        />
      </MobilePanel>
    </View>
  )
}

function ActionContent(props: MobileWorkspaceActionSheetProps) {
  return actionContentByAction[props.action](props)
}

const actionContentByAction: Record<MobileWorkspaceAction, (props: MobileWorkspaceActionSheetProps) => ReactNode> = {
  addProperty: (props) => <AddPropertyContent {...props} />,
  addRelationship: (props) => <AddRelationshipContent {...props} />,
  changeNoteType: (props) => <RetargetNoteContent {...props} retargetAction="changeType" />,
  createNote: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  createView: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  editProperty: (props) => <AddPropertyContent {...props} />,
  editView: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  moreActions: (props) => (
    <MoreActionsContent
      note={props.selectedNote}
      onClose={props.onClose}
      onCopyDeepLink={props.onCopyDeepLink}
      onOpenChangeNoteType={props.onOpenChangeNoteType}
      onOpenMoveNoteToFolder={props.onOpenMoveNoteToFolder}
      onOpenRenameNoteFile={props.onOpenRenameNoteFile}
      onSetArchived={props.onSetArchived}
      onSetOrganized={props.onSetOrganized}
      onDeleteNote={props.onDeleteNote}
    />
  ),
  moveNoteToFolder: (props) => <RetargetNoteContent {...props} retargetAction="moveFolder" />,
  renameNoteFile: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  search: (props) => <SearchContent {...props} />,
}

function SearchContent({
  notes,
  onClose,
  onSearchQueryChange,
  onSelectNote,
  searchQuery,
}: MobileWorkspaceActionSheetProps) {
  const searchResults = searchNotes(notes, searchQuery)

  return (
    <View style={styles.content}>
      <MobileTextInput
        autoFocus
        label={mobileText('noteList.searchAction')}
        placeholder={mobileText('noteList.searchPlaceholder')}
        testID="workspace-search-input"
        value={searchQuery}
        onChangeText={onSearchQueryChange}
      />
      <ScrollView contentContainerStyle={styles.resultList} keyboardShouldPersistTaps="handled" testID="workspace-search-results">
        {searchResults.length === 0 ? <EmptyState>{mobileText('noteList.empty.noMatching')}</EmptyState> : null}
        {searchResults.map((note) => (
          <MobileListRow
            key={note.id}
            chips={<NoteRowChips note={note} />}
            selected={false}
            subtitle={note.snippet}
            testID={`workspace-search-result-${note.id}`}
            title={note.title}
            trailing={<MobileTypeIcon size={16} tone={note.typeTone} type={note.type} />}
            onPress={() => {
              onSelectNote(note.id)
              onSearchQueryChange('')
              onClose()
            }}
          />
        ))}
      </ScrollView>
    </View>
  )
}

function searchNotes(notes: MobileNote[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const activeNotes = notes.filter((note) => !note.archived)
  if (!normalizedQuery) return activeNotes.slice(0, 16)

  return activeNotes
    .filter((note) => searchText(note).includes(normalizedQuery))
    .slice(0, 16)
}

function searchText(note: MobileNote) {
  return [
    note.title,
    note.snippet,
    note.type,
    note.status,
    note.tags.join(' '),
    note.path ?? '',
  ].join(' ').toLowerCase()
}

function SingleTextFieldContent({ config }: { config: SingleTextFieldConfig }) {
  const { extraContent, inputLabel, inputPlaceholder, inputTestId, inputValue, onCancel, onChangeText, onSubmit, secondaryAction, submitLabel } = config

  return (
    <View style={styles.content}>
      <MobileTextInput
        autoFocus
        label={inputLabel}
        placeholder={inputPlaceholder}
        testID={inputTestId}
        value={inputValue}
        onChangeText={onChangeText}
      />
      {extraContent}
      <SheetFooter>
        {secondaryAction}
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={onCancel} />
        <MobileButton disabled={inputValue.trim().length === 0} label={submitLabel} variant="primary" onPress={onSubmit} />
      </SheetFooter>
    </View>
  )
}

function singleTextFieldConfig(props: MobileWorkspaceActionSheetProps) {
  if (props.action === 'editView') {
    return {
      extraContent: viewFilterBuilder(props),
      inputLabel: mobileText('viewDialog.nameLabel'),
      inputPlaceholder: mobileText('viewDialog.namePlaceholder'),
      inputTestId: 'workspace-edit-view-name-input',
      inputValue: props.viewName,
      onCancel: props.onClose,
      onChangeText: props.onViewNameChange,
      onSubmit: props.onSaveView,
      secondaryAction: <DeleteViewButton onPress={props.onDeleteView} />,
      submitLabel: mobileText('common.save'),
    }
  }

  if (props.action === 'createView') {
    return {
      extraContent: viewFilterBuilder(props),
      inputLabel: mobileText('viewDialog.nameLabel'),
      inputPlaceholder: mobileText('viewDialog.namePlaceholder'),
      inputTestId: 'workspace-create-view-name-input',
      inputValue: props.viewName,
      onCancel: props.onClose,
      onChangeText: props.onViewNameChange,
      onSubmit: props.onCreateView,
      submitLabel: mobileText('common.create'),
    }
  }

  if (props.action === 'renameNoteFile') {
    return {
      inputLabel: mobileText('editor.filename.rename'),
      inputPlaceholder: mobileText('editor.filename.rename'),
      inputTestId: 'workspace-rename-file-input',
      inputValue: props.filenameStem,
      onCancel: props.onClose,
      onChangeText: props.onFilenameStemChange,
      onSubmit: props.onRenameNoteFile,
      submitLabel: mobileText('common.save'),
    }
  }

  return {
    inputLabel: mobileText('command.note.newNote'),
    inputPlaceholder: mobileText('noteList.createNote'),
    inputTestId: 'workspace-create-note-title-input',
    inputValue: props.createTitle,
    onCancel: props.onClose,
    onChangeText: props.onCreateTitleChange,
    onSubmit: props.onCreateNote,
    submitLabel: mobileText('common.create'),
  }
}

function viewFilterBuilder(props: MobileWorkspaceActionSheetProps) {
  return (
    <MobileViewFilterBuilder
      group={props.viewFilters}
      notes={props.notes}
      onChange={props.onViewFiltersChange}
    />
  )
}

function DeleteViewButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={mobileText('sidebar.action.deleteView')}
      accessibilityRole="button"
      style={({ pressed }) => [styles.deleteViewButton, pressed ? styles.suggestionRowPressed : null]}
      testID="workspace-delete-view-action"
      onPress={onPress}
    >
      <Text style={styles.deleteViewText}>{mobileText('sidebar.action.deleteView')}</Text>
    </Pressable>
  )
}

function AddPropertyContent({
  action,
  notes,
  onClose,
  onPropertyNameChange,
  onPropertyValueChange,
  onSaveProperty,
  propertyName,
  propertyValue,
  selectedNote,
}: MobileWorkspaceActionSheetProps) {
  const editingProperty = action === 'editProperty'
  const keySuggestions = editingProperty ? [] : mobilePropertyKeySuggestions(notes, selectedNote, propertyName)
  const valueSuggestions = mobilePropertyValueSuggestions(notes, propertyName, propertyValue)

  return (
    <View style={styles.content}>
      <MobileTextInput
        autoFocus
        label={mobileText('inspector.properties.propertyName')}
        placeholder={mobileText('inspector.properties.propertyName')}
        testID="workspace-property-name-input"
        value={propertyName}
        editable={!editingProperty}
        onChangeText={onPropertyNameChange}
      />
      {keySuggestions.length > 0 ? (
        <MobileWorkspaceSuggestionList
          labels={keySuggestions}
          testID="workspace-property-key-suggestions"
          testIDPrefix="workspace-property-key-suggestion"
          onSelect={onPropertyNameChange}
        />
      ) : null}
      <MobileTextInput
        label={mobileText('inspector.properties.valuePlaceholder')}
        placeholder={mobileText('inspector.properties.valuePlaceholder')}
        testID="workspace-property-value-input"
        value={propertyValue}
        onChangeText={onPropertyValueChange}
      />
      <MobileWorkspaceSuggestionList
        labels={valueSuggestions}
        testID="workspace-property-value-suggestions"
        testIDPrefix="workspace-property-value-suggestion"
        onSelect={(value) => onPropertyValueChange(propertySuggestionValue(propertyName, propertyValue, value))}
      />
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={onClose} />
        <MobileButton disabled={propertyName.trim().length === 0} label={mobileText('common.save')} variant="primary" onPress={onSaveProperty} />
      </SheetFooter>
    </View>
  )
}

function AddRelationshipContent({
  notes,
  onClose,
  onCreateRelationshipTarget,
  onRelationshipNameChange,
  onRelationshipNoteTitleChange,
  onSaveRelationship,
  relationshipName,
  relationshipNoteTitle,
}: MobileWorkspaceActionSheetProps) {
  const keySuggestions = mobileRelationshipKeySuggestions(notes, relationshipName)
  const suggestions = relationshipSuggestions(notes, relationshipNoteTitle)
  const createTargetTitle = relationshipNoteTitle.trim()
  const showCreateTarget = shouldShowRelationshipCreateTarget(notes, createTargetTitle)

  return (
    <View style={styles.content}>
      <MobileTextInput
        autoFocus
        label={mobileText('inspector.relationship.name')}
        placeholder={mobileText('inspector.relationship.name')}
        testID="workspace-relationship-name-input"
        value={relationshipName}
        onChangeText={onRelationshipNameChange}
      />
      <MobileWorkspaceSuggestionList
        labels={keySuggestions}
        testID="workspace-relationship-key-suggestions"
        testIDPrefix="workspace-relationship-key-suggestion"
        onSelect={onRelationshipNameChange}
      />
      <MobileTextInput
        label={mobileText('inspector.relationship.noteTitle')}
        placeholder={mobileText('inspector.relationship.noteTitle')}
        testID="workspace-relationship-note-title-input"
        value={relationshipNoteTitle}
        onChangeText={onRelationshipNoteTitleChange}
      />
      {suggestions.length > 0 ? (
        <View style={styles.suggestionList} testID="workspace-relationship-note-suggestions">
          {suggestions.map((note) => (
            <Pressable
              accessibilityLabel={note.title}
              accessibilityRole="button"
              key={note.id}
              style={({ pressed }) => [styles.suggestionRow, pressed ? styles.suggestionRowPressed : null]}
              testID={`workspace-relationship-note-suggestion-${note.id}`}
              onPress={() => onRelationshipNoteTitleChange(note.title)}
            >
              <MobileTypeIcon size={16} tone={note.typeTone} type={note.type} />
              <Text numberOfLines={1} style={styles.suggestionTitle}>{note.title}</Text>
              <MobileChip label={note.type} tone={chipTone(note.typeTone)} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {showCreateTarget ? (
        <CreateRelationshipTargetRow title={createTargetTitle} onPress={onCreateRelationshipTarget} />
      ) : null}
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={onClose} />
        <MobileButton disabled={relationshipName.trim().length === 0 || relationshipNoteTitle.trim().length === 0} label={mobileText('inspector.relationship.add')} variant="primary" onPress={onSaveRelationship} />
      </SheetFooter>
    </View>
  )
}

function CreateRelationshipTargetRow({
  onPress,
  title,
}: {
  onPress: () => void
  title: string
}) {
  return (
    <Pressable
      accessibilityLabel={`${mobileText('inspector.relationship.createAndOpen')} ${title}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.suggestionRow, pressed ? styles.suggestionRowPressed : null]}
      testID="workspace-relationship-create-target"
      onPress={onPress}
    >
      <FilePlus color={mobileColors.textMuted} size={16} />
      <Text numberOfLines={1} style={styles.suggestionTitle}>
        {mobileText('inspector.relationship.createAndOpen')} {title}
      </Text>
    </Pressable>
  )
}

function RetargetNoteContent(props: MobileWorkspaceActionSheetProps & { retargetAction: RetargetNoteAction }) {
  return (
    <SuggestionInputActionContent config={retargetNoteInputConfig(props)} />
  )
}

function retargetNoteInputConfig(props: MobileWorkspaceActionSheetProps & { retargetAction: RetargetNoteAction }): SuggestionInputActionConfig {
  if (props.retargetAction === 'changeType') {
    return {
      inputLabel: mobileText('command.note.changeType'),
      inputPlaceholder: mobileText('inspector.properties.searchTypes'),
      inputTestId: 'workspace-change-type-input',
      inputValue: props.noteType,
      onCancel: props.onClose,
      onChangeText: props.onChangeNoteTypeInputChange,
      onSubmit: props.onChangeNoteType,
      submitLabel: mobileText('common.save'),
      suggestionTestId: 'workspace-change-type-suggestions',
      suggestionTestIdPrefix: 'workspace-change-type-suggestion',
      suggestions: mobileTypeSuggestions(props.notes, props.selectedNote, props.noteType),
    }
  }

  return {
    inputLabel: mobileText('command.note.moveToFolder'),
    inputPlaceholder: mobileText('sidebar.folder.name'),
    inputTestId: 'workspace-move-folder-input',
    inputValue: props.folderPath,
    onCancel: props.onClose,
    onChangeText: props.onFolderPathChange,
    onSubmit: props.onMoveNoteToFolder,
    submitLabel: mobileText('common.save'),
    suggestionTestId: 'workspace-move-folder-suggestions',
    suggestionTestIdPrefix: 'workspace-move-folder-suggestion',
    suggestions: mobileFolderSuggestions(props.notes, props.selectedNote, props.folderPath),
  }
}

function SuggestionInputActionContent({ config }: { config: SuggestionInputActionConfig }) {
  return (
    <View style={styles.content}>
      <MobileTextInput
        autoFocus
        label={config.inputLabel}
        placeholder={config.inputPlaceholder}
        testID={config.inputTestId}
        value={config.inputValue}
        onChangeText={config.onChangeText}
      />
      <MobileWorkspaceSuggestionList
        labels={config.suggestions}
        testID={config.suggestionTestId}
        testIDPrefix={config.suggestionTestIdPrefix}
        onSelect={config.onChangeText}
      />
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={config.onCancel} />
        <MobileButton disabled={config.inputValue.trim().length === 0} label={config.submitLabel} variant="primary" onPress={config.onSubmit} />
      </SheetFooter>
    </View>
  )
}

function MoreActionsContent(props: {
  note: MobileNote | null
  onClose: () => void
  onCopyDeepLink: () => void
  onOpenChangeNoteType: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenRenameNoteFile: () => void
  onSetArchived: (archived: boolean) => void
  onSetOrganized: (organized: boolean) => void
  onDeleteNote: () => void
}) {
  const {
    note,
    onClose,
    onCopyDeepLink,
    onDeleteNote,
    onOpenChangeNoteType,
    onOpenMoveNoteToFolder,
    onOpenRenameNoteFile,
    onSetArchived,
    onSetOrganized,
  } = props

  return (
    <View style={styles.content}>
      {note ? <SelectedNoteSummary note={note} /> : null}
      {note ? (
        <NoteMoreActionRows
          note={note}
          onClose={onClose}
          onDeleteNote={onDeleteNote}
          onOpenChangeNoteType={onOpenChangeNoteType}
          onOpenMoveNoteToFolder={onOpenMoveNoteToFolder}
          onOpenRenameNoteFile={onOpenRenameNoteFile}
          onSetArchived={onSetArchived}
          onSetOrganized={onSetOrganized}
        />
      ) : null}
      <ActionRow
        icon={<LinkSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.copyDeepLink')}
        testID="workspace-action-copy-deep-link"
        onPress={() => {
          onCopyDeepLink()
          onClose()
        }}
      />
      <ActionRow icon={<FilePlus color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />} label={mobileText('command.note.exportPdf')} onPress={onClose} />
    </View>
  )
}

function NoteMoreActionRows(props: {
  note: MobileNote
  onClose: () => void
  onDeleteNote: () => void
  onOpenChangeNoteType: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenRenameNoteFile: () => void
  onSetArchived: (archived: boolean) => void
  onSetOrganized: (organized: boolean) => void
}) {
  const {
    note,
    onClose,
    onDeleteNote,
    onOpenChangeNoteType,
    onOpenMoveNoteToFolder,
    onOpenRenameNoteFile,
    onSetArchived,
    onSetOrganized,
  } = props

  return (
    <>
      <NoteFlagActionRow
        active={note.organized === true}
        activeLabelKey="command.note.markUnorganized"
        icon={<CheckCircle color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} weight={note.organized ? 'fill' : 'regular'} />}
        inactiveLabelKey="command.note.markOrganized"
        testID="workspace-action-organize-note"
        onPress={() => {
          onSetOrganized(!note.organized)
          onClose()
        }}
      />
      <NoteFlagActionRow
        active={note.archived === true}
        activeLabelKey="command.note.unarchiveNote"
        icon={<Archive color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        inactiveLabelKey="command.note.archiveNote"
        testID="workspace-action-archive-note"
        onPress={() => {
          onSetArchived(!note.archived)
          onClose()
        }}
      />
      <ActionRow
        icon={<Tag color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.changeType')}
        testID="workspace-action-change-note-type"
        onPress={onOpenChangeNoteType}
      />
      <ActionRow
        icon={<PencilSimple color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('editor.filename.rename')}
        testID="workspace-action-rename-file"
        onPress={onOpenRenameNoteFile}
      />
      <ActionRow
        icon={<FolderOpen color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('command.note.moveToFolder')}
        testID="workspace-action-move-note-folder"
        onPress={onOpenMoveNoteToFolder}
      />
      <DeleteActionRow onClose={onClose} onDeleteNote={onDeleteNote} />
    </>
  )
}

function NoteFlagActionRow({
  active,
  activeLabelKey,
  icon,
  inactiveLabelKey,
  onPress,
  testID,
}: {
  active: boolean
  activeLabelKey: Parameters<typeof mobileText>[0]
  icon: ReactNode
  inactiveLabelKey: Parameters<typeof mobileText>[0]
  onPress: () => void
  testID: string
}) {
  return (
    <ActionRow
      icon={icon}
      label={mobileText(active ? activeLabelKey : inactiveLabelKey)}
      testID={testID}
      onPress={onPress}
    />
  )
}

function DeleteActionRow({
  onClose,
  onDeleteNote,
}: {
  onClose: () => void
  onDeleteNote: () => void
}) {
  return (
    <ActionRow
      destructive
      icon={<Trash color={mobileColors.red} size={desktopToolbarActionParity.iconSize} />}
      label={mobileText('command.note.deleteNote')}
      testID="workspace-action-delete-note"
      onPress={() => {
        onDeleteNote()
        onClose()
      }}
    />
  )
}

function SelectedNoteSummary({ note }: { note: MobileNote }) {
  return (
    <View style={actionStyles.summary} testID="workspace-action-sheet-note-summary">
      <MobileTypeIcon size={desktopToolbarActionParity.iconSize} tone={note.typeTone} type={note.type} />
      <Text numberOfLines={1} style={actionStyles.summaryTitle}>{note.title}</Text>
      {note.favorite ? <Star color={mobileColors.primary} size={desktopToolbarActionParity.iconSize} weight="fill" /> : null}
      <MobileChip label={note.type} tone={chipTone(note.typeTone)} />
    </View>
  )
}

function ActionRow({
  icon,
  destructive = false,
  label,
  onPress,
  testID,
}: {
  destructive?: boolean
  icon: ReactNode
  label: string
  onPress: () => void
  testID?: string
}) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" style={({ pressed }) => [actionStyles.actionRow, pressed ? actionStyles.actionRowPressed : null]} testID={testID} onPress={onPress}>
      <View style={actionStyles.actionRowContent}>
        <View style={actionStyles.actionIcon}>{icon}</View>
        <Text numberOfLines={1} style={[actionStyles.actionText, destructive ? actionStyles.actionTextDestructive : null]}>{label}</Text>
      </View>
    </Pressable>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  )
}

function SheetFooter({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>
}

function NoteRowChips({ note }: { note: MobileNote }) {
  return (
    <View style={styles.chipRow}>
      <MobileChip density="list" label={note.type} tone={chipTone(note.typeTone)} />
      {note.status ? <MobileChip density="list" label={note.status} tone={statusTone(note.status)} /> : null}
      {note.tags.slice(0, 1).map((tag) => <MobileChip density="list" key={tag} label={tag} tone={tagTone(tag)} />)}
    </View>
  )
}

function relationshipSuggestions(notes: MobileNote[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  return notes
    .filter((note) => !note.archived && [
      note.title,
      note.type,
      note.path ?? '',
      note.tags.join(' '),
    ].join(' ').toLowerCase().includes(normalized))
    .slice(0, 6)
}

function shouldShowRelationshipCreateTarget(notes: MobileNote[], title: string) {
  const normalized = title.trim().toLowerCase()
  if (!normalized) return false

  return !notes.some((note) => !note.archived && note.title.trim().toLowerCase() === normalized)
}

function propertySuggestionValue(propertyName: string, propertyValue: string, suggestion: string) {
  if (propertyName.trim().toLowerCase() !== 'tags') return suggestion

  const parts = propertyValue.split(',').map((part) => part.trim())
  const existing = parts.slice(0, -1).filter(Boolean)
  const withoutSuggestion = existing.filter((part) => part.toLowerCase() !== suggestion.toLowerCase())
  return [...withoutSuggestion, suggestion].join(', ')
}

function actionTitle(action: MobileWorkspaceAction, propertyName: string) {
  if (action === 'editProperty' && propertyName.trim()) return propertyName.trim()
  return actionTitleByAction[action]()
}

const actionTitleByAction: Record<MobileWorkspaceAction, () => string> = {
  addProperty: () => mobileText('inspector.properties.addProperty'),
  addRelationship: () => mobileText('inspector.relationship.addRelationship').replace(/^\+\s*/, ''),
  changeNoteType: () => mobileText('command.note.changeType'),
  createNote: () => mobileText('command.note.newNote'),
  createView: () => mobileText('viewDialog.title.create'),
  editProperty: () => mobileText('inspector.title.properties'),
  editView: () => mobileText('viewDialog.title.edit'),
  moreActions: () => mobileText('editor.toolbar.moreActions'),
  moveNoteToFolder: () => mobileText('command.note.moveToFolder'),
  renameNoteFile: () => mobileText('editor.filename.rename'),
  search: () => mobileText('noteList.searchAction'),
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(55, 53, 47, 0.14)',
  },
  chipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileSpace.xs,
  },
  content: {
    gap: mobileSpace.md,
    padding: mobileSpace.md,
  },
  emptyState: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: mobileColors.textMuted,
    fontSize: mobileType.body,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: mobileSpace.sm,
  },
  deleteViewButton: {
    marginRight: 'auto',
    borderRadius: 6,
    paddingHorizontal: mobileSpace.sm,
    paddingVertical: mobileSpace.xs,
  },
  deleteViewText: {
    color: mobileColors.red,
    fontSize: mobileType.body,
    fontWeight: '500',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: desktopPanelParity.toolbarHeight + mobileSpace.xl,
    zIndex: 20,
  },
  resultList: {
    borderColor: mobileColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionList: {
    gap: mobileSpace.xs,
  },
  suggestionRow: {
    minHeight: 34,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderRadius: 6,
    paddingHorizontal: mobileSpace.sm,
    paddingVertical: mobileSpace.xs,
  },
  suggestionRowPressed: {
    backgroundColor: mobileColors.graySoft,
  },
  suggestionTitle: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
    fontWeight: '500',
  },
  sheet: {
    maxHeight: 620,
    width: 520,
    borderColor: mobileColors.borderStrong,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000000',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
  },
})

const actionStyles = StyleSheet.create({
  actionRow: {
    minWidth: 0,
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: 4,
    paddingHorizontal: mobileSpace.sm,
    paddingVertical: mobileSpace.sm,
  },
  actionIcon: {
    width: desktopToolbarActionParity.iconSize,
    alignItems: 'center',
  },
  actionRowContent: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileSpace.sm,
  },
  actionRowPressed: {
    backgroundColor: mobileColors.control,
  },
  actionText: {
    minWidth: 0,
    flex: 1,
    flexShrink: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
  },
  actionTextDestructive: {
    color: mobileColors.red,
  },
  summary: {
    minWidth: 0,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: mobileSpace.md,
  },
  summaryTitle: {
    minWidth: 0,
    flex: 1,
    color: mobileColors.text,
    fontSize: mobileType.body,
    fontWeight: '500',
  },
})
