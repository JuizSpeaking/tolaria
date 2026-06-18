import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type { MobileWorkspaceSuggestionItem } from '../components/workspace/MobileWorkspaceSuggestionList'
import type {
  MobileSidebarFolderSelection,
  MobileSidebarItemSelection,
} from '../components/workspace/MobileWorkspaceSidebar'
import type {
  MobileEditorBlock,
  MobileNote,
  MobilePropertyValue,
  MobileSidebarIcon,
  MobileTone,
  MobileViewFilterGroup,
  MobileWorkspaceSnapshot,
} from '../workspace/mobileWorkspaceModel'
import type {
  MobileTypeSchemaProperty,
  MobileTypeSchemaRelationship,
} from '../workspace/mobileTypeDefinitionSchema'
import type { MobilePropertyValueKind } from '../workspace/mobilePropertyValues'
import type {
  NoteCountText,
  NoteId,
  ReadOnlyFormValue,
  SearchQuery,
  SidebarLabel,
} from './tabletWorkspaceNavigation'
import type { EditorEditingMode } from './TabletEditorPanel'

export type TabletPanel = 'noteList' | 'properties' | 'sidebar'
export type TabletReadOnlyForm = {
  createTitle: ReadOnlyFormValue
  editingFolderPath: ReadOnlyFormValue
  editingViewId: ReadOnlyFormValue
  filenameStem: ReadOnlyFormValue
  folderName: ReadOnlyFormValue
  folderParentPath: ReadOnlyFormValue
  folderPath: ReadOnlyFormValue
  noteIcon: ReadOnlyFormValue
  noteType: ReadOnlyFormValue
  propertyName: ReadOnlyFormValue
  propertyValue: ReadOnlyFormValue
  propertyValueKind: MobilePropertyValueKind
  relationshipName: ReadOnlyFormValue
  relationshipNoteRef: ReadOnlyFormValue
  relationshipNoteTitle: ReadOnlyFormValue
  typeDisplayProperties: string[]
  typeName: ReadOnlyFormValue
  typePropertyQuery: ReadOnlyFormValue
  typeSchemaProperties: MobileTypeSchemaProperty[]
  typeSchemaPropertyName: ReadOnlyFormValue
  typeSchemaPropertyValue: ReadOnlyFormValue
  typeSchemaRelationships: MobileTypeSchemaRelationship[]
  typeSchemaRelationshipName: ReadOnlyFormValue
  typeSchemaRelationshipTargetRef: ReadOnlyFormValue
  typeSchemaRelationshipTarget: ReadOnlyFormValue
  typeSectionLabel: ReadOnlyFormValue
  typeSort: ReadOnlyFormValue
  typeTemplate: ReadOnlyFormValue
  typeIcon: ReadOnlyFormValue
  typeTone: MobileTone
  typeVisible: boolean
  viewDisplayProperties: string[]
  viewFilters: MobileViewFilterGroup
  viewIcon: ReadOnlyFormValue
  viewName: ReadOnlyFormValue
  viewPropertyQuery: ReadOnlyFormValue
  viewSort: ReadOnlyFormValue
  viewTone: MobileTone | null
}

