# 5TOT Đà Nẵng — UI Screen Inventory

> Audit snapshot: local worktrees on 2026-09-29. The first inventory pass was documentation-only and recorded pre-existing WIP at that time. Phase 1.5 subsequently closed the Decision Import audit scope issue and aligned City knowledge/precedent routes with current API permissions; committed feature behavior is reflected in the rows below and in the backend contract matrix.

## Scope and source map

The frontend has **54 file-based routes** under `namtot/src/routes`. The repository convention places product documentation under `namtot/docs`; therefore the requested deliverables are created in `namtot/docs/redesign/`. The API source is the sibling repository `sv5tot-backend`.

Common frontend sources: `namtot/src/routes/`, `src/features/auth/route-guard.ts`, `src/features/auth/role-map.ts`, `src/components/layout/Sidebar.tsx`, `src/features/core/components/AppLayout.tsx`, `src/lib/api/client.ts`, and `src/lib/levels.ts`. Common backend sources: `sv5tot-backend/prisma/schema.prisma`, `src/shared/utils/review-workspace-scope.ts`, and module route/service/repository files referenced in [the contract matrix](BACKEND_UI_CONTRACT_MATRIX.md).

Decision values below are UX recommendations only: **KEEP** retain the route/surface, **SIMPLIFY** retain with less emphasis or fewer controls, **MERGE** converge duplicate surfaces, **REMOVE** recommendation to remove from the eventual target UX (not code deletion), and **REDESIGN** preserve function but replace current information hierarchy/content. No route is removed by this audit.

Product invariant for every student/reviewer screen: the five City criteria are `ethics`, `academic`, `physical`, `volunteer`, and `integration`. `priority` is supporting evidence/risk context only; it is not a sixth review task. Backend task creation is in `sv5tot-backend/src/modules/applications/applications.service.ts:createReviewTasksForSubmit` and is covered by `tests/unit/review-ensure-tasks.test.ts`.

## Route inventory

