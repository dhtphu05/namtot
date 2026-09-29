import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpenCheck, FileText, LayoutDashboard, LifeBuoy, Trophy } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { SkipLink } from "@/components/layout/SkipLink";
import { UserWorkspaceInfo } from "@/components/layout/UserWorkspaceInfo";
import { ApplicationContextBar } from "@/features/application/ui-v2/components";
import { useAuth } from "@/features/auth/store/auth-store";
import { StudentPageShell } from "@/features/student/components/primitives";
import { STUDENT_APPLICATION_UI_V2 } from "@/lib/student-application-ui-v2";

const mobileItems = [
  { label: "Tổng quan", to: "/app", icon: LayoutDashboard },
  { label: "Hồ sơ", to: "/app/application", icon: FileText },
  { label: "Kho minh chứng", to: "/app/event-library", icon: BookOpenCheck },
  { label: "Kết quả", to: "/app/result", icon: Trophy },
  { label: "Trợ lý", to: "/app/assistant", icon: LifeBuoy },
];

export function StudentAppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const user = useAuth((s) => s.user);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`flex h-[100dvh] min-w-0 overflow-hidden text-[var(--text-primary)] ${
        STUDENT_APPLICATION_UI_V2 ? "bg-[var(--student-v2-surface-app)]" : "bg-[var(--surface-app)]"
      }`}
    >
      <SkipLink />
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader />
        <motion.div
          id="app-content"
          tabIndex={-1}
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-24 pt-0 md:pb-20"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22 }}
          key={typeof window !== "undefined" ? window.location.pathname : ""}
        >
          <StudentPageShell
            className={
              STUDENT_APPLICATION_UI_V2 ? "max-w-[1280px] px-4 sm:px-6 lg:px-8" : undefined
            }
          >
            {STUDENT_APPLICATION_UI_V2 ? (
              <ApplicationContextBar
                workspaceName={user?.workspace?.name}
                workspaceShortName={user?.workspace?.shortName}
                className="mb-3 md:hidden"
              />
            ) : (
              <UserWorkspaceInfo user={user} variant="mobile" className="mb-3 md:hidden" />
            )}
            <Outlet />
          </StudentPageShell>
        </motion.div>
        <nav className="shrink-0 border-t border-slate-200 bg-white px-2 py-2 md:hidden">
          <ul className="grid grid-cols-5 gap-1">
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
  if (pathname.startsWith("/app/event-library")) return "/app/event-library";
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
