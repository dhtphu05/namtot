# Staff Lane Audit — S0

Ngày audit: 2026-09-29
Phạm vi: Staff Lane của 5TOT, FE + BE hiện tại
Nguyên tắc: audit read-only; không redesign, không refactor business, không thêm API/enum/DTO/permission/state.

## 1. Baseline và trạng thái branch

| Repo | Branch hiện tại | HEAD | So với `origin/main` | Working tree tại thời điểm bắt đầu |
|---|---|---|---|---|
| FE `D:/02_PROJECTS/5TOT/namtot` | `feat/staff-lane` | `8da53a7` — `feat: consolidate 5tot UI foundation and shell` | cùng commit | clean |
| BE `D:/02_PROJECTS/5TOT/sv5tot-hackaithon-backend` | `feat/staff-lane` | `da9ca37` — `fix: scope decision import audit and restrict legacy status route` | cùng commit | clean |

Không checkout branch khác, không tạo worktree, không reset/stash/discard, không merge/rebase/push trong S0. Các thay đổi mới của S0 chỉ là tài liệu trong `namtot/docs/staff-lane/`.

## 2. Kết luận điều hành

Staff Lane đã có một lõi workflow đủ tốt để triển khai tiếp theo hướng incremental:

- FE đã có shell, route guard, role navigation, queue/review detail, Resolution Hub, manager results/finalization, audit components, admin workspace/user và Award Decision Registry.
- BE đã có các role City, `WorkspaceType.CITY`, scope cho City review, transactional claim, application lock, audit log, season/deadline, workload, finalization, reopen/cancel/archive và Award Registry.
- Năm tiêu chí lõi đã được thể hiện rõ trong FE criteria matrix và seed helper; `priority`/`collective` vẫn tồn tại như enum/domain phụ trợ.

S0 chưa đạt trạng thái “contract frozen”. Không có P0 blocker làm mất toàn bộ Staff Lane, nhưng có các P1 cần chốt trước S1:

1. Audit FE gọi `/api/audit` và `/api/audit/entity/...`, trong khi BE hiện expose `/api/audit/logs`.
2. Evidence Knowledge FE/BE chỉ cấp legacy roles; tài liệu FE mô tả City Manager/City Committee có quyền tra cứu nhưng route guard, nav và BE chưa đồng nhất.
3. Committee Inbox FE gọi `/api/committee/inbox`; BE route hiện chỉ cho `manager`, `committee`, `admin`, trong khi manager module có endpoint tương đương cho City roles.
4. Legacy Committee đang thấy các mục `Phân công cán bộ`, `Import quyết định`, `Cấu hình tiêu chí`, nhưng BE không cho Committee assign/import và chưa có contract rõ cho settings.
5. Một số response/summary dùng toàn bộ `Object.values(Criterion)`, nên có nguy cơ lộ `priority` và `collective` cùng năm tiêu chí lõi ở contract Staff Lane.

## 3. P0/P1/P2 findings

### P0 — Không ghi nhận

Chưa thấy lỗi audit nào đủ bằng chứng để kết luận Staff Lane bị chặn hoàn toàn. Không suy diễn thêm P0 khi chưa có test/runtime reproduction.

### P1 — Cần xử lý hoặc quyết định trước S1

| ID | Finding | Bằng chứng hiện tại | Ảnh hưởng | Quyết định cần chốt |
|---|---|---|---|---|
| SL-P1-01 | Audit endpoint lệch FE↔BE | FE `src/features/audit/api/audit.ts` gọi `/api/audit` và `/api/audit/entity/:type/:id`; BE `src/modules/audit/audit.routes.ts` chỉ có `GET /logs` | Audit screen có thể fail hoặc hiển thị fallback rỗng; entity timeline chưa có BE contract | Chọn sửa FE theo `/logs`, hoặc mở rộng BE sau khi phê duyệt contract; không làm trong S0 |
| SL-P1-02 | Knowledge Base chưa mở cho City roles | FE `src/lib/role-navigation.ts` không có knowledge cho City roles; `src/features/auth/route-guard.ts` chỉ cho legacy roles; BE `src/modules/evidence-knowledge/evidence-knowledge.routes.ts` chỉ `officer/manager/committee/admin` | City Officer/Manager/Committee không có đường dùng precedent/knowledge dù tài liệu mô tả một phần quyền này | Chốt “legacy-only” hay “City read-only”; nếu mở phải chốt scope workspace và API role |
| SL-P1-03 | Committee Inbox City contract không đồng nhất | FE `src/features/manager/api/manager.ts` gọi `/api/committee/inbox`; BE `src/modules/committee/committee.routes.ts` không cho City roles; BE `src/modules/manager/manager.routes.ts` có `/committee-inbox` cho City roles | City Committee không dùng được màn inbox nếu route được mở vào nav | Chọn dùng `/api/manager/committee-inbox` hoặc mở quyền/route chính thức |
| SL-P1-04 | Legacy Committee nav rộng hơn permission BE | FE `src/lib/role-navigation.ts` cho Committee assignment/import/settings; BE `manager.routes.ts` assign chỉ `manager/city_manager/admin`, decision-import router chỉ `officer/manager/admin` | UX dẫn người dùng vào các màn chắc chắn bị 403 hoặc có contract không tồn tại | Nav phải phản chiếu backend capability sau khi product chốt legacy compatibility |
| SL-P1-05 | Criterion contract có nguy cơ lẫn tiêu chí phụ | Prisma `Criterion` gồm `ethics`, `academic`, `physical`, `volunteer`, `integration`, `priority`, `collective`; FE core matrix dùng 5; BE `manager.service.ts` dùng `Object.values(Criterion)` ở summary/grouping | Summary/analytics có thể trả thêm key không phải Staff Lane core; FE type vẫn công khai 7 key | Chốt response Staff Lane chỉ 5 core hay giữ auxiliary key với nhãn/domain riêng |
| SL-P1-06 | Quyền service và route cho City Committee chưa cùng ngữ nghĩa | BE review route nhận `city_committee` cho decision/supplement/escalate, nhưng `ReviewService.getTaskPermissions` chỉ cho Committee xem task `resolution_needed`, không cho act | Contract bề ngoài cho phép request nhưng service từ chối; UI khó dự đoán action | Chốt City Committee chỉ resolution/finalization hay được xử lý review task |

