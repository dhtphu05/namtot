# 5TOT Đà Nẵng — UI Content Guide

> Product language contract for the six target workspaces. Vietnamese copy is clear, concise, operational, friendly, and official without sounding bureaucratic. Backend enum names stay in code and API payloads; the UI maps them to user language and does not create backend states.

## Voice and sentence rules

- Lead with what happened, what it means, and the next available action.
- Use short active sentences and familiar verbs: xem, kiểm tra, bổ sung, gửi, phân công, lưu trữ, mở lại.
- Name the object (“hồ sơ”, “minh chứng”, “quyết định công nhận”, “phiếu xét”) instead of saying only “dữ liệu”.
- State scope where it changes the user's action: criterion, deadline, City/school workspace, or requested evidence.
- Avoid internal terms such as DTO, job, indexing, CAS, tenant, API, OCR when a plain explanation works.
- Keep important dates, consequences, and affected objects explicit in confirmation copy.
- Do not claim success until the server confirms the mutation.

## Canonical criterion names

Show exactly these five criteria as the student progress spine and City review tasks: `ethics` (Đạo đức), `academic` (Học tập), `physical` (Thể lực), `volunteer` (Tình nguyện), and `integration` (Hội nhập). `priority` may appear as supporting evidence or risk context where the backend returns it; it must never appear as a sixth criterion/task. Preserve technical values in code while presenting the Vietnamese labels in the UI.

## Terminology map

| Existing / technical label | Target UI term | Usage notes |
|---|---|---|
| Precheck | Kiểm tra hồ sơ / Kiểm tra trước khi nộp | Advisory results only; do not imply eligibility or approval. |
| Eligibility | Điều kiện nộp hồ sơ | Server-authoritative; distinguish eligible, not eligible, and needs manual verification. |
| Award Registry | Quyết định công nhận | This is the uploader domain. “Nhập danh sách” is an action within a decision. |
| Supplement / Supplement required | Bổ sung hồ sơ / Cần bổ sung | Include requested criterion/evidence. “Yêu cầu bổ sung” is appropriate in staff decision context. |
| Resolution Hub | Cần Hội đồng xem xét / Hồ sơ cần Hội đồng | Avoid “Resolution Hub”; use the same term on queue, detail, notification. |
| Assignment | Phân công cán bộ | “Cán bộ” here is City Officer; name current assignee. |
| Audit Log | Lịch sử hoạt động | Append-only operational history; not a user-facing technical log. |
| Indexing / OCR processing | Đang đọc tài liệu / Đang phân tích tài liệu | Be specific about extracted fields if shown. Do not imply verified data. |
| Rule Engine | Kiểm tra theo tiêu chuẩn | A rule result is advisory; show the criterion and evidence involved. |
| Archive / Archived | Lưu trữ / Đã lưu trữ | Not deletion. Explain that a decision remains available in history. |
| Cancelled | Đã hủy hồ sơ | Lifecycle overlay, not an `ApplicationStatus`; state whether the application can be reopened. |
| Final decision | Kết quả cuối / Quyết định cuối cùng | Explicit human action; never infer from 5/5 accepted. |
| Target level / Cascade | No target navigation term | Retire from target IA; legacy data may still contain old levels. |
| Event Hub | Sự kiện được công nhận / Danh mục sự kiện | Current user-facing label should say what the list contains. |
| AI Center | Do not use as a product destination | Use the specific task: Kiểm tra hồ sơ, Đọc tài liệu, or Hướng dẫn hồ sơ. |
| Knowledge Base | Kho tham khảo / Kinh nghiệm xử lý | Ensure the page role/API scope is valid before surfacing. |
| Officer | Cán bộ xét | For target City Officer role; preserve technical role `city_officer`. |
| City Committee | Hội đồng | Use for role/workspace content; distinguish a pending case from final outcome. |

## AI and automation wording

Allowed examples:

- “Hệ thống nhận diện tên sự kiện là …”
- “AI gợi ý minh chứng này có thể thuộc tiêu chí Học tập.”
- “Cần bạn xác nhận thông tin trên thẻ minh chứng.”
- “Có khả năng phù hợp với tiêu chí này; cán bộ sẽ xem xét khi bạn nộp hồ sơ.”
- “Kết quả hỗ trợ kiểm tra, không thay thế kết quả xét duyệt.”

Do not use:

- “AI đã duyệt.”
- “Bạn chắc chắn đạt.”
- “Hệ thống tự động công nhận.”
- “Đủ điều kiện” based on a local frontend calculation.
- “Đã xác minh” for OCR-extracted text until a user/system verification state says so.

## Status content mapping

