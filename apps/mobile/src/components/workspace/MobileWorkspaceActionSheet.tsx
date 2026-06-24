import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native'
import { ArrowSquareOut, CheckCircle, ClipboardText, FilePlus, FolderOpen, Trash } from 'phosphor-react-native'
import { Text } from '../ui/text'
import { mobileText } from '../../i18n/mobileText'
import { MobileButton } from '../../ui/MobileButton'
import { MobileChip } from '../../ui/MobileChip'
import { MobileListRow } from '../../ui/MobileListRow'
import { MobilePanel, MobileToolbar, MobileToolbarSpacer, MobileToolbarTitle } from '../../ui/MobilePanel'
import { MobileTextInput } from '../../ui/MobileTextInput'
import { desktopPanelParity, desktopToolbarActionParity } from '../../ui/desktopParity'
import { mobileColors, mobileRadius, mobileSpace, mobileType } from '../../ui/tokens'
import type { MobileEditorBlock, MobileNote, MobileSidebarIcon, MobileTone, MobileTypeDefinitions, MobileViewFilterGroup } from '../../workspace/mobileWorkspaceModel'
import type {
  MobileTypeSchemaProperty,
  MobileTypeSchemaRelationship,
} from '../../workspace/mobileTypeDefinitionSchema'
import {
  mobileQuickOpenMoveIndex,
  mobileQuickOpenResults,
  mobileQuickOpenSelectedNote,
} from '../../workspace/mobileQuickOpen'
import {
  canSubmitMobilePropertyValue,
  isMobileListPropertyKey,
  mobilePropertyValueKindForKey,
  type MobilePropertyValueKind,
} from '../../workspace/mobilePropertyValues'
import {
  validateMobileMoveNoteFolderPath,
  validateMobileRenameNoteFilePath,
  type MobileNotePathValidationStatus,
} from '../../workspace/mobileNotePaths'
import { mobileWikilinkTargetForNote } from '../../workspace/mobileWikilinks'
import {
  mobilePropertyKeySuggestions,
  mobilePropertyValueSuggestions,
  mobileFolderSuggestions,
  mobileRelationshipKeySuggestions,
  mobileRelationshipTargetSuggestions,
  mobileTypeSuggestions,
  shouldShowMobileRelationshipCreateTarget,
} from '../../workspace/mobileWorkspaceSuggestions'
import { MobileTypeIcon } from './MobileWorkspaceIcons'
import { MobileMetadataPicker } from './MobileMetadataPicker'
import { MobileSortPicker } from './MobileSortPicker'
import { MobilePropertyValueEditor } from './MobilePropertyValueEditor'
import { MobileTypeSectionEditor } from './MobileTypeSectionEditor'
import { MobileTypeVisibilityEditor } from './MobileTypeVisibilityEditor'
import { MobileViewDisplayPropertiesPicker } from './MobileViewDisplayPropertiesPicker'
import { MobileViewFilterBuilder } from './MobileViewFilterBuilder'
import { MobileEditorFindSheet } from './MobileEditorFindSheet'
import { MobileTableOfContentsSheet } from './MobileTableOfContentsSheet'
import type { MobileTableOfContentsTarget } from '../../workspace/mobileTableOfContents'
import { MoreActionsContent } from './MobileWorkspaceMoreActionsContent'
import { MobileFavoriteActions, MobileSavedViewActions, MobileTypeSectionActions } from './MobileWorkspaceMoveActions'
import { MobileWorkspaceSuggestionList } from './MobileWorkspaceSuggestionList'
import type { MobileWorkspaceSuggestionItem } from './MobileWorkspaceSuggestionList'
import { chipTone, noteTypeSoftColor, statusTone, tagTone } from './mobileWorkspaceTone'
import { mobileSingleTextFieldSubmitDisabled } from './MobileWorkspaceActionSheetModel'

export type MobileWorkspaceAction =
  | 'addProperty'
  | 'addRelationship'
  | 'changeNoteType'
  | 'createFolder'
  | 'createNote'
  | 'createType'
  | 'createView'
  | 'editFolder'
  | 'editFavorite'
  | 'editProperty'
  | 'editPrimaryListProperties'
  | 'editTypeSection'
  | 'editTypeVisibility'
  | 'editView'
  | 'findInNote'
  | 'moreActions'
  | 'moveNoteToFolder'
  | 'renameNoteFile'
  | 'replaceInNote'
  | 'search'
  | 'setNoteIcon'
  | 'tableOfContents'

