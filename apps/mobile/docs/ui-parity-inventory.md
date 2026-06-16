# Mobile UI Parity Inventory

This inventory is the working source map for the experimental mobile UI foundation. Mobile and tablet styling should copy the desktop Tolaria implementation by default, and only diverge where the target form factor requires a different interaction model.

The machine-readable coverage source lives in `src/ui/mobileParityInventory.ts`. `src/ui/mobileParityInventory.test.ts` fails when a visible iPad implementation file under `src/ui`, `src/components/workspace`, `TabletWorkspace`, or `TabletEditorPanel` is not mapped to a desktop source, parity contract, and assertion.

## Tokens

| Mobile file | Desktop source | Parity target |
| --- | --- | --- |
| `src/ui/tokens.ts` | `src/index.css`, `src/theme.json` | Mirror light theme colors: sidebar `#F7F6F3`, text `#37352F`, secondary/muted text `#787774`, faint text `#B4B4B4`, borders `#E9E9E7` and `#D9D9D6`, selected `#E8F4FE`, accent blue `#155DFF`, and desktop type accent keys. |
| `src/ui/tokens.ts` | `src/theme.json` | Mirror editor scale: body 15/1.5, H1 32/700/1.2 with a bottom separator, H2 27/600, H3/H4 20/600, table 14, inline code 14 with 4/2 padding, task checkbox 18, horizontal rule 24px vertical margin, and blockquote secondary italic with blue left border. |

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
| `MobileMarkdownFormattingToolbar` | BlockNote formatting commands, `BreadcrumbBar` icon buttons | Owns compact raw-editor formatting actions for bold, italic, code, wikilinks, headings, bullets, quotes, and tables while reusing desktop toolbar action sizing. |
| `MobileEditorBlocks` | `EditorTheme.css`, `theme.json`, BlockNote markdown rendering | Owns read-only tablet markdown block rendering for paragraphs, H1-H6, bullets, ordered lists, task lists, quotes, fenced code, horizontal rules, links, wikilinks, inline code, strikethrough, and tables. Tapped wikilinks resolve through the same diacritic-folded path-suffix, filename-stem, alias, title, humanized kebab-case title, and optional `.md` target normalization used by mobile search/autocomplete. |
| `TabletEditorPanel` | `EditorTheme.css`, `theme.json`, BlockNote formatting commands | Owns editor chrome, title rendering, and raw-edit mode. Its mobile edit mode includes compact Markdown formatting commands for bold, italic, code, wikilinks, H2/H3, bullets, quotes, and tables, while persisting through the same full raw markdown/frontmatter boundary as desktop. Native TenTap CSS maps headings through the same desktop editor tokens, including distinct H3/H4 spacing. |
| `MobilePropertiesPanel` | `propertyPanelLayout.ts`, `RelationshipsPanel.tsx` | Owns properties and relationship display/removal. |
| `MobileWorkspaceActionSheet` | Desktop command dialogs, note-list search, inspector forms | Owns search/create/property/relationship/more action flows against the editable snapshot. Search uses `mobileQuickOpen` for deterministic empty/no-result filtering and clamped keyboard selection. Relationship create-and-open emits one reducer edit that creates the target beside the source note and links to the exact created path. |
| `MobileWorkspaceMoveActions` | Sidebar saved-view and type-section context actions | Owns compact reorder/delete controls used by saved-view and Type-section action sheets. Labels and disabled states stay tied to sidebar action parity, while persistence stays in the editable snapshot reducer. |
| `MobilePropertyValueKindPicker` | Inspector property editors, shadcn segmented controls | Owns compact value-kind selection for string, list, number, and boolean property writes. |
| `MobileViewFilterBuilder` | `FilterBuilder`, `FilterFieldCombobox` | Owns saved-view AND/OR groups, filter rows, field/value suggestions, operator selection, regex flag, and add/remove controls. |
| `MobileMetadataPicker` | `CustomizeTypeDialog`, saved-view dialogs, sidebar icon/color metadata | Owns compact icon and color controls for saved views and Type sections. Values persist through desktop-compatible YAML/frontmatter and rehydrate when sheets reopen. |
| `MobileSyncStatusBar` | `StatusBar.tsx` | Owns subtle bottom sync footer display. |
| `TabletWorkspace` | Desktop four-panel layout | Owns tablet shell layout, selected-note state, and the in-process editable snapshot. |
| `PhoneWorkspace` | Desktop four-panel layout plus phone navigation reference | Owns phone list/sidebar/editor/properties navigation while reusing the tablet workspace controller and repository boundary. |

