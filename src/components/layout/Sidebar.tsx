import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ChartNoAxesCombined,
  Download,
  FileText,
  FileUp,
  FolderUp,
  History,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  ShieldQuestion,
  SlidersHorizontal,
  Trophy,
  UserCog,
  UsersRound,
} from "lucide-react";
import { authApi } from "@/features/auth/api/auth";
import {
  ENABLE_DEMO_ROLE_SWITCH,
  getUserAssignmentLabel,
  getUserRoleLabel,
  isUiRole,
  toUiRole,
} from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { useApp } from "@/lib/store";
import { ROLES, type Role } from "@/lib/mock-data";
import { type Role as ApiRole } from "@/lib/api/types";

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
      group: "Sinh viên",
      items: [
        { label: "Tổng quan", to: "/app", icon: LayoutDashboard },
        { label: "Hồ sơ & minh chứng", to: "/app/application", icon: FileText },
        { label: "Phản hồi", to: "/app/feedback", icon: Bell },
        { label: "Trợ lý", to: "/app/assistant", icon: LifeBuoy },
      ],
    },
  ],
  officer: [
    {
      group: "Xử lý hồ sơ",
      items: [
        { label: "Tổng quan xử lý", to: "/app", icon: LayoutDashboard },
        { label: "Việc được giao", to: "/app/queue", icon: Inbox },
        { label: "Hồ sơ đang xét", to: "/app/queue", icon: FileText },
        { label: "Cần bổ sung", to: "/app/queue", icon: FolderUp },
        {
          label: "Case hội ý",
          to: "/app/resolution",
          icon: ShieldQuestion,
        },
        {
          label: "Tra cứu minh chứng",
          to: "/app/evidence-search",
          icon: BookOpenCheck,
        },
        { label: "Thông báo", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
  manager: [
    {
      group: "Quản lý mùa xét",
      items: [
        { label: "Tổng quan mùa xét", to: "/app", icon: LayoutDashboard },
        { label: "Hồ sơ", to: "/app/manager/results", icon: Trophy },
        { label: "Phân công cán bộ", to: "/app/assignment", icon: UserCog },
        { label: "Resolution Hub", to: "/app/resolution", icon: ShieldQuestion },
        { label: "Báo cáo & export", to: "/app/export", icon: Download },
        { label: "Audit log", to: "/app/audit", icon: History },
        { label: "Cấu hình tiêu chí", to: "/app/settings", icon: SlidersHorizontal },
      ],
    },
    {
      group: "Dữ liệu vận hành",
      items: [
        { label: "Sự kiện đã xác nhận", to: "/app/event-registry", icon: CalendarCheck },
        { label: "Import quyết định", to: "/app/decision-imports", icon: FileUp },
        { label: "Theo dõi tiến độ", to: "/app/analytics", icon: ChartNoAxesCombined },
        { label: "Hồ sơ tập thể", to: "/app/manager/collective", icon: UsersRound },
      ],
    },
  ],
  collective: [
    {
      group: "Tập thể",
      items: [
        { label: "Tổng quan", to: "/app", icon: LayoutDashboard },
        { label: "Hồ sơ tập thể", to: "/app/collective", icon: UsersRound },
        { label: "Minh chứng tập thể", to: "/app/upload", icon: FolderUp },
        { label: "Kiểm tra hồ sơ", to: "/app/ai-precheck", icon: BookOpenCheck },
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
  const queryClient = useQueryClient();
  const authenticatedRole = user ? toUiRole(user.role) : "student";
  const role = ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole) ? storedRole : authenticatedRole;
  const groups = getNavGroups(role, user?.role);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // Local logout still has to clear the stale session.
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("5tot-auth");
      }
      clearAuth();
      queryClient.clear();
      setRole("student");
      nav({ to: "/login" });
    }
  };

  const activeItem = findActiveItem(groups, pathname, role);

  return (
    <aside
      className={`h-[100dvh] shrink-0 flex-col bg-white/95 shadow-[1px_0_0_rgba(15,23,42,0.05)] backdrop-blur ${
        role === "student" ? "hidden w-[248px] md:flex" : "flex w-[264px]"
      }`}
    >
      <div className="shrink-0 px-4 pb-3 pt-5">
        <Link to="/app" className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0057C2] text-sm font-bold text-white">
            5T
          </div>
          <div>
            <div className="text-[15px] font-bold leading-tight text-[#0F172A]">5TOT Platform</div>
            <div className="text-[11px] font-medium text-[#64748B]">SV5T 2025-2026</div>
          </div>
        </Link>
      </div>

      <div className="shrink-0 px-4 pb-3">
        <RolePanel />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 pr-3">
        <div className="flex flex-col gap-4 pb-4">
          {groups.map((group) => (
            <div key={group.group}>
              <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
                {group.group}
              </div>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = activeItem?.to === item.to && activeItem?.label === item.label;
                  const Icon = item.icon;
                  return (
                    <li key={`${group.group}-${item.to}-${item.label}`}>
                      <Link
                        to={item.to}
                        className={`group flex items-center gap-3 rounded-2xl px-3 py-2 text-[13px] font-semibold transition-colors ${
                          active
                            ? "bg-[#EAF3FF] text-[#0057C2]"
                            : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0057C2]"
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            active
                              ? "bg-white text-[#0057C2]"
                              : "bg-[#F8FAFC] text-[#64748B] group-hover:text-[#0057C2]"
                          }`}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.9} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              active ? "bg-white text-[#0057C2]" : badgeClass[item.tone ?? "beta"]
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

      <div className="shrink-0 bg-white px-4 py-4 shadow-[0_-1px_0_rgba(15,23,42,0.06)]">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-[13px] font-semibold text-[#64748B] transition-colors hover:bg-[#F8FAFC] hover:text-[#0057C2]"
        >
          <LogOut className="h-4 w-4" /> Đăng xuất
        </button>
      </div>
    </aside>
  );
}

function getNavGroups(role: Role, backendRole?: ApiRole): NavGroup[] {
  if (backendRole === "committee" || backendRole === "admin") return NAV.manager;
  return NAV[role];
}

function findActiveItem(groups: NavGroup[], pathname: string, role: Role): NavItem | undefined {
  const normalizedPath = normalizeStudentWorkspacePath(pathname, role);
  const allItems = groups.flatMap((group) => group.items);
  return allItems
    .filter(
      (item) =>
        normalizedPath === item.to ||
        (item.to !== "/app" && normalizedPath.startsWith(`${item.to}/`)),
    )
    .sort((left, right) => right.to.length - left.to.length)[0];
}

function normalizeStudentWorkspacePath(pathname: string, role: Role) {
  if (role !== "student") return pathname;
  if (pathname === "/app/overview") {
    return "/app";
  }
  if (pathname.startsWith("/app/wizard")) {
    return "/app/application";
  }
  if (
    pathname.startsWith("/app/drafts") ||
    pathname.startsWith("/app/evidence") ||
    pathname.startsWith("/app/profile") ||
    pathname.startsWith("/app/my-application") ||
    pathname.startsWith("/app/upload") ||
    pathname.startsWith("/app/event-library") ||
    pathname.startsWith("/app/ai-precheck") ||
    pathname.startsWith("/app/cascade")
  ) {
    return "/app/application";
  }
  if (pathname.startsWith("/app/notifications")) {
    return "/app/feedback";
  }
  if (pathname.startsWith("/app/chatbot")) {
    return "/app/assistant";
  }
  return pathname;
}

function RolePanel() {
  const user = useAuth((s) => s.user);
  const storedRole = useApp((s) => s.role);
  const setRole = useApp((s) => s.setRole);
  const authenticatedRole = user ? toUiRole(user.role) : "student";
  const role = ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole) ? storedRole : authenticatedRole;
  const roleMeta = ROLES[role];
  const isStudent = role === "student";
  const displayName = user?.fullName ?? roleMeta.label;
  const initials = getInitials(displayName, roleMeta.initial);

  return (
    <div
      className={`mx-1 bg-[var(--surface-muted)] p-2.5 ${isStudent ? "rounded-2xl" : "rounded-3xl"}`}
    >
      <div className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
        Đang đăng nhập
      </div>
      <div className="mb-2.5 flex items-center gap-3 px-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#0057C2] text-xs font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-[#0F172A]">{displayName}</div>
          <div className="truncate text-[11px] text-[#64748B]">
            {isStudent ? "Sinh viên" : user ? getUserRoleLabel(user) : roleMeta.desc}
          </div>
        </div>
      </div>

      {ENABLE_DEMO_ROLE_SWITCH ? (
        <>
          <div className="mb-2 rounded-2xl bg-[var(--surface-warning)] px-3 py-2 text-[11px] font-medium text-amber-800">
            Chế độ demo chỉ đổi giao diện. Quyền dữ liệu vẫn theo tài khoản đang đăng nhập.
          </div>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="w-full rounded-2xl bg-white px-3 py-2 text-[12px] font-semibold text-[#0057C2] outline-none shadow-[0_0_0_1px_rgba(15,23,42,0.07)] focus:ring-2 focus:ring-[#0057C2]/30"
          >
            {Object.entries(ROLES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="rounded-2xl bg-white px-3 py-2 text-[12px] font-semibold text-[#0057C2]">
          {isStudent
            ? "Sinh viên"
            : user
              ? `Phụ trách: ${getUserAssignmentLabel(user)}`
              : roleMeta.label}
        </div>
      )}
    </div>
  );
}

function getInitials(name: string, fallback: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
