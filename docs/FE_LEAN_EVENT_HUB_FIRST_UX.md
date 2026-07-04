# FE Lean Event Hub-first UX

## 1. Before/after UX

Before: student evidence started from upload/list management and exposed confidence, long digitization copy, warnings, and read output too prominently.

After: each criterion starts with Event Hub search, then falls back to upload only when no official event is found. Evidence details show status, Event Hub source, readable fields, missing info, and compact history.

## 2. Event Hub-first flow

Student opens `Minh chứng của tôi`, chooses a criterion section, and searches Event Hub first. Matching results show event name, organizer, time, the status `Đã tìm thấy bạn trong danh sách`, and `Thêm vào hồ sơ`.

If no result is found, the UI shows the fallback message and opens upload.

## 3. Status tags thay confidence

Student UI uses shared statuses from `studentEvidenceStatus.ts`:

- Đã xác thực từ Event Hub
- Chưa tìm thấy trong Event Hub
- Đã đọc minh chứng
- Cần bổ sung thông tin
- Cần cán bộ xác minh
- Không đọc rõ file
- Đã ghi nhận, chờ xét duyệt

Backend confidence can still exist in API payloads but is ignored in student components.

## 4. Evidence Card lean structure

The student card now renders:

1. Trạng thái
2. Event Hub
3. Thông tin đã đọc
4. Cần bổ sung
5. Lịch sử

Read content is collapsed behind `Xem nội dung đã đọc`. Raw fields, confidence, technical warnings, and JSON are not shown by default.

## 5. Audit compact behavior

Audit opens from a `Lịch sử` button inside the evidence card. The drawer uses friendly labels and hides metadata behind `Xem chi tiết`, filtering raw/json/token/signed-url/VNPT/OCR keys.

## 6. Copy rules

Student evidence surfaces avoid confidence percent, score percent, AI judging language, and technical polling detail. Preferred copy is status-oriented: Event Hub, đã đọc minh chứng, cần bổ sung, cần cán bộ xác minh.

## 7. Manual QA result

- Event Hub block appears before upload in each criterion section.
- Matching Event Hub card shows `Đã tìm thấy bạn trong danh sách`.
- Upload fallback uses only name, file, and optional note.
- Evidence list is compact and does not show confidence, OCR text, or raw fields.
- Evidence detail opens audit in a drawer.

## 8. Known limitations

- Officer/manager/review pages may still show AI/confidence operational detail; they are outside this student-flow refactor.
- Some legacy components under `src/features/evidence` are still present but are not used by `/app/evidence`.
- No backend API shape was changed.
