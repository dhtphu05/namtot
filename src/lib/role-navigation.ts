export type NavigationRole =
  | "student"
  | "data_uploader"
  | "officer"
  | "city_officer"
  | "manager"
  | "committee"
  | "city_manager"
  | "city_committee"
  | "admin"
  | "collective";

export type NavigationIcon =
  | "dashboard"
  | "profile"
  | "evidence"
  | "results"
  | "notifications"
  | "assistant"
  | "precheck"
  | "workspace"
  | "registry"
  | "queue"
  | "resolution"
  | "search"
  | "knowledge"
  | "events"
  | "assignment"
  | "export"
  | "audit"
  | "criteria"
  | "import"
  | "users"
  | "officers"
  | "collective";

export type NavigationItem = {
  label: string;
  to: string;
  icon: NavigationIcon;
};

export type NavigationGroup = {
  group: string;
  items: NavigationItem[];
};

const navByRole: Record<NavigationRole, NavigationGroup[]> = {
  student: [
    {
      group: "Sinh viên",
      items: [
        { label: "Tổng quan", to: "/app", icon: "dashboard" },
        { label: "Hồ sơ", to: "/app/application", icon: "profile" },
        { label: "Minh chứng", to: "/app/upload", icon: "evidence" },
        { label: "Kiểm tra hồ sơ", to: "/app/ai-precheck", icon: "precheck" },
        { label: "Kho minh chứng", to: "/app/event-library", icon: "knowledge" },
        { label: "Kết quả", to: "/app/result", icon: "results" },
        { label: "Thông báo", to: "/app/feedback", icon: "notifications" },
        { label: "Trợ lý", to: "/app/assistant", icon: "assistant" },
      ],
    },
  ],
  data_uploader: [
    {
      group: "Nhập liệu đơn vị",
      items: [
        { label: "Tổng quan", to: "/app/data-uploader", icon: "workspace" },
        { label: "Quyết định công nhận", to: "/app/award-registry", icon: "registry" },
      ],
    },
  ],
  officer: [
    {
      group: "Xử lý hồ sơ",
      items: [
        { label: "Hàng chờ hồ sơ", to: "/app/queue", icon: "queue" },
        { label: "Case hội ý", to: "/app/resolution", icon: "resolution" },
        { label: "Tra cứu minh chứng", to: "/app/evidence-search", icon: "search" },
        { label: "Kho tiền lệ", to: "/app/evidence-knowledge", icon: "knowledge" },
        { label: "Sự kiện chính thức", to: "/app/event-registry", icon: "events" },
        { label: "Thông báo", to: "/app/notifications", icon: "notifications" },
      ],
    },
  ],
  city_officer: [
    {
      group: "Xử lý hồ sơ",
      items: [
        { label: "Việc cần xử lý", to: "/app/queue", icon: "queue" },
        { label: "Hồ sơ cần Hội đồng", to: "/app/resolution", icon: "resolution" },
      ],
    },
  ],
  manager: [
    {
      group: "Quản lý mùa xét",
      items: [
        { label: "Theo dõi tiến độ", to: "/app/analytics", icon: "dashboard" },
        { label: "Hồ sơ và kết quả", to: "/app/manager/results", icon: "results" },
        { label: "Phân công cán bộ", to: "/app/assignment", icon: "assignment" },
        { label: "Resolution Hub", to: "/app/resolution", icon: "resolution" },
        { label: "Báo cáo & export", to: "/app/export", icon: "export" },
        { label: "Audit log", to: "/app/audit", icon: "audit" },
        { label: "Cấu hình tiêu chí", to: "/app/settings", icon: "criteria" },
        { label: "Sự kiện đã xác nhận", to: "/app/event-registry", icon: "events" },
        { label: "Import quyết định", to: "/app/decision-imports", icon: "import" },
        { label: "Hồ sơ tập thể", to: "/app/manager/collective", icon: "collective" },
      ],
    },
  ],
  committee: [
    {
      group: "Hội đồng xét duyệt",
      items: [
        { label: "Theo dõi tiến độ", to: "/app/analytics", icon: "dashboard" },
        { label: "Hồ sơ và kết quả", to: "/app/manager/results", icon: "results" },
        { label: "Resolution Hub", to: "/app/resolution", icon: "resolution" },
        { label: "Báo cáo & export", to: "/app/export", icon: "export" },
        { label: "Audit log", to: "/app/audit", icon: "audit" },
        { label: "Sự kiện đã xác nhận", to: "/app/event-registry", icon: "events" },
        { label: "Hồ sơ tập thể", to: "/app/manager/collective", icon: "collective" },
      ],
    },
  ],
  city_manager: [
    {
      group: "Điều phối xét duyệt",
      items: [
        { label: "Theo dõi tiến độ", to: "/app/analytics", icon: "dashboard" },
        { label: "Hồ sơ và kết quả", to: "/app/manager/results", icon: "results" },
        { label: "Phân công cán bộ", to: "/app/assignment", icon: "assignment" },
        { label: "Resolution Hub", to: "/app/resolution", icon: "resolution" },
        { label: "Báo cáo & export", to: "/app/export", icon: "export" },
      ],
    },
  ],
  city_committee: [
    {
      group: "Hội đồng xét duyệt",
      items: [
        { label: "Resolution Hub", to: "/app/resolution", icon: "resolution" },
        { label: "Kết quả cuối", to: "/app/manager/results", icon: "results" },
        { label: "Audit log", to: "/app/audit", icon: "audit" },
      ],
    },
  ],
  admin: [
    {
      group: "Quản trị hệ thống",
      items: [
        { label: "Theo dõi tiến độ", to: "/app/analytics", icon: "dashboard" },
        { label: "Đơn vị / Trường", to: "/app/admin/workspaces", icon: "workspace" },
        { label: "Người dùng", to: "/app/admin/users", icon: "users" },
        { label: "Chuyên môn City Officer", to: "/app/admin/officers", icon: "officers" },
        { label: "Bộ tiêu chí (chỉ đọc)", to: "/app/settings", icon: "criteria" },
        { label: "Audit log", to: "/app/audit", icon: "audit" },
      ],
    },
  ],
  collective: [
    {
      group: "Tập thể",
      items: [
        { label: "Tổng quan", to: "/app", icon: "dashboard" },
        { label: "Hồ sơ tập thể", to: "/app/collective", icon: "collective" },
        { label: "Minh chứng tập thể", to: "/app/upload", icon: "evidence" },
        { label: "Kiểm tra hồ sơ", to: "/app/ai-precheck", icon: "precheck" },
        { label: "Thông báo", to: "/app/notifications", icon: "notifications" },
      ],
    },
  ],
};

export function getRoleNavigation(role: NavigationRole, backendRole?: string) {
  if (backendRole === "admin") return navByRole.admin;
  if (backendRole === "committee") return navByRole.committee;
  return navByRole[role];
}