The tablet shell consumes `MobileWorkspaceSnapshot` from `src/workspace/mobileWorkspaceModel.ts`. The default repository is fixture-backed for UI lab speed, and the Playwright harness can inject a local-vault snapshot from `MOBILE_QA_VAULT_PATH` through the same boundary. When the env var is not set, the harness uses `/Users/luca/Laputa` if it exists. `src/workspace/localVaultSnapshot.ts` reads desktop `views/*.yml` files through `src/workspace/mobileSavedViews.ts`, adds a Views sidebar section, and computes counts/results against the full note metadata pool while keeping the visible note list capped for large vault performance. Full note Markdown is injected separately for host-vault QA, and the tablet shell lazily hydrates metadata-only selected notes before editing. `src/workspace/mobileWorkspaceEditing.ts` owns the in-process editing reducer for create, full raw markdown/frontmatter edits, title edits, scalar properties, favorites/archive flags, relationship add/remove/create-target, saved views, wikilink suggestions, note type changes, Type document actions, and note folder moves. Named note creation writes the desktop frontmatter content shape (`title`, `type`, lowercase `status`, then template body) and relationship target creation blocks desktop-equivalent path collisions instead of inventing suffixed filenames. Relationship targets from in-memory edits, local-vault frontmatter, and Type-defined saved-view relationship value suggestions resolve through the same diacritic-folded path-suffix, filename-stem, alias, title, humanized kebab-case title, optional `.md`, and whitespace-wrapped frontmatter wikilink normalization as mobile wikilink taps. Saved-view create/edit sheets write desktop-compatible `icon`, `color`, `filters`, built-in or custom-property `sort`, and `listPropertiesDisplay` YAML; saved-view parsing preserves desktop inline YAML sequences with quoted commas, quoted hash characters, and quoted scalar wikilink values; saved-view date filters reject invalid ISO date-only values instead of accepting JavaScript-normalized overflow dates; saved-view built-in sorts mirror desktop created-date fallback, display-date fallback, and status priority/tie-break semantics; and selected view lists reorder through the same evaluator that parses host-vault views. Type-section edit sheets author the same `icon`, `color`, built-in sort, and `property:<field>:<direction>` sort contract into Type markdown documents. `src/workspace/mobileWikilinkAutocomplete.ts` mirrors desktop inline autocomplete channels for `[[` note links and `@` Person mentions, both inserting canonical wikilink targets into markdown. Type document create/delete/update/reorder write planning lives in `src/workspace/mobileWorkspaceTypeEditing.ts` and serializes through `src/workspace/mobileTypeDefinitions.ts`; creation follows desktop Type normalization, including `notes` to `Note`, canonical default Type casing, and slug-equivalent duplicate guards. Filename actions keep the current desktop title/filename split: manual filename renames preserve the note title, while "rename file to title" uses the shared desktop slug helper and then flows through the same collision, wikilink rewrite, and native persistence write path. The reducer emits repository write plans for note create/save/delete, note file moves, saved-view save/delete, Type document create/save/delete, and folder moves. Native vault loading uses the same repository boundary and is reachable from the tablet and phone status bar through Expo FileSystem's session-scoped directory picker; selecting a folder switches the active repository request to `source: native` without rewriting the tablet or phone surfaces.

