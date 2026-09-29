# Staff Lane Implementation Map — S0 → S8

Đây là bản đồ triển khai theo dependency. S0 chỉ audit; các phase sau cần approval riêng trước khi sửa runtime code.

## S0 — Audit & contract freeze preparation — DONE

### Output

- `STAFF_LANE_AUDIT.md`
- `STAFF_LANE_ROUTE_SCREEN_INVENTORY.md`
- `STAFF_LANE_API_CONTRACT_MATRIX.md`
- `STAFF_LANE_STATE_DICTIONARY.md`
- `STAFF_LANE_IMPLEMENTATION_MAP.md`

### Exit criteria

- Branch/HEAD/working tree đã kiểm tra.
- Route, role, endpoint, enum/state, test inventory đã đối chiếu.
- P0/P1/P2 đã ghi rõ.
- Không runtime code changed.

## S1 — Foundation, route guard, navigation, contract adapters

### Reuse

- `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`.
- `src/features/auth/role-map.ts`, `src/features/auth/route-guard.ts`.
- `src/lib/role-navigation.ts`.
- `src/components/feedback/*`, `src/components/status/*`.

### Scope to implement after approval

- Chốt canonical paths cho Audit, Committee Inbox, Knowledge Base và legacy import.
- Làm role×route×endpoint matrix thành acceptance contract.
- Đồng nhất nav với BE capability, không thêm permission mới.
- Tách rõ five core criteria khỏi `priority`/`collective` trong response presentation nếu contract được duyệt.

### Backend dependency

- Quyết định P1-01 → P1-06 trong audit.
- Không tự mở City role cho endpoint khi chưa có scope rule.

## S2 — City Officer review lane

### Reuse

- `src/routes/app.queue.tsx`.
- `src/routes/app.review.$id.tsx`.
- `src/features/review/components/ReviewQueue.tsx`, `ReviewTaskTable.tsx`, `ReviewDetails.tsx`, `ReviewDecisionPanel.tsx`, `RequestSupplementPanel.tsx`.
- `src/features/review/api/review.ts`, hooks, formatters/error adapters.
- BE `src/modules/review/*`, `review-workspace-scope.ts`, review assignment service.

### Acceptance focus

- City workspace scope and active School visibility.
- Specialization/Faculty scope controls claim and action.
- Concurrent claim returns conflict safely.
- Decision note/accept-level validation is visible and contract-compatible.
- Escalation opens Resolution case and application status follows service rules.

### Known gaps to resolve first

- City Officer knowledge/precedent access policy.
- FE route/detail role matrix currently differs for City Committee and manager-style access.

## S3 — City Manager coordination lane

### Reuse

- `src/routes/app.analytics.tsx` and `src/features/manager/city-analytics/*`.
- `src/routes/app.assignment.tsx` and review assignment components.
- `src/routes/app.manager.results.tsx`, `$applicationId.tsx`.
- `src/features/manager/components/ApplicationLifecycleActions.tsx`, `FinalizationDialog.tsx`, `CityReviewSeasonAdministration.tsx`, `CitySubmissionDeadlineExceptionPanel.tsx`, `EligibilityVerificationPanel.tsx`.
- BE manager routes/service, city season and submission eligibility modules.

### Acceptance focus

- City Manager sees only the allowed City scope and active School resources.
- Assignment/reassignment is manager-only as currently enforced.
- Season/deadline/exception ownership and timestamps are explicit.
- Results surface distinguishes suggested aggregation from human finalization.
- Cancel/archive/reopen/finalize actions preserve audit/history.

### Known gaps

- Audit screen endpoint mismatch.
- Queue route technically accessible to City Manager but not part of navigation; decide whether read-only coordination is intentional.

## S4 — City Committee resolution-first lane

### Reuse

- `src/features/resolution/*`, `src/routes/app.resolution*.tsx`.
- `src/routes/app.manager.results.tsx`, finalization components.
- `src/routes/app.committee.inbox.tsx` only after canonical endpoint decision.
- `src/components/audit/*`, export feature.
- BE resolution, manager results/finalization, export and audit modules.

### Acceptance focus

- Committee primarily receives open Resolution cases and result/finalization work.
- Case visibility is scope-safe and City individual cases are not leaked to legacy roles.
- Final decision/reopen behavior is explicit and auditable.
- Export/audit visibility is consistent with approved nav.

### Known gaps

- `/api/committee/inbox` role list excludes City roles.
- Review route advertises City Committee action roles while service permissions are resolution-view oriented.

## S5 — Admin control plane

### Reuse

- `src/features/admin-workspace/*`.
- `src/features/admin-users/*`.
- Admin officer-specialization page.
- BE admin workspace/user routes and specialization service.

