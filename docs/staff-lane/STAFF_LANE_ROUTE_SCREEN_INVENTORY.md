# Staff Lane Route / Screen Inventory — S0

Nguồn sự thật là route/component hiện tại trong FE và permission thực tế ở BE. Các route dưới đây được phân loại để chuẩn bị S1; không phải đề xuất redesign.

## 1. Lane matrix

| Lane | Route | Screen/component chính | Nav hiện tại | FE guard/role | API family | Trạng thái audit |
|---|---|---|---|---|---|---|
| Data Uploader | `/app/data-uploader` | `src/routes/app.data-uploader.tsx` | Có | `data_uploader` | workspace names / Award Registry entry | Landing page ngắn, không có upload trực tiếp |
| Data Uploader | `/app/award-registry` | `src/routes/app.award-registry.tsx`, `src/features/award-registry/*` | Có | `data_uploader`, `admin` | `/api/award-decisions/*` | Candidate contract tốt, cần giữ tách khỏi Decision Import |
| City Officer | `/app/queue` | `src/routes/app.queue.tsx`, `src/features/review/*` | Có | `reviewRoles` gồm City Officer | `/api/review/tasks*` | Reuse chính cho queue; screen hiện cũng render manager/admin paths |
| City Officer | `/app/review/:id` | `src/routes/app.review.$id.tsx` | Link từ queue | `officer`, `city_officer`, legacy manager/committee, city_manager, admin | review detail/decision | FE không cho `city_committee`; BE route có role rộng hơn |
| City Officer | `/app/resolution` và `/:id` | `src/routes/app.resolution.tsx`, `$id.tsx`; `src/features/resolution/*` | Có | all review/resolution roles | `/api/resolution/cases*` | Read/action theo specialization và assigned task ở BE |
| City Officer | `/app/evidence-search` | `src/routes/app.evidence-search.tsx` | Có cho City Officer | officer route group | evidence search | Cần kiểm tra scope nếu mở rộng City knowledge |
| City Manager | `/app/analytics` | `src/routes/app.analytics.tsx`, `src/features/manager/city-analytics/*` | Có | manager/committee/city_manager/admin | `/api/analytics/city` và manager summary | Có dashboard city riêng |
| City Manager | `/app/assignment` | `src/routes/app.assignment.tsx`, review assignment components | Có | manager/committee/city_manager/admin ở FE | `/api/manager/review-tasks/:id/assign` | FE cho Committee vào; BE không cho Committee assign |
| City Manager | `/app/manager/results` | `src/routes/app.manager.results.tsx`, `$applicationId.tsx` | Có | manager/committee/city_manager/city_committee/admin | `/api/manager/results*`, application lifecycle | Có finalization/reopen/archive actions |
| City Manager | `/app/manager/collective` | `src/routes/app.manager.collective.tsx` | Có | manager/committee/city_manager/city_committee/admin | `/api/manager/collective-profiles*` | Legacy/collective domain song song individual |
| City Manager | `/app/resolution` | shared Resolution Hub | Có | resolution roles | `/api/resolution/cases*` | BE cho city manager manage resolution |
| City Manager | `/app/export` | `src/routes/app.export.tsx`, export hooks | Có | manager/committee/city_manager/city_committee/admin | `/api/exports/*` | Backend role set tương ứng |
| City Manager | `/app/audit` | `src/routes/app.audit.tsx`, `src/features/audit/components/*` | Không trong city_manager nav hiện tại | Guard qua `cityManagerRoutes` | FE audit API lệch BE | Cần P1 contract fix |
| City Committee | `/app/resolution` | Resolution Hub | Có | resolution roles | `/api/resolution/cases*` | Lane chính hiện tại |
| City Committee | `/app/manager/results` | shared manager results | Có | result roles | manager result/finalization | Có finalizer ở FE/BE |
| City Committee | `/app/audit` | Audit Logs | Có | city committee route group | `/api/audit*` mismatch | P1 |
| City Committee | `/app/export` | export route | Guard có, nav chưa có | city committee | `/api/exports/*` | Có capability nhưng thiếu nav |
| Admin | `/app/admin/workspaces` | `src/features/admin-workspace/components/*` | Có | admin | `/api/admin/workspaces*` | Reuse tốt |
| Admin | `/app/admin/users` | `src/features/admin-users/components/AdminUsersPage.tsx` | Có | admin | `/api/admin/users*` | Reuse tốt |
| Admin | `/app/admin/officers` | officer specialization page | Có | admin | `/api/admin/users/:id/specializations` | Cần kiểm tra City Officer scope trong S1 |
| Admin | `/app/settings` | legacy/read-only settings surface | Có admin nav | manager/committee/admin route family | contract chưa phải Staff Lane core | Không coi là nguồn criteria mới |
| Admin | `/app/audit` | Audit Logs | Có | admin | `/api/audit*` mismatch | P1 |

