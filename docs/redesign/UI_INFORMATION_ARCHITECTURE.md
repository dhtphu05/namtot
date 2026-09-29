# 5TOT Đà Nẵng — Target Information Architecture

> Phase 1 target, not implemented. The six workspaces below are product concepts over current roles/APIs. Legacy roles/routes remain compatible until separately migrated; this document does not change role behavior or remove routes. State and endpoint detail lives in [the backend contract matrix](BACKEND_UI_CONTRACT_MATRIX.md); existing routes/screens are catalogued in [the inventory](UI_SCREEN_INVENTORY.md).

## Product and interaction contract

1. **Server authoritative.** UI displays server eligibility, lifecycle, permissions, and final outcomes; it does not calculate them locally.
2. **Human authoritative.** AI/OCR/rules may extract, flag, or suggest. A person confirms evidence and makes review/final decisions.
3. **One clear primary action.** Each view emphasizes the next allowed action; secondary actions remain visible but quieter.
4. **Criterion-first for students.** The five criteria are the main progress model: ethics, academic, physical, volunteer, integration. `priority` can be supporting evidence/risk context, never a sixth task.
5. **Task-first for officers.** Landing view answers which review task can be handled now.
6. **Actionable manager dashboard.** Counts link to queues, assignments, exceptions, and cases; avoid a chart gallery.
7. **Configuration-first admin.** Operations home answers “Hệ thống đã sẵn sàng vận hành chưa?” using real readiness data; do not invent an aggregate readiness API.
8. **No raw technical states.** Map backend enums to Vietnamese content; retain enum values only in code/logging.
9. **Destructive actions are explicit.** Cancel, archive, final decision, delete, deactivate, and revoke require the target and consequence to be clear. Safe delete may reject in-use seasons.
10. **Historical integrity.** Archive/cancel do not mean deletion; final reopen preserves prior decision history.
11. **City-only review mental model.** No target-level selector or cascade route in primary navigation. Legacy levels remain a compatibility/data concern.
12. **Scope remains visible.** Show the City/school/workspace context relevant to the data; never imply all modules have the same cross-school access.

## Target navigation by role

### Student — “Hồ sơ của tôi”

- Tổng quan
- Hồ sơ của tôi
- Minh chứng
- Kiểm tra hồ sơ
- Bổ sung *(shown only when an active request exists or as a contextual task; same supplement scope, not a parallel unrestricted editor)*
- Thông báo

Existing routes/components to reuse: `/app/` or `/app/overview`, `/app/application`, `/app/upload`, `/app/ai-precheck`, `/app/event-library`, `/app/result`, `/app/notifications`, and V2 query-state/drawer patterns. Merge duplicate feedback/notifications and upload entry. Keep `/app/cascade`, `/app/wizard`, `/app/evidence`, `/app/drafts`, `/app/my-application`, `/app/profile`, `/app/chatbot` as compatibility redirects/wrappers during migration.

### Data Uploader — “Dữ liệu công nhận”

- Tổng quan
- Quyết định công nhận
- Nhập danh sách *(Award detail/process flow, not the legacy Decision Import unless the backend product flow is explicitly reconciled)*
- Lịch sử — **BLOCKED_BY_BACKEND**: no Award history endpoint and general audit excludes `data_uploader`.

Existing `/app/data-uploader` is a landing/instruction page and `/app/award-registry` + detail are the real operational workspace. “Tổng quan” can be a compact view composed from existing list/status APIs if the needed aggregates suffice. Draft roster rows can be corrected and reverted through the released endpoints. Keep validation, duplicate detection, and matching server-owned. Uploader history remains **BLOCKED_BY_BACKEND** because Award has no history endpoint and general audit excludes `data_uploader`.

### City Officer — “Xét duyệt”

- Việc cần xử lý
- Đang xét
- Chờ bổ sung
- Cần Hội đồng
- Đã hoàn thành

