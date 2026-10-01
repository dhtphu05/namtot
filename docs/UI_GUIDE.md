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

## Public Entry Pages (E1)

- The public entry routes are `/`, `/login`, and `/signup`. Landing copy identifies **5TOT Đà Nẵng**, the City-level Student 5-good system, and Hội Sinh viên Việt Nam TP. Đà Nẵng. Keep it concise and institutional; do not add tourism imagery, unverified school-year context, marketing metrics, or a role directory.
- Landing presents exactly the shared five core criteria from `src/lib/criteria-presentation.ts` and the City application path: prepare a dossier, add evidence, precheck, submit to the City, follow review and supplement if requested, then receive the result. Do not present School and University System as review levels.
- Login accepts only the backend's email and password, never prepopulates a credential, and maps authentication failures to safe Vietnamese copy. Preserve session hydration and `getDefaultAppPathForRole` for current and legacy roles. Do not expose password recovery or email verification unless the corresponding public flow exists.
- Public signup is Student-only. It posts the existing registration DTO, uses the public `registration=true` workspace list, keeps class/faculty/phone optional, and follows the register response's existing token/session redirect behavior. The school chooser must not contain a client-authored institution list or offer a role selector.
- Auth forms need associated labels, browser autocomplete, visible focus, keyboard-operable school search and password controls, linked inline errors, and duplicate-submit prevention. Use backend-specific messages only for verified auth error codes; never surface a raw API error.

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
- Evidence preview: use a stable 16:9 thumbnail. Documents and unknown files use `object-contain`; photos use `object-cover` only when classified as images; official data uses an information tile instead of staff file previews. OCR/indexing status is separate from file display: try to render an available image URL regardless of OCR outcome, and show an image-load error only after the browser reports a load failure.
- Anti-AI-slop rules: no gradients, glass effects, purple/neon palettes, decorative icon circles, colored criterion cards, hero illustrations, nested card layouts, oversized empty states, or passive waiting states styled as primary buttons.
- Phase 1 shell foundation: student V2 identity belongs in `StudentAppShell`/`Sidebar` behind `VITE_STUDENT_APPLICATION_UI_V2`. Use authenticated `user.workspace.name` / `user.workspace.shortName` and a neutral loading fallback; do not hardcode a university name. Use the verified `src/assets/hsvvn-emblem.webp` asset on institutional identity surfaces; use the reserved `5T` mark in `InstitutionalLockup` only when that asset is unavailable, never a fake seal.
- Phase 1 primitives: use `ApplicationContextBar`, `SectionHeading`, `HairlineList`, `InlineStateMessage`, `CompactEmptyState`, and `AccessibleIconButton` for student application V2 surfaces. Utility links must keep visible focus and at least 40px hit height.

### Student Home S1 layout

- Organize the page as short workspace context, one application status hero with one primary action, a five-criterion overview, and an attention section only when server data gives the student an actionable update.
- Reuse the existing five-criterion label/icon map and criterion status presentation. At desktop use a centered 3+2 card grid; collapse to two columns and then one column on narrow screens. Keep neutral surfaces and semantic status colors; do not add a sixth criterion, progress percentage, AI narrative, notification feed, or duplicated primary action.
- Choose one next action using server application/final status, supplement requests, resolved eligibility and deadline, criterion/precheck/evidence guidance, then draft or start fallback. Never offer the initial submit action while eligibility/deadline data is unresolved or blocks submission.
- Do not infer an active review season when there is no current application. Show a deadline configuration state only when an existing application's deadline response returns `NOT_CONFIGURED`.
- The current-application contract has no cancellation state/timestamps. Do not represent an application as canceled from missing fields; S1 is not a readiness sign-off for follow-on work that requires canceled-state handling until the contract supplies it.
- Keep assistant and notification routes available, but keep their narrative/feed content off Student Home. Use only authenticated workspace and server-provided school-year/deadline/result data.
- Loading, no-application, API error, submitted, review, supplement, and final-result states should stay compact and use existing V2 primitives. Home criteria cards link to the matching criterion only when an application exists.

### Student Application S2 workspace

