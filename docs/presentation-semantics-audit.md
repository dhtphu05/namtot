# Presentation Semantics Audit

Date: 2026-07-18

Scope: frontend presentation semantics only. No adapter implementation, no layout refactor, no route/API/query-key/mutation/requirement-key changes.

## Baseline

- Frontend repo: `D:\02_PROJECTS\5TOT\namtot`
- Frontend branch: `feat/sth`
- Frontend HEAD before edits: `45466bb168fb55324da0127710921efd4d44bd88`
- Backend repo: `D:\02_PROJECTS\5TOT\sv5tot-hackaithon-backend`
- Backend branch: `feat/sth`
- Backend HEAD before edits: `c0fd4b2218c6c21c64fe3e38cf75cbe5b74f8f08`
- Initial modified/untracked files: none reported by `git status --short` in frontend/backend.

## Sources Reviewed

- Frontend `AGENTS.md`, `docs/UI_GUIDE.md`, `docs/CODEBASE_CONTEXT.md`.
- Backend `AGENTS.md`, `docs/CODEBASE_CONTEXT.md`, `docs/criteria-completion-contract-freeze.md`, `docs/criteria-completion-business-flow-acceptance.md`.
- Student surfaces: `src/routes/app.application.tsx`, `src/routes/app.overview.tsx`, `src/routes/app.feedback.tsx`, `src/routes/app.assistant.tsx`, plus legacy `app.wizard`, `app.ai-precheck`, `app.cascade`, `app.upload`, and redirect routes.
- Student components/selectors/API/hooks/types: `StudentApplicationActionWorkspace.tsx`, `StudentOverview.tsx`, `student-ui.ts`, `application.ts`, `useApplication.ts`, `useEvidence.ts`, `types.ts`.
- Evidence, notifications, chatbot, shared UI primitives, and UI-kit components.
- External skill source docs: `.agents/skills/redesign-existing-projects/SKILL.md`, `.agents/skills/web-design-guidelines/SKILL.md`, and the upstream Vercel Web Interface Guidelines command.

## Summary

The current student-facing flow is functionally close to the frozen business contract, but presentation semantics are still mixed with raw completion and evidence metadata. The highest risk is status priority: final/review decisions can be visually diluted by completion counts, stale verification warnings, or evidence counts. The second major risk is raw backend value leakage in requirement-path and evidence/detail surfaces.

## Issues

### PS-001 - P0 - Final/review result can be overwritten by completion/precheck presentation

- File: `src/features/student/selectors/student-ui.ts`
- Component/function: `applyCompletionToCriteriaState`, `getStudentApplicationSummary`, `getNextActions`
- Current output: criterion status is mapped directly from `completion.status`; `accepted` becomes `Sẵn sàng kiểm tra`, and descriptions still include `x/y điều kiện có dữ liệu` plus `mục cần xác minh`.
- Expected output: final result and review acceptance must win; accepted review should show accepted/reviewed wording and demote completion counts to metadata.
- Business source: `criteria-completion-contract-freeze.md` status priority and rule that precheck/completion is not final result.
- Proposed mapper/selector: add a presentation adapter such as `selectStudentCriterionPresentation({ application, reviewTasks, supplementRequests, resolution, completion, precheck, evidences })` with priority final > review > supplement > resolution > review status > completion.
- Regression risk: high; current overview/application cards can imply a reviewed criterion is still only precheck-ready.
- Tests needed: unit cases for final passed + completion warning, review accepted + completion `needs_verification`, accepted + `0/n`, and supplement + ready-for-precheck.

### PS-002 - P0 - Evidence count is still used as completion/readiness fallback

