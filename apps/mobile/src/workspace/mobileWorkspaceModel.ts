export type MobileTone = 'blue' | 'gray' | 'green' | 'orange' | 'purple' | 'red' | 'yellow'

export type MobileNote = {
  aliases?: string[]
  archived?: boolean
  created: string
  createdAt?: number | null
  date: string
  editorBlocks?: MobileEditorBlock[]
  editorBullets?: string[]
  favorite: boolean
  favoriteIndex?: number | null
  id: string
  links: number
  modified: string
  modifiedAt?: number | null
  organized?: boolean
  path?: string
  properties?: MobileProperty[]
  rawContent?: string
  relationships: MobileRelationship[]
  status: string
  snippet: string
  tags: string[]
  title: string
  type: string
  typeTone: MobileTone
  workspace: string
}

export type MobileRelationshipKind = 'belongsTo' | 'has' | 'relatedTo' | 'custom'

export type MobileRelationship = {
  kind: MobileRelationshipKind
  key?: string
  label?: string
  values: MobileRelationshipValue[]
}

export type MobileRelationshipValue = {
  id?: string
  ref?: string
  title: string
  type: string
  typeTone: MobileTone
}

export type MobilePropertyValue = string | number | boolean | string[]

export type MobileProperty = {
  key: string
  label: string
  value: MobilePropertyValue
}

export type MobileTypeDefinition = {
  icon?: string | null
  label?: string | null
  listPropertiesDisplay?: string[]
  order?: number | null
  path?: string
  properties?: Record<string, MobilePropertyValue>
  relationships?: Record<string, string[]>
  rawContent?: string
  sort?: string | null
  template?: string | null
  tone?: MobileTone | null
  visible?: boolean | null
}

export type MobileTypeDefinitions = Record<string, MobileTypeDefinition>

export type MobileSidebarIcon =
  | 'archive'
  | 'file'
  | 'folder'
  | 'inbox'
  | 'procedure'
  | 'star'
  | 'tag'
  | 'view'

export type MobileSidebarItem = {
  active?: boolean
  count?: string
  icon: MobileSidebarIcon
  id: string
  label: string
  tone?: MobileTone
  typeName?: string
  viewId?: string
}

export type MobileSidebarSection = {
  count?: string
  folders?: MobileSidebarFolder[]
  id: string
  items?: MobileSidebarItem[]
  label?: string
}

export type MobileSidebarFolder = {
  active?: boolean
  children: MobileSidebarFolder[]
  expanded?: boolean
  id: string
  name: string
}

export type MobileSyncStatus = {
  kind: 'conflict' | 'pullRequired' | 'synced' | 'writeFailed'
  minutesAgo?: number
}

export type MobileEditorInline = {
  bold?: boolean
  code?: boolean
  italic?: boolean
  linkHref?: string
  strike?: boolean
  text: string
  wikilinkTarget?: string
}

export type MobileEditorHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type MobileEditorListItem = {
  content: MobileEditorInline[]
  depth?: number
}

export type MobileEditorOrderedListItem = MobileEditorListItem & {
  marker: string
}

export type MobileEditorTaskItem = MobileEditorListItem & {
  checked: boolean
}

export type MobileEditorBlock =
  | { content: MobileEditorInline[]; kind: 'paragraph' }
  | { kind: 'heading'; level: MobileEditorHeadingLevel; text: string }
  | { items: MobileEditorListItem[]; kind: 'bullets' }
  | { items: MobileEditorOrderedListItem[]; kind: 'orderedList' }
  | { items: MobileEditorTaskItem[]; kind: 'tasks' }
  | { content: MobileEditorInline[]; kind: 'quote' }
  | { code: string; kind: 'codeBlock'; language?: string | null }
  | { kind: 'divider' }
  | { headers: string[]; kind: 'table'; rows: string[][] }

export type MobileViewFilterOp = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'any_of' | 'none_of' | 'is_empty' | 'is_not_empty' | 'before' | 'after'

export type MobileViewFilterCondition = {
  field: string
  op: MobileViewFilterOp
  regex?: boolean
  value?: unknown
}

export type MobileViewFilterGroup = { all: MobileViewFilterNode[] } | { any: MobileViewFilterNode[] }
export type MobileViewFilterNode = MobileViewFilterCondition | MobileViewFilterGroup

export type MobileViewDefinition = {
  color: string | null
  evaluationMode?: 'mobileInternal'
  filters: MobileViewFilterGroup
  icon: string | null
  listPropertiesDisplay?: string[]
  name: string
  order?: number | null
  sort: string | null
}

export type MobileCreateNoteDefaults = {
  archived?: boolean
  favorite?: boolean
  folderPath?: string
  organized?: boolean
  properties?: Record<string, MobilePropertyValue>
  relationships?: Record<string, string[]>
  status?: string
  tags?: string[]
  template?: string
  type?: string
}

export type MobileSavedView = {
  definition: MobileViewDefinition
  filename: string
  id: string
}

export type MobileWorkspaceSnapshot = {
  allNotes?: MobileNote[]
  editorBlocks: MobileEditorBlock[]
  editorBullets: string[]
  folderPaths?: string[]
  noteListSubtitle: string
  notes: MobileNote[]
  searchQuery?: string
  selectedNoteId?: string
  sidebarSections: MobileSidebarSection[]
  source?: MobileWorkspaceSource
  sync: MobileSyncStatus
  typeDefinitions?: MobileTypeDefinitions
  views?: MobileSavedView[]
}

export type MobileWorkspaceSource = {
  kind: 'fixture' | 'localVault'
  label: string
  totalNotes: number
  vaultPath?: string
  visibleNotes: number
}