export type MobileWorkspaceActionSheetProps = {
  action: MobileWorkspaceAction
  allNotesShowImages: boolean
  allNotesShowPdfs: boolean
  allNotesShowUnsupported: boolean
  canMoveFavoriteDown: boolean
  canMoveFavoriteUp: boolean
  canMoveTypeDown: boolean
  canMoveTypeUp: boolean
  canMoveViewDown: boolean
  canMoveViewUp: boolean
  canRedoWorkspaceEdit: boolean
  canUndoWorkspaceEdit: boolean
  canDeleteType: boolean
  createTitle: string
  editorBlocks: MobileEditorBlock[]
  editorBullets: string[]
  filenameStem: string
  folderPaths?: string[]
  folderName: string
  folderPath: string
  notes: MobileNote[]
  noteIcon: string
  noteType: string
  primaryDisplayProperties: string[]
  primaryItemId: string
  primaryPropertyOptions: string[]
  primaryPropertyQuery: string
  onChangeNoteType: () => void
  onChangeNoteTypeInputChange: (value: string) => void
  onClose: () => void
  onCopyFolderPath: () => void
  onCreateFolder: () => void
  onCreateNote: (titleOverride?: string) => void
  onCreateRelationshipTarget: () => void
  onCreateTitleChange: (value: string) => void
  onCopyDeepLink: () => void
  onCopyFilePath: () => void
  onCreateType: () => void
  onCreateView: () => void
  onDeleteFolder: () => void
  onDeleteNote: () => void
  onEnterNeighborhood: (noteId: string) => void
  onExportNoteAsPdf: () => void
  onDeleteType: () => void
  onDeleteView: () => void
  onFilenameStemChange: (value: string) => void
  onFolderNameChange: (value: string) => void
  onFolderPathChange: (value: string) => void
  onMoveFavoriteDown: () => void
  onMoveFavoriteUp: () => void
  onMoveNoteToFolder: () => void
  onMoveTypeDown: () => void
  onMoveTypeUp: () => void
  onMoveViewDown: () => void
  onMoveViewUp: () => void
  onNoteIconChange: (value: string) => void
  onOpenChangeNoteType: () => void
  onOpenCreateChildFolder: () => void
  onOpenCreateNoteInFolder: () => void
  onOpenFileInDefaultApp: () => void
  onOpenFindInNote: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenReplaceInNote: () => void
  onOpenRenameNoteFile: () => void
  onOpenSetNoteIcon: () => void
  onOpenTableOfContents: () => void
  onSelectTableOfContentsTarget?: (target: MobileTableOfContentsTarget) => void
  onPrimaryAllNotesShowImagesChange: (value: boolean) => void
  onPrimaryAllNotesShowPdfsChange: (value: boolean) => void
  onPrimaryAllNotesShowUnsupportedChange: (value: boolean) => void
  onPrimaryDisplayPropertiesChange: (value: string[]) => void
  onPrimaryPropertyQueryChange: (value: string) => void
  onPropertyNameChange: (value: string) => void
  onPropertyValueChange: (value: string) => void
  onPropertyValueKindChange: (value: MobilePropertyValueKind) => void
  onRelationshipNameChange: (value: string) => void
  onRelationshipNoteSelect: (title: string, ref: string) => void
  onRelationshipNoteTitleChange: (value: string) => void
  onSaveProperty: () => void
  onSavePrimaryNoteListProperties: () => void
  onSaveRelationship: () => void
  onSaveTypeDefinition: () => void
  onRenameFolder: () => void
  onRevealFolder: () => void
  onRevealFile: () => void
  onRenameNoteFile: () => void
  onRenameNoteFileToTitle: () => void
  onRedoWorkspaceEdit: () => void
  onRemoveNoteIcon: () => void
  onSaveView: () => void
  onSearchQueryChange: (value: string) => void
  onSelectNote: (noteId: string) => void
  onSetArchived: (archived: boolean) => void
  onSetNoteIcon: () => void
  onSetOrganized: (organized: boolean) => void
  onToggleFavorite: () => void
  onToggleNoteWidth: () => void
  onToggleTypeVisibility: (typeName: string) => void
  onUndoWorkspaceEdit: () => void
  onUpdateNoteContent: (noteId: string, content: string) => void
  onViewIconChange: (value: MobileSidebarIcon) => void
  onViewDisplayPropertiesChange: (value: string[]) => void
  onViewFiltersChange: (value: MobileViewFilterGroup) => void
  onViewNameChange: (value: string) => void
  onViewPropertyQueryChange: (value: string) => void
  onViewSortChange: (value: string) => void
  onViewToneChange: (value: MobileTone) => void
  propertyName: string
  propertyValue: string
  propertyValueKind: MobilePropertyValueKind
  relationshipName: string
  relationshipNoteTitle: string
  searchQuery: string
  selectedNote: MobileNote | null
  typeDisplayProperties: string[]
  typeDefinitions?: MobileTypeDefinitions
  typeName: string
  typePropertyOptions: string[]
  typePropertyQuery: string
  typeSortPropertyOptions: string[]
  typeRelationshipTargetOptions: MobileWorkspaceSuggestionItem[]
  typeSchemaProperties: MobileTypeSchemaProperty[]
  typeSchemaPropertyName: string
  typeSchemaPropertyNameOptions: string[]
  typeSchemaPropertyValue: string
  typeSchemaRelationships: MobileTypeSchemaRelationship[]
  typeSchemaRelationshipName: string
  typeSchemaRelationshipNameOptions: string[]
  typeSchemaRelationshipTarget: string
  typeSectionLabel: string
  typeRenameName: string
  typeSort: string
  typeTemplate: string
  typeIcon: string
  typeTone: string
  typeVisible: boolean
  viewDisplayProperties: string[]
  viewFilters: MobileViewFilterGroup
  viewIcon: string
  viewName: string
  viewPropertyOptions: string[]
  viewPropertyQuery: string
  viewSortPropertyOptions: string[]
  viewSort: string
  viewTone: string | null
  onTypeDisplayPropertiesChange: (value: string[]) => void
  onTypeNameChange: (value: string) => void
  onTypePropertyQueryChange: (value: string) => void
  onTypeSchemaPropertyAdd: () => void
  onTypeSchemaPropertyNameChange: (value: string) => void
  onTypeSchemaPropertyRemove: (index: number) => void
  onTypeSchemaPropertyValueChange: (value: string) => void
  onTypeSchemaRelationshipAdd: () => void
  onTypeSchemaRelationshipNameChange: (value: string) => void
  onTypeSchemaRelationshipRemove: (index: number) => void
  onTypeSchemaRelationshipTargetSelect: (title: string, ref: string) => void
  onTypeSchemaRelationshipTargetChange: (value: string) => void
  onTypeSectionLabelChange: (value: string) => void
  onTypeRenameNameChange: (value: string) => void
  onTypeSortChange: (value: string) => void
  onTypeTemplateChange: (value: string) => void
  onTypeIconChange: (value: MobileSidebarIcon) => void
  onTypeToneChange: (value: MobileTone) => void
  onTypeVisibleChange: (value: boolean) => void
}

