import { useCallback, useEffect, useState } from 'react'
import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type {
  MobileSidebarFolderSelection,
  MobileSidebarItemSelection,
} from '../components/workspace/MobileWorkspaceSidebar'
import type {
  MobileNote,
  MobilePropertyValue,
  MobileSavedView,
  MobileSidebarIcon,
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
import { mobileNoteActionMode } from '../workspace/mobileNoteActionMode'
import { mobileNoteWithResolvedWidth } from '../workspace/mobileNoteWidth'
import { canMoveMobileSavedView, evaluateMobileSavedView } from '../workspace/mobileSavedViews'
import { mobileDefaultNoteWidthFromVaultConfig } from '../workspace/mobileVaultConfig'
import {
  removeTypeSchemaPropertyAt,
  removeTypeSchemaRelationshipAt,
} from '../workspace/mobileTypeDefinitionSchema'
import {
  mobileDefaultListPropertyDisplay,
  mobileListPropertySuggestions,
  mobileSortablePropertySuggestions,
} from '../workspace/mobileWorkspaceSuggestions'
import {
  mobilePropertyValueKindForKey,
  mobilePropertyValueTextForKindChange,
  type MobilePropertyValueKind,
} from '../workspace/mobilePropertyValues'
import { mobileTypeNameFromSidebarLabel } from '../workspace/mobileTypeNames'
import { useTabletWorkspaceNavigation } from './tabletWorkspaceNavigation'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'
import {
  createTypedWorkspaceNote,
  createWorkspaceNote,
  createWorkspaceView,
} from './tabletWorkspaceCreateActions'
import { editorWorkspaceActions } from './tabletWorkspaceEditorActions'
import { selectAfterWorkspaceEdit } from './tabletWorkspaceEditSelection'
import { favoriteWorkspaceActions, openFavoriteActions } from './tabletWorkspaceFavoriteActions'
import { useWorkspaceEditPipeline } from './tabletWorkspacePersistence'
import {
  createFolderFields,
  folderActionFields,
  folderParentPathForSelection,
  folderWorkspaceActions,
} from './tabletWorkspaceFolderActions'
import { selectedFolderCommandActions } from './tabletWorkspaceSelectedFolderActions'
import {
  openPrimaryListProperties,
  primaryNoteListWorkspaceActions,
} from './tabletWorkspacePrimaryNoteListActions'
import {
  addTypeSchemaPropertyFormValue,
  addTypeSchemaRelationshipFormValue,
  typeSchemaSourceNote,
} from './tabletWorkspaceTypeSchemaActions'
import { typeSectionSuggestionOptions } from './tabletWorkspaceTypeSectionSuggestions'
import {
  createTypeDefinitionEdit,
  toggleTypeVisibilityEdit,
  typeDefinitionSaveEdit,
} from './tabletWorkspaceTypeDefinitionSave'
import {
  typeDefinitionFields,
  type ReadOnlyFormField,
} from './tabletWorkspaceTypeDefinitionFields'
import { viewDefinitionSaveEdit } from './tabletWorkspaceViewDefinitionSave'
import {
  addPropertyFields,
  deletePropertyEdit,
  editPropertyFields,
  propertyEditFromForm,
} from './tabletWorkspacePropertyActions'
import {
  addRelationshipEditFromForm,
  createRelationshipTargetEditFromForm,
  removeRelationshipEdit,
} from './tabletWorkspaceRelationshipActions'
import {
  changeNoteTypeEditFromForm,
  moveNoteToFolderEditFromForm,
  renameNoteFileEditFromForm,
  renameNoteFileToTitleEdit,
} from './tabletWorkspaceNoteRetargetActions'
import {
  removeNoteIconEdit,
  setNoteIconEditFromForm,
} from './tabletWorkspaceNoteIconActions'
import {
  deleteTypeDefinitionEdit,
  deleteViewEdit,
  moveTypeSectionEdit,
  moveViewEdit,
} from './tabletWorkspaceSidebarEditActions'
import { createViewInitialFilters } from './tabletWorkspaceViewHelpers'

const emptyReadOnlyForm: TabletReadOnlyForm = {
  allNotesShowImages: false,
  allNotesShowPdfs: false,
  allNotesShowUnsupported: false,
  createTitle: '',
  editingFavoriteNoteId: '',
  editingFolderPath: '',
  editingViewId: '',
  filenameStem: '',
  folderName: '',
  folderParentPath: '',
  folderPath: '',
  noteIcon: '',
  noteType: '',
  primaryDisplayProperties: [],
  primaryItemId: '',
  primaryPropertyQuery: '',
  propertyName: '',
  propertyValue: '',
  propertyValueKind: 'string',
  relationshipName: '',
  relationshipNoteRef: '',
  relationshipNoteTitle: '',
  typeDisplayProperties: [],
  typeName: '',
  typePropertyQuery: '',
  typeSchemaProperties: [],
  typeSchemaPropertyName: '',
  typeSchemaPropertyValue: '',
  typeSchemaRelationships: [],
  typeSchemaRelationshipName: '',
  typeSchemaRelationshipTargetRef: '',
  typeSchemaRelationshipTarget: '',
  typeSectionLabel: '',
  typeRenameName: '',
  typeSort: '',
  typeTemplate: '',
  typeIcon: 'file',
  typeTone: 'gray',
  typeVisible: true,
  viewDisplayProperties: [],
  viewFilters: { all: [] },
  viewIcon: '',
  viewName: '',
  viewPropertyQuery: '',
  viewSort: '',
  viewTone: null,
}

type ApplyWorkspaceEdit = (edit: MobileWorkspaceEdit) => void
type ReadOnlyFormUpdater = <Key extends keyof TabletReadOnlyForm>(key: Key, value: TabletReadOnlyForm[Key]) => void
type SaveSelectedEdit = (toEdit: (noteId: string) => MobileWorkspaceEdit | null) => void
type SetOpenAction = (action: MobileWorkspaceAction | null) => void
type TabletWorkspaceNavigation = ReturnType<typeof useTabletWorkspaceNavigation>
type WorkspaceActionsContext = {
  applyEdit: ApplyWorkspaceEdit
  closeAction: () => void
  navigation: TabletWorkspaceNavigation
  readOnlyForm: TabletReadOnlyForm
  repositoryRequest?: ReadOnlyWorkspaceRequest
  selectedNote: MobileNote | null
  setOpenAction: SetOpenAction
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
  const {
    applyWorkspaceEdit,
    canRedoWorkspaceEdit,
    canUndoWorkspaceEdit,
    redoWorkspaceEdit,
    reloadWorkspaceSnapshot,
    undoWorkspaceEdit,
    workspaceSnapshot,
  } = useWorkspaceEditPipeline({
    repository,
    repositoryRequest,
    snapshot,
  })
  const [openAction, setOpenAction] = useState<MobileWorkspaceAction | null>(null)
  const { readOnlyForm, resetForm, updateReadOnlyForm } = useReadOnlyFormState()
  const [searchQuery, setSearchQuery] = useState('')
  const navigation = useTabletWorkspaceNavigation(workspaceSnapshot, searchQuery)
  const { setSelectedNoteId } = navigation
  const defaultNoteWidth = mobileDefaultNoteWidthFromVaultConfig(workspaceSnapshot.vaultConfig)
  const selectedNote = navigation.selectedNote
    ? mobileNoteWithResolvedWidth(navigation.selectedNote, defaultNoteWidth)
    : null
  const applyEdit = useControllerApplyEdit({ applyWorkspaceEdit, navigation, setSelectedNoteId })
  const closeAction = useCloseWorkspaceAction({ resetForm, setOpenAction })
  const saveSelectedEdit = useSaveSelectedEdit({ applyEdit, closeAction, selectedNote })
  const workspaceActionsContext = {
    applyEdit,
    closeAction,
    navigation,
    readOnlyForm,
    repositoryRequest,
    selectedNote,
    setOpenAction,
    updateReadOnlyForm,
    workspaceSnapshot,
  }
  const createActions = createWorkspaceActions(workspaceActionsContext)
  const propertyActions = propertyWorkspaceActions({
    applyEdit,
    readOnlyForm,
    saveSelectedEdit,
    setOpenAction,
    updateReadOnlyForm,
    workspaceSnapshot,
  })
  const relationshipActions = relationshipWorkspaceActions({
    applyEdit,
    closeAction,
    readOnlyForm,
    saveSelectedEdit,
    selectedNote,
    updateReadOnlyForm,
  })
  const retargetActions = retargetWorkspaceActions({
    readOnlyForm,
    saveSelectedEdit,
    selectedNote,
    updateReadOnlyForm,
  })
  const editorActions = editorWorkspaceActions({
    applyEdit,
    repositoryRequest,
    selectedNote,
    workspaceSnapshot,
  })
  const selectedViewActions = selectedViewCommandActions({
    applyEdit,
    navigation,
    workspaceSnapshot,
  })
  const selectedFolderActions = selectedFolderCommandActions({
    applyEdit,
    sidebarSelection: navigation.sidebarSelection,
    vaultRootUri: repositoryRequest?.vaultRootUri ?? null,
  })
  const noteIconActions = noteIconWorkspaceActions({
    readOnlyForm,
    saveSelectedEdit,
    updateReadOnlyForm,
  })
  const actionSheetActions = actionSheetWorkspaceActions({
    ...workspaceActionsContext,
    onCreateNoteDirect: createActions.onCreateNote,
  })
  useHydrateSelectedNote({ applyEdit, repository, repositoryRequest, selectedNote })

  return {
    ...actionSheetActions,
    ...navigation,
    ...createActions,
    ...editorActions,
    ...noteIconActions,
    ...propertyActions,
    ...relationshipActions,
    ...retargetActions,
    ...selectedFolderActions,
    ...selectedViewActions,
    openAction,
    readOnlyForm,
    searchQuery,
    defaultNoteWidth,
    snapshot: workspaceSnapshot,
    selectedNote,
    vaultRootUri: repositoryRequest?.vaultRootUri ?? null,
    canRedoWorkspaceEdit,
    canUndoWorkspaceEdit,
    onEnterNeighborhood: navigation.selectNeighborhoodNote,
    onGoBack: navigation.goBack,
    onGoForward: navigation.goForward,
    onRedoWorkspaceEdit: redoWorkspaceEdit,
    onReloadVault: reloadWorkspaceSnapshot,
    onSelectFolder: navigation.selectFolder,
    onSelectNote: navigation.selectNote,
    onSelectSidebarItem: navigation.selectSidebarItem,
    onSearchQueryChange: setSearchQuery,
    onUndoWorkspaceEdit: undoWorkspaceEdit,
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
    selectAfterWorkspaceEdit({ edit, navigation, result, setSelectedNoteId })
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
  return useCallback((toEdit: (noteId: string) => MobileWorkspaceEdit | null) => {
    if (!selectedNote) return
    const edit = toEdit(selectedNote.id)
    if (!edit) return
    applyEdit(edit)
    closeAction()
  }, [applyEdit, closeAction, selectedNote])
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
    const hydrationType = mobileHydrationType(selectedNote)
    if (!hydrationType) return

    let cancelled = false
    void repository.readNoteContent(selectedNote, repositoryRequest).then((rawContent) => {
      if (cancelled || rawContent === null) return
      applyEdit({ noteId: selectedNote.id, rawContent, type: hydrationType })
    })

    return () => {
      cancelled = true
    }
  }, [applyEdit, repository, repositoryRequest, selectedNote])
}

