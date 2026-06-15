import { useCallback, useEffect, useRef, useState } from 'react'
import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type { MobileSidebarItemSelection } from '../components/workspace/MobileWorkspaceSidebar'
import type {
  MobileCreateNoteDefaults,
  MobileNote,
  MobilePropertyValue,
  MobileSavedView,
  MobileTone,
  MobileTypeDefinitions,
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
import { canMoveMobileSavedView, evaluateMobileSavedView } from '../workspace/mobileSavedViews'
import {
  addTypeSchemaProperty,
  addTypeSchemaRelationshipRef,
  removeTypeSchemaPropertyAt,
  removeTypeSchemaRelationshipAt,
  typeDefinitionSchemaPatch,
  typeSchemaPropertiesForForm,
  typeSchemaRelationshipTargetSuggestions,
  typeSchemaRelationshipsForForm,
} from '../workspace/mobileTypeDefinitionSchema'
import {
  mobileDefaultListPropertyDisplay,
  mobileListPropertySuggestions,
} from '../workspace/mobileWorkspaceSuggestions'
import { useTabletWorkspaceNavigation } from './tabletWorkspaceNavigation'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'
import type { TabletSidebarSelection } from './tabletWorkspaceNavigation'
import { createNoteDefaultsForSelection } from './tabletWorkspaceCreateDefaults'
import { viewColorForSelection, viewFiltersForSelection } from './tabletWorkspaceViewHelpers'

const emptyReadOnlyForm: TabletReadOnlyForm = {
  createTitle: '',
  editingViewId: '',
  filenameStem: '',
  folderPath: '',
  noteType: '',
  propertyName: '',
  propertyValue: '',
  propertyValueKind: 'string',
  relationshipName: '',
  relationshipNoteTitle: '',
  typeDisplayProperties: [],
  typeName: '',
  typePropertyQuery: '',
  typeSchemaProperties: [],
  typeSchemaPropertyName: '',
  typeSchemaPropertyValue: '',
  typeSchemaRelationships: [],
  typeSchemaRelationshipName: '',
  typeSchemaRelationshipTarget: '',
  typeSectionLabel: '',
  typeSort: '',
  typeTone: 'gray',
  typeVisible: true,
  viewDisplayProperties: [],
  viewFilters: { all: [] },
  viewName: '',
  viewPropertyQuery: '',
}

type ApplyWorkspaceEdit = (edit: MobileWorkspaceEdit) => void
type ReadOnlyFormUpdater = <Key extends keyof TabletReadOnlyForm>(key: Key, value: TabletReadOnlyForm[Key]) => void
type ReadOnlyFormField = {
  [Key in keyof TabletReadOnlyForm]: { key: Key; value: TabletReadOnlyForm[Key] }
}[keyof TabletReadOnlyForm]
type SaveSelectedEdit = (toEdit: (noteId: string) => MobileWorkspaceEdit) => void
type SetOpenAction = (action: MobileWorkspaceAction | null) => void
type TabletWorkspaceNavigation = ReturnType<typeof useTabletWorkspaceNavigation>
type WorkspaceActionsContext = {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  navigation: TabletWorkspaceNavigation
  readOnlyForm: TabletReadOnlyForm
  selectedNote: MobileNote | null
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}

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
  const relationshipActions = relationshipWorkspaceActions({
    applyEdit,
    closeAction,
    readOnlyForm,
    saveSelectedEdit,
    selectedNote,
    updateReadOnlyForm,
  })
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
    } else if (edit.type === 'moveNoteToFolder' || edit.type === 'renameNoteFile') {
      setSelectedNoteId(selectedNoteIdAfterPathEdit(edit, result))
    }
  }, [applyWorkspaceEdit, navigation, setSelectedNoteId])
}