- File: `src/features/application/components/SubmitConfirmationModal.tsx`
- Component/function: `buildCriterionSummary`
- Current output: if no precheck result exists, any evidence count can become `Đủ dữ liệu cơ bản`; no evidence becomes `Chưa có minh chứng`.
- Expected output: evidence count is only metadata; criterion completion must come from completion/precheck/review/final state.
- Business source: frozen contract says evidence count is not criterion completion, and completion/precheck is the source for requirement satisfaction.
- Proposed mapper/selector: feed `CriterionCompletionItem` into submit summary; show evidence count as secondary line only.
- Regression risk: high around submit-with-warning confirmation copy.
- Tests needed: evidence-only criterion should not be presented as complete; final passed should not show missing evidence warning.

### PS-003 - P1 - Raw requirement keys render in student path lists

- File: `src/features/application/components/StudentApplicationActionWorkspace.tsx`
- Component/function: `PhysicalRequirementPanel`, `PhysicalPathRow`
- Current output: physical added-list renders `{path.key}` and path row renders uppercase/snake-like keys such as `healthy_student_title`.
- Expected output: student-facing labels from requirement label map, never backend keys.
- Business source: hard rule "Không lộ requirement key, enum, source code hoặc backend identifier."
- Proposed mapper/selector: `formatRequirementLabel(key, title)` with full fallback `Điều kiện theo cấu hình hiện tại`; keep key only in payload.
- Regression risk: medium; replacing display-only text should not affect actions.
- Tests needed: requirement label fallback, all five physical keys, unknown key.

### PS-004 - P1 - Source labels can leak raw `acceptedSources`

- File: `src/features/application/components/StudentApplicationActionWorkspace.tsx`
- Component/function: `getAcceptedSourcesLabel`
- Current output: joins `requirement.acceptedSources`, so UI can show `manual_evidence, official_event, system_data`.
- Expected output: Vietnamese source labels like `Minh chứng sinh viên tải lên`, `Danh sách/hoạt động đã xác nhận`, `Dữ liệu hệ thống`.
- Business source: source types in frozen contract; hard rule for unknown backend values.
- Proposed mapper/selector: `formatRequirementSourceList(acceptedSources)` with unknown fallback `Nguồn dữ liệu khác`.
- Regression risk: low; display-only.
- Tests needed: all source types plus unknown fallback.

### PS-005 - P1 - Form schema fields and evidence types may surface raw backend field names

- File: `src/features/application/components/StudentApplicationActionWorkspace.tsx`
- Component/function: `getGroupEvidenceTypes`, `getFormFields`, `integrationFieldLabel`
- Current output: academic chips can fall back to raw requirement keys; integration fields not in the small label map render raw field names.
- Expected output: every field/chip gets Vietnamese label, unknown fields use neutral fallback.
- Business source: requirement-label hard rule and integration contract allowing non-hardcoded dynamic CriteriaVersion paths.
- Proposed mapper/selector: `formatRequirementChip`, `formatFormFieldLabel` with fallback `Thông tin bổ sung`.
- Regression risk: medium; field names still must remain raw in `payloadJson`, only label changes.
- Tests needed: known integration fields, unknown dynamic field, academic additional achievement keys.

### PS-006 - P1 - AI/SmartReader confidence is still student-facing in evidence details

- File: `src/features/evidence/components/EvidenceCardPanel.tsx`
- Component/function: `FieldInfo`, `confidenceLabel`, `getAcademicInfo`
- Current output: field confidence renders as `Chắc chắn cao`, `Cần xem lại`, `Chưa chắc chắn`; SmartReader suggestion copy is visible.
- Expected output: no confidence signal or AI approval implication in student-facing surfaces; only readability/support wording.
- Business source: frozen contract forbids confidence percentage as decision signal and hard rule says do not show AI confidence.
- Proposed mapper/selector: hide confidence badges for students; use `Cần cán bộ kiểm tra` only when the backend/student status requires it.
- Regression risk: medium; reviewer-facing routes may still use confidence/readability, but student detail must not.
- Tests needed: evidence detail with `fieldConfidence` should not render confidence labels for student mode.

