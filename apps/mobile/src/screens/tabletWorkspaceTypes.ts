import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type {
  MobileSidebarFolderSelection,
  MobileSidebarItemSelection,
} from '../components/workspace/MobileWorkspaceSidebar'
import type {
  MobileEditorBlock,
  MobileNote,
  MobilePropertyValue,
  MobileViewFilterGroup,
  MobileWorkspaceSnapshot,
} from '../workspace/mobileWorkspaceModel'
import type {
  NoteCountText,
  NoteId,
  ReadOnlyFormValue,
  SearchQuery,
  SidebarLabel,
} from './tabletWorkspaceNavigation'

export type TabletPanel = 'noteList' | 'properties' | 'sidebar'
export type TabletPropertyValueKind = 'boolean' | 'list' | 'number' | 'string'

export type TabletReadOnlyForm = {
  createTitle: ReadOnlyFormValue
  editingViewId: ReadOnlyFormValue
  filenameStem: ReadOnlyFormValue
  folderPath: ReadOnlyFormValue
  noteType: ReadOnlyFormValue
  propertyName: ReadOnlyFormValue
  propertyValue: ReadOnlyFormValue
  propertyValueKind: TabletPropertyValueKind
  relationshipName: ReadOnlyFormValue
  relationshipNoteTitle: ReadOnlyFormValue
  viewFilters: MobileViewFilterGroup
  viewName: ReadOnlyFormValue
}

export type TabletWorkspaceChromeProps = {
  activeFolderId: string | null
  activeItemId: string | null
  canMoveViewDown: boolean
  canMoveViewUp: boolean
  compactTablet: boolean
  defaultPropertiesVisible: boolean
  editorBlocks: MobileEditorBlock[]
  editorBullets: string[]
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
  onCreateNote: () => void
  onCreateRelationshipTarget: () => void
  onCreateTitleChange: (value: ReadOnlyFormValue) => void
  onCreateView: () => void
  onDeleteView: () => void
  onDeleteNote: () => void
  onDeleteProperty: (noteId: NoteId, key: string) => void
  onEditProperty: (noteId: NoteId, key: string, value: MobilePropertyValue) => void
  onFilenameStemChange: (value: ReadOnlyFormValue) => void
  onFolderPathChange: (value: ReadOnlyFormValue) => void
  onMoveNoteToFolder: () => void
  onMoveViewDown: () => void
  onMoveViewUp: () => void
  onOpenChangeNoteType: () => void
  onOpenCreateNote: () => void
  onOpenCreateView: () => void
  onOpenMoveNoteToFolder: () => void
  onOpenViewActions: (selection: MobileSidebarItemSelection) => void
  onOpenMoreActions: () => void
  onOpenRenameNoteFile: () => void
  onOpenSearch: () => void
  onRemoveRelationship: (noteId: NoteId, key: string, ref: string) => void
  onSaveProperty: () => void
  onSaveRelationship: () => void
  onRenameNoteFile: () => void
  onUpdateNoteContent: (noteId: NoteId, content: string) => void
  onUpdateNoteTitle: (noteId: NoteId, title: string) => void
  onViewFiltersChange: (value: MobileViewFilterGroup) => void
  onViewNameChange: (value: ReadOnlyFormValue) => void
  onSaveView: () => void
  onPropertyNameChange: (value: ReadOnlyFormValue) => void
  onPropertyValueChange: (value: ReadOnlyFormValue) => void
  onRelationshipNameChange: (value: ReadOnlyFormValue) => void
  onRelationshipNoteTitleChange: (value: ReadOnlyFormValue) => void
  onSearchQueryChange: (value: SearchQuery) => void
  onSelectFolder: (selection: MobileSidebarFolderSelection) => void
  onSelectNote: (noteId: NoteId) => void
  onSelectSidebarItem: (selection: MobileSidebarItemSelection) => void
  onSetArchived: (archived: boolean) => void
  onSetOrganized: (organized: boolean) => void
  onToggleFavorite: () => void
  openAction: MobileWorkspaceAction | null
  readOnlyForm: TabletReadOnlyForm
  searchQuery: SearchQuery
  selectedNote: MobileNote | null
  selectedNoteId: string | null
  snapshot: MobileWorkspaceSnapshot
}
