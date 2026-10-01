# Admin Operations Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the existing administrator workflows through one frontend operations home and complete admin navigation without changing backend behavior.

**Architecture:** Add an authenticated `/app/admin` index page with grouped links to existing routes. Extend the existing role navigation and send admin's default landing path to that index. Reuse current route guards, page components, APIs, and design primitives; do not fetch or invent an aggregate readiness score.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS v4, existing Radix/shadcn-style components, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-01-admin-operations-console-design.md`

## Global Constraints

- Frontend-only: do not modify backend, schema, migrations, APIs, or database.
- Keep criteria reference read-only; do not add edit or activation controls.
- Preserve authenticated backend roles as the source of route authorization; demo role switching does not grant access.
- Preserve City Manager-only eligibility verification; the admin home must not expose it.
- Link only to routes that already allow admin in the frontend route guard and corresponding backend role allowlist.
- Reuse existing page components, query hooks, UI primitives, and current compact operational style.
- Keep `/admin` as a compatibility redirect and make `/app/admin` the admin landing page.

## Review Focus

- Admin visits `/app` or `/admin`: land on the operations home rather than a workspace list.
- Non-admin visits `/app/admin` directly: retain existing denial behavior and do not show admin navigation.
- Every navigation destination remains unique and is allowed for admin by both route guard and backend routes.
- Admin sees only read-only criteria reference and never the City Manager eligibility verification panel.
- Long grouped navigation and home links remain keyboard-accessible and usable at narrow viewport widths.

---

### Task 1: Add frontend regressions for admin landing and navigation

**Files:**
- **Modify:** `src/lib/__tests__/presentation-maps.test.ts`
- **Modify:** `tests/phase4-admin-operations.spec.ts`

**Interfaces:**
- **Consumes:** `getRoleNavigation`, `getDefaultAppPathForRole`, current admin mocks, and existing authenticated route guard.
- **Produces:** Tests specifying admin default path `/app/admin`, the expected operations destinations, uniqueness of admin destinations, non-admin denial, and home-to-existing-screen navigation.

- [x] **Step 1: Write the failing tests.** Update the role-navigation assertion to require workspace, users, City Officer specialization, analytics/season, review queue, assignment, results, Resolution, export, Award Registry, Event Registry, Decision Imports, evidence knowledge, criteria reference, and audit. Add assertions that admin's default is `/app/admin`, the home has its grouped links, and the old non-admin denial still applies to `/app/admin`.
- [x] **Step 2: Run unit test to verify RED.** Run `node --experimental-strip-types --test src/lib/__tests__/presentation-maps.test.ts`; expect failures for the absent destinations/default.
- [x] **Step 3: Run Playwright test to verify RED.** Start the frontend with `npm run dev -- --host 127.0.0.1` and run `npx playwright test tests/phase4-admin-operations.spec.ts`; expect the new admin-home assertion to fail because `/app/admin` has no operations page.

### Task 2: Implement the operations home, admin navigation, and landing path

**Files:**
- **Create:** `src/features/admin/components/AdminOperationsPage.tsx`
- **Create:** `src/routes/app.admin.index.tsx`
- **Modify:** `src/lib/role-navigation.ts`
- **Modify:** `src/features/auth/role-map.ts`
- **Modify:** `src/routes/admin.tsx`
- **Generated:** `src/routeTree.gen.ts` only through the existing TanStack Router build/plugin; never hand-edit it.

**Interfaces:**
- **Consumes:** The route groups and links fixed by Task 1; existing components and route guards.
- **Produces:** An authenticated admin index page with compact grouped links and an admin navigation map whose destinations match the approved route set. `getDefaultAppPathForRole("admin")` returns `/app/admin`.

- [x] **Step 1: Implement `AdminOperationsPage`.** Add compact groups for operations, data workflows, and platform administration. Use accessible `Link` components and concise descriptions. Do not render synthetic readiness totals or call APIs solely to populate the home page.
- [x] **Step 2: Add the `/app/admin` index route.** Use the existing authenticated app route guard and render `AdminOperationsPage`.
- [x] **Step 3: Connect admin navigation.** Add the approved unique route set to `navByRole.admin`; preserve other roles' navigation and keep criteria label explicitly read-only.
- [x] **Step 4: Update admin landing redirects.** Set the admin default route to `/app/admin` and update `/admin` compatibility redirect to the new home. Keep `/app/admin/workspace` redirect behavior unchanged.
- [x] **Step 5: Regenerate route metadata through the build tool.** Run `npm run build`; confirm the generated route tree recognizes the new index route and fix route typing through source files only.
- [x] **Step 6: Verify GREEN.** Run the unit and Playwright commands from Task 1; expect all updated assertions to pass. Verify admin season settings still appear on City analytics while the eligibility verification panel remains City Manager-only.

### Task 3: Document the integrated admin surfaces and finish verification

**Files:**
- **Modify:** `docs/CODEBASE_CONTEXT.md`
- **Test:** `src/lib/__tests__/presentation-maps.test.ts`, `tests/phase4-admin-operations.spec.ts`

**Interfaces:**
- **Consumes:** Implemented routes and actual passing test results from Tasks 1–2.
- **Produces:** Current documentation of admin landing, navigation groups, existing-function reuse, and criteria read-only limitation.

- [x] **Step 1: Update `docs/CODEBASE_CONTEXT.md` in place.** Record `/app/admin`, the integrated existing admin destinations, and that no backend/schema/API changes were made. Keep the read-only criteria and City Manager-only verification constraints explicit.
- [x] **Step 2: Run focused checks.** Run `node --experimental-strip-types --test src/lib/__tests__/presentation-maps.test.ts`, `npx playwright test tests/phase4-admin-operations.spec.ts`, `npm run lint`, and `npm run build`.
- [x] **Step 3: Review the final diff.** Confirm only frontend files changed, no duplicate admin route links, no generated-file hand edits, no criteria mutation UI, and no change to backend authorization.

## Self-review

- All spec sections map to Tasks 1–3: frontend-only scope, admin home, navigation destinations, existing authorization, criteria reference behavior, accessibility, and documentation.
- The API and routes are reused; no new API contract, persistence, or server-side readiness claim is introduced.
- The five review risks are pinned to unit and Playwright checks in Task 1 and verified after implementation in Task 2.
- Test tasks precede product code, and every implementation step names its owning file and expected observable result.
