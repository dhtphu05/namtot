# Student Portal QA Report

Date: 2026-07-05

## Scope

QA covered the redesigned Student Portal surfaces:

- Overview / Action Dashboard: `/app`, `/app/overview`
- Application workspace: `/app/application`, `/app/application?criterion=...`
- Feedback: `/app/feedback`, legacy `/app/notifications`
- Assistant: `/app/assistant`, legacy `/app/chatbot`
- Evidence card, add evidence modal, evidence detail/file preview modal
- Student layout shell/sidebar/mobile nav

## Routes

- Student default route after login remains `/app`, rendering the new Overview.
- `/app/overview` renders Overview.
- `/app/application`, `/app/profile`, `/app/my-application`, legacy evidence/draft routes map to the application workspace path.
- `/app/feedback` renders Feedback.
- `/app/notifications` still renders the same data surface, so old notification links do not crash.
- `/app/assistant` renders Assistant.
- `/app/chatbot` redirects to `/app/assistant`.

## Layout And Scroll QA

Verified in code for the required desktop/tablet/mobile constraints:

- `StudentAppShell` uses `h-[100dvh]`, one main `overflow-y-auto` scroll area, and `overflow-x-hidden`.
- Sidebar is fixed/shrink-safe; student menu has only four items.
- Main/page/card grid children use `min-w-0`; height-based containers use `min-h-0`.
- Overview criteria cards use a local horizontal scroll area on narrow widths, not page-level horizontal overflow.
- Application workspace uses `xl:grid-cols-[240px_minmax(0,1fr)_300px]`, then stacks before `xl`, so the right guide panel does not squeeze the center column on tablet/mobile.
- Evidence cards use vertical mobile layout, line-clamp/truncate, and fixed thumbnail aspect ratio.
- Add evidence modal uses `ScrollSafeModal`: `max-h-[calc(100dvh-48px)]`, scrollable body, visible footer row.
- Evidence detail modal uses `max-h-[calc(100dvh-48px)]`, `minmax(0,1fr)` body, and internal scroll.
- File preview uses contained image/PDF blocks inside the modal scroll region.

No `w-screen` was found inside the student layout surfaces.

## Functional Regression QA

Verified with live backend API at `http://localhost:8080` using demo student:

- Login works for `student@dut.udn.vn / Password@123`.
- `/api/me` returns role `student`.
- Current application loads for school year `2025-2026`.
- Current application status: `under_review`.
- Current target level: `city`.
- Evidence list loads from `/api/applications/{applicationId}/evidences`.
- Evidence count: `7`, distributed across all five main criteria.
- Notifications load from `/api/notifications`; existing notification data is preserved.
- Feedback mapping keeps supplement notifications actionable and system/review updates out of the priority tab unless actionable.
- Submitted/under_review state is respected in workspace edit locking.
- Precheck copy remains advisory and does not state final pass/fail.
- Upload/import/precheck/submit hooks still invalidate or refetch application/evidence/notification caches.

## Content QA

- Student-facing copy avoids raw technical signals such as OCR/confidence/indexing.
- Selectors sanitize legacy technical text where it can enter the UI.
- Assistant guardrails use:
  - "Hệ thống ghi nhận..."
  - "Bạn có thể cần bổ sung..."
  - "Cán bộ sẽ xác nhận cuối cùng..."
  - "Mình có thể giúp bạn tìm đúng nơi để bổ sung."
- No student-facing copy claims AI makes final pass/fail decisions.
- Empty and error states have clear next actions or retry paths.

## Reused/New Components

- `StudentAppShell`
- `StudentPageShell`
- `PageHeader`
- `SectionCard`
- `StatusBadge`
- `EmptyState`
- `InlineAlert`
- `AppButton`
- `ScrollSafeModal`
- `StudentOverview`
- `StudentApplicationActionWorkspace`
- `StudentEvidenceCard`
- `AddEvidenceDrawer`
- Feedback student view inside `Notifications`
- Context-aware `StudentSupport`

## Verification Commands

- Scoped ESLint passed for the redesigned Student Portal files.
- `npm run build` passed.
- Live API smoke checks passed for auth, current application, evidences, and notifications.

## Remaining Risk

Browser viewport automation could not be completed in this environment because Playwright browser launch/download hung, and the in-app browser runtime file was unavailable. Layout QA was therefore performed by static code inspection plus build/API smoke tests. Manual visual pass in Chrome/Edge at the requested widths is still recommended before demo.