### PS-007 - P1 - Unknown source/status fallbacks sometimes return raw backend values

- File: `src/features/evidence/components/StudentEvidenceCard.tsx`, `src/features/evidence/components/EvidenceWorkspace.tsx`, `src/routes/app.resolution.$id.tsx`
- Component/function: `sourceTypeLabel[...] ?? "Nguồn khác"`, `sourceTypeCopy[...] ?? evidence.sourceType`, `getResolutionEvidenceSourceLabel`
- Current output: primary student card has a safe fallback, but legacy upload and resolution evidence can render raw `sourceType`.
- Expected output: all student-visible routes use Vietnamese fallback `Nguồn dữ liệu khác`.
- Business source: hard rule "Unknown backend value phải có fallback tiếng Việt."
- Proposed mapper/selector: centralize evidence source/status display under one `formatEvidencePresentation` helper.
- Regression risk: medium because `/app/upload` is legacy but still reachable.
- Tests needed: unknown `sourceType` across application card, detail modal, legacy upload.

### PS-008 - P1 - Waiting states can become actions

- File: `src/features/student/selectors/student-ui.ts`
- Component/function: `getNextActions`
- Current output: completion `nextAction.label` is used as `title` and `actionLabel`; waiting labels such as school confirmation can become CTA text.
- Expected output: action type `wait_for_confirmation` should render passive status text, not a button.
- Business source: hard rule "Waiting state không được biến thành button"; precheck next action priority includes waiting/verification states.
- Proposed mapper/selector: classify action types into `command`, `navigation`, `passive`; only commands generate CTA labels.
- Regression risk: high; bottom action bar currently treats non-criterion actions as precheck.
- Tests needed: `wait_for_confirmation`, `find_official_data`, `upload_evidence`, `submit`, `open_supplement`.

### PS-009 - P1 - Operator semantics are only implicit and can still look like count completion

- File: `src/features/student/selectors/student-ui.ts`, `src/features/application/components/StudentApplicationActionWorkspace.tsx`
- Component/function: `applyCompletionToCriteriaState`, physical/integration path panels
- Current output: all criteria use `satisfied/required điều kiện có dữ liệu`; physical/integration path panels do explain one valid path, but the summary still looks like arithmetic completion.
- Expected output: `one_of` groups say `Chỉ cần một cách chứng minh phù hợp`; `at_least_n` uses required count as target; activity aggregation uses totals.
- Business source: operator contract in backend freeze.
- Proposed mapper/selector: group-level summary mapper that reads `RequirementGroup.operator`, `requiredCount`, and `optional`.
- Regression risk: medium; mostly copy semantics, but prevents wrong student interpretation.
- Tests needed: `one_of` not shown as `x/total`, `at_least_n` denominator, optional group copy.

### PS-010 - P2 - Encoding regression exists in signup copy

- File: `src/routes/signup.tsx`
- Component/function: submit validation toasts
- Current output: mojibake strings such as `Vui lÃ²ng chá»...`.
- Expected output: valid Vietnamese.
- Business source: audit requirement explicitly asks to find encoding errors.
- Proposed mapper/selector: direct copy fix in a separate small task; this prompt does not implement UI fixes.
- Regression risk: low.
- Tests needed: none required beyond lint/build; optional smoke for signup validation toasts.

### PS-011 - P2 - Destructive evidence action is visually prominent and immediate

- File: `src/features/evidence/components/StudentEvidenceCard.tsx`
- Component/function: delete button
- Current output: `Xóa` is a danger button on every editable evidence card and calls delete immediately through parent handler.
- Expected output: destructive action should be secondary/confirmed or undoable, especially for evidence linked to requirements.
- Business source: evidence presentation audit checklist and web guideline destructive-action rule.
- Proposed mapper/selector: not a selector; use existing confirmation dialog pattern later without changing mutation.
- Regression risk: medium; current immediate delete can surprise users.
- Tests needed: delete confirmation/undo path and invalidation unchanged.

