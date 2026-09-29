# S2 Final UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Data Uploader / Award Registry workflow feel like a production staff workspace while preserving the accepted S2 contract and behavior.

**Architecture:** Keep all canonical Award Registry hooks, endpoints, roles, lifecycle values, matching semantics, validation semantics, and polling untouched. Polish the existing FE composition by deriving staff-facing title/copy and current-work emphasis from the same server data already used by S2, using a responsive main-work-area/context-rail layout on wide desktop and a natural single-column layout below it.

**Tech Stack:** React, TanStack Router, TypeScript, Tailwind CSS, Playwright, Node test runner, Markdown documentation.

**Spec:** `C:\Users\GTC\.codex\attachments\80680184-b688-4822-94c0-e964011356f5\Pasted text.txt`

## Global Constraints

- Do not change Award API contracts, backend runtime, permissions, roles, Award lifecycle, matching semantics, validation semantics, polling semantics, confirmation semantics, archive semantics, schema, or migrations.
- Do not create new backend endpoints, redesign Decision Import, Event Registry, City Officer/Manager/Committee/Admin, start S3, create a second design system, globally redesign AppShell, or start S3.
- Preserve all S2 working behavior, including review summary, problem-first filtering, mapping, source/current values, correction/revert, server revalidation, matching states, internal table scroll, confirmation, archive/unarchive, and server-derived processing states.
- Remain on `feat/staff-lane`; do not checkout, merge, rebase, or push.
- Do not clean full-repo CRLF/Prettier baseline debt.
- Final UI must remain usable at 1280×720, 1366×768, 1440×900, 1600×900, and 1920×1080, with 90/100/110/125% zoom checks and no page-level horizontal overflow.

## Review Focus

- A missing or long decision number must produce a meaningful business title without exposing an internal id; test the fallback and long-title rendering.
- A draft with no files, one file, both files, processing, failed processing, preview-ready review, confirmed, and archived states must keep one truthful next action; pin representative draft/error and read-only states in Playwright.
- Metadata Save must not look actionable when the draft is unchanged, while still enabling after a supported edit; pin the disabled/enabled behavior.
- Archive/unarchive must remain a secondary lifecycle action and confirmed/archived screens must not present draft actions as primary; pin action visibility in the existing workflow tests.
- Wide desktop composition must use the available space without page overflow, while the roster table may scroll only inside its own container; pin viewport/zoom overflow assertions.

---

### Task 1: Staff-facing presentation language and current-stage primitives

**Files:**
- Modify: `src/features/award-registry/components/AwardWorkflowProgress.tsx`
- Modify: `src/features/award-registry/components/AwardNextAction.tsx`
- Modify: `src/features/award-registry/presentation.ts`
- Modify: `src/routes/app.data-uploader.tsx`
- Test: `src/features/award-registry/__tests__/presentation.test.ts`
- Test: `tests/award-decision-registry.spec.ts`

**Interfaces:**
- Consumes: existing `AwardDecision`, `AwardRosterProcessing`, and presentation status types.
- Produces: staff-facing labels/copy and a compact progress presentation that remains derived only from canonical decision/file/processing data.

- [ ] **Step 1: Write failing unit and Playwright assertions** for meaningful decision titles/fallbacks, removal of `Workflow` and server-derived copy, `Đơn vị quản lý dữ liệu`, and one current-stage/next-action presentation.
- [ ] **Step 2: Run the focused tests and verify they fail for the intended missing presentation behavior.**
- [ ] **Step 3: Implement the smallest presentation changes** without adding state values or new API calls: title/copy helpers, compact progress language, and overview terminology.
- [ ] **Step 4: Run the focused unit and Playwright assertions and verify they pass.**
- [ ] **Step 5: Commit** with `feat(staff-lane): polish award staff-facing presentation`.

### Task 2: Decision workspace composition and action hierarchy

**Files:**
- Modify: `src/features/award-registry/components/AwardDecisionDetail.tsx`
- Modify: `src/features/award-registry/components/AwardSourceFilePanel.tsx`
- Modify: `src/features/award-registry/components/AwardConfirmationPanel.tsx`
- Modify: `src/routes/app.award-registry.$awardDecisionId.tsx`
- Test: `tests/award-decision-registry.spec.ts`

