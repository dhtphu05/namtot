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

## Canonical sequence and post-S2 ownership — 2026-09-30

Đây là sequence chính thức sau khi hoàn tất S2:

- **S0 Staff Audit — DONE**
- **S1 Staff Contract Alignment — DONE**
- **S2 Data Uploader / Award Registry — DONE**

### Parallel implementation lanes

#### Review Lane

Review Lane owns:

- `/app/queue`
- `/app/review/:id`
- City Officer review UX
- claim và review decisions
- Officer-side supplement request
- Officer-side escalation trigger

#### Operations Lane

Operations Lane owns:

- Admin operations
- City Manager operations
- season/readiness
- assignment/workload
- application oversight
- results/export
- existing finalization presentation

#### Deferred/shared integration

The following remain shared or deferred:

- Student-side supplement completion remains cross-branch (`ui/student-workspace` when present)
- Committee-side Resolution workflow remains shared/deferred
- City Committee Decision Desk
- cross-role supplement completion
- changes to finalization semantics
- global role/workspace/criterion model

Neither parallel lane may independently redesign Resolution core.

The phase notes below preserve historical planning context. The canonical
sequence above supersedes any older label that called the City Officer
review lane “S2”.

## S1 — Foundation, route guard, navigation, contract adapters — DONE (historical implementation notes)

### Reuse

- `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`.
- `src/features/auth/role-map.ts`, `src/features/auth/route-guard.ts`.
- `src/lib/role-navigation.ts`.
- `src/components/feedback/*`, `src/components/status/*`.

### Historical scope

- Chốt canonical paths cho Audit, Committee Inbox, Knowledge Base và legacy import.
- Làm role×route×endpoint matrix thành acceptance contract.
- Đồng nhất nav với BE capability, không thêm permission mới.
- Tách rõ five core criteria khỏi `priority`/`collective` trong response presentation nếu contract được duyệt.

### Backend dependency

- Quyết định P1-01 → P1-06 trong audit.
- Không tự mở City role cho endpoint khi chưa có scope rule.

## Historical planning note — City Officer review lane (now Review Lane)

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

## S4 — City Officer review workspace — COMPLETE (2026-09-30)

The existing `/app/review/:id` workspace now consumes the additive review-detail
context contract and supports the functional City Officer review flow:

- authoritative institution/workspace, assignment and due-date context;
- CriteriaVersion/CriteriaRule-backed checklist and assessment presentation;
- original evidence preview through the canonical signed-file endpoint;
- per-evidence advisory assessment notes, reviewer decision notes and existing
  accept/reject/supplement/escalation actions;
- conflict refresh UX for stale decisions, while preserving server-side CAS and
  existing permission/supplement invariants.

If authoritative City criteria are unavailable, the workspace shows an explicit
human-review state and does not render a hardcoded City threshold. Route/season
metadata is not fabricated because the reviewed Application model does not expose
an authoritative persisted route field.

## S5 — City Officer Supplement + Resolution functional closure — COMPLETE (2026-09-30)

S5 closes the Officer-side handoff contracts without redesigning the workspace:

- Officer supplement requests continue through the canonical ReviewTask decision
  contract, with linked evidence, requested fields, reason and optional deadline in
  `supplementRequestJson`.
- The student assistant route
  `POST /api/student-assistant/supplements/:reviewTaskId/resubmit` now uses a
  transaction/CAS service that preserves the same ReviewTask, resets only the
  submitted criterion and leaves unrelated supplement tasks untouched. A
  generic application submit is rejected when multiple active supplement tasks
  exist, preventing a duplicate or broad reset.
- Resolution handoff continues through
  `POST /api/review/tasks/:id/escalate-resolution`; the response exposes the
  canonical `resolutionCaseId`, while the Officer remains read-only after
  `resolution_needed`.
- Regression coverage includes evidence linkage, same-task/criterion isolation,
  CAS conflict handling, cancellation/authorization invariants, Playwright
  supplement/resolution flows, stale refresh and pending read-only states.

The student-side UI is not copied into Staff Lane. If its branch is separate,
the browser round-trip depends on that branch consuming the canonical student
assistant endpoint. Committee resolution, Manager finalization and Admin
control-plane changes remain outside S5.

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
  └─ S1 Staff Contract Alignment
       └─ S2 Data Uploader / Award Registry
            ├─ Review Lane
            ├─ Operations Lane
            └─ Deferred/shared integration
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

## S2 Award Registry production UX addendum — 2026-09-30

S2 hoàn thành trên FE branch `feat/staff-lane`; BE Award Registry giữ nguyên runtime contract và không có file BE thay đổi.

