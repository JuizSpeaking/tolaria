import { useCallback, useEffect, useState } from 'react'
import type { MobileWorkspaceAction } from '../components/workspace/MobileWorkspaceActionSheet'
import type {
  MobileSidebarFolderSelection,
  MobileSidebarItemSelection,
} from '../components/workspace/MobileWorkspaceSidebar'
import type {
  MobileCreateNoteDefaults,
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
  mobileSortablePropertySuggestions,
} from '../workspace/mobileWorkspaceSuggestions'
import {
  mobilePropertyValueFormText,
  mobilePropertyValueKind,
  mobilePropertyValueKindForKey,
  mobilePropertyValueTextForKindChange,
  parseMobilePropertyValue,
  type MobilePropertyValueKind,
} from '../workspace/mobilePropertyValues'
import { mobileFilenameStemForTitle } from '../workspace/mobileNotePaths'
import { toggleMobileNoteWidth } from '../workspace/mobileNoteWidth'
import {
  mobileSidebarIconFromValue,
  mobileToneFromValue,
} from '../workspace/mobileWorkspaceMetadata'
import { useTabletWorkspaceNavigation } from './tabletWorkspaceNavigation'
import type { TabletReadOnlyForm } from './tabletWorkspaceTypes'
import { createNoteDefaultsForSelection } from './tabletWorkspaceCreateDefaults'
import { selectAfterWorkspaceEdit } from './tabletWorkspaceEditSelection'
import { useWorkspaceEditPipeline } from './tabletWorkspacePersistence'
import {
  createFolderFields,
  folderActionFields,
  folderParentPathForSelection,
  folderWorkspaceActions,
} from './tabletWorkspaceFolderActions'
import { createViewInitialFilters } from './tabletWorkspaceViewHelpers'

