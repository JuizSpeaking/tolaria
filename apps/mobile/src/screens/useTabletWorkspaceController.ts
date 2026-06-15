import { useCallback, useEffect, useRef, useState } from 'react'
import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type { MobileSidebarItemSelection } from '../components/workspace/MobileWorkspaceSidebar'
import type {
  MobileNote,
  MobilePropertyValue,
  MobileViewDefinition,
  MobileViewFilterGroup,
  MobileViewFilterNode,
  MobileWorkspaceSnapshot,
} from '../workspace/mobileWorkspaceModel'
import {
  applyMobileWorkspaceEditWithWrites,
  type MobileWorkspaceEdit,
} from '../workspace/mobileWorkspaceEditing'
import type {
  ReadOnlyWorkspaceRepository,
  ReadOnlyWorkspaceRequest,
} from '../workspace/readOnlyWorkspaceRepository'
import { writeMobileClipboardText } from '../workspace/mobileClipboard'
import { buildMobileDeepLinkForNote } from '../workspace/mobileDeepLinks'
import { useTabletWorkspaceNavigation } from './tabletWorkspaceNavigation'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'
import type { TabletSidebarSelection } from './tabletWorkspaceNavigation'

const emptyReadOnlyForm: TabletReadOnlyForm = {
  createTitle: '',
  editingViewId: '',
  folderPath: '',
  noteType: '',
  propertyName: '',
  propertyValue: '',
  propertyValueKind: 'string',
  relationshipName: '',
  relationshipNoteTitle: '',
  viewFilters: { all: [] },
  viewName: '',
}

type ApplyWorkspaceEdit = (edit: MobileWorkspaceEdit) => void
type ReadOnlyFormUpdater = <Key extends keyof TabletReadOnlyForm>(key: Key, value: TabletReadOnlyForm[Key]) => void
type SaveSelectedEdit = (toEdit: (noteId: string) => MobileWorkspaceEdit) => void
type SetOpenAction = (action: MobileWorkspaceAction | null) => void
type TabletWorkspaceNavigation = ReturnType<typeof useTabletWorkspaceNavigation>

export function useTabletWorkspaceController({
  repository,
  repositoryRequest,
  snapshot,
}: {
  repository: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  snapshot: MobileWorkspaceSnapshot
}) {
  const { applyWorkspaceEdit, workspaceSnapshot } = useWorkspaceEditPipeline({
    repository,
    repositoryRequest,
    snapshot,
  })
  const [openAction, setOpenAction] = useState<MobileWorkspaceAction | null>(null)
  const { readOnlyForm, resetForm, updateReadOnlyForm } = useReadOnlyFormState()
  const [searchQuery, setSearchQuery] = useState('')
  const navigation = useTabletWorkspaceNavigation(workspaceSnapshot, searchQuery)
  const { selectedNote, setSelectedNoteId } = navigation
  const applyEdit = useControllerApplyEdit({ applyWorkspaceEdit, navigation, setSelectedNoteId })
  const closeAction = useCloseWorkspaceAction({ resetForm, setOpenAction })
  const saveSelectedEdit = useSaveSelectedEdit({ applyEdit, closeAction, selectedNote })
  const createActions = createWorkspaceActions({
    applyEdit,
    closeAction,
    navigation,
    readOnlyForm,
    selectedNote,
    updateReadOnlyForm,
    workspaceSnapshot,
  })
  const propertyActions = propertyWorkspaceActions({
    applyEdit,
    readOnlyForm,
    saveSelectedEdit,
    setOpenAction,
    updateReadOnlyForm,
  })
  const relationshipActions = relationshipWorkspaceActions({ applyEdit, readOnlyForm, saveSelectedEdit, updateReadOnlyForm })
  const retargetActions = retargetWorkspaceActions({ readOnlyForm, saveSelectedEdit, updateReadOnlyForm })
  const editorActions = editorWorkspaceActions({
    applyEdit,
    repositoryRequest,
    selectedNote,
    workspaceSnapshot,
  })
  const actionSheetActions = actionSheetWorkspaceActions({
    closeAction,
    navigation,
    noteListTitle: navigation.noteListTitle,
    selectedNote,
    setOpenAction,
    updateReadOnlyForm,
    workspaceSnapshot,
  })
  useHydrateSelectedNote({ applyEdit, repository, repositoryRequest, selectedNote })

  return {
    ...actionSheetActions,
    ...navigation,
    ...createActions,
    ...editorActions,
    ...propertyActions,
    ...relationshipActions,
    ...retargetActions,
    openAction,
    readOnlyForm,
    searchQuery,
    snapshot: workspaceSnapshot,
    onSelectFolder: navigation.selectFolder,
    onSelectNote: navigation.setSelectedNoteId,
    onSelectSidebarItem: navigation.selectSidebarItem,
    onSearchQueryChange: setSearchQuery,
  }
}