### P2 — Nợ kỹ thuật/legacy cần quản lý

- FE còn route tương thích như `app.decision-imports*`, `app.manager.result.tsx`, `app.admin.workspace.tsx`, `app.admin.tsx`; chưa được xóa trong S0.
- FE role guard cho phép `manager`/`city_manager` vào `/app/queue` theo `reviewRoles`, dù navigation City Manager không hiển thị queue và service với City individual có thể chỉ cho xem.
- FE normalizers tại review/resolution/manager có fallback raw values; điều này giúp UI chịu được response cũ nhưng có thể che mismatch contract.
- BE `SupplementRequest.status` đang là `String @default("active")`, không phải enum; các giá trị lifecycle cần được coi là contract cần kiểm kê trước khi freeze.
- BE `src/shared/constants/roles.ts` chỉ liệt kê legacy roles dù Prisma `Role` đã có City roles; cần xác nhận module nào còn dùng constant này trước khi mở rộng.
- Mock/demo data FE còn `priority` và các fixture legacy; không dùng làm nguồn sự thật cho Staff Lane.

## 4. Role và lane hiện tại

### City lanes mục tiêu

| Lane | FE hiện có | BE hiện có | Readiness |
|---|---|---|---|
| City Officer | `/app/queue`, `/app/review/:id`, `/app/resolution`; specialization-aware claim/decision | review list/detail/claim/decision/supplement/escalation; resolution scope theo specialization | Foundation sẵn; cần chốt UX read-only/claim và knowledge |
| City Manager | analytics, results, assignment, resolution, export, audit; season/deadline APIs | city season, deadline exception, assignment, results, workload, finalization, scope City | Gần S1/S3; audit và criteria contract còn lệch |
| City Committee | resolution, results, audit, export guard; finalization path | resolution, results, export, finalization; committee inbox route lệch role | Có lõi; cần chốt inbox và finalization authority |
| Admin | workspaces, users, officers, read-only settings, audit | admin workspace/user/specialization/status/reset-password | Có thể dùng lại; cần contract audit |

### Legacy compatibility

`student`, `class_representative`, `officer`, `manager`, `committee`, `data_uploader` vẫn là role/schema/domain đang tồn tại. S0 không xóa hoặc đổi nghĩa legacy. Mọi cleanup phải là phase riêng, có approval và test matrix.

## 5. Các phần có thể reuse