const emptyReadOnlyForm: TabletReadOnlyForm = {
  createTitle: '',
  editingFolderPath: '',
  editingViewId: '',
  filenameStem: '',
  folderName: '',
  folderParentPath: '',
  folderPath: '',
  noteIcon: '',
  noteType: '',
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
  const workspaceActionsContext = {
    applyEdit,
    closeAction,
    navigation,
    readOnlyForm,
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
  const noteIconActions = noteIconWorkspaceActions({
    readOnlyForm,
    saveSelectedEdit,
    updateReadOnlyForm,
  })
  const actionSheetActions = actionSheetWorkspaceActions(workspaceActionsContext)
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
  return useCallback((toEdit: (noteId: string) => MobileWorkspaceEdit) => {
    if (!selectedNote) return
    applyEdit(toEdit(selectedNote.id))
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
  selectedNote,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: {
  closeAction: () => void
  navigation: TabletWorkspaceNavigation
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
    onOpenCreateFolder: () => openWorkspaceAction({
      action: 'createFolder',
      fields: createFolderFields(folderParentPathForSelection(navigation.sidebarSelection)),
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenCreateNote: () => setOpenAction('createNote'),
    onOpenCreateType: () => openAction('createType', [{ key: 'typeName', value: '' }]),
    onOpenCreateView: () => openCreateView({
      setOpenAction,
      updateReadOnlyForm,
    }),
    onOpenMoreActions: () => setOpenAction('moreActions'),
    onOpenChangeNoteType: () => openAction('changeNoteType', [{ key: 'noteType', value: selectedNote?.type ?? '' }]),
    onOpenMoveNoteToFolder: () => openAction('moveNoteToFolder', [{ key: 'folderPath', value: '' }]),
    onOpenRenameNoteFile: () => openAction('renameNoteFile', [
      { key: 'filenameStem', value: filenameStemForNote(selectedNote) },
    ]),
    onOpenSetNoteIcon: () => openAction('setNoteIcon', [
      { key: 'noteIcon', value: selectedNote?.icon ?? '' },
    ]),
    onOpenSearch: () => setOpenAction('search'),
    onOpenFolderActions: (selection: MobileSidebarFolderSelection) => openWorkspaceAction({
      action: 'editFolder',
      fields: folderActionFields(selection),
      setOpenAction,
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
  }
}

function createWorkspaceActions({
  applyEdit,
  closeAction,
  navigation,
  readOnlyForm,
  setOpenAction,
  updateReadOnlyForm,
  workspaceSnapshot,
}: WorkspaceActionsContext) {
  return {
    onCreateNote: () => createNote({
      applyEdit,
      closeAction,
      defaults: createNoteDefaultsForSelection(
        navigation.sidebarSelection,
        workspaceSnapshot.typeDefinitions,
      ),
      title: readOnlyForm.createTitle,
    }),
    onCreateTitleChange: (value: string) => updateReadOnlyForm('createTitle', value),
    onCreateView: () => createView({
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
      toEdit: (typeName) => ({ type: 'createTypeDefinition', typeName }),
      value: readOnlyForm.typeName,
    }),
    onTypeNameChange: (value: string) => updateReadOnlyForm('typeName', value),
    ...folderWorkspaceActions({ applyEdit, closeAction, readOnlyForm, setOpenAction, updateReadOnlyForm }),
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
    onMoveViewDown: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'down', itemId: readOnlyForm.editingViewId, kind: 'view' }),
    onMoveViewUp: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'up', itemId: readOnlyForm.editingViewId, kind: 'view' }),
    onSaveView: () => updateView({
      applyEdit,
      closeAction,
      displayProperties: readOnlyForm.viewDisplayProperties,
      filters: readOnlyForm.viewFilters,
      icon: readOnlyForm.viewIcon,
      name: readOnlyForm.viewName,
      sort: readOnlyForm.viewSort,
      tone: readOnlyForm.viewTone,
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

function typeSectionWorkspaceActions({
  applyEdit,
  closeAction,
  readOnlyForm,
  updateReadOnlyForm,
  workspaceSnapshot,
}: Pick<WorkspaceActionsContext, 'applyEdit' | 'closeAction' | 'readOnlyForm' | 'updateReadOnlyForm' | 'workspaceSnapshot'>) {
  const notes = workspaceNotes(workspaceSnapshot)

  return {
    canDeleteType: Boolean(workspaceSnapshot.typeDefinitions?.[readOnlyForm.typeName]),
    canMoveTypeDown: canMoveTypeSection(workspaceSnapshot, readOnlyForm.typeName, 'down'),
    canMoveTypeUp: canMoveTypeSection(workspaceSnapshot, readOnlyForm.typeName, 'up'),
    onDeleteType: () => applyNonEmptyStringEdit({
      applyEdit,
      closeAction,
      toEdit: (typeName) => ({ type: 'deleteTypeDefinition', typeName }),
      value: readOnlyForm.typeName,
    }),
    onMoveTypeDown: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'down', itemId: readOnlyForm.typeName, kind: 'typeSection' }),
    onMoveTypeUp: () => moveWorkspaceSidebarItem({ applyEdit, direction: 'up', itemId: readOnlyForm.typeName, kind: 'typeSection' }),
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
    onTypeSchemaRelationshipTargetSelect: (title: string, ref: string) => {
      updateReadOnlyForm('typeSchemaRelationshipTarget', title)
      updateReadOnlyForm('typeSchemaRelationshipTargetRef', ref)
    },
    onTypeSchemaRelationshipTargetChange: (value: string) => {
      updateReadOnlyForm('typeSchemaRelationshipTarget', value)
      updateReadOnlyForm('typeSchemaRelationshipTargetRef', '')
    },
    onTypeSectionLabelChange: (value: string) => updateReadOnlyForm('typeSectionLabel', value),
    onTypeSortChange: (value: string) => updateReadOnlyForm('typeSort', value),
    onTypeTemplateChange: (value: string) => updateReadOnlyForm('typeTemplate', value),
    onTypeIconChange: (value: MobileSidebarIcon) => updateReadOnlyForm('typeIcon', value),
    onTypeToneChange: (value: MobileTone) => updateReadOnlyForm('typeTone', value),
    onTypeVisibleChange: (value: boolean) => updateReadOnlyForm('typeVisible', value),
    typePropertyOptions: mobileListPropertySuggestions(
      editableTypePropertyNotes(readOnlyForm, workspaceSnapshot),
      readOnlyForm.typePropertyQuery,
      workspaceSnapshot.typeDefinitions,
    ),
    typeRelationshipTargetOptions: typeSchemaRelationshipTargetSuggestions(notes, readOnlyForm.typeSchemaRelationshipTarget),
    typeSortPropertyOptions: mobileSortablePropertySuggestions(
      editableTypePropertyNotes(readOnlyForm, workspaceSnapshot),
      '',
      workspaceSnapshot.typeDefinitions,
    ),
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
  updateReadOnlyForm('typeSchemaRelationships', addTypeSchemaRelationshipRef({
    key: form.typeSchemaRelationshipName,
    notes,
    relationships: form.typeSchemaRelationships,
    targetRef: form.typeSchemaRelationshipTargetRef,
    targetTitle: form.typeSchemaRelationshipTarget,
  }))
  updateReadOnlyForm('typeSchemaRelationshipName', '')
  updateReadOnlyForm('typeSchemaRelationshipTargetRef', '')
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
    onPropertyNameChange: (value: string) => {
      updateReadOnlyForm('propertyName', value)
      updateReadOnlyForm('propertyValueKind', mobilePropertyValueKindForKey(value, readOnlyForm.propertyValueKind))
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
    onRemoveRelationship: (noteId: string, key: string, ref: string) => applyEdit({ key, noteId, ref, type: 'removeRelationship' }),
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
    onRenameNoteFileToTitle: () => {
      if (!selectedNote) return
      saveSelectedEdit((noteId) => ({
        filenameStem: mobileFilenameStemForTitle(selectedNote.title),
        noteId,
        type: 'renameNoteFile',
      }))
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
    onRemoveNoteIcon: () => saveSelectedEdit((noteId) => ({
      key: '_icon',
      noteId,
      type: 'deleteProperty',
    })),
    onSetNoteIcon: () => saveSelectedEdit((noteId) => ({
      key: '_icon',
      noteId,
      type: 'updateProperty',
      value: readOnlyForm.noteIcon.trim(),
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
    onToggleNoteWidth: () => {
      if (selectedNote) applyEdit({
        key: '_width',
        noteId: selectedNote.id,
        type: 'updateProperty',
        value: toggleMobileNoteWidth(selectedNote.noteWidth),
      })
    },
    onToggleFavorite: () => {
      if (selectedNote) applyEdit({ noteId: selectedNote.id, type: 'toggleFavorite' })
    },
    onUpdateNoteContent: (noteId: string, content: string) => applyEdit({ content, noteId, type: 'updateNoteContent' }),
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
    { key: 'propertyValue', value: mobilePropertyValueFormText(value) },
    { key: 'propertyValueKind', value: mobilePropertyValueKind(key, value) },
  ]
}

function addPropertyFields(key?: string): ReadOnlyFormField[] {
  return [
    { key: 'propertyName', value: key ?? '' },
    { key: 'propertyValue', value: '' },
    { key: 'propertyValueKind', value: mobilePropertyValueKindForKey(key ?? '', 'string') },
  ]
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
  updateReadOnlyForm('viewTone', view.definition.color ? mobileToneFromValue(view.definition.color, 'gray') : null)
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
    { key: 'typeSchemaRelationshipTargetRef', value: '' },
    { key: 'typeSchemaRelationshipTarget', value: '' },
    { key: 'typeSectionLabel', value: definition?.label ?? label },
    { key: 'typeSort', value: definition?.sort ?? '' },
    { key: 'typeTemplate', value: definition?.template ?? '' },
    { key: 'typeIcon', value: mobileSidebarIconFromValue(definition?.icon, 'file') },
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

  applyEdit({
    key,
    sourceNoteId: selectedNote.id,
    targetTitle: title,
    type: 'createRelationshipTarget',
  })
  closeAction()
}

function createView({
  applyEdit,
  closeAction,
  displayProperties,
  filters,
  icon,
  name,
  sort,
  tone,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  displayProperties: string[]
  filters: MobileViewFilterGroup
  icon: string
  name: string
  sort: string
  tone: MobileTone | null
}) {
  const trimmedName = name.trim()
  if (!trimmedName) return

  applyEdit({
    definition: {
      color: tone,
      filters,
      icon: normalizedOptionalIcon(icon),
      listPropertiesDisplay: normalizedListPropertiesDisplay(displayProperties),
      name: trimmedName,
      sort: normalizedOptionalSort(sort),
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
  icon,
  name,
  sort,
  tone,
  viewId,
  views,
}: {
  applyEdit: (edit: MobileWorkspaceEdit) => void
  closeAction: () => void
  displayProperties: string[]
  filters: MobileViewFilterGroup
  icon: string
  name: string
  sort: string
  tone: MobileTone | null
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
      icon: normalizedOptionalIcon(icon),
      listPropertiesDisplay: normalizedListPropertiesDisplay(displayProperties),
      name: trimmedName,
      sort: normalizedOptionalSort(sort),
      color: tone,
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
      icon: normalizedIcon(form.typeIcon, 'file'),
      listPropertiesDisplay: normalizedListPropertiesDisplay(form.typeDisplayProperties),
      ...typeDefinitionSchemaPatch(form.typeSchemaProperties, form.typeSchemaRelationships),
      sort: form.typeSort,
      template: form.typeTemplate,
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

function normalizedOptionalSort(sort: string) {
  return sort.trim() || null
}

function normalizedIcon(icon: string, fallback: MobileSidebarIcon) {
  return mobileSidebarIconFromValue(icon, fallback)
}

function normalizedOptionalIcon(icon: string) {
  return icon.trim() ? mobileSidebarIconFromValue(icon, 'view') : null
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
  return kind === 'view'
    ? { direction, type: 'moveView', viewId: itemId }
    : { direction, type: 'moveTypeSection', typeName: itemId }
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
    toEdit: (trimmedViewId) => ({ type: 'deleteView', viewId: trimmedViewId }),
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
  toEdit: (value: string) => MobileWorkspaceEdit
  value: string
}) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return

  applyEdit(toEdit(trimmedValue))
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

function propertyEdit(form: TabletReadOnlyForm, noteId: string): MobileWorkspaceEdit {
  return {
    key: form.propertyName,
    noteId,
    type: 'updateProperty',
    value: parseMobilePropertyValue({
      key: form.propertyName,
      kind: form.propertyValueKind,
      valueText: form.propertyValue,
    }),
  }
}

function relationshipEdit(form: TabletReadOnlyForm, noteId: string): MobileWorkspaceEdit {
  return {
    key: form.relationshipName,
    noteId,
    targetRef: form.relationshipNoteRef,
    targetTitle: form.relationshipNoteTitle,
    type: 'addRelationship',
  }
}
