# Mobile Strategy

Last updated: 2026-05-03

This document is the working plan for building Tolaria as a universal mobile app. It is intended to be detailed enough that a future implementation session can pick up the work autonomously while desktop Tolaria continues in parallel.

The priority order is:

1. iPad
2. iPhone
3. Android

Android is intentionally distant, but the iPad/iPhone architecture must not make Android impossible.

## Current Operating Assumptions

- Mobile work happens in this separate worktree/branch so it does not block active desktop Tolaria work on `main`.
- Pushes from this worktree should target the current worktree branch, not desktop `main`, unless the user explicitly changes the workflow.
- Local validation should use the iOS/iPad simulator first.
- Local simulator builds do not need a production Apple bundle identifier. Use a placeholder reverse-DNS bundle ID in Expo config for simulator/development builds; real App Store/TestFlight distribution can choose the final bundle ID later.
- A paid Apple Developer account is not required for simulator testing. Device/TestFlight/App Store distribution will require proper Apple signing and bundle ID setup later.
- CodeScene MCP is available in this environment. Codacy MCP is installed, authenticated, and available in the active tool list. It reads its token from the ignored local `.env.codacy.local` file in this worktree.

## Executive Summary

Build Tolaria mobile as a separate Expo React Native app in the same monorepo as desktop Tolaria.

The mobile app should reuse Tolaria's domain model, markdown parsing, vault conventions, sync contracts, localization, icon mapping, analytics event names, and test fixtures. It should not try to reuse the existing desktop React DOM UI components directly. The mobile UI should be implemented with React Native surfaces, native gestures, native list virtualization, mobile-specific editor chrome, and an adaptive layout that starts with iPad and scales down to iPhone.

The app should use app-managed vault storage, with vaults synced through Git. Git should be implemented as a mobile-native capability, likely through `libgit2` exposed via a native module. GitHub OAuth over HTTPS should be the default authentication path. Arbitrary HTTPS remotes should be supported next. SSH should be treated as an advanced power-user option.

Over-the-air updates are a hard requirement. Use Expo EAS Update for JavaScript, style, and asset updates. Native runtime changes still require App Store / Play Store builds.

## Goals

### Product Goals

- Tolaria should feel like a native writing and knowledge app on iPad.
- iPad should be useful as a primary Tolaria surface, not a stretched phone app.
- iPhone should be planned from the beginning and delivered after the iPad shell proves out.
- The mobile app should preserve Tolaria's core identity: local markdown vaults, structured types, properties, relationships, wikilinks, Git-backed history, and AutoGit-style sync.
- Mobile should support a smooth path to Android later.

### Engineering Goals

- Keep one monorepo so shared logic evolves with desktop and mobile together.
- Share pure TypeScript packages, not UI components.
- Keep mobile platform I/O behind narrow interfaces.
- Keep the native layer small and versioned so most behavior can ship over the air.
- Preserve desktop velocity. Mobile work should avoid broad repo churn in the existing desktop app until shared packages are intentionally extracted.

### Non-Goals For The First Mobile Milestones

- Do not port the desktop UI wholesale into a WebView.
- Do not reach full desktop editor parity before validating the mobile shell.
- Do not support arbitrary external folder access as the primary storage model.
- Do not make Android a launch blocker.
- Do not implement every desktop AI/CLI feature on mobile. Desktop-only CLI agent workflows can remain desktop-only unless mobile-specific equivalents are designed.

## Relationship To Existing ADRs

[ADR-0005](./adr/0005-tauri-ios-for-ipad.md) records an earlier Tauri v2 iOS prototype strategy. That ADR is valuable historical context, but it is superseded by [ADR-0109](./adr/0109-universal-mobile-app-with-expo-react-native.md), which chooses Expo React Native for production mobile.

## Product Model

The mobile app should keep Tolaria's existing four-surface information architecture:

```text
Sidebar | Note List | Editor | Properties
```

The surfaces should adapt by screen size.

### iPad

iPad is the first priority and should feel close to desktop Tolaria:

```text
Sidebar | Note List | Editor | Properties
```

The exact panel persistence depends on width:

| Width / posture | Layout |
|---|---|
| iPad portrait narrow | Sidebar overlay, Note List + Editor, Properties as right sheet |
| iPad landscape regular | Sidebar + Note List + Editor, Properties collapsible |
| iPad large / Stage Manager wide | Sidebar + Note List + Editor + Properties |

iPad must support:

- External keyboard shortcuts.
- Trackpad pointer and hover polish where React Native supports it.
- Native-feeling split-view transitions.
- Readable editor width, not full-bleed text on very wide screens.
- Quick switching between note list, editor, and properties.

### iPhone

iPhone uses the same surfaces, but arranged as horizontal adjacent screens:

```text
Sidebar <- Note List -> Editor -> Properties
```

Default surface: Note List.

Expected interactions:

- Swipe from the note list to reveal Sidebar.
- Tap a note to open Editor from the right.
- Swipe / tap info from Editor to open Properties.
- Back moves one surface left: Properties -> Editor -> Note List.
- Search starts from Note List.
- Properties is a full-height sheet/surface, not a small modal.

### Android Later

Android should use the same app architecture and core packages. The UI may need platform-specific behavior for:

- System back gesture conflicts with horizontal edge gestures.
- Permission flows.
- File sharing/import.
- Typography and default touch feedback.
- Play Store OTA and native build distribution.

The first iOS implementation must avoid iOS-only assumptions in shared packages.

## Tech Stack Decision

### Mobile Runtime

Use Expo React Native.

Reasons:

- Native-feeling scroll, gestures, keyboard, haptics, and navigation are easier in React Native than in a mobile WebView.
- Expo EAS Update provides the OTA update channel/runtime model needed for frequent product iteration.
- Expo development builds support custom native modules when the app needs Git/storage/auth capabilities.
- React Native has a path to both iOS/iPadOS and Android from the same codebase.