| Capability | FE source | BE source | Nhận xét |
|---|---|---|---|
| App shell/navigation | `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `src/lib/role-navigation.ts` | auth middleware + user workspace | Dùng làm shell Staff Lane; chỉ chỉnh nav sau contract freeze |
| Queue/review | `src/routes/app.queue.tsx`, `src/routes/app.review.$id.tsx`, `src/features/review/*` | `src/modules/review/*`, `review-workspace-scope.ts` | Lõi đã có claim, decision, supplement, escalation, timeline |
| Resolution | `src/features/resolution/*`, `src/routes/app.resolution*.tsx` | `src/modules/resolution/*` | Có resolve/reopen/status compatibility; cần dùng `/resolve` làm contract chính |
| Manager/results | `src/features/manager/*`, `app.manager.results*.tsx` | `src/modules/manager/*`, collective module | Có lifecycle, finalization, reopen, archive, deadline |
| Audit UI | `src/components/audit/*`, `src/features/audit/*` | `src/modules/audit/*`, application audit helpers | UI reuse được sau khi chốt endpoint |
| Admin | `src/features/admin-users/*`, `src/features/admin-workspace/*` | `src/modules/users/*`, `src/modules/workspaces/*` | Contract tương đối rõ và có test |
| Award Registry | `src/features/award-registry/*` | `src/modules/award-decisions/*` | FE↔BE route/role nhìn chung khớp; không trộn với legacy Decision Import |
| Feedback primitives | `src/components/feedback/*`, `src/components/status/*`, `src/components/ui-kit.tsx`, shadcn `src/components/ui/*` | N/A | Dùng lại cho empty/loading/error/status; không tạo primitive mới trong S0 |

## 6. Backend gaps cần ghi nhận, không tự sửa trong S0

- Audit entity endpoint hoặc FE adapter chính thức chưa có.
- Knowledge Base chưa có role/scope contract cho City.
- Committee Inbox canonical path cho City chưa được chọn.
- City Committee review action semantics chưa rõ dù route-level role list rộng.
- Core five criteria và auxiliary `priority`/`collective` chưa được tách thành contract public nhất quán ở mọi summary.
- `SupplementRequest.status` chưa có enum/constant chung.
- Một số legacy route/module vẫn chạy song song với Award Decision Registry.

## 7. Readiness gate

### Đủ điều kiện chuẩn bị S1

- Branch baseline đúng `feat/staff-lane` ở cả hai repo.
- Có thể reuse được các workflow chính.
- Không có P0 blocker đã được xác nhận.

### Chưa nên bắt đầu S1 implementation cho đến khi

1. Product/BE/FE chốt sáu P1 ở trên, đặc biệt audit, knowledge, Committee Inbox, Committee nav và criteria response.
2. Có một matrix role×route×endpoint được duyệt làm nguồn chính thức.
3. Có quyết định giữ hay tách legacy Decision Import khỏi Award Registry.

S0 dừng tại đây để chờ approval trước khi sửa runtime code.

## 8. S1 contract alignment addendum — 2026-09-30

S1 đã áp dụng sáu quyết định contract được phê duyệt trên hai branch `feat/staff-lane`. Không checkout branch khác, không merge/rebase/force-push và không xóa compatibility route.

| P1 | Trạng thái S1 | Bằng chứng code/test |
|---|---|---|
| SL-P1-01 Audit | Resolved | FE `getAuditLogs` dùng `GET /api/audit/logs`; Staff Audit dùng `AuditTimeline`; không còn gọi `/api/audit` hoặc `/api/audit/entity/...`; Decision Import giữ endpoint riêng `/api/decision-imports/:id/audit` không fallback generic. |
| SL-P1-02 Knowledge | Resolved as legacy-only | Không thêm City role vào Knowledge/precedent; City Officer không gọi `/precedents/check`; FE/BE legacy roles giữ nguyên. |
| SL-P1-03 Committee Inbox | Resolved | City Manager/City Committee dùng `GET /api/manager/committee-inbox`; legacy Manager/Committee/Admin giữ `GET /api/committee/inbox`; route `/app/committee/inbox` dùng chung màn hiện có. |
| SL-P1-04 Legacy Committee nav | Resolved | Nav Committee bỏ assignment, Decision Import và settings; không mở rộng BE permission, không xóa route compatibility. |
| SL-P1-05 Core criteria | Resolved | BE dùng `shared/constants/criteria.ts::coreCriteria` đúng năm giá trị ethics/academic/physical/volunteer/integration; City individual presentation/task creation không trả hoặc tạo priority/collective; legacy auxiliary behavior giữ nguyên. |
| SL-P1-06 City Committee semantics | Resolved | Route mutation ReviewTask không còn nhận City Committee cho decision/supplement/escalate; City Committee vẫn có context read và Resolution/finalization flows; City Manager/Admin authority giữ nguyên. |

### Verification evidence

- FE contract Playwright: `tests/staff-contract-alignment.spec.ts` — 3/3 passed.
- FE City regression: advisory acceptance 1/1; finalization/human-authority 6/6 passed khi chạy tuần tự để tránh cold-start Vite contention.
- BE focused suite: 13 files, 107/107 tests passed, gồm route authority, task permissions, criteria/task creation, analytics, manager City scope, resolution, audit và workspace scope.
- FE production build passed.
- BE TypeScript build, Prisma validate và Prisma generate passed.
- Full FE lint remains baseline-blocked by generated/legacy CRLF formatting files outside this change; changed-file lint was checked with the repository's Prettier rule disabled to separate code lint from that baseline formatting debt.

P0 vẫn không ghi nhận. P2 còn lại: legacy route/state debt và baseline formatting/artifact lint debt; không thuộc phạm vi S1.
