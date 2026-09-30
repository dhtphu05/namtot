# Staff Award Registry UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Data Uploader and Award Registry implementation into a production-ready Vietnamese workflow for creating, processing, reviewing, confirming, and archiving award decisions without changing the locked S1 contracts.

**Architecture:** Keep the existing TanStack Router routes, React Query hooks, API adapter, and `/api/award-decisions/*` contract. Add a feature-local presentation layer for deterministic status/grouping/copy and compose focused Award domain panels around the current shared shell, feedback, form, dialog, table, badge, and button primitives. No backend runtime change is planned unless a reproducible contract or integrity defect blocks the documented flow.

**Tech Stack:** React 19, TypeScript, TanStack Router/Query, Tailwind CSS, Radix/shadcn primitives, Playwright, Node test runner.

**Spec:** User-provided `PHASE S2 — DATA UPLOADER / AWARD REGISTRY PRODUCTION UX REDESIGN` attachment.

## Global Constraints

- Stay on `feat/staff-lane`; do not checkout another branch, merge main, rebase, reset, stash, discard user changes, or push before S2 verification.
- Preserve AwardDecision statuses exactly: `DRAFT`, `CONFIRMED`, `ARCHIVED`.
- Preserve recipient matching values exactly: `MATCHED`, `UNMATCHED`, `CONFLICT`.
- Preserve mutation actors exactly: `data_uploader`, `admin`; no City-role expansion.
- Use the existing `/api/award-decisions/*` endpoints; do not invent dashboard/history/analytics endpoints.
- Keep Award Registry separate from legacy Decision Import and Event Registry.
- Reuse the shared AppShell/Sidebar/TopBar/PageHeader/Button/Input/Select/Table/Badge/Dialog/ConfirmDialog/Loading/Error/Empty/status/file patterns.
- Keep server-authoritative processing, preview validation, correction/rematch, confirmation, archive, and unarchive behavior.
- Do not add a schema migration or new backend state.
- Desktop-first QA at 1280x720, 1366x768, 1440x900, 1600x900, 1920x1080 and zoom 90/100/110/125%.

## Review Focus

- A paginated preview must not silently mix backend validation and presentation grouping; all row groupings and labels must come from one deterministic helper.
- A valid but `UNMATCHED` roster row must remain visibly distinct from a matched row and must not be presented as a final confirmation state.
- Reloading during server processing must reconstruct the current job state and stop polling at terminal states without a fake percentage.
- Confirm, archive, and unarchive must remain explicit high-consequence actions and reflect the server response after mutation.
- Admin global creation and uploader workspace-scoped creation must keep their existing required fields and permission boundary.

### Task 1: Centralized award presentation and Home/Registry IA

**Files:**
- Create: `src/features/award-registry/presentation.ts`
- Create: `src/features/award-registry/__tests__/presentation.test.ts`
- Modify: `src/routes/app.data-uploader.tsx`
- Modify: `src/features/award-registry/components/AwardDecisionList.tsx`
- Modify: `src/types/award-registry.ts` only if the current API shape needs a non-contract type refinement
- Test: `tests/award-decision-registry.spec.ts`

**Interfaces:**
- Consumes: existing `AwardDecision`, `AwardRosterPreviewRow`, `AwardRosterSummary`, `AwardDecisionStatus`, `AwardRecipientMatchStatus`, `AwardRosterRowStatus` types.
- Produces: `getAwardDecisionStatusPresentation`, `getAwardMatchPresentation`, `getAwardRowPresentation`, `getAwardPreviewSummary`, and `awardPreviewFilterOptions` for the rest of the Award feature.