- `/app/application` opens an overview with exactly the canonical five criteria in shared-map order. A `criterion` search value opens that criterion directly; returning to overview removes only `criterion` and preserves other supported search fields. Existing `/app/evidence`, `/app/drafts`, `/app/my-application`, and `/app/profile` compatibility redirects remain intact.
- The overview shows application status, available next action, criterion preparation status, and evidence count only when the completion/evidence APIs return it. Evidence count is not a completion result. `priority` remains supporting information and never appears as a criterion.
- The criterion workspace shows one selected detail beside an accessible criterion navigator. It reuses current requirement data sections, explicit-save forms, evidence gallery, dialogs, and links. It does not require a sequence and does not show target-level/cascade choices.
- The detail order is criterion context, server-provided requirement/data, evidence, then supporting checks/actions. The condition sheet uses the current completion response and must not add hardcoded thresholds or historical rules.
- Application editability remains status-derived: draft/prechecked/ready states keep supported edits; submitted, under-review, Resolution, and final states are read-only. Existing supplement scope remains enforced by current UI/API behavior; S2 does not add a new supplement editor. If a criterion form is open, changing criterion or returning to overview asks before discarding the unsaved form state.
- The current/start request does not pin a school year or send a target level. Backend creation assigns `city` to new Student individual applications; eligibility routes (`DIRECT_CITY` and `UDN_PREREQUISITE`) remain prerequisite paths, not review levels. Existing applications retain their stored legacy level when read, with no historical rewrite. Student target-level writes through PATCH and draft autosave are denied.
- Loading uses an overview or detail skeleton matching the route. Current-application errors have retry; partial criteria/evidence failures remain scoped to their sections. Cancellation/archive remains unrepresentable on the student DTO and is not simulated.
- Phase 3 workspace layout: the V2 application workspace must use one context bar and a two-column grid of `232px minmax(0, 1fr)` on desktop. Do not add a fixed guide column or a third operational column.
- Phase 3 workspace content: each criterion renders exactly one data component before the evidence gallery: `DefinitionTableV2`, `PathSelectorListV2`, `ActivityLedgerV2`, or one dynamic disclosure. Keep evidence as a gallery, not mixed row/card layouts.
- Phase 3 workspace sidebar: use the verified/provided Hội Sinh viên emblem asset in the student V2 sidebar and other existing institutional entry points that previously used the mock `5T` mark. Keep the emblem, profile rows, and active left nav marker; account/logout actions live in the shared `AppHeader`.

### Student precheck and City submission S5

- `/app/ai-precheck` renders the Student review page for an individual City application. Keep the existing class-representative `AiPrecheck` fallback (and existing route guard for City Officer) plus the legacy Student workspace for non-City or supplement/resolution states.
- Show exactly the five canonical criteria from `src/lib/criteria-presentation.ts`. Criterion completion and evidence counts describe recorded information only; never label them pass/fail or as a final award decision. Do not show readiness scores, raw rules, `priority`, target-level controls, or fabricated season/year data.
- Precheck missing items, rules findings, OCR/evidence suggestions, and warnings are advisory. Their presence, severity, count, or criterion completion must not disable initial submit. Use neutral copy, deep-link a known criterion to `/app/application?criterion=<key>`, and state that the student may continue despite suggestions.
- Initial City submit availability comes only from the application lifecycle and the resolved server eligibility and submission-window responses. Fail closed while either gate is loading, unavailable, unknown, not eligible/under verification, not configured, not yet open, or closed. `EXCEPTION_ACTIVE` is allowed only when returned by the backend.
- Refresh eligibility and deadline before opening the confirm dialog and again on confirm. Use the existing `useSubmitApplication` mutation with `allowSubmitWithWarnings: true`; keep server errors localized and map them to eligibility/window guidance. Do not change the endpoint, role checks, workflow, or API types.
- The confirmation explains that submission enters City review and limits draft editing; pending state prevents repeat actions. After a successful response, refetch the current application and show its submitted/review state as read-only. The five criteria are not the final result.
- If there is no current application, provide the existing application-start path and do not display a season or inferred deadline. Show school and school year only from authenticated/server data.

### Student workspace lean presentation S5.1

- Keep the student journey ordered as application context, current work, evidence, checks, and official result. Prefer short headings and remove repeated descriptions, duplicate counts, and repeated explanations while preserving all server-backed status, requirement, deadline, and action details.
- The application overview and criterion workspace should make the five existing criteria easy to scan; show evidence names as the primary document label and criterion/status as supporting context. Keep canonical evidence naming, search across evidence name and file name, preview, edit/replace, delete, and upload interactions intact.
- Keep precheck suggestions advisory and visually distinct from eligibility/deadline gates. Do not change which conditions block submission, confirmation copy about the effect of submit, pending/error feedback, or server refresh behavior.
- Before a final decision, the result route should show the current application status and a concise explanation that a result is not yet available. Show official result fields and criterion decisions only when the existing finalized response supplies them; do not render placeholder result metrics or empty summary panels.
- Compact presentation must retain accessible names, focus visibility, keyboard operation, responsive layouts, loading/error/empty states, and the existing document viewer and dialogs. S5.1 is a presentation-only change; it does not create new APIs, routes, DTOs, statuses, or workflow transitions.

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

## Student Evidence Library (S3)