function useControllerApplyEdit({
  applyWorkspaceEdit,
  navigation,
  setSelectedNoteId,
}: {
  applyWorkspaceEdit: (edit: MobileWorkspaceEdit) => ReturnType<typeof applyMobileWorkspaceEditWithWrites>
  navigation: TabletWorkspaceNavigation
  setSelectedNoteId: (noteId: string | null) => void
}) {
  return useCallback((edit: MobileWorkspaceEdit) => {
    const result = applyWorkspaceEdit(edit)
    if (edit.type === 'createNote' && result.snapshot.selectedNoteId) {
      setSelectedNoteId(result.snapshot.selectedNoteId)
    } else if (edit.type === 'createView') {
      selectCreatedView(edit, result.snapshot, navigation)
    } else if (edit.type === 'updateView') {
      selectUpdatedView(edit.viewId, result.snapshot, navigation)
    } else if (edit.type === 'deleteView') {
      selectAfterDeletedView(edit.viewId, result.snapshot, navigation)
    }
  }, [applyWorkspaceEdit, navigation, setSelectedNoteId])
}

function useCloseWorkspaceAction({
  resetForm,
  setOpenAction,
}: {
  resetForm: () => void
  setOpenAction: SetOpenAction
}) {
  return useCallback(() => {
    setOpenAction(null)
    resetForm()
  }, [resetForm, setOpenAction])
}

function useSaveSelectedEdit({
  applyEdit,
  closeAction,
  selectedNote,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  selectedNote: MobileNote | null
}) {
  return useCallback((toEdit: (noteId: string) => MobileWorkspaceEdit) => {
    if (!selectedNote) return
    applyEdit(toEdit(selectedNote.id))
    closeAction()
  }, [applyEdit, closeAction, selectedNote])
}

function selectCreatedView(
  edit: Extract<MobileWorkspaceEdit, { type: 'createView' }>,
  snapshot: MobileWorkspaceSnapshot,
  navigation: TabletWorkspaceNavigation,
) {
  const createdView = snapshot.views?.find((view) => view.definition.name === edit.definition.name)
  if (createdView) navigation.selectSavedView(createdView, snapshot)
}

function selectUpdatedView(
  viewId: string,
  snapshot: MobileWorkspaceSnapshot,
  navigation: TabletWorkspaceNavigation,
) {
  const updatedView = snapshot.views?.find((view) => view.id === viewId)
  if (!updatedView) return
  if (!isSelectedView(navigation.sidebarSelection, viewId)) return

  navigation.selectSavedView(updatedView, snapshot)
}

function selectAfterDeletedView(
  viewId: string,
  snapshot: MobileWorkspaceSnapshot,
  navigation: TabletWorkspaceNavigation,
) {
  if (navigation.sidebarSelection.kind !== 'item' || navigation.sidebarSelection.viewId !== viewId) return
  navigation.selectDefaultSidebarItem(snapshot)
}

function isSelectedView(selection: TabletSidebarSelection, viewId: string) {
  if (selection.kind !== 'item') return false
  return selection.viewId === viewId
}

function useWorkspaceEditPipeline({
  repository,
  repositoryRequest,
  snapshot,
}: {
  repository: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  snapshot: MobileWorkspaceSnapshot
}) {
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState(snapshot)
  const workspaceSnapshotRef = useRef(workspaceSnapshot)
  const applyWorkspaceEdit = useCallback((edit: MobileWorkspaceEdit) => {
    const result = applyMobileWorkspaceEditWithWrites(workspaceSnapshotRef.current, edit)
    workspaceSnapshotRef.current = result.snapshot
    setWorkspaceSnapshot(result.snapshot)
    if (result.writes.length > 0) void repository.persistWrites(result.writes, repositoryRequest)
    return result
  }, [repository, repositoryRequest])

  useEffect(() => {
    workspaceSnapshotRef.current = workspaceSnapshot
  }, [workspaceSnapshot])

  return {
    applyWorkspaceEdit,
    workspaceSnapshot,
  }
}

