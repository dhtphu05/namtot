# S3 City Officer Queue Design

## Status

Approved design for S3 on branch `feat/staff-review`.

This design covers the City Officer queue at `/app/queue` and the minimal
backward-compatible backend contract extension required for the completed tab.
It does not start S4 and does not redesign `/app/review/:id`.

## Outcome and scope

City Officers need a production queue for individual review tasks that makes
the next actionable work obvious, keeps assignment separate from task status,
and never presents client-derived counts or permissions as authoritative.

The queue is task-centric and limited to the five City individual criteria:

- `ethics`
- `academic`
- `physical`
- `volunteer`
- `integration`

The FE keeps the existing app shell and existing review workspace. It adds a
City Officer-specific queue presentation behind the existing `/app/queue`
route. The backend remains the authority for scope, visibility, claimability,
assignment, status, and pagination.

Out of scope:

- redesigning `/app/review/:id` or any S4 review interaction;
- priority, collective, or school filters;
- AI/OCR as a primary queue UX;
- new endpoints, database migrations, permission changes, or scope changes;
- global shell or shared design-system rewrites.

## Contract extension

The existing `GET /api/review/tasks` endpoint keeps its current `status`
parameter unchanged and gains an optional `statuses` parameter.

Examples:

```text
GET /api/review/tasks?statuses=accepted,rejected&page=1&limit=20
GET /api/review/tasks?status=waiting&page=1&limit=20
```

Rules:

1. `status` and `statuses` together return HTTP 400.
2. `statuses` is split on commas, each value is trimmed, and duplicates are
   removed while preserving the first-seen order.
3. Every value must be a valid `ReviewTaskStatus`; any invalid value returns
   HTTP 400.
4. The union is applied in the repository query before `count`, `skip`, and
   `take`, so `meta.pagination.total` and `totalPages` describe the union.
5. Existing workspace isolation, role authorization, task visibility, and
   assignment permission behavior are unchanged.
6. A request without `status` or `statuses` keeps current behavior.

The completed City tab uses one query with
`statuses=accepted,rejected`. It must not fetch both statuses separately and
must not merge pages in the browser.

## Frontend architecture

The existing route remains the entry point. When the authenticated role is
`city_officer`, it renders a focused `CityOfficerQueue` feature component;
other roles retain their existing queue behavior.

The City component owns only queue presentation concerns:

- active tab and supported server query state;
- compact header and specialization context;
- task table/list rendering;
- loading, refetching, empty, error, and stale-result states;
- claim action and navigation after server confirmation.

Review API types and normalization are extended to preserve backend
pagination metadata. No feature code derives global counts from the current
page. The component uses `SafeUser.officerSpecializations` for the visible
specialization context and never reduces it to a single criterion.

Supported queue controls:

- tabs: `waiting`, `reviewing`, `supplement_required`,
  `resolution_needed`, and `statuses=accepted,rejected`;
- server-side search using the existing `q` contract, labelled for student
  lookup;
- server-side criterion filter restricted to the five City criteria;
- server-side pagination.

Unsupported controls are omitted rather than simulated: school, priority,
collective, AI confidence, and client-only global counts.

## Queue semantics and interaction

Presentation labels map exactly as follows:

| Query/status | Tab | Task label |
| --- | --- | --- |
| `waiting` | Cần xử lý | Chờ xử lý |
| `reviewing` | Đang xét | Đang xét |
| `supplement_required` | Chờ bổ sung | Chờ sinh viên bổ sung |
| `resolution_needed` | Cần Hội đồng | Đã chuyển Hội đồng |
| `statuses=accepted,rejected` | Đã hoàn thành | Tiêu chí đạt / Tiêu chí không đạt |

Assignment is rendered separately from status. An assigned task may still be
waiting or reviewing; a final task is not made claimable by the UI.

For a claimable row:

1. The button enters a pending state and prevents duplicate submissions.
2. The FE sends `POST /api/review/tasks/:id/claim` immediately, without a
   confirmation dialog.
3. Only after a successful server response does it invalidate/refetch the
   queue and navigate to `/app/review/:id`.
4. On HTTP 409, it shows a meaningful concurrent-claim message, refetches the
   queue, and removes the stale claim action when the server confirms another
   officer owns the task.

Rows navigate to the existing review workspace. The queue does not duplicate
review decisions, evidence actions, or escalation flows.

## Backend implementation boundary

The backend change is limited to the list query validation, typed query
representation, repository status predicate, and regression coverage for the
existing controller/service path. No service permission or scope logic is
changed.

The repository predicate uses equality for `status` and an `in` predicate for
the normalized `statuses` list. The predicate is part of the same filtered
query used by `findMany` and `count`.

## Testing strategy

Backend regression coverage must prove:

- accepted/rejected union filtering;
- union pagination and total before pagination;
- `status` plus `statuses` returns 400;
- invalid values return 400;
- trimming and deduplication;
- workspace isolation;
- existing role authorization.

Frontend coverage must prove:

- City Officer queue renders only the five criteria and supported controls;
- each tab sends the intended server query, including one completed union;
- pagination metadata drives page navigation without client-side count faking;
- claim has no confirmation dialog, prevents duplicate submit, invalidates,
  and navigates only after success;
- a 409 displays the concurrent-claim message and refreshes stale state;
- loading, error, empty, and no-claimable-action states are usable;
- existing S4 review tests and app-shell routing remain green.

Verification includes the relevant backend suite, frontend focused tests,
frontend build, scoped lint/type checks, and Playwright visual QA at 1280,
1366, 1440, 1600, and 1920 widths with 90%, 100%, 110%, and 125% zoom.

## Documentation and delivery

After verification, update only the relevant Staff Lane contract/state or
implementation documentation with the final supported behavior. Create one
focused local S3 implementation commit on `feat/staff-review`; do not push.
The final working trees must be clean. The final report must explicitly state
that S4 has not started.
