import { Bell, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useNotifications } from "@/features/core/hooks/useNotifications";

export function TopBar({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const { data } = useNotifications({ page: 1, limit: 20 });
  const items = Array.isArray(data?.items) ? data.items : [];
  const unread = items.filter((item) => !item.readAt).length;
  return (
    <header className="flex items-center justify-between gap-6 mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] md:text-[26px] font-bold text-brand-deep tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#EEF2F7] w-72">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Tìm hồ sơ, minh chứng, sự kiện, sinh viên..."
            className="bg-transparent text-[13px] w-full focus:outline-none"
          />
        </div>
        <Link
          to="/app/notifications"
          className="relative w-10 h-10 rounded-lg bg-white border border-[#EEF2F7] flex items-center justify-center text-brand-deep hover:bg-[#F1F7FD] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>
        {action}
      </div>
    </header>
  );
}
