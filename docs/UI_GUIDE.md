# Frontend UI Guide

This file is the source of truth for preserving the current frontend visual system. Update it only when the design system or reusable UI patterns intentionally change.

## Product Feel

5TOT is an operational student-application platform. The UI should feel:

- quiet
- dense but readable
- workflow-focused
- trustworthy
- fast to scan

Avoid marketing-page composition, decorative hero sections, oversized panels, heavy borders, and generic SaaS card layouts.

## Theme And Tokens

Global styling lives in `src/styles.css`.

Primary tokens:

- app background: `--surface-app`
- primary surface: `--surface-primary`
- secondary/muted surfaces: `--surface-secondary`, `--surface-muted`
- selected surface: `--surface-selected`
- primary text: `--text-primary`
- secondary text: `--text-secondary`
- muted text: `--text-muted`
- brand blue: `--brand-primary`
- soft brand background: `--brand-primary-soft`
- navy identity: `--brand-navy`
- semantic state colors: `--status-info`, `--status-success`, `--status-warning`, `--status-danger`
- shared borders and focus: `--border-subtle`, `--border-control`, `--focus-ring`
- control, section, dialog, and pill radius: `--radius-control`, `--radius-section`, `--radius-dialog`, `--radius-pill`
- spacing/type scale: `--space-*` and `--type-*`
- radius base: `--radius: 0.75rem`

Prefer tokens and semantic Tailwind classes over new hard-coded color families. Existing blue accents such as `#0057C2`, `#EAF3FF`, `#E3ECF6`, and `#F8FBFE` are common in current workflow screens.

## Layout Rules

- Use the existing shell and route layout. `AppHeader` is shared by `AppShell` and `StudentAppShell`; page-specific title/description/actions belong in `PageHeader`, with `TopBar` retained as a compatibility wrapper.
- Keep pages inside the current max-width operational canvas unless the existing route does otherwise.
- Use responsive grids with `minmax(0, 1fr)` and explicit overflow handling for tables and dense panels.
- Keep content scannable: compact headings, small metadata rows, short status labels, and predictable action placement.
- Use bottom sticky action bars only when the existing workflow already uses that pattern.

## Cards And Panels

Cards are allowed, but they should not dominate the page.

Use:

- `rounded-md`, `rounded-lg`, or the existing `Card` primitive
- subtle borders like `border-[#E3ECF6]`, `border-slate-200/60`, or semantic border tokens
- soft shadows such as `shadow-sm` or `var(--shadow-card)`
- compact padding, usually `p-3`, `p-4`, or `p-5`

Avoid:

- large standalone cards wrapping whole pages
- cards nested inside cards without a real reason
- thick borders
- heavy shadows
- huge rounded rectangles
- decorative gradient/orb backgrounds
- one-note purple, beige, brown, or dark-blue themes

## Buttons And Controls

- Prefer primitives from `src/components/ui/*`. `src/components/ui-kit.tsx` adapts existing project APIs to those primitives for compatibility.
- Use icon buttons for compact actions when an icon is clear.
- Use lucide-react icons when icons are needed.
- Keep button text short and prevent wrapping inside fixed-width controls.
- For mode selection, prefer tabs, segmented controls, toggles, selects, or existing workflow chips.

## Tables And Dense Data

- Use existing table primitives from `src/components/ui/table.tsx`.
- Tables should stay horizontally scrollable on small screens.
- Header rows should remain compact.
- Avoid replacing dense operational tables with card grids unless the existing mobile pattern already does that.

## Forms

- Reuse existing input/select/textarea/dialog/sheet primitives.
- Keep labels and help text concise.
- Use existing validation/error message patterns.
- Do not invent a new form visual system for one feature.

## Status And Feedback

- Use existing badge/chip/status components when available.
- Use `StatusBadge` with an explicit `domain` when mapping backend workflow, evidence, final-result, processing, resolution, lifecycle, or alert status. Unknown keys display a safe fallback instead of the raw backend value.
- Use `CriterionBadge` and the shared criterion presentation map for the five individual award criteria. `priority` is an award attribute, not a sixth criterion.
- Status colors should remain semantic:
  - blue for info/progress
  - green for success/accepted
  - amber for warning/supplement
  - red/rose for destructive/rejected