| ID | Current Route | Current Screen | Current Roles | Business Purpose | Main Backend Dependencies | Current Problems | Decision | Target Screen |
|---|---|---|---|---|---|---|---|---|
| FE-01 | `/` | Landing page | Public | Explain service and enter app | Public/static | Product landing is outside authenticated operations | SIMPLIFY | Public entry |
| FE-02 | `/login` | Sign in | Public | Authenticate and route by role | auth login, `/api/me` | Role routing is appropriate; copy must align with six target workspaces | REDESIGN | Sign in |
| FE-03 | `/signup` | Sign up | Public | Create student account | auth signup | Keep student-only onboarding contract visible | SIMPLIFY | Student registration |
| FE-04 | `/admin` | Redirect | Authenticated/admin intent | Compatibility entry to workspace administration | none; redirects to `/app/admin/workspaces` | Alias only | KEEP | `/app/admin/workspaces` |
| FE-05 | `/app` | Authenticated app shell | Authenticated | Load current user/workspace and shared shell | `/api/me`; workspace/role checks | Parent route and `AppLayout` both perform guard/context work | REDESIGN | Role-aware app shell |
| FE-06 | `/app/` | Role-dependent home | All authenticated roles | Student overview or legacy dashboard | application, eligibility, manager analytics depending role | Divergent home content hidden behind same URL | REDESIGN | Per-role overview |
| FE-07 | `/app/overview` | Student overview alias | Student | Show application progress | application/eligibility/season data | Duplicates `/app/` student overview | MERGE | Hồ sơ của tôi overview |
| FE-08 | `/app/application` | Student Application Workspace V2 | Student | Manage application, five criteria and evidence | applications, evidence, eligibility, events, AI advisory | Several tasks share a large workspace; exact query state drives tabs/drawers | REDESIGN | Hồ sơ của tôi |
| FE-09 | `/app/result` | Student final result | Student | View final outcome | manager result/final status | Separate result route may duplicate application status summary | MERGE | Hồ sơ của tôi / Kết quả |
| FE-10 | `/app/event-library` | Approved evidence/event library | Student | Find recognized events usable as evidence | events/approved evidence | Distinct catalog is useful but should connect directly to evidence entry | KEEP | Minh chứng / Sự kiện được công nhận |
| FE-11 | `/app/assistant` | Student support assistant | Student | Explain rules and guide student | student assistant/explanation | Must avoid implying automated eligibility or approval | SIMPLIFY | Hướng dẫn hồ sơ |
| FE-12 | `/app/upload` | Evidence Workspace Safe | Student | Upload evidence and track processing | evidence upload, OCR/indexing jobs, evidence card | Overlaps evidence management in V2 workspace | MERGE | Minh chứng |
| FE-13 | `/app/ai-precheck` | Role-switched precheck | Student, class representative; legacy UI for other allowed roles | Advisory check or legacy precheck | application precheck/rules; role-dependent services | Same URL renders materially different tools; AI label may overpromise | REDESIGN | Kiểm tra hồ sơ (student); remove from target staff IA |
| FE-14 | `/app/cascade` | Student tracking tab or legacy cascade screen | Student sees V2 tab; legacy cascade guard permits selected staff | Track legacy multi-level/cascade outcomes | legacy application target-level/cascade services | Carries retired multi-level mental model; student route is a tab projection | REMOVE | No cascade target; preserve compatibility route during migration |
| FE-15 | `/app/wizard` | Student workspace info tab or legacy wizard | Student; legacy role-dependent | Guided application setup | application, target-level legacy fields | Legacy target-level steps conflict with City-only product target | REMOVE | Student onboarding inside Hồ sơ của tôi |
| FE-16 | `/app/feedback` | Notifications surface | Student-specific wrapper; fallback also Notifications | Feedback/notification inbox | notifications | Duplicate of `/app/notifications`; mobile nav omits feedback | MERGE | Thông báo |
| FE-17 | `/app/notifications` | Notifications | Authenticated roles | View and mark notices | `/api/notifications` | Duplicate student destination; role-specific content needs one consistent entry | MERGE | Thông báo |
| FE-18 | `/app/evidence` | Redirect alias | Authenticated | Compatibility path to student application | none; redirects `/app/application` | Not a distinct screen | KEEP | `/app/application` |
| FE-19 | `/app/drafts` | Redirect alias | Authenticated | Compatibility path to application | none; redirects `/app/application` | Not a distinct screen | KEEP | `/app/application` |
| FE-20 | `/app/my-application` | Redirect alias | Authenticated | Compatibility path to application | none; redirects `/app/application` | Not a distinct screen | KEEP | `/app/application` |
| FE-21 | `/app/profile` | Redirect alias | Authenticated | Compatibility path to application | none; redirects `/app/application` | Profile path currently does not render a profile page | KEEP | `/app/application` (reassess profile need separately) |
| FE-22 | `/app/chatbot` | Redirect alias | Authenticated | Compatibility path to assistant | none; redirects `/app/assistant` | Duplicate route | KEEP | `/app/assistant` |
| FE-23 | `/app/collective` | Collective workspace | Class representative (legacy) | Coordinate class/collective applications | collective application endpoints | Legacy role/surface outside six target roles | SIMPLIFY | Compatibility-only legacy workspace |
| FE-24 | `/app/collective/$id` | Collective application detail | Class representative (legacy) | Review collective application detail | collective/application APIs | Legacy multi-actor workflow; no target IA placement | SIMPLIFY | Compatibility-only legacy workspace |
| FE-25 | `/app/ekyc` | eKYC integration | Authenticated/role-gated by page | Identity verification integration | eKYC/VNPT integration | Separate technical integration page, not core target navigation | SIMPLIFY | Identity step only if product flow requires it |
| FE-26 | `/app/queue` | Review queue | Officer, City Officer; direct access also City Manager | Find/claim review work | `/api/review/dashboard`, `/api/review/tasks` | Rich filters, modes, claim and drawers; City Manager can access but sidebar hides it | REDESIGN | Việc cần xử lý / Xét duyệt |
| FE-27 | `/app/review/$id` | Review task detail | Officer/City Officer, manager read/coordination paths | Assess one criterion, request supplement or escalate | review task/detail/assessment/timeline/precedent APIs | Dense tabs/panels; preserve criterion scope and human decision. FE precedent queries/details are limited to legacy officer/manager/committee/admin roles; City roles do not use the legacy panel | REDESIGN | Đang xét / Chi tiết hồ sơ |
| FE-28 | `/app/evidence-search` | Evidence search | Legacy officer/manager/committee/admin; target role access must be checked | Search evidence | evidence search APIs | Legacy-role page; not equivalent to student evidence management | SIMPLIFY | Officer evidence lookup |
| FE-29 | `/app/evidence-knowledge` | Officer evidence knowledge | Legacy officer/manager/committee/admin | Search/read precedent knowledge | FE calls `/api/evidence-knowledge/officer/*` | City roles are denied by route guard and have no nav link; legacy route permission now matches its API allowlist | REDESIGN | Legacy reference knowledge only |
| FE-30 | `/app/resolution` | Resolution case list | City Manager, City Committee, City Officer scoped; legacy equivalents | Triage/escalate cases | `/api/resolution/cases`, `/my-escalations` | “Resolution Hub” title is legacy jargon; filters need role-aware actions | REDESIGN | Cần Hội đồng xem xét |
| FE-31 | `/app/resolution/$id` | Resolution detail | Same, scoped | Resolve case and inspect evidence/history | resolution detail/resolve/status/reopen APIs | Target City decisions use transactional resolve; the case-only status PATCH is deprecated, legacy-only, and not used by FE | REDESIGN | Chi tiết cần Hội đồng xem xét |
| FE-32 | `/app/analytics` | City analytics or legacy analytics | City Manager/admin, legacy manager/committee | Monitor case load/results | manager analytics/aggregates | One route branches to distinct screens; chart-heavy view should become actionable | SIMPLIFY | Điều hành mùa xét / Báo cáo |
| FE-33 | `/app/assignment` | Assignment workload | City Manager/admin according to route guard | Assign/reassign City Officers | review assignment/workload APIs | Legacy manager/committee see a nav item but are redirected by route policy | REDESIGN | Phân công cán bộ |
| FE-34 | `/app/manager/results` | Results list | City Manager, City Committee, admin and permitted legacy manager roles | Aggregate and finalize applications | manager results/aggregation/finalization APIs | Finalization must stay an explicit human action | REDESIGN | Kết quả |
| FE-35 | `/app/manager/results/$applicationId` | Result detail | Same as results list | Inspect criterion outcomes and final history | manager application result/final history APIs | Legacy lower-level/downrank concepts remain visible in UI | REDESIGN | Kết quả cuối / Chi tiết hồ sơ |
| FE-36 | `/app/manager/collective` | Manager collective view | City Manager, City Committee | Review collective information | collective/manager APIs | Not a core six-role product concept; validate whether data still has an operational purpose | SIMPLIFY | Compatibility or remove from target IA after product decision |
| FE-37 | `/app/manager/result` | Redirect alias | Manager roles | Compatibility route | none; redirects to `/app/manager/results` | Singular duplicate route | KEEP | `/app/manager/results` |
| FE-38 | `/app/committee/inbox` | Legacy Committee inbox | Legacy committee roles | Read committee inbox | `/api/committee/inbox` (legacy role API) | City Committee uses separate `/api/manager/committee-inbox`; screen/API split | MERGE | Hội đồng inbox (target City Committee API) |
| FE-39 | `/app/award-registry` | Award Registry list | Data Uploader, admin | Maintain recognized decisions and rosters | `/api/award-decisions` | Draft row correction/revert is implemented; Award-specific history remains unavailable | REDESIGN | Quyết định công nhận |
| FE-40 | `/app/award-registry/$awardDecisionId` | Award detail and roster | Data Uploader, admin | Process roster, resolve rows, confirm/archive | decision detail, process, preview, confirm, archive, correction/revert APIs | OCR preview states and row-level problems need explicit mapping; correction is draft-only and server recalculates validation/matching | REDESIGN | Quyết định công nhận / Chi tiết |
| FE-41 | `/app/data-uploader` | Data uploader landing/info | Data Uploader | Explain upload workflow and link registry | award registry APIs indirectly | Not an actual upload control; target “Nhập danh sách” has no direct screen here | MERGE | Quyết định công nhận / Nhập danh sách |
| FE-42 | `/app/decision-imports` | Legacy decision import list | Legacy officer/manager/admin | OCR-based import of recognition decisions/events | `/api/decision-imports` | Different workflow from Award Registry; API is legacy-role scoped and preview not paged | SIMPLIFY | Compatibility-only; do not present as current Award import without migration |
| FE-43 | `/app/decision-imports/$decisionImportId` | Legacy decision import detail | Legacy officer/manager/admin | Inspect OCR/import status, preview and audit | decision-import detail/status/preview/audit APIs | Audit checks import and audit-row workspace scope; admin stays global. Not a substitute for Award history | SIMPLIFY | Compatibility-only |
| FE-44 | `/app/event-registry` | Event registry | Admin, data/legacy staff depending guard | Manage recognized events and rosters | `/api/events` | Shared screen has role-specific read/write needs | SIMPLIFY | Admin/reference operations; uploader access only where allowed |
| FE-45 | `/app/export` | Export page | Manager, committee, City roles, admin | Export applications/review results | `/api/exports/*` | Export does not use regular page pagination; scope and filters must be explicit | KEEP | Báo cáo / Xuất dữ liệu |
| FE-46 | `/app/audit` | Audit log | Manager, committee, City Manager, City Committee, admin | Inspect operational history | `/api/audit/logs` | Data Uploader is denied; Award Registry lacks dedicated history API | KEEP | Lịch sử hoạt động |
| FE-47 | `/app/admin/workspaces` | Workspace administration list | Admin | Create/manage organizations and hierarchy | `/api/admin/workspaces` | Hierarchy constraints must be explained (School parent null or active University System) | REDESIGN | Đơn vị & Trường |
| FE-48 | `/app/admin/workspaces/$workspaceId` | Workspace detail | Admin | Update workspace, status, membership | workspace detail/status/users APIs | No delete; no type/code edit; parent changes constrained once applications exist | REDESIGN | Đơn vị & Trường / Chi tiết |
| FE-49 | `/app/admin/workspace` | Redirect alias | Admin | Compatibility path | none; redirects `/app/admin/workspaces` | Singular duplicate route | KEEP | `/app/admin/workspaces` |
| FE-50 | `/app/admin/users` | User administration | Admin | Create/manage users and roles | `/api/admin/users`, reset-password endpoint | Admin-only password reset revokes refreshable sessions and returns no password material | REDESIGN | Người dùng |
| FE-51 | `/app/admin/officers` | Officer-only user list | Admin | Manage officer accounts | same AdminUsersPage, officersOnly | Shared component with a filtered view; avoid separate duplicated CRUD | MERGE | Người dùng / Cán bộ xét |
| FE-52 | `/app/settings` | Settings | Authenticated/role-dependent | Personal/app settings | user/me settings APIs | Target operations IA does not define a distinct screen; verify which settings are active | SIMPLIFY | Account menu or role settings |
| FE-53 | `/app/smartux` | Smart UX placeholder | Authenticated | Placeholder/experimental screen | No stable backend contract identified | Placeholder; no target workflow purpose | REMOVE | None in production IA |
| FE-54 | `/app/vnpt` | VNPT integration | Authenticated/role-gated | Technical identity integration | VNPT/eKYC APIs | Integration surface should not be a main destination | SIMPLIFY | Identity step or admin diagnostics |