### Implemented FE map

| Concern                | Source                                                                                                                                           | Result                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data Uploader overview | `src/routes/app.data-uploader.tsx`                                                                                                               | Purpose-first overview, workspace context, one primary CTA, list-backed current work và loading/error/empty states                                                        |
| Registry list          | `src/features/award-registry/components/AwardDecisionList.tsx`, `src/features/award-registry/presentation.ts`                                    | Server filters preserved; clear active/archive states; deterministic lifecycle labels and filtered-empty recovery                                                         |
| Decision workspace     | `src/features/award-registry/components/AwardDecisionDetail.tsx`, `AwardWorkflowProgress.tsx`, `AwardSourceFilePanel.tsx`, `AwardNextAction.tsx` | Object → progress → work → next action hierarchy; exact file roles/formats; no fake progress or invented status                                                           |
| Roster review          | `AwardRosterValidationSummary.tsx`, `AwardRosterReviewTable.tsx`, `presentation.ts`                                                              | Summary counts, deterministic presentation groups, source/current values, issue explanations, mapping/filter/correction controls                                          |
| Confirmation           | `AwardConfirmationPanel.tsx`                                                                                                                     | Readiness summary and shared confirmation dialog; server remains final authority; confirmed/archived workspace is read-only                                               |
| Acceptance             | `tests/award-decision-registry.spec.ts`, `src/features/award-registry/__tests__/presentation.test.ts`                                            | Covers role/navigation, server filters, upload/process/retry, preview review, mapping, correction/revert, confirm, recipients, archive/unarchive and presentation mapping |

### Locked contract carried into S2

- Canonical endpoints remain `GET/POST /api/award-decisions`, `GET/PATCH /api/award-decisions/:id`, file upload `POST /files/decision` and `POST /files/roster`, `POST /process-roster`, `GET /roster-processing`, `GET /roster-preview`, `PATCH /roster-mapping`, `PATCH /roster-preview/:sourceRow`, `DELETE /roster-preview/:sourceRow/correction`, `POST /confirm`, `GET /recipients`, `POST /archive`, and `POST /unarchive`.
- Actors remain `data_uploader` and `admin`. Lifecycle remains `DRAFT`, `CONFIRMED`, `ARCHIVED`; recipient matching remains `MATCHED`, `UNMATCHED`, `CONFLICT`; backend preview row status remains `VALID`, `INVALID`, `DUPLICATE`, `CONFLICT`.
- No dashboard, history, analytics, recipient-editing, migration, permission, City role, or API alias was added. Data Uploader has no Award-specific audit/history endpoint.
- Legacy Decision Import and Event Registry remain separate domains and were not redesigned by S2.

### Roster state vocabulary

The backend response states and FE review groupings are intentionally
different layers:

- Raw/backend preview row status remains `VALID`, `INVALID`, `DUPLICATE`, or `CONFLICT`.
- Raw/backend recipient matching remains `MATCHED`, `UNMATCHED`, or `CONFLICT`.
- FE presentation grouping derives staff-facing filters from those values:
  `valid`, `warning`, `invalid`, `duplicate`, `missing_student_code`, and
  `needs_manual_review`.
- The FE grouping is presentation/review guidance only. It does not create
  lifecycle states or replace server validation/matching semantics.

### S2 verification map

- FE presentation unit: `node --test src/features/award-registry/__tests__/presentation.test.ts`.
- FE Award workflow: `npx playwright test tests/award-decision-registry.spec.ts --project=chromium`.
- FE S1 contract and role/navigation regression remain required before release; no database integration coverage is claimed by the FE acceptance tests.
- BE is unchanged by S2; the S1 BE verification baseline remains the applicable BE evidence.

### S3 verification map

- FE City Officer queue: `src/features/review/components/CityOfficerQueue.tsx`, mounted from `/app/queue` for `city_officer`.
- FE queue contract: exactly five canonical criteria (`ethics`, `academic`, `physical`, `volunteer`, `integration`); active tabs use one `status`, while “Đã hoàn thành” uses one `statuses=accepted,rejected` request.
- FE regression: `tests/city-officer-queue-s3.spec.ts` covers server-backed tabs/pagination, claim idempotency and conflict refresh behavior.
- BE contract regression: `tests/unit/review-list-query-contract.test.ts` and `tests/unit/review.routes-access.test.ts` cover union validation, pagination/count scope, workspace isolation and authorization.
- No new endpoint, migration, permission/scope change or school filter was introduced by S3.

S2 and S3 are complete on `feat/staff-review`. S4 has not been started.
