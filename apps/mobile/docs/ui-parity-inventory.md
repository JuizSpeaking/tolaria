# Mobile UI Parity Inventory

This inventory is the working source map for the experimental mobile UI foundation. Mobile and tablet styling should copy the desktop Tolaria implementation by default, and only diverge where the target form factor requires a different interaction model.

The machine-readable coverage source lives in `src/ui/mobileParityInventory.ts`. `src/ui/mobileParityInventory.test.ts` fails when a visible iPad implementation file under `src/ui`, `src/components/workspace`, `TabletWorkspace`, or `TabletEditorPanel` is not mapped to a desktop source, parity contract, and assertion.

## Tokens

| Mobile file | Desktop source | Parity target |
| --- | --- | --- |
| `src/ui/tokens.ts` | `src/index.css`, `src/theme.json` | Mirror light theme colors: sidebar `#F7F6F3`, text `#37352F`, secondary/muted text `#787774`, faint text `#B4B4B4`, borders `#E9E9E7` and `#D9D9D6`, selected `#E8F4FE`, accent blue `#155DFF`, and desktop type accent keys. |
| `src/ui/tokens.ts` | `src/theme.json` | Mirror editor scale: body 15/1.5, H1 32/700/1.2 with a bottom separator, H2 27/600, H3 20/600, table 14, blockquote secondary italic with blue left border. |

## Shared Wrappers

| Mobile wrapper | Desktop source | Required alignment |
| --- | --- | --- |
| `MobilePanel`, `MobileToolbar` | App shell panels and toolbar chrome | White/card surfaces, hairline borders, compact 13-16px toolbar labels, muted icons. |
| `MobileButton` | `src/components/ui/button.tsx`, `StatusBarAction` | Use RNR/shadcn-like button primitive; labels should be medium, not bold. Status-density buttons copy the 12px, 24px-high desktop status-bar action shape. |
| `MobileIconButton` | `NoteListHeader` action buttons, `InspectorHeader` icon buttons | Toolbar-density icon buttons are visually 24px, transparent, rounded 4px, with 16px icons; touch hit slop can exceed the visual box. |
| `MobileTextInput` | Desktop shadcn input usage in command/property forms | Thin Tolaria wrapper over the local RNR-style input primitive; muted 12px label, compact border, and no browser-default styling. |
| `MobileChip` | `SidebarCountPill`, note property chips | Rounded compact pills, muted labels, small type. Count pills are 10px, rounded-full, tabular. |
| `MobileListRow` | `src/components/NoteItem.tsx` | Row padding 14/16, title 13px medium default and semibold only when selected, snippets 12px muted, dates/meta 10-12px muted, type icon only at the row edge. |
| `MobilePropertyRow` | `src/components/propertyPanelLayout.ts` | Dense rows, 12px muted labels, 12px normal values, no heavy text weight. |

## Workspace Components

| Mobile component | Desktop source | Required alignment |
| --- | --- | --- |
| `MobileWorkspaceSidebar` | `SidebarGroupHeader.tsx`, `SidebarParts.tsx`, folder tree components | Owns tablet sidebar rendering: top nav, groups, count pills, and folder tree. |
| `MobileNoteListPanel` | `NoteItem.tsx`, note-list header | Owns tablet note-list chrome and row composition. |
| `TabletEditorPanel` | `EditorTheme.css`, `theme.json` | Owns read-only tablet editor rendering for H1, paragraphs, headings, bullets, quotes, inline styles, and tables. |
| `MobilePropertiesPanel` | `propertyPanelLayout.ts`, `RelationshipsPanel.tsx` | Owns properties and relationship display/removal. |
| `MobileWorkspaceActionSheet` | Desktop command dialogs, note-list search, inspector forms | Owns search/create/property/relationship/more action flows against the editable snapshot. |
| `MobileViewFilterBuilder` | `FilterBuilder`, `FilterFieldCombobox` | Owns saved-view AND/OR groups, filter rows, field/value suggestions, operator selection, regex flag, and add/remove controls. |
| `MobileSyncStatusBar` | `StatusBar.tsx` | Owns subtle bottom sync footer display. |
| `TabletWorkspace` | Desktop four-panel layout | Owns tablet shell layout, selected-note state, and the in-process editable snapshot. |