type SingleTextFieldConfig = {
  allowEmptyInput?: boolean
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
  submitDisabled?: boolean
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
  submitDisabled?: boolean
  suggestionTestId: string
  suggestionTestIdPrefix: string
  suggestions: string[]
}
type RetargetNoteAction = 'changeType' | 'moveFolder'

export function MobileWorkspaceActionSheet(props: MobileWorkspaceActionSheetProps) {
  return (
    <View style={styles.overlay} testID="workspace-action-sheet">
      <Pressable accessibilityLabel={mobileText('common.cancel')} style={styles.backdrop} testID="workspace-action-sheet-backdrop" onPress={props.onClose} />
      <MobilePanel style={sheetStyles.sheet} testID={`workspace-action-sheet-${props.action}`}>
        <MobileToolbar testID="workspace-action-sheet-toolbar">
          <MobileToolbarTitle title={actionTitle(props.action, props.propertyName)} />
          <MobileToolbarSpacer />
          <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={props.onClose} />
        </MobileToolbar>
        <ActionContent {...props} />
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
  createFolder: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  createNote: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  createType: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  createView: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  editFolder: (props) => <FolderActionsContent {...props} />,
  editFavorite: (props) => <FavoriteActionsContent {...props} />,
  editProperty: (props) => <AddPropertyContent {...props} />,
  editPrimaryListProperties: (props) => <PrimaryListPropertiesContent {...props} />,
  editTypeSection: (props) => <TypeSectionContent {...props} />,
  editTypeVisibility: (props) => <MobileTypeVisibilityEditor typeDefinitions={props.typeDefinitions} onToggleTypeVisibility={props.onToggleTypeVisibility} />,
  editView: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  findInNote: (props) => <MobileEditorFindSheet editorBlocks={props.editorBlocks} editorBullets={props.editorBullets} note={props.selectedNote} replace={false} onClose={props.onClose} onUpdateContent={props.onUpdateNoteContent} />,
  moreActions: (props) => <MoreActionsContent {...props} />,
  moveNoteToFolder: (props) => <RetargetNoteContent {...props} retargetAction="moveFolder" />,
  renameNoteFile: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  replaceInNote: (props) => <MobileEditorFindSheet editorBlocks={props.editorBlocks} editorBullets={props.editorBullets} note={props.selectedNote} replace onClose={props.onClose} onUpdateContent={props.onUpdateNoteContent} />,
  search: (props) => <SearchContent {...props} />,
  setNoteIcon: (props) => <SingleTextFieldContent config={singleTextFieldConfig(props)} />,
  tableOfContents: (props) => (
    <MobileTableOfContentsSheet
      blocks={props.editorBlocks}
      bullets={props.editorBullets}
      note={props.selectedNote}
      onClose={props.onClose}
      onSelectTarget={props.onSelectTableOfContentsTarget}
    />
  ),
}

function SearchContent({
  notes,
  onCreateNote,
  onClose,
  onSearchQueryChange,
  onSelectNote,
  searchQuery,
}: MobileWorkspaceActionSheetProps) {
  const searchResults = useMemo(() => mobileQuickOpenResults(notes, searchQuery), [notes, searchQuery])
  const [selectedResultIndex, setSelectedResultIndex] = useState(0)
  const createTitle = searchQuery.trim()
  const canCreateFromQuery = createTitle.length > 0 && searchResults.length === 0

  useEffect(() => {
    setSelectedResultIndex(0) // eslint-disable-line react-hooks/set-state-in-effect -- reset when quick-open results change
  }, [searchQuery, searchResults.length])

  const selectResult = (note: MobileNote) => {
    onSelectNote(note.id)
    onSearchQueryChange('')
    onClose()
  }

  const createFromQuery = () => {
    if (!canCreateFromQuery) return
    onCreateNote(createTitle)
    onSearchQueryChange('')
  }

  const selectActiveResult = () => {
    const selectedNote = mobileQuickOpenSelectedNote(searchResults, selectedResultIndex)
    if (selectedNote) {
      selectResult(selectedNote)
      return
    }
    createFromQuery()
  }

  const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key === 'ArrowDown') {
      setSelectedResultIndex((index) => mobileQuickOpenMoveIndex(index, searchResults.length, 'next'))
    } else if (event.nativeEvent.key === 'ArrowUp') {
      setSelectedResultIndex((index) => mobileQuickOpenMoveIndex(index, searchResults.length, 'previous'))
    } else if (event.nativeEvent.key === 'Enter') {
      selectActiveResult()
    } else if (event.nativeEvent.key === 'Escape') {
      onSearchQueryChange('')
      onClose()
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
      <MobileTextInput
        autoFocus
        label={mobileText('noteList.searchAction')}
        placeholder={mobileText('noteList.searchPlaceholder')}
        testID="workspace-search-input"
        value={searchQuery}
        onChangeText={onSearchQueryChange}
        onKeyPress={handleKeyPress}
        onSubmitEditing={selectActiveResult}
      />
      <ScrollView contentContainerStyle={styles.resultList} keyboardShouldPersistTaps="handled" testID="workspace-search-results">
        {searchResults.length === 0 ? (
          <>
            <EmptyState>{mobileText('noteList.empty.noMatching')}</EmptyState>
            {canCreateFromQuery ? (
              <ActionRow
                icon={<FilePlus color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
                label={quickOpenCreateLabel(createTitle)}
                testID="workspace-search-create-note"
                onPress={createFromQuery}
              />
            ) : null}
          </>
        ) : null}
        {searchResults.map((note, index) => (
          <MobileListRow
            key={note.id}
            chips={<NoteRowChips note={note} />}
            selected={index === selectedResultIndex}
            selectedBackgroundColor={noteTypeSoftColor(note.typeTone)}
            subtitle={note.snippet}
            testID={`workspace-search-result-${note.id}`}
            title={note.title}
            trailing={<MobileTypeIcon size={16} tone={note.typeTone} type={note.type} />}
            onPress={() => selectResult(note)}
          />
        ))}
      </ScrollView>
    </ScrollView>
  )
}

function quickOpenCreateLabel(title: string): string {
  return mobileText('noteList.quickOpenCreate').replace('{title}', title)
}

function SingleTextFieldContent({ config }: { config: SingleTextFieldConfig }) {
  const {
    allowEmptyInput,
    extraContent,
    inputLabel,
    inputPlaceholder,
    inputTestId,
    inputValue,
    onCancel,
    onChangeText,
    onSubmit,
    secondaryAction,
    submitDisabled = false,
    submitLabel,
  } = config

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
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
        <MobileButton
          disabled={mobileSingleTextFieldSubmitDisabled({ allowEmptyInput, inputValue, submitDisabled })}
          label={submitLabel}
          variant="primary"
          onPress={onSubmit}
        />
      </SheetFooter>
    </ScrollView>
  )
}

