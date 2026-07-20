# Tiến độ Dự án Frontend (SV5T)

| Đợt (Phase)  | Tên tính năng                            | Trạng thái      | Ghi chú                                                                                  |
| ------------ | ---------------------------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| **Phase 1**  | API Foundation & Authentication          | 🟢 Hoàn thành   | Đã có API Client (retry, refresh token), Login/Signup, Auth Store.                       |
| **Phase 2**  | Luồng cá nhân & Minh chứng (React Query) | 🟢 Hoàn thành   | Đã tích hợp API thật cho Hồ sơ sinh viên, Minh chứng cá nhân, Upload & Polling Indexing. |
| **Phase 3**  | Luồng tập thể (Collective Workflow)      | 🟢 Hoàn thành   | Chức năng cho cán bộ lớp: Roster import (với validation), Hồ sơ tập thể.                 |
| **Refactor** | Refactor sang chuẩn Feature-Based Slice  | 🟢 Hoàn thành   | Tái cấu trúc thư mục từ Layer-based sang Feature-based toàn bộ.                          |
| **Phase 4**  | Cán bộ xét duyệt (Review Officer)        | 🟢 Hoàn thành   | Tích hợp React Query API cho Queue, Filter, Review Details, Quyết định AI.               |
| **Phase 5**  | Quản lý & Hội đồng (Manager/Committee)   | ⚪️ Chưa bắt đầu | Queue, workload, aggregation, resolution case.                                           |
| **Phase 6**  | Hardening & Polish                       | ⚪️ Chưa bắt đầu | Tối ưu loading/error states, debounce, responsive, E2E.                                  |

## 🚀 Danh sách tính năng có thể SỬ DỤNG NGAY trên giao diện

Tại thời điểm hiện tại (Hoàn thành Phase 4), dự án đã ghép nối State Management và Mock API. Bạn có thể mở giao diện bằng `npm run dev` và tương tác trực tiếp với các luồng sau:

### 1. Dành cho Sinh viên (Luồng Cá nhân)

- **Truy cập:** `/app/drafts`
- **Tính năng dùng được:**
  - **Upload minh chứng**: Giả lập API tải file lên và chạy Indexing giả lập.
  - **Quản lý bằng chứng**: Xem danh sách các bằng chứng đã thêm, thay đổi tiêu chí, xóa.
  - **Chạy AI Precheck**: Phân tích hồ sơ và đưa ra gợi ý cấp độ phù hợp.

### 2. Dành cho Cán bộ chi hội / Lớp (Luồng Tập thể)

- **Truy cập:** `/app/collective/current`
- **Tính năng dùng được:**
  - **Dashboard tập thể**: Xem thống kê sinh viên tham gia phong trào.
  - **Import danh sách (Roster)**: Hỗ trợ import file danh sách sinh viên tham gia sự kiện và theo dõi tiến độ Indexing cho cả tập thể.

### 3. Dành cho Cán bộ Xét duyệt (Luồng Review)

- **Truy cập:** `/app/queue`
- **Tính năng dùng được:**
  - **Hàng đợi công việc (Queue)**: Xem danh sách hồ sơ được phân công, sử dụng bộ lọc (Trạng thái, Tiêu chí) để lọc danh sách tức thì nhờ React Query.
  - **Chi tiết hồ sơ (Review Details)**: Click vào một hồ sơ để xem Evidence Card và AI Gợi ý.
  - **Ra quyết định**: Bấm các nút "Đạt", "Không đạt", "Yêu cầu bổ sung" hay "Chuyển hội đồng". Giao diện sẽ tự phản hồi ngay lập tức (Optimistic Update) và cập nhật lại bộ lọc ở Hàng đợi. Modal "Yêu cầu bổ sung" cũng tự động điền sẵn email nháp bởi AI.

### 4. Nền tảng hệ thống

- Tự động handle Refresh Token ngầm khi Token hết hạn (bằng interceptor).
- Cấu trúc thư mục FSD (Feature-Sliced Design) sạch sẽ, sẵn sàng chia task cho team lớn.

_Cập nhật lần cuối: 01/07/2026_
