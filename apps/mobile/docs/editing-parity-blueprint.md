# Mobile Editing Parity Blueprint

This is the working map for making the mobile UI a real Tolaria editor, not a static mock. The default rule is copy desktop semantics first, then adapt only the interaction surface for tablet or phone.

## Scope

| Desktop area | Mobile owner | Current parity evidence | Next risk to close |
| --- | --- | --- | --- |
| Rich markdown editing (`Editor`, BlockNote/Tiptap, `EditorTheme.css`) | `MobileWysiwygMarkdownEditor.native.tsx`, `MobileWysiwygDocumentSerialization.ts` | Native WYSIWYG mutation, persistence, wikilink insert, autocomplete, formatting-command, serialization, and layout probes. | Keep adding native simulator probes when a supported BlockNote behavior gains a TenTap equivalent. |
| Raw/source editing (`RawEditorView`, raw mode save path) | `MobileMarkdownSourceEditor.tsx`, `mobileEditorDraft.ts` | Source-mode Playwright checks, selection probe, delayed draft commit, raw frontmatter write tests. | Preserve source-mode behavior as the fallback for markdown not structurally supported by TenTap. |
| Inline wikilink and person autocomplete (`WikilinkSuggestionMenu`, `NoteAutocomplete`, raw editor autocomplete utilities) | `mobileWikilinkAutocomplete.ts`, `MobileWysiwygWikilinkPicker.tsx` | Tablet and phone source-mode Playwright checks, native TenTap autocomplete probe, picker model tests. | Keep one web/source and one native/TenTap proof for every autocomplete channel. |
| Formatting commands (`tolariaEditorFormatting`, desktop toolbar actions) | `MobileMarkdownFormattingToolbar.tsx`, `MobileWysiwygFormatCommands.ts`, `mobileMarkdownFormatting.ts` | Unit coverage for source formatting and TenTap command mapping; Playwright checks for source toolbar insertions. | Structured tables remain source-line fallback in Expo Go until a native table editing surface exists. |
| Find and replace (`RawEditorFindBar`, `editorFind.ts`) | `MobileEditorFindSheet.tsx`, `mobileEditorFind.ts` | Unit tests plus tablet and phone More-sheet replacement flows. | Add native WYSIWYG selection-aware replacement only if desktop-rich find semantics become distinct from raw text replacement. |
| Properties (`DynamicPropertiesPanel`, `PropertyValueCells`, shadcn forms) | `MobilePropertiesPanel.tsx`, `MobilePropertyValueEditor.tsx`, `MobileWorkspaceActionSheet.tsx` | Typed property add/edit/delete checks for string, list, number, boolean, status, date, URL, and color. | Continue deriving property kind, suggestions, and display from desktop frontmatter/type rules. |
| Relationships (`RelationshipsPanel`, relationship rows, note search dropdown) | `MobilePropertiesPanel.tsx`, `mobileWorkspaceSuggestions.ts`, `mobileWorkspaceEditing.ts` | Relationship add/remove/open/create-target checks, Type-defined relationship suggestions, desktop wikilink target normalization. | Preserve exact refs and path rewrites when note movement or title-derived filename changes happen. |
| Views, filters, sort, and list display (`FilterBuilder`, saved-view YAML, note-list property controls) | `MobileViewFilterBuilder.tsx`, `MobileViewDisplayPropertiesPicker.tsx`, `MobileSortPicker.tsx`, `mobileSavedViews.ts` | Saved-view create/edit/reorder/delete, filter, sort, custom-property display, and large-vault evaluation checks. | Keep saved-view YAML round-tripping compatible with desktop as new fields appear. |
| Type sections and templates (`TypeCustomizePopover`, Type markdown docs) | `MobileTypeSectionEditor.tsx`, `mobileWorkspaceTypeEditing.ts`, `mobileTypeDefinitions.ts` | Type document create/delete/reorder, metadata/schema/default relationship/template-backed note creation checks. | Treat Type documents as the shared schema source; avoid mobile-only schema shortcuts. |
| Folders and note retargeting (`FolderTree`, note commands, path rewrites) | `MobileWorkspaceSidebarFolderTree.tsx`, `mobileWorkspaceFolderEditing.ts`, `mobileNotePaths.ts`, `mobileWorkspacePathRewrites.ts` | Folder navigation, create/rename/delete, note move/rename, title-to-filename, collision, and inbound wikilink rewrite tests. | Keep path operations write-planned through the repository boundary. |
| Local/native vault persistence (`vault loader`, Tauri filesystem writes) | `fileSystemWorkspaceRepository.ts`, `expoWorkspaceFileSystem.ts`, `tabletWorkspacePersistence.ts` | Native repository tests and native WYSIWYG persistence probe through Expo FileSystem. | Expand native end-to-end probes as soon as a flow depends on real filesystem permissions. |

## Explicitly Out Of This Batch

Git sync and AI are intentionally out of scope for the mobile editing foundation. Desktop-only window/Finder commands are not copied literally; they need mobile-native equivalents only when they support the same user job.

## Batch Rule

Each future batch should name the desktop source, mobile owner, behavior proof, visual/layout proof when relevant, and persistence proof when the behavior writes to the vault.