Saved-view custom-property sort parity covers desktop numeric, boolean, date-like string, and missing-value comparisons.
Saved-view filter fields named `created` or `modified` resolve as custom frontmatter properties like desktop; built-in created/modified handling is limited to sort strings.

## Tablet Screens

| Surface | Desktop source | Required alignment |
| --- | --- | --- |
| Sidebar groups | `SidebarGroupHeader.tsx` | 10px muted group labels, 0.5px letter spacing, compact rounded count pills. |
| Sidebar items and folder tree | `SidebarParts.tsx`, sidebar folder rows | 13px medium labels, muted inactive icons/text, selected rows use Tolaria selected blue surface. |
| Note list | `NoteItem.tsx`, `PropertyChips.tsx` | No invented metadata lines, no word counts, no floating create button. Titles/snippets/dates follow desktop hierarchy. |
| Editor | `EditorTheme.css`, `theme.json` | H1 title has 32px desktop scale and bottom separator. Markdown fixture should exercise paragraphs, bold, italic, strikethrough, links, wikilinks, inline code, H2-H4, bullets, ordered lists, task lists, blockquotes, code fences, horizontal rules, and tables. |
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
| Editor | H1 size/weight/line height, title separator, paragraph size/line height, H2 size/weight, quote border/padding/italic text, parser regression coverage for H4, ordered lists, task lists, code fences, dividers, links, wikilinks, and strikethrough |
| Toolbar actions | 24px transparent action boxes, 4px radius, no card-like background |
| Sync footer | 30px height, sidebar background, 8px horizontal padding, 12px muted status text |

The same Playwright suite also runs a source-drift check against desktop `src/index.css` and `src/theme.json`, plus a tablet-landscape pixel baseline for the primary iPad reference screen. The native iPad simulator metric gate checks every visible default sidebar row class for desktop-derived row insets, row heights, content heights, text line boxes, text vertical centering, contiguous row sequencing, folder indentation, section title height, count-pill text centering, note-list selected-row width, and note-row content padding so RN Web cannot hide device-only spacing regressions.

Quick-open/search is covered as behavior, not just presentation: empty queries expose active notes, no-result queries show the sheet empty state, the search input receives focus, Enter selects the active result, and ArrowUp/ArrowDown are clamped to desktop quick-open semantics.

Editor autocomplete is covered as behavior too: `[[` suggestions match active notes by title, aliases, filename, type, tags, and path, while `@` suggestions are constrained to `Person` notes and insert the same canonical wikilink target into markdown. The mobile source formatting toolbar feeds the same editor update pipeline: the wikilink action opens the existing `[[` autocomplete path, and table/code-block/divider/list insertion renders back through the read-mode markdown renderer. The native WYSIWYG editor uses the Tolaria-owned compact formatting toolbar for the supported TenTap rich commands instead of the stock TenTap toolbar, the command mapping is unit-tested against the TenTap bridge methods, full-document native save serialization is unit-tested against the desktop raw-markdown/frontmatter boundary, and the iOS simulator metric gate now checks that the TenTap editor surface and toolbar keep the desktop-derived action size, action gap, and toolbar inset on the actual native app. `pnpm mobile:qa:ios-wysiwyg-mutation` also exercises the real TenTap native bridge with `setContent`, then asserts from simulator logs that the existing save pipeline preserved frontmatter, saved the optional H1 as document content, serialized desktop inline marks, preserved a Tolaria wikilink, serialized bullet/ordered/task lists and blockquotes, and kept unsupported table rows as markdown lines. The native proof log trimming keeps current layout metrics when a stale proof from a previous run is still inside the simulator log window, so back-to-back native editor QA stays deterministic. `pnpm mobile:qa:ios-wysiwyg-persistence` extends that route with an isolated native Expo FileSystem vault and fails unless the saved markdown is read back through the native repository boundary. Parser regression tests now preserve raw frontmatter text on body-only WYSIWYG saves, quoted inline-array frontmatter aliases with commas, quoted numeric scalar values, literal `null` scalar values, desktop block-scalar placeholders, canonical duplicate frontmatter keys, blank scalar frontmatter values, single-item inline-array and YAML-list collapse, desktop markdown blocks for empty headings, H4, ordered lists including non-1 start values, ordered lists that use `1)` markers or repeated `1.` markers as editable source lines, empty list items, nested bullet/task lists and mixed nested bullet/ordered/task lists, list continuation, list hard-break, and indented list-image source blocks, code fences with spaced info strings and tilde markers, horizontal rules, blank blockquotes, blockquote paragraphs and explicit breaks, links, desktop angle-wrapped attachment link destinations, URL/email autolinks, bare URL/email save punctuation, wikilinks without redundant display aliases, portable markdown images, remote image URLs with balanced parentheses, image title attributes, inline image source paragraphs, indented image, heading, detached list, code-fence, display-math, and text source lines, inline code, escaped inline markdown punctuation, strikethrough, desktop `==highlight==` marks, display math source, unsupported table fallback lines, unsupported `details` HTML source blocks, unsupported HTML comment/fold marker source blocks, explicit hard-break hydration and serialization, and bold/italic spacing.