export type TabletWorkspaceChromeProps = {
  activeFolderId: string | null
  activeItemId: string | null
  canMoveTypeDown: boolean
  canMoveTypeUp: boolean
  canMoveViewDown: boolean
  canMoveViewUp: boolean
  canDeleteType: boolean
  compactTablet: boolean
  defaultPropertiesVisible: boolean
  editorBlocks: MobileEditorBlock[]
  editorBullets: string[]
  initialEditorEditing?: boolean
  initialEditorEditingMode?: EditorEditingMode
  layoutProbe?: boolean
  noteListProperties: string[]
  noteListSubtitle: NoteCountText
  noteListTitle: SidebarLabel
  notes: MobileNote[]
  onAddProperty: (key?: string) => void
  onAddRelationship: (key?: string) => void
  onChangeNoteType: () => void
  onChangeNoteTypeInputChange: (value: ReadOnlyFormValue) => void
  onCloseAction: () => void
  onCopyDeepLink: () => void
  onCreateFolder: () => void
  onCreateNote: () => void
  onCreateRelationshipTarget: () => void
  onCreateTitleChange: (value: ReadOnlyFormValue) => void
  onCreateType: () => void
  onCreateView: () => void
  onDeleteFolder: () => void
  onDeleteType: () => void
  onDeleteView: () => void
  onDeleteNote: () => void
  onDeleteProperty: (noteId: NoteId, key: string) => void
  onEditProperty: (noteId: NoteId, key: string, value: MobilePropertyValue) => void
  onFilenameStemChange: (value: ReadOnlyFormValue) => void
  onFolderNameChange: (value: ReadOnlyFormValue) => void
  onFolderPathChange: (value: ReadOnlyFormValue) => void
  onMoveNoteToFolder: () => void
  onMoveTypeDown: () => void
  onMoveTypeUp: () => void
  onMoveViewDown: () => void
  onMoveViewUp: () => void
  onNoteIconChange: (value: ReadOnlyFormValue) => void
  onOpenChangeNoteType: () => void
  onOpenCreateChildFolder: () => void
  onOpenCreateFolder: () => void
  onOpenCreateNote: () => void
  onOpenCreateType: () => void
  onOpenCreateView: () => void
  onOpenFolderActions: (selection: MobileSidebarFolderSelection) => void
  onOpenMoveNoteToFolder: () => void
  onOpenTypeActions: (selection: MobileSidebarItemSelection) => void
  onOpenViewActions: (selection: MobileSidebarItemSelection) => void
  onOpenMoreActions: () => void
  onOpenRenameNoteFile: () => void
  onOpenSetNoteIcon: () => void
  onOpenSearch: () => void
  onRemoveRelationship: (noteId: NoteId, key: string, ref: string) => void
  onRenameFolder: () => void
  onSaveTypeDefinition: () => void
  onSaveProperty: () => void
  onSaveRelationship: () => void
  onRenameNoteFile: () => void
  onRenameNoteFileToTitle: () => void
  onRemoveNoteIcon: () => void
  onSetNoteIcon: () => void
  onUpdateNoteContent: (noteId: NoteId, content: string) => void
  onTypeDisplayPropertiesChange: (value: string[]) => void
  onTypeNameChange: (value: ReadOnlyFormValue) => void
  onTypeSchemaPropertyAdd: () => void
  onTypeSchemaPropertyNameChange: (value: ReadOnlyFormValue) => void
  onTypeSchemaPropertyRemove: (index: number) => void
  onTypeSchemaPropertyValueChange: (value: ReadOnlyFormValue) => void
  onTypeSchemaRelationshipAdd: () => void
  onTypeSchemaRelationshipNameChange: (value: ReadOnlyFormValue) => void
  onTypeSchemaRelationshipRemove: (index: number) => void
  onTypeSchemaRelationshipTargetSelect: (title: ReadOnlyFormValue, ref: ReadOnlyFormValue) => void
  onTypeSchemaRelationshipTargetChange: (value: ReadOnlyFormValue) => void
  onTypePropertyQueryChange: (value: ReadOnlyFormValue) => void
  onTypeSectionLabelChange: (value: ReadOnlyFormValue) => void
  onTypeSortChange: (value: ReadOnlyFormValue) => void
  onTypeTemplateChange: (value: ReadOnlyFormValue) => void
  onTypeIconChange: (value: MobileSidebarIcon) => void
  onTypeToneChange: (value: MobileTone) => void
  onTypeVisibleChange: (value: boolean) => void
  onViewIconChange: (value: MobileSidebarIcon) => void
  onViewFiltersChange: (value: MobileViewFilterGroup) => void
  onViewDisplayPropertiesChange: (value: string[]) => void
  onViewNameChange: (value: ReadOnlyFormValue) => void
  onViewPropertyQueryChange: (value: ReadOnlyFormValue) => void
  onViewSortChange: (value: ReadOnlyFormValue) => void
  onViewToneChange: (value: MobileTone) => void
  onSaveView: () => void
  onPropertyNameChange: (value: ReadOnlyFormValue) => void
  onPropertyValueChange: (value: ReadOnlyFormValue) => void
  onPropertyValueKindChange: (value: MobilePropertyValueKind) => void
  onRelationshipNameChange: (value: ReadOnlyFormValue) => void
  onRelationshipNoteSelect: (title: ReadOnlyFormValue, ref: ReadOnlyFormValue) => void
  onRelationshipNoteTitleChange: (value: ReadOnlyFormValue) => void
  onSearchQueryChange: (value: SearchQuery) => void
  onSelectFolder: (selection: MobileSidebarFolderSelection) => void
  onSelectNote: (noteId: NoteId) => void
  onSelectSidebarItem: (selection: MobileSidebarItemSelection) => void
  onSetArchived: (archived: boolean) => void
  onSetOrganized: (organized: boolean) => void
  onToggleFavorite: () => void
  onToggleNoteWidth: () => void
  openAction: MobileWorkspaceAction | null
  readOnlyForm: TabletReadOnlyForm
  searchQuery: SearchQuery
  selectedNote: MobileNote | null
  selectedNoteId: string | null
  sourceSelectionProbe?: boolean
  snapshot: MobileWorkspaceSnapshot
  wysiwygAutocompleteProbe?: boolean
  wysiwygWikilinkInsertProbe?: boolean
  typePropertyOptions: string[]
  typeRelationshipTargetOptions: MobileWorkspaceSuggestionItem[]
  typeSortPropertyOptions: string[]
  viewPropertyOptions: string[]
  viewSortPropertyOptions: string[]
  wysiwygMutationProbe?: boolean
}
