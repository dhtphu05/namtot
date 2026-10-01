import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

const groups = [
  {
    title: "Điều hành xét duyệt",
    description: "Các màn hình theo dõi và điều phối City đang có.",
    items: [
      {
        label: "Theo dõi Thành phố",
        description: "Xem dashboard và cấu hình mùa xét hiện có.",
        to: "/app/analytics",
      },
      {
        label: "Hàng chờ review",
        description: "Tra cứu task; quyền nhận việc theo vai trò hiện có.",
        to: "/app/queue",
      },
      {
        label: "Phân công cán bộ",
        description: "Điều phối task theo phạm vi backend cho phép.",
        to: "/app/assignment",
      },
      {
        label: "Hồ sơ và kết quả",
        description: "Tra cứu hồ sơ City và kết quả hiện tại.",
        to: "/app/manager/results",
      },
      {
        label: "Resolution Hub",
        description: "Theo dõi các case và thao tác hiện có.",
        to: "/app/resolution",
      },
      {
        label: "Báo cáo & export",
        description: "Mở các luồng báo cáo và xuất dữ liệu hiện có.",
        to: "/app/export",
      },
    ],
  },
  {
    title: "Dữ liệu nghiệp vụ",
    description: "Các registry và luồng dữ liệu đã được tích hợp.",
    items: [
      {
        label: "Quyết định công nhận",
        description: "Quản lý quyết định và roster theo quyền hiện hành.",
        to: "/app/award-registry",
      },
      {
        label: "Sự kiện chính thức",
        description: "Mở Event Registry hiện có.",
        to: "/app/event-registry",
      },
      {
        label: "Import quyết định",
        description: "Mở luồng Decision Import đang được hỗ trợ.",
        to: "/app/decision-imports",
      },
      {
        label: "Kho tiền lệ minh chứng",
        description: "Tra cứu kho tiền lệ và minh chứng đã duyệt.",
        to: "/app/evidence-knowledge",
      },
    ],
  },
  {
    title: "Quản trị nền tảng",
    description: "Quản lý đơn vị, tài khoản và thông tin vận hành.",
    items: [
      {
        label: "Đơn vị / Trường",
        description: "Quản lý workspace, trạng thái và đăng ký.",
        to: "/app/admin/workspaces",
      },
      {
        label: "Người dùng",
        description: "Tạo, cập nhật, khóa tài khoản hoặc đặt lại mật khẩu.",
        to: "/app/admin/users",
      },
      {
        label: "Chuyên môn City Officer",
        description: "Cấu hình chuyên môn theo năm tiêu chí hiện có.",
        to: "/app/admin/officers",
      },
      {
        label: "Bộ tiêu chí (chỉ đọc)",
        description: "Tra cứu cấu hình; màn hình này không chỉnh sửa tiêu chí.",
        to: "/app/settings",
      },
      {
        label: "Audit log",
        description: "Tra cứu lịch sử thao tác theo quyền đã cấp.",
        to: "/app/audit",
      },
    ],
  },
] as const;

export function AdminOperationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Trung tâm vận hành quản trị"
        subtitle="Mở các chức năng quản trị và điều hành hiện có. Quyền thao tác tiếp tục theo tài khoản và backend."
      />

      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {groups.map((group, index) => {
          const headingId = `admin-operations-group-${index}`;

          return (
            <section
              key={group.title}
              aria-labelledby={headingId}
              className="min-w-0 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <div className="border-b border-[var(--border-subtle)] px-4 py-3">
                <h2 id={headingId} className="text-sm font-semibold text-[var(--text-primary)]">
                  {group.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {group.description}
                </p>
              </div>

              <ul className="divide-y divide-[var(--border-subtle)]">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="group flex min-h-16 min-w-0 items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
