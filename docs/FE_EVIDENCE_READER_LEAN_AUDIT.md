# FE Evidence Reader Lean Audit

## 1. Evidence / criterion page hiện tại

- `/app/evidence` renders `EvidenceWorkspaceSafe`.
- Each criterion section now auto-checks official matches first, shows a secondary search fallback, upload fallback, approved-evidence reference, and compact evidence list.
- Upload drawer is lean: evidence name, file, optional officer note.
- Evidence detail opens a student-friendly card plus file tab.

## 2. Confidence / percent / AI suggestion

- Current student evidence components do not render confidence, percent bars, AI judging, or validity probability copy.
- Separate AI/demo/officer pages still contain AI/confidence wording and are outside this prompt.

## 3. Mock data imports

Existing mock-data imports are in unrelated legacy/demo surfaces:

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

No new runtime mock import should be added.

## 4. API services hiện có

- Evidence: `src/features/evidence/api/evidence.ts`
  - `POST /api/applications/:id/evidences`
  - `POST /api/evidences/:id/files`
  - `GET /api/evidences/:id/card`
  - `GET /api/evidences/:id/audit`
- Jobs: `src/features/evidence/api/jobs.ts`
  - `GET /api/jobs/:id`
- Event / matching fallback: `src/features/event/api/events.ts`
  - `GET /api/events/search`
  - `POST /api/events/:id/import-as-evidence`
- Knowledge Base: `src/features/evidence/api/knowledge-base.ts`
  - `GET /api/knowledge-base/search`

No frontend service currently targets `/api/evidence-matching/search` or `/api/evidence-matching/:eventId/import`.

## 5. Reusable components/hooks

- `UxStatusCard`
- `AuditDrawer`
- `LoadingState`
- `ErrorState`
- `EmptyState`
- `useEvidenceCardPolling`
- `useJobPolling`
- `EvidenceAuditButton`
- `AddEvidenceDrawer`

## 6. Routes to modify

- `/app/evidence` via `src/features/evidence/components/EvidenceWorkspace.tsx`.
- Evidence detail/card via `EvidenceDetailModal.tsx` and `EvidenceCardPanel.tsx`.
- Service/type normalization in `evidence.ts`, `events.ts`, and `types/evidence.ts`.

## 7. Not in this prompt

- No backend endpoint creation.
- No officer/debug UI redesign.
- No mock runtime data.
- No raw OCR/VNPT/signed URL/token display.
- No import from approved reference cases.