These are display recommendations for actual API values. Derived queue groupings are views over task state, not added server statuses.

| Backend state | UI label | Supporting copy / behavior |
|---|---|---|
| Application `not_started` | Chưa bắt đầu | “Bắt đầu tạo hồ sơ khi bạn sẵn sàng.” |
| `draft` | Bản nháp | “Hồ sơ chưa được gửi.” |
| `prechecked` | Đã kiểm tra | Explain advisory checks only; show remaining items. |
| `ready_to_submit` | Có thể gửi | Only show when server supplies this state and submission gates allow it. |
| `submitted` | Đã gửi | Show received/submission time if returned. |
| `supplement_required` | Cần bổ sung | Link to exact requested criterion/evidence and deadline. |
| `under_review` | Đang được xét | Do not imply completion. |
| `resolution_needed` | Cần Hội đồng xem xét | Explain that the case is routed for review. |
| `completed` | Đã có kết quả | Link to final result/history. |
| `rejected` | Không được công nhận | Show official reason if API provides it and available next action. |
| `cancelledAt != null` | Đã hủy hồ sơ | Overlay label; do not claim the underlying status enum changed. |
| `archivedAt != null` | Đã lưu trữ | Overlay label; history remains available. |
| Task `waiting` | Chờ nhận xét | Officer queue wording. |
| `reviewing` | Đang xét | Show current assignee where permitted. |
| Task `supplement_required` | Chờ sinh viên bổ sung | For staff queue; student copy is “Cần bổ sung”. |
| Task `accepted` | Đã đạt tiêu chí | Criterion-level result only; not final result. |
| Task `rejected` | Chưa đạt tiêu chí | Criterion-level result; show official reason. |
| Task `resolution_needed` | Cần Hội đồng xem xét | Link to case. |
| Eligibility `ELIGIBLE` | Đủ điều kiện nộp | Server response only; still require user to submit. |
| `NOT_ELIGIBLE` | Chưa đủ điều kiện nộp | Show server reason and support link if available. |
| `NEEDS_VERIFICATION` | Cần xác minh thêm | Explain manual verification; do not block evidence preparation. |
| Eligibility route `DIRECT_CITY` | Xét trực tiếp cấp Thành phố | Technical route should usually remain hidden; use only if it explains a specific requirement. |
| `UDN_PREREQUISITE` | Cần đối chiếu quyết định cấp Đại học Đà Nẵng | Explain the actual Award prerequisite; no fuzzy identity claims. |
| Award decision `DRAFT` | Bản nháp | Can be edited/processed according to available actions. |
| `CONFIRMED` | Đã xác nhận | Roster confirmation completed. |
| `ARCHIVED` | Đã lưu trữ | Unarchive only where backend allows. |
| Recipient `MATCHED` | Đã khớp tài khoản | State the matching basis if useful and available. |
| `UNMATCHED` | Chưa khớp tài khoản | May still be a valid roster row; do not say invalid. |
| `CONFLICT` | Cần kiểm tra trùng khớp | Requires resolution before confirmation where backend preview rules require it. |
| Preview `VALID` | Hợp lệ | Confirmable if all other server conditions pass. |
| `INVALID` | Thiếu hoặc sai thông tin | Link to the specific field/row error. |
| `DUPLICATE` | Bị trùng | Identify duplicate row if API supplies it. |
| `CONFLICT` | Có thông tin chưa khớp | Explain the server-reported conflict. |
| Roster processing `not_started` | Chưa bắt đầu đọc danh sách | Offer process action if available. |
| `processing` | Đang đọc danh sách | Keep status visible; explain it may take a moment. |
| `failed` | Chưa đọc được danh sách | Show safe reason and retry if endpoint permits. |
| `preview_ready` | Đã có danh sách để kiểm tra | Require human review before confirmation. |
| Season `NOT_CONFIGURED` | Chưa cấu hình mùa xét | Staff action only if authorized. |
| `NOT_OPEN` | Chưa đến thời gian nhận hồ sơ | Show opening time if available. |
| `OPEN` | Đang nhận hồ sơ | Display server dates. |
| `EXCEPTION_ACTIVE` | Được gia hạn theo ngoại lệ | Explain the specific exception window. |
| `CLOSED` | Đã hết hạn nhận hồ sơ | Show deadline and allowed follow-up; do not suggest a bypass. |
| Per-request `SupplementRequest.deadline` / `ReviewTask.dueDate` | Hạn đề nghị | Reminder for the requested response/review; backend does not enforce it as a submit lock. |
| Configured City supplement-season close | Hạn cuối gửi bổ sung | Enforced only when a submitted application is actually resubmitted; a missing cutoff does not block. |
| Review/final deadline `ON_TRACK` | Trong thời hạn theo dõi | Informational indicator only with current backend behavior. |
| `OVERDUE` | Đã quá mốc theo dõi | Do not block actions; backend currently does not enforce review/final deadlines. |
| Resolution `open` | Mới chuyển Hội đồng | — |
| `in_review` | Đang được Hội đồng xem xét | — |
| `resolved` | Đã có hướng xử lý | Name decision if available. |
| `rejected` | Không chấp thuận | Give outcome context; avoid confusing it with application `rejected`. |
| Final `pending` | Chưa có kết quả cuối | — |
| `passed` | Được công nhận | Show final level only if backend supplies it; do not invent levels. |
| `failed` | Không được công nhận | Show official rationale. |
| `partially_passed` | Được công nhận một phần | Legacy state remains; do not use as a multi-level progression cue. |