The tablet shell consumes `MobileWorkspaceSnapshot` from `src/workspace/mobileWorkspaceModel.ts`. The default repository is fixture-backed for UI lab speed, and the Playwright harness can inject a local-vault snapshot from `MOBILE_QA_VAULT_PATH` through the same boundary. When the env var is not set, the harness uses `/Users/luca/Laputa` if it exists. `src/workspace/localVaultSnapshot.ts` reads desktop `views/*.yml` files through `src/workspace/mobileSavedViews.ts`, adds a Views sidebar section, and computes counts/results against the full note metadata pool while keeping the visible note list capped for large vault performance. Full note Markdown is injected separately for host-vault QA, and the tablet shell lazily hydrates metadata-only selected notes before editing. `src/workspace/mobileWorkspaceEditing.ts` owns the in-process editing reducer for create, title/body edits, scalar properties, favorites/archive flags, relationship add/remove, saved views, wikilink suggestions, note type changes, Type document metadata/schema defaults, and note folder moves. It emits repository write plans for note create/save/delete, saved-view save/delete, Type document save, and folder moves. Native vault loading should replace the snapshot provider and implement the same repository write boundary, not rewrite the tablet surfaces.

## Tablet Screens

| Surface | Desktop source | Required alignment |
| --- | --- | --- |
| Sidebar groups | `SidebarGroupHeader.tsx` | 10px muted group labels, 0.5px letter spacing, compact rounded count pills. |
| Sidebar items and folder tree | `SidebarParts.tsx`, sidebar folder rows | 13px medium labels, muted inactive icons/text, selected rows use Tolaria selected blue surface. |
| Note list | `NoteItem.tsx`, `PropertyChips.tsx` | No invented metadata lines, no word counts, no floating create button. Titles/snippets/dates follow desktop hierarchy. |
| Editor | `EditorTheme.css`, `theme.json` | H1 title has 32px desktop scale and bottom separator. Markdown fixture should exercise paragraphs, bold, italic, inline code, bullets, blockquotes, and tables. |
| Properties | `propertyPanelLayout.ts`, `RelationshipsPanel.tsx` | Dense 12px rows. Tags wrap under their label. Relationships are individual property sections; no global Relationships heading. Relationship values are full-width rows with type icon and type-colored text. |
| Sync footer | `StatusBar.tsx`, status-bar badges | Bottom bar stays subtle: 30px sidebar-colored surface, hairline top border, 12px muted detail text, compact status actions. |

## Current Objective Assertions

The tablet landscape parity test now checks these computed-style contracts:

| Surface | Guarded invariants |
| --- | --- |
| Panel chrome | desktop panel widths, 52px toolbar height, toolbar padding, title/subtitle typography, inspector muted title |
| Sidebar | section padding, border color, muted group title color, count pill size/radius, active row color |
| Note list | full-width selected row, no wrapper margins/radius, desktop row padding, type-colored selected background and border |
| Properties | 28px rows, 12px muted labels, wrapping tags, full-width relationship row radius/padding/font/color, compact action rows |
| Editor | H1 size/weight/line height, title separator, paragraph size/line height, H2 size/weight, quote border/padding/italic text |
| Toolbar actions | 24px transparent action boxes, 4px radius, no card-like background |
| Sync footer | 30px height, sidebar background, 8px horizontal padding, 12px muted status text |

The same Playwright suite also runs a source-drift check against desktop `src/index.css` and `src/theme.json`, plus a tablet-landscape pixel baseline for the primary iPad reference screen. The native iPad simulator metric gate also checks sidebar row insets, row vertical padding, folder indentation, section title height, count-pill text centering, note-list selected-row width, and note-row content padding so RN Web cannot hide device-only spacing regressions.

React Native Web screenshots are a fast preflight only. Layout-sensitive mobile UI work must also pass the native iOS simulator metric check and produce a simulator screenshot before it is accepted, because spacing, safe-area, and text layout can diverge between web and the actual Expo app.

## Phone Screens

| Surface | Desktop source | Required alignment |
| --- | --- | --- |
| Navigation model | Bear Notes reference images | The interaction can use full-screen note list, left drawer over a partially visible note list, and editor opened from the right. |
| Phone visual styling | Tolaria desktop sidebar/list/editor | Do not copy Bear's dark sidebar or oversized text. Use Tolaria light sidebar colors, muted labels, and desktop-derived hierarchy adjusted only for touch targets. |

## Current Intentional Gaps

- Fixture screens are still storage-free; they validate UI structure, visual parity, and in-process editing behavior without touching disk.
- Local-vault screenshots are generated at test time. They exercise large-vault metadata, real type colors, real relationship keys, lazy note hydration, and markdown body pressure without committing vault content.
- Tablet action sheets are clickable and tested against the editable snapshot. Create/property/relationship/body edits, saved-view edits, note type changes, and folder moves emit repository write plans; explicit `source=native-vault` mode persists those writes through Expo FileSystem, while fixture and host-vault QA remain deterministic.
- Phone navigation is represented as discrete states for screenshot QA. Gestures and native navigation transitions will come after the visual language is stable.
- Mobile wrappers are thin Tolaria wrappers over RNR-style primitives so the eventual implementation can swap in more RNR coverage without changing Tolaria-specific tokens and semantics.