## Role-by-role current surfaces

### Student

Current primary surfaces are `/app/` and `/app/overview` (same V2 overview), `/app/application`, `/app/event-library`, `/app/result`, `/app/assistant`, `/app/upload`, `/app/ai-precheck`, and `/app/feedback`/`/app/notifications`. The application V2 is already criterion-first and uses route search fields including `criterion`, `evidenceId`, `eventId`, `mode`, `reviewTaskId`, and `uploadEvidence`; it combines eligibility/deadline, evidence, and application actions. Retain this as the flow anchor, then converge upload/precheck/supplement into explicit views or states of the same application workspace.

Legacy paths `/app/cascade` and `/app/wizard` either project old multi-level concepts or render legacy pages. The student wrapper also uses application workspace tabs. Keep compatibility while the eventual target UX stops teaching target-level/cascade concepts. Sources: `src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx`, `StudentApplicationActionWorkspace.tsx`, `src/features/application/route-search.ts`, `src/routes/app.cascade.tsx`, and `src/routes/app.wizard.tsx`.

### Data Uploader

The current route is `/app/data-uploader`, an informational landing page linked to `/app/award-registry`; the actual work is in Award Registry list/detail. Keep the async roster process, preview, confirmation, and archive/unarchive. Draft row correction/revert is now implemented in both repos; there is still no Award-specific audit/history API, and general `/api/audit/logs` does not allow `data_uploader`. Sources: `src/features/award-registry/*`, backend `src/modules/award-decisions/*`, and award roster tests.

