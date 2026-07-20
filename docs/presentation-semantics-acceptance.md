# Presentation Semantics Acceptance

Date: 2026-07-18

Scope: frontend-only acceptance/remediation for the Presentation Semantics V2 adapter. Backend was inspected but not modified.

## Git State

- Frontend repo: dirty worktree from the current presentation-semantics implementation and acceptance pass.
- Backend repo `D:\02_PROJECTS\5TOT\sv5tot-hackaithon-backend`: `git status --short` clean, `git diff --stat` empty.
- `src/routeTree.gen.ts`: no diff.
- `git diff --check`: passed; only CRLF normalization warnings from Git.
- Requested setup doc `docs/presentation-semantics-setup.md`: missing in this frontend repo at the time of acceptance.

## Flag And Environment

- Rollout flag remains in place: `VITE_PRESENTATION_SEMANTICS_V2`.
- Repository default remains rollback-safe: `.env.example` keeps `VITE_PRESENTATION_SEMANTICS_V2=false`.
- Acceptance browser run used V2 enabled through process env, not by changing the production default.
- Frontend dev server: `http://localhost:5173`.
- Backend API: `http://localhost:8080`.
- Browser runner: Playwright Chromium.

## Remediation Completed

- P0 evidence-count completion wording fixed in `SubmitConfirmationModal`: evidence count alone now renders as waiting/verification copy, not success/completion copy.
- P1 raw source fallback fixed in evidence workspace/detail views by routing unknown source enums through `getSourcePresentation`.
- P1 AI confidence-style labels removed from `EvidenceCardPanel` field rows; SmartReader suggestions remain framed as support text.
- Test-only Playwright framework added for acceptance route/responsive smoke coverage.
- Build dependency issue fixed by adding npm `overrides.nf3=0.3.22`, aligning npm with the existing pnpm override and `@vercel/nft@1.10.2`.

## Browser Acceptance

Command:

```powershell
PLAYWRIGHT_BASE_URL=http://localhost:5173 VITE_API_BASE_URL=http://localhost:8080 npx playwright test tests/presentation-semantics-acceptance.spec.ts --project=chromium
```

Result: passed, 7/7 tests.

Covered routes:

- Student: `/app`, `/app/application`, `/app/feedback`, `/app/assistant`, `/app/wizard`, `/app/ai-precheck`, `/app/cascade`, `/app/evidence`, `/app/upload`, `/app/chatbot`.
- Officer: `/app/queue`.
- Manager: `/app/manager`, `/app/analytics`.
- Committee: `/app/resolution`.
- Class representative: `/app/collective`.
- Admin: `/app/admin/workspaces`.

No serious console/page errors were observed in the final run. The final Playwright status file recorded `status: passed` and `failedTests: []`. No final-run screenshot or trace artifact was produced because no test failed.

## Responsive Check

Route: `/app/application`.

Viewports passed with document horizontal overflow <= 1 px:

- 1280x720
- 1440x900
- 1920x1080
- 375x667
- 390x844
- 430x932

## Unit, Lint, Build

Focused presentation tests:

```powershell
npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts src/features/application/components/__tests__/submit-confirmation-modal.test.ts
```

Result: passed, 23/23 tests.

ESLint:

```powershell
npx eslint src
```

Result: passed with 11 pre-existing warnings in unrelated/shared files.

Playwright config/spec lint:

```powershell
npx eslint playwright.config.ts tests/presentation-semantics-acceptance.spec.ts
```

Result: passed.

Production builds:

```powershell
npm run build
$env:VITE_PRESENTATION_SEMANTICS_V2='true'; npm run build
```

Result: both passed.

## Static Scans

Raw/status scan:

```powershell
rg -n "Đủ dữ liệu cơ bản|acceptedSources\.join|sourceTypeCopy\[[^\]]+\] \?\?|\?\? evidence\.sourceType|confidenceLabel|Chắc chắn cao|Chưa chắc chắn|wait_for_confirmation|0/4" src/features/application src/features/evidence src/routes
```

Disposition:

- `wait_for_confirmation` remains only as the internal action enum/test fixture and selector input.
- `sourceTypeCopy[...] ?? getSourcePresentation(...)` remains intentionally as the safe fallback path.
- `acceptedSources.join(", ")` remains only in the V2-disabled legacy branch for rollback.
- `Đủ dữ liệu cơ bản` remains only in the legacy application workspace where it is tied to precheck success, not evidence-count-only completion.
- `0/4` match was a CSS color false positive.
- No `confidenceLabel`, `Chắc chắn cao`, or `Chưa chắc chắn` matches remained in the scanned application/evidence surfaces.

Mojibake scan over touched files for `(Ã|Â|�)`: passed.

## Five Criteria And Interaction Coverage

- Criteria state precedence is covered by focused unit tests for final pass/fail, staff review, supplement, resolution, completion, and missing evidence.
- Requirement group/source/action presentation is covered by unit tests and static scans.
- Browser coverage confirms V2 route mounting/no-crash and responsive overflow across the main student route and role entry points.
- Deep mutation interaction cases such as stale response payloads, double-submit prevention, mutation error recovery, and post-submit refetch are not fully automated in browser in this pass. They remain a strict rollout gap.

## P0/P1/P2 Status

- P0 found in this pass: evidence-count-only submit summary could imply completion. Fixed and unit-tested.
- P1 found in this pass: raw source fallback and confidence-style SmartReader labels. Fixed and statically verified.
- P2 remaining: broader interaction regression automation and visual polish can be handled separately without changing backend contracts.

## Rollout Decision

Default rollout is not enabled in repo. Keep `VITE_PRESENTATION_SEMANTICS_V2=false` as the default until the interaction regression matrix is automated or manually signed off.

Manual opt-in for QA:

```powershell
$env:VITE_PRESENTATION_SEMANTICS_V2='true'
npm run dev
```

Rollback:

```powershell
$env:VITE_PRESENTATION_SEMANTICS_V2='false'
```

or remove the env override.
