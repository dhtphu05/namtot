# S3 City Officer Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a truthful, task-centric City Officer queue at `/app/queue` with server-side completed-status union filtering, claim concurrency handling, regression coverage, and visual QA.

**Architecture:** Extend the existing `GET /api/review/tasks` contract with a normalized `statuses` union while preserving `status`, then expose pagination metadata through the existing FE review API. Render a dedicated `CityOfficerQueue` only for `city_officer`; preserve legacy queue behavior for other roles and leave `/app/review/:id` untouched.

**Tech Stack:** Express/Zod/Prisma/Vitest/Supertest backend; React/TanStack Query/TanStack Router/TypeScript/Playwright frontend; existing UI primitives and auth store.

**Spec:** `docs/superpowers/specs/2026-09-30-city-officer-queue-design.md`

## Global Constraints

- Work only on `feat/staff-review`; do not merge to `main` and do not push.
- Preserve backend authorization, workspace isolation, task visibility, assignment, and permission semantics.
- `status` remains supported; `status` and `statuses` together return HTTP 400.
- `statuses` trims, deduplicates, validates every value, and filters server-side before count/pagination.
- City UI exposes only `ethics`, `academic`, `physical`, `volunteer`, and `integration`.
- Do not expose school, priority, collective, AI-confidence, or fake global-count filters.
- Claim is immediate with no confirmation dialog; navigate only after server success.
- Do not redesign `/app/review/:id`, global shell, or S4 behavior.
- Finish with one focused local S3 implementation commit after verification; preserve unrelated pre-existing working-tree files and do not push.

## Review Focus

- Mixed `status`/`statuses` input must fail before service execution — backend validation regression.
- Completed union totals must be computed before pagination — repository/controller pagination regression.
- City Officer must not see another workspace or unsupported criterion — workspace/authorization regression.
- A concurrent claim must produce a meaningful 409 result and remove the stale UI action — FE claim regression.
- The queue must remain usable with zero tasks, API failure, slow loading, and wide/zoomed desktop layouts — Playwright state and visual QA regression.

---

### Task 1: Backend statuses union contract

**Files:**

- Modify: `sv5tot-hackaithon-backend/src/modules/review/review.validation.ts`
- Modify: `sv5tot-hackaithon-backend/src/modules/review/review.repository.ts`
- Test: `sv5tot-hackaithon-backend/tests/unit/review-list-query-contract.test.ts`
- Modify: `sv5tot-hackaithon-backend/tests/unit/review.routes-access.test.ts`
- Modify: `sv5tot-hackaithon-backend/tests/unit/review-workspace-scope.test.ts` if the new repository assertion belongs with the existing scope coverage

**Interfaces:**

- Consumes: Prisma `ReviewTaskStatus`, existing `ListReviewTasksQuery`, `reviewWorkspaceFilterFor`, and the existing paginated `ReviewRepository.list` path.
- Produces: `ListReviewTasksQuery.statuses?: ReviewTaskStatus[]` containing trimmed, first-seen-order unique values; `buildTaskWhere` adds `{ status: { in: query.statuses } }` when supplied; existing `status` behavior remains unchanged.

- [x] **Step 1: Write failing validation and repository tests**

  Add tests for accepted/rejected union parsing, trimming/deduplication, invalid status rejection, `status` plus `statuses` rejection, and repository `findMany`/`count` receiving the same union predicate. Add route authorization coverage proving an allowed City Officer reaches the list controller and a non-review role still receives 403. Add a scope assertion proving the City Officer query retains the existing workspace filter.

- [x] **Step 2: Run the focused backend tests and verify RED**

  Run `pnpm exec vitest run tests/unit/review-list-query-contract.test.ts tests/unit/review.routes-access.test.ts tests/unit/review-workspace-scope.test.ts` from `sv5tot-hackaithon-backend`.

  Expected: the new `statuses` cases fail because the schema/query predicate does not exist; unrelated existing assertions should continue to identify their own behavior.

- [x] **Step 3: Implement normalized `statuses` parsing in `review.validation.ts`**

  Add the optional query field as a comma-delimited string transformed into a trimmed, deduplicated array of `ReviewTaskStatus`. Use a schema-level refinement to reject requests that also contain `status`; ensure every item is validated by the Prisma enum and empty/invalid values produce the existing 400 validation path.

