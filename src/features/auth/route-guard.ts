import { redirect } from "@tanstack/react-router";
import { authApi } from "@/features/auth/api/auth";
import { useAuth } from "@/features/auth/store/auth-store";
import { toUiRole } from "@/features/auth/role-map";
import { useApp } from "@/lib/store";
import type { Role } from "@/lib/api/types";

const studentRoutes = [
  "/app/drafts",
  "/app/upload",
  "/app/ai-precheck",
  "/app/cascade",
  "/app/ekyc",
  "/app/chatbot",
  "/app/wizard",
];

const officerRoutes = ["/app/queue", "/app/evidence-search", "/app/review"];
const managerRoutes = ["/app/assignment", "/app/analytics", "/app/vnpt", "/app/audit", "/app/export", "/app/settings"];
const collectiveRoutes = ["/app/collective"];

const sharedAuthenticatedRoutes = ["/app/notifications"];
const sharedStudentCollectiveRoutes = ["/app/evidence", "/app/event-library"];
const eventRegistryRoles: Role[] = ["officer", "manager", "committee", "admin"];
const resolutionRoles: Role[] = ["manager", "committee", "admin"];
const reviewRoles: Role[] = ["officer", "manager", "committee", "admin"];

export async function requireAuthenticatedAppRoute(pathname: string) {
  if (typeof window === "undefined") return;

  const { accessToken } = useAuth.getState();
  if (!accessToken) {
    throw redirect({ to: "/login" });
  }

  let role: Role;
  try {
    const me = await authApi.getMe();
    useAuth.getState().setUser(me.data);
    useApp.getState().setRole(toUiRole(me.data.role));
    role = me.data.role;
  } catch (error) {
    useAuth.getState().clearAuth();
    useApp.getState().setRole("student");
    throw redirect({ to: "/login" });
  }

  if (!canAccessPath(role, pathname)) {
    throw redirect({ to: "/app" });
  }
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (pathname === "/app" || pathname === "/app/") return true;
  if (matchesAny(pathname, sharedAuthenticatedRoutes)) return true;
  if (matchesAny(pathname, sharedStudentCollectiveRoutes)) {
    return role === "student" || role === "class_representative";
  }
  if (matchesAny(pathname, studentRoutes)) return role === "student";
  if (matchesAny(pathname, collectiveRoutes)) return role === "class_representative";
  if (matchesAny(pathname, officerRoutes)) return reviewRoles.includes(role);
  if (matchesAny(pathname, managerRoutes)) return role === "manager" || role === "committee" || role === "admin";
  if (pathname.startsWith("/app/event-registry")) return eventRegistryRoles.includes(role);
  if (pathname.startsWith("/app/resolution")) return resolutionRoles.includes(role);

  return false;
}

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
