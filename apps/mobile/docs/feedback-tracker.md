# Mobile Feedback Tracker

This tracker covers the explicit iPad/phone feedback driving `mobile-ui-foundation`.
Status is intentionally conservative: an item is `Done` only when current code plus
focused tests or native simulator evidence prove it. `Partial` means code exists but
the behavior still needs native proof or further polish.

## Video Evidence

Source: `/Users/luca/Downloads/ScreenRecording_06-24-2026 14-36-21_1.MP4`.

Observed from the June 24 iPad recording:

- The desired phone interaction pattern is clear: note list as the primary surface,
  sidebar peeking/sliding from the left, editor sliding from the right, and back
  navigation returning to the note list.
- The recording is navigation evidence, not visual-style evidence. The dark
  sidebar and Bear-like card treatment are still style drift from Tolaria and must
  not be used as the final phone visual language.
- The recorded session still appears to use fixture/mock content in places. Native
  QA for user-facing behavior should load the Laputa dev vault unless a fixture is
  explicitly required for deterministic regression checks.
- During editor scrolling, the recording shows transient doubled/ghosted text.
  Reproduce this in native simulator before deciding whether it is a capture
  artifact, an editor overlay issue, or an animation/rendering bug.

## Fixed

| Feedback | Status | Evidence |
| --- | --- | --- |
| Remove invented desktop-parity mock data such as note word counts, draft/date eyebrow rows, bottom-right note-list create button, and non-desktop sidebar groups | Done | Current note rows and sidebar sections are driven by `MobileNoteListPanel`, `MobileWorkspaceSidebar`, and real/fixture workspace data; screenshot parity assertions cover desktop-style rows and sidebar groups. |
| Note-list top-right should show only the type icon | Done | `MobileNoteListPanel` rows render `MobileTypeIcon` as the row trailing affordance instead of a type text label. |
| Add desktop-style sync footer/status bar | Done | Tablet/phone shells render the compact sync footer; native screenshots show the bottom `Synced`/open-folder row. |
| Sidebar should use folder tree, not invented Projects/Statuses groups | Done | Local vault snapshot builds folder sections and `MobileWorkspaceSidebarFolderTree` renders folders; real Laputa screenshots show folders from the vault. |
| Sidebar and note list should copy desktop density instead of heavy/bold mobile styling | Done | `desktopParity.ts`, `mobileParityInventory`, screenshot assertions, and native layout metric checks cover sidebar rows, count pills, note rows, typography, and active surfaces. |
| Note list padding, separators, and active state should match desktop full-width row behavior | Done | `MobileListRow` and note-list screenshot assertions enforce full-width selected row background, separators, and no invented blue border. |
| Relationship rows should be individual full-width typed rows, not a two-column linked-document list | Done | `MobilePropertiesPanel` renders `RelationshipValues` as full-width typed rows; native Laputa proof showed `Related to -> Refactoring Model Assumptions` visible and tappable. |
| Tags and properties should use compact desktop inspector density | Done | `desktopPropertyParity` controls row height, 12px labels, chip density, and property panel padding; property layout metrics cover the density contract. |
| Internal desktop frontmatter such as `_display` and `_sheet` should not appear as user properties | Done | `localVaultFrontmatter` hides unknown underscored metadata; `localVaultFrontmatter.test.ts` and `localVaultSnapshot.test.ts` cover the regression; native Laputa proof showed no `Display` or `Sheet` rows while `Related to` remained. |
| Load the real Laputa vault for meaningful iPad testing | Done | `mobile:dev-vault` serves `/Users/luca/Laputa`; Expo deep links use `source=dev-vault&devVaultUrl=...`. |
| Creating a new note should not show a title modal | Done | The note-list plus button and folder create-note action emit direct `createNote` edits with an empty optional title. `MobileWorkspaceActionSheet` no longer has a `createNote` action route or `workspace-create-note-title-input`; focused folder/create/action-sheet tests cover the path. |
| Note title should not be a separate body input | Done | `TabletEditorPanel` edits one Markdown document through TenTap/source editors; there is no title/body split in the editor. |
| Raw editor should show frontmatter and preserve it on save | Done | `MobileMarkdownSourceEditor` edits `mobileNoteEditableContent`; source/frontmatter tests cover read/write preservation. |
| Raw editor bottom formatting bar should stay at the bottom | Done | `MobileMarkdownSourceEditor` renders `MobileMarkdownFormattingToolbar` in `toolbarHost` after the editor body. |
| Raw editor gray border should be removed | Done | Source editor input uses transparent/borderless input styling (`border-0 bg-transparent`, `underlineColorAndroid="transparent"`). |
| Raw editor should have Markdown syntax highlighting | Done | `SourceEditorInput` renders a non-interactive `syntaxLayer` from `markdownSyntaxTokens` behind the transparent input; source editor tests cover token rendering. |
| Remove slash commands from the editor | Done | Slash-command autocomplete and slash-query block replacement were removed from the mobile autocomplete model, WYSIWYG bridge, native probes, and tests. Formatting/block insertion remains available only through explicit toolbar actions. |
| Notes should open directly in editable WYSIWYG mode, without a separate edit mode | Done | Tablet, phone, and Mobile UI Lab defaults now open the WYSIWYG editor as editable unless a raw/source QA route explicitly requests source mode. |
| Views section should appear even when empty so the user can press `+` | Done | Native snapshot exposed `sidebar-section-create-views` on an empty real-vault Views section. |
| Note-list header should have a sidebar button | Done | `MobileNoteListPanel` accepts `leading`; tablet shell provides `tablet-note-list-sidebar-action`, verified in native snapshot. |
| Editor breadcrumbs/toolbar should have a left chevron to hide sidebar plus note list | Done | `TabletEditorPanel` accepts `leading`; tablet shell provides `tablet-editor-chrome-toggle`, verified in native snapshot. |
| Left chrome and properties panel show/hide should be smooth and animated | Done | `TabletWorkspace` uses animated offsets for sidebar/note-list chrome and properties; `tabletWorkspacePanelTransitions.test.ts` covers transition math. |
| Phone navigation should use the Bear-style structure without copying Bear styling | Done | `PhoneWorkspace` has list/sidebar/editor/properties states, swipe previews, and transition tests. `pnpm mobile:qa:ios-phone-layout` passes native iOS simulator metrics for real-vault list, sidebar, and properties states. Native phone proof covers list -> sidebar -> list, list -> editor -> list, and editor -> properties -> editor without copied Bear styling. |