function singleTextFieldConfig(props: MobileWorkspaceActionSheetProps) {
  if (props.action === 'createFolder') {
    return {
      inputLabel: mobileText('sidebar.folder.name'),
      inputPlaceholder: mobileText('sidebar.folder.name'),
      inputTestId: 'workspace-create-folder-name-input',
      inputValue: props.folderName,
      onCancel: props.onClose,
      onChangeText: props.onFolderNameChange,
      onSubmit: props.onCreateFolder,
      submitLabel: mobileText('common.create'),
    }
  }

  if (props.action === 'editView') {
    return {
      extraContent: editViewContent(props),
      inputLabel: mobileText('viewDialog.nameLabel'),
      inputPlaceholder: mobileText('viewDialog.namePlaceholder'),
      inputTestId: 'workspace-edit-view-name-input',
      inputValue: props.viewName,
      onCancel: props.onClose,
      onChangeText: props.onViewNameChange,
      onSubmit: props.onSaveView,
      secondaryAction: (
        <MobileSavedViewActions
          canMoveDown={props.canMoveViewDown}
          canMoveUp={props.canMoveViewUp}
          onDelete={props.onDeleteView}
          onMoveDown={props.onMoveViewDown}
          onMoveUp={props.onMoveViewUp}
        />
      ),
      submitLabel: mobileText('common.save'),
    }
  }

  if (props.action === 'createView') {
    return {
      extraContent: editViewContent(props),
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

  if (props.action === 'createType') {
    return {
      inputLabel: mobileText('sidebar.action.createType'),
      inputPlaceholder: mobileText('sidebar.action.createType'),
      inputTestId: 'workspace-create-type-name-input',
      inputValue: props.typeName,
      onCancel: props.onClose,
      onChangeText: props.onTypeNameChange,
      onSubmit: props.onCreateType,
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
      submitDisabled: notePathValidationBlocksSubmit(renameNoteFileValidation(props)),
      submitLabel: mobileText('common.save'),
    }
  }

  if (props.action === 'setNoteIcon') {
    return {
      inputLabel: mobileText('command.note.setIcon'),
      inputPlaceholder: mobileText('command.note.setIcon'),
      inputTestId: 'workspace-note-icon-input',
      inputValue: props.noteIcon,
      onCancel: props.onClose,
      onChangeText: props.onNoteIconChange,
      onSubmit: props.onSetNoteIcon,
      secondaryAction: props.selectedNote?.icon ? (
        <MobileButton label={mobileText('command.note.removeIcon')} variant="ghost" onPress={props.onRemoveNoteIcon} />
      ) : undefined,
      submitLabel: mobileText('common.save'),
    }
  }

  return {
    allowEmptyInput: true,
    inputLabel: mobileText('command.note.newNote'),
    inputPlaceholder: mobileText('noteList.createNote'),
    inputTestId: 'workspace-create-note-title-input',
    inputValue: props.createTitle,
    onCancel: props.onClose,
    onChangeText: props.onCreateTitleChange,
    onSubmit: () => props.onCreateNote(),
    submitLabel: mobileText('common.create'),
  }
}

function viewFilterBuilder(props: MobileWorkspaceActionSheetProps) {
  return (
    <>
      <MobileMetadataPicker
        selectedIcon={props.viewIcon}
        selectedTone={props.viewTone}
        testIDPrefix="workspace-view"
        onIconSelect={props.onViewIconChange}
        onToneSelect={props.onViewToneChange}
      />
      <MobileSortPicker
        customPropertyOptions={props.viewSortPropertyOptions}
        selectedSort={props.viewSort}
        testID="workspace-view-sort-picker"
        testIDPrefix="workspace-view-sort"
        onSelect={props.onViewSortChange}
      />
      <MobileViewFilterBuilder
        group={props.viewFilters}
        notes={props.notes}
        typeDefinitions={props.typeDefinitions}
        onChange={props.onViewFiltersChange}
      />
    </>
  )
}

function editViewContent(props: MobileWorkspaceActionSheetProps) {
  return (
    <>
      {viewFilterBuilder(props)}
      <ViewDisplayPropertiesPicker {...props} />
    </>
  )
}

function FolderActionsContent(props: MobileWorkspaceActionSheetProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
      <MobileTextInput
        autoFocus
        label={mobileText('sidebar.folder.newName')}
        placeholder={mobileText('sidebar.folder.newName')}
        testID="workspace-rename-folder-input"
        value={props.folderName}
        onChangeText={props.onFolderNameChange}
      />
      <ActionRow
        icon={<FilePlus color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('sidebar.action.createNodeInFolderMenu')}
        testID="workspace-action-create-note-in-folder"
        onPress={props.onOpenCreateNoteInFolder}
      />
      <ActionRow
        icon={<FolderOpen color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('sidebar.action.createFolder')}
        testID="workspace-action-create-child-folder"
        onPress={props.onOpenCreateChildFolder}
      />
      <ActionRow
        icon={<ClipboardText color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('sidebar.action.copyFolderPathMenu')}
        testID="workspace-action-copy-folder-path"
        onPress={props.onCopyFolderPath}
      />
      <ActionRow
        icon={<ArrowSquareOut color={mobileColors.textMuted} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('sidebar.action.revealFolderMenu')}
        testID="workspace-action-reveal-folder"
        onPress={props.onRevealFolder}
      />
      <ActionRow
        destructive
        icon={<Trash color={mobileColors.red} size={desktopToolbarActionParity.iconSize} />}
        label={mobileText('sidebar.action.deleteFolder')}
        testID="workspace-action-delete-folder"
        onPress={props.onDeleteFolder}
      />
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={props.onClose} />
        <MobileButton disabled={props.folderName.trim().length === 0} label={mobileText('common.save')} variant="primary" onPress={props.onRenameFolder} />
      </SheetFooter>
    </ScrollView>
  )
}

function FavoriteActionsContent(props: MobileWorkspaceActionSheetProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
      <MobileFavoriteActions
        canMoveDown={props.canMoveFavoriteDown}
        canMoveUp={props.canMoveFavoriteUp}
        onMoveDown={props.onMoveFavoriteDown}
        onMoveUp={props.onMoveFavoriteUp}
      />
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={props.onClose} />
      </SheetFooter>
    </ScrollView>
  )
}