**Interfaces:**
- Consumes: Task 1 presentation language; existing Award Registry hooks and component props.
- Produces: responsive decision workspace with current work visually prioritized, a useful wide-screen context rail, clear document distinction, dirty-aware metadata save, and secondary archive action.

- [ ] **Step 1: Write failing Playwright assertions** for the business title, `Số sinh viên`, disabled Save when unchanged/enabled after edit, useful main/rail composition, source-document hierarchy, and current-stage/error next action.
- [ ] **Step 2: Run the targeted tests and verify the expected failures.**
- [ ] **Step 3: Implement the workspace layout polish**: meaningful header context, compact progress placement, responsive main/rail grid, current-work ordering/anchor behavior using existing derived data, side-by-side source panels on wide desktop, clean archive hierarchy, and dirty-aware Save.
- [ ] **Step 4: Run the targeted Award Registry Playwright tests and verify all pass, including existing upload/process/review/correction/confirm/archive behavior.**
- [ ] **Step 5: Commit** with `feat(staff-lane): improve award workspace composition`.

### Task 3: Navigation and documentation closeout

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` or the smallest existing navigation styling file identified during implementation (only if browser QA proves truncation at target widths)
- Modify: `docs/staff-lane/STAFF_LANE_IMPLEMENTATION_MAP.md`
- Modify: `docs/staff-lane/STAFF_LANE_ROUTE_SCREEN_INVENTORY.md` only if the final composition or state wording needs to be reflected there
- Test: `tests/award-decision-registry.spec.ts` if the sidebar label requires a regression assertion

**Interfaces:**
- Consumes: existing `data_uploader` navigation and the completed Task 2 screen terminology.
- Produces: readable two-item uploader navigation and a roadmap that explicitly marks S0/S1/S2 complete, separates Review Lane and Operations Lane ownership, and distinguishes raw roster row states from FE presentation groupings.

- [ ] **Step 1: Write a failing navigation assertion only if the live target viewport reproduces truncation.**
- [ ] **Step 2: Run it and record the expected failure, or record that no navigation code change is required when the live target viewport is already readable.**
- [ ] **Step 3: Apply the smallest navigation fix if needed and update the roadmap/documentation with current source-of-truth state mappings and post-S2 ownership boundaries.**
- [ ] **Step 4: Run documentation/source checks and the affected Playwright test.**
- [ ] **Step 5: Commit** with `docs(staff-lane): close out s2 ux roadmap` (or the precise combined message if navigation code is also changed).

### Task 4: Full verification and visual QA

**Files:**
- Modify: only files required by verification findings; no unrelated cleanup.

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: fresh evidence for the S2 closeout report and a clean local branch.

- [ ] **Step 1: Run award presentation unit tests.**
- [ ] **Step 2: Run Award Registry Playwright, S1 contract, Phase 1 role/route, and relevant Phase 2 shell regression suites with the correct local base URLs.**
- [ ] **Step 3: Run FE build and scoped lint for changed files; record known full-repo lint baseline separately if checked.**
- [ ] **Step 4: Browser-QA overview, registry, create dialog, draft/no files, one file, both files, processing, review, confirmed, and archived states at 1280×720, 1366×768, 1440×900, 1600×900, 1920×1080 and 90/100/110/125% zoom.**
- [ ] **Step 5: Review the final diff against the spec, verify backend repo is unchanged, verify branch/SHA/status, and commit any final verification-only fix locally.**
- [ ] **Step 6: Final report must include starting/final SHA, reproduced findings, exact UX changes, contract confirmation, exact commands/counts, viewport/zoom QA, docs, known baseline debt, commit SHA/status, and end with `S2 final UX closeout completed. Parallel Staff lanes have NOT been started.`**

## Self-review

- Coverage: overview, registry preservation, create dialog, workspace title/copy/progress/current-work composition, desktop rail, next action, metadata wording/save, archive hierarchy, source documents, data review preservation, confirmed/archived read-only presentation, sidebar, visual QA, regression, and roadmap ownership are assigned above.
- Interface consistency: all tasks consume existing Award Registry types/hooks; no task produces a new backend interface or business state.
- Review focus: each listed failure mode is pinned to Task 1, Task 2, or Task 4.
- Scope: this is FE presentation/layout and documentation only; backend remains untouched.