## Still To Fix Or Prove

| Feedback | Status | Next action |
| --- | --- | --- |
| Make a complete fixed-vs-remaining list | Partial | This file is the tracker; keep it updated as each item is proved or fixed. |
| Remove open/archived selectors altogether from the note list | Done | `mobileNoteListToolbarChrome` fixes the note-list toolbar contract to search plus direct create only, and `MobileNoteListPanelChrome.test.ts` asserts that no open/archive/filter/selector chrome is reserved in the header. Archive state remains reachable through sidebar navigation and bulk actions instead of a note-list header selector. |
| General keyboard shortcuts should work (`Cmd+O`, `Cmd+P`, `Cmd+F`, `Cmd+K`, `Cmd+\`) | Partial | Parser/model coverage exists in `mobileWorkspaceKeyboardShortcuts.test.ts`; native Expo Go hardware-key dispatch is not proven and likely needs a native/dev-client strategy or a focused bridge. |
| Keyboard navigation of the note list should work | Partial | Arrow-key action parsing exists; native focus and dispatch for the note list is not proven. |
| Many type icons are not rendered correctly | Done | `MobileTypeIcon` now requires `typeDefinitions`, so every type-icon render path must receive the vault Type document definitions at typecheck time. The editor toolbar/file fallback, WYSIWYG wikilink picker, and more-actions summary now pass the same definitions as note list, properties, search, relationship, and type-visibility surfaces. `MobileWorkspaceIconNames.test.ts` covers real Laputa configured Phosphor names such as `leaf`, `guitar`, `brain`, `stethoscope`, `book-bookmark`, `calendar-blank`, and `file-text` as first resolver candidates; the native resolver dynamically indexes all `phosphor-react-native` exports by normalized name. |
| WYSIWYG editor should load note content on first open | Done | Native iPhone Expo Go proof opened `Refactoring Model Assumptions` from the real Laputa note list and the first rich-editor screenshot, before switching to raw mode, showed the note body content immediately. Proof saved at `/tmp/tolaria-wysiwyg-first-open-refactoring-model.jpg`. |
| Modals/action sheets such as section edit, view edit, command palette should be properly designed | Partial | Shared action-sheet spacing now has an explicit native layout contract; suggestion action sheets use the same padded scroll container as the other sheets; command palette input/rows/footer are tied to desktop palette density. Needs native simulator proof for section/view editors and nested controls. |
| Properties panel still has remaining issues | Partial | Internal metadata leak and relationship row visibility are fixed. Remaining property add/edit discoverability and type-schema/action-sheet polish need native proof and fixes. |
| Swipe gestures should hide/show sidebar, note list, editor, and properties panel | Done | Native iPhone simulator proof covers note-list right swipe to sidebar, sidebar left swipe back to note list, note tap to editor, editor right swipe back to note list, editor left swipe to properties, and properties right swipe back to editor. `PhoneWorkspace` committed gestures now clear the drag-preview layer before navigation so settled screenshots do not duplicate the sidebar/list. |
| All transitions should be very smooth like the reference video | Partial | Tablet transitions are animated and tested at math level; needs native frame/interaction proof on tablet and phone. |
| Editor text should not ghost or duplicate during scroll/drag transitions | Done | Native iPhone Expo Go proof on real Laputa content (`Tolaria v2026-06-23`) recorded repeated WYSIWYG editor scrolls in both directions and inspected extracted frames from `/tmp/tolaria-editor-scroll-proof.mp4`; current settled and mid-scroll frames show one editor layer with no duplicated/ghosted text. |