## Deadline wording

- Initial submission uses the configured City opening/closing window and the server enforces it. Use “Chưa đến hạn nhận hồ sơ” or “Đã hết hạn gửi hồ sơ” only from the server state/error.
- A configured City supplement-season cutoff is enforced when an already-submitted application is actually resubmitted. Say “Hạn cuối gửi bổ sung” for this cutoff.
- A reviewer's per-request date is a reminder, not a lock. Label it “Hạn đề nghị bổ sung” and explain “Mốc nhắc cho yêu cầu này; ngày này không tự khóa thao tác gửi lại.”
- Review and finalization milestones are monitoring dates. Use “Hạn dự kiến xử lý” / “Hạn dự kiến chốt” or “Đã quá mốc theo dõi”; do not say the system will block review or finalization.

## Required content patterns

| Pattern | Structure | Example |
|---|---|---|
| Page title | Object/action + current scope | “Hồ sơ cần Hội đồng xem xét” |
| Page description | What is here + what user can do | “Theo dõi các hồ sơ đã được chuyển Hội đồng và mở từng hồ sơ để xem nội dung.” |
| Primary CTA | Verb + object; one emphasized action | “Tiếp tục hồ sơ”, “Nhận xét hồ sơ”, “Xác nhận danh sách” |
| Success | Confirm outcome + next step | “Đã gửi hồ sơ. Bạn có thể theo dõi tiến độ tại Hồ sơ của tôi.” |
| Warning | State risk + consequence + safe next step | “Một số minh chứng chưa được xác nhận. Kiểm tra lại trước khi gửi.” |
| Blocking error | Explain what prevents action + resolution | “Chưa thể gửi hồ sơ vì cần xác minh điều kiện. Bạn vẫn có thể tiếp tục chuẩn bị minh chứng.” |
| Confirmation dialog | Action, affected item, consequence, confirm/cancel | “Xác nhận kết quả cuối cho hồ sơ Nguyễn An? Sau khi xác nhận, kết quả này sẽ được ghi vào lịch sử quyết định.” |
| Destructive action | Explicitly name irreversible/retained effect | “Hủy hồ sơ” with status/history/reopen consequence; never a generic “Tiếp tục?” |
| Empty state | Why empty + next allowed action | “Chưa có quyết định công nhận. Tạo quyết định mới để nhập danh sách.” |
| Loading | What is loading | “Đang tải danh sách hồ sơ…” |
| Processing | Name backend operation and remain honest | “Đang đọc danh sách. Bạn có thể ở lại trang này hoặc quay lại sau.” |
| Retry | Safe action + whether prior work is retained | “Thử đọc lại danh sách” only where retry is supported. |
| Permission denied | State access unavailable without leaking scope | “Bạn không có quyền xem nội dung này. Quay lại danh sách được phân công cho bạn.” |
| Deadline closed | State closed date, blocked action, any permitted alternative | “Đã hết thời hạn gửi hồ sơ. Bạn vẫn có thể xem hồ sơ và phản hồi yêu cầu bổ sung nếu thời hạn bổ sung còn hiệu lực.” |
| Archived | Explain hidden from active work, retained in history | “Quyết định đã lưu trữ và vẫn còn trong lịch sử.” |
| Cancelled | Explain application lifecycle and whether reopen exists | “Hồ sơ đã hủy. Thông tin hồ sơ vẫn được lưu lại.” |
| Supplement required | Exact request + criterion/evidence/deadline | “Cần bổ sung minh chứng cho tiêu chí Thể lực trước ngày …” |
| Resolution required | Explain referral and next owner | “Hồ sơ đã được chuyển Hội đồng xem xét.” |
| Final decision | Identify the human decision and outcome | “Hội đồng đã ghi nhận kết quả cuối: Được công nhận.” |
| Notification | Event + object + action link | “Cán bộ yêu cầu bổ sung minh chứng cho tiêu chí Học tập. Xem yêu cầu.” |

