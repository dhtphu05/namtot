# Frontend Codebase Context

This file is the current source of truth for ChatGPT planning and Codex implementation work in the frontend repo. Update this file in place after meaningful implementation work.

## Project

- App: 5TOT frontend for student, officer, manager, committee, admin, and class representative workflows.
- Repo path: `D:\02_PROJECTS\5TOT\namtot`
- Runtime: React 19, TypeScript, Vite, TanStack Router/Start, TanStack Query.
- Styling: Tailwind CSS v4, Radix UI primitives, shadcn-style `src/components/ui/*`, custom `src/components/ui-kit`, lucide-react icons, framer-motion for small transitions.
- API base: `VITE_API_BASE_URL`, defaulting to `http://localhost:8080`.

## Commands

- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Format: `npm run format`

## Routing

- File-based routes live in `src/routes`.
- Generated route tree lives in `src/routeTree.gen.ts`; do not hand-edit it.
- Root route: `src/routes/__root.tsx`
  - Sets document metadata, font, global CSS, QueryClientProvider, SmartUX tracker, and Toaster.
- Authenticated app route: `src/routes/app.tsx`
  - Uses `requireAuthenticatedAppRoute`.
  - Renders `AppLayout`, which delegates to `AppShell`.
- Role-based redirects and access checks live in `src/features/auth/route-guard.ts`.

## Phase 1 Part 3 — Role Migration

- The frontend API role union includes `student`, `data_uploader`, `city_officer`, `city_manager`, `city_committee`, and `admin`, while retaining `class_representative`, `officer`, `manager`, and `committee` for compatibility.
- `/api/me` continues to provide workspace `{ id, code, name, shortName }`; it does not provide `WorkspaceType`, and `SafeUser` does not infer or add that field.
- Default authenticated destinations are student `/app`, data uploader `/app/data-uploader`, City Officer `/app/queue`, City Manager `/app/analytics`, City Committee `/app/resolution`, and admin `/app/admin/workspaces`. Legacy officer, manager, and committee routes retain their earlier defaults.
- Route authorization uses the authenticated backend role in `src/features/auth/route-guard.ts`. The optional demo role selector changes presentation only; it does not change the authenticated role used for route access or API requests.
- City Officer has review queue, task detail, specialization, and Resolution read-only surfaces. City Manager has cross-School review operations, assignment, workload, results, export, audit, Event Registry, and Knowledge Base. City Committee has Resolution, results/finalization, export/audit, read-only Event Registry, and Knowledge Base; it does not have assignment or dashboard-summary routes.
- Data Uploader lands on a short information page without upload controls. Decision Import, criteria configuration, and admin workspace routes remain closed to City roles.
- Backend regressions found while validating the Part 2 contract now scope approved-evidence-name search by workspace, bind City Officer case detail to a created/assigned case, reject resolution evidence decisions outside the case’s related evidence, and scope resolution watcher notifications. These fixes do not change the API response shape, schema, or JWT.
- Award Decision Registry is implemented in Phase 2. Phase 3 adds the City submission eligibility gate, student status read, and City Manager manual verification read surface.
- Phase 3 Part 3 keeps eligibility in the existing `/app/application` flow for a student's own individual City-level initial submission. It allows draft edits, evidence uploads, and precheck while ineligible or awaiting verification; the final submit action refreshes eligibility and handles the backend's eligibility conflict codes. The UI matches the backend condition: `supplement_required` with `submittedAt === null` is still treated as an initial submission, while a supplement resubmission with a non-null `submittedAt` hides and skips this read/gate.
- Eligibility conflict codes produce specific feedback from the shared submit mutation hook so legacy student surfaces such as `/app/wizard`, `/app/cascade`, and `/app/ai-precheck` explain blocked submissions too. The V2 workspace refetches and refreshes its card on a submit conflict but leaves the single toast to the shared hook.
- The student card distinguishes Direct City, UDN eligible, not eligible, and needs verification states; it describes submission eligibility, not an award outcome, and maps only known safe reason codes to student copy.
- City Manager eligibility verification is a pending-only panel inside `/app/analytics`, visible only to the authenticated `city_manager` role. It uses the existing detail and verification APIs, requires a reason for either decision, confirms approval, and refreshes query data after a decision. No route, navigation item, persistence, or verification workflow was added.
- Part 3 frontend verification: 7 eligibility Playwright tests and 7 Manager panel/role tests pass; build passes and lint exits 0 with 11 existing warnings. TypeScript still reports the same 197 baseline diagnostics (zero added/resolved signatures). The combined 55-test Playwright run reports 39 passed, 15 failed, 1 skipped; all 15 failures also reproduced in the untouched baseline student V2 suite, with no failures in Part 3 eligibility or Manager tests.

## Layout

- Main app shell: `src/components/layout/AppShell.tsx`.
- Student role uses `StudentAppShell`.
- Non-student roles use a fixed-height operational layout:
  - sidebar on the left
  - scrollable main content
  - max content width around `1280px`
  - background `var(--surface-app)`
- Keep new workflow pages inside the existing route/layout structure.

## State And Data

- Auth store: `src/features/auth/store/auth-store.ts` using Zustand with persisted `5tot-auth` state.
- API client: `src/lib/api/client.ts`
  - Adds Bearer token for authenticated API calls.
  - Handles token refresh on 401.
  - Deduplicates GET/HEAD requests.
  - Wraps failures in `ApiError` with user-friendly messages.
- Feature hooks normally live under `src/features/<feature>/hooks`.
- Feature API clients normally live under `src/features/<feature>/api`.
- Shared API types live in `src/lib/api/types.ts` and `src/types/*`.

## Feature Structure

Prefer the existing feature-module shape:

- `src/features/application`
- `src/features/evidence`
- `src/features/event`
- `src/features/review`
- `src/features/decision-import`
- `src/features/notifications`
- `src/features/manager`
- `src/features/collective`
- `src/features/resolution`
- `src/features/chatbot`
- `src/features/auth`
- `src/features/core`

Do not add broad cross-feature abstractions unless there is real reuse and it fits the existing structure.

## UI System

Use `docs/UI_GUIDE.md` as the design source of truth before touching UI.

Important current primitives:

- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/*` Radix/shadcn-style controls
- `src/components/ui-kit` for project-level reusable primitives

Current visual direction is quiet, dense, operational, and workflow-focused. It is not a marketing landing-page style.

## Known Documentation

Existing frontend docs under `docs/` include UX audits and flow notes. Useful references:

- `docs/student-ui-ux-current-flow.md`
- `docs/student-flow-ux-ui-status.md`
- `docs/student-portal-foundation-audit.md`
- `docs/FE_LEAN_AI_UX_AUDIT.md`
- `docs/SMARTUX_INTEGRATION.md`

Use these as historical references, not as replacements for this current context file.

## Current Backend Integration

- Backend repo path: `D:\02_PROJECTS\5TOT\sv5tot-hackaithon-backend`.
- Backend default local API: `http://localhost:8080`.
- Auth, application, evidence, jobs, notifications, review, manager, decision-import, chatbot, and SmartUX APIs are consumed through feature API clients.

## Working Rules

- Before UI edits, inspect existing components and `docs/UI_GUIDE.md`.
- Before API changes, inspect the matching backend route/controller/service and frontend feature API client.
- After a meaningful change, update this file in place.
- Do not create `CODEBASE_CONTEXT_NEW.md`, timestamped context files, or duplicate context snapshots.

## University Workspace Context

This section reflects the completed university workspace implementation on 2026-07-16. Workspace means the operating university/school unit. There is no separate `University` model, no `WorkspaceMembership`, no workspace switcher, no `workspaceId` in JWT, and no `X-Workspace-Id` request header.

### Frontend Signup Behavior

- Route: `src/routes/signup.tsx`.
- Signup form is still local React state, not `react-hook-form`.
- Public signup loads selectable registration workspaces from `authApi.getRegistrationWorkspaces()` using `GET /api/workspaces?registration=true`.
- The old free-text `school` input is removed from the visible form and payload.
- Submitted payload to `authApi.register` now includes `workspaceId`, `fullName`, `studentCode`, `email`, `password`, `className`, `faculty`, and `phone`.
- The workspace selector is required; submit is disabled while the list is loading, failed, empty, or no workspace is selected.
- Empty list copy is `Hiện chưa có trường nào mở đăng ký.`.
- Backend workspace errors `WORKSPACE_REGISTRATION_CLOSED`, `WORKSPACE_INACTIVE`, and `WORKSPACE_NOT_FOUND` preserve the form state and trigger a workspace-list refetch.
- On successful register, the existing post-auth path is preserved: clear query/session state, store auth data, seed `authKeys.me`, set UI role, and redirect through `getDefaultAppPathForRole(user.role)`.

### Final Workspace/User Types

- `src/lib/api/types.ts` now defines `WorkspaceSummary { id, code, name, shortName: string | null }`.
- `SafeUser` includes `workspaceId: string | null` and `workspace: WorkspaceSummary | null`.
- Existing fields remain `id`, `email`, `role`, `fullName`, `studentCode`, `className`, `faculty`, `phone`, `avatarUrl`, `isActive`, `lastLoginAt`, `createdAt`, `updatedAt`, and optional `officerSpecializations`.
- `RegisterPayload` includes `workspaceId` and no longer includes `school`.
- `authApi.updateMe` still only sends `fullName`, `phone`, and `avatarUrl`; profile cannot change workspace/school.
- Auth state still persists `user`, `accessToken`, and `refreshToken` under local storage key `5tot-auth`. Old persisted users without workspace fields are overwritten by `/api/me` when the session is refreshed.

### Registration API And `/api/me` Contract

- `GET /api/workspaces?registration=true` is the only public workspace-list endpoint used by signup.
- The endpoint returns active, registration-enabled workspace summaries.
- `POST /api/auth/register` requires `workspaceId` and rejects inactive/closed/missing workspaces.
- Register/login responses and `/api/me` include `workspaceId` and `workspace`.
- Protected APIs derive workspace server-side from the authenticated user loaded by `/api/me`/auth middleware.
- Frontend must not send `X-Workspace-Id` or protected API workspace query params for current flows.

### Where Workspace Attaches In Frontend

- Signup selection attaches at `src/routes/signup.tsx` and stores only the selected `workspaceId`.
- API client addition is `authApi.getRegistrationWorkspaces()` in `src/features/auth/api/auth.ts`.
- Shared response typing attaches at `SafeUser.workspaceId` and `SafeUser.workspace` in `src/lib/api/types.ts`.
- Route guard in `src/features/auth/route-guard.ts` keeps role routing but treats non-admin authenticated users with no workspace after `/api/me` as an invalid session and clears auth instead of routing to onboarding. Admin URL access is a hard boundary: non-admin sessions opening `/app/admin/*` are cleared and sent to `/login`.
- `src/lib/api/client.ts` still only sends Bearer auth. Workspace is derived server-side from the authenticated user, not from a frontend header/query.
- React Query keys and application API calls do not include workspace because there is no active workspace switcher.
- Backend anchors main tenant root tables with `workspaceId` and derives tenant scope from the authenticated user. Frontend should not add ad hoc workspace filters unless a future workspace switcher/membership model is designed.
- `src/components/layout/UserWorkspaceInfo.tsx` displays read-only workspace/profile context after login: school name, student code, faculty, and class.
- `Sidebar` shows the read-only workspace/profile block for desktop/sidebar layouts. `StudentAppShell` shows a compact mobile strip because the student sidebar is hidden on mobile.

### Admin Workspace Management UI

This section reflects the global admin workspace management UI added on 2026-07-17.

- Routes:
  - `src/routes/admin.tsx` -> `/admin` compatibility redirect to `/app/admin/workspaces`.
  - `src/routes/app.admin.workspace.tsx` -> `/app/admin/workspace` compatibility redirect to `/app/admin/workspaces` for the common singular typo.
  - `src/routes/app.admin.workspaces.tsx` -> `/app/admin/workspaces`; this parent route renders `<Outlet />` for nested detail paths so `/app/admin/workspaces/:workspaceId` does not get masked by the list page.
  - `src/routes/app.admin.workspaces.$workspaceId.tsx` -> `/app/admin/workspaces/:workspaceId`.
- `src/features/auth/role-map.ts` now sends admin users to `/app/admin/workspaces` by default. Student/officer/manager/committee defaults are unchanged.
- `src/features/auth/route-guard.ts` allows `/app/admin/*` only for backend role `admin`; if a browser still has a persisted non-admin session and opens an admin URL, the guard clears that session and sends the user to `/login` instead of silently redirecting into the student/officer app.
- `src/features/core/components/AppLayout.tsx` mirrors the same admin boundary during client-side access checks so stale runtime auth state cannot pull a student/officer/manager user back to their default app after manually typing `/app/admin/workspace`.
- `src/routes/login.tsx` includes a quick-access admin card for `admin@dut.udn.vn`; selecting it fills the login form and successful admin login lands on `/app/admin/workspaces`.
- `src/components/layout/Sidebar.tsx` now has an admin-specific shell identity:
  - `HỘI SINH VIÊN VIỆT NAM`
  - `Hệ thống quản lý Sinh viên 5 tốt`
  - role panel `Quản trị hệ thống` / `Toàn bộ đơn vị`
  - no workspace switcher and no read-only workspace/profile block for global admins.
- Admin sidebar menu shows only implemented admin navigation:
  - group `QUẢN LÝ ĐƠN VỊ`
  - item `Trường triển khai`
  - no fake menu entries for global users, settings, audit, faculties, or criteria.
- Feature module: `src/features/admin-workspace`.
  - API client: `api/admin-workspace.ts` uses the existing `apiClient`.
  - Hooks: `useAdminWorkspaces`, `useAdminWorkspacesSummary`, `useAdminWorkspaceDetail`, `useAdminWorkspaceUsers`, `useCreateWorkspace`, `useUpdateWorkspace`, and `useUpdateWorkspaceStatus`.
  - Types include list/detail/create/update/status/user-list DTOs: `AdminWorkspaceListItem`, `AdminWorkspaceListResponse`, `CreateWorkspacePayload`, `UpdateWorkspacePayload`, `UpdateWorkspaceStatusPayload`, `AdminWorkspaceUserListItem`, `AdminWorkspaceUserListResponse`, `WorkspaceReadinessSummary`, and `AdminWorkspaceDetail`.
  - Components: `AdminWorkspacesPage`, `AdminWorkspaceDetailPage`, `WorkspaceSummaryCards`, `WorkspaceToolbar`, `WorkspaceTable`, and `WorkspaceCreateDialog`.
- API usage:
  - `GET /api/admin/workspaces` with search/status/registration/page/limit.
  - `POST /api/admin/workspaces` for metadata-only workspace creation.
  - `GET /api/admin/workspaces/:workspaceId` for detail, metrics, active criteria, and readiness.
  - `PATCH /api/admin/workspaces/:workspaceId` for `name` and `shortName` only; code is read-only in UI.
  - `PATCH /api/admin/workspaces/:workspaceId/status` for activation/deactivation and registration open/close.
  - `GET /api/admin/workspaces/:workspaceId/users` for read-only user list with search/filter/pagination.
- Query keys include list, summary, detail, and users. Mutations invalidate only admin workspace list/summary/detail and the public signup workspace query `["workspaces", "registration"]` when registration status changes; they do not clear the whole QueryClient.
- The list page includes:
  - header title `Quản lý trường triển khai`
  - breadcrumb `Quản trị hệ thống / Trường triển khai`
  - CTA `Thêm trường triển khai`
  - four compact summary cards
  - debounced search
  - activity and registration filters
  - paginated table with no inline switches
  - loading skeleton, error retry, and empty state with create CTA.
- Shared `PageHeader`/`TopBar` now stacks title/subtitle above the action row on narrower viewports. This prevents admin workspace titles from being clipped when the notification button and primary CTA are visible beside a sidebar.
- Summary cards use a broad admin-workspace list query with `limit=100`. They only compute active/open/not-ready counts when the response contains the full result set; otherwise those derived counts are shown as unavailable instead of guessed from one page.
- Create dialog defaults `isActive=true` and `registrationEnabled=false`, uppercases code input, shows the code-format hint, warns when opening registration immediately, preserves form state on API errors, and maps duplicate/validation/readiness backend errors to friendly Vietnamese copy.
- Detail page `/app/admin/workspaces/:workspaceId` includes breadcrumb `Quản trị hệ thống / Trường triển khai / [Tên trường]`, active/paused and registration badges, edit info, open/close registration, and secondary activate/deactivate actions. It has only two tabs: `Tổng quan` and `Người dùng`.
- Overview tab shows school metadata, user/application metrics, active criteria info through readiness, and business readiness statuses for school info, active criteria, manager, officer, and committee. Missing active criteria blocks opening registration; missing manager/officer/committee are warnings only.
- Edit dialog changes only `name` and `shortName`, keeps `code` read-only with explanatory copy, preserves form data on error, and closes only after successful mutation.
- Registration and activation status changes use confirmation dialogs, not switches. Disable requires typing the workspace code, backend disable auto-closes registration, and reactivate does not auto-open registration.
- Users tab is read-only and lists full name, email, role, student code, faculty, class, status, and created date. Search covers name/email/MSSV/faculty/class; filters cover role and active status; pagination comes from backend.
- No `X-Workspace-Id`, workspace switcher, membership model, new design system, criteria editor, faculty management, officer assignment UI, season management, user CRUD, code editing, delete workspace action, or fake tabs were added.
- `src/routeTree.gen.ts` is updated by TanStack Router generation during build/tooling; it was not edited manually.

### UI Components Used In Signup

- Existing UI primitives are used: `Button`, `Popover`, `PopoverTrigger`, `PopoverContent`, `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, and `CommandItem`.
- Icons are from `lucide-react`: `ChevronsUpDown`, `Check`, `RefreshCw`, plus existing signup icons.
- Selector label is `Trường đại học`; placeholder is `Chọn trường đại học`.
- The selector supports keyboard/search through the existing command component and uses responsive popover width constraints.
- Error state shows a retry action and does not discard typed form values.

### Workspace Scoping Status

- Frontend role guards are not tenant guards; backend query scoping is the security boundary.
- Backend tenant roots include workspace anchors for applications, collective profiles, event registry, decision imports, knowledge base, criteria versions, review tasks, and resolution cases.
- Manager/review/resolution/event/decision-import/knowledge-base/collective backend queries are scoped by workspace for non-admin users.
- Admin remains global.
- Frontend list/detail pages do not need to include workspace in React Query keys because there is no active workspace switcher.
- If a future workspace switcher is introduced, update React Query keys, auth store semantics, route guard, top bar/profile display, and cache invalidation as one design.

### Migration And Backfill Status

- Backend workspace migrations `20260716123000_workspace_foundation` and `20260716150000_workspace_tenant_anchors` have been applied on the configured remote database.
- `npx prisma migrate status` reports the database schema is up to date with 11 migrations.
- Backfill uses owner/parent relationships where possible and falls back to default workspace `DHBK-DHDN`.
- `GET /api/workspaces?registration=true` returned the default workspace successfully after migration.

### Verification Results

- Backend `npx prisma migrate status`: database schema is up to date.
- Backend `npx prisma validate`: passed.
- Backend `npm run build`: passed.
- Backend `GET /api/workspaces?registration=true`: returned `DHBK-DHDN` successfully.
- Latest backend blocker verification on 2026-07-16:
  - `npm run build`: passed.
  - `npx tsx scripts/verify-workspace-backfill.ts`: passed with every missing-anchor and parent/workspace mismatch count at `0`.
  - `npx vitest run tests/unit/auth-register.test.ts tests/unit/auth-middleware-workspace.test.ts tests/unit/review-task-detail.test.ts tests/unit/evidence-matching.service.test.ts tests/unit/evidence-registry-matcher.test.ts tests/unit/chatbot-action-service.test.ts tests/unit/chatbot-tool-registry.test.ts tests/unit/smartbot-hooks.test.ts tests/unit/manager-aggregation.test.ts`: passed with 9 files and 34 tests.
  - Automated HTTP A/B workspace isolation checks were not completed because the backend repo has no ready two-workspace integration fixture and the local PostgreSQL test database at `localhost:5432` was unavailable.
- Frontend scoped lint passed for `src/routes/signup.tsx`, `src/features/auth/api/auth.ts`, `src/features/auth/route-guard.ts`, and `src/lib/api/types.ts`.
- Backend full `npm test`: still fails on local PostgreSQL connection at `localhost:5432` plus unrelated chatbot/OCR/status assertion drift.
- Admin workspace UI verification on 2026-07-17:
  - Scoped Prettier was run on changed admin-workspace files.
  - Scoped ESLint passed for `src/components/layout/Sidebar.tsx`, `src/features/auth/route-guard.ts`, `src/features/auth/role-map.ts`, `src/features/admin-workspace`, `src/routes/app.admin.workspaces.tsx`, and `src/routes/app.admin.workspaces.$workspaceId.tsx`.
  - `npm run build` now completes the Vite client build, Vite SSR build, and Nitro/Vercel output generation successfully.
  - Full `npm run lint` was attempted after build output generation but did not return after several minutes; the specific `eslint .` Node process was stopped and scoped lint was used for changed files.
- Admin browser/API verification on 2026-07-18:
  - In-app Browser admin login succeeded and landed on `/app/admin/workspaces`; `/admin` redirected to `/app/admin/workspaces` without a 404.
  - Workspace list rendered, debounced search and registration filter worked, empty state appeared after query settle, create dialog opened/closed without mutating data, and status confirmation dialog opened/canceled.
  - Detail route `/app/admin/workspaces/:workspaceId` rendered after fixing the parent route outlet; DHKTE detail showed overview/readiness and the read-only users tab with seeded student/officer/manager/committee users.
  - Logout returned to `/login`; admin login back to `/app/admin/workspaces` succeeded.
  - API smoke passed for `/api/me`, `/api/admin/workspaces`, `/api/admin/workspaces/:id`, `/api/admin/workspaces/:id/users`, and `/api/workspaces?registration=true`.
  - Registration data fix: the historical test workspace `E2E-NON-AI` was left in place but closed for registration via admin status API; public signup workspace choices are now `DHBK-DHDN` and `DHKTE-DHDN`.
  - Verification commands passed: `npx prettier --write src/routes/app.admin.workspaces.tsx src/components/layout/PageHeader.tsx`, `npx eslint src/routes/app.admin.workspaces.tsx src/components/layout/PageHeader.tsx`, and `npm run build`.
- Admin route guard regression check on 2026-07-18:
  - Student demo login still lands in the student app normally.
  - While authenticated as the student demo user, direct navigation to `/app/admin/workspace` no longer falls back to the student app; the app clears the non-admin session and returns to `/login`.
  - With no authenticated session, direct navigation to `/app/admin/workspace` also returns to `/login`.
  - Scoped ESLint passed for `src/features/auth/route-guard.ts`, `src/features/core/components/AppLayout.tsx`, `src/routes/app.admin.workspace.tsx`, and `src/routes/app.admin.workspaces.tsx`.
  - `npm run build` passed after the admin route guard regression fix.

### Known Limitations

- There is no workspace switcher or membership model in frontend.
- Workspace/profile context is read-only; users cannot change workspace, faculty, class, or student code from this display.
- Persisted auth state can contain older user shapes; route guard relies on `/api/me` as source of truth and clears invalid non-admin sessions with no workspace.
- `faculty`, `className`, and `schoolYear` remain free-text/filter fields and are not normalized under workspace.
- Running `npm run format` formats the whole frontend repo because the script is `prettier --write .`; expect broad formatting churn unless the script is narrowed.
- Backend HTTP A/B workspace isolation is not yet automated. Until that exists, frontend smoke checks should be paired with backend manual A/B API checks before treating multi-workspace isolation as release-verified.

### Next Recommended Work

- Add frontend tests or smoke coverage for signup workspace selector loading/error/empty states.
- Add frontend tests or smoke coverage for the read-only workspace/profile display in sidebar and student mobile shell.
- Add frontend tests or smoke coverage for the admin workspace list/detail, create/edit dialogs, readiness blocker, status confirmations, user search/filter/page, route guard, and narrow-viewport header/table behavior.
- Pair frontend workspace smoke checks with the backend two-workspace A/B integration suite once it exists; frontend should continue to avoid workspace headers/query params unless a future switcher is designed.
- Add repeatable browser screenshot verification for `/app/admin/workspaces` and `/app/admin/workspaces/:workspaceId` after a stable local API fixture is available.
- If workspace switching is added later, include cache-key and auth-store redesign in the same change.
- Consider workspace-specific controlled options for `faculty` and `className`.

## Criteria Completion Frontend Integration

This section reflects the minimal criteria-completion UI integration added on 2026-07-17.

- Shared API types in `src/lib/api/types.ts` now include the backend canonical criteria completion DTOs:
  - `CriteriaCompletionResponse`
  - `CriterionCompletionItem`
  - `RequirementGroup`
  - `RequirementItem`
  - `RequirementResponse`
- `src/features/application/api/application.ts` adds:
  - `applicationApi.getCriteriaCompletion(id)` for `GET /api/applications/:id/criteria-completion`.
  - `applicationApi.declareEthicsConductScore(id, input)` for `POST /api/applications/:id/ethics/conduct-score/declare`.
  - `applicationApi.declareAcademicGpa(id, input)` for `POST /api/applications/:id/academic/gpa/declare`.
  - `applicationApi.declarePhysicalCourseResult(id, input)` for `POST /api/applications/:id/physical/course-result/declare`.
  - `applicationApi.addPhysicalPathEvidence(id, input)` for `POST /api/applications/:id/physical/path-evidence`.
  - `applicationApi.addVolunteerActivity(id, input)` for `POST /api/applications/:id/volunteer/activities`.
  - `applicationApi.addIntegrationPathResponse(id, input)` for `POST /api/applications/:id/integration/path-responses`.
- `src/features/application/hooks/useApplication.ts` adds `useCriteriaCompletion(applicationId)`, `useDeclareEthicsConductScore()`, `useDeclareAcademicGpa()`, `useDeclarePhysicalCourseResult()`, `useAddPhysicalPathEvidence()`, `useAddVolunteerActivity()`, and `useAddIntegrationPathResponse()`, and invalidates criteria completion after submit, precheck, metric, conduct-score, GPA declaration, physical-path, volunteer-activity, and integration-path mutations.
- `src/features/evidence/hooks/useEvidence.ts` invalidates criteria completion after evidence create/update/delete/upload/indexing changes.
- `src/features/application/components/StudentApplicationActionWorkspace.tsx` keeps the existing layout but overlays each criterion state with completion API data when available:
  - criterion status labels now come from completion status when loaded;
  - sidebar text shows `x/y điều kiện có dữ liệu` instead of only evidence count;
  - loading, error, and empty completion states use deterministic inline alerts and fall back to existing evidence/precheck-derived state.
- The `ethics` workspace no longer renders as a single metric box. It shows a compact `Dữ liệu nền` panel with two rows:
  - `Điểm rèn luyện`: value, source, status, and a manual declaration action using the dedicated ethics conduct-score endpoint.
  - `Tình trạng vi phạm`: value, source, status, and wait/supplement copy only; students do not get a self-confirm checkbox or verified action.
- Optional ethics achievements render separately as `Thành tích đạo đức bổ sung` and show `Không bắt buộc ở cấp hiện tại` when the active completion config marks the group optional.
- The `academic` workspace no longer renders as a single GPA input. It shows `Kết quả học tập` with scale, GPA/ĐTB, school year, data source, verification status, no-F status, and school-year verification.
- Academic GPA declaration uses the dedicated backend action and lets students choose scale 4 or 10; frontend validation uses the selected scale.
- `Thành tích học thuật bổ sung` renders from backend completion groups/formSchema instead of a hardcoded criterion list and shows `Không bắt buộc ở cấp hiện tại` when optional.
- The `physical` workspace no longer renders a default metric box. It first renders path choices from backend completion API, then renders the Physical Education result form or evidence-path actions only after the student chooses a path. The added-list shows path key/title and verification status.
- Physical evidence paths expose backend `formSchema.fields` chips and actions for official data search or manual evidence upload; the component does not hardcode the evidence type list.
- The `volunteer` workspace no longer renders a `Số ngày tình nguyện` metric input. It shows the activity ledger with verified total, pending total, CriteriaVersion target, per-activity status, official-event search, manual activity declaration, and evidence upload action.
- Volunteer totals are read from backend `RequirementItem.aggregation`; the frontend does not calculate official conversion.
- The `integration` workspace no longer renders a default foreign-language metric input or IELTS/TOEIC prompt. It renders path choices from backend completion API, then renders dynamic fields from the selected path `formSchema.fields` only after selection. Existing responses show path title, source, and verification status.
- Integration actions support official-event search and manual declaration/evidence upload; the component does not hardcode IELTS/TOEIC as the default flow.
- `src/features/student/selectors/student-ui.ts` now lets criteria-completion and precheck structured next actions drive the bottom `Bước tiếp theo` title/action, avoiding old generic `Đạo đức tốt chưa đủ minh chứng`, `Học tập tốt chưa đủ minh chứng`, `Thể lực tốt chưa đủ minh chứng`, `Tình nguyện tốt chưa đủ minh chứng`, and `Hội nhập tốt chưa đủ minh chứng` copy.
- Student overview now loads criteria completion and summarizes the five criteria by business status buckets: `Chưa bắt đầu`, `Đang hoàn thiện`, `Cần xác minh`, `Sẵn sàng kiểm tra`, and `Có yêu cầu bổ sung`. Evidence count remains visible only as criterion-card metadata.
- Frontend precheck types accept structured `nextAction`, `requirementKey`, requirement groups, missing requirements, and needs-verification items from the backend precheck snapshot.
- The UI still does not redesign the requirement tree or expose full officer response-editing controls; this is intentionally the minimal integration layer.
- Verification on 2026-07-17:
  - Scoped ESLint passed for changed frontend files:
    `npx eslint src/lib/api/types.ts src/features/student/selectors/student-ui.ts src/features/application/components/StudentOverview.tsx src/features/application/components/StudentApplicationActionWorkspace.tsx src/features/application/hooks/useApplication.ts src/features/application/api/application.ts`.
  - `npm run build` completed client and SSR builds, then failed at the known Nitro/Vercel packaging blocker: `@vercel/nft` does not provide `nodeFileTrace`.
  - Full `npm run lint` was attempted but got stuck after build artifact generation; the running `eslint .` process was stopped and scoped lint was used for changed files.

## Proactive Recommendations / Gemini UX Planning Context

### Current Next-Action And Recommendation Surfaces

- Student overview: `src/features/application/components/StudentOverview.tsx` builds the main "Viec can lam" list from `getNextActions` in `src/features/student/selectors/student-ui.ts`. Inputs are current application, latest precheck, evidence list, and notification-derived feedback.
- Student application workspace: `src/routes/app.application.tsx` renders `StudentApplicationActionWorkspace`, which has criterion status, a right-side quick guide, a bottom "Buoc tiep theo" bar, precheck/submit CTAs, and assistant links carrying `applicationId`, criterion, and source context. Legacy routes `/app/wizard`, `/app/ai-precheck`, and `/app/cascade` still render `StudentApplicationWorkspace`, which auto-runs sync precheck after edits and displays `precheck.nextBestAction`.
- Evidence workspace: canonical `/app/evidence` now redirects to `/app/application`; legacy `/app/upload` renders `EvidenceWorkspaceSafe`. That surface has an evidence assistant card, criterion assistant blocks for volunteer/physical, official match search/import, approved-evidence references, and post-upload assistant copy.
- Notifications/feedback: `src/features/notifications/components/Notifications.tsx` maps notification metadata into student feedback cards and actionable "Hoi cach xu ly" assistant links. Non-student notification UI groups tasks/results with CTA links.
- Chat/assistant: `/app/assistant` renders `StudentSupport`, backed by `SmartbotPanel`; `/app/chatbot` redirects there. Review detail, Event Library, AI Precheck, and legacy AI pages also embed `SmartbotPanel`.

### Current Chatbot, Gemini, And SmartUX Architecture

- Frontend chatbot calls `POST /api/chatbot/stream` first via `streamChatbotMessage`, then falls back to `POST /api/chatbot/message` through `chatbotApi.sendMessage`.
- `SmartbotPanel` maintains local session state, streams `meta`, `delta`, `card`, and `final` SSE events, renders rich cards with `SmartbotCardRenderer`, and exposes non-card actions through `SmartbotActionButton`.
- Current card grammar supports `text`, `quickreply`, `image`, `carousel`, `handoff`, `action_cards`, `gap_item`, `evidence_summary`, `matching_event`, `reviewer_draft`, and `unknown`.
- Frontend has no direct Gemini client. Gemini use is backend-only for chatbot intent classification and response smoothing/streaming.
- SmartUX frontend integration is SDK-side: root route injects SmartUX script and mounts `SmartUXRouteTracker`; events go through `trackSmartUXEvent` / `useSmartUXTracking` with a sanitized allow-list. Backend `/api/smartux` exists but currently returns placeholder `501`.

### Candidate Frontend Surfaces

- Add a compact recommendation strip/card inside `StudentOverview` next to or above the existing `NextActionsCard`, reusing `getNextActions` until a backend recommendation API exists.
- Add per-criterion recommendation chips in `StudentApplicationActionWorkspace` near `CriterionWorkspace` or the bottom action bar, using existing `StatusBadge`, `InlineAlert`, and `AppButton` primitives.
- Use `SmartbotCardRenderer` for richer Gemini-backed cards instead of creating another card schema, especially for gap/evidence/matching/handoff recommendations.
- Extend student feedback cards with recommendation CTAs when backend notifications carry safe `metadata.recommendation` or similar.
- Avoid reviving `/app/evidence` as a primary route unless the student navigation decision is revisited; current student evidence work is consolidated under `/app/application`, with `/app/upload` as a legacy route.

### Candidate Backend Integration Points

- Deterministic baseline: current application + evidences + latest precheck + notifications already provide enough data for non-LLM recommendations.
- Chatbot endpoint option: reuse `/api/chatbot/message` or `/api/chatbot/stream` with `contextScope: "student_helpdesk"` and page context for conversational recommendations.
- New endpoint option: add an authenticated read API such as `GET /api/recommendations/contextual?surface=overview|application|feedback` that returns structured, cacheable recommendation cards without creating chat sessions.
- Notification option: persist durable recommendations as notifications only when they are user-visible workflow events, not transient AI suggestions.
- SmartUX option: use SmartUX only for behavior signals and acceptance tracking, not as the source of private student/application data.

### Data Privacy Constraints

- Do not send names, student codes, email, phone, raw OCR/evidence text, file names, signed URLs, or identity data to SmartUX.
- Frontend should pass IDs and coarse context only: role, page, criterion, status, target level, source, counts, and action names.
- If recommendations call chatbot/Gemini, rely on backend redaction and safe context builders; frontend should not assemble prompts with raw evidence content.
- Do not label recommendations as official decisions. Keep copy as suggested next steps; official results remain staff/committee decisions.

### Latency And Cost Risks

- Existing precheck in the application workspace can auto-run after edits; adding LLM recommendations on the same path could create repeated cost and latency.
- Chatbot streaming is user-initiated and rate-limited; proactive surfaces should prefer cached deterministic data and lazy/explicit LLM expansion.
- React Query keys should include the recommendation surface and application id if a new endpoint is added; keep stale times conservative to avoid repeated calls while users type/upload.
- Gemini failures should degrade to deterministic `nextBestAction`/selector output, not block dashboard/application rendering.

### Likely API Contract Options

- Lightweight deterministic contract:
  `GET /api/recommendations/contextual?surface=overview&applicationId=...` returns `{ items: [{ id, surface, priority, title, description, actionLabel, action: { type, route, query }, source, expiresAt? }] }`.
- Chat-compatible contract:
  return the existing `ChatbotResponse` shape and render through `SmartbotCardRenderer`; useful for cards/actions but less cache-friendly.
- Notification-backed contract:
  reuse `NotificationSummary.metadata` for durable recommendation CTAs; useful for supplement requests and deadlines, not for ephemeral hints.
- Hybrid contract:
  deterministic cards first, optional `POST /api/recommendations/:id/explain` or chatbot postback for Gemini explanation on demand.

### Verification Commands

- Frontend static checks: `npm run lint`.
- Frontend build: `npm run build` (currently known to fail at Nitro/Vercel packaging after Vite build because of `@vercel/nft` export mismatch).
- Focused source inspection: `rg -n "getNextActions|SmartbotPanel|SmartbotCardRenderer|trackSmartUXEvent|nextBestAction|useNotifications" src`.
- Backend pairing checks from backend repo: `npm run build`, `npx prisma validate`, and focused chatbot/precheck tests if recommendation APIs touch those modules.

### Open Questions

- Should proactive recommendations be deterministic workflow guidance first, or should Gemini generate the visible wording on first load?
- Should recommendations be transient UI state, persisted notifications, or persisted recommendation records with audit/acceptance status?
- Which surfaces need proactive cards for MVP: overview only, application workspace, feedback, or officer review as well?
- What SmartUX event taxonomy should track impression, click, dismiss, and completion without sending private content?
- What freshness policy is acceptable after upload/precheck/notification changes: immediate invalidation or short cached window?

## Final Requirement-Flow Stabilization On 2026-07-17

- Student overview and application action workspace use criteria completion status and structured precheck actions instead of evidence-count/readiness heuristics for student next steps.
- Overview summary buckets are now completion-oriented: not started, in progress, needs verification, ready for precheck, and supplement-required. Evidence count remains metadata only.
- `getNextActions` accepts backend `PrecheckNextAction` with `criterion`, `requirementKey`, `type`, `route`, `label`, `shortReason`, and priority; supplement and requirement-specific actions take precedence over generic guidance.
- Legacy `/app/wizard` fallback no longer renders fixed GPA/conduct/physical/volunteer/language inputs. It now routes users to `/app/application` for dynamic requirement-tree forms and path selection.
- Remaining audit hits are compatibility/admin/legacy/static-data only: manager/export readiness display, collective readiness, mock data, `criteria-matrix`, and review evidence display labels.
- Verification this pass:
  - Scoped ESLint passed for changed flow files:
    `npx eslint src/features/application/components/Wizard.tsx src/features/application/components/StudentApplicationActionWorkspace.tsx src/features/application/components/StudentOverview.tsx src/features/student/selectors/student-ui.ts src/lib/api/types.ts`.
  - `Wizard.tsx` still has one existing hook dependency warning.
  - `npm run build` completed Vite client and SSR builds, then failed at the known Nitro/Vercel packaging blocker: `@vercel/nft` does not provide `nodeFileTrace`.
  - Full `npm run lint` was attempted but hung; the `eslint .` process was stopped and scoped lint was used.
  - Browser desktop/mobile smoke was not run in this pass because no dev server was started after the Nitro packaging blocker.

## Context Refresh On 2026-07-18

- Current source of truth for student-facing status and next actions is the completion/precheck contract from backend, not file count or `readinessScore`.
- Primary student UI refactor target should be `/app/application` via `StudentApplicationActionWorkspace`; `/app/wizard`, `/app/ai-precheck`, and `/app/cascade` are legacy/fallback surfaces.
- `StudentOverview` and `StudentApplicationActionWorkspace` already consume completion-aware criteria states and structured next actions. Keep using backend `requirementGroups`, `formSchema`, `evidenceTypes`, and `requirementKey` instead of hardcoded criterion forms.
- Known compatibility/legacy areas still visible in source: `criteria-matrix`, `mock-data`, manager/export readiness displays, collective readiness displays, and review evidence display labels.
- Before full visual refactor, still recommended:
  - Start dev server and smoke `/app/application` on desktop/mobile.
  - Verify path selector overflow, dynamic forms, activity list scrolling, and evidence list containment.
  - Resolve Nitro/Vercel packaging issue: `@vercel/nft` missing `nodeFileTrace`.

## Endpoint/E2E Verification On 2026-07-18

- Backend endpoint flow was rechecked after the five-criteria requirement-tree implementation:
  - Non-AI student flow passed end-to-end through draft, upload, submit gate, submit, manager views, review of all five criteria, aggregation, finalization, notification, and timeline.
  - Workspace isolation passed for applications, evidence/files, review/resolution, events/imports, knowledge base/matching, jobs, audit/chatbot/export, and global admin behavior.
- Frontend build verification:
  - `npm run build` completed Vite client and SSR builds, then failed at the existing Nitro/Vercel packaging step because `@vercel/nft` does not export `nodeFileTrace`.
  - Full `npm run lint` (`eslint .`) ran too long and was stopped. Source-only `eslint src` completed and reported existing lint issues: 10 errors and 11 warnings, mainly `no-explicit-any`, hook dependency warnings, and react-refresh export warnings in pre-existing files.
- UI refactor can start from the current completion/precheck contract, but packaging/lint cleanup should be handled separately from the requirement-flow behavior.

## Criteria Completion Post-Implementation Audit On 2026-07-18

- Backend audit doc: `D:\02_PROJECTS\5TOT\sv5tot-hackaithon-backend\docs\criteria-completion-post-implementation-audit.md`.
- Frontend event/evidence import hooks now invalidate `applicationKeys.criteriaCompletion(applicationId)` after successful official event/evidence imports:
  - `src/features/event/hooks/useEvents.ts`
  - `src/features/event/hooks/useEvent.ts`
  - `src/features/event/hooks/useApprovedEvidenceSearch.ts`
- `npm run build` completed Vite client and SSR builds, then failed at the known Nitro/Vercel packaging step: `@vercel/nft` does not export `nodeFileTrace`.
- Browser smoke in the in-app browser: protected routes render login shell without route-level error boundary; authenticated `/app/application` traversal was not completed because login UI did not navigate after submit even though backend login API succeeded.
- Before the visual refactor is considered release-ready, run a clean Chrome desktop/mobile pass on authenticated `/app/application`, including path selector overflow, dynamic forms, volunteer activity scrolling, and evidence list containment.

## Criteria Completion Acceptance Check On 2026-07-18

- Backend contract freeze/report now live in:
  - `D:\02_PROJECTS\5TOT\sv5tot-hackaithon-backend\docs\criteria-completion-contract-freeze.md`
  - `D:\02_PROJECTS\5TOT\sv5tot-hackaithon-backend\docs\criteria-completion-business-flow-acceptance.md`
- Frontend source lint was restored:
  - `npx eslint src`: passed with 11 warnings and 0 errors.
  - Type-only fixes removed `no-explicit-any` in `DraftWorkspace`, `AuditLogs`, `CollectiveWorkspace`, `EventLibrary`, and mock evidence compatibility data.
- Frontend production build now passes through Nitro/Vercel output:
  - `npm run build`: passed.
- Full desktop/mobile browser acceptance was not claimed in this pass because the required disposable DB fixture is blocked; local PostgreSQL is not listening on `127.0.0.1:5432` and Docker is unavailable.

## Browser/API End-To-End Pass On 2026-07-18

- Test account: `vanngocnhuy30032006+test12@gmail.com`; backend application id `4117b60b-d6ac-4a3c-9a70-4941bab06751`.
- Browser student flow:
  - Signup worked.
  - Application page rendered after finalization without a route-level crash.
  - Final state showed `Đã có kết quả` and `5/5 tiêu chí sẵn sàng kiểm tra`.
  - The page did not show AI confidence text and did not have document-level horizontal overflow in the in-app Browser viewport used for the test.
- API-backed role flow:
  - Student submit with warnings, officer confirmations, five review tasks, physical supplement, student resubmit on the same application, volunteer Resolution Hub decision, manager aggregation, and finalization all completed.
  - Student later saw `completed/passed/school` from the application API.
  - Email outbox contained sent rows for submit, supplement request, resubmit, and result announced.
- Browser role-switch limitation:
  - The in-app Browser session stayed authenticated as the student after signup/finalization. Opening `/login` displayed the login form, but quick login did not switch the active app shell to officer/manager during this pass.
  - Student hitting `/app/review/:id` correctly redirected/guarded with a no-permission message.
  - Officer/committee screens still need a clean browser pass in a fresh session or after adding a clearer logout/session-switch affordance.
- UX notes for the visual refactor:
  - Current student workspace remains visually heavy and card-dense.
  - After final review acceptance, criterion cards can still expose raw completion metadata such as `1 mục cần xác minh`, which conflicts with the visible `Đã xác nhận` label.
  - Volunteer showed `0/4 điều kiện có dữ liệu` even though the task had been accepted by committee; raw requirement data count should be visually separated from review/final outcome.
  - Login labels/placeholders are workable but accessibility names are ambiguous for automation and screen-reader-style lookup.
  - External SmartUX/Statsig console noise appears in the in-app Browser; it did not crash the app.
- Verification in this pass:
  - `npm run lint` advanced through lint and then into build; no lint errors were emitted before build.
  - `npm run build`: passed, including Nitro/Vercel output. Build reports plugin timing warnings only.

## Evidence Repository Planning Context

This section captures planning context for "Kho minh chứng" / Evidence Repository work as of 2026-07-18. It also records the student frontend implementation added after the backend compact library endpoint was available.

### Current Evidence Data Model And File Storage Model

- Backend source of truth is Prisma in `D:\02_PROJECTS\5TOT\sv5tot-hackaithon-backend\prisma\schema.prisma`.
- `Evidence` is currently a dossier/application-owned or collective-profile-owned record. It has nullable `applicationId`, nullable `collectiveProfileId`, `evidenceName`, `criterion`, `sourceType`, nullable `eventId`, workflow `status`, `indexingStatus`, optional `confidence`, and optional `assignedOfficerId`.
- `EvidenceSourceType` values are `metric_input`, `event_import`, `manual_upload`, and `collective_import`; there is no repository/library-owned source type today.
- `EvidenceCard` is one-to-one with `Evidence` and stores OCR/readable data: OCR text/lines/paragraphs/tables, extracted/normalized fields, warnings, matched event/participant IDs, matched knowledge item IDs, confidence, SmartReader metadata, AI summary, and optional raw provider response for privileged users.
- `EvidenceFile` links `Evidence` to `File` with a `fileRole`; files are not directly linked to reusable repository objects.
- `File` stores nullable `workspaceId`, `ownerId`, `storageType`, object key `filePath`, nullable `publicUrl`, original name, MIME type, size, uploader, and VNPT upload hash/type metadata.
- Manual application uploads use object keys shaped like `applications/{applicationId}/evidences/{evidenceId}/{timestamp}-{safeName}`. Decision imports use `decision-imports/{decisionImportId}/...`; event roster files use local `event-rosters/{eventId}`.
- `ApplicationRequirementResponse` can link an application requirement to an `evidenceId`, `metricId`, payload, status, and workspace. Current requirement linking requires the evidence to belong to the same application.
- Official events are represented by `EventRegistry`, `EventParticipant`, and `EventFile`. Confirmed decision imports can create or update `EventRegistry` rows with participants.
- `KnowledgeBaseItem` is a separate workspace-scoped reviewed-evidence reference store. It has title/event name, criterion, level, decision, reason, required fields, common errors, optional sample certificate file, and usage count, but it is not exposed as reusable attachable evidence/file content.

### Current Upload, Indexing, And Card Pipeline

- Frontend upload entry points are `AddEvidenceDrawer`, legacy `UploadEvidence`, and evidence actions embedded in `StudentApplicationActionWorkspace`.
- `AddEvidenceDrawer` creates an evidence record with `sourceType: "manual_upload"`, uploads one required file, and starts indexing only if the upload response lacks a `jobId`.
- Frontend `evidenceApi` uses:
  - `GET /api/applications/:applicationId/evidences`
  - `POST /api/applications/:applicationId/evidences`
  - `POST /api/evidences/:id/files`
  - `POST /api/evidences/:id/start-indexing`
  - `GET /api/evidences/:id`
  - `GET /api/evidences/:id/card`
  - `GET /api/evidences/:id/audit`
  - `GET /api/files/:id/signed-url`
- Upload invalidates current application, application evidence list, latest precheck, and criteria completion query keys.
- Backend upload validates file type/size, stores the file via `StorageService`, creates `File` and `EvidenceFile`, marks manual evidence as `pending_indexing`, creates/reuses an `IndexingJob` with `jobType=evidence_ocr`, and writes audit logs.
- `processEvidenceOcrJob` reads the primary evidence file, creates a `SmartReaderJob`, uploads/reuses VNPT file hash, runs sync/async OCR, normalizes OCR output, extracts and normalizes fields, matches against the event registry, scores confidence, upserts `EvidenceCard`, updates evidence status/indexing status, and audits card/matching/missing-info outcomes.
- `EvidenceDetailModal` polls the card/job for non-event imports until terminal statuses and shows tabs for card data and files.
- `EvidenceFilePreview` fetches signed URLs on demand and renders image previews with `<img>`, PDF previews with `<iframe>`, and an open-in-new-tab fallback.

### Current Approved Evidence And Event Library Behavior

- Primary current student "official evidence" UI is `/app/event-library`, rendering `ApprovedEvidencePage`.
- `ApprovedEvidencePage` now uses the compact student library endpoint `GET /api/evidence-matching/library` instead of the old approved-evidence search surface.
- The compact library query is typed through `eventsApi.searchOfficialEventLibrary` and `useOfficialEventLibrary`.
- Its React Query key is `officialEventLibraryKeys.list({ applicationId, search, criterion, page, limit })`; it includes `applicationId`, debounced `search`, `criterion`, `page`, and `limit`.
- Student library results use the minimal DTO: `eventId`, `title`, optional `organizer`, optional `organizerLevel`, `criterion`, and `state` (`available` or `already_imported`). The student UI does not render roster, OCR, file, participant count, event date, confidence, source file, or indexing metadata.
- The previous `searchApprovedEvidence` flow still exists in `useApprovedEvidenceSearch` and `eventsApi.searchApprovedEvidence` for legacy callers: it searches `/api/evidence-matching/search` and falls back to `/api/events/search` only on 404.
- `EvidenceMatchingService.search` is workspace-scoped, requires students to search only their own code/name, filters active roster-indexed events, ranks by event/document text, finds participant matches, and marks `importable` / `alreadyImported`.
- Import uses `/api/evidence-matching/:eventId/import`, falling back to `/api/events/:id/import-as-evidence` on 404.
- Backend `importEventAsEvidence` validates same workspace for application and event, checks the target student/participant, prevents duplicate event imports per application, then creates a new application-owned `Evidence` with `sourceType=event_import`, status `under_review`, indexing `indexed`, confidence `0.96`, and a synthetic `EvidenceCard` from official roster data.
- Decision imports are staff-facing; confirmed rosters become active `EventRegistry` rows and participants, which then become searchable/importable official evidence. Decision imports do not directly create reusable student evidence rows.
- Legacy `EventLibrary` still exists and searches events/checks participant/imports events, but `ApprovedEvidencePage` is the more current repository-like student surface.

### Student Frontend Implementation

- `/app/event-library` has a student-focused page header:
  - Title: `Kho minh chứng`
  - Subtitle: `Tìm hoạt động đã được Hội Sinh viên xác nhận và thêm vào hồ sơ.`
- The page uses a full-width search input with icon, 350ms debounce, clear button, and placeholder `Tìm tên sự kiện hoặc đơn vị tổ chức`.
- Criterion filters are wrapped chip buttons for `Tất cả`, `Đạo đức`, `Học tập`, `Thể lực`, `Tình nguyện`, and `Hội nhập`; selected state uses a soft primary surface and does not assign different colors per criterion.
- Event cards are wide, whole-card buttons in a 2-column desktop / 1-column mobile grid. They show only:
  - Title, max 2 lines.
  - Subtitle as `organizer` or `organizer · organizerLevel`.
  - Chevron for available items or a check icon for already-imported items.
- Loading uses skeleton cards with the same card height. Empty/error states use friendly Vietnamese copy and retry/clear actions without showing raw backend stack/messages.
- Import UX is implemented in `OfficialEventImportDialog` / `OfficialEventLibraryDialog` with internal states:
  - `confirm`
  - `checking`
  - `success`
  - `participant_not_found`
  - `already_imported`
  - `generic_error`
- `participant_not_found` closes the library/import dialog before opening the existing manual upload path. Standalone `/app/event-library` navigates to `/app/application?criterion=...&uploadEvidence=1`; `StudentApplicationActionWorkspace` consumes that search param once and opens `AddEvidenceDrawer` with the same criterion.
- Successful import does not automatically mark a criterion accepted. It creates the backend `Evidence` for the current application and updates/refetches the current application evidence state.
- `StudentApplicationActionWorkspace` now shows `Tìm trong kho` near the existing upload action when the selected criterion is editable and capability is detectable from criteria completion/form schema:
  - requirement/group `acceptedSources` includes `official_event`, or
  - existing requirement response kind is `official_event`/`legacy_event`, or
  - form schema `evidenceTypes` includes `official_event`/`event_import`.
- When capability is present, `Tìm trong kho` is primary and `Tải minh chứng từ máy` is secondary. The manual upload flow itself is still `AddEvidenceDrawer`.
- The in-workspace library dialog passes `applicationId` and locks the selected criterion by hiding criterion filters; search remains available.
- Import success invalidates targeted keys only:
  - `applicationKeys.current()`
  - `evidenceKeys.list(applicationId)`
  - `applicationKeys.latestPrecheck(applicationId)`
  - `applicationKeys.criteriaCompletion(applicationId)`
  - `officialEventLibraryKeys.all`
  - evidence detail/card/audit keys when an evidence id is returned
- The implementation does not call `queryClient.clear()`, does not reload the page, and does not reset selected criterion or form state.

### Application, User, And Workspace Links

- Current student application workspace is `/app/application` via `StudentApplicationActionWorkspace`; `/app/evidence` redirects there, and `/app/upload` still renders the legacy `EvidenceWorkspaceSafe`.
- `StudentApplicationActionWorkspace` loads current application, evidence list with `limit: 100`, latest precheck, and criteria completion. It groups evidences by selected criterion and embeds `StudentEvidenceCard`, `AddEvidenceDrawer`, and `EvidenceDetailModal`.
- Evidence is tied to an `applicationId` for individual student flows. Requirement responses can point to evidence IDs, but backend currently rejects evidence not linked to that same application.
- Current frontend query keys do not include workspace because there is no workspace switcher; backend derives workspace from the authenticated user.
- Workspace isolation is the backend security boundary. Non-admin protected APIs should rely on authenticated user workspace, not frontend query/header workspace IDs.

### Current Search, Filter, And Reuse Capabilities

- Application evidence list supports backend filters for criterion, evidence status, indexing status, page, and limit, but the current application workspace mostly fetches up to 100 and filters by criterion in memory.
- Approved evidence search supports query, criterion, current student identity, and frontend-only status filtering for importable/imported.
- Event registry list/search supports search and criterion filters; participants can be checked against an application/current student.
- Knowledge base search supports query, criterion, level, decision, page, and limit, with student-facing anonymization. The current `EvidenceSearch` route is a reference/case search, not a file/evidence attach flow.
- File preview/download is per-file signed URL access, not repository browsing. The UI only fetches URLs when viewing a specific evidence/file.
- Reuse today means "create a new evidence in this application from an official event participant" or "use a knowledge-base item as a reference count"; it does not mean "attach/reuse an existing uploaded evidence artifact across applications or years."

### Gaps For A Reusable Evidence Repository

- There is no standalone `EvidenceRepositoryItem`, library-owned evidence model, or repository file/link table.
- `Evidence` lacks a direct `workspaceId`, owner visibility policy, repository lifecycle state, reuse permissions, dedupe hash, academic year validity, expiry, or reusable evidence category/tags beyond `criterion/sourceType/eventId`.
- File object keys and metadata are application-centric, so cross-application reuse needs a copy-vs-reference decision for object storage and audit.
- Requirement response validation requires `evidence.applicationId === application.id`; reusable evidence would need an attach/link operation that creates an application evidence snapshot or relaxes/link-checks repository ownership safely.
- Official event import is one-way and duplicate-protected by event/application, but there is no general "save to repository", "attach existing repository evidence", or "detach from application" flow.
- Knowledge base does not expose sample file preview in the current frontend and cannot create student application evidence from a case.
- The UI has no repository management surface for ownership, visibility, review state, tags, validity period, duplicate detection, or bulk actions.
- Existing evidence list UI is criterion-scoped and card-based; repository browsing likely needs denser table/list patterns with search/filter/sort and explicit attach actions.
- Current upload/carding pipeline assumes one evidence target. Reindexing, status changes, and review decisions need clear semantics if many applications reference the same source artifact.

### Likely Backend Modules And Files Affected

- Prisma schema and migrations: `Evidence`, `EvidenceFile`, `File`, `EvidenceCard`, `ApplicationRequirementResponse`, possibly new repository/link tables.
- Evidence API: `src/modules/evidences/*` for repository create/list/detail/attach/reuse semantics, upload/indexing behavior, DTOs, validation, and audits.
- File/storage: `src/modules/files/*`, `src/modules/storage/*`, local/R2 adapters, and signed URL authorization for repository-owned files.
- Event/approved evidence: `src/modules/event-registry/*`, `src/modules/evidence-matching/*`, and `src/modules/decision-imports/*` if official rosters become first-class reusable repository entries.
- Criteria completion/application: `src/modules/criteria-completion/*` and `src/modules/applications/*` because requirement responses currently require application-owned evidence.
- Review/manager/resolution: evidence review status, task evidence links, supplement flows, aggregation/finalization if reused evidence status can affect multiple dossiers.
- Jobs/SmartReader: `src/modules/jobs/*` and evidence OCR processor if repository evidence can be indexed before being attached to an application.
- Knowledge base: `src/modules/knowledge-base/*` if reviewed references and repository artifacts are merged or cross-linked.
- Auth/workspace/audit: `src/shared/utils/workspace-scope.ts`, `AuditService`, and workspace isolation tests.

### Likely Frontend Modules And Files Affected

- Evidence API/hooks/types: `src/features/evidence/api/evidence.ts`, `src/features/evidence/hooks/useEvidence.ts`, `src/types/evidence.ts`, and possibly new repository-specific keys/types.
- Student workspace: `src/features/application/components/StudentApplicationActionWorkspace.tsx`, especially add-evidence actions, selected criterion evidence lists, and requirement response actions.
- Evidence UI: `AddEvidenceDrawer`, `StudentEvidenceCard`, `EvidenceDetailModal`, `EvidenceCardPanel`, `EvidenceFilePreview`, `EvidenceWorkspace`, and `EvidenceSearch`.
- Approved evidence/event UI: `ApprovedEvidencePage`, `ApprovedEvidenceFilters`, `ApprovedEvidenceCard`, `ImportEvidenceModal`, `EventLibrary`, event API clients and hooks.
- Decision import UI: `src/features/decision-import/*` if confirmed rosters surface as repository items.
- Shared route/layout: `src/routes/app.evidence.tsx`, `src/routes/app.evidence-search.tsx`, `src/routes/app.event-library.tsx`, `src/routes/app.upload.tsx`, sidebar/navigation if a primary repository route is added.
- Dense list/filter/table patterns to reuse: `ReviewFilters` + `ReviewTaskTable`, `DecisionImportList`, `WorkspaceTable`, and `ApprovedEvidenceFilters`.

### Workspace And Security Risks

- Do not let students attach or preview another student's uploaded files. Repository reads must be workspace-scoped and identity/visibility-scoped.
- Signed URL APIs must not grant access based only on repository item ID; they need owner/workspace/review/visibility checks and short-lived URLs.
- Cross-application/year reuse can leak past dossier data if raw OCR text, file names, or personal fields are shown outside the original owner context.
- Admin global access should stay explicit; manager/officer/committee should remain workspace-limited.
- If a repository item references an official event/participant, the participant match must still be for the target application student, not just any participant in the event.
- If uploaded evidence is reusable, decide whether review acceptance on one application applies globally, is copied as an application snapshot, or remains advisory only.
- Query keys still do not include workspace; adding a workspace switcher later requires cache key and invalidation redesign.
- Avoid sending raw OCR text, file names, signed URLs, student codes, emails, or private file URLs to SmartUX/Gemini/Smartbot payloads.

### UI Constraints From UI_GUIDE.md

- Keep the repository UI quiet, dense, operational, and workflow-focused. Avoid marketing-like hero sections, large decorative cards, heavy borders, gradients/orbs, and new visual languages.
- Reuse existing shell/layout and route structure. Keep pages within the operational canvas and handle overflow explicitly.
- Use compact filters with search inputs, selects/tabs/toggles, status badges, and predictable primary attach/upload actions.
- Use existing `Button`, Radix/shadcn primitives, project `ui-kit`, `StatusBadge`, `InlineAlert`, `SectionCard`, `UxStatusCard`, and lucide-react icons.
- Tables should remain horizontally scrollable on mobile. Do not replace dense operational tables with card grids unless the nearby existing mobile pattern already does.
- Use Vietnamese operational copy and keep labels short enough for mobile buttons.
- Do not show AI confidence scores or AI/provider diagnostics as official approval. Keep SmartReader output framed as support for human review.
- Verify desktop and mobile for overflow, clipped text, overlapping controls, and file preview containment.

### Verification Commands

- Frontend:
  - `npm run lint`
  - `npm run build`
  - Focused inspection: `rg -n "AddEvidenceDrawer|EvidenceDetailModal|StudentEvidenceCard|ApprovedEvidence|useApprovedEvidenceSearch|useEvidences|getSignedFileUrl" src`
- Backend:
  - `npm run build`
  - `npm run lint`
  - `npx prisma validate`
  - `npx prisma generate` after schema/client changes
  - Focused unit tests: `npx vitest run tests/unit/evidence-ocr-pipeline.test.ts tests/unit/evidence-matching.service.test.ts tests/unit/evidence-registry-matcher.test.ts tests/unit/official-import-name-match.test.ts tests/unit/evidence-student-status.test.ts`
  - Workspace isolation after any repository read/attach change: `npx vitest run tests/integration/workspace-isolation-flow.test.ts --maxWorkers=1 --testTimeout 300000 --hookTimeout 60000`
  - Non-AI application flow after attach/reuse changes: `npx vitest run tests/integration/non-ai-application-flow.test.ts --maxWorkers=1 --testTimeout 300000 --hookTimeout 60000`

### Staff Official Event Repository Frontend On 2026-07-18

- Staff canonical route is `/app/event-registry`, rendered by `EventRegistry`. It is separate from the student `/app/event-library` route.
- Existing route guard allows `officer`, `manager`, `committee`, and `admin`; students are denied. The sidebar now exposes `Sự kiện chính thức` for officers in addition to the existing manager event registry navigation.
- The page header is operational copy:
  - Title: `Kho sự kiện chính thức`
  - Subtitle: `Quản lý sự kiện, tài liệu nguồn và danh sách người tham gia.`
  - Primary action links to the existing `/app/decision-imports` route for event managers/officers/admins only. No new decision import modal or mutation UI was introduced.
- API/query additions:
  - `eventsApi.listEventsPage(filters)` reads paginated registry rows and keeps event list query keys separate by `q`, `criterion`, `status`, `page`, and `limit`.
  - `eventsApi.getStaffWorkspace(eventId)` reads `GET /api/events/:eventId/staff-workspace` into `StaffEventWorkspace`.
  - `eventsApi.getParticipantsPage(eventId, params)` reads paginated participants with backend `q`, `page`, and `limit`.
  - `useSignedFileUrl(fileId, enabled)` in the evidence hooks fetches signed URLs lazily and only after staff click `Xem`.
- Staff DTOs are typed in `src/lib/api/types.ts` as `StaffEventWorkspace`, `StaffEventFile`, and `StaffEventFileRole`. The staff workspace expects only staff-safe fields: event summary, source file metadata, decision import reference, and indexing row counts/status.
- Desktop layout uses three operational regions at wide widths: event list, selected event detail/documents/participants, and mapping/status/action. At `lg` widths the mapping panel opens in a drawer; below `lg` the experience becomes list-to-detail with tabs: `Thông tin`, `Tài liệu`, `Người tham gia`, and `Mapping`.
- Left event list behavior:
  - Search placeholder `Tìm sự kiện, đơn vị tổ chức`.
  - Criterion chips for all five criteria.
  - 68-78px row buttons with status badge, no thumbnails and no row actions.
  - Selected state uses a soft surface and keyboard-visible focus.
- Center detail behavior:
  - Shows event header and real backend index summary only. There is no fake progress.
  - Source files show metadata rows only until staff click `Xem`; image/PDF previews are bounded and use signed URLs.
  - Participants table uses backend search/page and columns `Họ tên`, `MSSV`, `Lớp`, `Trạng thái`; no inline edit or bulk action was added.
- Right mapping/status behavior:
  - Shows criterion, organizer level, converted value/unit, and friendly readiness status.
  - `committee` role remains read-only and does not see mutation buttons.
  - Completed/ready events show a read-only check row.
- Security and UX constraints preserved:
  - No batch signed URL fetch.
  - No student surface changes.
  - No AppShell/StudentAppShell/sidebar redesign beyond the minimal officer nav item.
  - No shared UI primitive changes.
  - No manual `routeTree.gen.ts` edit.
  - No QueryClient clear/reload flow.

### Staff Frontend Verification On 2026-07-18

- Passed targeted eslint:
  - `npx eslint src/features/event/components/EventRegistry.tsx src/features/event/api/events.ts src/features/event/hooks/useEvents.ts src/features/evidence/hooks/useEvidence.ts src/lib/api/types.ts src/components/layout/Sidebar.tsx`
- Passed production build:
  - `npm run build`
- Focused grep used after implementation:
  - `rg -n "official-events|event-library|EventRegistry|DecisionImport|getSignedFileUrl" src`
- Browser smoke was not run in this pass; no authenticated staff session/backend fixture was verified through the browser.

### Evidence Repository Hardening And Acceptance On 2026-07-18

- No frontend app source changes were needed during this hardening pass after the staff page implementation. The only frontend update in this pass is this context note.
- Backend hardening fixed officer signed-URL authorization for official event source files without changing the frontend `useSignedFileUrl(fileId, enabled)` lazy-loading behavior.
- Frontend security/static checks confirmed:
  - student compact library still calls `GET /api/evidence-matching/library`;
  - student DTO types expose only `eventId`, title, organizer, organizer level, criterion, and state;
  - student official-event cards render title/subtitle and no image, participant count, OCR/internal status, confidence, file ID, or signed URL;
  - staff `EventRegistry` requests signed URLs only after clicking `Xem`;
  - no new `X-Workspace-Id` header or protected workspace query parameter was added;
  - no full QueryClient clear/reload was added to the evidence repository flows. Existing `queryClient.clear()` calls remain in auth/login/logout/signup/sidebar paths only.
- Verification on 2026-07-18:
  - `npm run build`: passed.
  - Scoped lint for changed evidence repository files passed:
    - `npx eslint src/features/event/api/events.ts src/features/event/hooks/useApprovedEvidenceSearch.ts src/features/event/hooks/useEvents.ts src/features/event/components/ApprovedEvidencePage.tsx src/features/event/components/OfficialEventLibraryStudent.tsx src/features/event/components/official-event-library-copy.ts src/features/event/components/EventRegistry.tsx src/features/application/components/StudentApplicationActionWorkspace.tsx src/routes/app.event-library.tsx src/routes/app.application.tsx src/types/evidence.ts src/features/evidence/hooks/useEvidence.ts src/lib/api/types.ts src/components/layout/Sidebar.tsx`
  - Existing focused frontend tests passed:
    - `npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts src/features/application/components/__tests__/submit-confirmation-modal.test.ts`
  - `npm run lint` / `eslint .` did not complete after several minutes and was stopped; this matches the existing full-lint behavior noted elsewhere in this context. Scoped lint was used for the relevant module files.
  - Focused grep was run:
    - `rg -n "OfficialEventLibrary|EventRegistry|evidence-matching/library|Tìm trong kho|Kho minh chứng|Kho sự kiện" tests src/features src/routes`
    - `rg -n "X-Workspace-Id|workspaceId\\s*[:=]|queryClient\\.clear\\(|removeQueries|resetQueries|evidence-matching/library|OfficialEventLibrary|EventRegistry|useSignedFileUrl" src docs`
- Browser acceptance was not claimed. Clean authenticated student/staff sessions plus a working backend integration fixture were not available in this pass, and backend integration tests were blocked by local PostgreSQL at `localhost:5432`.
- Confirmed unchanged frontend areas for this pass: AppShell/StudentAppShell, auth/API client/workspace architecture, shared UI primitives, manual upload flow, Decision Import UI, submit/review/finalization/resolution surfaces, OCR/indexing UI behavior, and `src/routeTree.gen.ts`.

### Student Frontend Verification On 2026-07-18

- Passed targeted eslint:
  - `npx eslint src/features/event/api/events.ts src/features/event/hooks/useApprovedEvidenceSearch.ts src/features/event/components/ApprovedEvidencePage.tsx src/features/event/components/OfficialEventLibraryStudent.tsx src/features/event/components/official-event-library-copy.ts src/features/application/components/StudentApplicationActionWorkspace.tsx src/routes/app.event-library.tsx src/routes/app.application.tsx src/types/evidence.ts`
- Passed production build:
  - `npm run build`
- Focused grep used after implementation:
  - `rg -n "clear\(|removeQueries|resetQueries|invalidateQueries|officialEventLibraryKeys|evidence-matching/library|OfficialEventLibrary" src/features/event src/features/application/components/StudentApplicationActionWorkspace.tsx src/routes src/types/evidence.ts`
- Browser smoke was not run in this pass; no authenticated student session/backend fixture was verified through the browser.

### Open Questions

- Is "Kho minh chứng" meant to store a student's reusable private evidence, staff-approved workspace evidence templates, official event/roster evidence, or all three?
- Should repository reuse attach the original evidence/file by reference, copy it into a new application-owned evidence, or create an immutable snapshot?
- What visibility levels are required: private student, workspace staff, all students in workspace, global admin, or public official references?
- Does a previous human review decision travel with reused evidence, or must each application/review task re-verify it?
- How should expiry/validity by school year, issue date, criterion level, and criteria version be represented?
- Should Knowledge Base and Evidence Repository remain separate, merge, or cross-link reviewed cases with source files?
- Should decision-import confirmed rosters automatically create repository entries, or remain event registry rows that generate evidence only on student import?
- What dedupe strategy is acceptable: file hash, VNPT hash, event/participant key, normalized OCR fields, or manual staff merge?
- What audit trail is required for attach/detach/reuse, especially when a repository item is later corrected or revoked?
- Which MVP surface is primary: student attach from repository inside `/app/application`, standalone `/app/evidence-search`, staff repository management, or event/approved evidence only?

## Presentation Semantics Audit Context

This section reflects the presentation-semantics preparation pass on 2026-07-18. No UI adapter implementation, route change, API contract change, query-key change, mutation change, backend change, or layout refactor was made in this pass.

- The three-prompt workflow for this area is intentional:
  - Context prompt: load `AGENTS.md`, `docs/UI_GUIDE.md`, frontend/backend context, current diff, and repo constraints before touching code.
  - Audit/setup prompt: identify semantic presentation risks and prepare the adapter/skill/audit layer without visual refactor or backend contract changes.
  - Acceptance/remediation prompt: run browser/unit/static/build gates, fix only P0/P1 findings, document evidence, and keep the rollout flag off unless all strict gates are satisfied.
- Project-scoped skills were installed by copy under `.agents/skills`:
  - `redesign-existing-projects` from `https://github.com/Leonxlnx/taste-skill` at reviewed HEAD `7c397f22d3af6f2b3f1925eb147d8e8801086151`.
  - `web-design-guidelines` from `https://github.com/vercel-labs/agent-skills` at reviewed HEAD `f8a72b9603728bb92a217a879b7e62e43ad76c81`.
- Internal skill `.agents/skills/5tot-presentation-semantics` now documents status priority, operator semantics, requirement labels, source/action semantics, and evidence presentation rules.
- `AGENTS.md` now records instruction priority for Requirement Tree presentation work: frozen business/security contract, `docs/UI_GUIDE.md`, internal presentation skill, existing component/API patterns, then external design skills.
- `.env.example` now defines `VITE_PRESENTATION_SEMANTICS_V2=false`.
- `src/lib/presentation-semantics.ts` exposes `PRESENTATION_SEMANTICS_V2` for future adapter rollout while keeping the default UI path unchanged.
- Audit report: `docs/presentation-semantics-audit.md`.
- Main audit findings:
  - final/review/supplement status priority needs a centralized selector before V2 is enabled;
  - evidence count must remain metadata, not criterion completion;
  - raw requirement keys/source enums can still render in path/source/detail surfaces;
  - waiting states can become CTA labels through current next-action selection;
  - student-facing evidence detail still shows SmartReader confidence-style labels;
  - `src/routes/signup.tsx` contains mojibake copy that should be fixed in a separate scoped follow-up.

## Presentation Semantics V2 Implementation Context

This section reflects the frontend-only implementation pass on 2026-07-18. The rollout remains guarded by `VITE_PRESENTATION_SEMANTICS_V2=false` by default. No backend contract, API query/mutation, route, generated route tree, or layout architecture change was made.

- New adapter module: `src/features/application/presentation/*`.
- Tests: `src/features/application/presentation/__tests__/presentation-semantics.test.ts` with 20 passing Node tests.
- Main selectors:
  - `getStudentCriterionDisplayState` for final/review/supplement/resolution/review-status/completion priority.
  - `getRequirementGroupPresentation` and requirement label helpers for `all_of`, `one_of`, `at_least_n`, aggregation, optional groups, and unknown fallbacks.
  - `getSourcePresentation`, `formatSourceList`, and `getResponseSourcePresentation` for source copy.
  - `getActionPresentation` for passive waiting states versus clickable student actions.
  - `getEvidenceDisplayModel` for student evidence status/source/title/action display.
  - `ui-adapter` for bridging adapter models into the existing UI component shapes.
- Wired V2 paths:
  - `StudentOverview` criterion display state and next actions.
  - `StudentApplicationActionWorkspace` criterion display state, requirement labels, source labels, accepted source chips, integration field labels, evidence drawer context, and bottom action states.
  - `AddEvidenceDrawer` requirement context copy without payload changes.
  - `StudentEvidenceCard` evidence display model.
- Verification completed:
  - `npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts`
  - `npx eslint src/features/application/presentation src/features/application/components/StudentOverview.tsx src/features/application/components/StudentApplicationActionWorkspace.tsx src/features/evidence/components/AddEvidenceDrawer.tsx src/features/evidence/components/StudentEvidenceCard.tsx src/routes/signup.tsx`
  - `npx eslint src` passed with 11 pre-existing warnings.
  - `npm run build` passed with default flag false.
  - `VITE_PRESENTATION_SEMANTICS_V2=true npm run build` passed.
- Acceptance/remediation pass on 2026-07-18:
  - Added `src/features/application/components/submit-confirmation-summary.ts` and modal tests so evidence-count-only submission copy is waiting/verification copy, not completion copy.
  - Fixed evidence source fallbacks in `EvidenceWorkspace` and `EvidenceDetailModal` to use `getSourcePresentation`.
  - Removed SmartReader confidence-style badges from `EvidenceCardPanel` field rows.
  - Added test-only Playwright coverage in `tests/presentation-semantics-acceptance.spec.ts` and `playwright.config.ts`.
  - Added npm override `nf3=0.3.22` to align Nitro dependency resolution with `@vercel/nft@1.10.2`.
- Updated verification completed:
  - `npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts src/features/application/components/__tests__/submit-confirmation-modal.test.ts` passed 23/23 tests.
  - `PLAYWRIGHT_BASE_URL=http://localhost:5173 VITE_API_BASE_URL=http://localhost:8080 npx playwright test tests/presentation-semantics-acceptance.spec.ts --project=chromium` passed 7/7 tests with V2 enabled.
  - `npx eslint src` passed with 11 pre-existing warnings.
  - `npx eslint playwright.config.ts tests/presentation-semantics-acceptance.spec.ts` passed.
  - `npm run build` passed.
  - `VITE_PRESENTATION_SEMANTICS_V2=true npm run build` passed.
  - Backend repo status remained clean; `src/routeTree.gen.ts` had no diff.
- Rollout remains conservative: default flag false until deep browser interaction regression cases are automated or manually signed off. Acceptance report: `docs/presentation-semantics-acceptance.md`.
- `src/routes/signup.tsx` mojibake copy was fixed in this pass and formatted successfully.

## Student Application UI V2 Phase 0 On 2026-07-19

- Phase 0 is a baseline and rollout-foundation pass only. No visual student application redesign was introduced.
- Baseline audit covered the student application routes/components, `StudentOverview`, application presentation adapters, evidence surfaces, official event library, notifications, `StudentAppShell`/sidebar, assistant support panels, existing Node/Playwright tests, `docs/UI_GUIDE.md`, and this context file.
- The root route already provides an application error surface through `src/routes/__root.tsx`; no additional route/component error boundary was added in this phase.
- Added independent rollout flag `VITE_STUDENT_APPLICATION_UI_V2=false` in `.env.example` and `src/lib/student-application-ui-v2.ts`.
  - The flag is separate from `VITE_PRESENTATION_SEMANTICS_V2`.
  - The flag is false unless the Vite env value is exactly `"true"`.
- Added delegated V2 entry module structure under `src/features/application/ui-v2/`:
  - `StudentOverviewV2.tsx` delegates directly to the current `StudentOverview`.
  - `StudentApplicationWorkspaceV2.tsx` delegates directly to the current `StudentApplicationActionWorkspace`.
  - `entry-selection.ts` exposes pure `selectStudentApplicationSurface`.
  - `components/`, `hooks/`, and `view-models/` are present as placeholders for later phases.
- Route selection is wired without duplicating routes or editing `src/routeTree.gen.ts`:
  - `/app` selects `StudentOverview` by default and `StudentOverviewV2` when `VITE_STUDENT_APPLICATION_UI_V2=true`; non-student fallback remains `Dashboard`.
  - `/app/overview` selects the same overview surface for student/fallback.
  - `/app/application` selects `StudentApplicationActionWorkspace` by default and `StudentApplicationWorkspaceV2` when the flag is true.
- Deep-link search validation for `/app/application` was extracted to `src/features/application/route-search.ts` without changing accepted params: `criterion`, `evidenceId`, and `uploadEvidence`.
- Smoke tests added:
  - `src/features/application/ui-v2/__tests__/entry-selection.test.ts` covers flag false selecting legacy and flag true selecting V2 entry points.
  - `src/features/application/__tests__/route-search.test.ts` covers accepted deep-link search params and non-string value handling.
- Verification on 2026-07-19:
  - Baseline `git status --short` before Phase 0 correction showed the earlier visible V2 attempt in `.env.example`, `docs/CODEBASE_CONTEXT.md`, `StudentApplicationActionWorkspace.tsx`, and untracked helper/test files. That visible V2 attempt was removed; `StudentApplicationActionWorkspace.tsx` has no content diff from `HEAD`.
  - Baseline existing Node tests passed: `npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts src/features/application/components/__tests__/submit-confirmation-modal.test.ts` passed 23/23 tests.
  - Updated Node smoke suite passed 27/27 tests: `npx tsx --test src/features/application/ui-v2/__tests__/entry-selection.test.ts src/features/application/__tests__/route-search.test.ts src/features/application/presentation/__tests__/presentation-semantics.test.ts src/features/application/components/__tests__/submit-confirmation-modal.test.ts`.
  - Scoped ESLint for changed files passed: `npx eslint src/lib/student-application-ui-v2.ts src/features/application/route-search.ts src/features/application/__tests__/route-search.test.ts src/features/application/ui-v2 src/routes/app.application.tsx src/routes/app.index.tsx src/routes/app.overview.tsx`.
  - `npm run build` passed.
  - PowerShell flag-enabled build passed: `$env:VITE_STUDENT_APPLICATION_UI_V2='true'; npm run build`.
- Existing failures recorded during Phase 0:
  - Full `npx eslint src` fails on pre-existing CRLF Prettier errors in untouched files including `src/components/layout/Sidebar.tsx`, `src/features/student/components/primitives.tsx`, and `src/lib/presentation-semantics.ts`, plus the known 11 warnings. These were not fixed in Phase 0.
  - Focused Playwright smoke against `http://127.0.0.1:5174` with local backend `http://localhost:8080` failed because the demo student fixture could not complete application data loading: `/app` navigation timed out with `net::ERR_ABORTED`, and `/app/application` logged `Không thể kết nối tới hệ thống hồ sơ. Vui lòng kiểm tra kết nối hoặc thử tải lại.` from `src/lib/api/client.ts`. No route crash or new error-boundary UI was proven by this browser run.

## Student Application UI V2 Phase 0.5 On 2026-07-19

- Phase 0.5 translated the mandatory design contract into shared V2 tokens and primitives only. No full page redesign, public preview route, backend contract change, route contract change, or generated route-tree edit was introduced.
- Visual system audit covered `src/styles.css`, `docs/UI_GUIDE.md`, Tailwind v4 tokens, `src/components/ui/*`, button/card/table/badge primitives, sidebar/student shell, typography, spacing, radius, and shadow usage.
- `src/components/ui-kit` is referenced by docs but does not exist in this checkout; V2 should use `src/components/ui/*`, `src/features/student/components/primitives.tsx`, and the new student-application V2 primitives instead of inventing another shared library.
- Internal token/component inventory lives at `docs/student-application-ui-v2-design-inventory.md`.
  - It maps each mandatory visual token or pattern to the current repo primitive/token and records whether V2 should reuse, extend, or deprecate the existing pattern.
  - Legacy large radius, decorative shadows, icon-container styling, one-hue criterion coloring, and metric-as-completion patterns are marked for V2 deprecation without changing legacy UI.
- V2 semantic aliases were added to `src/styles.css`:
  - institutional identity: navy, blue, cyan;
  - app/page surfaces and selected/hover surfaces;
  - divider, border, focus ring, and text roles;
  - four progress statuses: complete, waiting, supplement, not-started;
  - critical state;
  - control/section/overlay/pill radii;
  - overlay and paper elevation.
- Reusable V2 primitives were added under `src/features/application/ui-v2/components/`:
  - `InstitutionalLockup`, `PageTitleV2`, `ButtonV2`, `StatusPillV2`, `CriticalStateV2`, `CriteriaNavigationRowV2`, `FiveCriteriaSpineV2`, `DefinitionTableV2`, `PathSelectorListV2`, `ActivityLedgerV2`, `CompactEmptyStateV2`, `InlineErrorStateV2`, `EvidenceCardV2`, `StickyNextActionBarV2`, and `GuideSheetTriggerV2`.
  - `visual-contract.ts` centralizes status mapping, button variants, criterion navigation class output, and evidence preview type mapping.
  - Feature components should consume these semantic primitives/tokens instead of hardcoding local colors, radius, or shadow patterns.
- Evidence preview V2 behavior:
  - portrait documents use `object-contain`;
  - landscape photos use bounded image preview;
  - official data uses a data tile instead of a fake image;
  - loading and failed thumbnails have explicit accessible states.
- No preview route or Storybook surface was added because the repo does not currently have a safe internal preview pattern and Storybook is not installed. Do not add a public production preview route for V2 components.
- `docs/UI_GUIDE.md` now includes a short Student Application UI V2 contract section covering identity, surfaces, status system, spacing/radius, evidence preview, and anti-AI-slop rules.
- Focused V2 contract tests were added in `src/features/application/ui-v2/__tests__/visual-contract.test.tsx` for:
  - status labels/classes;
  - button variant semantic class output;
  - accessible labels;
  - criterion navigation active/focus state output;
  - evidence presentation type mapping;
  - no criterion-specific color styling in the V2 spine/row contract.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed V2 token/component/docs files.
  - Focused Node tests passed 10/10: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx src/features/application/ui-v2/__tests__/entry-selection.test.ts src/features/application/__tests__/route-search.test.ts`.
  - Scoped ESLint passed for changed source files: `npx eslint src/features/application/ui-v2 src/features/application/route-search.ts src/features/application/__tests__/route-search.test.ts src/lib/student-application-ui-v2.ts src/routes/app.application.tsx src/routes/app.index.tsx src/routes/app.overview.tsx`.
  - `npm run build` passed with default flags.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` was not re-fixed in Phase 0.5; Phase 0 already recorded the pre-existing full-lint CRLF Prettier failures and warnings.
  - Browser acceptance was not claimed in this phase because no full page refactor or internal preview route was added, and the prior local backend/student fixture issue remains the route-smoke blocker.

## Student Application UI V2 Phase 1 On 2026-07-19

- Phase 1 added the institutional identity shell foundation only behind `VITE_STUDENT_APPLICATION_UI_V2`. Legacy flag-off student UI and non-student shell identities remain on their existing paths.
- No verified logo asset was found in `public` or `src` by logo/seal/Hội/SV5T naming search. V2 `InstitutionalLockup` therefore uses a reserved `5T` mark and text hierarchy instead of downloading or inventing a seal.
- Student V2 identity wiring:
  - `StudentAppShell` uses `ApplicationContextBar` on mobile only when `VITE_STUDENT_APPLICATION_UI_V2=true`.
  - `Sidebar` uses `InstitutionalLockup` and `ApplicationContextBar` only when the authenticated backend role is `student` and the UI role is `student`.
  - Admin/officer/manager/committee sidebar identity branches are unchanged.
  - Workspace names come from `user.workspace.name` / `user.workspace.shortName`; missing workspace data falls back to neutral loading/deployment copy.
  - School year is displayed only from the already-present frontend application state, not hardcoded in the V2 lockup.
- Added compact utility links in the student V2 context bar:
  - `Quy định áp dụng`
  - `Trung tâm hỗ trợ`
  - `Thông tin hệ thống`

    These are compact shell links, not a fixed-height page footer.
- V2 token aliases in `src/styles.css` were extended with primary action blue, accent cyan, spacing scale aliases, and typography scale aliases. These are additive and safe for later V2 page work.
- V2 component additions/normalization under `src/features/application/ui-v2/components/`:
  - `ApplicationContextBar`
  - `SectionHeading`
  - `HairlineList`
  - `InlineStateMessage`
  - `CompactEmptyState`
  - `AccessibleIconButton`
  - `defaultApplicationContextBarLinks`
  - `mapStudentDisplayStatusToV2ProgressStatus`
- Status mapping now consumes the presentation-semantics display status shape and maps student progress to exactly four V2 progress states:
  - `complete` -> `Hoàn thành`
  - `waiting` -> `Đang chờ`
  - `supplement` -> `Cần bổ sung`
  - `not-started` -> `Chưa bắt đầu`
    Rejection/critical/error treatment remains separate from progress red styling.
- Student V2 sidebar visual constraints:
  - no new large footer;
  - no gradient, glass, decorative artwork, fake seal, or criterion colors;
  - no filled decorative icon containers in V2 student nav;
  - shell separators use borders/dividers instead of normal section shadows;
  - utility links have visible focus and 40px minimum hit height.
- Focused tests in `src/features/application/ui-v2/__tests__/visual-contract.test.tsx` now cover:
  - four-state progress label/classes;
  - presentation-semantics-to-V2 status mapping;
  - missing workspace fallback;
  - long workspace name wrapping without truncation;
  - accessible icon button naming;
  - utility link keyboard focus styling;
  - evidence preview type mapping.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed token, shell, V2 component, and test files.
  - Focused Node tests passed 14/14: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx src/features/application/ui-v2/__tests__/entry-selection.test.ts src/features/application/__tests__/route-search.test.ts`.
  - Scoped ESLint passed cleanly: `npx eslint src/components/layout/StudentAppShell.tsx src/components/layout/Sidebar.tsx src/features/application/ui-v2 src/features/application/route-search.ts src/features/application/__tests__/route-search.test.ts src/lib/student-application-ui-v2.ts`.
  - `npm run build` passed.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
  - Static source checks found no new hardcoded Bách khoa/university assumption in touched source and no direct hex colors, large pixel radii, named Tailwind status colors, or normal shadow utilities in the V2 component folder.
- Existing failures/limits for this phase:
  - Full `npx eslint src` still fails on pre-existing CRLF Prettier errors in presentation/student primitive files and reports the existing 11 warnings. The changed-file scoped lint is clean; unrelated CRLF cleanup was intentionally not performed.
  - Browser visual acceptance was not run because the previous local backend/student fixture blocker remains and Phase 1 did not add a standalone internal preview route.

## Student Application UI V2 Phase 2 On 2026-07-19

- Phase 2 implements the student overview V2 page behind `VITE_STUDENT_APPLICATION_UI_V2`. Flag-off still selects the legacy `StudentOverview` path, so the default student overview remains unchanged.
- `StudentOverviewV2` is now a real fixed-contract overview surface instead of a legacy delegate:
  - page container is constrained to approximately 1280px through the V2 student shell and overview content;
  - heading block is unframed and compact;
  - primary status strip is a single full-width primary surface with one primary action, one secondary check action, and a tertiary assistant text action;
  - no separate KPI card, progress chart, support card, decorative illustration, or five-card criteria dashboard was introduced;
  - `FiveCriteriaSpineV2` renders one grouped five-segment surface with semantic status pills and clickable criterion segments;
  - operational content uses the required wide/narrow grid, with "Việc bạn có thể làm" on the left and "Cập nhật hồ sơ" on the right.
- Overview data stays on the existing frontend/backend contracts:
  - `useCurrentApplication`, latest precheck, criteria completion, evidences, notifications, smart UX tracking, and existing application start behavior;
  - `getStudentApplicationSummary`, `getCriteriaUiState`, `getNextActions`, `getFeedbackUiItems`, and presentation-semantics status mapping;
  - the current school year constant matches the legacy overview behavior for this phase.
- The update ledger deliberately avoids duplicating actionable supplement/task notification text already shown in the left task list. Precheck and non-action notifications remain timestamped context rows.
- Mobile/tablet behavior follows the contract:
  - status strip remains full width;
  - criteria spine becomes horizontal scroll with snap and 150px minimum segments;
  - operational grid stacks;
  - top two tasks are shown by default on mobile, with the third available from larger breakpoints;
  - headings stay below oversized marketing scale.
- `StudentPageShell` applies the V2 1280px page width only when `VITE_STUDENT_APPLICATION_UI_V2=true`; non-V2 student pages and other roles keep their prior shell behavior.
- Focused tests added/updated:
  - overview route/entry tests from earlier phases continue to prove flag false selects legacy and flag true selects V2 entry points;
  - `visual-contract.test.tsx` now checks that `FiveCriteriaSpineV2` is one grouped five-segment surface with 150px mobile minimum segments and 104px minimum height, without card gaps or shadows.
- Verification on 2026-07-19:
  - Scoped Prettier passed for the changed Phase 2 files.
  - Focused Node tests passed 15/15: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx src/features/application/ui-v2/__tests__/entry-selection.test.ts src/features/application/__tests__/route-search.test.ts`.
  - Scoped ESLint passed cleanly: `npx eslint src/features/application/ui-v2 src/components/layout/StudentAppShell.tsx src/components/layout/Sidebar.tsx src/features/application/route-search.ts src/features/application/__tests__/route-search.test.ts src/lib/student-application-ui-v2.ts`.
  - `npm run build` passed with the default legacy flag state.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` remains blocked by the pre-existing CRLF Prettier failures recorded in earlier phases; this phase did not perform unrelated formatting cleanup.
  - Browser/Playwright viewport acceptance was not rerun because the prior local backend/student fixture blocker remains. Static contract tests and both builds passed.

## Student Application UI V2 Phase 3 On 2026-07-19

- Phase 3 implements the `/app/application` student dossier workspace V2 behind `VITE_STUDENT_APPLICATION_UI_V2`. Flag-off still selects the legacy `StudentApplicationActionWorkspace` route surface.
- `StudentApplicationWorkspaceV2` now uses the required two-column operational layout:
  - full-width application context bar with title, helper copy, school year, target level, overall status, and a right-aligned "Kiểm tra hồ sơ" action;
  - workspace grid `232px minmax(0, 1fr)` with 24px gap and no third guide column;
  - one grouped criteria navigation surface, sticky on desktop and horizontal snap selector on smaller screens;
  - main criterion workspace with separate header, action row, one data component, evidence gallery, guide sheet, and sticky bottom next-action bar.
- Data section selection is intentionally singular:
  - aggregation-backed requirements render `ActivityLedgerV2`;
  - one-of requirement groups render `PathSelectorListV2`;
  - metric/requirement rows render `DefinitionTableV2`;
  - fallback schema-only cases render one dynamic disclosure.
- Existing route/query and dialog behavior is preserved in the V2 workspace:
  - `criterion=` still selects and writes the active criterion;
  - `uploadEvidence=1` still opens `AddEvidenceDrawer` for the requested criterion;
  - official event import still uses `OfficialEventLibraryDialog`;
  - evidence detail still uses `EvidenceDetailModal`;
  - submit still uses `SubmitConfirmationModal`;
  - latest precheck still uses the existing `useLatestPrecheck` query.
- The fixed guide column was removed for V2. Criterion conditions now open in a right sheet with a 420px desktop target width and near-full-screen mobile width, with source regulation copy at the bottom and no duplicate assistant CTA.
- Evidence is rendered as a V2 gallery with `EvidenceCardV2` only. The V2 page does not mix file rows with cards.
- Student V2 sidebar was adjusted to match the attached reference more closely:
  - added the provided `Huy_hiệu_Hội_SVVN.svg.webp` asset as `src/assets/hsvvn-emblem.webp`;
  - added `src/types/assets.d.ts` for bundled WebP imports;
  - V2 student sidebar uses the emblem lockup, student initials, workspace/student-code/faculty/class rows, screenshot-style nav sizing, active left marker, and bottom logout divider;
  - admin/officer/manager/committee sidebar branches remain unchanged.
- Focused tests now cover:
  - the fixed two-column workspace contract, absence of a third guide column, sheet width, and sticky next-action bar;
  - the provided emblem and student metadata rows in the V2 sidebar.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed Phase 3 source, test, type, and docs files.
  - Focused Node tests passed 17/17: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx src/features/application/ui-v2/__tests__/entry-selection.test.ts src/features/application/__tests__/route-search.test.ts`.
  - Scoped ESLint passed cleanly: `npx eslint src/features/application/ui-v2 src/components/layout/Sidebar.tsx src/components/layout/StudentAppShell.tsx src/types/assets.d.ts src/features/application/route-search.ts src/features/application/__tests__/route-search.test.ts src/lib/student-application-ui-v2.ts`.
  - `npm run build` passed with the default legacy flag state.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` remains blocked by the pre-existing CRLF Prettier failures recorded in earlier phases; this phase did not perform unrelated formatting cleanup.
  - Browser/Playwright viewport acceptance was not rerun because the prior local backend/student fixture blocker remains.

## Student Application UI V2 Phase 4 On 2026-07-19

- Phase 4 refactors the `Đạo đức tốt` and `Học tập tốt` data presentation inside `StudentApplicationWorkspaceV2`, still only behind `VITE_STUDENT_APPLICATION_UI_V2`.
- Shared data presentation now uses `DefinitionTableV2` as a semantic desktop table with the required columns:
  - `Nội dung`
  - `Giá trị`
  - `Nguồn`
  - `Trạng thái`
  - `Hành động`
    Below the desktop breakpoint, the same rows render as stacked definition-list rows instead of squeezing table columns.
- Ethics V2 behavior:
  - base summary shows conduct score, violation status, and school year/source without nested row cards;
  - conduct score declaration uses the existing `useDeclareEthicsConductScore` mutation and payload shape;
  - conduct form is closed by default, opens from `Khai báo`/`Chỉnh điểm`, preserves input on API failure, and closes/resets only after a successful save;
  - violation status is passive student copy only. The student UI does not render a self-confirm/verification action for `no_violation`;
  - additional ethics achievements are collapsed by default and show `Không bắt buộc ở cấp hiện tại` when optional.
- Academic V2 behavior:
  - base summary shows scale, GPA/ĐTB, school year, source, verification status, no-F status, and period/school-year validation;
  - GPA declaration uses the existing `useDeclareAcademicGpa` mutation and unchanged payload shape;
  - GPA form is closed by default, opens from `Tự khai báo kết quả`/`Chỉnh kết quả`, supports scale 4 and scale 10 validation, preserves input on API failure, and closes/resets only after successful save;
  - additional academic achievements use presentation labels such as `Nghiên cứu khoa học` and `Bài báo khoa học`, never raw keys like `student_research` or `journal_article`.
- `src/features/application/ui-v2/view-models/criterion-data.ts` contains the focused Phase 4 pure helpers for:
  - conduct score validation;
  - GPA validation by scale;
  - optional achievement copy;
  - safe requirement labels backed by the presentation adapter.
- Student V2 sidebar was tightened to better match the provided screenshots:
  - V2 student width is now `296px`;
  - lockup logo/padding are smaller;
  - `HỘI SINH VIÊN VIỆT NAM` is kept on one line;
  - workspace text truncates in the sidebar lockup to prevent the top identity block from pushing navigation down.
- Focused tests added/updated:
  - conduct waiting state is passive and no self-confirm violation action exists;
  - GPA scale 4 and scale 10 validation;
  - progressive metric forms start closed and only close after `onSaveMetric()` succeeds;
  - optional achievement copy;
  - known/unknown achievement label fallback with no raw enum output.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed Phase 4 files.
  - Scoped ESLint passed cleanly: `npx eslint src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx src/features/application/ui-v2/components/data-display.tsx src/features/application/ui-v2/view-models/criterion-data.ts src/components/layout/Sidebar.tsx`.
  - Focused Node tests passed 17/17: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx`.
  - `npm run build` passed with the default legacy flag state.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` still fails on pre-existing CRLF Prettier errors in presentation/student primitive files and reports existing hook/fast-refresh warnings outside the Phase 4 scope. The changed-file scoped lint is clean; unrelated formatting cleanup was intentionally not performed.

## Phase 4 Part 1 — City Criteria and Soft Advisory Precheck (2026-09-27)

- Frontend work is isolated in `/private/tmp/phase4-city-criteria-frontend`, branch `phase4-city-criteria-frontend`, based on `0900b846a0f4316b218d94112612417b568d7223`. The original checkout and its untracked `__pycache__` remain untouched.
- For a student's initial personal City application, `/app/application` keeps the submit action enabled despite incomplete criteria when Phase 3 eligibility is `ELIGIBLE`. The existing confirmation dialog labels rules/OCR as reference advice, groups findings under the five official City criteria, offers `BỔ SUNG HỒ SƠ` and `VẪN NỘP HỒ SƠ`, and never calls a suggestion an official pass/fail. Phase 3 eligibility is still refreshed and enforced before submit; supplement resubmission does not query or show the initial City eligibility gate.
- When a source file is saved but City OCR fails or needs manual review, its original file remains on the evidence card and the City first-submit UI says staff will inspect the saved source. This copy/status override is limited to the initial personal City submission; other application levels retain the existing OCR failure behavior.
- City individual review tasks with a precheck show a compact five-criterion advisory panel on the existing review detail page. It uses neutral labels and asks reviewers to compare the original evidence; it does not update decisions. The reference-data tab separates student-entered GPA from OCR/SmartReader suggestion and confidence. The review route also now reads the authenticated role in the detail component so the existing reviewer page can render.
- Verification: 10 targeted Playwright tests passed for student City eligibility/copy, first submit with incomplete criteria, retained source after OCR failure, eligibility refresh/conflict handling, supplement resubmission, and reviewer advisory. One separate existing school-level supplement visibility test still fails because its fixture exposes the `Thêm` action while the assertion expects no matching action; it does not exercise the City first-submit changes. `npm run build` passed; `npm run lint` passed with the same 11 existing warnings. TypeScript reports 193 diagnostics versus the recorded baseline of 197; the diagnostics in touched files remain on unchanged code. No new test framework or route was added.

## Student Application UI V2 Phase 5 On 2026-07-19

- Phase 5 adds criterion-specific V2 interaction patterns for `Thể lực tốt`, `Tình nguyện tốt`, and `Hội nhập tốt` inside `StudentApplicationWorkspaceV2`, still only behind `VITE_STUDENT_APPLICATION_UI_V2`.
- Physical V2 behavior:
  - uses backend one-of/path requirement groups, preferring the `physical_path` group when present;
  - renders a path selector first with official Vietnamese labels/descriptions and no per-option `Chưa có` badges;
  - preserves the selected backend path key in subsequent payloads;
  - asks for confirmation before changing path when the open form has unsaved data;
  - only opens the selected path form/actions after selection;
  - `physical_course_result` keeps the existing `useDeclarePhysicalCourseResult` mutation and payload fields (`resultType`, `value`, `classification`, `schoolYear`, `replaceExisting`);
  - successful save closes/resets the form, while failed save preserves entered values.
- Volunteer V2 behavior:
  - uses backend aggregation as the displayed source of truth (`verifiedTotal`, `pendingVerificationTotal`, `threshold`, `unit`);
  - does not calculate official conversion in the frontend;
  - renders an `ActivityLedger`-style table on desktop and compact activity rows on smaller screens;
  - keeps the add-activity form closed until `Thêm hoạt động`;
  - keeps the existing `useAddVolunteerActivity` mutation and payload shape;
  - official event search/import remains available from the volunteer action area.
- Integration V2 behavior:
  - derives initial paths from configured backend requirement groups instead of defaulting to foreign language;
  - renders unknown path keys as `Hình thức khác` while preserving the original key in the payload;
  - progressively renders dynamic `formSchema` fields with labels from the presentation adapter;
  - shows official-event search only for selected paths that support official event sources;
  - manual upload remains available for selected paths that support manual/student declaration evidence.
- Shared Phase 5 interaction rules:
  - one form is open at a time within each criterion surface;
  - waiting/passive states are copy, not student confirmation actions;
  - readonly/completed states preserve existing data and hide mutation actions;
  - supplement mode limits mutation affordances to the requested criterion/path;
  - no raw enum/path/source keys should appear in rendered student copy.
- API typing change:
  - `AddIntegrationPathResponseInput.requirementKey` and the matching mutation variable type were widened from `IntegrationRequirementKey` to `string` so unknown backend-supported paths can round-trip without frontend key loss.
- Focused tests added/updated:
  - physical one-of initial copy and no default form;
  - path selection and unsaved path-change confirmation;
  - unknown integration path fallback with original key preservation;
  - volunteer aggregation display and no frontend conversion tokens;
  - official event actions scoped to supported selected paths;
  - dynamic integration field rendering from schema;
  - readonly and supplement mutation locks.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed Phase 5 files.
  - Scoped ESLint passed cleanly: `npx eslint src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx src/features/application/ui-v2/__tests__/visual-contract.test.tsx src/features/application/api/application.ts src/features/application/hooks/useApplication.ts`.
  - Focused Node tests passed 23/23: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx`.
  - `npm run build` passed with the default legacy flag state.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` still fails on pre-existing CRLF Prettier errors in `src/features/application/presentation/*`, `src/features/application/presentation/__tests__/presentation-semantics.test.ts`, `src/features/student/components/primitives.tsx`, and `src/lib/presentation-semantics.ts`; it also reports existing hook/fast-refresh warnings outside Phase 5 scope.
  - Browser/Playwright viewport acceptance was not rerun in this phase; the previous local browser connector/fixture limitation remains recorded above.

## Student Application UI V2 Phase 6 On 2026-07-19

- Phase 6 refactors the V2 evidence gallery and preview card presentation behind `VITE_STUDENT_APPLICATION_UI_V2`; upload, OCR/indexing polling, signed URL retrieval, and official event import endpoints remain unchanged.
- New V2 evidence primitives are exported from `src/features/application/ui-v2/components`:
  - `EvidenceGallery`
  - `EvidencePreviewCard`
  - `EvidenceThumbnail`
  - `OfficialDataTile`
  - compatibility export `EvidenceCardV2`
- Gallery behavior:
  - uses a stable responsive grid with 16px gaps, `sm:grid-cols-2`, and `xl:grid-cols-3`;
  - cards keep stable minimum height, two-line titles, compact metadata, criterion context, and visible keyboard focus;
  - thumbnail is the primary open target and has a visible touch affordance plus hover/focus `Xem` affordance;
  - card actions are available through compact overflow actions where permissions allow.
- Thumbnail classifier:
  - presentation-only, no API contract changes;
  - maps loading/failed states explicitly;
  - maps `event_import` or explicit official data to `official_data`;
  - classifies documents from PDF/document/certificate/transcript/award/decision context;
  - classifies photos only when evidence/path/name context indicates photo/activity/event usage;
  - unknown image/file cases default to safe contain/tile presentation instead of cropping by extension alone.
- Safe document/PDF handling:
  - no iframe/object/embed is rendered inside gallery cards;
  - no PDF dependency was added because the repo has no existing safe first-page thumbnail renderer and adding one would add SSR/Nitro risk;
  - gallery cards use deterministic document tiles or contain images, so documents are never cropped;
  - existing full preview remains in `EvidenceDetailModal`/`EvidenceFilePreview`, where signed URLs are requested only after the student opens the modal and chooses `Xem file` or open-in-new-tab.
- Official data tiles:
  - official imports render information tiles with verified source/event/value copy;
  - the V2 gallery does not pass file `publicUrl`/`url` into cards and suppresses source file names for `event_import` rows;
  - source file IDs, signed URLs, filenames, and OCR content are not sent to analytics by this phase.
- OCR/indexing state:
  - workflow status remains the semantic progress pill;
  - processing detail is separate copy such as `Hệ thống đang đọc minh chứng`;
  - preview/list visibility is not blocked while OCR is running.
- Official library integration:
  - V2 `/app/application` still opens the existing `OfficialEventLibraryDialog` with `applicationId={application.id}`, `criterion={selectedCriterion}`, and `hideCriterionFilters`;
  - successful import uses existing targeted query invalidations from `useImportOfficialEvent`;
  - no `queryClient.clear()`, page reload, or criterion auto-approval was introduced;
  - participant-not-found fallback continues to close the dialog and open manual upload with the current/selected criterion preserved.
- Focused tests added/updated:
  - document thumbnails use contain;
  - photo thumbnails use cover only when classified as photo;
  - unknown image evidence defaults to safe unknown/contain tile behavior;
  - official tile hides source-file details;
  - thumbnail cards expose accessible preview and overflow action names;
  - signed URLs are not requested before full preview;
  - official library opens with locked criterion and targeted invalidation behavior.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed Phase 6 files.
  - Scoped ESLint passed cleanly: `npx eslint src/features/application/ui-v2/components/EvidenceCardV2.tsx src/features/application/ui-v2/components/visual-contract.ts src/features/application/ui-v2/components/index.ts src/features/application/ui-v2/StudentApplicationWorkspaceV2.tsx src/features/application/ui-v2/__tests__/visual-contract.test.tsx src/features/event/components/OfficialEventLibraryStudent.tsx src/features/event/hooks/useApprovedEvidenceSearch.ts`.
  - Focused Node tests passed 27/27: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx`.
  - `npm run build` passed with the default legacy flag state.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` still fails on pre-existing CRLF Prettier errors in presentation/student primitive files and existing hook/fast-refresh warnings outside Phase 6 scope.
  - Browser/Playwright viewport acceptance was not rerun in this phase; the prior local browser connector/fixture limitation remains recorded above.

## Student Application UI V2 Phase 7 On 2026-07-19

- Phase 7 completes the student-facing feedback and assistant consistency pass without changing notification or chatbot endpoints.
- Student feedback behavior:
  - canonical student feedback remains `/app/feedback`, backed by `src/features/notifications/components/Notifications.tsx`;
  - staff/admin notification behavior remains on the existing non-student branch;
  - the student branch now renders an inbox-style surface with `Cần xử lý`, `Đã xử lý`, and `Tất cả` tabs;
  - rows show source, criterion or system context, timestamp, semantic `StatusPillV2`, direct criterion/application action, assistant link, and read acknowledgement;
  - empty states are compact row-area copy, not large task cards, and the feedback page no longer duplicates overview next-action CTAs;
  - long lists use local pagination over the existing notification response.
- Notification read behavior:
  - `useMarkNotificationRead` now applies optimistic read state across notification queries;
  - failed `PATCH /api/notifications/:id/read` rolls back cached notification lists;
  - successful reads still invalidate `notificationKeys.all`.
- Assistant behavior:
  - `/app/assistant` continues to render `StudentSupport` and `SmartbotPanel`;
  - `SmartbotPanel` still uses the existing streaming endpoint, fallback endpoint, local session state, SSE `meta`/`delta`/`card`/`final` handlers, `SmartbotCardRenderer`, and `SmartbotActionButton`;
  - layout now uses a fixed header, internally scrollable `role="log"` message area, and sticky bottom composer;
  - quick suggestions sit above the composer, scroll horizontally on mobile, and collapse after the first user message;
  - composer has a real label and a 44px send target;
  - stream/network errors preserve rendered conversation and leave the composer available.
- Cross-surface consistency:
  - student feedback now uses `StatusPillV2` and the same four V2 progress semantics as overview/application/evidence.
- Focused tests added/updated:
  - feedback inbox tabs and no duplicated overview next actions;
  - feedback V2 status mapping;
  - optimistic mark-read rollback;
  - assistant fixed scroll container and mounted composer;
  - assistant streaming/fallback preservation and error recovery;
  - mobile quick suggestion behavior;
  - student assistant official-decision disclaimer.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed Phase 7 files.
  - Scoped ESLint passed cleanly: `npx eslint src/features/notifications/components/Notifications.tsx src/features/notifications/hooks/useNotifications.ts src/features/student/selectors/student-ui.ts src/features/chatbot/components/SmartbotPanel.tsx src/features/core/components/StudentSupport.tsx src/features/application/ui-v2/__tests__/visual-contract.test.tsx`.
  - Focused Node tests passed 34/34: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx`.
  - `npm run build` passed with the default legacy flag state.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` still fails on pre-existing CRLF Prettier errors in `src/features/application/presentation/*`, `src/features/application/presentation/__tests__/presentation-semantics.test.ts`, `src/features/student/components/primitives.tsx`, and `src/lib/presentation-semantics.ts`; it also reports existing hook/fast-refresh warnings outside Phase 7 scope.
  - `npx playwright test tests/presentation-semantics-acceptance.spec.ts --project=chromium` ran with the available local dev/backend fixture: 6/7 tests passed. The failing test was the student route matrix on `/app`, which timed out reading `body` while the page snapshot showed `Đang kiểm tra phiên đăng nhập...`; the separate `/app/application` responsive smoke passed across the configured viewports.

## Student Evidence Knowledge Reference Experience On 2026-07-19

- `/app/event-library` now renders the student "Kho minh chứng" reference experience without backend, schema, submission, review, supplement, resolution, or finalization changes.
- The page preserves `StudentAppShell` and uses the existing `StudentPageShell`/`PageHeader`; it has one primary action `Thêm minh chứng`, one search input, compact 01-05 criterion filter, and title-only `ReferenceEventTile` results.
- Student search still uses the existing compact backend endpoint through `useOfficialEventLibrary` / `eventsApi.searchOfficialEventLibrary`; the hook now passes React Query `AbortSignal` through `apiClient` so stale debounced requests can be aborted.
- Search/filter state is preserved in `/app/event-library` URL params `q` and `criterion`.
- Selecting a reference title no longer imports official verified data from this page. It opens the existing `AddEvidenceDrawer`, prefills the event title and suggested criterion, stores reference metadata in the existing manual evidence create payload, and labels the primary action `Dùng tên sự kiện`.
- Existing `OfficialEventLibraryDialog` remains available for the separate official Event Registry import flow inside application workspaces.
- Added focused Node contract tests in `src/features/event/components/__tests__/student-reference-library.test.tsx` for title-only results, compact filters, loading/empty/error states, URL/search wiring, AddEvidenceDrawer prefill, focus targets, and responsive class contracts.

## Student Application UI V2 Phase 7.5 Visual QA On 2026-07-19

- Phase 7.5 audited V2 student surfaces against the mandatory design contract using Playwright screenshot capture and DOM metrics; no new product features or API behavior changes were introduced.
- The QA harness lives at `artifacts/phase-7-5/capture-visual-qa.cjs` and captures `overview`, `application` criteria, guide sheet, evidence full preview, feedback, assistant empty, and assistant long-conversation states at `1280x720`, `1440x900`, `768x1024`, and `390x844`.
- Captured artifacts are stored under `artifacts/phase-7-5/`; the full pass wrote `observations.json`, and the post-fix tablet overview recapture wrote `observations-targeted-overview-768.json`.
- Contract fixes made during QA:
  - V2 button/link/icon targets now meet the 44px minimum through shared V2 primitives and touched workspace controls;
  - the workspace sticky next-action bar now has bottom content clearance to avoid evidence overlap;
  - the student feedback V2 branch uses `ButtonV2`, semantic V2 colors, and 44px tab/action targets;
  - assistant layout colors moved from local hex classes to semantic V2 CSS variables, suggestions are 44px targets, and the message card shadow is suppressed;
  - evidence thumbnail cards no longer apply normal section shadows, while document thumbnails retain `object-contain`;
  - dialog/sheet close controls and evidence preview controls meet 44px targets;
  - the tablet overview criteria spine uses the horizontal-scroll contract and no longer squeezes status copy into one-character wrapping.
- Visual QA findings after fixes:
  - main captured student surfaces report no page-level horizontal overflow, no sub-44px actionable targets, no radius above the contract threshold, and no raw enum text in the DOM metrics;
  - guide sheet and evidence preview still have overlay/dialog elevation, which is allowed by the contract;
  - the legacy non-V2 notification branch still contains older local color/shadow classes and was left untouched to preserve flag-off behavior.
- Verification on 2026-07-19:
  - Scoped Prettier passed for changed Phase 7.5 files.
  - Scoped ESLint passed cleanly for changed V2, feedback, assistant, evidence preview, dialog, and sheet files.
  - Focused Node tests passed 34/34: `npx tsx --test src/features/application/ui-v2/__tests__/visual-contract.test.tsx`.
  - `npm run build` passed with the default legacy flag state when run serially.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - Full `npx eslint src` still fails on pre-existing CRLF Prettier errors and existing hook/fast-refresh warnings outside the Phase 7.5 change set.
  - The visual QA browser log captured a third-party/runtime `MutationObserver.observe` error and two uncaptured `404` resource messages; screenshots rendered and DOM metrics remained clean.

## Student Evidence Knowledge Discoverability Patch On 2026-07-19

- `/app/event-library` remains the existing student "Kho minh chứng" page rendered by `src/routes/app.event-library.tsx` and `src/features/event/components/ApprovedEvidencePage.tsx`; the page was not rebuilt.
- Student discoverability now uses the existing shell patterns:
  - desktop sidebar: `src/components/layout/Sidebar.tsx` adds one `Kho minh chứng` item to `/app/event-library` and preserves active-state normalization for that route;
  - mobile student bottom nav: `src/components/layout/StudentAppShell.tsx` exposes the same route with the existing icon/label pattern and keeps `/app/event-library` active independently from `/app/application`.
- Student reference search now requests `projection=reference` through `src/features/event/hooks/useApprovedEvidenceSearch.ts` and `src/features/event/api/events.ts`.
- The student reference page maps API results into a strict title-only shape `{ eventId, title }` before rendering `ReferenceEventTile`; it does not render organizer, criterion, status, counts, OCR, files, reviewer, confidence, or resolution metadata.
- Selecting a reference title still opens the existing manual `AddEvidenceDrawer`; the create payload now includes the selected `eventId` at top level and in metadata so backend evidence creation can link the selected canonical event without invoking the separate official Event Registry import flow.
- Focused source-contract tests in `src/features/event/components/__tests__/student-reference-library.test.tsx` cover the sidebar/mobile nav entry, student route guard ownership, strict reference projection, deduplicated title-only mapping, AddEvidenceDrawer event prefill, loading/empty/error states, keyboard/focus target contracts, compact filters, and responsive class contracts.
- Verification on 2026-07-19:
  - `npx tsx --test src/features/event/components/__tests__/student-reference-library.test.tsx`: passed, 8/8 tests.
  - Scoped ESLint passed for the changed student event-library, navigation, evidence API/drawer, and reference-library test files.
  - `npm run build`: passed.
  - Full `npm run lint` (`eslint .`) was attempted, produced no output for several minutes, and was stopped to avoid leaving a background lint process; the repository's pre-existing full-lint backlog remains noted above.

## Student Application UI V2 Phase 8 Production Hardening On 2026-07-19

- Phase 8 added a focused Playwright acceptance specification at `tests/student-application-ui-v2-acceptance.spec.ts` and a local executable browser harness at `artifacts/phase-8/v2-acceptance.cjs`.
- The Playwright spec covers the requested V2 route matrix in mocked mode: overview loading/draft/no-action/supplement/completed states, `/app/application` criteria deep links, upload-evidence deep link, guide/evidence preview affordances, academic success/error, ethics passive verification, physical path change confirmation, volunteer ledger, integration dynamic path, official-library participant-not-found fallback, readonly/submitted state, supplement-limited editing, feedback empty/list, and assistant long-conversation layout.
- The direct harness can record viewport screenshots/DOM metrics under `artifacts/phase-8/`, but the latest attempted run failed on the auth-loading interstitial before reaching V2 UI. The stale Phase 8 PNG/JSON outputs from that invalid run were removed so they are not mistaken for acceptance evidence.
- Hardening fix made during this phase:
  - V2 overview action links now carry the same minimum 44px touch-target sizing on the rendered anchor element, avoiding sub-target measurements in tablet/mobile acceptance checks.
- Static verification on 2026-07-19:
  - Scoped Prettier passed for the Phase 8 changed files.
  - Scoped ESLint passed cleanly for `src/features/application/ui-v2/StudentOverviewV2.tsx`, `tests/student-application-ui-v2-acceptance.spec.ts`, and `artifacts/phase-8/v2-acceptance.cjs`.
  - Focused Node/component tests passed 69/69: `npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts src/features/application/components/__tests__/submit-confirmation-modal.test.ts src/features/application/__tests__/route-search.test.ts src/features/application/ui-v2/__tests__/entry-selection.test.ts src/features/application/ui-v2/__tests__/visual-contract.test.tsx src/features/event/components/__tests__/student-reference-library.test.tsx`.
  - `npm run build` passed with the default legacy flag state.
  - PowerShell flag-enabled build passed with `VITE_STUDENT_APPLICATION_UI_V2=true`.
- Existing failures/limits for this phase:
  - `npx eslint src` still fails on pre-existing CRLF Prettier errors in presentation/student primitive files and existing hook/fast-refresh warnings outside the V2 hardening changes.
  - Formal Playwright runner was attempted against `http://127.0.0.1:5173` with `PW_STUDENT_UI_MODE=v2`; it failed because the page remained on `Đang kiểm tra phiên đăng nhập...`.
  - A separate V2 dev server on `http://127.0.0.1:5176` was restarted with `--force`, but SSR/client hydration remained blocked by the TanStack Start client-entry module fetch issue; no valid mocked browser acceptance pass was achieved in this phase.
  - Production preview remains blocked by the existing TanStack preview server lookup for `dist/server/server.js`; the build output is Vercel/Nitro-oriented under `.vercel/output`.
  - No clean live backend student session/database fixture was available during this phase, so login, declaration mutation, upload, import, precheck, submit, feedback, and assistant real E2E flows were not verified.

## Officer Evidence Knowledge Workspace On 2026-07-19

- `/app/evidence-knowledge` now renders the officer-only `Kho minh chứng chuyên trách` workspace through `src/routes/app.evidence-knowledge.tsx` and `src/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage.tsx`.
- The existing officer sidebar in `src/components/layout/Sidebar.tsx` adds exactly one navigation entry for `/app/evidence-knowledge`; `src/features/auth/route-guard.ts` treats the route as an officer/review-role surface.
- The officer workspace uses the additive backend evidence-knowledge endpoints:
  - `GET /api/evidence-knowledge/officer/search` via `useOfficerKnowledgeSearch`;
  - `GET /api/evidence-knowledge/officer/events/:eventId` via `useOfficerKnowledgeEventDetail`;
  - protected file previews continue through the existing signed-file delivery hook.
- The page follows the lock layout: full-width search, `340px` desktop event list, `minmax(0,1fr)` selected-event workspace, 24px gap, compact 64-72px rows, two-column accepted-evidence gallery, and a 420px detail sheet.
- `src/features/review/components/ReviewDecisionPanel.tsx` now performs non-blocking precedent lookup for open review tasks via `GET /api/review/tasks/:taskId/precedents/check`, shows one compact inline precedent panel, supports explicit `Chấp nhận theo tiền lệ`, and runs a pre-resolution guard that requires one concise reason before continuing when a suitable precedent is present.
- Review API request types now carry optional precedent references and guard fields without changing existing response shapes.
- Focused frontend tests live in `src/features/evidence-knowledge/components/__tests__/officer-evidence-knowledge.test.tsx` and cover route/sidebar contracts, search/detail projection safety, gallery/sheet layout contracts, review precedent panel behavior, pre-resolution guard wording, and student title-only visibility.

## Evidence Knowledge Frontend Integration Patch On 2026-07-20

- The student discoverability and officer navigation items remain implemented through existing shell patterns:
  - `src/components/layout/Sidebar.tsx` exposes `/app/event-library` for students and `/app/evidence-knowledge` for officer/review roles;
  - `src/components/layout/StudentAppShell.tsx` exposes `Kho minh chứng` in the existing student mobile navigation.
- `src/features/evidence-knowledge/types.ts` now accepts optional `precedentId` and `precedentEvidenceId` from officer search results while remaining compatible with the current backend DTO that may only return event-level search items.
- `src/features/review/components/ReviewDecisionPanel.tsx` now resolves the concrete precedent reference from the selected event detail when search results do not include a direct precedent id:
  - explicit accept-with-precedent sends `precedentId`, `precedentEventId`, and `precedentEvidenceId` when available;
  - pre-resolution escalation sends `precedentId` plus existing `precedentGuardViewed` and `precedentGuardReason` fields;
  - guard reason labels match the approved copy: `Khác cấp xét`, `Khác đơn vị tổ chức`, `Thông tin minh chứng mâu thuẫn`, `Lý do khác`.
- `src/features/review/hooks/useReview.ts` invalidates the application aggregation query after successful review decisions in addition to the existing task/dashboard/knowledge invalidations.
- Verification on 2026-07-20:
  - Scoped ESLint passed cleanly for evidence-knowledge, route, navigation, auth guard, review integration, student reference library, and AddEvidenceDrawer files.
  - Focused tests passed 15/15: `npx tsx --test src/features/event/components/__tests__/student-reference-library.test.tsx src/features/evidence-knowledge/components/__tests__/officer-evidence-knowledge.test.tsx`.
  - `npm run build` passed.
  - Full `npm run lint` (`eslint .`) was started but produced no output after multiple minutes and was stopped by terminating the specific `eslint .` process; scoped lint remains the actionable verification for this patch.
  - Browser/plugin live verification reached `/app/evidence-knowledge` but the real backend seed login returned HTTP 500, so authenticated live backend E2E could not be completed.
  - Mocked Playwright viewport verification against local Vite passed content/layout checks at `1280x720`, `1024x768`, and `390x844`: title, search height 44px, event rows, accepted-evidence gallery, detail sheet, no forbidden AI/KPI/import wording, and no document-level horizontal overflow.

## Evidence Knowledge Real Browser/API Acceptance Attempt On 2026-07-20

- Real local browser/API acceptance was attempted against frontend `http://127.0.0.1:5173` and backend `http://127.0.0.1:8080` after restarting stale repo-specific dev processes.
- Student verification used the real seeded account `student@dut.udn.vn` and existing application `8d9d6c66-7999-456e-a28c-12d879275030`.
- Student browser findings:
  - `/app` student shell contains the `Kho minh chứng` navigation item.
  - `/app/event-library` renders the `Kho minh chứng` page with the approved compact header, one `Thêm minh chứng` action, one search input, compact 01-05 criterion tabs, and title-only result rows.
  - No visible student page text exposed OCR, reviewer identity, internal counts, Resolution details, confidence, AI wording, images, or file previews.
  - Selecting `Chương trình Tình nguyện Hè 2025` opened the existing manual evidence sheet with the explanation that the student must upload their own file and the primary action `Dùng tên sự kiện`; `Import minh chứng` was not shown in this flow.
  - Viewport checks at `1280x720`, `1024x768`, and `390x844` found no document-level horizontal overflow on the student event-library page.
- Student API findings through `GET /api/evidence-matching/library?projection=reference`:
  - `Mùa hè xanh 2025`, `mua he xanh 2025`, and `MHX 2025` each returned one displayed reference title: `Chương trình Tình nguyện Hè 2025`.
  - The response item fields were limited to `eventId` and `title`.
  - The typo query `mua he xnah` returned zero results, so typo-tolerant matching is not accepted in the live environment.
- Officer browser findings:
  - `/app/evidence-knowledge` renders the officer shell navigation item `Kho minh chứng chuyên trách`, the page title, metadata helper, and inline retry error state.
  - Viewport checks at `1280x720`, `1024x768`, and `390x844` found no document-level horizontal overflow and no KPI/dashboard/confidence/AI wording on the loaded officer error state.
  - Event list data, event detail, accepted-evidence gallery, protected previews, and detail sheet could not be accepted because the real officer API returned HTTP 500.
- Review, Resolution, and full regression browser acceptance were not executed to completion because the officer evidence-knowledge backend dependency is unavailable in the configured database.
- Browser console noise observed during this pass included third-party Statsig/network errors and existing SmartUX/MutationObserver/hydration warnings; these were not treated as Evidence Knowledge acceptance blockers unless they affect the module UI directly.
- Final module acceptance for this real pass: `FINAL_MODULE_ACCEPTANCE: FAIL`.

## Evidence Knowledge Browser Regression Recheck On 2026-07-20

- Re-ran real Browser/API verification against frontend `http://127.0.0.1:5173` and backend `http://127.0.0.1:8080`.
- Frontend `npm run build` passed before the browser pass.
- Student UI route matrix after real login through the browser:
  - `/app`, `/app/application`, `/app/event-library`, `/app/feedback`, and `/app/assistant` loaded with content, no crash text, and no document-level horizontal overflow in the tested desktop viewport.
  - Student navigation includes `Kho minh chứng`.
  - `/app/event-library` showed the `Kho minh chứng` page, helper text, `Thêm minh chứng`, and student bottom navigation without visible internal OCR/reviewer/confidence/Resolution fields in the inspected text.
- New frontend regression found:
  - In a browser role-switch scenario from officer to student, directly opening `/app/evidence-knowledge` as the student session changed the URL back to `/app` but continued rendering `Kho minh chứng chuyên trách` content after a 6-second recheck.
  - Backend permission for the same student token returned 403, so this is a frontend route/render/cache leak rather than backend authorization success.
  - Treat this as a student-business-flow blocker until the officer workspace route is fully unmounted/cleared on denied student access and role switch.
- Browser limitations/noise during this pass:
  - One fresh login tab did not complete the student redirect despite rendered inputs; the original authenticated browser session was used for the route matrix.
  - Third-party Statsig/SmartUX errors and React hydration mismatch logs continued to appear.
- Full Evidence Knowledge E2E remains failed/blocked because the officer API still depends on a pending backend migration.

## Evidence Knowledge Student Guard Fix On 2026-07-20

- `src/routes/app.evidence-knowledge.tsx` now has its own `requireAuthenticatedAppRoute` before-load guard for `/app/evidence-knowledge` instead of depending only on the `/app` parent guard.
- `src/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage.tsx` now enforces a runtime staff allowlist (`officer`, `manager`, `committee`, `admin`): non-staff users return `null`, are redirected to their default app path, and officer knowledge search/detail queries are disabled.
- Focused source tests in `src/features/evidence-knowledge/components/__tests__/officer-evidence-knowledge.test.tsx` cover the direct route guard and the non-staff no-render/no-query contract.
- Verification after the fix:
  - `npx tsx --test src/features/evidence-knowledge/components/__tests__/officer-evidence-knowledge.test.tsx` passed 8/8.
  - Scoped ESLint passed for `src/routes/app.evidence-knowledge.tsx`, `src/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage.tsx`, and the focused test file.
  - `npm run build` passed.
  - Browser student regression: after logging in as `student@dut.udn.vn`, direct navigation to `/app/evidence-knowledge` redirected to `/app`, rendered the student shell/dashboard, did not paint `Kho minh chứng chuyên trách`, did not crash, and had no document-level horizontal overflow.
  - Browser officer regression: after logging in as `officer.academic@dut.udn.vn`, `/app/evidence-knowledge` rendered the officer shell and `Kho minh chứng chuyên trách` page without crash or horizontal overflow. The page showed the expected inline API error because the configured backend database still lacks the pending evidence-knowledge migration/data readiness.

## Ethics Reviewer-Owned Verification Frontend On 2026-07-20

- Frontend now consumes the additive backend requirement metadata on `RequirementItem`:
  - `responsibility?: "student" | "system" | "reviewer" | "committee"`;
  - `blocksSubmission?: boolean`;
  - `verificationStage?: "draft" | "precheck" | "review" | "resolution"`.
- Student application legacy workspace and Student Application UI V2 now render `ethics.no_violation` as reviewer-owned:
  - unresolved value/source copy uses `Cán bộ xét duyệt` / `Cán bộ xét duyệt xác minh`;
  - unresolved status is shown as passive reviewer waiting (`Chờ cán bộ`) instead of missing student work;
  - student-facing passive copy says cán bộ xét duyệt verifies after submission and the student does not self-confirm;
  - old dead-end wording such as `Chờ nhà trường xác minh/xác nhận tình trạng vi phạm` was removed from application/student surfaces.
- Presentation action semantics now map backend `reviewer_verification` and legacy `wait_system_confirmation` to the non-interactive `wait_for_confirmation` action, labelled `Đang chờ cán bộ xác minh`.
- Added focused presentation regression for the target state: draft Ethics with all student-owned requirements complete and reviewer-owned violation verification unresolved displays `Sẵn sàng kiểm tra`, has no primary student action, and remains completion-sourced.
- Live API acceptance against backend `http://127.0.0.1:8080` with seed `student@dut.udn.vn` confirmed the existing application exposes `no_violation` as `responsibility=reviewer`, `blocksSubmission=false`, `verificationStage=review`, and does not include `no_violation` in Ethics precheck missing/needs-verification keys. The seeded app is already `under_review` at `city`, so it is not a clean draft-before-submit fixture.
- Browser plugin acceptance was attempted twice but the in-app Browser webview failed to attach. Local Playwright fallback was used against frontend `http://127.0.0.1:8082` and backend `http://127.0.0.1:8080`:
  - student `/app/application?criterion=ethics` desktop `1280x720`: loaded without page/console errors, showed `Đạo đức tốt`, `Tình trạng vi phạm`, reviewer copy, and no old `Chờ nhà trường...` wording;
  - student mobile `390x844`: loaded without document-level horizontal overflow;
  - officer `officer.ethics@dut.udn.vn` `/app/queue`: loaded without page/console errors or horizontal overflow and rendered review-oriented content.
- Verification:
  - `npm run build`: passed.
  - Full `npm run lint` was attempted and stopped after multiple no-output intervals, matching the repo's known full-lint behavior.
  - Scoped ESLint passed for the touched contract/presentation/application files.
  - `npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts`: passed, 22 tests.

## Evidence Knowledge UI Refactor Lock Audit On 2026-07-20

- Documentation-only UI refactor lock was added at `D:\02_PROJECTS\5TOT\docs\evidence-knowledge\EVIDENCE_KNOWLEDGE_UI_REFACTOR_LOCK.md`; no runtime route, component, API, or schema code was changed in this audit.
- The root design contract file `D:\02_PROJECTS\5TOT\docs\ui-v2\MANDATORY_DESIGN_SYSTEM_AND_LAYOUT_CONTRACT.md` still contains only the earlier blocking placeholder rather than the complete upstream mandatory design contract.
- Current student library facts verified from source:
  - `/app/event-library` is registered by `src/routes/app.event-library.tsx` and renders `src/features/event/components/ApprovedEvidencePage.tsx`.
  - `ApprovedEvidencePage` preserves `q` and `criterion` search params, renders `StudentReferenceEventLibrary`, and opens `src/features/evidence/components/AddEvidenceDrawer.tsx` with `referenceEvent.eventId/title`.
  - `StudentReferenceEventLibrary` in `src/features/event/components/OfficialEventLibraryStudent.tsx` uses `useOfficialEventLibrary` with `projection: "reference"`, debounces at 280ms, maps items down to `{ eventId, title }`, and renders a two-column title-only `ReferenceEventTile` grid.
  - The student reference criterion filter shows 01-05 only; it can reset by clicking the active criterion but does not render an explicit `Tất cả` option.
- Current Add Evidence facts verified from source:
  - `AddEvidenceDrawer` is still a `Drawer` using `max-w-2xl` and `max-h-[92dvh]`.
  - It has a plain event-name `Input`, no evidence-reference autocomplete, no explicit close button, staff note visible by default, and selected file text but no replace/remove file summary pattern.
- Current officer library facts verified from source:
  - `/app/evidence-knowledge` is registered by `src/routes/app.evidence-knowledge.tsx`, uses a before-load auth guard, and renders `src/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage.tsx`.
  - Officer runtime access is restricted to `officer`, `manager`, `committee`, and `admin`.
  - The current sidebar label is `Kho minh chứng chuyên trách`; the refactor lock requires changing only the sidebar label to `Kho tiền lệ` while keeping the page title unchanged.
  - Current layout uses a bordered search container, a rounded/bordered left aside, and separate workspace cards; the refactor lock requires one flatter grouped split surface with one vertical divider.
  - Current detail is `src/features/evidence-knowledge/components/EvidencePrecedentSheet.tsx`, a narrow right sheet around 420px; the lock requires replacing it with a wide dialog with tabs and separated preview/details regions.
- Current review precedent facts verified from source:
  - `src/features/review/components/ReviewDecisionPanel.tsx` already performs non-blocking precedent checks, shows one compact inline panel, supports `Xem tiền lệ`, explicit `Chấp nhận theo tiền lệ`, and a non-blocking pre-resolution guard.
  - `Xem tiền lệ` currently opens the narrow `EvidencePrecedentSheet`; the refactor lock requires opening the same wide evidence dialog used by the officer library.
- UI refactor is locked as not ready because current backend/frontend contracts do not yet provide student-safe `criterion` plus distinct `approvedUsageCount`, Add Evidence autocomplete suggestions, or explicit canonical-vs-extracted conflict DTOs.

## Evidence Knowledge UX Refactor Implementation On 2026-07-20

- Student `/app/event-library` was refactored in place, without changing `StudentAppShell`:
  - `src/features/event/components/OfficialEventLibraryStudent.tsx` now renders one compact grouped reference list instead of repeated cards.
  - The filter includes explicit `Tất cả` plus criteria 01-05.
  - Rows show canonical title, official criterion label, distinct approved usage count, and chevron.
  - Search remains debounced at 280ms and preserves query/filter search params.
- Student reference DTO mapping now accepts safe additive fields:
  - `src/types/evidence.ts` and `src/features/event/api/events.ts` parse `criterion` and `approvedUsageCount`.
  - Student UI inspection confirmed no OCR, reviewer, file, Resolution, approval-source, confidence, or internal-count fields are rendered from the student reference result.
- `src/features/evidence/components/AddEvidenceDrawer.tsx` keeps the existing component contract but now renders a 700-760px dialog-style Add Evidence modal:
  - sticky header/footer, body-only scroll, explicit close, Vietnamese actions `Thêm vào hồ sơ` and `Hủy`;
  - event-name autocomplete uses the existing reference library through `useOfficialEventLibrary`;
  - selecting a suggestion stores `canonicalEventId`, prefills criterion, and editing the title clears/revalidates the selected event;
  - library-open flow skips re-search and shows the selected-event summary;
  - staff note is collapsed by default, and selected file displays summary plus replace/remove actions.
- Officer shell was not redesigned. `src/components/layout/Sidebar.tsx` changes only the officer navigation label for `/app/evidence-knowledge` to `Kho tiền lệ`.
- Officer workspace refactor:
  - `src/features/evidence-knowledge/components/OfficerEvidenceKnowledgePage.tsx` now uses a full-width search and one bordered split workspace.
  - `OfficerEventList.tsx` renders 64-72px divider rows with selected surface and 3px blue marker.
  - `OfficerEventWorkspace.tsx` removes stat/card repetition and uses flat canonical metadata plus `Hội đồng xác nhận` wording.
  - `AcceptedEvidenceGallery.tsx` uses protected signed preview URLs, 280-340px cards, 16:9 stable previews, and `object-contain` for documents/images.
  - `EvidencePrecedentSheet.tsx` was replaced under the same exported component name with a wide dialog: `min(1120px, 92vw)`, max-height 88vh, preview/detail split, tabs `Tổng quan`, `Dữ liệu đọc từ minh chứng`, `Lịch sử xử lý`, and conflict callouts for canonical-vs-extracted differences.
- Review wording in `src/features/review/components/ReviewDecisionPanel.tsx` now uses business wording `Hội đồng xem xét` and keeps precedent accept/guard actions explicit and non-blocking.
- Verification:
  - `npm run build`: passed.
  - Scoped frontend ESLint for touched Evidence Knowledge/Event/Add Evidence/Review files: passed.
  - `npx tsx --test src/features/event/components/__tests__/student-reference-library.test.tsx src/features/evidence-knowledge/components/__tests__/officer-evidence-knowledge.test.tsx`: passed, 16 tests.
  - Playwright browser fallback against real backend/frontend verified `1280x720`, `1024x768`, and `390x844`: student/officer pages loaded without crash text and without document-level horizontal overflow.
  - Student UI search for typo `mua he xnah` rendered `Chương trình Tình nguyện Hè 2025`; selecting the row opened Add Evidence with `Thêm vào hồ sơ`, `Hủy`, selected summary, and no `Import minh chứng`.
  - Officer physical seed rendered one precedent, accepted-evidence gallery, and the wide detail dialog with tabs and conflict callout; no raw `Resolution Hub`, `Committee`, `raw audit`, `confidence`, or AI wording appeared.
- Remaining verification limit:
  - Full review accept-with-precedent and pre-resolution mutation E2E was not executed because it would mutate the configured real data and no disposable matching review fixture was available in this pass.

## Institutional Emblem Usage On 2026-09-09

- The verified Hội Sinh viên Việt Nam emblem is available at `src/assets/hsvvn-emblem.webp`.
- Existing mock `5T` marks were replaced with the emblem in the login entry point, signup entry point, legacy shared sidebar, and reusable `InstitutionalLockup` primitive.
- The student V2 sidebar and public landing page continue to use the same bundled emblem asset, so institutional identity stays consistent across entry and workspace surfaces.

## Phase 4 Part 2 — City review completion

- Reuses the existing review queue/detail, human decision panel, supplement flow, Resolution Hub, manager result detail, and finalization dialog; no parallel review workflow or analytics surface was added.
- The manager result detail now exposes the final decision action to `city_manager` and `city_committee` for individual City applications, and keeps the existing school-role behavior for other application levels. The shared route guard checks City Committee result routes before the broader City Manager route group, so the committee result links already shown in navigation work.
- `tests/city-review-finalization-roles.spec.ts` protects the City finalization role split and existing City Manager finalization behavior for non-City applications. `tests/city-review-human-authority.spec.ts` proves a City Officer can accept despite incomplete rules/OCR failure and reject despite a positive rules suggestion.
- Rules Engine/OCR output remains advisory; official criterion and final decisions continue through existing human review and finalization actions. No Award Registry, Eligibility, schema, or migration change is part of Part 2.

## Phase 4 Part 3A — City analytics dashboard (2026-09-27)

- `/app/analytics` selects the City dashboard for `city_manager` and `admin`; legacy `manager` and `committee` continue to use the existing workspace dashboard and endpoint. City Officer, City Committee, uploader, and student roles do not access City analytics.
- The City dashboard reads `/api/analytics/city` and its paginated `/api/analytics/city/applications` drill-down. Year, school, and exact Application status controls (including `not_started`) are the source of truth for summary and list. List-only filters include criterion, task/final status, `submitted`, `inReview`, `supplementRequired`, and `resolutionBlocked`; result and submitted counts carry `submitted=true`, and KPI scope is synchronized to the visible year/school/status controls.
- Summary views show workflow counts, progress by five human-reviewed criteria, data anomalies (missing criterion slots and unexpected tasks), school breakdown, final outcomes, supplement/resolution counts, and City Officer workload. The summary does not display student PII. Review-complete and progress-distribution values are informational because no exact list filter maps to those aggregates. Drill-down rows link to the existing manager result detail.
- City Manager retains the Eligibility Verification panel on analytics. Admin does not see that panel and can use the existing result-detail route from the City drill-down. Drill-down itself adds no mutation controls; existing result-list/detail, assignment, finalization, and reopen behavior remains governed by the existing routes and backend permissions.
- The role split adds no navigation item, persistence, schema, cache, or background job. The existing legacy dashboard and its workspace scope remain unchanged.
- Verification: the focused City analytics Playwright suite passes (17 tests), frontend build passes, and lint passes with the same 11 baseline warnings. `npx tsc --noEmit` reports 193 diagnostics, matching the recorded 193 baseline; the new City analytics files add none. The route-guard exceptions are limited to the role sets for analytics and existing results routes; assignment access is unchanged.

## Phase 4 Part 3B — City review season and submission deadlines (2026-09-27)

- The existing City analytics dashboard now includes season administration for `city_manager` and `admin`; legacy manager/committee, City Officer/Committee, uploader, and student roles do not issue the season API request or see the panel. City Manager retains the eligibility verification panel; admin does not.
- Season creation and versioned updates require a reason, validate the submission open/close order, confirm before saving, and serialize `datetime-local` values with explicit `+07:00` semantics. API response deadline timestamps are nullable so incomplete server configurations remain representable.
- Initial individual City submissions show the student-safe submission deadline. First submit refreshes eligibility before the deadline and submit checks; supplement resubmissions skip eligibility and display only the separate supplement deadline. Deadline conflicts refresh the deadline card and leave eligibility error precedence intact.
- City Manager and admin see the deadline exception panel only on initial individual City drafts in the existing result detail. Exceptions require a reason and confirmation; active state comes from the server’s `submission.exceptionActive` field to avoid browser/server clock disagreement. Active extensions can be revoked even before the base submission window closes; expired/revoked prior exceptions are identified separately.
- Date display uses `Asia/Ho_Chi_Minh`; no timezone-ambiguous serialization is used. No student-content editing, new navigation, schema, migration, backend, or review workflow changes are included in this frontend slice.
- Regression coverage is in `tests/phase4-city-analytics.spec.ts` and `tests/student-application-ui-v2-acceptance.spec.ts` for season role visibility, deadline exception roles/validation, student initial/supplement states, direct route access, and Vietnam timezone conversion.
- Final local regression: `tests/phase4-city-analytics.spec.ts` passes 25/25, including server-computed active exception status with a skewed browser clock. Frontend build/lint pass (11 existing warnings); `npx tsc --noEmit` remains at the recorded 193 baseline diagnostics, with no diagnostics in the changed component or test.
