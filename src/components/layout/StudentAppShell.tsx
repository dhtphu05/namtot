import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Bell, FileText, LayoutDashboard, LifeBuoy } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { StudentPageShell } from "@/features/student/components/primitives";

const mobileItems = [
  { label: "Tổng quan", to: "/app", icon: LayoutDashboard },
  { label: "Hồ sơ", to: "/app/application", icon: FileText },
  { label: "Phản hồi", to: "/app/feedback", icon: Bell },
  { label: "Trợ lý", to: "/app/assistant", icon: LifeBuoy },
];

export function StudentAppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-[var(--surface-app)] text-[var(--text-primary)]">
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <motion.div
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-24 pt-0 md:pb-20"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          key={typeof window !== "undefined" ? window.location.pathname : ""}
        >
          <StudentPageShell>
            <Outlet />
          </StudentPageShell>
        </motion.div>
        <nav className="shrink-0 border-t border-slate-200 bg-white px-2 py-2 md:hidden">
          <ul className="grid grid-cols-4 gap-1">
            {mobileItems.map((item) => {
              const Icon = item.icon;
              const active = isActiveStudentPath(pathname, item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold transition-colors ${
                      active
                        ? "bg-[#EAF3FF] text-[#0057C2]"
                        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0057C2]"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    <span className="max-w-full truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </main>
    </div>
  );
}

function isActiveStudentPath(pathname: string, to: string) {
  const normalized = normalizeStudentPath(pathname);
  return normalized === to || (to !== "/app" && normalized.startsWith(`${to}/`));
}

function normalizeStudentPath(pathname: string) {
  if (pathname === "/app/overview") return "/app";
  if (
    pathname.startsWith("/app/drafts") ||
    pathname.startsWith("/app/evidence") ||
    pathname.startsWith("/app/wizard") ||
    pathname.startsWith("/app/upload") ||
    pathname.startsWith("/app/profile") ||
    pathname.startsWith("/app/my-application")
  ) {
    return "/app/application";
  }
  if (pathname.startsWith("/app/notifications")) return "/app/feedback";
  if (pathname.startsWith("/app/chatbot")) return "/app/assistant";
  return pathname;
}