### City Officer

The target officer workflow should center on `/app/queue` then `/app/review/$id`, with outcomes “đang xét”, “chờ bổ sung”, “cần Hội đồng”, and completed represented as task filters rather than invented backend states. City Officer has review decision, supplement request, and escalation actions subject to specialization/scope. City roles do not open `/app/evidence-knowledge` or call its legacy API; a future City precedent feature needs a separately verified scoped contract. Sources: `src/routes/app.queue.tsx`, `app.review.$id.tsx`, `app.evidence-knowledge.tsx`; backend `src/modules/review/review.routes.ts`, `review.service.ts`, and `evidence-knowledge/evidence-knowledge.routes.ts`.

### City Manager

Current surfaces include analytics, queue (direct access but hidden from nav), assignment, resolution, manager results, and administrative season/workspace tools. Target is operational overview → queue/assignment/cases/results/reporting. Manager can coordinate and assign but cannot submit criterion decisions. Sources: `src/components/layout/Sidebar.tsx`, `src/features/auth/route-guard.ts`, backend `src/modules/manager/manager.routes.ts`, `review/review-assignment.service.ts`, and `resolution/resolution.routes.ts`.

### City Committee

The target surface is committee inbox/resolution and final results, not general review queues. The frontend has legacy `/app/committee/inbox` and City Committee-specific result/resolution screens; backend City role inbox is a separate manager module endpoint. Committee final decision remains explicit. Sources: `src/routes/app.committee.inbox.tsx`, `app.manager.results.tsx`, backend `src/modules/manager/manager.routes.ts` and `src/modules/resolution/resolution.routes.ts`.