function TypeSectionContent(props: MobileWorkspaceActionSheetProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
      <MobileTypeSectionActions
        canDelete={props.canDeleteType}
        canMoveDown={props.canMoveTypeDown}
        canMoveUp={props.canMoveTypeUp}
        onDelete={props.onDeleteType}
        onMoveDown={props.onMoveTypeDown}
        onMoveUp={props.onMoveTypeUp}
      />
      <MobileTypeSectionEditor
        displayProperties={props.typeDisplayProperties}
        notes={props.notes}
        propertyOptions={props.typePropertyOptions}
        propertyQuery={props.typePropertyQuery}
        relationshipTargetOptions={props.typeRelationshipTargetOptions}
        schemaProperties={props.typeSchemaProperties}
        schemaPropertyName={props.typeSchemaPropertyName}
        schemaPropertyNameOptions={props.typeSchemaPropertyNameOptions}
        schemaPropertyValue={props.typeSchemaPropertyValue}
        schemaRelationships={props.typeSchemaRelationships}
        schemaRelationshipName={props.typeSchemaRelationshipName}
        schemaRelationshipNameOptions={props.typeSchemaRelationshipNameOptions}
        schemaRelationshipTarget={props.typeSchemaRelationshipTarget}
        sectionLabel={props.typeSectionLabel}
        sort={props.typeSort}
        sortPropertyOptions={props.typeSortPropertyOptions}
        template={props.typeTemplate}
        typeIcon={props.typeIcon}
        tone={props.typeTone}
        typeName={props.typeName}
        typeRenameName={props.typeRenameName}
        visible={props.typeVisible}
        onDisplayPropertiesChange={props.onTypeDisplayPropertiesChange}
        onPropertyQueryChange={props.onTypePropertyQueryChange}
        onSchemaPropertyAdd={props.onTypeSchemaPropertyAdd}
        onSchemaPropertyNameChange={props.onTypeSchemaPropertyNameChange}
        onSchemaPropertyRemove={props.onTypeSchemaPropertyRemove}
        onSchemaPropertyValueChange={props.onTypeSchemaPropertyValueChange}
        onSchemaRelationshipAdd={props.onTypeSchemaRelationshipAdd}
        onSchemaRelationshipNameChange={props.onTypeSchemaRelationshipNameChange}
        onSchemaRelationshipRemove={props.onTypeSchemaRelationshipRemove}
        onSchemaRelationshipTargetSelect={props.onTypeSchemaRelationshipTargetSelect}
        onSchemaRelationshipTargetChange={props.onTypeSchemaRelationshipTargetChange}
        onSectionLabelChange={props.onTypeSectionLabelChange}
        onSortChange={props.onTypeSortChange}
        onTemplateChange={props.onTypeTemplateChange}
        onTypeIconChange={props.onTypeIconChange}
        onTypeRenameNameChange={props.onTypeRenameNameChange}
        onToneChange={props.onTypeToneChange}
        onVisibleChange={props.onTypeVisibleChange}
      />
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={props.onClose} />
        <MobileButton disabled={props.typeRenameName.trim().length === 0} label={mobileText('common.save')} variant="primary" onPress={props.onSaveTypeDefinition} />
      </SheetFooter>
    </ScrollView>
  )
}