## 2. Legacy/parallel surfaces cần giữ nguyên trong S0

| Route | Nguồn | Lý do cần inventory |
|---|---|---|
| `/app/decision-imports` và `/:decisionImportId` | `src/routes/app.decision-imports*.tsx`, `src/features/decision-import/*` | Legacy import domain; khác Award Decision Registry |
| `/app/manager/result` | `src/routes/app.manager.result.tsx` | Compatibility route bên cạnh `/app/manager/results` |
| `/app/admin/workspace` | `src/routes/app.admin.workspace.tsx` | Compatibility route bên cạnh `/app/admin/workspaces` |
| `/app/admin` | `src/routes/admin.tsx` | Parent/admin compatibility surface |
| `/app/committee/inbox` | `src/routes/app.committee.inbox.tsx` | Committee queue UI hiện gọi `/api/committee/inbox`; role contract City chưa khớp |
| `/app/event-registry` | `src/routes/app.event-registry.tsx` | Event Registry shared/legacy capability; role nav khác theo lane |
| `/app/evidence-knowledge` | `src/routes/app.evidence-knowledge.tsx` | Knowledge route hiện chỉ legacy roles ở FE/BE |

## 3. Navigation versus guard findings

### City Officer

- Nav chỉ hiển thị queue và resolution.
- Route guard cho phép `/app/queue`, `/app/review`, `/app/resolution`.
- BE có claim theo specialization và access scope theo City workspace.
- Evidence Knowledge không xuất hiện trong nav và bị loại ở FE/BE contract.

### City Manager

- Nav hiện có analytics, results, assignment, resolution, export.
- Guard còn cho audit/collective.
- Không có queue trong nav nhưng `reviewRoles` khiến `/app/queue` có thể vào được ở FE; BE City Manager với City individual có thể chỉ view/coordination.
- Tài liệu context mô tả thêm Event Registry/Knowledge Base, nhưng current nav/guard/BE chưa đồng nhất.

### City Committee

- Nav hiện có Resolution, Results, Audit.
- Guard còn cho collective/export.
- Export capability có ở guard/BE nhưng không có nav item.
- Committee Inbox component tồn tại nhưng canonical endpoint và City role chưa được freeze.

### Legacy Committee

- Nav đang dùng full legacy committee nav, gồm assignment, import và settings.
- BE assignment chỉ `manager`, `city_manager`, `admin`; decision import chỉ `officer`, `manager`, `admin`.
- Đây là mismatch UX/permission cần xử lý trong phase contract, không phải việc sửa trong S0.

## 4. Reusable screen primitives

- Layout: `AppShell`, `Sidebar`, `TopBar`, `PageHeader`, `UserWorkspaceInfo`.
- Feedback: `LoadingState`, `ErrorState`, `EmptyState`, `ConfirmDialog`.
- Status: `StatusBadge`, `CriterionBadge`, `ProgressBadges`, `UxStatusCard`.
- Audit: `AuditDrawer`, `AuditTimeline`.
- Review: `ReviewQueue`, `ReviewTaskTable`, `ReviewDetails`, `ReviewDecisionPanel`, `RequestSupplementPanel`, `TaskAssignment`.
- Resolution: `ResolutionHub`, `ResolutionDetails`, `ExportData`.
- Manager: `CityAnalyticsDashboard`, lifecycle action components, `FinalizationDialog`, eligibility/deadline panels.
- Admin: workspace table/toolbar/detail/create dialog, user page.