### PS-012 - P2 - Legacy student routes still use old metric/evidence semantics

- File: `src/routes/app.wizard.tsx`, `src/routes/app.ai-precheck.tsx`, `src/routes/app.cascade.tsx`, `src/features/application/components/StudentApplicationWorkspace.tsx`
- Component/function: legacy workspace route bindings and old component
- Current output: legacy routes still render the old workspace for students and contain fixed evidence-count/metric interpretations.
- Expected output: either redirect legacy student routes to `/app/application` or wrap them with the same presentation adapter when V2 is enabled.
- Business source: current `CODEBASE_CONTEXT.md` says `/app/application` is canonical while these routes remain legacy.
- Proposed mapper/selector: route impact decision for V2 rollout; no route change in this prompt.
- Regression risk: medium because bookmarked legacy URLs can show inconsistent semantics.
- Tests needed: route smoke for `/app/wizard`, `/app/ai-precheck`, `/app/cascade`.

## Status Priority Proposal

Use one student presentation adapter per criterion and one application-level adapter.

Inputs:

- `application.status`, `finalStatus`, `finalLevel`, `finalNote`, `finalizedAt`
- `reviewTasks[]`
- active supplement requests
- resolution status when available
- `CriterionCompletionItem`
- latest precheck result
- evidence metadata

Output:

- `headlineStatus`
- `badgeLabel`
- `tone`
- `summaryLine`
- `metadataLines[]`
- `primaryAction`
- `passiveState`

Priority:

1. If final result exists, show final result and final level.
2. Else if review task decision exists, show accepted/rejected/supplement/resolution.
3. Else if supplement request is active, show supplement reason/deadline.
4. Else if resolution is active, show waiting/decision.
5. Else if under review/submitted, show review progress.
6. Else use completion/precheck.
7. Else show raw evidence metadata as secondary only.

## Operator Semantics Proposal

- `all_of`: `Cần đủ các điều kiện bắt buộc`.
- `one_of`: `Chọn một cách chứng minh phù hợp`; no `x/total`.
- `at_least_n`: `Cần đạt ít nhất N điều kiện`; denominator is `requiredCount`, not options length.
- `activity_aggregation`: use verified/pending/excluded totals; only verified total can satisfy.
- Optional groups: `Không bắt buộc ở cấp hiện tại`.

## Requirement And Source Label Proposal

Central mappers:

- `formatCriterionLabel(criterion)`
- `formatRequirementLabel(requirementKey, fallbackTitle)`
- `formatRequirementSource(sourceType)`
- `formatRequirementResponseKind(responseKind)`
- `formatEvidenceSource(sourceType)`
- `formatUnknownBackendValue(kind)`

Never render keys/enums directly. Preserve them only in API payloads and internal matching.

## Action Semantics Proposal

Action categories:

- `choose_path`: navigate/select criterion path.
- `declare_data`: open/submit metric or activity form.
- `find_official_data`: link to official/event library.
- `upload_evidence`: open upload dialog with criterion/requirement context.
- `fix_missing_field`: open evidence detail or supplement surface.
- `wait_for_confirmation`: passive status only.
- `open_supplement`: navigate to requested supplement criterion.
- `run_precheck`: run precheck mutation.
- `submit`: submit/resubmit.

Rules:

- Do not generate a CTA from waiting states.
- Do not duplicate submit/precheck actions unless the existing shell already expects header + bottom placement.
- Keep mutation calls unchanged.

## Evidence Semantics Proposal

- Card front: evidence title, criterion label, source label, status label, concise extracted summary.
- Metadata: file count/date; long filename hidden behind truncation or detail view.
- Detail: show OCR/read fields as extracted support, not approval.
- Legacy evidence: show `Dữ liệu đã có` or `Nguồn dữ liệu khác`, not raw source/status.
- AI/SmartReader: no confidence labels for students; reviewer/staff surfaces can keep readability labels if clearly not final approval.