function ViewDisplayPropertiesPicker({
  onViewDisplayPropertiesChange,
  onViewPropertyQueryChange,
  viewDisplayProperties,
  viewPropertyOptions,
  viewPropertyQuery,
}: MobileWorkspaceActionSheetProps) {
  return (
    <MobileViewDisplayPropertiesPicker
      options={viewPropertyOptions}
      query={viewPropertyQuery}
      selectedProperties={viewDisplayProperties}
      onQueryChange={onViewPropertyQueryChange}
      onSelectedPropertiesChange={onViewDisplayPropertiesChange}
    />
  )
}

function PrimaryListPropertiesContent(props: MobileWorkspaceActionSheetProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
      <MobileViewDisplayPropertiesPicker
        options={props.primaryPropertyOptions}
        query={props.primaryPropertyQuery}
        selectedProperties={props.primaryDisplayProperties}
        testIDPrefix="workspace-primary-property"
        onQueryChange={props.onPrimaryPropertyQueryChange}
        onSelectedPropertiesChange={props.onPrimaryDisplayPropertiesChange}
      />
      {props.primaryItemId === 'all-notes' ? <AllNotesFileVisibilityContent {...props} /> : null}
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={props.onClose} />
        <MobileButton label={mobileText('common.save')} variant="primary" onPress={props.onSavePrimaryNoteListProperties} />
      </SheetFooter>
    </ScrollView>
  )
}

