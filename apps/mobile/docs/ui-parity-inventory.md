# Mobile UI Parity Inventory

This inventory is the working source map for the experimental mobile UI foundation. Mobile and tablet styling should copy the desktop Tolaria implementation by default, and only diverge where the target form factor requires a different interaction model.

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
| `MobileChip` | `SidebarCountPill`, note property chips | Rounded compact pills, muted labels, small type. Count pills are 10px, rounded-full, tabular. |
| `MobileListRow` | `src/components/NoteItem.tsx` | Row padding 14/16, title 13px medium default and semibold only when selected, snippets 12px muted, dates/meta 10-12px muted, type icon only at the row edge. |
| `MobilePropertyRow` | `src/components/propertyPanelLayout.ts` | Dense rows, 12px muted labels, 12px normal values, no heavy text weight. |

## Read-Only Workspace Components

| Mobile component | Desktop source | Required alignment |
| --- | --- | --- |
| `MobileWorkspaceSidebar` | `SidebarGroupHeader.tsx`, `SidebarParts.tsx`, folder tree components | Owns tablet sidebar rendering: top nav, groups, count pills, and folder tree. |
| `MobileNoteListPanel` | `NoteItem.tsx`, note-list header | Owns tablet note-list chrome and row composition. |
| `TabletEditorPanel` | `EditorTheme.css`, `theme.json` | Owns read-only tablet editor rendering for H1, paragraphs, headings, bullets, quotes, inline styles, and tables. |
| `MobilePropertiesPanel` | `propertyPanelLayout.ts`, `RelationshipsPanel.tsx` | Owns read-only properties and relationship display. |
| `MobileSyncStatusBar` | `StatusBar.tsx` | Owns subtle bottom sync footer display. |
| `TabletWorkspace` | Desktop four-panel layout | Owns tablet shell layout and selected-note state only. |

The tablet shell consumes `MobileWorkspaceSnapshot` from `src/workspace/mobileWorkspaceModel.ts`. The default repository is fixture-backed for UI lab speed, and the Playwright harness can inject a read-only local-vault snapshot from `MOBILE_QA_VAULT_PATH` through the same boundary. Native vault loading should replace the snapshot provider, not the tablet surfaces.

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
| Sidebar | section padding, border color, muted group title color, count pill size/radius, active row color |
| Note list | full-width selected row, no wrapper margins/radius, desktop row padding, type-colored selected background and border |
| Properties | 28px rows, 12px muted labels, wrapping tags, full-width relationship row radius/padding/font/color, compact action rows |
| Editor | H1 size/weight/line height, title separator, paragraph size/line height, H2 size/weight, quote border/padding/italic text |
| Toolbar actions | 24px transparent action boxes, 4px radius, no card-like background |
| Sync footer | 30px height, sidebar background, 8px horizontal padding, 12px muted status text |

## Phone Screens

| Surface | Desktop source | Required alignment |
| --- | --- | --- |
| Navigation model | Bear Notes reference images | The interaction can use full-screen note list, left drawer over a partially visible note list, and editor opened from the right. |
| Phone visual styling | Tolaria desktop sidebar/list/editor | Do not copy Bear's dark sidebar or oversized text. Use Tolaria light sidebar colors, muted labels, and desktop-derived hierarchy adjusted only for touch targets. |

## Current Intentional Gaps

- Fixture screens are still static mocks; they validate UI structure and visual parity before full mobile business logic is wired.
- Local-vault screenshots are read-only QA fixtures generated at test time. They should exercise large-vault metadata, real type colors, real relationship keys, and markdown body pressure without committing vault content.
- Phone navigation is represented as discrete states for screenshot QA. Gestures and native navigation transitions will come after the visual language is stable.
- Mobile wrappers are thin Tolaria wrappers over RNR-style primitives so the eventual implementation can swap in more RNR coverage without changing Tolaria-specific tokens and semantics.
