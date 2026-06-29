# 5TOT Platform — Strict Workflow Refactor Plan

This is a large, opinionated refactor covering data model, UX flow, icon system, visual tone, and 4 new/redesigned modules. I'll execute it in 6 focused phases so each phase ships a usable build.

## Phase 1 — Foundation: data model + design tone + icon system

**Files:** `src/lib/mock-data.ts`, `src/lib/store.ts`, `src/styles.css`, new `src/components/AppIcon.tsx`

- Rewrite `mock-data.ts` around the new entities: `Application`, `Evidence` (with `evidenceName`, `sourceType`, `indexingStatus`), `MetricInput`, `EventRegistry`, `EventParticipant`, `ReviewTask`, `Officer` (with `specializedCriteria`), `KnowledgeBaseItem`, `AuditLog`.
- Seed one current `Application` for the student (school year 2025–2026), one collective application for Chi hội 21T_DT1, 5 specialized officers, ~10 events with indexed rosters (Mùa hè xanh, Hiến máu, Tập huấn Đoàn–Hội, Olympic Tin học, Sinh viên khỏe, etc.), ~8 KB items, mixed-status review tasks.
- Use the real GCN image as primary sample certificate; use the listed placehold.co URLs for other previews.
- Refactor `store.ts`: single `application` + `collectiveApplication` slices; actions `updateMetric`, `addEvidence`, `advanceIndexing`, `importFromEvent`, `submitApplication`, `assignTask`, `decideTask`, `indexEventRoster`. Every mutation calls `pushAudit`.
- `styles.css`: strip large gradients/glass; keep cyan `#00AEEF` and deep blue `#0057C2` as restrained accents on white/very-light-blue background; soft shadows only, no hard borders. Remove `gradient-brand` heavy usage by repointing the class to a flat deep-blue.
- New `AppIcon` wrapper: lucide-react only, fixed size, rounded-square tinted container, consistent stroke; export the icon mapping table (Hồ sơ→FileText, Bản nháp→PencilLine, Event Registry→CalendarCheck, OCR→ScanText, Cascade→GitBranch, Resolution→ShieldQuestion, etc.).

## Phase 2 — Student single-application workspace

**Files:** `src/routes/app.index.tsx`, `src/routes/app.drafts.tsx` (renamed semantics: single draft workspace), `src/components/layout/Sidebar.tsx`

- Dashboard: one hero card titled "Hồ sơ Sinh viên 5 tốt năm học 2025–2026" with status badge, target level, readiness, missing criteria count, last updated, AI pre-check state, and a single state-driven CTA. Add the explanatory paragraph about one-profile / cascade behavior.
- Single Draft Workspace: auto-save line, draft version, school year, target-level field, student summary, 5-criteria progress, evidence status, AI pre-check status, "next best action", action buttons (Lưu / Tiền kiểm / Nộp / Lịch sử cập nhật).
- Target-level cards (Trường / ĐHĐN / Thành phố / Trung ương) with meaning, key conditions, current readiness, and recommendation badge. On change → update application, toast.
- Sidebar: remove any "create new", rename items per icon map, remove emojis.

## Phase 3 — Criteria master-detail + 3 evidence-adding methods

**Files:** `src/routes/app.evidence.tsx` (new central workspace), `src/components/evidence/AddEvidenceModal.tsx` (new)

- Master (left): 5 criteria + priority/collective rows with progress, status, counts.
- Center: evidence list for selected criterion + Evidence Cards + indexing progress.
- Right: official requirement card per target level (concise: bắt buộc / có thể dùng / hệ thống tự kiểm / trạng thái / cần bổ sung), suggested events from registry, AI result, KB/Event Registry matches, next action.
- AddEvidenceModal with 3 tabs:
  1. **Nhập chỉ số** — GPA, conduct, physical, volunteer-days inputs with scale + optional file.
  2. **Import từ sự kiện** — search Event Registry, select event, system checks current student's MSSV in indexed roster, auto-creates evidence on match, fallback message on miss.
  3. **Upload file** — required `evidenceName`, criterion, file, event name, organizer, notes. Triggers indexing pipeline.

