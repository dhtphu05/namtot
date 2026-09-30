# Admin Operations Console Design

## Status

Design for review. Scope approved in chat: frontend-only integration of existing admin capabilities; criteria editing is out of scope.

## Goal

Give administrators one clear entry point for the operational screens already supported by the frontend and backend. Preserve existing business behavior and authorization. Do not present unsupported configuration as editable or claim system readiness from incomplete data.

## Scope

- Add an administrator operations home at `/app/admin` with grouped links to existing screens.
- Make `/app/admin` the authenticated admin landing page and keep `/admin` as a compatibility redirect.
- Extend the admin sidebar with the existing administrator-accessible workflows, grouped by operations, data, and platform administration.
- Reuse current route components, API clients, query hooks, and permission checks. Do not duplicate CRUD screens or create a second admin application shell.
- Keep the criteria page explicitly read-only. The existing API has no criteria mutation contract and is not the sole source of runtime rules.
- Keep City Manager eligibility verification exclusive to City Manager.

## Navigation and existing destinations

The admin console will link to these existing routes:

- Operations: City analytics and season administration (`/app/analytics`), review queue (`/app/queue`), assignment (`/app/assignment`), application results (`/app/manager/results`), Resolution (`/app/resolution`), and exports (`/app/export`).
- Data operations: Award Registry (`/app/award-registry`), Event Registry (`/app/event-registry`), Decision Imports (`/app/decision-imports`), and evidence knowledge (`/app/evidence-knowledge`) where its existing admin access applies.
- Platform administration: workspaces (`/app/admin/workspaces`), users (`/app/admin/users`), City Officer specializations (`/app/admin/officers`), criteria reference (`/app/settings`), and audit (`/app/audit`).

The operations home will use grouped compact cards/links and short descriptions. It will not create aggregate readiness scores or issue new data requests solely to populate decorative metrics. Each linked route remains responsible for its own loading, error, empty, and action states.

## Authorization and behavior

- Frontend visibility and direct-route checks continue to use the authenticated backend role; demo role switching never grants access.
- No backend route, DTO, role allowlist, workspace scope, or API request is changed.
- Before adding a destination, confirm that the existing frontend route guard allows `admin` and the corresponding backend endpoint has an admin role allowlist. Exclude any destination that fails either check.
- Legacy compatibility routes and other roles' navigation remain unchanged, except admin's default route changes from the workspace list to `/app/admin`.
- Criteria remains read-only, and the operations home labels it as reference material.

## Visual and accessibility behavior

- Follow `docs/UI_GUIDE.md`, the existing compact operational dashboard style, and shared UI primitives.
- Use semantic link labels, visible keyboard focus, responsive grouped links, and no icon-only actions.
- Do not apply generic visual-search styles that conflict with the existing product design system.

## Out of scope

- Backend/API/schema/migration/database changes, production data changes, and deployment.
- Criteria rule editing, draft/version lifecycle, activation, rollback, or claims of complete runtime configuration.
- New aggregate readiness API or synthetic ready/not-ready status.
- New role grants, City Manager verification access for admin, and changes to workflow semantics.

## Acceptance criteria

1. Authenticated admins land on `/app/admin` and can reach every included screen from the admin navigation or operations home.
2. Existing screen interactions continue to call their current APIs and retain their current role/workspace semantics.
3. Non-admin users do not see the admin navigation and direct access remains denied by the existing route guard/backend authorization.
4. City Manager-only eligibility verification remains hidden from admin.
5. Criteria configuration is clearly read-only.
6. No backend, schema, migration, or production database files change.
7. Frontend build and lint pass; focused route/navigation tests cover admin links and non-admin denial.
