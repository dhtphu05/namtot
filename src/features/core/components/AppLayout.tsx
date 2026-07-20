import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { authKeys, meQueryOptions } from "@/features/auth/hooks/useMe";
import { canAccessPath } from "@/features/auth/route-guard";
import { getDefaultAppPathForRole, toUiRole } from "@/features/auth/role-map";
import { useAuth, waitForAuthHydration } from "@/features/auth/store/auth-store";
import { useApp } from "@/lib/store";

export function AppLayout() {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    async function verifyAccess() {
      setIsCheckingAccess(true);
      await waitForAuthHydration();

      const auth = useAuth.getState();
      if (!auth.accessToken) {
        if (isMounted) {
          void navigate({ to: "/login", replace: true });
        }
        return;
      }

      try {
        const me = await queryClient.fetchQuery(meQueryOptions);
        if (!me) {
          throw new Error("User session is missing profile data");
        }
        if (me.role !== "admin" && !me.workspaceId) {
          throw new Error("User account is missing workspace configuration");
        }

        useAuth.getState().setUser(me);
        useApp.getState().setRole(toUiRole(me.role));

        const defaultPath = getDefaultAppPathForRole(me.role);
        if ((pathname === "/app" || pathname === "/app/") && me.role !== "student") {
          if (isMounted) {
            void navigate({ to: defaultPath, replace: true });
          }
          return;
        }

        if (pathname === "/app/admin" || pathname.startsWith("/app/admin/")) {
          if (me.role !== "admin") {
            useAuth.getState().clearAuth();
            queryClient.removeQueries({ queryKey: authKeys.me });
            useApp.getState().setRole("student");
            if (isMounted) {
              void navigate({ to: "/login", replace: true });
            }
            return;
          }
        }

        if (!canAccessPath(me.role, pathname)) {
          if (isMounted) {
            void navigate({ to: defaultPath, replace: true });
          }
          return;
        }

        if (isMounted) {
          setIsCheckingAccess(false);
        }
      } catch {
        useAuth.getState().clearAuth();
        queryClient.removeQueries({ queryKey: authKeys.me });
        useApp.getState().setRole("student");
        if (isMounted) {
          void navigate({ to: "/login", replace: true });
        }
      }
    }

    void verifyAccess();

    return () => {
      isMounted = false;
    };
  }, [navigate, pathname, queryClient]);

  if (isCheckingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB] text-sm font-semibold text-[#64748B]">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return <AppShell />;
}
