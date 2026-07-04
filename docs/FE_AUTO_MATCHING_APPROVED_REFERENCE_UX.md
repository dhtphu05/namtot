# FE Auto Matching Approved Reference UX

## 1. UX mới: auto official matching trước

Student evidence page now checks official lists automatically per criterion. Students no longer need to type a search term before the first check.

## 2. Search chỉ là fallback

Each criterion keeps a light `Tìm thêm theo tên hoạt động` input. It debounces at 400ms and only queries after the student enters a term.

## 3. Upload là fallback

Upload remains available when no official list match is found. The upload form uses:

- Tên minh chứng
- File
- Ghi chú cho cán bộ, optional

Upload status stays compact: recorded, reading file, summary created, waiting for officer review.

## 4. Approved evidence reference chỉ để tham khảo

The reference block uses `GET /api/knowledge-base/search` and displays only non-personal reference information. It does not import cases into a student profile.

The optional action `Dùng tên này cho minh chứng mới` only prefills the upload evidence name.

## 5. Không confidence/no AI judging

Student-facing evidence components do not render confidence, percentage, AI judging copy, or validity probability copy.

## 6. Audit compact

Audit remains behind the `Lịch sử` button. Metadata is hidden behind `Xem chi tiết`, and raw/json/token/signed-url/VNPT/OCR keys are filtered.

## 7. Privacy rules

Reference cards do not show other students' names, MSSV, original files, raw OCR, personal decisions, or confidence values.

## 8. Manual QA result

- Official matching loads automatically per criterion.
- Search input is secondary and only runs after text input.
- Official match import creates event-import evidence and skips upload polling.
- Upload fallback remains visible.
- Evidence detail uses lean status, official-list wording, file, and history.
- Reference block is read-only and does not import approved cases.

## 9. Backend blockers

- No frontend service currently targets `/api/evidence-matching/search`; the implementation uses the existing `GET /api/events/search`.
- The frontend still passes `studentCode` when available for compatibility, but the hook no longer requires it before running.