- [ ] **Step 1: Write failing presentation tests** for exact Vietnamese lifecycle/matching labels, deterministic row grouping for `VALID`, `UNMATCHED`, `INVALID`, `DUPLICATE`, `CONFLICT`, and stable summary/filter labels.
- [ ] **Step 2: Run `node --test src/features/award-registry/__tests__/presentation.test.ts`** and verify it fails because the centralized presentation helpers do not exist.
- [ ] **Step 3: Implement the minimal feature-local presentation helpers** with explicit mappings and documented derivation from current backend fields/errors; do not introduce backend enums.
- [ ] **Step 4: Redesign `/app/data-uploader`** as an operational landing surface with workspace context, concise purpose, one primary `Tạo quyết định công nhận` action, and actionable current work derived only from the existing list query when it is semantically real.
- [ ] **Step 5: Redesign the registry list** as a dense desktop table with Vietnamese status labels, server-backed search/status/archive filters, distinct registry/search empty states, one primary create CTA, and direct continuation to the created decision workspace.
- [ ] **Step 6: Update focused Playwright coverage** for Home, registry, empty/search-empty, list filters, create continuation, and data uploader/admin role boundaries; run the focused tests and verify GREEN.
- [ ] **Step 7: Commit** with a focused S2.1 message after tests pass.

### Task 2: Decision Workspace and server-authoritative processing

**Files:**
- Create: `src/features/award-registry/components/AwardWorkflowProgress.tsx`
- Create: `src/features/award-registry/components/AwardSourceFilePanel.tsx`
- Create: `src/features/award-registry/components/AwardNextAction.tsx`
- Modify: `src/features/award-registry/components/AwardDecisionDetail.tsx`
- Modify: `src/features/award-registry/hooks/useAwardRegistry.ts` only for query invalidation or polling behavior proven necessary by tests
- Test: `tests/award-decision-registry.spec.ts`

**Interfaces:**
- Consumes: Task 1 presentation helpers; existing `useAwardDecision`, `useAwardRosterProcessing`, upload/process/update hooks and exact file acceptance implemented by FE/BE.
- Produces: a decision workspace organized as object → progress → work → next action, with `AwardWorkflowProgress` deriving presentation only from actual decision/file/processing state.

- [ ] **Step 1: Add failing Playwright assertions** for decision identity/status, five-step visual progress, separated `Văn bản quyết định` and `Danh sách sinh viên được công nhận`, no fake percentage, reload/polling reconstruction, and clear recovery for processing failure.
- [ ] **Step 2: Run the focused Award test cases** and verify the new assertions fail against the current CRUD-card presentation.
- [ ] **Step 3: Implement the focused workspace components** using shared primitives; keep only backend-supported file types (`PDF/JPEG/PNG/WEBP` for the decision document and `CSV/XLSX/PDF` for roster, with `.xls` rejected), and keep draft edit/upload capability state-driven.
- [ ] **Step 4: Implement next-action hierarchy** for missing files, process, review, retry, and confirmed/archived read modes without adding lifecycle state or fake progress.
- [ ] **Step 5: Run the focused Award suite and existing Award regression**; verify GREEN and inspect reload/terminal polling behavior.
- [ ] **Step 6: Commit** with a focused S2.2 message after tests pass.

### Task 3: Data Review, mapping, correction, confirmation, and recipients

**Files:**
- Create: `src/features/award-registry/components/AwardRosterValidationSummary.tsx`
- Create: `src/features/award-registry/components/AwardRosterReviewTable.tsx`
- Create: `src/features/award-registry/components/AwardConfirmationPanel.tsx`
- Modify: `src/features/award-registry/components/AwardDecisionDetail.tsx`
- Modify: `src/features/award-registry/presentation.ts`
- Test: `src/features/award-registry/__tests__/presentation.test.ts`
- Test: `tests/award-decision-registry.spec.ts`

**Interfaces:**
- Consumes: Task 1 deterministic row/summary/filter presentation; Task 2 decision workspace; existing mapping, row correction, revert, confirm, recipients API adapters and hooks.
- Produces: problem-first review with Vietnamese field labels, server-canonical refresh after mapping/correction, explicit confirmation readiness, operational recipient table, and no recipient edit UI.

