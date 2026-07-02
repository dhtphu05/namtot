import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { motion } from "framer-motion";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F6F9FC]">
      <Sidebar />
      <main className="h-screen min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-8 md:py-8">
        <motion.div
          className="w-full max-w-[1500px]"
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