Use the React Native New Architecture unless a specific dependency blocks it. This keeps the app aligned with React Native's current direction and native module model.

### OTA Updates

Use EAS Update for JavaScript, style, and asset updates.

Operational rule:

| Change type | Delivery path |
|---|---|
| Screen UI changes | OTA |
| Styling/tokens/assets/icons | OTA |
| JS bug fixes | OTA |
| Markdown parsing/search/filter logic | OTA |
| Native module changes | Store/TestFlight/Play build |
| New iOS/Android entitlements | Store/TestFlight/Play build |
| Git engine native changes | Store/TestFlight/Play build |
| Auth callback scheme changes | Store/TestFlight/Play build |

Design the native runtime as a stable platform. Push product behavior into JavaScript when it is safe and reasonable. Do not abuse OTA to change the core purpose of the app or bypass store review rules.

### Why Not Tauri Mobile For Production

Tauri mobile is useful for prototypes and may remain valuable for internal experiments. It is not the recommended production path for this app because the core product requirement is native-feeling mobile interaction.

Likely friction points with a WebView-first production app:

- Edge gestures and interactive transitions.
- Native list scroll performance under large vaults.
- Keyboard behavior and editor focus.
- iPad split-view feel.
- Native sheets, menus, and selection affordances.
- Android back gesture integration later.

Tauri mobile should not be the default production plan unless React Native proves unable to meet a hard product requirement.

### Why Not SwiftUI First

SwiftUI would likely produce the most native iPad app, but it would:

- Lose TypeScript code sharing.
- Slow the Android path dramatically.
- Require rebuilding domain UI and app logic in a separate language/runtime.
- Increase the cost of OTA updates.

SwiftUI can still be used for narrow native surfaces if required, but not as the app's primary implementation strategy.

### Why Not Capacitor

Capacitor would preserve more web UI code but would inherit many of the WebView issues above. It also does not give a natural path for sharing the current Rust/Tauri backend. It is not the right tradeoff for a smooth native-feeling notes app.

## Repo Strategy

Keep a monorepo.

Long-term target shape:

```text
tolaria/
  apps/
    desktop/
      src/
      src-tauri/
      package.json

    mobile/
      app/
      src/
      ios/
      android/
      app.json
      eas.json
      package.json

  packages/
    core/
      src/
      package.json

    markdown/
      src/
      package.json

    vault/
      src/
      package.json

    sync-contracts/
      src/
      package.json

    design-tokens/
      src/
      package.json

    i18n/
      src/
      package.json

  demo-vault-v2/
  docs/
  package.json
  pnpm-workspace.yaml
```

Do not force the full move immediately. A lower-risk intermediate shape is acceptable:

```text
tolaria/
  src/              existing desktop frontend
  src-tauri/        existing desktop backend
  packages/
    core/
    markdown/
    design-tokens/
  apps/
    mobile/
```

Move desktop into `apps/desktop` only when the shared package structure is stable enough that the relocation will not distract from feature work.

Use pnpm workspaces for all packages and apps. React Native / Expo dependency resolution is sensitive to package hoisting, so the initial mobile workspace uses pnpm's hoisted node linker. Treat that as part of the mobile runtime setup, not as a desktop architecture decision: if it causes desktop dependency churn later, isolate and document the smallest workspace-level adjustment instead of rewriting the package strategy.

### Package Boundaries

#### `packages/core`

Pure TypeScript. No DOM, Tauri, React Native, filesystem, or network imports.

Owns:

- `VaultEntry` and related domain types.
- Type, view, folder, and sidebar selection models.
- Note list filtering, sorting, grouping, and counts.
- Relationship model.
- Status and type normalization.
- App command identifiers if they can be platform-neutral.

#### `packages/markdown`

Pure TypeScript.

Owns:

- Frontmatter parsing/writing helpers.
- Wikilink parsing and resolution.
- H1/title extraction.
- Snippet extraction.
- Compact markdown helpers.
- Safe markdown transforms that are shared between platforms.

#### `packages/vault`

Shared interfaces and contracts, not platform I/O.

Example:

```ts
export interface VaultRepository {
  listEntries(): Promise<VaultEntry[]>
  readNote(path: string): Promise<string>
  writeNote(path: string, content: string): Promise<void>
  deleteNote(path: string): Promise<void>
  moveNote(fromPath: string, toPath: string): Promise<void>
}
```

Desktop implements this through Tauri commands. Mobile implements it through app storage/native filesystem APIs.

#### `packages/sync-contracts`

Shared sync model:

- Sync status enum.
- Git operation result types.
- Conflict types.
- AutoGit state machine types.
- Auth-required and offline error classification.
- Commit message generation logic if it is pure.

Actual Git implementation remains app/platform-specific.

#### `packages/design-tokens`

Shared design values, not CSS:

- Semantic colors.
- Type scale.
- Spacing constants.
- Type color definitions.
- Semantic icon names.
- Mapping from Tolaria type icon names to Phosphor icon identifiers.

Desktop maps these into CSS variables/Tailwind. Mobile maps them into React Native styles.

#### `packages/i18n`

Shared locale catalogs and translation helpers if practical.

The mobile app should reuse the existing localization discipline:

- User-facing copy lives in locale files.
- Add mobile-specific keys under clear namespaces.
- Keep placeholders and product names stable.

### What Not To Share

Do not share:

- shadcn/ui components.
- React DOM components.
- Tailwind class strings.
- Desktop layout panel components.
- Tauri IPC wrappers.
- React Native components.
- Platform storage/git/auth implementations.

The sustainable boundary is:

```text
shared packages = pure model, parsing, decisions
apps            = rendering, navigation, I/O, native capabilities
```

## UI Reuse Strategy

Expected reuse:

| Area | Realistic reuse |
|---|---:|
| Domain types and note metadata | High |
| Markdown/frontmatter/wikilink utilities | High |
| Filtering/sorting/grouping/search helpers | Medium to high |
| Relationship/property semantics | Medium to high |
| Localization catalogs | Medium |
| Analytics event names | Medium |
| Desktop React components | Low |
| shadcn/Tailwind styling | Low |
| BlockNote desktop editor UI | Low to medium, depending on editor strategy |