function mobileHydrationType(note: MobileNote): 'hydrateNoteContent' | 'hydrateTextFileContent' | null {
  const actionMode = mobileNoteActionMode(note)
  if (actionMode === 'markdown-note') return 'hydrateNoteContent'
  return actionMode === 'text-file' ? 'hydrateTextFileContent' : null
}

function actionSheetWorkspaceActions({
  closeAction,
  navigation,
  onCreateNoteDirect,
  selectedNote,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  closeAction: () => void
  navigation: TabletWorkspaceNavigation
  onCreateNoteDirect: (titleOverride?: string) => void
  selectedNote: MobileNote | null
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  const openAction = workspaceActionOpener({ setOpenAction, updateReadOnlyForm })

  return {
    onCloseAction: closeAction,
    ...coreWorkspaceActionOpeners({ navigation, onCreateNoteDirect, openAction, setOpenAction, updateReadOnlyForm, workspaceSnapshot }),
    ...noteWorkspaceActionOpeners({ openAction, selectedNote, setOpenAction }),
    ...sidebarWorkspaceActionOpeners({ setOpenAction, updateReadOnlyForm, workspaceSnapshot }),
  }
}

function coreWorkspaceActionOpeners({
  navigation,
  onCreateNoteDirect,
  openAction,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  navigation: TabletWorkspaceNavigation
  onCreateNoteDirect: (titleOverride?: string) => void
  openAction: ReturnType<typeof workspaceActionOpener>
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onAddProperty: (key?: string) => openAction('addProperty', addPropertyFields(key, workspaceSnapshot.vaultConfig?.propertyDisplayModes)),
    onAddRelationship: (key?: string) => openAction('addRelationship', addRelationshipFields(key)),
    onOpenCreateFolder: () => openWorkspaceAction({
      action: 'createFolder',
      fields: createFolderFields(folderParentPathForSelection(navigation.sidebarSelection)),
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenCreateNote: () => onCreateNoteDirect(''),
    onOpenCreateType: () => openAction('createType', [{ key: 'typeName', value: '' }]),
    onOpenCreateTypeWithName: (typeName: string) => openAction('createType', [{ key: 'typeName', value: typeName }]),
    onOpenCreateView: () => openCreateView({ setOpenAction, updateReadOnlyForm }),
    onOpenSearch: () => setOpenAction('search'),
  }
}

function noteWorkspaceActionOpeners({
  openAction,
  selectedNote,
  setOpenAction,
}: {
  openAction: ReturnType<typeof workspaceActionOpener>
  selectedNote: MobileNote | null
  setOpenAction: SetOpenAction
}) {
  return {
    onOpenChangeNoteType: () => openAction('changeNoteType', [{ key: 'noteType', value: selectedNote?.type ?? '' }]),
    onOpenFindInNote: () => setOpenAction('findInNote'),
    onOpenMoreActions: () => setOpenAction('moreActions'),
    onOpenMoveNoteToFolder: () => openAction('moveNoteToFolder', [{ key: 'folderPath', value: '' }]),
    onOpenRenameNoteFile: () => openAction('renameNoteFile', [
      { key: 'filenameStem', value: filenameStemForNote(selectedNote) },
    ]),
    onOpenReplaceInNote: () => setOpenAction('replaceInNote'),
    onOpenSetNoteIcon: () => openAction('setNoteIcon', [
      { key: 'noteIcon', value: selectedNote?.icon ?? '' },
    ]),
    onOpenTableOfContents: () => setOpenAction('tableOfContents'),
  }
}

function sidebarWorkspaceActionOpeners({
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  return {
    onOpenFolderActions: (selection: MobileSidebarFolderSelection) => openWorkspaceAction({
      action: 'editFolder',
      fields: folderActionFields(selection),
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenFavoriteActions: (selection: MobileSidebarItemSelection) => openFavoriteActions({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
    }),
    onOpenPrimaryActions: (selection: MobileSidebarItemSelection) => openPrimaryListProperties({
      selection,
      setOpenAction,
      snapshot: workspaceSnapshot,
      updateReadOnlyForm,
    }),
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
    onOpenTypeVisibility: () => setOpenAction('editTypeVisibility'),
  }
}

function createWorkspaceActions({
  applyEdit,
  closeAction,
  navigation,
  readOnlyForm,
  repositoryRequest,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: WorkspaceActionsContext) {
  return {
    onCreateNote: (titleOverride?: string) => createWorkspaceNote({
      applyEdit,
      closeAction,
      selection: navigation.sidebarSelection,
      title: titleOverride ?? readOnlyForm.createTitle,
      typeDefinitions: workspaceSnapshot.typeDefinitions,
    }),
    onCreateNoteOfType: (typeName: string) => createTypedWorkspaceNote({
      applyEdit,
      closeAction,
      typeDefinitions: workspaceSnapshot.typeDefinitions,
      typeName,
    }),
    onCreateTitleChange: (value: string) => updateReadOnlyForm('createTitle', value),
    onCreateView: () => createWorkspaceView({
      applyEdit,
      closeAction,
      displayProperties: readOnlyForm.viewDisplayProperties,
      filters: readOnlyForm.viewFilters,
      icon: readOnlyForm.viewIcon,
      name: readOnlyForm.viewName,
      sort: readOnlyForm.viewSort,
      tone: readOnlyForm.viewTone,
    }),
    onCreateType: () => applyNonEmptyStringEdit({
      applyEdit,
      closeAction,
      toEdit: createTypeDefinitionEdit,
      value: readOnlyForm.typeName,
    }),
    onTypeNameChange: (value: string) => updateReadOnlyForm('typeName', value),
    ...folderWorkspaceActions({
      applyEdit,
      closeAction,
      readOnlyForm,
      selectFolder: navigation.selectFolder,
      setOpenAction,
      updateReadOnlyForm,
      vaultRootUri: repositoryRequest?.vaultRootUri,
    }),
    ...favoriteWorkspaceActions({ applyEdit, readOnlyForm, workspaceSnapshot }),
    ...primaryNoteListWorkspaceActions({ applyEdit, closeAction, readOnlyForm, updateReadOnlyForm, workspaceSnapshot }),
    ...savedViewWorkspaceActions({ applyEdit, closeAction, readOnlyForm, updateReadOnlyForm, workspaceSnapshot }),
    ...typeSectionWorkspaceActions({ applyEdit, closeAction, readOnlyForm, updateReadOnlyForm, workspaceSnapshot }),
  }
}

function selectedViewCommandActions({
  applyEdit,
  navigation,
  workspaceSnapshot,
}: Pick<WorkspaceActionsContext, 'applyEdit' | 'navigation' | 'workspaceSnapshot'>) {
  const viewId = selectedViewId(navigation.sidebarSelection)
  const views = workspaceSnapshot.views ?? []

  return {
    canMoveSelectedViewDown: viewId ? canMoveMobileSavedView(views, viewId, 'down') : false,
    canMoveSelectedViewUp: viewId ? canMoveMobileSavedView(views, viewId, 'up') : false,
    onMoveSelectedViewDown: () => moveSelectedView({ applyEdit, direction: 'down', viewId }),
    onMoveSelectedViewUp: () => moveSelectedView({ applyEdit, direction: 'up', viewId }),
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
    onMoveViewDown: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'down', itemId: readOnlyForm.editingViewId, kind: 'view' }),
    onMoveViewUp: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'up', itemId: readOnlyForm.editingViewId, kind: 'view' }),
    onSaveView: () => saveViewDefinition({
      applyEdit,
      closeAction,
      form: readOnlyForm,
      viewId: readOnlyForm.editingViewId,
      views: workspaceSnapshot.views ?? [],
    }),
    onViewDisplayPropertiesChange: (value: string[]) => updateReadOnlyForm('viewDisplayProperties', value),
    onViewFiltersChange: (value: MobileViewFilterGroup) => updateReadOnlyForm('viewFilters', value),
    onViewIconChange: (value: MobileSidebarIcon) => updateReadOnlyForm('viewIcon', value),
    onViewNameChange: (value: string) => updateReadOnlyForm('viewName', value),
    onViewPropertyQueryChange: (value: string) => updateReadOnlyForm('viewPropertyQuery', value),
    onViewSortChange: (value: string) => updateReadOnlyForm('viewSort', value),
    onViewToneChange: (value: MobileTone) => updateReadOnlyForm('viewTone', value),
    viewPropertyOptions: mobileListPropertySuggestions(
      editableViewPropertyNotes(readOnlyForm, workspaceSnapshot),
      readOnlyForm.viewPropertyQuery,
      workspaceSnapshot.typeDefinitions,
    ),
    viewSortPropertyOptions: mobileSortablePropertySuggestions(
      editableViewPropertyNotes(readOnlyForm, workspaceSnapshot),
      '',
      workspaceSnapshot.typeDefinitions,
    ),
  }
}

function selectedViewId(selection: TabletWorkspaceNavigation['sidebarSelection']): string | null {
  if (selection.kind !== 'item' || selection.sectionId !== 'views') return null
  return selection.viewId ?? selection.id
}

function moveSelectedView({
  applyEdit,
  direction,
  viewId,
}: {
  applyEdit: ApplyWorkspaceEdit
  direction: 'down' | 'up'
  viewId: string | null
}) {
  if (!viewId) return
  moveWorkspaceSidebarItem({ applyEdit, direction, itemId: viewId, kind: 'view' })
}

function typeSectionWorkspaceActions({
  applyEdit,
  closeAction,
  readOnlyForm,
  updateReadOnlyForm,
  workspaceSnapshot,
}: Pick<WorkspaceActionsContext, 'applyEdit' | 'closeAction' | 'readOnlyForm' | 'updateReadOnlyForm' | 'workspaceSnapshot'>) {
  const notes = workspaceNotes(workspaceSnapshot)
  const sourceNote = typeSchemaSourceNote(workspaceSnapshot, readOnlyForm.typeName)

  return {
    canDeleteType: Boolean(workspaceSnapshot.typeDefinitions?.[readOnlyForm.typeName]),
    canMoveTypeDown: canMoveTypeSection(workspaceSnapshot, readOnlyForm.typeName, 'down'),
    canMoveTypeUp: canMoveTypeSection(workspaceSnapshot, readOnlyForm.typeName, 'up'),
    onDeleteType: () => applyNonEmptyStringEdit({
      applyEdit,
      closeAction,
      toEdit: deleteTypeDefinitionEdit,
      value: readOnlyForm.typeName,
    }),
    onMoveTypeDown: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'down', itemId: readOnlyForm.typeName, kind: 'typeSection' }),
    onMoveTypeUp: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'up', itemId: readOnlyForm.typeName, kind: 'typeSection' }),
    onSaveTypeDefinition: () => updateTypeDefinition({
      applyEdit,
      closeAction,
      form: readOnlyForm,
      workspaceSnapshot,
    }),
    onTypeDisplayPropertiesChange: (value: string[]) => updateReadOnlyForm('typeDisplayProperties', value),
    onTypePropertyQueryChange: (value: string) => updateReadOnlyForm('typePropertyQuery', value),
    ...typeSectionSchemaWorkspaceActions({
      notes,
      readOnlyForm,
      sourceNote,
      updateReadOnlyForm,
    }),
    onTypeRenameNameChange: (value: string) => updateReadOnlyForm('typeRenameName', value),
    onTypeSectionLabelChange: (value: string) => updateReadOnlyForm('typeSectionLabel', value),
    onTypeSortChange: (value: string) => updateReadOnlyForm('typeSort', value),
    onTypeTemplateChange: (value: string) => updateReadOnlyForm('typeTemplate', value),
    onTypeIconChange: (value: MobileSidebarIcon) => updateReadOnlyForm('typeIcon', value),
    onTypeToneChange: (value: MobileTone) => updateReadOnlyForm('typeTone', value),
    onTypeVisibleChange: (value: boolean) => updateReadOnlyForm('typeVisible', value),
    onToggleTypeVisibility: (typeName: string) => toggleTypeVisibility({
      applyEdit,
      typeDefinitions: workspaceSnapshot.typeDefinitions,
      typeName,
    }),
    ...typeSectionSuggestionOptions({
      notes,
      readOnlyForm,
      sourceNote,
      workspaceSnapshot,
    }),
  }
}

