# Staff Lane API Contract Matrix — S0

Quy ước: “Match” chỉ có nghĩa path/action/role chính đã đối chiếu; vẫn cần test contract trước khi coi là freeze. “Mismatch” là có bằng chứng source-level, không phải suy đoán.

## 1. FE ↔ BE matrix

| Domain | FE source / path | BE source / path | FE roles | BE roles | Kết quả |
|---|---|---|---|---|---|
| Award Registry list/detail | `src/features/award-registry/api/award-registry.ts` → `/api/award-decisions`, `/:id` | `src/modules/award-decisions/award-decisions.routes.ts` | `data_uploader`, `admin` | `data_uploader`, `admin` | Match |
| Award Registry upload/process | `/files/:kind`, `/process-roster`, `/roster-processing`, `/roster-preview` | same router | same | same router-wide guard | Match; preserve as separate domain |
| Award Registry confirm/recipients | `/confirm`, `/recipients` | same router | same | same | Match |
| Review queue/dashboard | `src/features/review/api/review.ts` → `/api/review/tasks`, `/dashboard` | `src/modules/review/review.routes.ts` | officer/manager/committee/city_officer/city_manager/admin; City Committee is absent in FE review guard | officer/manager/committee/city_officer/city_manager/city_committee/admin | City Officer queue now uses server-side `status` or backward-compatible `statuses` union; role matrix otherwise unchanged |
| Review task detail/timeline | `/api/review/tasks/:id`, `/timeline`, `/criterion-level-assessment` | same routes | same FE review set | same plus City Committee | Partial |
| Review claim | `/api/review/tasks/:id/claim` | same route; service uses conditional update and application lock | FE action is officer-oriented | `officer`, `city_officer` | Match |
| Review decision/supplement/escalation | `/decision`, `/request-supplement`, `/escalate-resolution` | same routes | FE screen can render several roles | BE route accepts broad City/legacy roles, service applies task permissions | Route match; semantic mismatch for City Committee needs decision |
| Precedent check | `/precedents/check` | same route | FE review detail may render panel for legacy-compatible roles | BE only officer/manager/committee/admin | City roles cannot use it; docs/nav must say so |
| Resolution list/detail/resolve | `src/features/resolution/api/resolution.ts` → `/api/resolution/cases`, `/:id`, `/:id/resolve` | `src/modules/resolution/resolution.routes.ts` | all resolution roles | all resolution roles; manage roles include City Committee | Match for canonical `/resolve` |
| Resolution legacy status | no current canonical FE call found | deprecated `/cases/:id/status` | N/A | manager/committee/admin only | Keep compatibility; do not make it Staff Lane canonical |
| Manager applications/results | `src/features/manager/api/manager.ts` → `/api/manager/applications`, `/results`, detail/summary/aggregation | `src/modules/manager/manager.routes.ts` | manager/committee/city_manager/city_committee/admin | same | Match |
| Finalize/reopen/archive/cancel | manager API lifecycle calls | same manager routes | UI finalizer set broad | BE role checks are endpoint-specific; cancel/archive mainly city_manager/admin | Partial; document per action |
| Assignment/reassignment | `src/features/review/api/manager.ts` → `/api/manager/review-tasks/:id/assign` | manager routes POST/PATCH | FE route allows legacy Committee | BE only manager/city_manager/admin | Mismatch: `committee` must not see actionable assignment |
| Workload/dashboard | `/api/manager/workload`, `/workloads`, `/dashboard-summary` | same paths | manager/committee/city_manager/admin | same | Match |
| City season/deadline | `src/features/manager/api/city-season.ts` | city review season/deadline routes | city_manager surfaces | city_manager/admin | Match |
| Committee inbox | `src/features/manager/api/manager.ts` → `/api/committee/inbox` | `src/modules/committee/committee.routes.ts` → `/inbox` | component is reachable from committee surface | BE route only manager/committee/admin | Mismatch for City roles; manager module has `/api/manager/committee-inbox` with City roles |
| Audit list | `src/features/audit/api/audit.ts` → `/api/audit` | `src/modules/audit/audit.routes.ts` → `/api/audit/logs` | manager/committee/city_manager/city_committee/admin by guard/nav intent | manager/committee/city_manager/city_committee/admin | P1 path mismatch |
| Audit entity timeline | FE → `/api/audit/entity/:entityType/:entityId` | no matching route found in audit router | intended manager/admin-style roles | N/A | P1 missing contract |
| Evidence Knowledge search/detail | `src/features/evidence-knowledge/api/evidence-knowledge.ts` → `/api/evidence-knowledge/officer/*` | `src/modules/evidence-knowledge/evidence-knowledge.routes.ts` | FE guard only officer/manager/committee/admin | BE officer/manager/committee/admin | Match as legacy-only; mismatch with context docs that imply City access |
| Event Registry | event feature APIs/routes | event module routes | FE includes City roles in role list | verify per event route; current context says City support | Needs dedicated S1 contract test |
| Export | `src/features/export/api/export.ts`, resolution export | `src/modules/exports/exports.routes.ts` | manager/committee/city_manager/city_committee/admin | same | Match |
| Admin users | `src/features/admin-users/api/admin-users.ts` | `src/modules/users/users.routes.ts` `/api/admin/users*` | admin | admin | Match |
| Admin workspaces | `src/features/admin-workspace/api/admin-workspace.ts` | `src/modules/workspaces/workspaces.routes.ts` `/api/admin/workspaces*` | admin | admin | Match |
| Admin specialization | admin users API specializations | user admin route | admin | admin | Match |
| Legacy Decision Import | `src/features/decision-import/*` → `/api/decision-imports*` | `src/modules/decision-imports/decision-imports.routes.ts` | FE guard/nav includes officer/manager/committee/admin | BE router only officer/manager/admin | Mismatch for Committee; separate from Award Registry |

