import { Outlet } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell() {
  return (
    <div className="flex h-screen min-w-0 overflow-hidden bg-[var(--surface-app)] text-[var(--text-primary)]">
      <Sidebar />
      <main className="h-screen min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-20 pt-0 sm:px-5 lg:px-7">
        <motion.div
          className="mx-auto min-w-0 max-w-[1280px]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          key={typeof window !== "undefined" ? window.location.pathname : ""}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