- Do not use confidence scores or AI labels in ways that imply official approval unless backend semantics say so.

## Copy

- UI copy should be direct and operational.
- Avoid marketing language inside app workflows.
- Do not add instructional paragraphs explaining obvious UI controls.
- Use Vietnamese user-facing text where the surrounding screen uses Vietnamese.
- Shared page headers should preserve readable titles at narrow widths. Keep notification and user/logout controls in `AppHeader`; do not repeat them in page headers. The header hides season context unless a real season value is available.

## Verification For UI Tasks

Before finishing a UI change:

- run the relevant build/lint command when practical
- inspect the changed route at desktop width
- inspect the changed route at mobile width
- check for overflow, clipped text, overlapping controls, and broken responsive tables
- compare against nearby existing screens

If screenshot/browser verification was not run, say so in the final handoff.

## Student Application UI V2 Contract

The student application V2 rollout uses additive aliases and primitives under `src/features/application/ui-v2`. Keep legacy screens unchanged while `VITE_STUDENT_APPLICATION_UI_V2=false`.

- Identity: use the institutional lockup hierarchy only in shell/sidebar contexts: `HỘI SINH VIÊN VIỆT NAM`, current workspace/school, `Hệ thống Sinh viên 5 tốt`. Do not repeat the full lockup in page headers.
- Surfaces: use `--student-v2-surface-*`, `--student-v2-border-*`, and `--student-v2-divider` aliases. Normal workflow sections must not use shadows.
- Status system: use `StatusPillV2` with only `complete`, `waiting`, `supplement`, and `not-started`. Red/critical is reserved for errors, rejection, destructive actions, and critical overdue states.
- Spacing and radius: stay on the 4/8/12/16/24/32/40/48/64 spacing scale. Controls use 8px radius, grouped sections use 10-12px, overlays use 12-16px, and only pills use 999px.
- Evidence preview: use a stable 16:9 thumbnail. Documents and unknown files use `object-contain`; photos use `object-cover` only when classified as images; official data uses an information tile instead of staff file previews.
- Anti-AI-slop rules: no gradients, glass effects, purple/neon palettes, decorative icon circles, colored criterion cards, hero illustrations, nested card layouts, oversized empty states, or passive waiting states styled as primary buttons.
- Phase 1 shell foundation: student V2 identity belongs in `StudentAppShell`/`Sidebar` behind `VITE_STUDENT_APPLICATION_UI_V2`. Use authenticated `user.workspace.name` / `user.workspace.shortName` and a neutral loading fallback; do not hardcode a university name. Use the verified `src/assets/hsvvn-emblem.webp` asset on institutional identity surfaces; use the reserved `5T` mark in `InstitutionalLockup` only when that asset is unavailable, never a fake seal.
- Phase 1 primitives: use `ApplicationContextBar`, `SectionHeading`, `HairlineList`, `InlineStateMessage`, `CompactEmptyState`, and `AccessibleIconButton` for student application V2 surfaces. Utility links must keep visible focus and at least 40px hit height.
- Phase 2 overview layout: the V2 student overview must keep the fixed block order of compact heading, single primary status strip, one grouped `FiveCriteriaSpineV2`, then the operational grid. Do not add KPI panels, five separate criterion cards, charts, decorative illustrations, support cards, or duplicated task/update CTAs.
- Phase 2 overview responsiveness: at tablet/mobile sizes the criteria spine scrolls horizontally with snap and 150px minimum segments, the operational grid stacks, top mobile tasks stay compact, and text must not create horizontal overflow.
- Phase 3 workspace layout: the V2 application workspace must use one context bar and a two-column grid of `232px minmax(0, 1fr)` on desktop. Do not add a fixed guide column or a third operational column.
- Phase 3 workspace content: each criterion renders exactly one data component before the evidence gallery: `DefinitionTableV2`, `PathSelectorListV2`, `ActivityLedgerV2`, or one dynamic disclosure. Keep evidence as a gallery, not mixed row/card layouts.
- Phase 3 workspace sidebar: use the verified/provided Hội Sinh viên emblem asset in the student V2 sidebar and other existing institutional entry points that previously used the mock `5T` mark. Keep the emblem, profile rows, and active left nav marker; account/logout actions live in the shared `AppHeader`.

