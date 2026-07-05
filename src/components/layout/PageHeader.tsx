import { Bell, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  searchPlaceholder?: string;
  showSearch?: boolean;
};

export function PageHeader({
  title,
  subtitle,
  action,
  searchPlaceholder,
  showSearch,
}: PageHeaderProps) {
  const user = useAuth((state) => state.user);
  const role = user ? toUiRole(user.role) : "student";
  const { data } = useNotifications({ page: 1, limit: 20 });
  const items = Array.isArray(data) ? data : [];
  const unread = items.filter((item) => !item.readAt).length;
  const shouldShowSearch = showSearch ?? role !== "student";
  const placeholder =
    searchPlaceholder ??
    (role === "student"
      ? "Tìm minh chứng hoặc hỏi trợ lý SV5T..."
      : "Tìm MSSV, sinh viên, minh chứng, tiêu chí...");

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-5 bg-[var(--surface-app)]/95 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.05)] backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
      <div className="mx-auto flex min-h-12 max-w-[1280px] min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-bold leading-tight text-[var(--text-primary)] md:text-[24px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--text-secondary)] md:line-clamp-1">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {shouldShowSearch ? (
            <div className="hidden h-9 w-60 max-w-full items-center gap-2 rounded-xl bg-white px-3 shadow-[0_0_0_1px_rgba(15,23,42,0.07)] lg:flex xl:w-72">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                placeholder={placeholder}
                className="min-w-0 w-full bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[#94A3B8]"
              />
            </div>
          ) : null}
          <Link
            to={role === "student" ? "/app/feedback" : "/app/notifications"}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[var(--brand-primary)] shadow-[0_0_0_1px_rgba(15,23,42,0.07)] transition-colors hover:bg-[var(--brand-primary-soft)] focus:outline-none focus:ring-2 focus:ring-[#0057C2]/25"
            aria-label="Thông báo"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            ) : null}
          </Link>
          {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
        </div>
      </div>
    </header>
  );
}
