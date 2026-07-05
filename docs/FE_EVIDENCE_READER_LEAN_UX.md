# FE Evidence Reader Lean UX

## 1. Flow mới

Sinh viên vào tiêu chí, hệ thống tự kiểm tra danh sách chính thức theo hồ sơ hiện tại. Nếu có minh chứng chính thức, sinh viên thêm vào hồ sơ. Nếu không có, sinh viên upload file để SmartReader đọc nhanh và cán bộ xác minh.

## 2. Auto official matching

Official matching tự chạy khi criterion section render. FE thử endpoint `/api/evidence-matching/search` trước và fallback sang `/api/events/search` nếu backend chưa có alias.

## 3. Search là fallback

`Tìm thêm theo tên hoạt động` chỉ là thanh phụ, debounce 400ms, dùng cùng matching API với query `q`.

## 4. Upload là fallback

Upload drawer chỉ gồm tên minh chứng, file, và ghi chú cho cán bộ. Sau upload chỉ hiển thị tiến trình compact: nhận file, đọc file, tạo tóm tắt, chờ cán bộ xét duyệt.

## 5. SmartReader chỉ đọc nhanh

Student UI mô tả SmartReader như bước đọc file/tạo tóm tắt. Không hiển thị điểm tin cậy, phần trăm, hoặc ngôn ngữ chấm tự động.

## 6. Evidence Card lean

Card đọc `studentStatus`, `readableSummary`, `matchingStatus`, `missingFields`, và `ocrTextPreview` đã normalize về camelCase. Card chỉ hiển thị trạng thái, thông tin chính, danh sách chính thức, cần bổ sung, file gốc, và lịch sử.

## 7. Approved evidence reference privacy

Reference block dùng Knowledge Base API thật. Card tham khảo không hiển thị tên sinh viên khác, MSSV, file gốc, raw OCR, hoặc confidence. Action `Dùng tên này cho minh chứng mới` chỉ prefill tên upload.

## 8. Audit compact

Audit mở bằng nút `Lịch sử`. Metadata nằm sau `Xem chi tiết` và lọc các key raw/json/token/signed-url/VNPT/OCR.

## 9. Copy rules

Student-facing evidence surfaces dùng: danh sách chính thức, đã tìm thấy trong danh sách, chưa tìm thấy trong danh sách, đã đọc minh chứng, cần bổ sung thông tin, cần cán bộ xác minh, chờ cán bộ xét duyệt.

## 10. Manual QA result

- Official match tự load theo criterion.
- Search không bắt buộc.
- Upload fallback rõ ràng.
- Event-import evidence không chạy upload polling.
- Evidence Card không có confidence/%/AI judging.
- Reference block không import trực tiếp và không lộ dữ liệu cá nhân.
- Audit drawer mở gọn.

## 11. Known limitations

- Backend alias `/api/evidence-matching/*` có fallback sang endpoint cũ.
- Officer/debug pages có thể vẫn có technical copy ngoài scope student evidence reader.