- [x] **Step 4: Implement the union predicate in `ReviewRepository.buildTaskWhere`**

  Apply `status: { in: query.statuses }` to the same `andFilters` list used by all existing scope and search filters. Keep `status` equality as-is for legacy requests. Do not touch role permission branches or the `list` transaction; the existing `findMany` and `count` must consume the same `where` so totals precede pagination.

- [x] **Step 5: Run focused backend tests and verify GREEN**

  Re-run the command from Step 2. Expected: validation, union, pagination predicate, workspace, and authorization tests pass.

- [x] **Step 6: Run backend type/build checks**

  Run `pnpm build` and `pnpm lint` from `sv5tot-hackaithon-backend`; record any pre-existing warnings separately and do not broaden the change.

### Task 2: Frontend City Officer queue

**Files:**

- Modify: `namtot/src/features/review/types.ts`
- Modify: `namtot/src/features/review/api/review.ts`
- Create: `namtot/src/features/review/components/CityOfficerQueue.tsx`
- Modify: `namtot/src/routes/app.queue.tsx`
- Modify: `namtot/src/features/review/utils/formatters.ts` only if shared presentation labels are needed without changing S4 semantics
- Test: `namtot/tests/city-officer-queue-s3.spec.ts`

**Interfaces:**

- Consumes: `SafeUser.officerSpecializations`, `useReviewTasks`, `useClaimReviewTask`, `ReviewTaskPermissions`, existing `/app/review/$id` navigation, and the backend `meta.pagination`.
- Produces: `ReviewTaskListParams.statuses?: ReviewTaskStatus[]`; `ReviewTaskListResponse.pagination?: Pagination`; a `CityOfficerQueue` component that accepts the authenticated user and uses one query per selected tab; direct claim/refetch/navigation behavior.

- [x] **Step 1: Write failing Playwright contract/UI tests**

  Create a route-stubbed City Officer fixture with multiple active specializations and task rows for the five criteria. Assert that `/app/queue` sends `statuses=accepted%2Crejected` exactly once for `Đã hoàn thành`, sends the single canonical status for each other tab, preserves `q`, `criterion`, `page`, and `limit`, and renders no school/priority/collective control or fabricated tab counts. Assert the table presents student, criterion, level, status, assignment, deadline, and action columns.

  Add tests for an unassigned claimable row: `Nhận xử lý` is visible, no confirmation dialog appears, two rapid clicks cause one POST, successful response leads to `/app/review/:id`, and a 409 response shows the concurrent-claim message and refreshes the queue. Add loading, error, empty, and no-specialization states. Keep existing S4 specs unchanged.

- [x] **Step 2: Run the focused Playwright spec and verify RED**

  Start/use the configured FE dev server and run `pnpm exec playwright test tests/city-officer-queue-s3.spec.ts` from `namtot`.

  Expected: the new route-stubbed assertions fail because the route still renders the legacy City Officer queue and the API response drops pagination.

- [x] **Step 3: Extend FE review list types and normalization**

  Add `statuses` to `ReviewTaskListParams` and optional `pagination` to `ReviewTaskListResponse`. Serialize the array as one comma-delimited query value, preserve all existing params, and copy `response.meta.pagination` into the normalized response without changing task item normalization or shared client behavior.

- [x] **Step 4: Implement `CityOfficerQueue` as a focused feature-local presentation**

  Add tabs for `waiting`, `reviewing`, `supplement_required`, `resolution_needed`, and the completed `statuses` union. Use only the five core criteria from the user’s active specialization list, a server-backed search input, criterion filter, and pagination controls. Render exact S3 labels, assignment separately from status, and only show `Nhận xử lý` when `item.permissions?.canClaim` is true. Keep all tab counts omitted unless supplied authoritatively by the server (they are not).

- [x] **Step 5: Implement claim lifecycle and conflict handling**

  Use a per-task pending guard around `useClaimReviewTask`. Call the mutation immediately, wait for its successful server response, refetch/invalidate through the existing hook, then navigate to `/app/review/$id`. Detect `ApiError` status/code 409 locally and show `Hồ sơ này vừa được cán bộ khác nhận xử lý. Danh sách đã được cập nhật.`, then refetch so the stale claim action disappears. Do not alter the global 409 mapping or add a dialog.