- [ ] **Step 1: Extend failing presentation tests** for all current backend row/status/error combinations, including missing student code, invalid required data, duplicate, conflict/manual review, and unmatched warning semantics.
- [ ] **Step 2: Run the unit test file and focused Playwright cases** to verify the new review contract fails before implementation.
- [ ] **Step 3: Implement `AwardRosterValidationSummary`** from the actual preview response; keep grouping deterministic and avoid treating presentation categories as lifecycle state.
- [ ] **Step 4: Implement `AwardRosterReviewTable`** with compact summary, count-aware quick filters, intentional inner table scrolling, visible source/current values, row issue explanations, mapping labels, and correction/revalidation controls wired only to existing endpoints.
- [ ] **Step 5: Implement `AwardConfirmationPanel`** with readiness summary and shared confirmation dialog; do not invent FE blocking rules beyond the existing server-readable preview semantics, and show server rejection as actionable domain copy.
- [ ] **Step 6: Recompose confirmed/archived surfaces** so confirmed mode is read-oriented with recipients and matching states, archived mode uses `Lưu trữ`/`Khôi phục` wording and refetches server state; retain no recipient editing.
- [ ] **Step 7: Run Award focused/regression tests and verify RED→GREEN for preview, mapping, correction, confirm, recipient states, archive/unarchive, errors, and RBAC.
- [ ] **Step 8: Commit** with a focused S2.3 message after tests pass.

### Task 4: Lifecycle QA, docs, and release verification

**Files:**
- Modify: `docs/staff-lane/STAFF_LANE_ROUTE_SCREEN_INVENTORY.md`
- Modify: `docs/staff-lane/STAFF_LANE_IMPLEMENTATION_MAP.md`
- Modify: `docs/staff-lane/STAFF_LANE_API_CONTRACT_MATRIX.md` only if actual API contract changed
- Modify: `docs/staff-lane/STAFF_LANE_STATE_DICTIONARY.md` only if actual state contract changed
- Modify: `tests/award-decision-registry.spec.ts` and/or add `tests/staff-award-registry-ux.spec.ts` for final acceptance gaps

**Interfaces:**
- Consumes: Tasks 1–3 implementation and test evidence.
- Produces: updated Staff Lane route/inventory and implementation map recording S2 DONE, explicit unchanged backend/contract notes, and a verified clean FE/BE branch.

- [ ] **Step 1: Add failing acceptance assertions** for target role/navigation, keyboard/focus semantics, no page-level overflow, dialog viewport fit, and confirmed/archived capability presentation where current coverage is missing.
- [ ] **Step 2: Run the new acceptance assertions** and verify they fail only for the missing S2 QA behavior.
- [ ] **Step 3: Fix the minimum UI/accessibility/layout issues** found by actual browser inspection at all five desktop viewports and zoom levels; no unrelated domain refactor.
- [ ] **Step 4: Run focused Award tests, existing Award regression, Staff S1 regression, role/navigation regression, and relevant Playwright acceptance; record exact counts and skips.
- [ ] **Step 5: Run frontend build, scoped lint for changed files, and full lint for baseline comparison. If backend is unchanged, do not run backend mutation commands as if they were needed; record it as unchanged.**
- [ ] **Step 6: Update route/screen and implementation documentation while preserving S0/S1 history and the roadmap through S9.
- [ ] **Step 7: Perform final self-review against the S2 exit gate, verify FE/BE branch/status/log, and commit the documentation/QA changes.

## Verification Commands

- FE focused unit: `node --test src/features/award-registry/__tests__/presentation.test.ts`
- FE Award workflow: `npx playwright test tests/award-decision-registry.spec.ts --project=chromium`
- FE S1 regression: `npx playwright test tests/staff-contract-alignment.spec.ts --project=chromium`
- FE role/navigation regression: relevant existing `tests/phase1-role-migration.spec.ts` and `tests/phase2-app-shell.spec.ts` cases.
- FE build: `npm run build`
- FE lint baseline: `npm run lint`; also run scoped ESLint for changed source/test files and report the known baseline separately.
- BE verification is required only if BE runtime files change; then run the focused Award unit/access tests, build, lint, `prisma validate`, and `prisma generate`.

## Completion Contract

- No backend runtime code or migration is changed unless a reproducible S2 blocker is found and documented.
- No push is performed.
- Final report includes repository SHAs/status, UX items 1–11, reuse classification, exact endpoints/roles/states, backend result, tests/counts/skips/database integration, quality/baseline, visual QA, docs, remaining issues, and ends with: `S2 completed. S3 City Officer Queue has NOT been started.`