function useReadOnlyFormState() {
  const [readOnlyForm, setReadOnlyForm] = useState<TabletReadOnlyForm>(emptyReadOnlyForm)
  const updateReadOnlyForm = useCallback(<Key extends keyof TabletReadOnlyForm,>(key: Key, value: TabletReadOnlyForm[Key]) => {
    setReadOnlyForm((current) => ({ ...current, [key]: value }))
  }, [])

  return {
    readOnlyForm,
    resetForm: useCallback(() => setReadOnlyForm(emptyReadOnlyForm), []),
    updateReadOnlyForm,
  }
}

function useHydrateSelectedNote({
  applyEdit,
  repository,
  repositoryRequest,
  selectedNote,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  repository: ReadOnlyWorkspaceRepository
  repositoryRequest?: ReadOnlyWorkspaceRequest
  selectedNote: MobileNote | null
}) {
  useEffect(() => {
    if (!selectedNote || selectedNote.rawContent !== undefined) return

    let cancelled = false
    void repository.readNoteContent(selectedNote, repositoryRequest).then((rawContent) => {
      if (cancelled || rawContent === null) return
      applyEdit({ noteId: selectedNote.id, rawContent, type: 'hydrateNoteContent' })
    })

    return () => {
      cancelled = true
    }
  }, [applyEdit, repository, repositoryRequest, selectedNote])
}

