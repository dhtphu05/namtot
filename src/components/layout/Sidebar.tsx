import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ChartNoAxesCombined,
  Cpu,
  Download,
  FileText,
  FolderUp,
  GitBranch,
  History,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  ScanFace,
  ShieldQuestion,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Upload,
  UserCog,
  UsersRound,
} from "lucide-react";
import { authApi } from "@/features/auth/api/auth";
import {
  ENABLE_DEMO_ROLE_SWITCH,
  getRoleLabel,
  isUiRole,
  toUiRole,
} from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { useApp } from "@/lib/store";
import { ROLES, type Role } from "@/lib/mock-data";
import { criterionLabel } from "@/lib/api/types";

type BadgeTone = "core" | "ai" | "demo" | "ops" | "beta";
type NavItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  tone?: BadgeTone;
};
type NavGroup = { group: string; items: NavItem[] };

const NAV: Record<Role, NavGroup[]> = {
  student: [
    {
      group: "Chính",
      items: [
        { label: "Tổng quan", to: "/app", icon: LayoutDashboard, badge: "Core", tone: "core" },
        { label: "Hồ sơ của tôi", to: "/app/drafts", icon: FileText, badge: "Core", tone: "core" },
        { label: "Upload minh chứng", to: "/app/upload", icon: Upload, badge: "Core", tone: "core" },
        { label: "Kho minh chứng", to: "/app/evidence", icon: FolderUp, badge: "Core", tone: "core" },
      ],
    },
    {
      group: "Hỗ trợ nâng cao",
      items: [
        { label: "AI Precheck", to: "/app/ai-precheck", icon: Sparkles, badge: "AI", tone: "ai" },
        { label: "Cascade Review", to: "/app/cascade", icon: GitBranch, badge: "AI", tone: "ai" },
        { label: "Thư viện sự kiện", to: "/app/event-library", icon: CalendarCheck, badge: "Data", tone: "ops" },
        { label: "Chatbot hỗ trợ", to: "/app/chatbot", icon: LifeBuoy, badge: "Demo", tone: "demo" },
        { label: "Thông báo", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
  officer: [
    {
      group: "Xét duyệt",
      items: [
        { label: "Bảng điều khiển", to: "/app", icon: LayoutDashboard, badge: "Core", tone: "core" },
        { label: "Hàng chờ xét duyệt", to: "/app/queue", icon: Inbox, badge: "Core", tone: "core" },
        { label: "Nhập sự kiện", to: "/app/event-registry", icon: CalendarCheck, badge: "Ops", tone: "ops" },
        { label: "Kho tri thức", to: "/app/evidence-search", icon: BookOpenCheck, badge: "Ops", tone: "ops" },
        { label: "Hồ sơ đã chuyển hội ý", to: "/app/resolution", icon: ShieldQuestion, badge: "Theo dõi", tone: "beta" },
        { label: "Thông báo", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
  manager: [
    {
      group: "Quản lý hồ sơ",
      items: [
        { label: "Bảng điều khiển", to: "/app", icon: LayoutDashboard, badge: "Core", tone: "core" },
        { label: "Dashboard thống kê", to: "/app/analytics", icon: ChartNoAxesCombined, badge: "Core", tone: "core" },
        { label: "Kết quả theo cấp", to: "/app/manager/results", icon: Trophy, badge: "Core", tone: "core" },
        { label: "Phân công cán bộ", to: "/app/assignment", icon: UserCog, badge: "Ops", tone: "ops" },
        { label: "Resolution Hub", to: "/app/resolution", icon: ShieldQuestion, badge: "Ops", tone: "ops" },
      ],
    },
    {
      group: "Module nâng cao",
      items: [
        { label: "Nhập sự kiện", to: "/app/event-registry", icon: CalendarCheck, badge: "Data", tone: "ops" },
        { label: "SmartUX Analytics", to: "/app/smartux", icon: ChartNoAxesCombined, badge: "AI", tone: "ai" },
        { label: "VNPT AI Center", to: "/app/vnpt", icon: Cpu, badge: "Demo", tone: "demo" },
        { label: "eKYC", to: "/app/ekyc", icon: ScanFace, badge: "Demo", tone: "demo" },
        { label: "Audit Log", to: "/app/audit", icon: History, badge: "Ops", tone: "ops" },
        { label: "Export Center", to: "/app/export", icon: Download, badge: "Ops", tone: "ops" },
        { label: "Cấu hình tiêu chí", to: "/app/settings", icon: SlidersHorizontal, badge: "Beta", tone: "beta" },
      ],
    },
  ],
  collective: [
    {
      group: "Tập thể",
      items: [
        { label: "Bảng điều khiển", to: "/app", icon: LayoutDashboard, badge: "Core", tone: "core" },
        { label: "Hồ sơ tập thể", to: "/app/collective", icon: UsersRound, badge: "Core", tone: "core" },
        { label: "Upload minh chứng", to: "/app/upload", icon: Upload, badge: "Core", tone: "core" },
        { label: "AI Precheck", to: "/app/ai-precheck", icon: Sparkles, badge: "AI", tone: "ai" },
        { label: "Thông báo", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
};

const badgeClass: Record<BadgeTone, string> = {
  core: "bg-emerald-50 text-emerald-700",
  ai: "bg-sky-50 text-sky-700",
  demo: "bg-amber-50 text-amber-700",
  ops: "bg-indigo-50 text-indigo-700",
  beta: "bg-slate-100 text-slate-700",
};

export function Sidebar() {
  const user = useAuth((s) => s.user);
  const refreshToken = useAuth((s) => s.refreshToken);
  const clearAuth = useAuth((s) => s.clearAuth);
  const storedRole = useApp((s) => s.role);
  const setRole = useApp((s) => s.setRole);
  const authenticatedRole = user ? toUiRole(user.role) : "student";
  const role = ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole) ? storedRole : authenticatedRole;
  const groups = NAV[role];
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // Local logout vẫn cần chạy nếu refresh token đã invalid.
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("5tot-auth");
      }
      clearAuth();
      setRole("student");
      nav({ to: "/login" });
    }
  };

  const isActive = (to: string) =>
    pathname === to ||
    (to !== "/app" && pathname.startsWith(to)) ||
    (role === "student" &&
      to === "/app/drafts" &&
      ["/app/ai-precheck", "/app/cascade"].some((path) => pathname.startsWith(path)));

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-[#EEF2F7] bg-white">
      <div className="shrink-0 px-4 pb-4 pt-6">
        <Link to="/app" className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0057C2] text-sm font-bold text-white">
            5T
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight text-brand-deep">5TOT Platform</div>
            <div className="text-[11px] text-muted-foreground">SV5T 2025-2026</div>
          </div>
        </Link>
      </div>

      <div className="shrink-0 px-4 pb-4">
        <RolePanel />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 pr-3">
        <div className="flex flex-col gap-5 pb-4">
        {groups.map((group) => (
          <div key={group.group}>
            <div className="mb-2 px-3 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {group.group}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = isActive(item.to);
                const Icon = item.icon;
                return (
                  <li key={`${group.group}-${item.to}-${item.label}`}>
                    <Link
                      to={item.to}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-[#0057C2] text-white"
                          : "text-foreground/80 hover:bg-[#F1F7FD] hover:text-brand-deep"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                          active ? "bg-white/15" : "bg-[#F1F7FD] text-[#0057C2] group-hover:bg-white"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            active ? "bg-white/15 text-white" : badgeClass[item.tone ?? "beta"]
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-[#EEF2F7] bg-white px-4 py-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-[#F1F7FD] hover:text-brand-deep"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}

function RolePanel() {
  const user = useAuth((s) => s.user);
  const storedRole = useApp((s) => s.role);
  const setRole = useApp((s) => s.setRole);
  const authenticatedRole = user ? toUiRole(user.role) : "student";
  const role = ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole) ? storedRole : authenticatedRole;
  const roleMeta = ROLES[role];
  const officerSpecializationText =
    user?.role === "officer" && user.officerSpecializations?.length
      ? user.officerSpecializations.map((item) => criterionLabel[item.criterion]).join(", ")
      : null;

  return (
    <div className="mx-1 rounded-xl border border-[#EEF2F7] p-3">
      <div className="mb-2 px-1 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        Đang đăng nhập
      </div>
      <div className="mb-3 flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0057C2] text-xs font-bold text-white">
          {roleMeta.initial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-brand-deep">
            {user?.fullName ?? roleMeta.label}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {user ? getRoleLabel(user.role) : roleMeta.desc}
          </div>
        </div>
      </div>

      {ENABLE_DEMO_ROLE_SWITCH ? (
        <>
          <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
            Demo role switch chỉ đổi UI. Backend permissions vẫn theo tài khoản đang đăng nhập.
          </div>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="w-full rounded-lg bg-[#F1F7FD] px-3 py-2 text-[12px] font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#0057C2]/40"
          >
            {Object.entries(ROLES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="rounded-lg bg-[#F1F7FD] px-3 py-2 text-[12px] font-medium text-brand-deep">
          {officerSpecializationText ? `Phụ trách: ${officerSpecializationText}` : user ? getRoleLabel(user.role) : roleMeta.label}
        </div>
      )}
    </div>
  );
}
