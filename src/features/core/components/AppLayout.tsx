import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { motion } from "framer-motion";

export function AppLayout() {
  return (
    <div className="flex h-screen min-w-0 overflow-hidden bg-[#F6F8FB]">
      <Sidebar />
      <main className="h-screen min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-6 pt-2 sm:px-5 md:px-8">
        <motion.div
          className="mx-auto min-w-0 max-w-[1500px]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          key={typeof window !== "undefined" ? window.location.pathname : ""}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