## Phase 4 — SmartReader indexing, Event Registry, Student Library, Knowledge Base

**Files:** `src/routes/app.event-registry.tsx` (new — HSV/Đoàn), `src/routes/app.event-library.tsx` (new — student), `src/routes/app.evidence-search.tsx` (revised KB), `src/components/indexing/IndexingProgress.tsx` (new)

- IndexingProgress component shared by evidence and event roster uploads with the listed steps.
- Event Registry (officer/HSV): master-detail, event list with filters, uploaded roster files, OCR/indexing status, extracted participant table with column mapping UI, index quality score, errors, metadata + criterion mapping + converted days + sample GCN + confirm batch.
- Student Library "Kho minh chứng & sự kiện hợp lệ": search + filters, event/evidence cards with "Kiểm tra tên tôi" and "Import vào hồ sơ" CTAs, found/not-found responses.
- Evidence Knowledge Base: searchable by name / event / organizer / criterion / level / status. Master-detail with sample GCN, OCR fields, accepted/rejected reason, similar cases, required fields, common errors, usage count, "Dùng làm tham chiếu".

## Phase 5 — Officer review (criterion-specialized) + Manager assignment + Cascade + Pre-check

**Files:** `src/routes/app.queue.tsx`, `src/routes/app.review.$id.tsx`, `src/routes/app.assignment.tsx`, `src/routes/app.ai-precheck.tsx`, `src/routes/app.cascade.tsx`, `src/routes/app.resolution*.tsx`

- Officer queue: tabs per specialized criterion, full filters, each row shows evidenceName, source type, AI confidence, status, due date. Officers only see tasks matching their `specializedCriteria` (manager sees all).
- Review detail: master-detail with file preview, Evidence Card, OCR fields, Event Registry match, KB similar cases, upload/indexing history, audit; right panel = requirement card + checklist + cascade context + AI suggestion + decisions (Đạt / Không đạt / Bổ sung / Resolution / Xác nhận cấp xét) + officer note + editable AI draft. Always shows "AI gợi ý — Cán bộ xác nhận quyết định cuối cùng."
- Manager assignment: assign by criterion / faculty, route low-confidence to senior officer, workload view, reassign, 5-criteria progress per application, aggregation state.
- AI Pre-check: 3 layers (Overall, Criteria, Cascade by level).
- Cascade Review: starts at aim level and steps downward with pass/fail per level.

## Phase 6 — Collective profile, audit log everywhere, polish

**Files:** `src/routes/app.collective.tsx`, `src/routes/app.collective.$id.tsx`, `src/routes/app.audit.tsx`, plus icon/tone sweep across remaining routes (notifications, export, analytics, chatbot, vnpt, ekyc, login)

- Collective: one profile per class/branch per year, master-detail, roster filters, collective criteria dashboard with auto-ratios, criterion-grouped evidence (registered list, SV5T achieved list, higher-level achievers, no-violation confirmation, activity images, minutes, report), with Event Registry imports.
- Audit log: confirm every action across the app routes pushes via `pushAudit`.
- Final sweep: replace remaining emojis with AppIcon, remove residual gradients/glass, tighten spacing, ensure tables/lists are dense and readable.

## Technical notes

- Stack stays TanStack Start + Zustand + Tailwind + lucide-react + framer-motion (used sparingly).
- All state is local/persisted via the existing `zustand/persist` store — no backend changes.
- Existing routes are edited in place where possible; new routes register automatically through `routeTree.gen.ts`.
- No build/typecheck commands run manually; the harness handles that after each phase.

## Out of scope

- Real OCR / real auth / real exports — all simulated with timed state transitions and mock data.
- Backend (Lovable Cloud) — not enabled; the user did not ask for persistence.
