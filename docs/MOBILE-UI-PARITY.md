# Mobile UI Parity

Tolaria mobile UI work starts from fixture-driven parity with desktop semantics. The iPad baseline copies desktop visual contracts first, then documents any mobile adaptation as an explicit exception. The goal is to avoid invented mobile UI while production logic is still static.

## Copy-First Rule

Desktop Tolaria is the visual source of truth for the first iPad version. React Native surfaces should copy the desktop component contract before adding mobile-specific behavior.

Allowed differences must be documented as exceptions:

| Exception | Rule |
| --- | --- |
| Native layout engine limits | Keep the same semantic contract and closest measurable dimensions. |
| Touch targets | Increase only when the desktop hit area is too small to use reliably. |
| Tablet panel navigation | Swipe/hide/reveal behavior can adapt the layout shell, not component styling. |
| Phone reduction | Phone UI may remove/reflow surfaces after tablet parity is stable. |

If a visible difference is not listed as an exception, treat it as a bug.

## Parity Contract

Mobile desktop-derived constants live in:

```text
apps/mobile/src/ui/desktopParity.ts
```

The visible iPad component coverage map lives in:

```text
apps/mobile/src/ui/mobileParityInventory.ts
```

`mobileParityInventory.test.ts` fails when a visible iPad implementation component has no desktop source, parity contract, or assertion listed.

That file records the source values for the current iPad surface:

| Contract | Desktop source | Mobile users |
| --- | --- | --- |
| `desktopSidebarParity` | `SidebarTopNav`, `SidebarGroupHeader`, `NavItem`, `FolderItemRow` | `MobileWorkspaceSidebar` |
| `desktopNoteItemParity` | `NoteItem` | `MobileListRow`, `MobileNoteListPanel` |
| `desktopPropertyParity` | `propertyPanelLayout`, `propertyChipStyles`, `RelationshipsPanel` | `MobilePropertyRow`, `MobileChip`, `MobilePropertiesPanel` |
| `desktopEditorParity` | `theme.json`, `EditorTheme.css` | `TabletEditorPanel` |
| `desktopPanelParity` | desktop split-pane widths and 52px chrome | tablet sidebar, note list, editor, properties |

## Fast QA Loop

Routine mobile UI work on `mobile-ui-foundation` uses the scoped checks:

```bash
pnpm mobile:lint
pnpm mobile:typecheck
pnpm mobile:test
pnpm mobile:qa:screenshots
pnpm mobile:qa:ios-simulator
```

`pnpm mobile:qa:screenshots` exports the Expo web bundle, serves it locally, drives the UI lab with Playwright, and writes screenshots plus a manifest to:

```text
/tmp/tolaria-mobile-ui-screenshots
```

The screenshot suite also contains objective parity assertions for tablet landscape. These assertions fail on regressions such as:

- selected note rows not spanning the full note-list panel
- panel widths, toolbar height, toolbar padding, or toolbar title typography drifting from desktop chrome
- invented primary-blue note selection when desktop uses the note type color
- rounded/margined note row wrappers instead of desktop full-width rows
- missing note row separators
- sidebar section padding drifting from desktop `SidebarTopNav` and `SidebarGroupHeader`
- sidebar count pills losing desktop rounded pill sizing
- properties rows drifting from desktop 28px row density and 12px muted labels
- relationship rows losing full-width typed color, 6px radius, or desktop padding
- editor H1, paragraph, quote, and table primitives drifting from `theme.json`
- toolbar icon actions reverting to oversized mobile card buttons
- sync footer becoming an oversized mobile bar instead of the 30px desktop status bar

The same Playwright suite also compares the primary tablet-landscape screen against a committed pixel baseline and checks that mobile parity constants still match desktop `src/index.css` and `src/theme.json`.

`pnpm mobile:qa:ios-simulator` captures the currently booted iPad Simulator into:

```text
/tmp/tolaria-mobile-ui-simulator/ipad-landscape.png
```

Use it after launching Expo on iOS with `pnpm mobile:ios`. The command sets the booted iPad Simulator to landscape and captures the visible Simulator window, so the artifact matches the native Expo Go surface rather than the Expo web build.

If Expo Go is not already focused, open the running native bundle first:

```bash
pnpm mobile:ios
pnpm mobile:qa:ios-simulator
```

For tablet UI review, treat this simulator artifact as mandatory alongside Playwright screenshots. Playwright catches measurable parity regressions quickly; the simulator screenshot catches native Expo Go rendering differences that browser automation can miss. Use `--open-url` only for native deep links such as `exp://...`; an `http://...` URL opens Mobile Safari and is not an acceptance target for the mobile app.

The harness also exercises a read-only real-vault path. By default it looks for:

```text
/Users/luca/Laputa
```

Set `MOBILE_QA_VAULT_PATH` to override that path. The loader scans Markdown files read-only, injects a `MobileWorkspaceSnapshot` into local storage, and captures `local-vault` tablet/phone screenshots without touching vault content.

Large-vault QA currently checks:

- local snapshot read/build duration
- initial tablet render from the injected snapshot
- note switching
- type navigation
- folder navigation

The default screenshot matrix is:

| Target | Viewport | Purpose |
| --- | --- | --- |
| Tablet landscape | 1366 x 1024 | First production target and primary quality bar |
| Tablet portrait | 1024 x 1366 | Tablet reflow and panel density |
| Phone portrait | 390 x 844 | Early visibility into phone reduction pressure |

The tablet state matrix currently captures:

| Scenario | Purpose |
| --- | --- |
| `default` | Baseline sidebar, note list, editor, properties, and sync footer |
| `selected-open-source-project` | Note selection state and properties refresh |
| `empty-inbox` | Empty list, no selected note, empty editor, empty properties, pull-required sync |
| `long-title` | Long title pressure across note rows, toolbar, and editor heading |
| `property-heavy` | Multi-tag note, grouped multi-value relationships, and property actions |
| `folder-tree` | Vault folder tree pressure in tablet landscape |
| `local-vault` | Real read-only vault data, large counts, real folders/types, relationships, and markdown pressure |

The phone navigation matrix currently captures:

| Scenario | Purpose |
| --- | --- |
| `initial` | Full-screen note list |
| `sidebar-open` | Left drawer over the note list, leaving a visible strip of list content on the right |
| `editor-open` | Note editor opened from the right with a back path to the list |
| `long-title-list` | Phone note list pressure with long titles |
| `property-heavy-editor` | Phone editor pressure with the property-heavy selected note |

Run the full desktop/native Tolaria gate only before promotion or when desktop/native production files are intentionally changed:

```bash
TOLARIA_MOBILE_FULL_GATE=1 git push
```

## Surface Parity Map

| Priority | Desktop Source | Mobile Target | Required Fixture States | Acceptance Bar |
| --- | --- | --- | --- | --- |
| P0 | Sidebar navigation | Native sidebar rail/list | all notes, inbox, archive, favorites, types, long counts | Copy desktop section padding, group labels, count pills, active states, and folder row density |
| P0 | Note list | Native note list panel | selected note, favorite note, long title, multi-chip note, empty search | Copy desktop full-width row surface, separators, type-colored selected state, typography, and chip density |
| P0 | Editor shell | Native editor container | title, rich text preview, empty note | Copy desktop editor theme values for content width, title separator, headings, body, lists, quotes, and tables |
| P0 | Properties panel | Native property rows | type, date, status, relationships, empty values | Copy compact 12px labels, 24px chips, full-width relationship rows, and property-action rows |
| P1 | Search and quick open | Native search overlay/sheet | empty query, results, no results, keyboard focus | Results can be scanned quickly; mouse/touch selection is deterministic |
| P1 | Create note/type/status actions | Native modal/sheet controls | valid input, invalid input, type selection, collision | Controls use Tolaria primitives; disabled/loading/error states are visible |
| P2 | Phone shell | Reduced navigation and panels | list-only, editor-only, properties sheet, back stack | Phone removes surfaces deliberately after tablet parity is established |

## Read-Only Interaction Boundary

The tablet shell is clickable before it is writable. These interactions are intentionally state-local and do not persist to the vault:

| Flow | Current behavior |
| --- | --- |
| Sidebar sections and folders | Filter the note list and select the first visible note |
| Note rows | Select the note and refresh editor/properties |
| Search | Opens a desktop-parity sheet, filters the visible note list, and lets results select a note |
| Create note | Opens a localized title form with disabled create state until a title exists |
| Add property | Opens localized property name/value fields |
| Add relationship | Opens localized relationship name/note-title fields |
| Favorite | Toggles local star state only |
| More actions | Opens localized note actions without persistence |

Persistence should be added later behind the same action boundaries. Do not wire direct vault writes into presentation components.

## Mobile Primitive Layer

Mobile UI follows the same ownership model as desktop shadcn/ui. RNR-derived primitives live locally in `apps/mobile/src/components/ui`, and Tolaria-specific wrappers/compositions live in `apps/mobile/src/ui`.

Use the local primitive layer before adding new raw React Native controls. Product-specific surfaces can still use native `View`, `ScrollView`, and `Pressable` where they model Tolaria behavior, but text, buttons, badges/chips, and future shared controls should flow through the local RNR-backed components whenever practical.

## Per-Surface Workflow

1. Identify the desktop source component or workflow.
2. Add its values to `desktopParity.ts` or reuse an existing contract.
3. Add or update fixture data for the relevant states.
4. Compose the screen from `apps/mobile/src/components/ui` primitives and `apps/mobile/src/ui` Tolaria wrappers.
5. Add parity assertions for measurable invariants before relying on screenshot review.
6. Run the fast QA loop and inspect screenshots.
7. Add interaction checks for taps, selection, scrolling, and state transitions.
8. Wire real data only after the fixture surface passes visual and interaction QA.

## Quality Rules

- Tablet landscape is the quality bar until the tablet shell is stable.
- Phone UI is allowed to lag, but screenshots must reveal where reduction is needed.
- Screens must avoid browser-default styling, text overlap, unstable dimensions, and decorative-only surfaces.
- Mobile-specific copy must go through the shared locale catalog when it becomes production UI copy.
- Business logic is not a substitute for visual completeness. A surface is not ready to wire until the fixture state is coherent.