These are views/filters of review tasks, not new states or necessarily five separate routes. Use queue/dashboard APIs and task status enums. Keep `/app/queue`, `/app/review/$id`, and escalation path. Evidence search can be secondary. City Officer does not use the legacy evidence-knowledge page or precedent panel: the approved-evidence endpoints are legacy-role scoped, and the separate City Knowledge Base has a different data contract.

### City Manager — “Điều hành mùa xét”

- Điều hành mùa xét
- Hồ sơ
- Phân công cán bộ
- Cần Hội đồng
- Kết quả
- Báo cáo

Existing routes: `/app/analytics`, `/app/queue` (currently hidden from City Manager nav despite direct access), `/app/assignment`, `/app/resolution`, `/app/manager/results`, `/app/export`, plus season operations. Season CRUD is supported. Do not surface the legacy evidence-knowledge page to City Manager. Initial submission and configured supplement-season cutoffs are enforced; per-request due dates and review/final milestones are informational, not action locks or enforced SLAs.

### City Committee — “Hội đồng”

- Cần Hội đồng
- Kết quả cuối
- Lịch sử

Use the City Committee inbox (`/api/manager/committee-inbox`), resolution case detail, and explicit final result/history APIs. Frontend `/app/committee/inbox` currently corresponds to a separate legacy `/api/committee/inbox`; this is a contract mismatch to resolve during implementation. Audit log access is available to City Committee. Do not surface the legacy evidence-knowledge page. Target resolution decisions use `/resolve`; the case-only legacy status PATCH is denied to City roles. No committee role may be inferred from the screen name alone; retain backend authorization.

### Admin — “Vận hành hệ thống”

- Tổng quan vận hành
- Mùa xét
- Đơn vị & Trường
- Người dùng
- Cán bộ xét *(filtered view of Người dùng if useful; same CRUD component/API)*
- Bộ tiêu chí — **BLOCKED_BY_BACKEND** for editing; active config is read-only.
- Nhật ký hệ thống

Workspace management and season operations have APIs. Readiness overview may compose currently available workspace/season/user data; if no aggregate endpoint exists, do not present fabricated “ready” status. Admin password reset is a committed admin-only capability.

## High-level target screen blueprint

