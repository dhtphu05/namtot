# Staff Contract Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the approved Staff Lane FE/BE contracts for audit, knowledge, City Committee inbox/authority, legacy Committee navigation, and five City criteria without redesigning screens or changing schema.

**Architecture:** Keep the existing endpoint and workspace boundaries. Add one backend shared five-core criterion source, use it only for City individual Staff-facing presentations while preserving legacy auxiliary criteria, and narrow City Committee mutation route declarations to match existing service permissions. FE adapters and navigation will select existing canonical routes by role without adding new domain states.

**Tech Stack:** React/TanStack Router/Playwright FE; Express/Prisma/Vitest BE; TypeScript; existing role/workspace helpers.

**Spec:** `C:/Users/GTC/.codex/attachments/c1eb5f76-35fc-44cd-addf-21a0d249cbd6/Pasted text.txt`

## Global Constraints

- Work only on `feat/staff-lane` in both repositories.
- Do not redesign Staff screens, start Award Registry visual redesign, delete legacy routes/domains, add role names, add migrations, merge/rebase/push, or invent endpoint aliases.
- Preserve legacy roles and valid auxiliary `priority`/`collective` behavior outside City individual presentation.
- Treat route access and resource/task permission as separate contracts.
- Runtime production code is changed only after a focused regression test has failed for the approved behavior.

## Review Focus

- A City Officer review detail must never query legacy precedent APIs — FE Playwright regression in `tests/city-review-advisory-acceptance.spec.ts`.
- A City Committee must use the City-capable inbox path and remain denied from normal review mutations — FE contract test plus BE route/service tests.
- Legacy Committee navigation must not advertise backend-rejected assignment/import/settings actions — FE role navigation test.
- City individual summaries and task creation must expose exactly five core criteria while preserving legacy auxiliary criteria — BE manager/review/ensure-task tests.
- City Manager and admin review/finalization authority must remain unchanged after Committee tightening — BE permission tests and existing lifecycle tests.

### Task 1: Add failing FE contract regressions

**Files:**
- Modify: `namtot/src/lib/__tests__/presentation-maps.test.ts`
- Modify: `namtot/tests/city-review-advisory-acceptance.spec.ts`
- Create: `namtot/src/features/staff-contract/__tests__/staff-contract.test.ts`

**Interfaces:** Tests pin the existing `auditApi`, `managerApi`, `getRoleNavigation`, `canAccessPath`, and review-panel role behavior before implementation.

- [ ] Write tests for `/api/audit/logs`, removal of active generic entity-audit fallback, City Committee inbox route selection, legacy Committee nav omissions, and City route access.
- [ ] Run focused FE tests and record the expected failures.

### Task 2: Implement narrow FE alignment

**Files:**
- Modify: `namtot/src/features/audit/api/audit.ts`
- Modify: `namtot/src/features/decision-import/api/decision-import.ts`
- Modify: `namtot/src/features/manager/api/manager.ts`
- Modify: `namtot/src/features/manager/hooks/useManager.ts`
- Modify: `namtot/src/features/review/components/ReviewDecisionPanel.tsx`
- Modify: `namtot/src/lib/role-navigation.ts`
- Modify: `namtot/src/features/auth/route-guard.ts`

**Interfaces:** City Committee selects `/api/manager/committee-inbox`; legacy manager/committee keep `/api/committee/inbox`. Knowledge remains legacy-only. Existing ReviewTask mutation UI remains hidden from City Committee by service permissions and role-aware fallback logic.

- [ ] Align Audit collection to `/api/audit/logs` and remove the nonexistent generic entity fallback from active Decision Import audit flow; keep the real Decision Import audit endpoint.
- [ ] Make Committee Inbox API/hook role-aware and allow the existing route for City roles without adding it to Knowledge navigation.
- [ ] Remove only backend-rejected assignment/import/settings entries from legacy Committee navigation; keep compatibility routes and valid result/resolution/export/audit/event/collective entries.
- [ ] Ensure the Review Decision panel never enables precedent calls for City roles, including fallback permission paths.
- [ ] Run focused FE tests and confirm green.

