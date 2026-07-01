import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpenCheck,
  Bot,
  CalendarCheck,
  ChartNoAxesCombined,
  Cpu,
  Download,
  FolderUp,
  GitBranch,
  History,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PencilLine,
  ScanFace,
  ShieldQuestion,
  SlidersHorizontal,
  Sparkles,
  UserCog,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/store/auth-store";
import { authApi } from "@/features/auth/api/auth";
import {
  ENABLE_DEMO_ROLE_SWITCH,
  getRoleLabel,
  isUiRole,
  toUiRole,
} from "@/features/auth/role-map";
import { useApp } from "@/lib/store";
import { ROLES, type Role } from "@/lib/mock-data";

const NAV: Record<Role, { group: string; items: { label: string; to: string; icon: any }[] }[]> = {
  student: [
    {
      group: "Ho so SV5T cua toi",
      items: [
        { label: "Bang dieu khien", to: "/app", icon: LayoutDashboard },
        { label: "Ban nhap ho so", to: "/app/drafts", icon: PencilLine },
        { label: "Minh chung", to: "/app/evidence", icon: FolderUp },
        { label: "Kho su kien", to: "/app/event-library", icon: ListChecks },
        { label: "AI tien kiem", to: "/app/ai-precheck", icon: Sparkles },
        { label: "Cascade Review", to: "/app/cascade", icon: GitBranch },
        { label: "Xac thuc eKYC", to: "/app/ekyc", icon: ScanFace },
      ],
    },
    {
      group: "Ho tro",
      items: [
        { label: "Chatbot SV5T", to: "/app/chatbot", icon: Bot },
        { label: "Thong bao", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
  officer: [
    {
      group: "Xet duyet",
      items: [
        { label: "Bang dieu khien", to: "/app", icon: LayoutDashboard },
        { label: "Hang cho xet duyet", to: "/app/queue", icon: Inbox },
        { label: "Nhap su kien", to: "/app/event-registry", icon: CalendarCheck },
        { label: "Kho tri thuc", to: "/app/evidence-search", icon: BookOpenCheck },
        { label: "Thong bao", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
  manager: [
    {
      group: "Quan ly",
      items: [
        { label: "Bang dieu khien", to: "/app", icon: LayoutDashboard },
        { label: "Phan cong can bo", to: "/app/assignment", icon: UserCog },
        { label: "Nhap su kien", to: "/app/event-registry", icon: CalendarCheck },
        { label: "SmartUX Analytics", to: "/app/analytics", icon: ChartNoAxesCombined },
        { label: "VNPT AI Center", to: "/app/vnpt", icon: Cpu },
        { label: "Audit Log", to: "/app/audit", icon: History },
        { label: "Export Center", to: "/app/export", icon: Download },
        { label: "Resolution Hub", to: "/app/resolution", icon: ShieldQuestion },
        { label: "Cau hinh tieu chi", to: "/app/settings", icon: SlidersHorizontal },
      ],
    },
  ],
  collective: [
    {
      group: "Tap the",
      items: [
        { label: "Bang dieu khien", to: "/app", icon: LayoutDashboard },
        { label: "Ho so tap the", to: "/app/collective", icon: UsersRound },
        { label: "Minh chung", to: "/app/evidence", icon: FolderUp },
        { label: "Kho su kien", to: "/app/event-library", icon: ListChecks },
        { label: "Thong bao", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
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
      // Local logout must still happen if the server token is already invalid.
    } finally {
      clearAuth();
      setRole("student");
      nav({ to: "/login" });
    }
  };

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-[#EEF2F7] min-h-screen px-4 py-6 flex flex-col gap-5 sticky top-0">
      <Link to="/app" className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-xl bg-[#0057C2] flex items-center justify-center text-white font-bold text-sm">
          5T
        </div>
        <div>
          <div className="font-bold text-brand-deep leading-tight text-[15px]">5TOT Platform</div>
          <div className="text-[11px] text-muted-foreground">Sinh vien 5 tot - 2025-2026</div>
        </div>
      </Link>

      <RolePanel />

      <nav className="flex flex-col gap-5 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.group}>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 px-3 mb-2 font-semibold">
              {group.group}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to || (item.to !== "/app" && pathname.startsWith(item.to));
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-[#0057C2] text-white"
                          : "text-foreground/80 hover:bg-[#F1F7FD] hover:text-brand-deep"
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${active ? "bg-white/15" : "bg-[#F1F7FD] text-[#0057C2] group-hover:bg-white"}`}>
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground hover:text-brand-deep"
        >
          <LogOut className="w-4 h-4" /> Dang xuat
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

  return (
    <div className="rounded-xl border border-[#EEF2F7] p-3 mx-1">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2 px-1 font-semibold">
        Dang dang nhap
      </div>
      <div className="flex items-center gap-3 px-1 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#0057C2] text-white flex items-center justify-center font-bold text-xs shrink-0">
          {roleMeta.initial}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-brand-deep text-[13px] truncate">
            {user?.fullName ?? roleMeta.label}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {user ? getRoleLabel(user.role) : roleMeta.desc}
          </div>
        </div>
      </div>

      {ENABLE_DEMO_ROLE_SWITCH ? (
        <>
          <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
            Demo-only mock role switch. Backend permissions still use the authenticated account.
          </div>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="w-full text-[12px] rounded-lg bg-[#F1F7FD] px-3 py-2 font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#0057C2]/40"
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
          {user ? getRoleLabel(user.role) : roleMeta.label}
        </div>
      )}
    </div>
  );
}
