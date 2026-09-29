# 5TOT Đà Nẵng UI Foundation

This document describes the frontend's existing UI foundation after Phase 2 consolidation. It records shared conventions; it does not introduce a second design system.

## Product identity

- Product name: **5TOT Đà Nẵng**.
- Institutional identity: Hội Sinh viên Việt Nam, using the existing `src/assets/hsvvn-emblem.webp` asset.
- Primary blue: `#0057C2`; institutional navy: `#123B6D`.
- Typography: Be Vietnam Pro, already loaded by the frontend.
- Keep the interface light, compact, quiet, and suited to application/review work.

## Tokens

Semantic color, radius, spacing, typography, border, focus, and shadow values live in `src/styles.css`. Prefer those variables over new hex values. Existing `student-v2-*` variables remain compatibility aliases to shared tokens so Student V2 consumers keep working.

Use semantic state colors consistently: blue for information/progress, green for success, amber for warnings/supplement, and red for errors/rejection. Use the shared control, section, overlay, and pill radii according to component role.

## Existing component foundation

- `src/components/ui/*` is the canonical set of Radix/shadcn primitives.
- `src/components/ui-kit.tsx` preserves older project-level component APIs as adapters.
- Reuse the existing pagination, skeleton, tooltip, Sonner, document viewer, table, form, and dialog components.
- `StatusBadge` supports explicit backend status domains and safe unknown-status fallbacks. Processing state, workflow state, alert severity, and lifecycle state remain separate concepts.
- `CriterionBadge` uses the shared mapping for the five individual criteria. Priority remains separate from criteria.
- `ConfirmDialog` standardizes consequential confirmation copy, impact warnings, pending actions, and server errors on the existing Radix Alert Dialog.

## Shell and pages

- `AppShell` and `StudentAppShell` share `AppHeader` for identity, notifications, and account/logout actions.
- Season context is shown only when supplied by real data. No season is hardcoded in shell branding.
- `PageHeader` contains the current page title, description, and page actions. `TopBar` remains a compatibility wrapper.
- The sidebar remains role-specific presentation. `src/lib/role-navigation.ts` contains one item per destination; the route guard remains the authorization source of truth.
- Legacy `officer`, `manager`, and `committee` roles keep separate menus and existing route permissions.
- Use the shell's skip link, visible keyboard focus, and reduced-motion behavior.

## Criteria configuration

`/app/settings` is a read-only projection of `GET /api/criteria/configs/active`. The response is not the complete runtime rules source. The page must not imply that it can edit or activate criteria and must not add write requests without a backend contract.