### Task 3: Add failing BE contract regressions

**Files:**
- Create: `sv5tot-hackaithon-backend/tests/unit/review.routes-access.test.ts`
- Modify: `sv5tot-hackaithon-backend/tests/unit/review-task-detail.test.ts`
- Modify: `sv5tot-hackaithon-backend/tests/unit/review-ensure-tasks.test.ts`
- Modify: `sv5tot-hackaithon-backend/tests/unit/manager-city-scope.test.ts`

**Interfaces:** Tests cover router role declarations, service task permissions, City individual summaries/workload groupings, five-task creation, City-capable/legacy inbox paths, and City Manager/admin regressions.

- [ ] Add tests proving City Committee cannot call normal decision/supplement/escalation routes while City Manager/admin remain allowed.
- [ ] Add tests proving City Committee can use resolution/final/result paths and legacy Committee endpoint behavior remains unchanged.
- [ ] Add tests proving City individual summaries/groupings and `ensureReviewTasks` use exactly five core criteria; priority/collective remain accepted outside that presentation where existing tests cover them.
- [ ] Run focused BE tests and record failures before implementation.

### Task 4: Implement narrow BE alignment

**Files:**
- Create: `sv5tot-hackaithon-backend/src/shared/constants/criteria.ts`
- Modify: `sv5tot-hackaithon-backend/src/modules/rules/criteria.constants.ts`
- Modify: `sv5tot-hackaithon-backend/src/modules/review/review.service.ts`
- Modify: `sv5tot-hackaithon-backend/src/modules/review/review.routes.ts`
- Modify: `sv5tot-hackaithon-backend/src/modules/manager/manager.service.ts`
- Modify: `sv5tot-hackaithon-backend/src/modules/analytics/city-analytics.service.ts`

**Interfaces:** `coreCriteria` is the shared readonly five-value source. City individual presentation selects it; legacy non-City presentation preserves auxiliary criteria. Existing `ReviewService.getTaskPermissions` remains the resource-level authority.

- [ ] Export the shared five-core constant and preserve the existing rules-module import surface.
- [ ] Replace City-facing duplicated arrays and `Object.values(Criterion)` presentation loops with the shared source, using explicit legacy fallback where required.
- [ ] Remove `city_committee` from normal ReviewTask mutation route role declarations only; keep list/detail/timeline and Resolution/final/result permissions.
- [ ] Run focused BE tests and confirm green.

### Task 5: Update S0 documentation

**Files:**
- Modify: `namtot/docs/staff-lane/STAFF_LANE_AUDIT.md`
- Modify: `namtot/docs/staff-lane/STAFF_LANE_API_CONTRACT_MATRIX.md`
- Modify: `namtot/docs/staff-lane/STAFF_LANE_STATE_DICTIONARY.md`
- Modify: `namtot/docs/staff-lane/STAFF_LANE_IMPLEMENTATION_MAP.md`

- [ ] Preserve each mismatch history and mark SL-P1-01 through SL-P1-06 `RESOLVED` only with code/test evidence.
- [ ] Record exact changed routes, permissions, five-criteria strategy, and remaining P2 debt.

### Task 6: Full verification and separate commits

- [ ] Run focused FE tests: role navigation, route guard, audit, Committee Inbox, review/precondition behavior.
- [ ] Run focused BE tests: review route access/permissions, resolution access, manager/Committee inbox, criteria/task creation, audit access/scope.
- [ ] Run FE build/lint; BE unit suite/build/lint; `prisma validate`; `prisma generate`.
- [ ] Compare diagnostics against the baseline and do not hide pre-existing failures.
- [ ] Review `git diff` and status for runtime scope; commit FE and BE separately; do not push.
