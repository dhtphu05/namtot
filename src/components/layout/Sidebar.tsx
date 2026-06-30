import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, PencilLine, FolderUp, Sparkles, GitBranch, Bot, Bell,
  Inbox, BookOpenCheck, ShieldQuestion, ChartNoAxesCombined, Cpu, UserCog,
  History, Download, UsersRound, SlidersHorizontal, ScanFace, LogOut, CalendarCheck,
  ListChecks,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { ROLES, OFFICERS, CRITERIA, type Role } from "@/lib/mock-data";

const NAV: Record<Role, { group: string; items: { label: string; to: string; icon: any }[] }[]> = {
  student: [
    {
      group: "Hồ sơ SV5T của tôi",
      items: [
        { label: "Bảng điều khiển", to: "/app", icon: LayoutDashboard },
        { label: "Bản nháp hồ sơ", to: "/app/drafts", icon: PencilLine },
        { label: "Minh chứng theo tiêu chí", to: "/app/evidence", icon: FolderUp },
        { label: "Kho minh chứng & sự kiện", to: "/app/event-library", icon: ListChecks },
        { label: "AI tiền kiểm", to: "/app/ai-precheck", icon: Sparkles },
        { label: "Cascade Review", to: "/app/cascade", icon: GitBranch },
        { label: "Xác thực eKYC", to: "/app/ekyc", icon: ScanFace },
      ],
    },
    {
      group: "Hỗ trợ",
      items: [
        { label: "Chatbot SV5T", to: "/app/chatbot", icon: Bot },
        { label: "Thông báo", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
  officer: [
    {
      group: "Xét duyệt theo tiêu chí",
      items: [
        { label: "Bảng điều khiển", to: "/app", icon: LayoutDashboard },
        { label: "Hàng chờ xét duyệt", to: "/app/queue", icon: Inbox },
        { label: "Trung tâm nhập sự kiện", to: "/app/event-registry", icon: CalendarCheck },
        { label: "Kho tri thức minh chứng", to: "/app/evidence-search", icon: BookOpenCheck },
        { label: "Resolution Hub", to: "/app/resolution", icon: ShieldQuestion },
        { label: "Thông báo", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
  manager: [
    {
      group: "Quản lý",
      items: [
        { label: "Bảng điều khiển", to: "/app", icon: LayoutDashboard },
        { label: "Phân công cán bộ", to: "/app/assignment", icon: UserCog },
        { label: "Trung tâm nhập sự kiện", to: "/app/event-registry", icon: CalendarCheck },
        { label: "SmartUX Analytics", to: "/app/analytics", icon: ChartNoAxesCombined },
        { label: "VNPT AI Center", to: "/app/vnpt", icon: Cpu },
        { label: "Audit Log", to: "/app/audit", icon: History },
        { label: "Export Center", to: "/app/export", icon: Download },
        { label: "Resolution Hub", to: "/app/resolution", icon: ShieldQuestion },
        { label: "Cấu hình tiêu chí", to: "/app/settings", icon: SlidersHorizontal },
      ],
    },
  ],
  collective: [
    {
      group: "Tập thể",
      items: [
        { label: "Bảng điều khiển", to: "/app", icon: LayoutDashboard },
        { label: "Hồ sơ tập thể", to: "/app/collective", icon: UsersRound },
        { label: "Minh chứng theo tiêu chí", to: "/app/evidence", icon: FolderUp },
        { label: "Kho sự kiện hợp lệ", to: "/app/event-library", icon: ListChecks },
        { label: "Thông báo", to: "/app/notifications", icon: Bell },
      ],
    },
  ],
};

export function Sidebar() {
  const role = useApp((s) => s.role);
  const groups = NAV[role];
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-72 shrink-0 bg-white border-r border-[#EEF2F7] min-h-screen px-4 py-6 flex flex-col gap-5 sticky top-0">
      <Link to="/app" className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-xl bg-[#0057C2] flex items-center justify-center text-white font-bold text-sm">
          5T
        </div>
        <div>
          <div className="font-bold text-brand-deep leading-tight text-[15px]">5TOT Platform</div>
          <div className="text-[11px] text-muted-foreground">Sinh viên 5 tốt • 2025–2026</div>
        </div>
      </Link>

      <RoleSwitcher />

      <nav className="flex flex-col gap-5 overflow-y-auto pr-1">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 px-3 mb-2 font-semibold">
              {g.group}
            </div>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
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
        <Link
          to="/login"
          className="flex items-center gap-2 px-3 py-2 text-[13px] text-muted-foreground hover:text-brand-deep"
        >
          <LogOut className="w-4 h-4" /> Đăng xuất / Đổi vai trò
        </Link>
      </div>
    </aside>
  );
}

function RoleSwitcher() {
  const role = useApp((s) => s.role);
  const setRole = useApp((s) => s.setRole);
  const officerId = useApp((s) => s.currentOfficerId);
  const setOfficerId = useApp((s) => s.setCurrentOfficerId);
  const r = ROLES[role];
  const officer = OFFICERS.find((o) => o.id === officerId);
  const officerCrit = officer ? CRITERIA.find((c) => c.key === officer.specializedCriteria[0]) : undefined;
  return (
    <div className="rounded-xl border border-[#EEF2F7] p-3 mx-1">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2 px-1 font-semibold">
        Đang đăng nhập
      </div>
      <div className="flex items-center gap-3 px-1 mb-3">
        <div className="w-9 h-9 rounded-lg bg-[#0057C2] text-white flex items-center justify-center font-bold text-xs shrink-0">{r.initial}</div>
        <div className="min-w-0">
          <div className="font-semibold text-brand-deep text-[13px] truncate">{role === "officer" && officer ? officer.name : r.label}</div>
          <div className="text-[11px] text-muted-foreground truncate">{role === "officer" && officerCrit ? `Phụ trách ${officerCrit.label}` : r.desc}</div>
        </div>
      </div>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="w-full text-[12px] rounded-lg bg-[#F1F7FD] px-3 py-2 font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#0057C2]/40"
      >
        {Object.entries(ROLES).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
      {role === "officer" && (
        <select
          value={officerId}
          onChange={(e) => setOfficerId(e.target.value)}
          className="mt-2 w-full text-[12px] rounded-lg bg-[#F1F7FD] px-3 py-2 font-medium text-brand-deep focus:outline-none focus:ring-2 focus:ring-[#0057C2]/40"
        >
          {OFFICERS.map((o) => (
            <option key={o.id} value={o.id}>{o.name} — {o.role}</option>
          ))}
        </select>
      )}
    </div>
  );
}