function AllNotesFileVisibilityContent({
  allNotesShowImages,
  allNotesShowPdfs,
  allNotesShowUnsupported,
  onPrimaryAllNotesShowImagesChange,
  onPrimaryAllNotesShowPdfsChange,
  onPrimaryAllNotesShowUnsupportedChange,
}: MobileWorkspaceActionSheetProps) {
  return (
    <View style={styles.visibilitySection} testID="workspace-all-notes-file-visibility">
      <View style={styles.visibilityHeader}>
        <Text style={styles.visibilityTitle}>{mobileText('settings.allNotesVisibility.title')}</Text>
        <Text style={styles.visibilityDescription}>{mobileText('settings.allNotesVisibility.description')}</Text>
      </View>
      <VisibilitySwitchRow
        active={allNotesShowPdfs}
        description={mobileText('settings.allNotesVisibility.pdfsDescription')}
        label={mobileText('settings.allNotesVisibility.pdfs')}
        testID="workspace-all-notes-show-pdfs"
        onChange={onPrimaryAllNotesShowPdfsChange}
      />
      <VisibilitySwitchRow
        active={allNotesShowImages}
        description={mobileText('settings.allNotesVisibility.imagesDescription')}
        label={mobileText('settings.allNotesVisibility.images')}
        testID="workspace-all-notes-show-images"
        onChange={onPrimaryAllNotesShowImagesChange}
      />
      <VisibilitySwitchRow
        active={allNotesShowUnsupported}
        description={mobileText('settings.allNotesVisibility.unsupportedDescription')}
        label={mobileText('settings.allNotesVisibility.unsupported')}
        testID="workspace-all-notes-show-unsupported"
        onChange={onPrimaryAllNotesShowUnsupportedChange}
      />
    </View>
  )
}

function VisibilitySwitchRow({
  active,
  description,
  label,
  onChange,
  testID,
}: {
  active: boolean
  description: string
  label: string
  onChange: (value: boolean) => void
  testID: string
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      aria-checked={active}
      style={({ pressed }) => [styles.visibilityRow, pressed ? styles.visibilityRowPressed : null]}
      testID={testID}
      onPress={() => onChange(!active)}
    >
      <CheckCircle color={active ? mobileColors.primary : mobileColors.textFaint} size={16} weight={active ? 'fill' : 'regular'} />
      <View style={styles.visibilityText}>
        <Text style={styles.visibilityLabel}>{label}</Text>
        <Text style={styles.visibilityDescription}>{description}</Text>
      </View>
    </Pressable>
  )
}

function AddPropertyContent({
  action,
  notes,
  onClose,
  onPropertyNameChange,
  onPropertyValueChange,
  onPropertyValueKindChange,
  onSaveProperty,
  propertyName,
  propertyValue,
  propertyValueKind,
  selectedNote,
  typeDefinitions,
}: MobileWorkspaceActionSheetProps) {
  const editingProperty = action === 'editProperty'
  const lockedListKind = isMobileListPropertyKey(propertyName)
  const selectedValueKind = mobilePropertyValueKindForKey(propertyName, propertyValueKind)
  const canSaveProperty = canSubmitMobilePropertyValue({
    key: propertyName,
    kind: propertyValueKind,
    valueText: propertyValue,
  })
  const keySuggestions = editingProperty ? [] : mobilePropertyKeySuggestions(notes, selectedNote, propertyName, typeDefinitions)
  const valueSuggestions = mobilePropertyValueSuggestions(notes, propertyName, propertyValue, selectedValueKind, {
    selectedNote,
    typeDefinitions,
  })

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
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
      <MobilePropertyValueEditor
        kind={selectedValueKind}
        lockedListKind={lockedListKind}
        propertyName={propertyName}
        suggestions={valueSuggestions}
        value={propertyValue}
        onKindChange={onPropertyValueKindChange}
        onValueChange={onPropertyValueChange}
      />
      <SheetFooter>
        <MobileButton label={mobileText('common.cancel')} variant="ghost" onPress={onClose} />
        <MobileButton disabled={!canSaveProperty} label={mobileText('common.save')} variant="primary" onPress={onSaveProperty} />
      </SheetFooter>
    </ScrollView>
  )
}