- `/app/upload` is the Student evidence library. It reuses the existing shell, `StudentEvidenceCard`, `AddEvidenceDrawer`, Radix dialog, shared five-criterion presentation, existing evidence API hooks, document preview, and evidence detail modal. The library has a compact count row, criterion filters for exactly `ethics`, `academic`, `physical`, `volunteer`, and `integration`, name/file search, and a human-readable status filter. `priority` and `collective` are not presented as City Student criteria.
- Student-facing status copy is “Đang đọc tài liệu”, “Cần bạn kiểm tra”, “Đã sẵn sàng”, “Chờ cán bộ kiểm tra”, “Không thể đọc tài liệu”, and “Đã ghi nhận”. Backend `IndexingStatus` and the evidence card `uxStatus.step` map to these labels; raw pipeline labels do not appear in the library. `evidence_read` alone means the document was read; show “Cần bạn kiểm tra” only for missing information or an actual pending confirmation signal.
- Processing uses the existing `useEvidenceCardPolling` helper for each processing item: immediate query, 2-second initial interval, 5-second backoff after 20 seconds, pause while the tab is hidden, stop on a terminal state, and stop after 3 minutes. The backend starts async work; copy says students can continue other parts. The page does not show a synthetic progress percentage. Failed items open the existing detail view; retry is available only for editable applications, mutable evidence, and failed jobs marked retryable by the existing API.
- Add Evidence is a three-part dialog: choose one canonical criterion, enter a title and optionally a note, choose/preview a document, then submit. A criterion query preselects the chooser. Closing before submit discards entered values; this is stated in the dialog. Create metadata, upload the file, and start processing remain separate API mutations. Upload success closes the dialog, refreshes the library, and says “Đã thêm minh chứng. Hệ thống đang đọc tài liệu.”
- The same `/app/upload` route accepts `criterion=<core-key>&action=upload` and the compatibility parameter `uploadEvidence=1`; criterion alone filters the list. S2's existing `/app/application?criterion=<core-key>&uploadEvidence=1` continues to open the criterion-scoped drawer in the application workspace. `/app/upload?evidenceId=<id>&mode=confirm` bridges to the existing detail/confirmation view and preserves the selected evidence. No detail redesign is included in S3.
- Submitted/review/final applications are read-only in the library. A `supplement_required` application remains read-only here because the list mutation contract is not scoped to allowed criteria; students must open the application workspace, which enforces its existing supplement scope. In an editable application, evidence already `accepted`, `rejected`, or `resolution_needed` also hides mutation actions. Delete remains the existing hard-delete operation and is confirmed with its irreversible effect.
- Event-linked evidence remains available through current recognized-event suggestions and import APIs, presented as “Dùng hoạt động đã được ghi nhận”. Student-uploaded evidence remains file-based; S3 does not add a separate manual/non-file evidence capability.
- Backend accepts MIME types `application/pdf`, `image/jpeg`, `image/png`, and `image/webp`. `MAX_FILE_SIZE_MB` defaults to 20 MiB in backend config and `.env.example`, but can be overridden; there is no API that publishes the deployed value. Student pre-validation mirrors the 20 MiB default, and backend validation remains authoritative.

## Student Evidence Detail (S4)

- Student evidence detail remains the existing `EvidenceDetailModal`, reached from the evidence workspace or `/app/upload?evidenceId=<id>&mode=confirm`. The selected evidence and close/back context stay owned by the calling workspace; the modal does not add a route or API.
- On desktop the dialog shows one document viewer beside the information pane. PDF uses the browser viewer; supported images use a contained image preview. File selection, signed-URL loading/error/retry, and “Mở bản gốc” remain available only when a usable URL exists. Smaller viewports keep the same content in a vertically scrollable dialog.
- Information is presented as “Thông tin nhận diện”. Processing copy describes the current waiting/reading/summary/official-list stage without a synthetic percentage. No raw OCR text, provider, field confidence, model name, or pipeline code is shown. Recognition and precheck are supporting context; a student confirmation only confirms the values against the document, while staff retain decision authority.
- The card API provides `extractedValue`, `correctedValue`, and `effectiveValue`. Display uses the effective value; a saved correction keeps the original recognized value visible for comparison. Correction PATCH updates the confirmed-fields overlay and does not overwrite extracted/normalized source fields. Confirmation POST sends the current `expectedUpdatedAt`. Controls require both modal-level editability and the card's `canEdit`/`canConfirm`; submitted applications and accepted/rejected/resolution-locked evidence remain read-only. Retry remains gated by an editable application, mutable evidence, failed job, and `retryable: true`.
- Upload size uses `EVIDENCE_UPLOAD_LIMIT_MB=20`, matching backend `MAX_FILE_SIZE_MB` default (20 MiB). Deployments may override it, and there is no endpoint to expose that runtime setting, so server validation remains authoritative.

## Student signup institution selector (E1.5)

- Signup fetches eligible institutions from the public workspace registry and offers one searchable list. Display the backend's canonical `name` as-is; do not show stable codes, parent IDs, or eligibility route labels. Since the public list does not provide parent display metadata, do not imply groupings.
- The selector is required only when creating a Student account. Login remains email and password only; the authenticated user's workspace supplies institution context.
- Backend registration validation is authoritative and may reject an institution whose status changed after the list loaded. On a workspace eligibility rejection, refresh the list and show the server-mapped message.