## 5. Screen-level implementation note

S1 nên ưu tiên route/permission/contract alignment quanh những màn đã có. Không tạo route song song mới chỉ để đổi tên Staff Lane; trước hết phải chốt canonical route cho Audit, Committee Inbox, Knowledge và legacy Decision Import.

## 6. S1 route/permission resolution — 2026-09-30

- `/app/audit` now renders the existing collection `AuditTimeline` and calls `/api/audit/logs`.
- `/app/committee/inbox` remains the existing shared screen. City Manager/City Committee are allowed by the FE guard and call `/api/manager/committee-inbox`; legacy Committee does not receive new assignment/import/settings capability.
- `/app/evidence-knowledge` remains legacy-only. City roles are intentionally absent from its nav, guard and precedent access.
- City Committee review detail remains context/read oriented for resolution-needed tasks. Normal ReviewTask mutations are not a City Committee capability; Resolution and finalization remain the lane's canonical actions.
- Individual City review presentation is five-core only; auxiliary `priority`/`collective` are not shown as individual City criterion rows.

## 7. S2 Award Registry UX addendum — 2026-09-30

S2 hoàn thiện production UX cho hai màn Data Uploader/Award Registry mà không đổi route, role hoặc API contract.

| Surface | Route | Vai trò | Mục đích hiện tại | Trạng thái S2 |
|---|---|---|---|---|
| Data Uploader overview | `/app/data-uploader` | `data_uploader` | Giải thích mục đích đưa dữ liệu công nhận vào hệ thống và dẫn tới một CTA chính `Tạo quyết định công nhận` | DONE; dùng dữ liệu list hiện có, không dựng dashboard/metric giả |
| Award Registry list | `/app/award-registry` | `data_uploader`, `admin` | Danh sách quyết định theo issuer, năm học, trạng thái và archive filter server-side | DONE; phân biệt empty registry với empty do filter/search |
| Award decision workspace | `/app/award-registry/:awardDecisionId` | `data_uploader`, `admin` | Hoàn thiện thông tin quyết định, upload hai tệp, đọc/kiểm tra roster, xác nhận hoặc lưu trữ | DONE; progress và next action lấy từ state thật |
| Roster review | Trong workspace quyết định | `data_uploader`, `admin` khi `DRAFT` | Summary, filter nhóm cần xử lý, mapping, source/current values, correction/revert và server revalidation | DONE; table có overflow ngang có chủ đích, không tạo client matching |
| Confirmed recipients | Trong workspace quyết định | `data_uploader`, `admin` | Hiển thị recipients do server trả sau xác nhận; confirmed/archived read-only | DONE |

Award Registry vẫn là domain riêng với legacy Decision Import (`/app/decision-imports`) và Event Registry (`/app/event-registry`). Canonical API family giữ nguyên `/api/award-decisions/*`; quyền router-wide là `data_uploader` và `admin`, không mở rộng City role.

UX presentation map giữ tách bạch: lifecycle `DRAFT`/`CONFIRMED`/`ARCHIVED`; matching `MATCHED`/`UNMATCHED`/`CONFLICT`; nhóm hiển thị `valid`/`warning`/`invalid`/`duplicate`/`missing_student_code`/`needs_manual_review` không phải state mới.

QA desktop được kiểm tra bằng Playwright ở các workflow upload CSV/XLSX/PDF, processing/retry, mapping, invalid/conflict, correction/revert, confirm, recipients, archive/unarchive và role denial. Bảng roster dùng scroll container nội bộ để không làm vỡ shell ở viewport hẹp.
