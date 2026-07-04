# FE Auto Matching Evidence UX Audit

## 1. Current student evidence flow

- `/app/evidence` renders criterion sections in `EvidenceWorkspace.tsx`.
- Each criterion currently shows an Event Hub search block first and asks the student to type an activity name before results load.
- Upload is available as a fallback after search empty/error states.
- Evidence list is compact and no longer renders confidence.

## 2. Confidence/percent/AI suggestion surfaces

- Student evidence components touched by the current flow do not render confidence or AI judging copy.
- Separate AI pages and officer/manager/review routes still contain AI/confidence wording. They are outside this student evidence prompt.

## 3. Mock data imports

Existing runtime mock imports remain in unrelated legacy/demo pages:

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

No new mock-data import should be added for this work.

## 4. Event search service

- `eventsApi.searchApprovedEvidence` uses `GET /api/events/search`.
- `useApprovedEvidenceSearch` wraps the service and can query by `criterion`, optional `q`, and current user `studentCode`.
- No `GET /api/evidence-matching/search` alias is present in the frontend service layer today.

## 5. Evidence Knowledge Base / approved evidence UI

- `knowledgeBaseApi.search` uses `GET /api/knowledge-base/search`.
- `EvidenceSearch.tsx` exists as a knowledge-base-like search UI, but it is a separate page and can expose sample material; the criterion page needs a lean reference-only block.
- If the backend returns no knowledge-base items, the student UI should show an empty reference state, not mock data.

## 6. Reusable components/services

- Official matching: `useApprovedEvidenceSearch`, `useImportApprovedEvidence`, `ApprovedEvidenceSearchItem`.
- Upload fallback: `AddEvidenceDrawer`.
- Evidence details: `EvidenceDetailModal`, `EvidenceCardPanel`.
- Status labels: `studentEvidenceStatus.ts`.
- Audit: `EvidenceAuditButton`, `AuditDrawer`, `AuditTimeline`.
- Knowledge base: `useKnowledgeBaseSearch` and `knowledgeBaseApi.search`.

## 7. Routes/components to modify

- Main student route: `/app/evidence` via `src/features/evidence/components/EvidenceWorkspace.tsx`.
- Student detail/card: `EvidenceCardPanel.tsx`, `EvidenceDetailModal.tsx`.
- Audit labels: `EvidenceAuditButton.tsx`.
- Event wording: `ApprovedEvidencePage.tsx`, `ApprovedEvidenceCard.tsx`, `ImportEvidenceModal.tsx` where student-facing.
- Knowledge reference block can live inside `EvidenceWorkspace.tsx` unless it grows.

## 8. Not in this prompt

- No backend endpoint creation.
- No mock reference/evidence data.
- No import from approved evidence reference cases.
- No officer/manager/debug UI redesign.
- No exposure of other students' names, MSSV, files, raw OCR, raw JSON, confidence, or personal decisions.
