import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Bell,
  Building2,
  CalendarCheck,
  Download,
  FileText,
  FileUp,
  FolderUp,
  GraduationCap,
  History,
  Inbox,
  IdCard,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  SearchCheck,
  School,
  ShieldQuestion,
  SlidersHorizontal,
  Trophy,
  UserCog,
  UsersRound,
} from "lucide-react";
import {
  ENABLE_DEMO_ROLE_SWITCH,
  getUserAssignmentLabel,
  getUserRoleLabel,
  isUiRole,
  toUiRole,
} from "@/features/auth/role-map";
import { UserWorkspaceInfo } from "@/components/layout/UserWorkspaceInfo";
import { useAuth } from "@/features/auth/store/auth-store";
import { useApp } from "@/lib/store";
import { STUDENT_APPLICATION_UI_V2 } from "@/lib/student-application-ui-v2";
import { ROLES, type Role } from "@/lib/mock-data";
import {
  getRoleNavigation,
  type NavigationIcon,
  type NavigationItem,
  type NavigationRole,
} from "@/lib/role-navigation";
import { type SafeUser } from "@/lib/api/types";
import hsvvnEmblemUrl from "@/assets/hsvvn-emblem.webp";

type NavItem = Omit<NavigationItem, "icon"> & {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};
type NavGroup = { group: string; items: NavItem[] };
type SidebarProps = { variant?: "desktop" | "mobile"; onNavigate?: () => void };

