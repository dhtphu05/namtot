import { Bell, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

export function TopBar({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { data } = useNotifications({ page: 1, limit: 20 });
  const items = Array.isArray(data) ? data : [];
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3 bg-[#F6F8FB]/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="min-w-0 flex-1">
        <h1 className="text-[22px] md:text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-[#64748B] mt-1">{subtitle}</p>}
      </div>
      <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-3">
        <div className="hidden w-56 max-w-full items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:flex xl:w-72">
          <Search className="w-4 h-4 text-[#94A3B8]" />
          <input
            placeholder="Tìm hồ sơ, minh chứng, sự kiện, sinh viên..."
            className="min-w-0 bg-transparent text-[13px] w-full focus:outline-none"
          />
        </div>
        <Link
          to="/app/notifications"
          className="relative w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-[#0057C2] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-[#EAF3FF] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>
        {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