function actionSheetWorkspaceActions({
  closeAction,
  navigation,
  noteListTitle,
  selectedNote,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  closeAction: () => void
  navigation: TabletWorkspaceNavigation
  noteListTitle: string
  selectedNote: MobileNote | null
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onAddProperty: () => setOpenAction('addProperty'),
    onAddRelationship: () => setOpenAction('addRelationship'),
    onCloseAction: closeAction,
    onOpenCreateNote: () => setOpenAction('createNote'),
    onOpenCreateView: () => openCreateView({
      filters: viewFiltersForSelection(navigation.sidebarSelection, navigation.notes, selectedNote, workspaceSnapshot.views ?? []),
      noteListTitle,
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenMoreActions: () => setOpenAction('moreActions'),
    onOpenChangeNoteType: () => openChangeNoteType({
      currentType: selectedNote?.type ?? '',
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenMoveNoteToFolder: () => openMoveNoteToFolder({
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenSearch: () => setOpenAction('search'),
    onOpenViewActions: (selection: MobileSidebarItemSelection) => openViewActions({
      selection,
      setOpenAction,
      updateReadOnlyForm,
      views: workspaceSnapshot.views ?? [],
    }),
  }
}

function createWorkspaceActions({
  applyEdit,
  closeAction,
  navigation,
  readOnlyForm,
  selectedNote,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  navigation: TabletWorkspaceNavigation
  readOnlyForm: TabletReadOnlyForm
  selectedNote: MobileNote | null
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onCreateNote: () => createNote({ applyEdit, closeAction, title: readOnlyForm.createTitle }),
    onCreateTitleChange: (value: string) => updateReadOnlyForm('createTitle', value),
    onCreateView: () => createView({
      applyEdit,
      closeAction,
      filters: readOnlyForm.viewFilters,
      name: readOnlyForm.viewName,
      selectedNote,
      selection: navigation.sidebarSelection,
    }),
    onDeleteView: () => deleteView({ applyEdit, closeAction, viewId: readOnlyForm.editingViewId }),
    onSaveView: () => updateView({
      applyEdit,
      closeAction,
      filters: readOnlyForm.viewFilters,
      name: readOnlyForm.viewName,
      viewId: readOnlyForm.editingViewId,
      views: workspaceSnapshot.views ?? [],
    }),
    onViewFiltersChange: (value: MobileViewFilterGroup) => updateReadOnlyForm('viewFilters', value),
    onViewNameChange: (value: string) => updateReadOnlyForm('viewName', value),
  }
}

function propertyWorkspaceActions({
  applyEdit,
  readOnlyForm,
  saveSelectedEdit,
  setOpenAction,
  updateReadOnlyForm,
}: {
  applyEdit: ApplyWorkspaceEdit
  readOnlyForm: TabletReadOnlyForm
  saveSelectedEdit: SaveSelectedEdit
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return {
    onDeleteProperty: (noteId: string, key: string) => applyEdit({ key, noteId, type: 'deleteProperty' }),
    onEditProperty: (_noteId: string, key: string, value: MobilePropertyValue) => {
      openEditProperty({ key, setOpenAction, updateReadOnlyForm, value })
    },
    onPropertyNameChange: (value: string) => updateReadOnlyForm('propertyName', value),
    onPropertyValueChange: (value: string) => updateReadOnlyForm('propertyValue', value),
    onSaveProperty: () => saveSelectedEdit((noteId) => propertyEdit(readOnlyForm, noteId)),
  }
}

function relationshipWorkspaceActions({
  applyEdit,
  readOnlyForm,
  saveSelectedEdit,
  updateReadOnlyForm,
}: {
  applyEdit: ApplyWorkspaceEdit
  readOnlyForm: TabletReadOnlyForm
  saveSelectedEdit: SaveSelectedEdit
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return {
    onRelationshipNameChange: (value: string) => updateReadOnlyForm('relationshipName', value),
    onRelationshipNoteTitleChange: (value: string) => updateReadOnlyForm('relationshipNoteTitle', value),
    onRemoveRelationship: (noteId: string, key: string, ref: string) => applyEdit({ key, noteId, ref, type: 'removeRelationship' }),
    onSaveRelationship: () => saveSelectedEdit((noteId) => relationshipEdit(readOnlyForm, noteId)),
  }
}

function retargetWorkspaceActions({
  readOnlyForm,
  saveSelectedEdit,
  updateReadOnlyForm,
}: {
  readOnlyForm: TabletReadOnlyForm
  saveSelectedEdit: SaveSelectedEdit
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return {
    onChangeNoteType: () => saveSelectedEdit((noteId) => ({
      noteId,
      type: 'changeNoteType',
      value: readOnlyForm.noteType,
    })),
    onChangeNoteTypeInputChange: (value: string) => updateReadOnlyForm('noteType', value),
    onFolderPathChange: (value: string) => updateReadOnlyForm('folderPath', value),
    onMoveNoteToFolder: () => saveSelectedEdit((noteId) => ({
      folderPath: readOnlyForm.folderPath,
      noteId,
      type: 'moveNoteToFolder',
    })),
  }
}

function editorWorkspaceActions({
  applyEdit,
  repositoryRequest,
  selectedNote,
  workspaceSnapshot,
}: {
  applyEdit: ApplyWorkspaceEdit
  repositoryRequest?: ReadOnlyWorkspaceRequest
  selectedNote: MobileNote | null
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onCopyDeepLink: () => {
      const result = buildMobileDeepLinkForNote({
        note: selectedNote,
        source: workspaceSnapshot.source,
        vaultRootUri: repositoryRequest?.vaultRootUri,
      })
      if (!result.ok) return

      void writeMobileClipboardText(result.url).catch((error) => {
        console.warn('[mobile-deep-link] Failed to copy deep link:', error)
      })
    },
    onSetArchived: (archived: boolean) => {
      if (selectedNote) applyEdit({ archived, noteId: selectedNote.id, type: 'setArchived' })
    },
    onDeleteNote: () => {
      if (selectedNote) applyEdit({ noteId: selectedNote.id, type: 'deleteNote' })
    },
    onSetOrganized: (organized: boolean) => {
      if (selectedNote) applyEdit({ noteId: selectedNote.id, organized, type: 'setOrganized' })
    },
    onToggleFavorite: () => {
      if (selectedNote) applyEdit({ noteId: selectedNote.id, type: 'toggleFavorite' })
    },
    onUpdateNoteContent: (noteId: string, content: string) => applyEdit({ content, noteId, type: 'updateNoteContent' }),
    onUpdateNoteTitle: (noteId: string, title: string) => applyEdit({ noteId, title, type: 'renameNoteTitle' }),
  }
}

function openChangeNoteType({
  currentType,
  setOpenAction,
  updateReadOnlyForm,
}: {
  currentType: string
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  updateReadOnlyForm('noteType', currentType)
  setOpenAction('changeNoteType')
}

function openMoveNoteToFolder({
  setOpenAction,
  updateReadOnlyForm,
}: {
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  updateReadOnlyForm('folderPath', '')
  setOpenAction('moveNoteToFolder')
}

function openEditProperty({
  key,
  setOpenAction,
  updateReadOnlyForm,
  value,
}: {
  key: string
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  value: MobilePropertyValue
}) {
  updateReadOnlyForm('propertyName', key)
  updateReadOnlyForm('propertyValue', propertyValueFormText(value))
  updateReadOnlyForm('propertyValueKind', propertyValueKind(key, value))
  setOpenAction('editProperty')
}

function openCreateView({
  filters,
  noteListTitle,
  setOpenAction,
  updateReadOnlyForm,
}: {
  filters: MobileViewFilterGroup
  noteListTitle: string
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  updateReadOnlyForm('viewFilters', cloneFilterGroup(filters))
  updateReadOnlyForm('viewName', defaultViewName(noteListTitle))
  setOpenAction('createView')
}

function openViewActions({
  selection,
  setOpenAction,
  updateReadOnlyForm,
  views,
}: {
  selection: MobileSidebarItemSelection
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  views: NonNullable<MobileWorkspaceSnapshot['views']>
}) {
  if (selection.sectionId !== 'views') return
  const view = views.find((candidate) => candidate.id === (selection.viewId ?? selection.id))
  if (!view) return
  updateReadOnlyForm('editingViewId', selection.viewId ?? selection.id)
  updateReadOnlyForm('viewFilters', cloneFilterGroup(view.definition.filters))
  updateReadOnlyForm('viewName', selection.label)
  setOpenAction('editView')
}

function createNote({
  applyEdit,
  closeAction,
  title,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  title: string
}) {
  applyEdit({ title, type: 'createNote' })
  closeAction()
}

function createView({
  applyEdit,
  closeAction,
  filters,
  name,
  selectedNote,
  selection,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  filters: MobileViewFilterGroup
  name: string
  selectedNote: MobileNote | null
  selection: TabletSidebarSelection
}) {
  const trimmedName = name.trim()
  if (!trimmedName) return

  applyEdit({
    definition: {
      color: viewColorForSelection(selection, selectedNote),
      filters,
      icon: null,
      name: trimmedName,
      sort: 'modified:desc',
    },
    type: 'createView',
  })
  closeAction()
}

function updateView({
  applyEdit,
  closeAction,
  filters,
  name,
  viewId,
  views,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  filters: MobileViewFilterGroup
  name: string
  viewId: string
  views: NonNullable<MobileWorkspaceSnapshot['views']>
}) {
  const view = views.find((candidate) => candidate.id === viewId)
  const trimmedName = name.trim()
  if (!view || !trimmedName) return

  applyEdit({
    definition: { ...view.definition, filters, name: trimmedName },
    type: 'updateView',
    viewId,
  })
  closeAction()
}

function deleteView({
  applyEdit,
  closeAction,
  viewId,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  viewId: string
}) {
  if (!viewId) return
  applyEdit({ type: 'deleteView', viewId })
  closeAction()
}

function defaultViewName(title: string) {
  return title.trim() || 'New View'
}

function viewFiltersForSelection(
  selection: TabletSidebarSelection,
  notes: MobileNote[],
  selectedNote: MobileNote | null,
  views: NonNullable<MobileWorkspaceSnapshot['views']>,
): MobileViewFilterGroup {
  if (selection.kind === 'folder') return allFilters([{ field: 'path', op: 'contains', value: selection.label }])

  return itemViewFiltersForSelection(selection, notes, selectedNote, views)
}

function itemViewFiltersForSelection(
  selection: Extract<TabletSidebarSelection, { kind: 'item' }>,
  notes: MobileNote[],
  selectedNote: MobileNote | null,
  views: NonNullable<MobileWorkspaceSnapshot['views']>,
): MobileViewFilterGroup {
  const sectionFilters = sectionViewFilters(selection, selectedNote, views)
  if (sectionFilters) return sectionFilters
  return primaryViewFilters(selection, notes)
}

function sectionViewFilters(
  selection: Extract<TabletSidebarSelection, { kind: 'item' }>,
  selectedNote: MobileNote | null,
  views: NonNullable<MobileWorkspaceSnapshot['views']>,
): MobileViewFilterGroup | null {
  if (selection.sectionId === 'views') return existingViewFilters(selection, views)
  if (selection.sectionId === 'types') return typeViewFilters(selection, selectedNote)
  if (selection.sectionId === 'favorites') return allFilters([{ field: 'favorite', op: 'equals', value: true }])
  return null
}

function primaryViewFilters(
  selection: Extract<TabletSidebarSelection, { kind: 'item' }>,
  notes: MobileNote[],
): MobileViewFilterGroup {
  if (selection.id === 'archive') return allFilters([{ field: 'archived', op: 'equals', value: true }])
  if (selection.id === 'all-notes') return allFilters([{ field: 'archived', op: 'equals', value: false }])
  if (selection.id === 'inbox') return allFilters([
    { field: 'archived', op: 'equals', value: false },
    { field: 'organized', op: 'equals', value: false },
  ])

  return allFilters([{ field: 'title', op: 'contains', value: notes[0]?.title ?? selection.label }])
}

function typeViewFilters(
  selection: Extract<TabletSidebarSelection, { kind: 'item' }>,
  selectedNote: MobileNote | null,
): MobileViewFilterGroup {
  return allFilters([{ field: 'type', op: 'equals', value: selectedNote?.type ?? singularLabel(selection.label) }])
}

function existingViewFilters(
  selection: Extract<TabletSidebarSelection, { kind: 'item' }>,
  views: NonNullable<MobileWorkspaceSnapshot['views']>,
): MobileViewFilterGroup {
  return views.find((view) => view.id === selection.viewId || view.id === selection.id)?.definition.filters ?? allFilters([])
}

function allFilters(filters: MobileViewFilterNode[]): MobileViewFilterGroup {
  return { all: filters }
}

function cloneFilterGroup(group: MobileViewFilterGroup): MobileViewFilterGroup {
  if ('any' in group) return { any: group.any.map(cloneFilterNode) }
  return { all: group.all.map(cloneFilterNode) }
}

function cloneFilterNode(node: MobileViewFilterNode): MobileViewFilterNode {
  if ('all' in node || 'any' in node) return cloneFilterGroup(node)
  return {
    ...node,
    value: Array.isArray(node.value) ? [...node.value] : node.value,
  }
}

function singularLabel(label: string) {
  return label.replace(/s$/u, '')
}

function propertyValueFormText(value: MobilePropertyValue): string {
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

function propertyValueKind(key: string, value: MobilePropertyValue): TabletReadOnlyForm['propertyValueKind'] {
  if (isListPropertyKey(key) || Array.isArray(value)) return 'list'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  return 'string'
}

function viewColorForSelection(selection: TabletSidebarSelection, selectedNote: MobileNote | null): MobileViewDefinition['color'] {
  if (selection.kind === 'item' && selection.sectionId === 'types') return selectedNote?.typeTone ?? 'gray'
  return selectedNote?.typeTone ?? 'gray'
}

function propertyEdit(form: TabletReadOnlyForm, noteId: string): MobileWorkspaceEdit {
  return {
    key: form.propertyName,
    noteId,
    type: 'updateProperty',
    value: parsedPropertyValue(form),
  }
}

function parsedPropertyValue(form: TabletReadOnlyForm): MobilePropertyValue {
  if (isListPropertyKey(form.propertyName) || form.propertyValueKind === 'list') return listPropertyValue(form.propertyValue)
  if (form.propertyValueKind === 'boolean') return booleanPropertyValue(form.propertyValue)
  if (form.propertyValueKind === 'number') return numberPropertyValue(form.propertyValue)
  return form.propertyValue.trim()
}

function listPropertyValue(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function booleanPropertyValue(value: string): boolean {
  return /^(true|yes|1|on)$/iu.test(value.trim())
}

function numberPropertyValue(value: string): number | string {
  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : value.trim()
}

function isListPropertyKey(key: string): boolean {
  return key.trim().toLowerCase() === 'tags'
}

function relationshipEdit(form: TabletReadOnlyForm, noteId: string): MobileWorkspaceEdit {
  return {
    key: form.relationshipName,
    noteId,
    targetTitle: form.relationshipNoteTitle,
    type: 'addRelationship',
  }
}
