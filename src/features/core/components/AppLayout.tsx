import { Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { motion } from "framer-motion";
import { useAuth } from "@/features/auth/store/auth-store";



export function AppLayout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8 max-w-[1500px] mx-auto w-full">
        <motion.div
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
