# Mobile Quality Audit

Last updated: 2026-05-05

This audit records where the current mobile implementation falls below the desktop Tolaria product bar. The goal is not feature parity by count; it is parity in product boundaries, data semantics, interaction quality, and visual discipline for every feature we choose to ship on iPad/iPhone.

## Current Assessment

The mobile app has too much prototype-grade behavior. Several workflows were implemented as visible controls before their underlying product model, settings model, persistence model, and desktop-equivalent interaction semantics were in place. That creates a misleading sense of progress and makes the app feel less considered than desktop Tolaria.

The correction strategy is:

1. Stop adding new feature areas.
2. For each existing mobile feature, compare against the desktop implementation.
3. Either raise the mobile feature to the desktop product boundary or remove/demote it from primary UI until it can meet that bar.
4. Prefer shared/headless models over one-off mobile state.
5. Keep simulator QA and CodeScene/test gates as acceptance criteria, not afterthoughts.

## Feature Gap Inventory

### AI Panel And API Models

Status: boundary corrected on 2026-05-05; remaining depth work is still open.

Desktop reference:

- API/local model providers are configured in Settings through `AiProviderSettings`.
- Provider config is structured: provider kind, name, base URL, model ID, API key storage mode, optional env var, test action, saved provider list.
- API keys are not typed into the chat panel. Desktop stores them through provider-secret helpers, not inside the conversation UI.
- The AI panel consumes a resolved target and shows model/agent readiness, context, message history, wikilink-aware composer, and chat/send state.

Mobile state before correction:

- `MobileAiPanel` mixes provider configuration, API key entry, prompt entry, and response rendering in one panel.
- Provider settings are not persisted as structured settings.
- API key storage is in component state only.
- There is no model target resolver, no settings surface, no saved provider list, no test connection flow, and no clear empty/configure state.

Correction now in place:

- Model/provider/API-key configuration moved out of the prompt panel into a mobile Settings surface.
- Non-secret provider config is stored in app-local settings; API keys are stored through SecureStore.
- The AI panel consumes a configured provider target only.
- If no target exists, the panel shows an empty state with a Settings action.
- Mobile scope is API models only for now; no local models, no coding agents.

Remaining correction:

- Add a provider test action equivalent to desktop's model test flow.
- Add explicit default-provider selection when more than one API model is configured.
- Make Settings a broader app-level surface instead of only a right-panel replacement.
- The chat composer should use note context and eventually wikilink-aware input, but configuration must never live in the prompt panel.

### Properties And Relationships

Status: relationship additions partially corrected on 2026-05-05; panel structure and inverse semantics remain open.

Desktop reference:

- Relationships are frontmatter values containing wikilinks.
- Add/remove uses canonical wikilink generation, note autocomplete, create-and-open affordance, derived inverse relationships, suggested relationship slots, and type-colored chips.
- Property editing distinguishes structural/system metadata, custom scalar properties, and relationship properties.
- Controls are specific to value type and preserve canonical frontmatter semantics.

Mobile current state:

- Relationship chips are visually closer than before, and new relationship additions now canonicalize selected/typed targets to wikilink refs before saving.
- Add/remove works locally but lacks create-and-open, derived inverse groups, full alias/path matching parity, and proper empty/suggested states.
- Custom property editing is basic text input with weak type semantics.
- The panel is crowded and structurally less clear than desktop.

Required correction:

- Store relationship values as canonical wikilinks, not loose ids.
- Share or mirror desktop relationship normalization semantics.
- Add proper empty states, suggested core relationships, derived inverse relationships, and create/open flow.
- Separate property sections visually: system, relationships, custom properties, info/history.
- Remove or demote any editable affordance that cannot write correct desktop-compatible frontmatter.

### Wikilinks

Desktop reference:

- Raw editor and rich editor use shared suggestion filtering, canonical target generation, aliases, keyboard selection, and deduplication.
- AI composer also supports inline wikilinks.
- Wikilink display and navigation use desktop resolution semantics.

Mobile current state:

- Raw editor detects `[[` and inserts aliased links, but suggestions are basic and do not share desktop ranking, aliases, keyboard behavior, or relative path semantics.
- Rich editor wikilink insertion/navigation is still incomplete.
- Relationship add currently reuses note suggestions but does not guarantee canonical wikilink output.