## Encoding

Command run:

```text
rg -n "XÃ|áº|á»|Æ°|Ä‘|â€|ï¿½" src
```

Findings:

- `src/routes/signup.tsx:114`
- `src/routes/signup.tsx:116`
- `src/routes/signup.tsx:118`
- `src/routes/signup.tsx:120`

These are copy-only mojibake defects and should be fixed in a scoped follow-up.

## Unknown And Legacy Fallback

Required fallbacks:

- Unknown requirement: `Điều kiện theo cấu hình hiện tại`
- Unknown source: `Nguồn dữ liệu khác`
- Unknown status: `Đang cập nhật trạng thái`
- Legacy response: `Dữ liệu đã có`
- Legacy event/official import: `Danh sách đã xác nhận`
- Unknown evidence/file state: `Đang cập nhật minh chứng`

## Route Impact

- Canonical student application route: `/app/application` -> `StudentApplicationActionWorkspace`.
- Overview route: `/app` and `/app/overview` -> `StudentOverview`.
- Feedback route: `/app/feedback` -> student branch of `Notifications`.
- Assistant route: `/app/assistant` -> `StudentSupport`/`SmartbotPanel`.
- Redirected route: `/app/evidence` -> `/app/application`.
- Legacy reachable routes: `/app/wizard`, `/app/ai-precheck`, `/app/cascade`, `/app/upload`.

V2 rollout should start on `/app/application`, `/app`, `/app/overview`, `/app/feedback`, `/app/assistant`, then decide whether legacy student routes redirect or consume the same adapter. No route changes were made in this audit.

## Mapping Proposal For 5 Criteria

### Ethics

- Primary requirements: `conduct_score`, `no_violation`.
- Optional group: `ethics_additional_achievements`.
- Status priority: final/review > supplement > school confirmation > completion.
- Waiting copy: `Chờ nhà trường xác nhận tình trạng vi phạm`.
- Student action: conduct score can be declared; no-violation is passive unless supplement asks for evidence.

### Academic

- Primary requirements: `academic_gpa`, `no_f_grade`, `academic_period_valid`.
- Additional group: `academic_additional_achievement`.
- GPA declaration remains manual metric; no-F and period validity require system/staff confirmation.
- Additional achievement labels must use requirement-label map, not raw keys.

### Physical

- Main group: `physical_path`, `one_of`.
- Path labels: GDTC result, Sinh viên khỏe, sports activity/award, sports team member, regular training.
- Student copy: one valid path is enough.
- Do not render path key; keep key in payload only.

### Volunteer

- Main group: `volunteer_path`, `one_of`.
- Aggregation paths: accumulated days and activity count.
- Totals: verified, pending verification, excluded, target.
- Only verified total can satisfy completion; pending declared activity remains pending.
- Activity source and conversion source need Vietnamese labels.

### Integration

- Main group comes from active CriteriaVersion, often `integration_path`.
- Paths: foreign language, skills/training, international exchange, competition, union achievement when configured.
- Foreign language supports non-English and unknown certificates; unknown mappings should be `Cần xác minh`, not rejection.
- Dynamic fields need label fallback and raw field names must remain internal payload keys only.

## Verification Needed For V2 Implementation

- Unit tests for presentation selectors before enabling `VITE_PRESENTATION_SEMANTICS_V2=true`.
- Focused lint: `npx eslint src/features/student/selectors/student-ui.ts src/features/application/components/StudentApplicationActionWorkspace.tsx src/features/application/components/StudentOverview.tsx src/features/evidence/components`.
- Build: `npm run build`.
- Browser smoke, if fixture/server available: `/app`, `/app/application`, `/app/feedback`, `/app/assistant`, each desktop/mobile.

## Implementation Result

