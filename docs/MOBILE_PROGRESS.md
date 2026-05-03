# Mobile Progress

Last updated: 2026-05-03

This file is the resumable working log for Tolaria mobile. The strategy and roadmap live in [MOBILE_STRATEGY.md](./MOBILE_STRATEGY.md); this file records the current execution state.

## Current State

- Branch: `codex/mobile`
- Active phase: Phase 2 - Mobile Shell
- Active slice: Scaffold iPad-first Expo shell with fixture data
- Push policy: commit locally; do not push unless explicitly requested
- Validation target: iPad/iOS simulator first

## Completed

- Created high-fidelity iPhone mobile mockups in `design/mobile-mockups/`.
- Documented the production mobile strategy in `docs/MOBILE_STRATEGY.md`.
- Installed and authenticated Codacy MCP for this Codex environment.
- Confirmed Codacy MCP can access `refactoringhq/tolaria`.
- Recorded GitHub OAuth App as the first mobile GitHub auth path.
- Created [ADR-0109](./adr/0109-universal-mobile-app-with-expo-react-native.md) for Expo React Native production mobile.
- Superseded [ADR-0005](./adr/0005-tauri-ios-for-ipad.md), the earlier Tauri iOS prototype ADR.
- Created `@tolaria/markdown` as the first shared workspace package.
- Moved `compactMarkdown` into `packages/markdown` and kept the existing desktop import path as a compatibility export.
- Added package-local Vitest and TypeScript scripts for the shared Markdown package.
- Added `scripts/run-tests.mjs` so `pnpm test` runs desktop and shared-package tests, while targeted test arguments remain targeted.
- Updated the pre-commit branch guard to allow local commits on `codex/mobile` for this isolated mobile worktree.
- Split `src/utils/wikilinks.ts` into shared `@tolaria/markdown` modules for frontmatter, wikilink block transforms, outgoing links, backlink context, snippets, and word counts.
- Moved note-title derivation helpers into `@tolaria/markdown`, leaving the existing desktop import path as a compatibility export.
- Added `apps/mobile` as an Expo React Native workspace package.
- Added root mobile scripts: `mobile:start`, `mobile:ios`, `mobile:test`, and `mobile:typecheck`.
- Configured Expo for a universal light-mode app with a development bundle identifier (`com.tolaria.mobile.dev`) and iPad support enabled.
- Added the first iPad-first/phone-ready shell using fixture notes, shared Markdown title/snippet helpers, Phosphor React Native icons, and responsive panels for sidebar, note list, editor, and properties.
- Split mobile styles into small panel-specific StyleSheet modules so new mobile code starts at CodeScene `10.0`.
- Pinned Expo runtime dependencies to the versions expected by Expo 55 after the initial generated versions failed iOS bundle export (`react-native@0.83.6`, `react@19.2.0`, matching safe-area/svg versions).

## Next Action

Continue Phase 2 with the next mobile shell slice:

1. Resolve the local CoreSimulator hang so `pnpm mobile:ios` can launch the app in an iPad simulator.
2. Add a navigation-state test around the compact panel flow before introducing gestures.
3. Add native gesture support for phone/tablet panel transitions.
4. Start the storage/auth abstraction skeleton only after the shell has a reliable simulator loop.

## Verification Log

- `tool_search` exposed Codacy MCP tools after Codex restart.
- `codacy_get_repository_with_analysis` succeeded for `refactoringhq/tolaria`.
- Current branch verified as `codex/mobile`.
- CodeScene before extraction: `src/utils/compact-markdown.ts` scored `10`.
- CodeScene after extraction: `packages/markdown/src/compactMarkdown.ts` scored `10`; `packages/markdown/src/compactMarkdown.test.ts` scored `10`; tiny export/config files returned no scorable code and no findings.
- `pnpm --filter @tolaria/markdown test` passed: 29 tests.
- `pnpm --filter @tolaria/markdown typecheck` passed.
- `pnpm test -- src/utils/compact-markdown.test.ts` passed and ran only that desktop test file: 29 tests.
- `pnpm test` passed and ran the full desktop suite plus package tests: 309 desktop test files / 3639 desktop tests, then 29 package tests.
- `pnpm lint` passed with one pre-existing warning in `src/components/tolariaBlockNoteSideMenu.tsx`.
- `npx tsc --noEmit` passed.
- `pnpm build` passed.
- CodeScene before wikilink extraction: `src/utils/wikilinks.ts` scored `9.09`.
- CodeScene after wikilink extraction: new shared wikilink/frontmatter/content files scored `10`; small export surfaces returned no scorable code and no findings.
- `pnpm --filter @tolaria/markdown test` passed after wikilink extraction: 40 tests.
- `pnpm test -- src/utils/wikilinks.test.ts src/utils/noteTitle.test.ts` passed: 91 desktop tests.
- `pnpm --filter @tolaria/markdown typecheck` passed after wikilink extraction.
- `pnpm lint`, `npx tsc --noEmit`, and `pnpm build` passed after wikilink extraction.
- CodeScene before note-title extraction: `src/utils/noteTitle.ts` scored `9.68`.
- CodeScene after note-title extraction: `packages/markdown/src/noteTitle.ts` and `packages/markdown/src/noteTitle.test.ts` scored `10`; the desktop compatibility export returned no scorable code and no findings.
- `pnpm --filter @tolaria/markdown test` passed after note-title extraction: 56 tests.
- `pnpm test -- src/utils/noteTitle.test.ts` passed: 14 desktop tests.
- `pnpm --filter @tolaria/markdown typecheck` passed after note-title extraction.
- `pnpm --filter @tolaria/mobile typecheck` passed.
- `pnpm --filter @tolaria/mobile test` passed: 1 file / 2 tests.
- `pnpm --filter @tolaria/mobile exec expo install --check` passed after pinning Expo-compatible dependency versions.
- `pnpm --filter @tolaria/mobile exec expo config --type public` passed and shows iOS bundle identifier `com.tolaria.mobile.dev`, Android package `com.tolaria.mobile.dev`, and `supportsTablet: true`.
- `pnpm --filter @tolaria/mobile exec expo export --platform ios --output-dir /tmp/tolaria-mobile-export` passed and produced the iOS bundle.
- `pnpm lint` passed with one pre-existing warning in `src/components/tolariaBlockNoteSideMenu.tsx`.
- `npx tsc --noEmit` passed.
- `pnpm test` passed after the mobile scaffold: 309 desktop test files / 3639 desktop tests plus 56 shared package tests.
- CodeScene mobile shell scores: `apps/mobile/App.tsx`, `apps/mobile/src/MobileApp.tsx`, `apps/mobile/src/NamedIcon.tsx`, `apps/mobile/src/demoData.ts`, `apps/mobile/src/demoData.test.ts`, and all scorable style modules scored `10`; tiny config/export/theme files returned no scorable code.
- CodeScene pre-commit safeguard passed for the current change set.
- Codacy MCP can read repository analysis and security items for `refactoringhq/tolaria`; local Codacy CLI analysis is currently blocked because the Codacy CLI binary is not installed in this environment.
- iOS simulator validation is blocked locally: Xcode is installed (`Xcode 26.3`), but `xcrun simctl list ...` hangs indefinitely even after opening `/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app`.

## Risks / Watch Items

- Editor quality remains the largest mobile risk; TenTap must pass the quality gates before becoming accepted.
- Shared package extraction must not destabilize active desktop work.
- Desktop alpha release currently triggers on every push to `main`; this branch is safe, but release path filters should be added before mobile work merges to `main`.
- Codacy analyzes committed/pushed repository state; local edits still need local lint/test/CodeScene discipline before remote checks exist.