Required correction:

- Move mobile suggestions onto shared/headless wikilink candidate logic where possible.
- Canonicalize every stored relationship and editor insertion.
- Support alias/path matching consistently across raw editor, properties, and AI composer.
- Treat basic text suggestion lists as temporary until keyboard/touch behavior matches the iOS quality bar.

### Sidebar, Favorites, Types, Views

Status: saved-view overclaim corrected on 2026-05-05; real persisted view support remains open.

Desktop reference:

- Sidebar sections are driven by real vault metadata: library filters, favorites, custom views, types, folders.
- Favorites use `_favorite` and `_favorite_index` and preserve order.
- Views are persisted view definitions with nested conditions, sorting, display properties, and editable definitions.
- Type rows use desktop type icons/colors and counts.

Mobile current state:

- Sidebar supports Inbox/All/Archive/Favorites/Types. Views are hidden unless persisted/loaded view definitions are explicitly supplied.
- Type styling is hardcoded rather than derived from type metadata.
- Favorites work locally but have no reorder behavior and no full desktop sidebar semantics.
- View definitions are not user-created, persisted, edited, or backed by the desktop metadata files.

Required correction:

- Treat static views as fixtures only; do not expose them in the app until definitions are loaded from/persisted to vault metadata.
- Use desktop-compatible type metadata for color/icon where available.
- Keep favorites if `_favorite` persistence is correct, but add ordering/reorder expectations before claiming parity.
- Add a proper saved-view model before exposing view editing.

### Note List And Editor Shell

Desktop reference:

- Note list rows communicate title, snippet, metadata, type/relationship chips, search/filter context, and selection with dense but polished layout.
- Editor chrome has stable breadcrumb actions, save state, panel toggles, and note actions.
- Editor content has mature typography and reliable persistence semantics.

Mobile current state:

- Layout works, but text sizing/rotation/simulator orientation issues reveal insufficient visual QA.
- The raw editor is functional but not polished.
- TenTap persistence covers a useful subset but is not yet a mature markdown editor experience.
- Some actions exist as icons without the depth expected from the desktop workflow.

Required correction:

- QA in actual iPad landscape/portrait and iPhone sizes after every visual pass.
- Keep editor toolbar actions minimal until each action has complete behavior.
- Continue TenTap serialization hardening, but do not claim editor parity until wikilinks, selection, toolbar, keyboard, and persistence are reliable.

### Git, Vaults, Auth

Desktop reference:

- Git workflows have explicit status, auth requirements, commit/push/pull, errors, and history.
- OAuth/API key/credential configuration is separated from primary writing surfaces.

Mobile current state:

- Git/auth boundaries are better structured than the AI panel, but the native Git transport is not implemented.
- The UI can show unavailable transport states, which is acceptable only if clearly framed as unavailable rather than fake-working.

Required correction:

- Keep Git sync UX honest: no action should look complete while native transport is unavailable.
- Continue native module work only after current UI quality debt is reduced.

## Immediate Remediation Order

1. Fix AI model configuration boundaries.
   - Add mobile settings model/storage for API model providers.
   - Store API keys in SecureStore.
   - Refactor AI panel to consume configured providers and show empty/configure state.

2. Rework relationship persistence and UI.
   - Canonical wikilinks only.
   - Proper suggested/empty states and derived inverse relationship groups.
   - Remove weak custom-property editing until type semantics are clear, or make it explicitly correct.

3. Rework saved views.
   - Replace hardcoded views with loaded view definitions or label them as sample fixtures in code only.
   - Do not expose view editing until persistence is real.

4. Visual QA pass.
   - Fix iPad orientation/layout issues.
   - Verify note list, sidebar, editor, properties, and AI/settings across iPad landscape/portrait and iPhone.

5. Resume feature work only when each existing surface has an explicit acceptance checklist and passes simulator QA.

## Acceptance Bar

A mobile feature is acceptable only when:

- Its data model is compatible with desktop Tolaria.
- Configuration lives in settings or a dedicated setup flow, not inside primary task surfaces.
- The UI has clear empty/loading/error/saving states.
- Touch and keyboard behavior are designed, not incidental.
- It has focused tests for core model behavior.
- It has iPad simulator QA evidence.
- CodeScene remains at `10.0` for new scorable mobile files and touched files do not regress.
