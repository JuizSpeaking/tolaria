export type MobileParityInventoryEntry = {
  assertions: string[]
  contracts: string[]
  desktopSource: string
  mobileFile: string
  surface: string
}

export const mobileParityInventory = [
  {
    assertions: ['panel chrome computed styles'],
    contracts: ['desktopPanelParity', 'desktopToolbarParity'],
    desktopSource: 'App shell split panes, NoteListHeader, InspectorHeader, BreadcrumbBar',
    mobileFile: 'src/ui/MobilePanel.tsx',
    surface: 'Panel and toolbar chrome',
  },
  {
    assertions: ['sync footer computed styles'],
    contracts: ['desktopStatusBarParity'],
    desktopSource: 'StatusBarFooter and StatusBarAction',
    mobileFile: 'src/ui/MobileButton.tsx',
    surface: 'Status-density buttons',
  },
  {
    assertions: ['action-sheet input computed styles through user-flow checks'],
    contracts: ['desktopPropertyParity'],
    desktopSource: 'shadcn Input wrappers used by desktop dialogs and property editors',
    mobileFile: 'src/ui/MobileTextInput.tsx',
    surface: 'Mobile text inputs',
  },
  {
    assertions: ['property chips and sidebar count computed styles'],
    contracts: ['desktopPropertyParity', 'desktopSidebarParity'],
    desktopSource: 'SidebarCountPill and property chip styles',
    mobileFile: 'src/ui/MobileChip.tsx',
    surface: 'Pills and property chips',
  },
  {
    assertions: ['toolbar action computed styles'],
    contracts: ['desktopToolbarActionParity'],
    desktopSource: 'NoteListHeader action buttons and BreadcrumbBar icon buttons',
    mobileFile: 'src/ui/MobileIconButton.tsx',
    surface: 'Toolbar icon actions',
  },
  {
    assertions: ['note list computed styles'],
    contracts: ['desktopNoteItemParity'],
    desktopSource: 'NoteItem',
    mobileFile: 'src/ui/MobileListRow.tsx',
    surface: 'Note list rows',
  },
  {
    assertions: ['properties computed styles'],
    contracts: ['desktopPropertyParity'],
    desktopSource: 'propertyPanelLayout',
    mobileFile: 'src/ui/MobilePropertyRow.tsx',
    surface: 'Property rows',
  },
  {
    assertions: ['sidebar computed styles and click navigation'],
    contracts: ['desktopPanelParity', 'desktopSidebarParity'],
    desktopSource: 'SidebarGroupHeader, SidebarParts, FolderTree',
    mobileFile: 'src/components/workspace/MobileWorkspaceSidebar.tsx',
    surface: 'Workspace sidebar',
  },
  {
    assertions: ['sidebar folder computed styles, measured native row insets, and click navigation'],
    contracts: ['desktopSidebarParity'],
    desktopSource: 'FolderTree',
    mobileFile: 'src/components/workspace/MobileWorkspaceSidebarFolderTree.tsx',
    surface: 'Workspace sidebar folder tree',
  },
  {
    assertions: ['sidebar count computed styles'],
    contracts: ['desktopSidebarParity'],
    desktopSource: 'SidebarCountPill',
    mobileFile: 'src/components/workspace/MobileSidebarCountPill.tsx',
    surface: 'Sidebar note counts',
  },
  {
    assertions: ['note list computed styles and selection click'],
    contracts: ['desktopNoteItemParity', 'desktopPanelParity', 'desktopToolbarParity'],
    desktopSource: 'NoteListHeader and NoteItem',
    mobileFile: 'src/components/workspace/MobileNoteListPanel.tsx',
    surface: 'Note list panel',
  },
  {
    assertions: ['properties computed styles'],
    contracts: ['desktopPanelParity', 'desktopPropertyParity', 'desktopRelationshipParity'],
    desktopSource: 'InspectorHeader, propertyPanelLayout, RelationshipsPanel',
    mobileFile: 'src/components/workspace/MobilePropertiesPanel.tsx',
    surface: 'Properties panel',
  },
  {
    assertions: ['sync footer computed styles'],
    contracts: ['desktopStatusBarParity'],
    desktopSource: 'StatusBarFooter and StatusBarBadges',
    mobileFile: 'src/components/workspace/MobileSyncStatusBar.tsx',
    surface: 'Sync status bar',
  },
  {
    assertions: ['note and relationship icon size/color computed through parent rows'],
    contracts: ['desktopNoteItemParity', 'desktopRelationshipParity'],
    desktopSource: 'NoteItem type indicators and inspector relationship icons',
    mobileFile: 'src/components/workspace/MobileWorkspaceIcons.tsx',
    surface: 'Workspace type icons',
  },
  {
    assertions: ['search/create/properties/more user-flow checks'],
    contracts: ['desktopPanelParity', 'desktopPropertyParity', 'desktopToolbarActionParity'],
    desktopSource: 'Desktop command dialogs, note-list search, and inspector property forms',
    mobileFile: 'src/components/workspace/MobileWorkspaceActionSheet.tsx',
    surface: 'Read-only workspace action sheets',
  },
  {
    assertions: ['property and relationship suggestion user-flow checks'],
    contracts: ['desktopPropertyParity'],
    desktopSource: 'RelationshipsPanel note search dropdown and inspector property forms',
    mobileFile: 'src/components/workspace/MobileWorkspaceSuggestionList.tsx',
    surface: 'Workspace action-sheet suggestions',
  },
  {
    assertions: ['saved-view filter edit user-flow checks'],
    contracts: ['desktopPropertyParity'],
    desktopSource: 'FilterBuilder, FilterFieldCombobox, shadcn inputs and buttons',
    mobileFile: 'src/components/workspace/MobileViewFilterBuilder.tsx',
    surface: 'Saved-view filter builder',
  },
  {
    assertions: ['saved-view column edit user-flow checks'],
    contracts: ['desktopPropertyParity'],
    desktopSource: 'ListPropertiesPopover and NoteListHeader column customization',
    mobileFile: 'src/components/workspace/MobileViewDisplayPropertiesPicker.tsx',
    surface: 'Saved-view note-list column picker',
  },
  {
    assertions: ['type-section edit user-flow checks', 'type schema/default edit user-flow checks'],
    contracts: ['desktopPropertyParity', 'desktopSidebarParity'],
    desktopSource: 'TypeCustomizePopover, Type document frontmatter schema/defaults, Sidebar type context actions, and NoteListHeader type columns',
    mobileFile: 'src/components/workspace/MobileTypeSectionEditor.tsx',
    surface: 'Type section editor',
  },
  {
    assertions: ['editor computed styles'],
    contracts: ['desktopEditorParity', 'desktopPanelParity', 'desktopToolbarParity'],
    desktopSource: 'EditorTheme.css, theme.json, BreadcrumbBar',
    mobileFile: 'src/screens/TabletEditorPanel.tsx',
    surface: 'Tablet editor panel',
  },
  {
    assertions: ['panel widths, swipe gesture checks, click navigation'],
    contracts: ['desktopPanelParity'],
    desktopSource: 'Desktop four-panel workspace shell',
    mobileFile: 'src/screens/TabletWorkspace.tsx',
    surface: 'Tablet workspace shell',
  },
] as const satisfies MobileParityInventoryEntry[]