## Error-code copy map

The API sends structured code/message/details; exact code lists vary by module. This table uses verified domain codes where available and generic categories where the code is not stable across endpoints. Feature clients should map exact `ApiError.code` values; do not show raw backend text.

| Backend code / category | Title | Description | Recommended action |
|---|---|---|---|
| `SUPPLEMENT_SCOPE_VIOLATION` | Nội dung thay đổi ngoài yêu cầu | “Chỉ có thể cập nhật minh chứng và tiêu chí nằm trong yêu cầu bổ sung.” | Quay lại danh sách nội dung được yêu cầu. |
| `SUPPLEMENT_NOT_READY_TO_RESUBMIT` | Chưa thể gửi lại hồ sơ | “Hãy hoàn tất các nội dung cần bổ sung trước khi gửi lại.” | Mở yêu cầu bổ sung và hoàn thành từng mục. |
| `CITY_SUPPLEMENT_WINDOW_CLOSED` | Đã hết hạn bổ sung | “Thời hạn gửi lại hồ sơ đã kết thúc.” | Xem thông tin hồ sơ hoặc liên hệ đơn vị hỗ trợ. |
| `CITY_REVIEW_SEASON_IN_USE` | Chưa thể xóa mùa xét | “Mùa xét này đã có hồ sơ gắn với năm học.” | Giữ mùa xét và cập nhật cấu hình nếu còn được phép. |
| Season version/concurrency conflict | Thông tin mùa xét đã thay đổi | “Một người khác vừa cập nhật mùa xét này.” | Tải lại trước khi lưu thay đổi. |
| Eligibility `NEEDS_VERIFICATION` (state, not error) | Cần xác minh thêm | “Hệ thống chưa thể tự đối chiếu chính xác thông tin với quyết định công nhận.” | Tiếp tục chuẩn bị hồ sơ; cán bộ có quyền sẽ xác minh. |
| Eligibility `NOT_ELIGIBLE` (state, not error) | Chưa đủ điều kiện nộp | Show the backend reason in plain language. | Review the cited requirement; do not ask frontend to override. |
| Authorization / `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này | “Thao tác này chỉ dành cho vai trò được phân công.” | Trở về workspace phù hợp or contact administrator. |
| Not found | Không tìm thấy hồ sơ | “Hồ sơ có thể đã được chuyển hoặc bạn không có quyền xem.” | Return to permitted list; do not leak cross-workspace existence. |
| Conflict / claim conflict | Hồ sơ vừa được cập nhật | “Có người khác đang xử lý hoặc trạng thái đã thay đổi.” | Refresh the list and open the latest status. |
| Validation error | Kiểm tra lại thông tin | “Một số thông tin chưa đúng hoặc còn thiếu.” | Move focus to invalid field; show field-level message. |
| Network/server error | Chưa thể hoàn tất yêu cầu | “Kết nối bị gián đoạn hoặc hệ thống đang bận. Thông tin đã lưu chỉ được xác nhận khi có thông báo thành công.” | Retry safe read/action; do not duplicate non-idempotent mutations automatically. |
| OCR/job failure | Chưa đọc được tài liệu | “Tài liệu chưa được phân tích. Bản gốc của bạn vẫn được giữ lại.” | Retry only if supported; allow user to review/edit extracted details. |
| Unknown backend/provider error | Có lỗi xảy ra | “Hệ thống chưa thể hoàn tất thao tác.” | Retry later or contact support with request ID. Never show stack/SQL/provider response. |

## Copy rules for consequential actions

- **Submit:** say the application will enter City review and cannot be edited freely afterward; accurately describe active supplement path if returned by backend.
- **Request supplement:** show exact criterion/evidence, required content, and deadline; do not request fields the backend does not enforce.
- **Resolve/escalate:** distinguish “chuyển Hội đồng xem xét” from “ra kết quả cuối”.
- **Finalize:** say the final outcome is recorded and prior result history is retained; 5/5 accepted does not auto-trigger it.
- **Cancel/archive:** state that history/data remain; cancellation/archive are lifecycle overlays, not deletion.
- **Reopen:** state that an earlier decision remains in history and identify which active state will resume if the server provides it.
- **Workspace/user deactivation:** state impact on access/registration; do not imply existing records are deleted.
- **Award confirm/archive:** explain whether the roster will become confirmed or leave active lists; always preserve visible history where API allows.