function AddRelationshipContent({
  notes,
  onClose,
  onCreateRelationshipTarget,
  onRelationshipNameChange,
  onRelationshipNoteSelect,
  onRelationshipNoteTitleChange,
  onSaveRelationship,
  relationshipName,
  relationshipNoteTitle,
  selectedNote,
  typeDefinitions,
}: MobileWorkspaceActionSheetProps) {
  const keySuggestions = mobileRelationshipKeySuggestions(notes, relationshipName, selectedNote, typeDefinitions)
  const suggestions = mobileRelationshipTargetSuggestions(notes, relationshipNoteTitle, {
    relationshipKey: relationshipName,
    selectedNote,
  })
  const createTargetTitle = relationshipNoteTitle.trim()
  const showCreateTarget = shouldShowMobileRelationshipCreateTarget(notes, createTargetTitle)

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
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
              onPress={() => onRelationshipNoteSelect(note.title, `[[${mobileWikilinkTargetForNote(note, selectedNote)}]]`)}
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
    </ScrollView>
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
    submitDisabled: notePathValidationBlocksSubmit(moveNoteToFolderValidation(props)),
    suggestionTestId: 'workspace-move-folder-suggestions',
    suggestionTestIdPrefix: 'workspace-move-folder-suggestion',
    suggestions: mobileFolderSuggestions(props.notes, props.selectedNote, props.folderPath, props.folderPaths),
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
        <MobileButton disabled={config.submitDisabled || config.inputValue.trim().length === 0} label={config.submitLabel} variant="primary" onPress={config.onSubmit} />
      </SheetFooter>
    </View>
  )
}

function renameNoteFileValidation(props: MobileWorkspaceActionSheetProps): MobileNotePathValidationStatus {
  return validateMobileRenameNoteFilePath({
    filenameStem: props.filenameStem,
    note: props.selectedNote,
    notes: props.notes,
  })
}

function moveNoteToFolderValidation(props: MobileWorkspaceActionSheetProps): MobileNotePathValidationStatus {
  return validateMobileMoveNoteFolderPath({
    folderPath: props.folderPath,
    folderPaths: props.folderPaths,
    note: props.selectedNote,
    notes: props.notes,
  })
}

function notePathValidationBlocksSubmit(status: MobileNotePathValidationStatus) {
  return status !== 'ok'
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

function actionTitle(action: MobileWorkspaceAction, propertyName: string) {
  if (action === 'editProperty' && propertyName.trim()) return propertyName.trim()
  return actionTitleByAction[action]()
}

const actionTitleByAction: Record<MobileWorkspaceAction, () => string> = {
  addProperty: () => mobileText('inspector.properties.addProperty'),
  addRelationship: () => mobileText('inspector.relationship.addRelationship').replace(/^\+\s*/, ''),
  changeNoteType: () => mobileText('command.note.changeType'),
  createFolder: () => mobileText('sidebar.action.createFolder'),
  createNote: () => mobileText('command.note.newNote'),
  createType: () => mobileText('sidebar.action.createType'),
  createView: () => mobileText('viewDialog.title.create'),
  editFolder: () => mobileText('sidebar.action.renameFolder'),
  editFavorite: () => mobileText('sidebar.group.favorites'),
  editProperty: () => mobileText('inspector.title.properties'),
  editPrimaryListProperties: () => mobileText('noteList.properties.customizeColumns'),
  editTypeSection: () => mobileText('sidebar.section.name'),
  editTypeVisibility: () => mobileText('sidebar.section.showInSidebar'),
  editView: () => mobileText('viewDialog.title.edit'),
  findInNote: () => mobileText('command.note.findInNote'),
  moreActions: () => mobileText('editor.toolbar.moreActions'),
  moveNoteToFolder: () => mobileText('command.note.moveToFolder'),
  renameNoteFile: () => mobileText('editor.filename.rename'),
  replaceInNote: () => mobileText('command.note.replaceInNote'),
  search: () => mobileText('noteList.searchAction'),
  setNoteIcon: () => mobileText('command.note.setIcon'),
  tableOfContents: () => mobileText('tableOfContents.title'),
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
    alignSelf: 'stretch',
    gap: mobileSpace.md,
    padding: mobileSpace.lg,
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
    borderTopColor: mobileColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: mobileSpace.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: mobileSpace.xl,
    paddingVertical: desktopPanelParity.toolbarHeight + mobileSpace.xl,
    zIndex: 20,
  },
  resultList: {
    borderColor: mobileColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scrollArea: {
    flexShrink: 1,
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
  visibilityDescription: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
    lineHeight: 16,
  },
  visibilityHeader: {
    gap: mobileSpace.xs,
  },
  visibilityLabel: {
    color: mobileColors.text,
    fontSize: mobileType.body,
    fontWeight: '500',
  },
  visibilityRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderRadius: 6,
    padding: mobileSpace.sm,
  },
  visibilityRowPressed: {
    backgroundColor: mobileColors.control,
  },
  visibilitySection: {
    gap: mobileSpace.xs,
    borderColor: mobileColors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: mobileSpace.md,
  },
  visibilityText: {
    minWidth: 0,
    flex: 1,
    gap: 2,
  },
  visibilityTitle: {
    color: mobileColors.textMuted,
    fontSize: mobileType.caption,
    fontWeight: '500',
  },
})

const sheetStyles = StyleSheet.create({
  sheet: {
    maxHeight: '84%',
    maxWidth: 640,
    width: '100%',
    backgroundColor: mobileColors.card,
    borderColor: mobileColors.borderStrong,
    borderRadius: mobileRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
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
})
