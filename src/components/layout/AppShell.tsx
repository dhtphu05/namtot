import { Outlet } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";
import { StudentAppShell } from "@/components/layout/StudentAppShell";
import { toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";

export function AppShell() {
  const user = useAuth((state) => state.user);
  const role = user ? toUiRole(user.role) : "student";

  if (role === "student") {
    return <StudentAppShell />;
  }

  return (
    <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-[var(--surface-app)] text-[var(--text-primary)]">
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <motion.div
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-20 pt-0 sm:px-5 lg:px-7"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          key={typeof window !== "undefined" ? window.location.pathname : ""}
        >
          <div className="mx-auto min-w-0 max-w-[1280px]">
            <Outlet />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