Do not try to build "universal" React components that render both DOM and React Native. That usually produces awkward code and mediocre UI on both platforms.

Instead, build shared headless models:

```ts
buildSidebarModel(vaultState)
buildNoteListModel(selection, entries, filters)
buildPropertiesModel(entry, content)
buildEditorHeaderModel(entry, content)
```

Then render them separately:

```text
desktop: React DOM + shadcn + CSS
mobile: React Native + native gestures/lists
```

## Mobile UI Architecture

### Navigation

Use a navigation setup that supports both stacked mobile screens and iPad split layouts. The exact library can be chosen during bootstrap, but the requirements are:

- iPad can keep multiple surfaces visible.
- iPhone can animate between adjacent surfaces.
- Back behavior is explicit and testable.
- Android system back can be integrated later.
- Deep links can eventually open a vault/note.

The surface model should be represented in app state independently from the navigation library:

```ts
type MobileSurface =
  | { kind: 'sidebar' }
  | { kind: 'note-list'; selection: SidebarSelection }
  | { kind: 'editor'; notePath: string }
  | { kind: 'properties'; notePath: string }
```

### Gestures

Use React Native Gesture Handler and Reanimated for interactive transitions.

Gesture rules:

- Avoid conflicting with iPad pointer interactions and text selection.
- Avoid conflicting with Android system back gestures later.
- Edge gestures should be discoverable but not mandatory; visible buttons must exist.
- The note editor must not accidentally trigger navigation while selecting/editing text.

### Lists

Use a production-grade virtualized list for note lists and search results. The list must handle large vaults without jank.

Requirements:

- Stable row heights or precomputed row estimates.
- Fast scroll through thousands of notes.
- Selection state does not trigger full-list re-render.
- Type icons and chips render from shared design tokens.
- Pull-to-refresh/sync states are clear and non-blocking.

### iPad Layout Engine

Create a layout classification utility early:

```ts
type MobileLayoutClass =
  | 'phone-compact'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'tablet-wide'
```

Inputs:

- Window width/height.
- Safe area.
- Orientation.
- Possibly Stage Manager dimensions.
- Platform.

Use this to decide panel persistence, not scattered width checks throughout screens.

### Visual Language

Follow the desktop Tolaria visual language:

- Light, quiet surfaces.
- `#37352F` text family semantics.
- Subtle borders.
- Sparse blue for active actions/focus.
- Type colors/icons visible in note rows and sidebar.
- Dense but readable information hierarchy.
- Phosphor icons as the primary icon language.

The current high-fidelity exploration lives at:

- [`design/mobile-mockups/tolaria-mobile-hifi.html`](../design/mobile-mockups/tolaria-mobile-hifi.html)
- [`design/mobile-mockups/tolaria-mobile-hifi.png`](../design/mobile-mockups/tolaria-mobile-hifi.png)

These are reference mockups, not implementation assets.

## Editor Strategy

The editor is the largest product and technical risk.

Recommended sequence:

1. Read-only rendered note view.
2. TenTap editor spike inside the native mobile shell.
3. TenTap-backed Markdown editing with title, body, save, wikilinks, and properties.
4. Markdown formatting toolbar and autocomplete.
5. Advanced blocks/features as separate follow-up work.
6. Keep native Markdown as the fallback if TenTap fails quality gates.

### Preferred Path: TenTap