### Admin

Current surfaces cover workspace hierarchy, users/officers, event registry, audit, exports, settings, and some analytics. Admin can globally administer workspaces/users; active criteria configuration is read-only (`GET /api/criteria/configs/active`) with no admin write API and is not the complete runtime rules source. A criteria editor remains **BLOCKED_BY_BACKEND**. Admin password reset is implemented, admin-only, and revokes refreshable sessions.

### Legacy roles and incorrect sharing

Legacy `class_representative`, `officer`, `manager`, and `committee` remain in frontend/backend role unions. `role-map.ts`, `route-guard.ts`, and `Sidebar.tsx` map/share their surfaces with newer City roles. `manager` and `committee` share `LEGACY_MANAGER_NAV`; route guards evaluate City-specific paths before broad legacy manager paths, so some visible legacy links (`/app/assignment`, `/app/manager/collective`, `/app/audit`, `/app/export`) redirect. City Manager can open `/app/queue` directly but lacks a sidebar link. City Committee and legacy committee also use different inbox APIs. These are navigation-contract inconsistencies, not reasons to change backend role behavior in this phase.

## Interaction and component audit

| Pattern | Current implementation | Recommendation |
|---|---|---|
| Reviewer three-column workspace | Review queue/detail components with list, work item and contextual panels | **Reusable with styling/content.** Preserve task-first layout and make claim/decision state clear. |
| Master-detail list | Award Registry, manager results, resolution cases, admin workspaces/users | **Reusable as-is structurally**, with consistent empty/error/filter behavior and server pagination semantics. |
| Split document/evidence viewer | Review detail and evidence panels | **Reusable with styling/content.** Keep evidence context visible while assessing. |
| Supplement by criterion/evidence | RequestSupplementPanel, `mode=supplement`, deep links | **Reusable with backend-aligned wording.** Never unlock the entire application. |
| Resolution/escalation | Review escalation → resolution case list/detail | **Reusable with clearer terminology.** Backend state mutations differ; map actual actions individually. |
| Draft → Check → Apply criteria/config | No verified full admin criteria builder; criteria config endpoint is read-only | **Blocked by backend** for configuration. Do not treat historical UI descriptions as a working feature. |
| Manager overview → drill-down | Analytics/results/assignment pages | **Reusable with structural refactor** toward action counts and drill-through, not chart gallery. |
| Async processing/polling | Job polling 2s; roster 2.5s up to 120s; OCR detail 5s | **Reusable with content/styling.** State when polling ends, keep retry explicit. |
| Confirmation dialog | Claim, finalization, cancellation/archive, destructive admin actions | **Reusable with styling/content.** Include target object and consequence. |
| Student five-criterion spine | V2 app workspace/core criteria | **Reusable with styling/content.** Keep exactly five canonical criterion tasks. |
| Legacy target-level/cascade controls | Old dashboard, wizard, cascade, downrank/finalization UI | **Obsolete in target IA.** Preserve old routes for compatibility pending a later approved migration. |

## Worktree and scope note

At the original audit snapshot, `namtot` had pre-existing uncommitted changes affecting admin reset-password, Award Registry row correction/filtering, student route-search/application workspace, evidence drawer sizing, student assistant explanation, and associated tests, plus an untracked skill `__pycache__`. `sv5tot-backend` had uncommitted Award roster and admin reset-password implementation/tests. The reset-password and Award correction capabilities were retained and subsequently committed with backend counterparts; the other snapshot edits were not reverted. Phase 1.5 adds only the scoped audit/role/deadline-contract fixes documented above. No deploy or database migration was performed.
