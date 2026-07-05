# Student Portal Foundation Audit

Date: 2026-07-05

## Scope

This audit covers the current student-facing portal routes, layout shell, sidebar, and data hooks before detailed screen-by-screen redesign work.

## Student Portal Route Inventory

| Area                         | Current route/component                                                   | New canonical route        | Compatibility behavior                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tổng quan                    | `/app`, `StudentOverview` via `app.index.tsx`                             | `/app` and `/app/overview` | `/app` remains canonical for login landing; `/app/overview` renders the same overview.                                                                            |
| Hồ sơ của tôi                | `/app/drafts`, previously `StudentApplicationWorkspace initialTab="info"` | `/app/application`         | `/app/drafts` redirects to `/app/application`.                                                                                                                    |
| Hồ sơ alias                  | none or external links to `/app/profile`, `/app/my-application`           | `/app/application`         | `/app/profile` and `/app/my-application` redirect to `/app/application`.                                                                                          |
| Minh chứng của tôi           | `/app/evidence`, previously `EvidenceWorkspaceSafe`                       | `/app/application`         | `/app/evidence` redirects to `/app/application`; evidence add/upload/import flows are available inside `StudentApplicationWorkspace` through `AddEvidenceDrawer`. |
| Thông báo/phản hồi           | `/app/notifications`, `Notifications`                                     | `/app/feedback`            | `/app/feedback` renders `Notifications`; `/app/notifications` remains available for shared authenticated use and old links.                                       |
| Trợ lý/chatbot               | `/app/chatbot`, previously `StudentSupport` for students                  | `/app/assistant`           | `/app/chatbot` redirects to `/app/assistant`.                                                                                                                     |
| Modal/drawer thêm minh chứng | `AddEvidenceDrawer`, `ImportEvidenceModal`, `EvidenceDetailModal`         | unchanged                  | Default dialog/drawer sizing now uses `max-height: calc(100dvh - 48px)` with local vertical scroll.                                                               |

## Sidebar

Student sidebar is now intentionally limited to four items:

- Tổng quan: `/app`
- Hồ sơ & minh chứng: `/app/application`
- Phản hồi: `/app/feedback`
- Trợ lý: `/app/assistant`

Officer, manager, admin, and collective nav definitions are left in place. Student-only legacy paths are normalized for active state so old deep links still highlight the canonical section.

## Layout Baseline

Student portal uses `StudentAppShell`:

- Root: `h-[100dvh]`, `overflow-hidden`.
- Sidebar: `w-[248px]`, `shrink-0`, hidden on small screens.
- Main: `min-w-0`, `min-h-0`, `overflow-hidden`.
- Page scroll area: the only main-level vertical scroll container.
- Page container: `max-w-[1200px]`, responsive horizontal padding.
- Mobile: student bottom navigation exposes the same four canonical destinations.

Default non-student shell keeps the same navigation surface and receives the same `100dvh`/`min-h-0` scroll containment improvement.

## Data Source / API Hook Map

| Flow                          | Hook/component                                                                  | API source                                                                                                     | Notes                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Current application           | `useCurrentApplication`                                                         | `applicationApi.getCurrentApplication` -> `GET /api/applications/current`                                      | API layer normalizes empty/current application payload variants and level values.                                                     |
| Start/create application      | `useStartApplication`                                                           | `POST /api/applications/current/start`                                                                         | Used by student application workspace and legacy wizard flows.                                                                        |
| Target level                  | `useUpdateTargetLevel`                                                          | `PATCH /api/applications/:id/target-level`                                                                     | Preserves existing target level flow.                                                                                                 |
| Metrics                       | `useApplicationMetrics`, `useUpsertMetric`                                      | `GET /api/applications/:id/metrics`, `POST /api/applications/:id/metrics`, `PATCH /api/metrics/:id`            | API layer normalizes metric names/values.                                                                                             |
| Evidences                     | `useEvidences`, `useEvidenceDetail`, `useEvidenceCard`, `useEvidenceAudit`      | `/api/applications/:id/evidences`, `/api/evidences/:id`, `/api/evidences/:id/card`, `/api/evidences/:id/audit` | API layer normalizes list wrappers, file ids, names, status, indexing status, and card data.                                          |
| Add evidence                  | `useCreateEvidence`                                                             | `POST /api/applications/:id/evidences`                                                                         | Invalidates current application, evidence list, latest precheck, and evidence detail/card/audit.                                      |
| Upload evidence file          | `useUploadEvidenceFile`, `useUploadAndIndex`                                    | `POST /api/evidences/:id/files`, `POST /api/evidences/:id/start-indexing`                                      | Used by `AddEvidenceDrawer`; keeps upload and OCR/indexing flow.                                                                      |
| Preview evidence files/images | `EvidenceDetailModal`, `EvidenceFilePreview`, `evidenceApi.getSignedFileUrl`    | `GET /api/files/:fileId/signed-url`                                                                            | Preview remains local to evidence detail.                                                                                             |
| Import confirmed evidence     | `AddEvidenceDrawer`, event hooks                                                | event APIs such as `import-to-application`/`import-as-evidence`                                                | Existing event import/search path remains inside the drawer.                                                                          |
| Precheck                      | `useLatestPrecheck`, `usePrecheck`                                              | `GET /api/applications/:id/precheck/latest`, `POST /api/applications/:id/precheck`                             | `StudentApplicationWorkspace` reads latest result and can run sync precheck.                                                          |
| Cascade/review tracking       | `applicationApi.cascadeReview`, `getLatestCascadeReview`; legacy `/app/cascade` | `/api/applications/:id/cascade-review`                                                                         | Kept as existing route; student sidebar active state maps it under Hồ sơ & minh chứng.                                                |
| Submit application            | `useSubmitApplication`                                                          | `POST /api/applications/:id/submit`                                                                            | Invalidates application, precheck, timeline, evidences, notifications.                                                                |
| Notifications/feedback        | `useNotifications`, `useMarkNotificationRead`                                   | `GET /api/notifications`, `PATCH /api/notifications/:id/read`                                                  | `/app/feedback` reuses the existing notifications UI.                                                                                 |
| Chatbot/assistant             | `StudentSupport` and legacy `Chatbot`                                           | currently local UI/mock answers in frontend components                                                         | Canonical student route is `/app/assistant`; backend AI services exist separately under backend `/api/ai` but are not wired here yet. |

## Compatibility Notes

- Student login now lands on `/app` so the first screen is Tổng quan.
- Route guard allows the new student canonical paths and legacy aliases.
- Old student paths either redirect to the canonical workspace or remain render-compatible where shared by other roles.
- No API contract changes were made; normalization remains in frontend API adapters.