- [x] **Step 6: Route only City Officers to the new component**

  In `app.queue.tsx`, branch `role === "city_officer"` to `CityOfficerQueue` before the legacy officer/manager implementation. Leave legacy `officer`, manager, committee, city manager, admin, the shared shell, and review workspace components unchanged except for imports required by type-safe integration.

- [x] **Step 7: Run the focused Playwright spec and verify GREEN**

  Re-run `pnpm exec playwright test tests/city-officer-queue-s3.spec.ts`. Expected: all queue contract, claim, state, and routing assertions pass.

- [x] **Step 8: Run existing City/S2 regression specs**

  Run `pnpm exec playwright test tests/city-review-advisory-acceptance.spec.ts tests/city-review-human-authority.spec.ts tests/city-review-finalization-roles.spec.ts tests/phase2-app-shell.spec.ts tests/staff-contract-alignment.spec.ts`. Expected: existing S4 review behavior and shared shell remain green.

### Task 3: Documentation, visual QA, and delivery verification

**Files:**

- Modify: relevant files under `namtot/docs/staff-lane/` only after behavior is verified
- Modify: `namtot/docs/superpowers/plans/2026-09-30-city-officer-queue-s3.md` only to mark completed verification if needed
- Test/artifacts: `namtot/test-results/` and local screenshots outside tracked source unless the repository already tracks QA captures

**Interfaces:**

- Consumes: verified backend/frontend behavior from Tasks 1–2 and the existing Staff Lane contract/state documents.
- Produces: updated Staff Lane documentation, visual QA evidence, clean branches, and the final focused local S3 commit with no push.

- [x] **Step 1: Run FE build and scoped lint**

  Run `pnpm build` and `pnpm lint` from `namtot`. Expected: production bundle and lint complete without introducing errors.

- [x] **Step 2: Run the full backend suite**

  Run `pnpm test` from `sv5tot-hackaithon-backend`. Expected: all backend tests pass, including the new statuses contract regressions.

- [x] **Step 3: Run full relevant FE acceptance coverage**

  Run the complete Playwright suite or, if environment constraints require scoping, run all Staff Lane, City review, app-shell, and S3 specs together and record the exact command/result. No known test may be omitted from the final report.

- [x] **Step 4: Perform visual QA at the available fixture width**

  Use the real local app or route-stubbed fixture to inspect the City Officer queue at 1440×900. Check no horizontal overflow, table readability, action affordances, keyboard focus, and all five tabs. Capture screenshots for each state represented by the available fixture, especially a `Nhận xử lý` row; do not invent screenshots for absent real-data states.

- [x] **Step 5: Update only relevant Staff Lane docs**

  Record the final endpoint query semantics, tab/status mapping, claim behavior, unsupported filters, and pagination truth in the relevant API contract/state/implementation documents. Do not document S4 as started.

- [x] **Step 6: Self-review the complete diff**

  Run `git diff --check`, inspect FE and BE diffs for scope creep, confirm no S4 review workspace files were redesigned, confirm no global 409 behavior changed, and verify both repositories are on `feat/staff-review`.

- [x] **Step 7: Create the focused local S3 implementation commit and stop**

  Commit the verified FE and BE implementation/documentation changes with a focused message such as `feat: ship city officer review queue s3`. Do not push or merge. Confirm both working trees are clean, capture final commit IDs, and provide the exact S3 report plus available screenshots. Do not start S4 or run further work after handoff.

## Verification notes

- Focused backend review tests: 18 passed, including statuses parsing, union pagination/count predicate, workspace scope, and route authorization.
- Backend build and lint passed; lint reported only existing warnings. The full suite reached integration tests but could not authenticate to the configured PostgreSQL database, so those database-backed cases were skipped/left incomplete by the environment.
- Focused FE S3 Playwright: 3 passed. Existing City review and Staff contract suites passed; 9 Phase 2 app-shell cases remain baseline failures caused by the existing auth-hydration fixture, while the wide/zoom shell case passed.
- FE production build and scoped ESLint passed. Full TypeScript checking still reports pre-existing errors outside the S3 files.
- Visual QA captured route-stubbed fixture screenshots at 1440×900 for the available queue states, including a claimable `Nhận xử lý` row. No screenshot was created for an absent real-data state.
