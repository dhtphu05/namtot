import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authApi } from "@/features/auth/api/auth";
import { getUserRoleLabel, toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { useApp } from "@/lib/store";
import hsvvnEmblemUrl from "@/assets/hsvvn-emblem.webp";

export function AppHeader() {
  const user = useAuth((state) => state.user);
  const refreshToken = useAuth((state) => state.refreshToken);
  const clearAuth = useAuth((state) => state.clearAuth);
  const setRole = useApp((state) => state.setRole);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const role = user ? toUiRole(user.role) : "student";
  const { data } = useNotifications({ page: 1, limit: 20 });
  const notifications = Array.isArray(data) ? data : [];
  const unread = notifications.filter((item) => !item.readAt).length;

  async function logout() {
    setIsLoggingOut(true);
    try {
      await authApi.logout(refreshToken ?? undefined);
    } catch {
      // The local session still needs to end if the server is unavailable.
    } finally {
      if (typeof window !== "undefined") window.localStorage.removeItem("5tot-auth");
      clearAuth();
      queryClient.clear();
      setRole("student");
      await navigate({ to: "/login" });
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 sm:px-6">
      <Link
        to="/app"
        aria-label="Về trang chính 5TOT Đà Nẵng"
        className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
      >
        <img
          src={hsvvnEmblemUrl}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 shrink-0 object-contain"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-5 text-[var(--text-primary)]">
            5TOT Đà Nẵng
          </span>
          <span className="hidden text-[11px] leading-4 text-[var(--text-muted)] sm:block">
            Hội Sinh viên Việt Nam
          </span>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative text-[var(--brand-primary)]"
        >
          <Link
            to={role === "student" ? "/app/feedback" : "/app/notifications"}
            aria-label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
          >
            <Bell aria-hidden="true" />
            {unread > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--status-danger)] px-1 text-[10px] font-bold leading-none text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 min-w-0 gap-2 px-2 text-[var(--text-primary)]"
              aria-label="Menu tài khoản"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-xs font-bold text-[var(--brand-primary)]">
                {getInitials(user?.fullName ?? "Tài khoản")}
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-40 truncate text-xs font-semibold leading-4">
                  {user?.fullName ?? "Tài khoản"}
                </span>
                <span className="block max-w-40 truncate text-[11px] leading-4 text-[var(--text-muted)]">
                  {user ? getUserRoleLabel(user) : ""}
                </span>
              </span>
              <ChevronDown className="hidden h-4 w-4 shrink-0 text-[var(--text-muted)] sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                {user?.fullName ?? "Tài khoản"}
              </span>
              <span className="block truncate text-xs text-[var(--text-secondary)]">
                {user?.email ?? ""}
              </span>
              {user?.workspace?.name ? (
                <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">
                  {user.workspace.name}
                </span>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isLoggingOut}
              onSelect={(event) => {
                event.preventDefault();
                void logout();
              }}
            >
              <LogOut aria-hidden="true" />
              {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