Property editing is covered through real typed writes: scalar text, tag lists, number values, boolean Yes/No values, and raw frontmatter edits all pass through the same frontmatter write boundary as desktop-style property edits.

React Native Web screenshots are a fast preflight only. Layout-sensitive mobile UI work must also pass the native iOS simulator metric check and produce a simulator screenshot before it is accepted, because spacing, safe-area, and text layout can diverge between web and the actual Expo app.

Native editor screenshots can open `exp://.../--/?layoutProbe=1&editorMode=raw` to mount the same tablet editor directly in raw-edit mode, or `exp://.../--/?layoutProbe=1&editorMode=wysiwyg` to mount the native TenTap editor directly in document-edit mode. These are QA entry points only; they avoid depending on simulator accessibility taps when the goal is to inspect native rendering of edit-only controls. `pnpm mobile:qa:ios-wysiwyg-layout` uses the same WYSIWYG route but fails on missing or drifted native editor/toolbar metrics.

## Phone Screens

| Surface | Desktop source | Required alignment |
| --- | --- | --- |
| Navigation model | Bear Notes reference images | The interaction can use full-screen note list, left drawer over a partially visible note list, and editor opened from the right. |
| Phone visual styling | Tolaria desktop sidebar/list/editor | Do not copy Bear's dark sidebar or oversized text. Use Tolaria light sidebar colors, muted labels, and desktop-derived hierarchy adjusted only for touch targets. |

## Current Intentional Gaps

- Fixture screens are still storage-free; they validate UI structure, visual parity, and in-process editing behavior without touching disk.
- Local-vault screenshots are generated at test time. They exercise large-vault metadata, real type colors, real relationship keys, lazy note hydration, and markdown body pressure without committing vault content.
- Tablet action sheets are clickable and tested against the editable snapshot. Create/property/relationship/body edits, Type document create/delete/edit, Type template editing and template-backed note creation, relationship target creation, saved-view edits, note type changes, note file moves, and folder moves emit repository write plans; explicit `source=native-vault` mode persists those writes through Expo FileSystem, while fixture and host-vault QA remain deterministic.
- Phone navigation now uses the same reducer-backed workspace controller as tablet for list, sidebar, editor, properties, action sheets, wikilinks, relationships, saved views, folders, persistence writes, and swipe navigation between the main phone surfaces. Native navigation animations and deeper phone-specific polish remain after the tablet/mobile editing contract is stable.
- Mobile wrappers are thin Tolaria wrappers over RNR-style primitives so the eventual implementation can swap in more RNR coverage without changing Tolaria-specific tokens and semantics.