## Phase 2 UI Foundation Consolidation

- Keep Tailwind v4, Radix/shadcn primitives, Lucide, Sonner, document viewers, and Student V2. Do not add a second component system or dependencies.
- Keep existing `student-v2-*` variables as aliases to shared semantic tokens; do not remove them while V2 screens still consume them.
- Role navigation is a presentation map in `src/lib/role-navigation.ts`; it must not change route authorization. Keep legacy roles distinct, and do not repeat a destination within a role menu.
- `/app/settings` is a read-only view of `GET /api/criteria/configs/active`. It must not expose edit/activate controls or imply the endpoint represents every runtime rule.
- Use `ConfirmDialog` for consequential confirmations when it fits the existing flow. Include impact, pending, and server error details when available.

## Proactive Recommendations / Gemini UX Planning Context

### Recommendation UI Principles

- Treat proactive recommendations as workflow guidance, not as AI decisions. Copy should use "goi y", "buoc tiep theo", or direct action labels, and must not imply official pass/fail approval.
- Prefer compact operational surfaces: inline alerts, status rows, small action cards, bottom action bars, feedback cards, or `SmartbotCardRenderer` cards. Do not create a marketing-style AI panel.
- Use existing primitives: `StatusBadge`, `InlineAlert`, `SectionCard`, `AppButton`, `Chip`, `Button`, and the Smartbot card/action renderer where rich actions are needed.
- Keep recommendation cards scannable: title, one-sentence reason, source/status, and one primary action. Avoid long explanations unless the user explicitly opens assistant/detail.
- Do not show model names, confidence percentages, raw AI scores, prompt text, raw OCR text, or provider diagnostics in student-facing recommendations.

### Candidate Surfaces

- Overview: a compact "Viec can lam" or "Goi y tiep theo" area should stay close to existing `NextActionsCard`, not become a separate hero.
- Application workspace: per-criterion guidance can sit near criterion status, quick guide, or the existing bottom action bar.
- Feedback/notifications: recommendations should strengthen existing supplement/result CTAs and assistant links instead of adding a parallel inbox.
- Assistant/chatbot: rich recommendations can reuse `SmartbotCardRenderer` card types and `SmartbotActionButton`; use this when Gemini explanation or multi-step action cards are needed.
- Evidence/post-upload: keep guidance specific to upload quality, official match/import, missing fields, or staff handoff; avoid broad generic AI advice.

### Visual And Copy Constraints

- Student recommendation UI should stay quiet and dense: no oversized AI banners, glowing gradients, decorative robot artwork, or one-off card systems.
- Status colors must remain semantic: blue/info, green/success, amber/warning, red/error.
- Recommendations must preserve the existing Vietnamese operational tone. Keep action labels short enough for mobile buttons.
- AI/Gemini wording is acceptable only when necessary for transparency; it should not be the headline or the main trust signal.
- Every recommendation surface needs a deterministic empty/error/loading state. If Gemini is unavailable, the UI should still show deterministic next actions or nothing actionable.

### Privacy And Tracking

- SmartUX tracking may record impression/click/dismiss/completion metadata only: role, page, criterion, status, action, source, result type, counts, and timing.
- Never send names, student codes, email, phone, raw OCR/evidence text, real file names, signed URLs, or private file URLs in SmartUX payloads.
- If a recommendation is generated from private data, show only the derived safe summary and route/action; keep raw evidence details inside authenticated backend APIs.

### Verification Commands

- `npm run lint`
- `npm run build` (known Nitro/Vercel packaging issue may still appear after Vite build)
- `rg -n "getNextActions|SmartbotCardRenderer|SmartbotPanel|nextBestAction|trackSmartUXEvent" src`