Implemented on 2026-07-18 as a frontend-only adapter rollout guarded by `VITE_PRESENTATION_SEMANTICS_V2`. No backend contract, API query/mutation, route, generated route tree, or layout architecture change was made.

### Files

- New presentation module: `src/features/application/presentation/*`.
- Wiring: `src/features/application/components/StudentOverview.tsx`, `src/features/application/components/StudentApplicationActionWorkspace.tsx`.
- Evidence presentation surfaces: `src/features/evidence/components/AddEvidenceDrawer.tsx`, `src/features/evidence/components/StudentEvidenceCard.tsx`.
- Flag entry point: `src/lib/presentation-semantics.ts`, `.env.example`.
- Tests: `src/features/application/presentation/__tests__/presentation-semantics.test.ts`.

### Adapters

- `getStudentCriterionDisplayState` centralizes criterion display priority: `final_result` > `review_decision` > `supplement_request` > `resolution` > `review_status` > completion fallback.
- `getRequirementGroupPresentation`, `getRequirementPresentation`, `getRequirementLabel`, `getRequirementFieldLabel`, and `getRequirementChipLabel` map requirement trees and fields into Vietnamese UI copy.
- `getSourcePresentation`, `formatSourceList`, and `getResponseSourcePresentation` hide raw source enums from student-facing text.
- `getActionPresentation` separates passive waiting states from clickable next actions.
- `getEvidenceDisplayModel` maps evidence title, source, status, tone, warnings, and allowed actions.
- `ui-adapter` bridges presentation state into existing `StatusBadge`, action, and criterion UI shapes.

### Tests

- Added 20 focused unit tests covering status priority, fallback states, operator semantics, source labels, action interactivity, evidence display, and unknown-safe mappings.
- Verification command: `npx tsx --test src/features/application/presentation/__tests__/presentation-semantics.test.ts`.

### Mappings

- Five criteria now have centralized presentation labels for ethics, academic, physical, volunteer, and integration.
- `all_of`, `one_of`, `at_least_n`, and aggregation summaries are mapped into student-facing operator copy.
- Unknown requirement/source/status/evidence values fall back to neutral Vietnamese labels and keep raw keys internal.
- Physical, volunteer, and integration path labels no longer need to render internal path keys when V2 is enabled.

### Wiring

- `StudentOverview` uses the adapter for criterion status and next-action display only when `PRESENTATION_SEMANTICS_V2` is true.
- `StudentApplicationActionWorkspace` uses the adapter for criterion status, requirement labels, source labels, accepted source chips, integration field labels, evidence drawer context, and bottom action states only when the flag is true.
- `AddEvidenceDrawer` can receive requirement context without changing create-evidence payloads.
- `StudentEvidenceCard` uses the evidence display adapter when the flag is true.

### Flag False

- Default remains `VITE_PRESENTATION_SEMANTICS_V2=false`.
- Existing UI behavior remains the active path by default.
- `npm run build` passed with the default flag.

### Flag True

- `VITE_PRESENTATION_SEMANTICS_V2=true npm run build` passed.
- The adapter path is compiled through client, SSR, and Nitro/Vercel output.

### P0

- Completed: status priority adapter, operator semantics, source/action semantics, evidence presentation, unknown-safe fallbacks, and feature-flagged wiring.
- Completed: prevented passive waiting states from rendering as clickable CTAs in V2.
- Completed: kept backend payload keys and API behavior unchanged.

### P1

- Legacy student routes `/app/wizard`, `/app/ai-precheck`, `/app/cascade`, and `/app/upload` were not migrated in this pass.
- Browser smoke still needs an authenticated fixture or a working in-app browser attachment.
- Further visual QA should cover desktop/mobile overflow with seeded data for all five criteria.

### Blocker

- Browser smoke could not be completed because the in-app browser webview timed out while attaching to test pages. Build and focused automated checks passed for both flag modes, but interactive route verification remains blocked.
