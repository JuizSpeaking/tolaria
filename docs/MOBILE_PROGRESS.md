# Mobile Progress

Last updated: 2026-05-03

This file is the resumable working log for Tolaria mobile. The strategy and roadmap live in [MOBILE_STRATEGY.md](./MOBILE_STRATEGY.md); this file records the current execution state.

## Current State

- Branch: `codex/mobile`
- Active phase: Phase 1 - Shared Foundation
- Active slice: Extract shared Markdown utilities for desktop/mobile reuse
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

## Next Action

Continue Phase 1 with the next low-risk shared extraction:

1. Identify pure markdown/frontmatter/wikilink utilities suitable for `packages/markdown`.
2. Capture CodeScene scores before editing any existing scorable files.
3. Add tests or preserve existing tests around extracted behavior.
4. Create the package with CodeScene `10.0` and zero scanner issues as the target.
5. Prefer `noteTitle` next only after splitting or moving the small frontmatter/wikilink dependencies it needs.

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

## Risks / Watch Items

- Editor quality remains the largest mobile risk; TenTap must pass the quality gates before becoming accepted.
- Shared package extraction must not destabilize active desktop work.
- Desktop alpha release currently triggers on every push to `main`; this branch is safe, but release path filters should be added before mobile work merges to `main`.
- Codacy analyzes committed/pushed repository state; local edits still need local lint/test/CodeScene discipline before remote checks exist.