function selectedNoteIdAfterPathEdit(
  edit: Extract<MobileWorkspaceEdit, { type: 'moveNoteToFolder' | 'renameNoteFile' }>,
  result: ReturnType<typeof applyMobileWorkspaceEditWithWrites>,
) {
  const notes = result.snapshot.allNotes ?? result.snapshot.notes
  const directMatch = notes.find((note) => note.id === edit.noteId)
  if (directMatch) return directMatch.id

  const savedPath = result.writes.find((write) => write.kind === 'saveNote')?.path
  const pathMatch = savedPath ? notes.find((note) => note.path === savedPath || note.id === savedPath) : null
  return pathMatch?.id ?? result.snapshot.selectedNoteId ?? null
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
  const openAction = workspaceActionOpener({ setOpenAction, updateReadOnlyForm })

  return {
    onAddProperty: (key?: string) => openAction('addProperty', addPropertyFields(key)),
    onAddRelationship: (key?: string) => openAction('addRelationship', addRelationshipFields(key)),
    onCloseAction: closeAction,
    onOpenCreateNote: () => setOpenAction('createNote'),
    onOpenCreateView: () => openCreateView({
      filters: viewFiltersForSelection(navigation.sidebarSelection, navigation.notes, selectedNote, workspaceSnapshot.views ?? []),
      noteListTitle,
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenMoreActions: () => setOpenAction('moreActions'),
    onOpenChangeNoteType: () => openAction('changeNoteType', [{ key: 'noteType', value: selectedNote?.type ?? '' }]),
    onOpenMoveNoteToFolder: () => openAction('moveNoteToFolder', [{ key: 'folderPath', value: '' }]),
    onOpenRenameNoteFile: () => openAction('renameNoteFile', [
      { key: 'filenameStem', value: filenameStemForNote(selectedNote) },
    ]),
    onOpenSearch: () => setOpenAction('search'),
    onOpenViewActions: (selection: MobileSidebarItemSelection) => openViewActions({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
    }),
    onOpenTypeActions: (selection: MobileSidebarItemSelection) => openTypeActions({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
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
}: WorkspaceActionsContext) {
  return {
    onCreateNote: () => createNote({
      applyEdit,
      closeAction,
      defaults: createNoteDefaultsForSelection(
        navigation.sidebarSelection,
        workspaceSnapshot.views ?? [],
        workspaceSnapshot.typeDefinitions,
      ),
      title: readOnlyForm.createTitle,
    }),
    onCreateTitleChange: (value: string) => updateReadOnlyForm('createTitle', value),
    onCreateView: () => createView({
      applyEdit,
      closeAction,
      filters: readOnlyForm.viewFilters,
      name: readOnlyForm.viewName,
      selectedNote,
      selection: navigation.sidebarSelection,
      typeDefinitions: workspaceSnapshot.typeDefinitions,
    }),
    ...savedViewWorkspaceActions({ applyEdit, closeAction, readOnlyForm, updateReadOnlyForm, workspaceSnapshot }),
    ...typeSectionWorkspaceActions({ applyEdit, closeAction, readOnlyForm, updateReadOnlyForm, workspaceSnapshot }),
  }
}

function savedViewWorkspaceActions({
  applyEdit,
  closeAction,
  readOnlyForm,
  updateReadOnlyForm,
  workspaceSnapshot,
}: Pick<WorkspaceActionsContext, 'applyEdit' | 'closeAction' | 'readOnlyForm' | 'updateReadOnlyForm' | 'workspaceSnapshot'>) {
  return {
    canMoveViewDown: canMoveMobileSavedView(workspaceSnapshot.views ?? [], readOnlyForm.editingViewId, 'down'),
    canMoveViewUp: canMoveMobileSavedView(workspaceSnapshot.views ?? [], readOnlyForm.editingViewId, 'up'),
    onDeleteView: () => deleteView({ applyEdit, closeAction, viewId: readOnlyForm.editingViewId }),
    onMoveViewDown: () => moveView({ applyEdit, direction: 'down', viewId: readOnlyForm.editingViewId }),
    onMoveViewUp: () => moveView({ applyEdit, direction: 'up', viewId: readOnlyForm.editingViewId }),
    onSaveView: () => updateView({
      applyEdit,
      closeAction,
      displayProperties: readOnlyForm.viewDisplayProperties,
      filters: readOnlyForm.viewFilters,
      name: readOnlyForm.viewName,
      viewId: readOnlyForm.editingViewId,
      views: workspaceSnapshot.views ?? [],
    }),
    onViewDisplayPropertiesChange: (value: string[]) => updateReadOnlyForm('viewDisplayProperties', value),
    onViewFiltersChange: (value: MobileViewFilterGroup) => updateReadOnlyForm('viewFilters', value),
    onViewNameChange: (value: string) => updateReadOnlyForm('viewName', value),
    onViewPropertyQueryChange: (value: string) => updateReadOnlyForm('viewPropertyQuery', value),
    viewPropertyOptions: mobileListPropertySuggestions(
      editableViewPropertyNotes(readOnlyForm, workspaceSnapshot),
      readOnlyForm.viewPropertyQuery,
    ),
  }
}

function typeSectionWorkspaceActions({
  applyEdit,
  closeAction,
  readOnlyForm,
  updateReadOnlyForm,
  workspaceSnapshot,
}: Pick<WorkspaceActionsContext, 'applyEdit' | 'closeAction' | 'readOnlyForm' | 'updateReadOnlyForm' | 'workspaceSnapshot'>) {
  const notes = workspaceNotes(workspaceSnapshot)

  return {
    onSaveTypeDefinition: () => updateTypeDefinition({ applyEdit, closeAction, form: readOnlyForm }),
    onTypeDisplayPropertiesChange: (value: string[]) => updateReadOnlyForm('typeDisplayProperties', value),
    onTypePropertyQueryChange: (value: string) => updateReadOnlyForm('typePropertyQuery', value),
    onTypeSchemaPropertyAdd: () => addTypeSchemaPropertyFormValue({ form: readOnlyForm, updateReadOnlyForm }),
    onTypeSchemaPropertyNameChange: (value: string) => updateReadOnlyForm('typeSchemaPropertyName', value),
    onTypeSchemaPropertyRemove: (index: number) => updateReadOnlyForm('typeSchemaProperties', removeTypeSchemaPropertyAt(readOnlyForm.typeSchemaProperties, index)),
    onTypeSchemaPropertyValueChange: (value: string) => updateReadOnlyForm('typeSchemaPropertyValue', value),
    onTypeSchemaRelationshipAdd: () => addTypeSchemaRelationshipFormValue({ form: readOnlyForm, notes, updateReadOnlyForm }),
    onTypeSchemaRelationshipNameChange: (value: string) => updateReadOnlyForm('typeSchemaRelationshipName', value),
    onTypeSchemaRelationshipRemove: (index: number) => updateReadOnlyForm('typeSchemaRelationships', removeTypeSchemaRelationshipAt(readOnlyForm.typeSchemaRelationships, index)),
    onTypeSchemaRelationshipTargetChange: (value: string) => updateReadOnlyForm('typeSchemaRelationshipTarget', value),
    onTypeSectionLabelChange: (value: string) => updateReadOnlyForm('typeSectionLabel', value),
    onTypeSortChange: (value: string) => updateReadOnlyForm('typeSort', value),
    onTypeToneChange: (value: MobileTone) => updateReadOnlyForm('typeTone', value),
    onTypeVisibleChange: (value: boolean) => updateReadOnlyForm('typeVisible', value),
    typePropertyOptions: mobileListPropertySuggestions(
      editableTypePropertyNotes(readOnlyForm, workspaceSnapshot),
      readOnlyForm.typePropertyQuery,
    ),
    typeRelationshipTargetOptions: typeSchemaRelationshipTargetSuggestions(notes, readOnlyForm.typeSchemaRelationshipTarget),
  }
}

function addTypeSchemaPropertyFormValue({
  form,
  updateReadOnlyForm,
}: {
  form: TabletReadOnlyForm
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  updateReadOnlyForm('typeSchemaProperties', addTypeSchemaProperty(
    form.typeSchemaProperties,
    form.typeSchemaPropertyName,
    form.typeSchemaPropertyValue,
  ))
  updateReadOnlyForm('typeSchemaPropertyName', '')
  updateReadOnlyForm('typeSchemaPropertyValue', '')
}

function addTypeSchemaRelationshipFormValue({
  form,
  notes,
  updateReadOnlyForm,
}: {
  form: TabletReadOnlyForm
  notes: MobileNote[]
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  updateReadOnlyForm('typeSchemaRelationships', addTypeSchemaRelationshipRef(
    form.typeSchemaRelationships,
    form.typeSchemaRelationshipName,
    form.typeSchemaRelationshipTarget,
    notes,
  ))
  updateReadOnlyForm('typeSchemaRelationshipName', '')
  updateReadOnlyForm('typeSchemaRelationshipTarget', '')
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
  const openAction = workspaceActionOpener({ setOpenAction, updateReadOnlyForm })

  return {
    onDeleteProperty: (noteId: string, key: string) => applyEdit({ key, noteId, type: 'deleteProperty' }),
    onEditProperty: (_noteId: string, key: string, value: MobilePropertyValue) => {
      openAction('editProperty', editPropertyFields(key, value))
    },
    onPropertyNameChange: (value: string) => updateReadOnlyForm('propertyName', value),
    onPropertyValueChange: (value: string) => updateReadOnlyForm('propertyValue', value),
    onSaveProperty: () => saveSelectedEdit((noteId) => propertyEdit(readOnlyForm, noteId)),
  }
}

function relationshipWorkspaceActions({
  applyEdit,
  closeAction,
  readOnlyForm,
  saveSelectedEdit,
  selectedNote,
  updateReadOnlyForm,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  readOnlyForm: TabletReadOnlyForm
  saveSelectedEdit: SaveSelectedEdit
  selectedNote: MobileNote | null
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return {
    onCreateRelationshipTarget: () => createRelationshipTarget({
      applyEdit,
      closeAction,
      form: readOnlyForm,
      selectedNote,
    }),
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
    onFilenameStemChange: (value: string) => updateReadOnlyForm('filenameStem', value),
    onFolderPathChange: (value: string) => updateReadOnlyForm('folderPath', value),
    onMoveNoteToFolder: () => saveSelectedEdit((noteId) => ({
      folderPath: readOnlyForm.folderPath,
      noteId,
      type: 'moveNoteToFolder',
    })),
    onRenameNoteFile: () => saveSelectedEdit((noteId) => ({
      filenameStem: readOnlyForm.filenameStem,
      noteId,
      type: 'renameNoteFile',
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

function filenameStemForNote(note: MobileNote | null): string {
  const path = note?.path ?? note?.id ?? ''
  const filename = path.split('/').filter(Boolean).at(-1) ?? path
  return filename.replace(/\.md$/u, '')
}

function editPropertyFields(key: string, value: MobilePropertyValue): ReadOnlyFormField[] {
  return [
    { key: 'propertyName', value: key },
    { key: 'propertyValue', value: propertyValueFormText(value) },
    { key: 'propertyValueKind', value: propertyValueKind(key, value) },
  ]
}

function addPropertyFields(key?: string): ReadOnlyFormField[] {
  return [
    { key: 'propertyName', value: key ?? '' },
    { key: 'propertyValue', value: '' },
    { key: 'propertyValueKind', value: 'string' },
  ]
}

function addRelationshipFields(key?: string): ReadOnlyFormField[] {
  return [
    { key: 'relationshipName', value: key ?? '' },
    { key: 'relationshipNoteTitle', value: '' },
  ]
}

function workspaceActionOpener({
  setOpenAction,
  updateReadOnlyForm,
}: {
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return (action: MobileWorkspaceAction, fields: ReadOnlyFormField[]) => openWorkspaceAction({
    action,
    fields,
    setOpenAction,
    updateReadOnlyForm,
  })
}

function openWorkspaceAction({
  action,
  fields,
  setOpenAction,
  updateReadOnlyForm,
}: {
  action: MobileWorkspaceAction
  fields: ReadOnlyFormField[]
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  for (const { key, value } of fields) updateReadOnlyForm(key, value)
  setOpenAction(action)
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
  snapshot,
  updateReadOnlyForm,
}: {
  selection: MobileSidebarItemSelection
  setOpenAction: SetOpenAction
  snapshot: MobileWorkspaceSnapshot
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  if (selection.sectionId !== 'views') return
  const views = snapshot.views ?? []
  const view = views.find((candidate) => candidate.id === (selection.viewId ?? selection.id))
  if (!view) return
  updateReadOnlyForm('editingViewId', selection.viewId ?? selection.id)
  updateReadOnlyForm('viewDisplayProperties', viewDisplayPropertiesForEdit(view, snapshot))
  updateReadOnlyForm('viewFilters', cloneFilterGroup(view.definition.filters))
  updateReadOnlyForm('viewName', selection.label)
  updateReadOnlyForm('viewPropertyQuery', '')
  setOpenAction('editView')
}

function openTypeActions({
  selection,
  setOpenAction,
  snapshot,
  updateReadOnlyForm,
}: {
  selection: MobileSidebarItemSelection
  setOpenAction: SetOpenAction
  snapshot: MobileWorkspaceSnapshot
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  if (selection.sectionId !== 'types') return
  const typeName = selection.typeName ?? typeNameForSidebarSelection(snapshot, selection.id)
  if (!typeName) return

  openWorkspaceAction({
    action: 'editTypeSection',
    fields: typeDefinitionFields({
      definition: snapshot.typeDefinitions?.[typeName],
      label: selection.label,
      typeName,
    }),
    setOpenAction,
    updateReadOnlyForm,
  })
}

function typeDefinitionFields({
  definition,
  label,
  typeName,
}: {
  definition: MobileTypeDefinitions[string] | undefined
  label: string
  typeName: string
}): ReadOnlyFormField[] {
  return [
    { key: 'typeDisplayProperties', value: definition?.listPropertiesDisplay ?? [] },
    { key: 'typeName', value: typeName },
    { key: 'typePropertyQuery', value: '' },
    { key: 'typeSchemaProperties', value: typeSchemaPropertiesForForm(definition) },
    { key: 'typeSchemaPropertyName', value: '' },
    { key: 'typeSchemaPropertyValue', value: '' },
    { key: 'typeSchemaRelationships', value: typeSchemaRelationshipsForForm(definition) },
    { key: 'typeSchemaRelationshipName', value: '' },
    { key: 'typeSchemaRelationshipTarget', value: '' },
    { key: 'typeSectionLabel', value: definition?.label ?? label },
    { key: 'typeSort', value: definition?.sort ?? '' },
    { key: 'typeTone', value: definition?.tone ?? 'gray' },
    { key: 'typeVisible', value: definition?.visible !== false },
  ]
}

function createNote({
  applyEdit,
  closeAction,
  defaults,
  title,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  defaults: MobileCreateNoteDefaults
  title: string
}) {
  applyEdit({ defaults, title, type: 'createNote' })
  closeAction()
}

function createRelationshipTarget({
  applyEdit,
  closeAction,
  form,
  selectedNote,
}: {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  form: TabletReadOnlyForm
  selectedNote: MobileNote | null
}) {
  const key = form.relationshipName.trim()
  const title = form.relationshipNoteTitle.trim()
  if (!selectedNote || !key || !title) return

  const sourceNoteId = selectedNote.id
  applyEdit({ title, type: 'createNote' })
  applyEdit({ key, noteId: sourceNoteId, targetTitle: title, type: 'addRelationship' })
  closeAction()
}

function createView({
  applyEdit,
  closeAction,
  filters,
  name,
  selectedNote,
  selection,
  typeDefinitions,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  filters: MobileViewFilterGroup
  name: string
  selectedNote: MobileNote | null
  selection: TabletSidebarSelection
  typeDefinitions?: MobileTypeDefinitions
}) {
  const trimmedName = name.trim()
  if (!trimmedName) return

  applyEdit({
    definition: {
      color: viewColorForSelection(selection, selectedNote, typeDefinitions),
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
  displayProperties,
  filters,
  name,
  viewId,
  views,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  displayProperties: string[]
  filters: MobileViewFilterGroup
  name: string
  viewId: string
  views: NonNullable<MobileWorkspaceSnapshot['views']>
}) {
  const view = views.find((candidate) => candidate.id === viewId)
  const trimmedName = name.trim()
  if (!view || !trimmedName) return

  applyEdit({
    definition: {
      ...view.definition,
      filters,
      listPropertiesDisplay: normalizedListPropertiesDisplay(displayProperties),
      name: trimmedName,
    },
    type: 'updateView',
    viewId,
  })
  closeAction()
}

function updateTypeDefinition({
  applyEdit,
  closeAction,
  form,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  form: TabletReadOnlyForm
}) {
  const typeName = form.typeName.trim()
  if (!typeName) return

  applyEdit({
    patch: {
      label: form.typeSectionLabel,
      listPropertiesDisplay: normalizedListPropertiesDisplay(form.typeDisplayProperties),
      ...typeDefinitionSchemaPatch(form.typeSchemaProperties, form.typeSchemaRelationships),
      sort: form.typeSort,
      tone: form.typeTone,
      visible: form.typeVisible ? null : false,
    },
    type: 'updateTypeDefinition',
    typeName,
  })
  closeAction()
}

function editableTypePropertyNotes(
  form: TabletReadOnlyForm,
  snapshot: MobileWorkspaceSnapshot,
): MobileNote[] {
  const normalizedType = normalizedLabel(form.typeName)
  if (!normalizedType) return workspaceNotes(snapshot)
  return workspaceNotes(snapshot).filter((note) => normalizedLabel(note.type) === normalizedType)
}

function editableViewPropertyNotes(
  form: TabletReadOnlyForm,
  snapshot: MobileWorkspaceSnapshot,
): MobileNote[] {
  const view = (snapshot.views ?? []).find((candidate) => candidate.id === form.editingViewId)
  if (!view) return workspaceNotes(snapshot)

  return evaluateMobileSavedView({
    ...view,
    definition: { ...view.definition, filters: form.viewFilters },
  }, workspaceNotes(snapshot))
}

function viewDisplayPropertiesForEdit(
  view: MobileSavedView,
  snapshot: MobileWorkspaceSnapshot,
): string[] {
  const displayProperties = view.definition.listPropertiesDisplay ?? []
  if (displayProperties.length > 0) return [...displayProperties]

  return mobileDefaultListPropertyDisplay(
    evaluateMobileSavedView(view, workspaceNotes(snapshot)),
    snapshot.typeDefinitions,
  )
}

function normalizedListPropertiesDisplay(displayProperties: string[]) {
  const seen = new Set<string>()
  return displayProperties
    .map((key) => key.trim())
    .filter((key) => {
      const normalized = key.toLowerCase()
      if (!normalized || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
}

function workspaceNotes(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.allNotes ?? snapshot.notes
}

function typeNameForSidebarSelection(
  snapshot: MobileWorkspaceSnapshot,
  selectionId: string,
): string | null {
  return snapshot.sidebarSections
    .find((section) => section.id === 'types')
    ?.items
    ?.find((item) => item.id === selectionId)
    ?.typeName ?? null
}

function normalizedLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function moveView({
  applyEdit,
  direction,
  viewId,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  direction: 'down' | 'up'
  viewId: string
}) {
  if (!viewId) return
  applyEdit({ direction, type: 'moveView', viewId })
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