Use [TenTap](https://10play.github.io/10tap-editor/docs/intro) as the preferred mobile editor candidate. TenTap is a React Native rich-text editor based on Tiptap and ProseMirror. It runs the editor in a WebView and exposes a typed React Native bridge plus native toolbar affordances.

This is a deliberate compromise:

- The app shell remains React Native and native-feeling.
- The editor body uses mature web editor technology.
- The WebView is isolated to the editor surface, not the whole app.
- Tiptap's Markdown support and extension model give a plausible path for Tolaria-specific `[[wikilinks]]`, task lists, formatting, and future richer editing.

TenTap should be integrated through an explicit `MobileEditorAdapter` boundary so the rest of the app does not depend directly on TenTap APIs.

Example shape:

```ts
export interface MobileEditorAdapter {
  loadMarkdown(markdown: string): Promise<void>
  getMarkdown(): Promise<string>
  focus(): void
  blur(): void
  runCommand(command: MobileEditorCommand): Promise<void>
  subscribeToChanges(callback: (state: MobileEditorState) => void): () => void
}
```

The editor adapter must preserve Tolaria's durable-storage rule: markdown files remain the source of truth. If the editor internally uses Tiptap JSON, that JSON is cache/runtime state only unless a future ADR explicitly changes the document model.

### TenTap Quality Gates

TenTap is the preferred path only if it passes an early spike on real iPad hardware or the closest available simulator/device setup.

Required checks:

- Typing latency feels native on common note sizes.
- Long notes scroll smoothly inside the editor surface.
- External keyboard input works on iPad.
- Undo/redo works predictably.
- Selection handles and copy/paste feel acceptable.
- The editor coexists with the horizontal surface gestures without accidental navigation.
- The keyboard avoiding behavior does not obscure the cursor or toolbar.
- Markdown round-trip preserves Tolaria's common documents.
- `[[wikilinks]]` can be displayed/edited without corrupting markdown.
- Frontmatter is not edited by the rich editor body unless explicitly in raw mode.
- The editor can be isolated from note list/properties renders so typing does not cause app-wide re-renders.

Initial round-trip fixture set:

- H1 title note.
- Paragraphs with bold, italic, inline code, links, and `[[wikilinks]]`.
- Bullet and ordered lists.
- Task lists.
- Code blocks.
- Blockquotes.
- Markdown tables if supported; otherwise verify graceful preservation/fallback.
- Existing Tolaria notes with YAML frontmatter.

### Native Markdown Fallback

If TenTap fails the quality gates, use a native Markdown editor for V1:

- React Native text input/editor surface.
- Native toolbar.
- Markdown preview or rendered affordances.
- Wikilink autocomplete.
- Properties outside the editor.

This fallback likely has less desktop editor parity but may produce the best typing, keyboard, and Android behavior. It should remain viable until TenTap is proven.

### BlockNote On Mobile

Do not use BlockNote as the default mobile editor foundation. BlockNote remains important on desktop, but its React DOM assumptions and lossy Markdown import/export make it a poor first bet for mobile. Revisit only if a future mobile requirement specifically demands BlockNote parity and TenTap/native Markdown cannot satisfy it.

Decision rule:

Use TenTap if it passes the quality gates. Keep the editor behind an adapter so native Markdown remains a realistic fallback. Never make the whole mobile app a WebView.

## Storage Strategy

Assumption for mobile: simplify file access and store vaults inside app-managed storage.

Do not start with arbitrary external folder access. Mobile OS file providers, iCloud folders, and Android scoped storage add product and QA complexity that can wait.

Use a provider abstraction anyway:

```ts
type VaultProvider =
  | { kind: 'app-storage' }
  | { kind: 'git-remote'; remoteUrl: string }
  | { kind: 'icloud'; unavailableUntilDesigned: true }
  | { kind: 'document-provider'; unavailableUntilDesigned: true }
```

For v1, only `app-storage` plus Git remote sync needs to work.

Storage requirements:

- Vaults are directories in app-managed storage.
- Notes are still plain markdown files.
- `.git` exists inside the app-managed vault directory when Git is enabled.
- Attachments/assets can be stored in vault-relative paths.
- The app can export/share a vault later.
- Deleting/reinstalling the app may delete vault data unless the vault is synced; onboarding must communicate this clearly.

## Git And Sync Strategy

Mobile Git is feasible, but should be treated as infrastructure, not a quick JS helper.

### Git Engine

Recommended production direction: `libgit2`, likely through a Rust native module exposed to React Native.

Reasons:

- `libgit2` is the standard embeddable Git implementation.
- It supports credential callbacks for HTTPS/SSH.
- Rust `git2` bindings line up with Tolaria's existing Rust knowledge.
- A native module can be kept narrow and versioned.

Possible implementation shapes:

| Option | Use |
|---|---|
| Rust + `git2` + React Native native module | Recommended production path |
| Direct Swift/Kotlin/C++ `libgit2` wrapper | Possible, more platform-specific |
| `isomorphic-git` | Useful prototype/reference, not the default production bet |

`isomorphic-git` should be considered only if it proves reliable with large real Tolaria vaults, conflict cases, packfiles, and mobile lifecycle interruptions. It is attractive because it is JS and OTA-friendly, but production sync quality matters more than implementation convenience.

### AutoGit On Mobile

AutoGit is realistic, but mobile must account for app suspension and unreliable background execution.

Represent sync as a durable state machine:

```text
idle
  -> dirty
  -> writing
  -> committing
  -> fetching
  -> integrating
  -> pushing
  -> synced

error branches:
  -> offline
  -> auth_required
  -> conflict
  -> native_error
```

Rules:

- Every transition is persisted.
- The app can resume after suspension/crash.
- No invisible destructive conflict resolution.
- Foreground sync comes first.
- Background sync is later and opportunistic.
- Never block editing solely because sync is offline.
- The UI should clearly distinguish "saved locally" from "synced remotely".

### Conflict Strategy

Start with conservative conflict handling:

- Detect conflict.
- Stop AutoGit for that vault.
- Preserve local and remote content.
- Show a conflict state in the note list/status area.
- Provide a simple conflict resolution UI later.

Do not attempt complex automatic merge behavior before core sync reliability is proven.

## Auth Strategy

### Default: GitHub OAuth Over HTTPS

Use a GitHub OAuth App for the first mobile GitHub auth implementation.

Rationale:

- It is the fastest path to a usable mobile login without introducing a backend/token broker.
- It fits the simulator-first prototype phase.
- It can authenticate Git-over-HTTPS using a user token supplied through credential callbacks.
- It leaves room to migrate to a GitHub App later if Tolaria needs selected-repository installation permissions and short-lived installation tokens.

The default happy path should be:

1. User taps "Connect GitHub".
2. App opens system browser / native auth session with PKCE.
3. User authorizes Tolaria.
4. User creates or selects a vault repository.
5. App stores credentials in Keychain / Android Keystore.
6. Git remote uses HTTPS token auth.

GitHub App remains the preferred long-term hardening path if Tolaria needs a stronger trust story, selected repository access, or short-lived installation tokens. It likely requires a small backend/token broker because the GitHub App private key must not ship in the mobile app.

Fallbacks:

- Fine-grained PAT for advanced users.

### Arbitrary HTTPS Remotes

Support after GitHub:

1. User enters remote URL.
2. User chooses HTTPS token/password auth.
3. User enters username and token/app password.
4. App tests clone/fetch/push.
5. App stores credentials securely.

This covers GitLab, Gitea, Forgejo, Bitbucket, GitHub Enterprise, and other providers.

### SSH As Advanced Mode

SSH should not be the default onboarding path.

Eventually support:

- Generate SSH key in app.
- Display/copy public key.
- User adds public key to provider.
- Store private key securely.
- Optional passphrase.
- Host key verification strategy.

SSH has worse mobile UX and more support burden than HTTPS token auth. It is still important for power users and arbitrary remotes, but it should follow after HTTPS sync is solid.

### Credential Security

Rules:

- Store tokens and private keys only in Keychain / Android Keystore.
- Do not persist credentials inside Git remote URLs.
- Use credential callbacks at operation time.
- Redact credentials from logs, analytics, crash reports, and support bundles.
- Make credential removal obvious.
- Design for token expiration and revocation.

## OTA And Runtime Versioning

EAS Update requires a compatible runtime version between build and update. Treat runtime versioning as a release engineering concern from day one.

Suggested channels:

```text
production
preview
dogfood
```

Suggested rule:

- JS-only changes can ship to an existing runtime.
- Native module/API changes require a new runtime version and store/TestFlight build.
- The app should show build/runtime/update channel in a diagnostics screen.
- QA must verify that old runtimes do not receive incompatible updates.

Do not ship a native bridge change without updating the bridge version and runtime version.

## Analytics

Mobile should use the same product analytics discipline as desktop.

Track adoption and failure points without collecting note content or PII.

Likely event areas:

- Mobile app first launch.
- Vault created/imported/cloned.
- GitHub auth started/succeeded/failed.
- Sync state transitions and failure categories.
- Note opened/created/edited.
- Sidebar/view/type navigation.
- Properties opened/edited.
- OTA update applied.
- Conflict detected/resolved.

Never include note body, filenames, note titles, remote URLs, tokens, or raw error messages that could contain user data.

## Testing And Quality Gates

Mobile should have its own quality gates and a small cross-platform shared package test suite.

The mobile app should follow the same spirit as desktop Tolaria: quality gates are part of the product architecture, not a release-week cleanup activity. The exact thresholds can ratchet as the project matures, but the initial strategy should be explicit before implementation starts.

### Quality Principles

- Shared domain code should be boring, pure, and heavily tested.
- Native bridges should be narrow, versioned, and tested through fixtures.
- UI tests should protect behavior and core flows, not snapshots of visual styling.
- Coverage targets should be meaningful, not gamed. Untested sync/auth/storage code is unacceptable even if global coverage looks high.
- Mobile starts from scratch, so new shared/mobile code should be held to a greenfield standard from the first commit: CodeScene `10.0/10.0` for scorable code and zero Codacy/security findings.
- Quality gates should ratchet only upward. Do not lower thresholds or accept "temporary" debt to land work.
- Security findings involving credentials, tokens, vault data leakage, dependency vulnerabilities, or remote code/update integrity block release.

### Coverage Targets

Initial targets:

| Area | Target | Notes |
|---|---:|---|
| `packages/markdown` | 90%+ lines/branches | Markdown/frontmatter/wikilink round trips are core data safety |
| `packages/core` | 90%+ lines/branches | Note list, filters, relationships, type models |
| `packages/sync-contracts` | 95%+ lines/branches | State machines and conflict/auth/offline classification |
| Mobile app UI | 75%+ initially, ratchet upward | Use behavior tests and critical-flow tests rather than shallow snapshots |
| Native Git/storage/auth bridge | 85%+ where measurable | Combine unit tests, fixture repos, and simulator/device integration tests |

The long-term goal should be 90%+ coverage for shared logic and high-risk mobile infrastructure. Do not require 90% across all UI code on day one if it creates brittle tests, but do require tests for every user-visible workflow that protects data integrity.

### CodeScene Gates

Use CodeScene for the mobile codebase as soon as shared packages and mobile app code exist.

Expected policy:

- Keep the desktop CodeScene ratchet behavior.
- Treat mobile and newly extracted shared packages as greenfield code with a `10.0` starting bar, not as legacy code that can be cleaned up later.
- Track mobile/shared-package hotspots separately enough that desktop health does not hide mobile risk.
- Every touched scorable file should leave with a higher file-level score, unless it already starts at `10.0`, in which case it must remain `10.0`.
- New scorable shared/mobile files must score `10.0` before merge/commit.
- If CodeScene does not score a file type or reports no scorable code, the file must still have zero actionable findings/warnings from the available linters/security tools.
- Mobile Hotspot and Average thresholds should start at `10.0` once a mobile baseline is established. If CodeScene cannot produce a meaningful project-wide score during the earliest scaffolding commits, use file-level `10.0` checks until project-level gates become available.
- Any exception to `10.0` must be documented as a time-boxed ADR or roadmap risk with an owner, reason, and removal condition. Exceptions should be rare and should not apply to sync, auth, storage, editor adapter, or parsing code.

Mobile-specific hotspots to watch early:

- Sync state machine.
- Git bridge.
- Auth/session storage.
- Editor adapter.
- Note scanning/indexing.
- Navigation/surface state.

### Security Gates

Use security tooling as a second line of defense next to CodeScene. CodeScene is primarily a maintainability/code-health signal; it is not enough for credential-heavy mobile Git/auth work.

The security target is zero open Codacy/security issues from the start. Do not create a "known issues" backlog for new mobile code. If a scanner finding is a false positive, suppress it only with a narrow, documented justification in the scanner configuration or adjacent security notes.

Recommended security stack:

- Codacy or equivalent for SAST, dependency vulnerability scanning, secret detection, and coverage visibility.
- GitHub secret scanning / push protection if available.
- Dependency automation for JavaScript, Rust, iOS, and Android dependencies.
- `cargo audit` / `cargo deny` for Rust native modules if Rust is used.
- `pnpm audit` or a stronger dependency scanner in CI for JS dependencies.
- Static checks for accidental token logging and credential-in-URL persistence.

Zero-issue policy:

- Zero high/critical dependency vulnerabilities.
- Zero secret-detection findings.
- Zero SAST findings that touch auth, storage, native bridge boundaries, Git remotes, OTA update integrity, analytics redaction, or file path validation.
- Zero unreviewed medium/low findings. Medium/low findings must be fixed or explicitly documented as false positives before release.
- Zero duplicated code findings in greenfield shared/mobile code unless the duplication is a deliberate, documented test fixture.

Release-blocking security classes:

- Hardcoded tokens, private keys, OAuth secrets, or test credentials.
- Credentials persisted in Git remote URLs.
- Tokens, note titles, filenames, note body content, or remote URLs sent to analytics/crash reports.
- OTA update/runtime mismatch that could ship incompatible JS to a native runtime.
- Native bridge methods that can read/write outside the app-managed vault boundary.
- Auth flows that use embedded WebViews instead of system browser/native auth sessions.
- Missing redaction for Git/auth errors.

Codacy is a reasonable candidate because its current product/docs cover static analysis, code duplication/complexity, secret detection, dependency vulnerability scanning, SAST, and related security-risk workflows. It should complement, not replace, local CI gates. The target for Codacy or any equivalent scanner is zero open issues on new mobile/shared code.

### CI Gate Shape

The mobile CI should eventually include:

```bash
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm -r test:coverage
pnpm --filter @tolaria/mobile expo-doctor
```

Native bridge gates, once native code exists:

```bash
cargo test
cargo clippy -- -D warnings
cargo llvm-cov --fail-under-lines <threshold>
cargo audit
```

The exact commands will depend on the final native module layout, but the policy is stable: no release should rely only on manual simulator testing.

### Shared Packages

Run on every relevant change:

- Typecheck.
- Unit tests for markdown/frontmatter/wikilinks.
- Unit tests for note list models.
- Unit tests for sync state machine.
- Property-based tests where useful for frontmatter/wikilink parsing.

### Mobile App

Use:

- React Native Testing Library for component behavior.
- Unit tests for layout classification.
- Integration tests for repository interfaces using fake storage.
- Device/simulator tests for critical flows.
- Manual iPad QA until automated coverage is stable.

Critical flows:

- Open app.
- Open demo/local vault.
- Navigate sidebar -> note list -> editor -> properties.
- Create note.
- Edit note.
- Save local changes.
- Search.
- Sync success.
- Offline edit then later sync.
- Auth expired.
- Conflict detected.

### Performance Budgets

Define measurable budgets early:

| Area | Target |
|---|---|
| App cold start to usable shell | Measured on target iPad before beta |
| Note list scroll | No visible dropped-frame jank with large demo vault |
| Open note | Feels instant for common note sizes |
| Typing latency | No visible lag in v1 editor |
| Sync | Non-blocking UI; progress visible |
| OTA update apply | Clear state, no data loss |

Exact numeric budgets should be set after the first real prototype on target devices.

## Roadmap

The roadmap is intentionally long. Each phase has "done" criteria so future agents can judge whether they are making progress.

### Phase 0: Decision And Setup

Objective: turn this plan into accepted architecture before code starts.

Tasks:

- Keep ADR-0109 as the active production mobile strategy decision.
- Confirm the initial mobile target devices and minimum OS versions.
- Record GitHub OAuth App as the first auth path, with GitHub App as a later hardening option.
- Confirm initial quality gates: coverage targets, CodeScene `10.0` baseline strategy, and zero-issue Codacy/security scanner choice.
- Decide whether the mobile app starts under `apps/mobile` while desktop remains at root.
- Decide initial app name/bundle identifier for development builds.

Done criteria:

- ADR exists and links to this roadmap.
- Initial implementation target is unambiguous.
- No conflict remains between old Tauri iOS prototype strategy and new mobile roadmap.

### Phase 1: Monorepo Foundation

Objective: prepare sharing without disrupting desktop.

Tasks:

- Add or refine `pnpm-workspace.yaml`.
- Create `packages/markdown`.
- Move low-risk markdown/frontmatter/wikilink helpers from desktop into `packages/markdown`.
- Create `packages/core`.
- Move or mirror `VaultEntry` and note list model primitives into `packages/core`.
- Add coverage thresholds for extracted shared packages.
- Add CodeScene/scanner configuration for shared package paths with `10.0` file-level expectations and zero open scanner findings.
- Keep desktop tests passing after each extraction.
- Avoid broad desktop layout refactors.

Done criteria:

- Desktop imports at least one shared package.
- Shared packages have independent typecheck/test scripts.
- Desktop behavior is unchanged.
- No mobile app code depends on desktop UI modules.

Good signal:

- A future mobile screen can build a note list model without importing from `src/components`.

### Phase 2: Mobile App Bootstrap

Objective: create an iPad-first Expo app with fixture data and no real storage yet.

Tasks:

- Create `apps/mobile`.
- Configure Expo, TypeScript, linting, tests, EAS project scaffolding.
- Configure initial mobile CI commands and coverage reporting.
- Configure mobile CodeScene/Codacy gates so greenfield mobile code starts at `10.0` and zero scanner issues.
- Add development build setup if custom native modules are anticipated early.
- Import shared `packages/core`, `packages/markdown`, and `packages/design-tokens`.
- Implement fixture vault loading from bundled JSON/markdown.
- Build the iPad shell with Sidebar, Note List, Editor, and Properties surfaces.
- Implement layout classification for iPad widths.
- Implement basic iPhone shell behavior behind the same surface model, even if rough.

Done criteria:

- App runs on iPad simulator.
- App can show fixture notes in iPad split layout.
- App can show the same fixture notes in iPhone stacked/horizontal layout.
- No real filesystem/Git/auth dependency exists yet.

Good signal:

- UI already resembles the high-fidelity mockup but uses real React Native components and Phosphor/native icon mapping.

### Phase 3: App-Managed Vault Storage

Objective: read and write real markdown vaults in mobile app storage.

Tasks:

- Define `VaultRepository` interface in `packages/vault`.
- Implement mobile app-storage repository.
- Import/create a local starter vault inside app storage.
- Scan markdown files into `VaultEntry` objects.
- Read note content.
- Write note content.
- Delete/move notes if needed for basic flows.
- Add local saved state for active vault and last selection.

Done criteria:

- App can create/open an app-managed vault.
- App can list notes from actual markdown files.
- App can open and save a note locally.
- App restart preserves the vault and edits.

Good signal:

- Local save is robust before Git sync exists.

### Phase 4: Editor V1

Objective: make iPad useful for real note editing without waiting for full desktop editor parity.

Tasks:

- Implement read-only rendered note body.
- Implement TenTap spike inside the native editor surface.
- Add `MobileEditorAdapter` so the shell does not depend directly on TenTap APIs.
- Implement Markdown edit mode through TenTap if it passes the spike.
- Preserve H1-as-title behavior.
- Support frontmatter round-trip.
- Support wikilink display and simple insertion/autocomplete.
- Support basic formatting commands.
- Support external keyboard basics on iPad.
- Add properties editing for common fields: type, date, status, url, icon, relationships.
- Keep native Markdown fallback documented if TenTap fails.

Done criteria:

- User can create, edit, save, close, reopen, and see the same markdown.
- H1/title behavior matches desktop conventions.
- Properties edits update frontmatter correctly.
- Wikilinks remain markdown-durable.
- TenTap quality gates are recorded as passed, or the native Markdown fallback is chosen explicitly.

Good signal:

- The editor feels like a good iPad writing surface even if it is not yet a full desktop BlockNote peer.

### Phase 5: Git Engine Prototype

Objective: prove mobile Git operations on app-managed vaults.

Tasks:

- Create native Git module spike.
- Prefer Rust + `git2`/`libgit2` unless blocked.
- Implement local repo init.
- Implement status.
- Implement commit.
- Implement fetch.
- Implement pull/merge or equivalent integration.
- Implement push.
- Expose a narrow JS API.
- Create test fixtures for small Git repos.

Done criteria:

- Mobile app can initialize a Git repo inside app storage.
- Mobile app can commit local edits.
- Mobile app can push to a test remote using injected credentials.
- Errors are typed and do not leak secrets.

Good signal:

- Git module can be versioned independently from UI code.

### Phase 6: Auth V1

Objective: authenticate without terminal access.

Tasks:

- Implement GitHub OAuth App login flow using system browser/native auth session and PKCE.
- Store credentials securely.
- Let user create/select a Tolaria repo.
- Configure remote URL without embedding credentials.
- Add credential callback path to Git operations.
- Implement logout/revoke/remove local credentials.
- Add HTTPS token flow for arbitrary remotes if GitHub path is stable.

Done criteria:

- User can connect GitHub.
- User can clone or create a vault repo.
- User can push/pull through HTTPS token auth.
- Credentials survive app restart.
- Credentials can be removed.

Good signal:

- No terminal, SSH agent, or external Git client is required.

### Phase 7: AutoGit Mobile

Objective: bring Tolaria's automatic local commits and sync model to mobile.

Tasks:

- Implement durable sync state machine.
- Implement local auto-commit after edits.
- Implement foreground fetch/integrate/push.
- Implement offline queue.
- Implement auth-required state.
- Implement basic conflict detection.
- Add status UI for local saved, committed, syncing, synced, offline, conflict.
- Add analytics for sync state transitions.

Done criteria:

- User can edit offline and continue working.
- User can later sync successfully.
- App suspension does not corrupt sync state.
- Conflicts stop sync and preserve data.

Good signal:

- Mobile sync feels boring and predictable.

### Phase 8: iPad Beta Quality

Objective: make iPad good enough for sustained personal use.

Tasks:

- Polish adaptive iPad layouts.
- Improve keyboard shortcuts.
- Improve trackpad/pointer states.
- Add search.
- Add saved views/types/folders parity where needed.
- Add onboarding for app-managed Git vaults.
- Add diagnostics screen for build/runtime/update/sync state.
- Add TestFlight/EAS preview distribution.
- Add crash/error reporting if not already present.

Done criteria:

- iPad can be used for real Tolaria note reading/editing/syncing.
- OTA preview updates work.
- There is a repeatable QA checklist.
- Known unsupported desktop features are documented inside the app or release notes.

Good signal:

- The app is useful even before iPhone-specific polish.

### Phase 9: iPhone Adaptation

Objective: turn the same app into a polished iPhone experience.

Tasks:

- Implement compact horizontal surface navigation.
- Tune note list density.
- Tune editor chrome.
- Tune properties full-height surface.
- Add gesture/back behavior QA.
- Add one-handed action placement where appropriate.
- Add iPhone-specific onboarding copy.
- Verify small-screen text fitting and hit targets.

Done criteria:

- iPhone app opens to Note List.
- Sidebar, Editor, and Properties are reachable through visible controls and gestures.
- Editing and sync flows work on iPhone.
- Android future path is not worsened by iPhone-specific choices.

Good signal:

- The iPhone app feels intentionally designed, not like compressed desktop/iPad UI.

### Phase 10: Advanced Mobile Features

Objective: close parity gaps after core mobile is proven.

Possible work:

- Conflict resolution UI.
- Richer editor commands.
- Attachment/image capture and insertion.
- Share extension.
- Widgets/quick capture.
- Background sync if reliable enough.
- Push notifications only if a real product need emerges.
- Better Git provider support.
- SSH advanced auth.
- Export/import vault.

Done criteria:

- Each feature has clear user value and test coverage.
- Native additions are batched into intentional runtime releases.

### Phase 11: Android Feasibility And Port

Objective: make Android real without derailing iOS.

Tasks:

- Run app on Android emulator.
- Audit native modules for Android support.
- Implement Android storage backend for app-managed vaults.
- Implement Android secure credential storage.
- Validate Git engine on Android.
- Adjust navigation for Android back behavior.
- Build Android EAS preview.
- Run large-vault scroll/editor/sync QA.

Done criteria:

- Android can open, edit, commit, and sync a vault.
- Android-specific UX issues are documented and triaged.
- Play Store release path is known.

Good signal:

- Android work mostly affects platform adapters, not shared domain code.

## Autonomous Implementation Loop

When a future agent starts mobile work:

1. Read this document.
2. Read the latest relevant ADRs, especially the ADR that supersedes ADR-0005.
3. Check the current desktop repo state and avoid unrelated desktop churn.
4. Identify the current roadmap phase.
5. Define the smallest vertical slice that advances that phase.
6. Add or update tests for shared packages first when extracting logic.
7. Keep mobile platform I/O behind interfaces.
8. Update this document when the roadmap changes materially.
9. Add ADRs for new platform/runtime/storage/auth decisions.
10. Verify with simulator/device screenshots for UI work.

Autonomous progress should be judged by done criteria, not by how much code was written.

### Agent Work Loop

When explicitly unleashed on mobile work, the agent should keep running this loop until the user stops or redirects it:

1. **Orient**
   - Confirm the current roadmap phase.
   - Inspect current git status and recent docs/ADRs.
   - Check whether any newer user instruction supersedes this document.
   - Identify the smallest vertical slice that moves the active phase forward.

2. **Protect Desktop**
   - Avoid broad desktop UI churn.
   - Extract shared logic incrementally.
   - Keep desktop tests passing after every shared-package extraction.
   - Do not move desktop into `apps/desktop` until there is a clear payoff and the shared package structure is stable.

3. **Design The Slice**
   - Prefer vertical slices over broad scaffolding.
   - Keep shared packages pure and app/platform I/O behind interfaces.
   - Add or update an ADR before introducing a new runtime, native dependency, storage strategy, auth strategy, or cross-cutting pattern.
   - If a decision is reversible and low-risk, make a conservative choice and document it in this roadmap rather than stopping.

4. **Test First Where Practical**
   - For shared logic, write failing tests before extraction or behavior changes.
   - For mobile UI, protect behavior and critical flows rather than visual snapshots.
   - For native bridge work, build fixture-based tests before real provider integrations.

5. **Implement With Greenfield Gates**
   - New mobile/shared scorable code must reach CodeScene `10.0`.
   - Codacy or equivalent scanner findings must be zero for new mobile/shared code.
   - No `as any`, broad lint disables, credential logging, or credential-in-URL shortcuts.
   - Keep native bridge APIs narrow, versioned, and redaction-safe.

6. **Verify**
   - Run the smallest relevant test/typecheck/coverage commands first.
   - Run broader suites before considering a phase slice done.
   - For UI work, verify on simulator/device and capture screenshots.
   - For editor work, run the TenTap quality gates before treating the editor path as accepted.
   - For sync/auth/storage work, verify offline/error/conflict paths, not only success paths.

7. **Document**
   - Update this roadmap when the plan changes.
   - Update ADRs when decisions become architectural.
   - Record quality-gate exceptions only as time-boxed ADRs or explicit roadmap risks. Do not create silent debt.

8. **Commit And Continue**
   - Commit coherent slices with normal hooks.
   - Do not bypass hooks or lower thresholds.
   - Continue to the next smallest slice in the current phase.

Stop and ask the user only when:

- A product decision changes user-visible behavior materially.
- A security/auth/storage tradeoff has no clearly conservative default.
- A required external account/service decision cannot be made from repo context.
- Continuing would require lowering quality gates or accepting a known data-loss risk.

## Risk Register

| Risk | Why it matters | Mitigation |
|---|---|---|
| Editor quality | A bad editor makes the app unusable | Build native Markdown v1 early; test on real iPad keyboard |
| Mobile Git complexity | Sync is core to Tolaria trust | Use durable state machine; start with foreground sync; prefer libgit2 |
| Auth complexity | Terminal flows are unavailable | GitHub OAuth default; HTTPS tokens next; SSH later |
| OTA/native mismatch | Bad updates can break users | Runtime version discipline; diagnostics screen; preview channel |
| Desktop disruption | Desktop work remains active | Extract shared packages gradually; avoid broad moves early |
| WebView temptation | Reuse could hurt native feel | Share logic, not UI; isolate editor WebView only if needed |
| Android assumptions | iOS-first can paint Android into a corner | Platform interfaces; avoid iCloud-only storage model |
| Large vault performance | Tolaria users may have thousands of notes | Virtualized lists; performance tests with demo large vaults |
| Credential leakage | Git/auth errors can expose secrets | Redaction layer; no credentials in remote URLs/logs/analytics |

## Open Decisions

These should be resolved before or during the relevant phases:

- Minimum iPadOS/iOS version.
- Whether the Git native module is Rust-first or direct platform bindings.
- Which React Native list implementation to standardize on.
- Which navigation library/pattern best supports iPad split layouts and iPhone gestures.
- Whether TenTap passes the editor quality gates on real iPad hardware.
- If TenTap passes, how much custom Tiptap Markdown/wikilink extension work is needed for Tolaria.
- How much of desktop AI integration, if any, belongs on mobile.
- Whether app-managed vaults are backed up to device cloud backup before Git sync is configured.

## References

- Expo EAS Update: <https://docs.expo.dev/eas-update/how-it-works/>
- Expo EAS Build: <https://docs.expo.dev/build/introduction/>
- Expo AuthSession: <https://docs.expo.dev/versions/latest/sdk/auth-session/>
- React Native New Architecture: <https://reactnative.dev/architecture/landing-page>
- React Native testing overview: <https://reactnative.dev/docs/testing-overview>
- TenTap React Native editor: <https://10play.github.io/10tap-editor/docs/intro>
- Tiptap Markdown: <https://tiptap.dev/docs/editor/markdown>
- BlockNote format interoperability: <https://www.blocknotejs.org/docs/foundations/supported-formats>
- Codacy supported languages/tools: <https://docs.codacy.com/getting-started/supported-languages-and-tools/>
- Codacy security and risk management: <https://docs.codacy.com/organizations/managing-security-and-risk/>
- Tauri mobile plugins: <https://v2.tauri.app/develop/plugins/develop-mobile/>
- libgit2 authentication: <https://libgit2.org/docs/guides/authentication/>
- git2-rs: <https://github.com/rust-lang/git2-rs>
- isomorphic-git auth: <https://isomorphic-git.org/docs/en/onAuth>
- Apple App Store Review Guidelines: <https://developer.apple.com/app-store/review/guidelines/>
- OAuth 2.0 for Native Apps (RFC 8252): <https://www.rfc-editor.org/rfc/rfc8252>
