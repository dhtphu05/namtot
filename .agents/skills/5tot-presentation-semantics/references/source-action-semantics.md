# Source And Action Semantics

## Source Labels

- `system_data`: `Dữ liệu hệ thống`
- `official_event`: `Danh sách/hoạt động đã xác nhận`
- `manual_evidence`: `Minh chứng sinh viên tải lên`
- `manual_metric`: `Sinh viên khai báo`
- `event_import`: `Danh sách đã xác nhận`
- `manual_upload`: `Tải lên từ sinh viên`
- `metric_input`: `Chỉ số đã nhập`
- `collective_import`: `Dữ liệu tập thể`

Fallback: `Nguồn dữ liệu khác`.

## Action Types

- `choose_path`: choose a valid requirement path.
- `declare_data`: enter declared metric/activity data.
- `find_official_data`: open official event or approved-evidence search.
- `upload_evidence`: upload supporting evidence.
- `fix_missing_field`: correct missing extracted/user field.
- `wait_for_confirmation`: show as passive waiting copy, not a CTA.
- `open_supplement`: open the requested supplement criterion.
- `run_precheck`: run the precheck mutation.
- `submit`: submit or resubmit the application.

Rules:

- Do not duplicate the same CTA in header, body, and bottom bar unless the current layout already does so for workflow continuity.
- Do not expose `requirementKey` in button text, metadata, or route copy.
- Always keep `requirementKey` in API payloads where backend requires it.
- Waiting states such as school confirmation, officer review, or committee review should render as status text.