function typeSectionSchemaWorkspaceActions({
  notes,
  readOnlyForm,
  sourceNote,
  updateReadOnlyForm,
}: {
  notes: MobileNote[]
  readOnlyForm: TabletReadOnlyForm
  sourceNote: MobileNote | null
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return {
    onTypeSchemaPropertyAdd: () => addTypeSchemaPropertyFormValue({ form: readOnlyForm, updateReadOnlyForm }),
    onTypeSchemaPropertyNameChange: (value: string) => updateReadOnlyForm('typeSchemaPropertyName', value),
    onTypeSchemaPropertyRemove: (index: number) => updateReadOnlyForm('typeSchemaProperties', removeTypeSchemaPropertyAt(readOnlyForm.typeSchemaProperties, index)),
    onTypeSchemaPropertyValueChange: (value: string) => updateReadOnlyForm('typeSchemaPropertyValue', value),
    onTypeSchemaRelationshipAdd: () => addTypeSchemaRelationshipFormValue({
      form: readOnlyForm,
      notes,
      sourceNote,
      updateReadOnlyForm,
    }),
    onTypeSchemaRelationshipNameChange: (value: string) => updateReadOnlyForm('typeSchemaRelationshipName', value),
    onTypeSchemaRelationshipRemove: (index: number) => updateReadOnlyForm('typeSchemaRelationships', removeTypeSchemaRelationshipAt(readOnlyForm.typeSchemaRelationships, index)),
    onTypeSchemaRelationshipTargetSelect: (title: string, ref: string) => {
      updateReadOnlyForm('typeSchemaRelationshipTarget', title)
      updateReadOnlyForm('typeSchemaRelationshipTargetRef', ref)
    },
    onTypeSchemaRelationshipTargetChange: (value: string) => {
      updateReadOnlyForm('typeSchemaRelationshipTarget', value)
      updateReadOnlyForm('typeSchemaRelationshipTargetRef', '')
    },
  }
}

function propertyWorkspaceActions({
  applyEdit,
  readOnlyForm,
  saveSelectedEdit,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  applyEdit: ApplyWorkspaceEdit
  readOnlyForm: TabletReadOnlyForm
  saveSelectedEdit: SaveSelectedEdit
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  const openAction = workspaceActionOpener({ setOpenAction, updateReadOnlyForm })

  return {
    onDeleteProperty: (noteId: string, key: string) => {
      const edit = deletePropertyEdit(noteId, key)
      if (edit) applyEdit(edit)
    },
    onInitializeProperties: (noteId: string) => {
      applyEdit({
        key: 'type',
        noteId,
        type: 'updateProperty',
        value: 'Note',
      })
    },
    onEditProperty: (_noteId: string, key: string, value: MobilePropertyValue) => {
      openAction('editProperty', editPropertyFields(key, value, workspaceSnapshot.vaultConfig?.propertyDisplayModes))
    },
    onPropertyNameChange: (value: string) => {
      updateReadOnlyForm('propertyName', value)
      updateReadOnlyForm('propertyValueKind', mobilePropertyValueKindForKey(value, readOnlyForm.propertyValueKind, workspaceSnapshot.vaultConfig?.propertyDisplayModes))
    },
    onPropertyValueChange: (value: string) => updateReadOnlyForm('propertyValue', value),
    onPropertyValueKindChange: (value: MobilePropertyValueKind) => {
      updateReadOnlyForm('propertyValueKind', value)
      updateReadOnlyForm('propertyValue', mobilePropertyValueTextForKindChange(readOnlyForm.propertyValue, value))
    },
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
    onRelationshipNoteSelect: (title: string, ref: string) => {
      updateReadOnlyForm('relationshipNoteTitle', title)
      updateReadOnlyForm('relationshipNoteRef', ref)
    },
    onRelationshipNoteTitleChange: (value: string) => {
      updateReadOnlyForm('relationshipNoteTitle', value)
      updateReadOnlyForm('relationshipNoteRef', '')
    },
    onRemoveRelationship: (noteId: string, key: string, ref: string) => {
      const edit = removeRelationshipEdit(noteId, key, ref)
      if (edit) applyEdit(edit)
    },
    onSaveRelationship: () => saveSelectedEdit((noteId) => relationshipEdit(readOnlyForm, noteId)),
  }
}

function retargetWorkspaceActions({
  readOnlyForm,
  saveSelectedEdit,
  selectedNote,
  updateReadOnlyForm,
}: {
  readOnlyForm: TabletReadOnlyForm
  saveSelectedEdit: SaveSelectedEdit
  selectedNote: MobileNote | null
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return {
    onChangeNoteType: () => saveSelectedEdit((noteId) => changeNoteTypeEditFromForm(readOnlyForm, noteId)),
    onChangeNoteTypeInputChange: (value: string) => updateReadOnlyForm('noteType', value),
    onFilenameStemChange: (value: string) => updateReadOnlyForm('filenameStem', value),
    onFolderPathChange: (value: string) => updateReadOnlyForm('folderPath', value),
    onMoveNoteToFolder: () => saveSelectedEdit((noteId) => moveNoteToFolderEditFromForm(readOnlyForm, noteId)),
    onRenameNoteFile: () => saveSelectedEdit((noteId) => renameNoteFileEditFromForm(readOnlyForm, noteId)),
    onRenameNoteFileToTitle: () => {
      const edit = renameNoteFileToTitleEdit(selectedNote)
      if (!edit) return
      saveSelectedEdit(() => edit)
    },
  }
}

function noteIconWorkspaceActions({
  readOnlyForm,
  saveSelectedEdit,
  updateReadOnlyForm,
}: {
  readOnlyForm: TabletReadOnlyForm
  saveSelectedEdit: SaveSelectedEdit
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  return {
    onNoteIconChange: (value: string) => updateReadOnlyForm('noteIcon', value),
    onRemoveNoteIcon: () => saveSelectedEdit(removeNoteIconEdit),
    onSetNoteIcon: () => saveSelectedEdit((noteId) => setNoteIconEditFromForm(readOnlyForm, noteId)),
  }
}

function filenameStemForNote(note: MobileNote | null): string {
  const path = note?.path ?? note?.id ?? ''
  const filename = path.split('/').filter(Boolean).at(-1) ?? path
  return filename.replace(/\.md$/u, '')
}

function addRelationshipFields(key?: string): ReadOnlyFormField[] {
  return [
    { key: 'relationshipName', value: key ?? '' },
    { key: 'relationshipNoteRef', value: '' },
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
  setOpenAction,
  updateReadOnlyForm,
}: {
  setOpenAction: SetOpenAction
  updateReadOnlyForm: ReadOnlyFormUpdater
}) {
  updateReadOnlyForm('viewDisplayProperties', [])
  updateReadOnlyForm('viewFilters', createViewInitialFilters())
  updateReadOnlyForm('viewIcon', '')
  updateReadOnlyForm('viewName', '')
  updateReadOnlyForm('viewPropertyQuery', '')
  updateReadOnlyForm('viewSort', '')
  updateReadOnlyForm('viewTone', null)
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
  updateReadOnlyForm('viewIcon', view.definition.icon ?? '')
  updateReadOnlyForm('viewName', selection.label)
  updateReadOnlyForm('viewPropertyQuery', '')
  updateReadOnlyForm('viewSort', view.definition.sort ?? '')
  updateReadOnlyForm('viewTone', view.definition.color ?? null)
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
  const typeName = typeNameForSidebarSelection(snapshot, selection)
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
  const edit = createRelationshipTargetEditFromForm(form, selectedNote)
  if (!edit) return

  applyEdit(edit)
  closeAction()
}

function saveViewDefinition({
  applyEdit,
  closeAction,
  form,
  viewId,
  views,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  form: TabletReadOnlyForm
  viewId: string
  views: NonNullable<MobileWorkspaceSnapshot['views']>
}) {
  const edit = viewDefinitionSaveEdit(form, viewId, views)
  if (!edit) return

  applyEdit(edit)
  closeAction()
}

function updateTypeDefinition({
  applyEdit,
  closeAction,
  form,
  workspaceSnapshot,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  form: TabletReadOnlyForm
  workspaceSnapshot: MobileWorkspaceSnapshot
}) {
  const edit = typeDefinitionSaveEdit(form, workspaceSnapshot.typeDefinitions)
  if (!edit) return

  applyEdit(edit)
  closeAction()
}

function toggleTypeVisibility({
  applyEdit,
  typeDefinitions,
  typeName,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  typeDefinitions: MobileTypeDefinitions | undefined
  typeName: string
}) {
  const edit = toggleTypeVisibilityEdit(typeName, typeDefinitions)
  if (edit) applyEdit(edit)
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

function workspaceNotes(snapshot: MobileWorkspaceSnapshot) {
  return snapshot.allNotes ?? snapshot.notes
}

function typeNameForSidebarSelection(
  snapshot: MobileWorkspaceSnapshot,
  selection: MobileSidebarItemSelection,
): string | null {
  const sidebarTypeName = snapshot.sidebarSections
    .find((section) => section.id === 'types')
    ?.items
    ?.find((item) => item.id === selection.id)
    ?.typeName

  return mobileTypeNameFromSidebarLabel(selection.label, selection.typeName ?? sidebarTypeName)
}

function moveWorkspaceSidebarItem({
  applyEdit,
  direction,
  itemId,
  kind,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  direction: 'down' | 'up'
  itemId: string
  kind: 'typeSection' | 'view'
}) {
  applyNonEmptyStringEdit({
    applyEdit,
    toEdit: (trimmedId) => moveSidebarItemEdit(kind, trimmedId, direction),
    value: itemId,
  })
}

function moveSidebarItemEdit(
  kind: 'typeSection' | 'view',
  itemId: string,
  direction: 'down' | 'up',
): MobileWorkspaceEdit {
  const edit = kind === 'view'
    ? moveViewEdit(itemId, direction)
    : moveTypeSectionEdit(itemId, direction)
  if (!edit) throw new Error(`Invalid sidebar item id for ${kind}`)
  return edit
}

function canMoveTypeSection(
  snapshot: MobileWorkspaceSnapshot,
  typeName: string,
  direction: 'down' | 'up',
) {
  const items = snapshot.sidebarSections.find((section) => section.id === 'types')?.items ?? []
  const typeItems = items.filter((item) => item.typeName)
  const sourceIndex = typeItems.findIndex((item) => item.typeName === typeName)
  const targetIndex = direction === 'up' ? sourceIndex - 1 : sourceIndex + 1
  return sourceIndex !== -1 && targetIndex >= 0 && targetIndex < typeItems.length
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
  applyNonEmptyStringEdit({
    applyEdit,
    closeAction,
    toEdit: deleteViewEdit,
    value: viewId,
  })
}

function applyNonEmptyStringEdit({
  applyEdit,
  closeAction,
  toEdit,
  value,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction?: () => void
  toEdit: (value: string) => MobileWorkspaceEdit | null
  value: string
}) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return

  const edit = toEdit(trimmedValue)
  if (!edit) return

  applyEdit(edit)
  closeAction?.()
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

function propertyEdit(form: TabletReadOnlyForm, noteId: string): MobileWorkspaceEdit | null {
  return propertyEditFromForm(form, noteId)
}

function relationshipEdit(form: TabletReadOnlyForm, noteId: string): MobileWorkspaceEdit | null {
  return addRelationshipEditFromForm(form, noteId)
}
