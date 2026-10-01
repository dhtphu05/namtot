import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { AppHeader } from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { SkipLink } from "@/components/layout/SkipLink";
import { StudentAppShell } from "@/components/layout/StudentAppShell";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";

export function AppShell() {
  const reduceMotion = useReducedMotion();
  const user = useAuth((state) => state.user);
  const role = user ? toUiRole(user.role) : "student";
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  if (role === "student") {
    return <StudentAppShell />;
  }

  return (
    <div className="flex h-[100dvh] min-w-0 overflow-hidden bg-[var(--surface-app)] text-[var(--text-primary)]">
      <SkipLink />
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader onOpenNavigation={() => setMobileNavigationOpen(true)} />
        <motion.div
          id="app-content"
          tabIndex={-1}
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-20 pt-0 sm:px-5 lg:px-7"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          key={typeof window !== "undefined" ? window.location.pathname : ""}
        >
          <div className="mx-auto min-w-0 max-w-[1280px]">
            <Outlet />
          </div>
        </motion.div>
      </main>
      <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent
          side="left"
          className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden border-r-0 bg-white p-0 md:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Điều hướng chính</SheetTitle>
            <SheetDescription>Liên kết đến các khu vực của hệ thống 5TOT Đà Nẵng.</SheetDescription>
          </SheetHeader>
          <Sidebar variant="mobile" onNavigate={() => setMobileNavigationOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