| Target screen | Purpose / primary user | Primary action | Secondary actions | Backend source | Key states | Predecessor → successor |
|---|---|---|---|---|---|---|
| Student Tổng quan | Give student current status and next step | Continue the next allowed task | View eligibility, notices, five-criterion progress | Current application, eligibility, season, notifications | No application, draft, ready, submitted, supplement required, completed/rejected; lifecycle overlay | Sign in → Hồ sơ của tôi / Minh chứng / Thông báo |
| Hồ sơ của tôi | Manage one City application around five criteria | Open the criterion or action needing attention | View details/history, open event library | Application + criterion tasks/evidence | Five criteria, app lifecycle, eligibility, season window | Tổng quan → Minh chứng / Kiểm tra hồ sơ / Submit |
| Minh chứng | Add and review evidence by criterion | Add evidence | Open event library, inspect extracted card, retry supported processing | Evidence, upload, OCR/jobs, event registry | Uploading, processing, preview ready, needs confirmation, confirmed, failed | Hồ sơ của tôi → Kiểm tra hồ sơ / Bổ sung / Submit |
| Kiểm tra hồ sơ | Show advisory issues before submit | Review a specific issue | Re-run check, edit linked evidence | Precheck/rules + application | Advisory findings from server; never a final decision | Hồ sơ/Minh chứng → Hồ sơ của tôi |
| Bổ sung | Let student satisfy only a live request | Update requested evidence/criterion and resubmit | Ask for help, inspect request/history | Active SupplementRequest, scoped evidence/criteria, deadlines | Active request, scope violation, not ready, deadline closed, resubmitted | Review decision → Bổ sung → Review resumes |
| Thông báo (student) | Communicate requested actions/outcomes | Open the linked item | Mark read / mark all read | User-scoped paginated notifications | Unread/read, empty, load error | Any workflow → linked screen |
| Uploader Tổng quan | Surface roster work needing attention | Open processing/attention item | Start new recognized decision | Award decision list/status APIs | Draft, processing states, confirmed, archived | Sign in → Decision Registry |
| Quyết định công nhận | Maintain decision record and roster | Create/import a decision or continue processing | Filter/search/archive/unarchive | Award Decision list/detail | DRAFT/CONFIRMED/ARCHIVED; recipient and preview row statuses | Tổng quan → Nhập danh sách / Chi tiết |
| Nhập danh sách / detail | Process OCR roster and verify before confirm | Start/retry supported processing or confirm reviewed decision | Correct/revert draft row; archive/unarchive | Award processing, paged preview, confirm/archive/correction APIs | not_started/processing/failed/preview_ready; VALID/INVALID/DUPLICATE/CONFLICT; MATCHED/UNMATCHED/CONFLICT | Decision Registry → preview → confirm → registry |
| Lịch sử (uploader) | Show uploader audit/history | None until API exists | — | No Award history endpoint; general audit denies uploader | — | **BLOCKED_BY_BACKEND** |
| Việc cần xử lý (Officer) | Present actionable queue | Claim an available task | Filter by criterion/status/risk/due/search | Review dashboard/tasks | waiting/reviewing and derived filter groups | Sign in → Queue → Review detail |
| Review detail | Review one criterion task with its evidence | Record allowed criterion decision | Request supplement, escalate, inspect timeline/reference | Review detail/decision/supplement/escalation | task status, assigned/unassigned, evidence processing, request state | Queue → Detail → queue / Supplement / Resolution |
| Xét duyệt queues (Officer) | Separate current work, waiting, supplement and completed tasks | Open a task | Filter/sort/page | Same tasks endpoint with supported filters | Derived views over backend task statuses | Queue → detail |
| Officer reference lookup | Find related evidence/precedent | Open reference detail | Search/filter | Officer evidence-knowledge API or general KB if aligned | Reference knowledge outcome enum | Review detail → reference → review detail; City roles currently lack permission on both FE-used officer knowledge routes and review precedent check. |
| Manager Điều hành mùa xét | Show readiness and work requiring action | Open highest-priority blocked workload | Drill down to queue, assignment, season, cases | Analytics + season + manager APIs | Season submission status, workload counts, exception state | Sign in → Hồ sơ / Assignment / Hội đồng / Results |
| Hồ sơ (Manager) | Find application across permitted scope | Open application detail | Search/filter by server-supported fields | Manager applications/results APIs | app state + cancellation/archive overlay | Overview → application detail → assignment/case/result |
| Phân công cán bộ | Balance tasks across active specialized officers | Assign or reassign selected task(s) | Inspect workload | Review assignment/workload APIs | Assigned/unassigned; officer active/specialization | Queue/results → Assignment → officer work queue |
| Cần Hội đồng (Manager/Committee) | Resolve escalated cases | Open or resolve a case according to role | Reopen supported case, inspect timeline | Resolution cases/detail/mutations | open/in_review/resolved/rejected; decision outcome | Review escalation → case → resolution/follow-up |
| Kết quả | Make/view explicit final decisions | City Manager/Committee authorized final action | Inspect five criterion results and history | Manager results, aggregation, finalize/reopen | pending/passed/failed/partially_passed; final history | Review tasks → results → student outcome |
| Báo cáo | Track operational metrics and export data | Export supported dataset | Filter by year/status/scope | Analytics + exports | Data freshness, export file status | Overview → report → export/download |
| Committee inbox | Triage City Committee work | Open relevant case | Inspect application/final history | `/api/manager/committee-inbox` for City roles | Resolution/task DTO states | Sign in → case / final result |
| Kết quả cuối / history | Review canonical outcome and prior decisions | Open final detail | Reopen only when permitted, with reason | Manager final result/history APIs | final status, official-current/history, cancelled/archived overlay | Inbox/results → final detail |
| Admin Tổng quan vận hành | Answer whether core configuration is usable | Open a concrete setup issue | Navigate to season/workspaces/users/logs | Compose existing admin APIs; aggregate readiness API unverified | Only server-derived facts; no synthetic overall readiness | Sign in → configuration detail |
| Mùa xét | Configure one City review season and exceptions | Create/update valid season | View application count, manage exception | City review seasons + exception APIs | NOT_CONFIGURED/NOT_OPEN/OPEN/EXCEPTION_ACTIVE/CLOSED; version conflicts | Admin overview → season → manager operations |
| Đơn vị & Trường | Maintain supported workspace tree | Create/update/status or attach/detach supported parent | View users/application count | Admin workspace API | CITY/UNIVERSITY_SYSTEM/SCHOOL; active/inactive; parent constraint | Admin overview → workspace detail |
| Người dùng / Cán bộ xét | Maintain user access and officer criteria | Create/update/deactivate user | Manage specializations, reset only when released | Admin users/specialization APIs | role/workspace/active; five canonical specialization values | Admin overview → user detail → assignment |
| Bộ tiêu chí | Explain currently active criteria config | Read active configuration | No edit action until backend supports it | `GET /api/criteria/configs/active` | Active DTO/version only | **BLOCKED_BY_BACKEND** for draft/check/apply |
| Nhật ký hệ thống | Inspect append-only operational actions | Filter/open audit record | Export only if supported | `/api/audit/logs` | Paginated audit records, scoped | Any admin/manager action → audit |