const navIcons: Record<NavigationIcon, NavItem["icon"]> = {
  dashboard: LayoutDashboard,
  profile: FileText,
  evidence: FolderUp,
  results: Trophy,
  notifications: Bell,
  assistant: LifeBuoy,
  precheck: BookOpenCheck,
  workspace: Building2,
  registry: FileUp,
  queue: Inbox,
  resolution: ShieldQuestion,
  search: SearchCheck,
  knowledge: BookOpenCheck,
  events: CalendarCheck,
  assignment: UserCog,
  export: Download,
  audit: History,
  criteria: SlidersHorizontal,
  import: FileUp,
  users: UsersRound,
  officers: UserCog,
  collective: UsersRound,
};

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const user = useAuth((s) => s.user);
  const storedRole = useApp((s) => s.role);
  const authenticatedRole = user ? toUiRole(user.role) : "student";
  const role = ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole) ? storedRole : authenticatedRole;
  const groups = getNavGroups(role, user?.role);
  const isMobile = variant === "mobile";
  const isV2Sidebar = STUDENT_APPLICATION_UI_V2;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeItem = findActiveItem(groups, pathname, role);
  const desktopSidebarClass =
    role === "student" && isV2Sidebar ? "hidden w-[296px] md:flex" : "hidden w-[240px] md:flex";

  return (
    <aside
      className={`${isMobile ? "flex h-full w-full flex-col" : "h-[100dvh] shrink-0 flex-col"} bg-white ${
        isV2Sidebar
          ? "border-r border-[var(--student-v2-divider)]"
          : "shadow-[1px_0_0_rgba(15,23,42,0.05)] backdrop-blur"
      } ${!isMobile ? desktopSidebarClass : ""}`}
    >
      <div className={`shrink-0 px-4 pb-3 pt-5 ${isMobile ? "pr-14" : ""}`}>
        {isV2Sidebar ? (
          <Link
            to="/app"
            onClick={onNavigate}
            className="block rounded-[var(--student-v2-radius-section)] transition-colors duration-[120ms] hover:bg-[var(--student-v2-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] focus-visible:ring-offset-2"
            aria-label="Về tổng quan hồ sơ Sinh viên 5 tốt"
          >
            <StudentV2Lockup
              workspaceName={user?.workspace?.name}
              workspaceShortName={
                user?.role === "city_officer" ||
                user?.role === "city_manager" ||
                user?.role === "city_committee"
                  ? null
                  : user?.workspace?.shortName
              }
            />
          </Link>
        ) : (
          <Link to="/app" onClick={onNavigate} className="flex min-w-0 items-center gap-3 px-2">
            <img
              src={hsvvnEmblemUrl}
              alt="Biểu trưng Hội Sinh viên Việt Nam"
              className="h-10 w-10 shrink-0 rounded-full object-contain"
            />
            <div className="min-w-0">
              <div className="text-[15px] font-bold leading-tight text-[#0F172A]">
                HỘI SINH VIÊN VIỆT NAM
              </div>
              <div className="mt-0.5 text-[11px] font-semibold leading-4 text-[#64748B]">
                Thành phố Đà Nẵng
              </div>
              <div className="mt-0.5 text-[11px] font-medium leading-4 text-[#64748B]">
                Hệ thống quản lý Sinh viên 5 tốt
              </div>
            </div>
          </Link>
        )}
      </div>

      <div className={isV2Sidebar ? "shrink-0 px-4 pb-3" : "shrink-0 px-4 pb-3"}>
        {isV2Sidebar ? <SidebarV2ProfilePanel user={user} role={role} /> : <RolePanel />}
      </div>

      <nav
        className={
          isV2Sidebar
            ? "min-h-0 flex-1 overflow-y-auto px-3"
            : "min-h-0 flex-1 overflow-y-auto px-4 pr-3"
        }
      >
        <div className="flex flex-col gap-4 pb-4">
          {groups.map((group) => (
            <div key={group.group}>
              {isV2Sidebar ? (
                role === "student" ? null : (
                  <div className="mb-2 px-4 text-[11px] font-semibold uppercase leading-4 text-[var(--student-v2-text-muted)]">
                    {group.group}
                  </div>
                )
              ) : (
                <div className="mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
                  {group.group}
                </div>
              )}
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const active = activeItem?.to === item.to && activeItem?.label === item.label;
                  const Icon = item.icon;
                  return (
                    <li key={`${group.group}-${item.to}-${item.label}`}>
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={
                          isV2Sidebar
                            ? `group relative flex min-h-[46px] items-center gap-3 rounded-[var(--student-v2-radius-control)] px-4 py-2.5 text-[15px] font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)] focus-visible:ring-offset-2 ${
                                active
                                  ? "bg-[var(--student-v2-surface-selected)] text-[var(--student-v2-institutional-blue)] before:absolute before:left-0 before:top-2 before:h-[30px] before:w-[3px] before:rounded-r-[var(--student-v2-radius-pill)] before:bg-[var(--student-v2-institutional-blue)]"
                                  : "text-[var(--student-v2-text-secondary)] hover:bg-[var(--student-v2-surface-hover)] hover:text-[var(--student-v2-institutional-blue)]"
                              }`
                            : `group flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 ${
                                active
                                  ? "bg-[var(--surface-selected)] text-[var(--brand-primary)]"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--brand-primary)]"
                              }`
                        }
                      >
                        {isV2Sidebar ? (
                          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
                        ) : (
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                              active
                                ? "bg-white text-[var(--brand-primary)]"
                                : "bg-[var(--surface-muted)] text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]"
                            }`}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.9} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
}

function StudentV2Lockup({
  workspaceName,
  workspaceShortName,
}: {
  workspaceName?: string | null;
  workspaceShortName?: string | null;
}) {
  const workspaceLabel = workspaceShortName || workspaceName || "Đơn vị triển khai";

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-[var(--student-v2-divider)] pb-4">
      <img
        src={hsvvnEmblemUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-contain"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <h2 className="m-0 min-w-0 text-[14px] font-bold uppercase leading-[18px] text-[var(--student-v2-institutional-blue)]">
          HỘI SINH VIÊN VIỆT NAM
        </h2>
        <div className="mt-1 text-[14px] font-semibold leading-5 text-[var(--student-v2-institutional-blue)] [overflow-wrap:anywhere]">
          {workspaceLabel}
        </div>
        <div className="mt-0.5 text-[13px] leading-[18px] text-[var(--student-v2-text-secondary)]">
          Hệ thống Sinh viên 5 tốt
        </div>
      </div>
    </div>
  );
}

function SidebarV2ProfilePanel({ user, role }: { user: SafeUser | null; role: Role }) {
  const roleMeta = ROLES[role];
  const isAdmin = user?.role === "admin";
  const isStudent = role === "student" && user?.role === "student";
  const displayName =
    user?.fullName || (isAdmin ? "Quản trị hệ thống" : roleMeta.label || "Tài khoản");
  const initials = getInitials(displayName, isAdmin ? "QT" : roleMeta.initial);
  const workspaceLabel = user?.workspace?.name || user?.workspace?.shortName || "Đơn vị triển khai";
  const roleLabel = isAdmin ? "Quản trị hệ thống" : user ? getUserRoleLabel(user) : roleMeta.label;
  const assignmentLabel = isAdmin
    ? "Toàn bộ đơn vị"
    : user
      ? getUserAssignmentLabel(user)
      : roleMeta.desc;

  const rows = isStudent
    ? [
        { icon: School, value: workspaceLabel },
        { icon: IdCard, value: user?.studentCode || "Chưa có mã sinh viên" },
        { icon: GraduationCap, value: user?.faculty || "Khoa chưa cập nhật" },
        { icon: UsersRound, value: user?.className || "Lớp chưa cập nhật" },
      ]
    : [
        { icon: School, value: workspaceLabel },
        { icon: UserCog, value: assignmentLabel },
        { icon: Mail, value: user?.email || "Email chưa cập nhật" },
      ];

  return (
    <section
      className="border-b border-[var(--student-v2-divider)] pb-3"
      aria-label={isStudent ? "Thông tin sinh viên" : "Thông tin tài khoản"}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--student-v2-institutional-navy)] text-[18px] font-bold text-[var(--student-v2-text-inverse)]">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold leading-[22px] text-[var(--student-v2-text-primary)]">
            {displayName}
          </div>
          <div className="truncate text-[14px] leading-5 text-[var(--student-v2-text-secondary)]">
            {roleLabel}
          </div>
        </div>
      </div>

      <dl className="mt-3 space-y-2.5 text-[14px] leading-5 text-[var(--student-v2-text-secondary)]">
        {rows.map((row) => (
          <StudentV2ProfileRow key={`${row.value}`} icon={row.icon} value={row.value} />
        ))}
      </dl>
    </section>
  );
}

function StudentV2ProfilePanel({
  user,
  fallbackInitial,
}: {
  user: SafeUser | null;
  fallbackInitial: string;
}) {
  const displayName = user?.fullName || "Sinh viên";
  const initials = getInitials(displayName, fallbackInitial);
  const workspaceLabel = user?.workspace?.name || user?.workspace?.shortName || "Đơn vị triển khai";

  return (
    <section
      className="border-b border-[var(--student-v2-divider)] pb-3"
      aria-label="Thông tin sinh viên"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--student-v2-institutional-navy)] text-[19px] font-bold text-[var(--student-v2-text-inverse)]">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold leading-[22px] text-[var(--student-v2-text-primary)]">
            {displayName}
          </div>
          <div className="text-[14px] leading-5 text-[var(--student-v2-text-secondary)]">
            Sinh viên
          </div>
        </div>
      </div>

      <dl className="mt-3 space-y-2.5 text-[14px] leading-5 text-[var(--student-v2-text-secondary)]">
        <StudentV2ProfileRow icon={School} value={workspaceLabel} />
        <StudentV2ProfileRow icon={FileText} value={user?.studentCode || "Chưa có mã sinh viên"} />
        <StudentV2ProfileRow icon={GraduationCap} value={user?.faculty || "Khoa chưa cập nhật"} />
        <StudentV2ProfileRow icon={UsersRound} value={user?.className || "Lớp chưa cập nhật"} />
      </dl>
    </section>
  );
}

function StudentV2ProfileRow({
  icon: Icon,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  value: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[24px_minmax(0,1fr)] items-start gap-2">
      <Icon
        className="mt-0.5 h-4 w-4 text-[var(--student-v2-text-secondary)]"
        strokeWidth={1.9}
        aria-hidden="true"
      />
      <dd className="min-w-0 truncate">{value}</dd>
    </div>
  );
}

function getNavGroups(role: Role, backendRole?: string): NavGroup[] {
  return getRoleNavigation(role as NavigationRole, backendRole).map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item, icon: navIcons[item.icon] })),
  }));
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
  if (pathname.startsWith("/app/upload")) return "/app/upload";
  if (pathname.startsWith("/app/ai-precheck")) return "/app/ai-precheck";
  if (pathname === "/app/overview") {
    return "/app";
  }
  if (pathname.startsWith("/app/wizard")) {
    return "/app/application";
  }
  if (pathname.startsWith("/app/event-library")) {
    return "/app/event-library";
  }
  if (
    pathname.startsWith("/app/drafts") ||
    pathname.startsWith("/app/evidence") ||
    pathname.startsWith("/app/profile") ||
    pathname.startsWith("/app/my-application") ||
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
  const isAdmin = user?.role === "admin";
  const isStudent = role === "student";
  const isStudentV2 = STUDENT_APPLICATION_UI_V2 && user?.role === "student" && isStudent;
  const displayName = user?.fullName ?? roleMeta.label;
  const initials = getInitials(displayName, roleMeta.initial);

  return (
    <div
      className={`mx-1 p-2.5 ${
        isStudentV2
          ? "rounded-[var(--student-v2-radius-section)] bg-[var(--student-v2-surface-secondary)]"
          : `bg-[var(--surface-muted)] ${isStudent ? "rounded-2xl" : "rounded-3xl"}`
      }`}
    >
      <div className="mb-2 px-1 text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
        Đang đăng nhập
      </div>
      <div className="mb-2.5 flex items-center gap-3 px-1">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold ${
            isStudentV2
              ? "rounded-[var(--student-v2-radius-control)] bg-[var(--student-v2-institutional-navy)] text-[var(--student-v2-text-inverse)]"
              : "rounded-2xl bg-[#0057C2] text-white"
          }`}
        >
          {isAdmin ? "QT" : initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-[#0F172A]">{displayName}</div>
          <div className="truncate text-[11px] text-[#64748B]">
            {isAdmin
              ? "Quản trị hệ thống"
              : isStudent
                ? "Sinh viên"
                : user
                  ? getUserRoleLabel(user)
                  : roleMeta.desc}
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
        <div
          className={`px-3 py-2 text-[12px] font-semibold ${
            isStudentV2
              ? "rounded-[var(--student-v2-radius-control)] bg-[var(--student-v2-surface-primary)] text-[var(--student-v2-institutional-blue)]"
              : "rounded-2xl bg-white text-[#0057C2]"
          }`}
        >
          {isAdmin
            ? "Toàn bộ đơn vị"
            : isStudent
              ? "Sinh viên"
              : user
                ? `Phụ trách: ${getUserAssignmentLabel(user)}`
                : roleMeta.label}
        </div>
      )}
      {isAdmin ? (
        <div className="mt-2 rounded-2xl bg-white px-3 py-2 text-[11px] leading-5 text-[#64748B] shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
          Quản trị danh sách các trường đang triển khai 5TOT. Không có chuyển đổi workspace trong
          giao diện này.
        </div>
      ) : isStudentV2 ? null : (
        <UserWorkspaceInfo user={user} className="mt-2" />
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
