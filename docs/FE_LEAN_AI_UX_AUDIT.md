# FE Lean AI UX Audit

## 1. Student-facing AI/confidence copy

- `src/features/evidence/components/EvidenceWorkspace.tsx` shows confidence in the evidence list as `Độ chắc chắn` plus a percent.
- `src/features/evidence/components/EvidenceCardPanel.tsx` shows confidence label, explanation, and percent in the Evidence Card.
- `src/features/evidence/components/EvidenceDetailModal.tsx` uses copy around `Kết quả đọc` and `số hoá` that is longer than needed for student flow.
- `src/features/ai/components/AiPrecheck.tsx` and `src/features/ai/components/Chatbot.tsx` show AI/confidence language, but those are separate AI feature pages, not the student evidence flow being refactored here.
- Officer/manager/review routes still show confidence/AI terms. They are outside this student-flow scope unless promoted to shared student components.

## 2. Runtime mock-data imports

- `src/lib/store.ts`
- `src/components/layout/Sidebar.tsx`
- `src/features/ai/components/Chatbot.tsx`
- `src/features/ai/components/AiPrecheck.tsx`
- `src/features/collective/components/CollectiveWorkspace.tsx`
- `src/features/event/components/EventLibrary.tsx`
- `src/features/auth/role-map.ts`
- `src/features/application/components/DraftWorkspace.tsx`
- `src/features/integration/components/VnptIntegration.tsx`
- `src/features/application/components/Wizard.tsx`
- `src/features/application/components/Dashboard.tsx`
- `src/features/evidence/components/UploadEvidence.tsx`
- `src/features/core/components/Settings.tsx`

The student evidence workspace does not currently import `src/lib/mock-data.ts`.

## 3. Evidence page information to hide

- Confidence label and percent in list and card.
- Long technical copy about digitization, SmartReader, Evidence Card generation, and final decision.
- File/job progress technical labels from job status.
- Warnings as a full section on the main card.
- OCR text is visible as a full section by default.
- Raw extracted object values can be rendered as JSON-like text through `formatFieldValue`.

## 4. Event Hub-first flow

The current `/app/evidence` page starts from upload/list actions. Event Hub search exists as a separate approved evidence page and route, so students are not guided to search Event Hub first inside each criterion.

## 5. Reusable components/services

- `UxStatusCard`: reusable but should avoid progress percent in student evidence status cards.
- `AuditDrawer`: reusable, already drawer-based; labels need shorter friendly names.
- `EvidenceCardPanel`: reuse as the lean student evidence card surface.
- Event search service: `useApprovedEvidenceSearch` and `eventsApi.searchApprovedEvidence` use `GET /api/events/search`.
- Evidence service: `useCreateEvidence`, `useUploadEvidenceFile`, `useStartEvidenceIndexing`, `useEvidenceCard`, and `useEvidenceAudit` already use real API endpoints.

## 6. Routes/components to modify

- Student Evidence route: `src/routes/app.evidence.tsx` renders `EvidenceWorkspaceSafe`.
- Student Evidence workspace: `src/features/evidence/components/EvidenceWorkspace.tsx`.
- Student evidence detail/card: `EvidenceDetailModal.tsx`, `EvidenceCardPanel.tsx`.
- Upload fallback: `AddEvidenceDrawer.tsx`.
- Student Event Hub / Approved Evidence: reuse existing hooks and keep page copy aligned where touched.
- Audit: `EvidenceAuditButton.tsx` and existing `AuditDrawer`.

## 7. Not in this prompt

- No officer/manager workflow redesign.
- No backend API changes.
- No mock runtime replacement across unrelated pages.
- No raw OCR/VNPT/debug viewer for students.
- No new scoring, eligibility, or automated approval logic.
- No large routing/navigation restructure beyond making `/app/evidence` Event Hub-first per criterion.