## Legacy compatibility and convergence plan

- Keep current route URLs alive during subsequent implementation; redirects already exist for `/app/evidence`, `/app/drafts`, `/app/my-application`, `/app/profile`, `/app/chatbot`, `/app/manager/result`, `/app/admin/workspace`, and `/admin`.
- Converge duplicated student `/app/` and `/app/overview`; `/app/feedback` and `/app/notifications`; `/app/data-uploader` landing and Award Registry; `/app/admin/officers` and `/app/admin/users`; City Committee inbox and its City manager-module API.
- Remove target-level/cascade/wizard concepts from the target navigation, but do not remove old handlers/data in this phase.
- Keep legacy Decision Import separate from Award Registry. Its audit endpoint now verifies import scope and filters returned audit rows to the same workspace; it remains a legacy staff flow, not the uploader workflow.
- Keep technical integration pages (`/app/ekyc`, `/app/vnpt`) out of top-level navigation unless identity verification is made a defined product task.
- Use existing master-detail, split evidence viewer, three-column review, scoped supplement, explicit confirmation, async polling, and manager drill-through patterns as documented in the inventory.

## Backend-gated IA items

| Target item | State | Requirement before UI claims capability |
|---|---|---|
| Uploader Lịch sử | `BLOCKED_BY_BACKEND` | Award-scoped audit/history read endpoint with uploader role and issuer workspace scope. |
| Admin Bộ tiêu chí editor | `BLOCKED_BY_BACKEND` | Defined criteria config mutation API and draft/version/apply behavior. |
| City precedent/knowledge panel | Not in target City UI | City roles have no legacy page/menu/query access. A later City precedent feature needs an explicit scoped data and API contract; do not repoint to the separate general Knowledge Base by assumption. |
| Enforced review/final deadlines | Backend behavior gap | Define and enforce semantics before presenting deadlines as blockers/SLA. |
| Admin readiness score | `UNVERIFIED` aggregate capability | Compose only observable API facts or define a server-side readiness DTO. |
| Reset-password admin action | Available in committed FE/BE | Admin-only endpoint/UI; reset revokes refresh sessions and returns no password material. |
| Award row correction/revert | Available in committed FE/BE | Draft-only corrections/reverts; backend revalidates rows and FE refetches. |