## 2. Contract-specific details

### Award Registry

Canonical endpoints are the `award-decisions` family. Router-wide BE guard is `data_uploader` or `admin`; no City role is implied. Exact lifecycle values are `DRAFT`, `CONFIRMED`, `ARCHIVED`, recipient match values are `MATCHED`, `UNMATCHED`, `CONFLICT`. The roster workflow has processing, preview, mapping, row correction, confirm and recipients; no recipient editing endpoint was found.

### Review

Review task actions are separate from role guard:

- Route guard determines whether the user may call an endpoint.
- `ReviewService.getTaskPermissions` determines view/act/claim for the specific task.
- Officer/city officer claim is specialization-based.
- City individual applications are hidden from legacy `officer/manager/committee` in service logic.
- City Manager can coordinate/view City individual tasks, while City Committee is resolution-view only in task permissions.
- City Officer queue tabs use the existing endpoint: one `status` for each active state and one `statuses=accepted,rejected` request for completed tasks. The server validates, trims/deduplicates and applies the union before count/pagination; `status` and `statuses` together are invalid.

This two-layer behavior must be represented in FE types and acceptance tests; checking only HTTP role lists is insufficient.

### Resolution

`POST /api/resolution/cases/:id/resolve` is the current canonical write path. The deprecated status route should not be used for new Staff Lane UI. Resolution manager roles include legacy manager/committee, City Manager, City Committee and admin; officer visibility is constrained by ownership/specialization.

### Audit

BE currently provides `GET /api/audit/logs` only. The FE has two calls with different assumptions: a collection call at `/api/audit` and entity detail at `/api/audit/entity/...`. Neither should be treated as frozen until one side is aligned and covered by a route-access test.

### Legacy import versus Award Registry

Do not merge these concepts:

- Award Registry is data-uploader/admin and models an award decision plus roster ingestion/matching.
- Decision Import is an older officer/manager/admin pipeline with metadata/tables/preview/column mapping/confirm/cancel/audit.

The FE still exposes both. S0 records this as compatibility, not as permission to refactor.

## 3. Error/response observations

- FE API adapters frequently normalize missing data to empty arrays/objects and map unknown raw values to UI fallbacks. This is useful for legacy responses but can conceal a path/shape mismatch.
- Review decision validation requires notes for reject/supplement/resolution; accept requires `officerSuggestedLevel`.
- Review claim uses conditional `assignedOfficerId: null` update and application lock for individual applications; conflict is a real expected error path.
- Resolution response normalizes legacy workflow aliases (`analyzing`, `committee_review`, `closed`) to current stored statuses; these aliases must stay documented if retained.

## 4. Freeze gate

Before S1 runtime work, add/approve a contract test table for every P1 row above. Until then, FE adapters should not invent new fallback values or new endpoint aliases.

## 5. S1 approved contract overrides — 2026-09-30

The S0 mismatch rows are now aligned as follows:

| Contract | Canonical S1 decision |
|---|---|
| Audit collection | FE Staff Audit calls `GET /api/audit/logs`. `/api/audit` and `/api/audit/entity/:entityType/:entityId` are not aliases and are not used by Staff Lane. Decision Import audit remains `GET /api/decision-imports/:id/audit`. |
| Evidence Knowledge / precedents | Legacy-only roles remain `officer`, `manager`, `committee`, `admin`. City roles have no Knowledge nav/access and City Officer review does not request `/api/review/tasks/:id/precedents/check`. |
| Committee Inbox | City Manager and City Committee use `GET /api/manager/committee-inbox`; legacy Manager, Committee and Admin retain `GET /api/committee/inbox`. FE query cache includes role to avoid cross-lane response reuse. |
| Legacy Committee capability | Committee nav no longer exposes `/app/assignment`, `/app/decision-imports` or `/app/settings`. Existing backend compatibility routes and permissions remain unchanged. |
| Individual City criteria | Public City individual criterion rows are exactly `ethics`, `academic`, `physical`, `volunteer`, `integration`. `priority` and `collective` remain auxiliary/legacy and are not removed from Prisma or legacy workflows. |
| City Committee review authority | City Committee may read resolution-needed task context but cannot call normal ReviewTask decision, supplement or escalation routes. Resolution and finalization routes remain canonical; City Manager/Admin authority is unchanged. |

The executable contract coverage is in FE `tests/staff-contract-alignment.spec.ts` and BE `tests/unit/review.routes-access.test.ts`, `staff-core-criteria.test.ts`, plus the existing City scope/task/analytics/resolution suites listed in the S1 audit addendum.