### Acceptance focus

- Workspace hierarchy/type/active state is visible.
- User role/workspace/active state changes are auditable.
- City Officer specialization and faculty scope control review assignment.
- Admin does not accidentally become a source of new business states.

### Known gaps

- Audit API must be canonical before admin audit usage is considered complete.

## S6 — Contract tests and security/concurrency verification

### Existing test inventory to extend

- FE route/acceptance: `tests/award-decision-registry.spec.ts`, `tests/city-review-*.spec.ts`, `tests/phase1-role-migration.spec.ts`, `tests/phase4-admin-operations.spec.ts`.
- BE scope/role: `tests/unit/review-workspace-scope.test.ts`, `auth-middleware-workspace.test.ts`, `city-workspace-modules.test.ts`, `city-resolution-*`, `award-decisions.routes-access.test.ts`, `admin-*`.
- BE lifecycle/concurrency: `application-lifecycle-concurrency.test.ts`, `applications-city-submission-gate.test.ts`, `manager-reopen-final-history.test.ts`, `review-ensure-tasks.test.ts`.

### Required contract assertions

- Every canonical route has FE role, BE route role and service permission entries.
- Audit, knowledge and committee inbox paths are executable or removed from nav.
- Five criteria response excludes auxiliary values unless explicitly namespaced/documented.
- Cross-workspace access returns safe 404/403 behavior according to existing policy.
- Claim/finalize/reopen/cancel/archive transitions are idempotent or conflict-safe.

## S7 — Documentation, UX debt and legacy containment

### Scope

- Update canonical docs only after source/test changes are approved.
- Keep legacy routes operational until migration/cutover criteria are met.
- Mark compatibility routes and fallback adapters clearly.
- Verify empty/loading/error/permission states for every Staff Lane screen.

### Do not do implicitly

- Do not delete legacy Decision Import.
- Do not rename enums/state values to improve copy.
- Do not infer new City roles or broad permissions from UI convenience.

## S8 — Release/cutover readiness

### Exit criteria

- P1 findings closed or explicitly accepted with owner and follow-up.
- FE/BE contract tests pass.
- Role×workspace×screen acceptance passes for City Officer, City Manager, City Committee, Admin and retained legacy roles.
- Audit trail and human finalization evidence is reviewable.
- No unexpected runtime files, generated route changes, or unreviewed legacy deletions.

## Dependency summary

```text
S0 audit
  └─ contract decisions / approval
       ├─ S1 foundation + canonical routes
       ├─ S2 City Officer review
       ├─ S3 City Manager coordination
       ├─ S4 City Committee resolution-first
       └─ S5 Admin control plane
            └─ S6 contract/security/concurrency tests
                 └─ S7 docs + legacy containment
                      └─ S8 release/cutover
```

## S1 completed implementation map — 2026-09-30

### FE contract alignment

- `src/features/audit/api/audit.ts` → canonical `/api/audit/logs`.
- `src/routes/app.audit.tsx` → existing `AuditTimeline` collection surface; legacy student/application `AuditLogs` component remains intact.
- `src/features/decision-import/api/decision-import.ts` → real Decision Import audit only, no generic entity fallback.
- `src/features/manager/api/manager.ts` and `src/features/manager/hooks/useManager.ts` → role-aware Committee Inbox endpoint and cache key.
- `src/features/auth/route-guard.ts` → existing `/app/committee/inbox` is reachable for legacy and City Committee/Manager roles without adding a parallel route.
- `src/lib/role-navigation.ts` → legacy Committee nav no longer exposes assignment, Decision Import or settings.
- `ReviewDecisionPanel.tsx` keeps precedent search limited to legacy roles.

### BE contract alignment

- `src/shared/constants/criteria.ts` owns the shared five-core constant; rules module re-export preserves existing imports.
- Review dashboard and `ensureReviewTasks` use the shared constant for City behavior while legacy evidence-derived auxiliary criteria remain supported.
- Manager City workload/results/summary grouping and City analytics use five-core presentation for individual City applications; non-City/legacy behavior remains enum-complete.
- `src/modules/review/review.routes.ts` removes City Committee from normal decision, supplement and escalation mutation role lists while preserving read context, Resolution and finalization paths.

### S1 verification map

- FE: `tests/staff-contract-alignment.spec.ts` (3/3), City review regression suites (7/7 total).
- BE: focused Staff Lane suite (13 files, 107/107 tests), TypeScript build, Prisma validate/generate.
- No database integration coverage is claimed by these unit/source/route tests.

P0: none. Remaining P2 work is legacy containment and baseline formatting/artifact cleanup, deferred from S1.
