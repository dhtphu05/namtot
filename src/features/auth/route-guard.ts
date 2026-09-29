import { redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { authKeys, meQueryOptions } from "@/features/auth/hooks/useMe";
import { useAuth, waitForAuthHydration } from "@/features/auth/store/auth-store";
import { getDefaultAppPathForRole, toUiRole } from "@/features/auth/role-map";
import { useApp } from "@/lib/store";
import type { Role, SafeUser } from "@/lib/api/types";

const studentRoutes = [
  "/app/overview",
  "/app/application",
  "/app/my-application",
  "/app/profile",
  "/app/feedback",
  "/app/result",
  "/app/assistant",
  "/app/drafts",
  "/app/upload",
  "/app/ai-precheck",
  "/app/cascade",
  "/app/ekyc",
  "/app/wizard",
];

const officerRoutes = ["/app/queue", "/app/evidence-search", "/app/review"];
const evidenceKnowledgeRoutes = ["/app/evidence-knowledge"];
const studentOrCollectiveRoutes = ["/app/upload", "/app/ai-precheck"];
const managerRoutes = [
  "/app/assignment",
  "/app/analytics",
  "/app/committee",
  "/app/manager",
  "/app/vnpt",
  "/app/ekyc",
  "/app/smartux",
  "/app/audit",
  "/app/export",
  "/app/settings",
];
const cityManagerRoutes = [
  "/app/assignment",
  "/app/analytics",
  "/app/manager/results",
  "/app/manager/collective",
  "/app/audit",
  "/app/export",
];
const cityCommitteeRoutes = [
  "/app/manager/results",
  "/app/manager/collective",
  "/app/audit",
  "/app/export",
];
const collectiveRoutes = ["/app/collective"];
const adminRoutes = ["/app/admin"];
const dataUploaderRoutes = ["/app/data-uploader"];
const awardRegistryRoutes = ["/app/award-registry"];

const sharedAuthenticatedRoutes = ["/app/notifications", "/app/chatbot"];
const studentEvidenceRoutes = ["/app/evidence", "/app/event-library"];
const eventRegistryRoles: Role[] = [
  "officer",
  "manager",
  "committee",
  "city_officer",
  "city_manager",
  "city_committee",
  "admin",
];
const decisionImportRoles: Role[] = ["officer", "manager", "committee", "admin"];
const evidenceKnowledgeRoles: Role[] = ["officer", "manager", "committee", "admin"];
const resolutionRoles: Role[] = [
  "officer",
  "manager",
  "committee",
  "city_officer",
  "city_manager",
  "city_committee",
  "admin",
];
const reviewRoles: Role[] = [
  "officer",
  "manager",
  "committee",
  "city_officer",
  "city_manager",
  "admin",
];

export async function requireAuthenticatedAppRoute(pathname: string, queryClient: QueryClient) {
  if (typeof window === "undefined") {
    return;
  }

  await waitForAuthHydration();

  const { accessToken, user: authUser } = useAuth.getState();
  if (!accessToken) {
    throw redirect({ to: "/login" });
  }

  let role: Role;
  try {
    const cachedUser = queryClient.getQueryData<SafeUser>(authKeys.me);
    const canUseCachedUser = Boolean(cachedUser && (!authUser || cachedUser.id === authUser.id));
    const me = canUseCachedUser ? cachedUser : await queryClient.fetchQuery(meQueryOptions);
    if (!me) {
      throw new Error("User session is missing profile data");
    }
    if (me.role !== "admin" && !me.workspaceId) {
      throw new Error("User account is missing workspace configuration");
    }
    useAuth.getState().setUser(me);
    useApp.getState().setRole(toUiRole(me.role));
    role = me.role;
  } catch (error) {
    useAuth.getState().clearAuth();
    queryClient.removeQueries({ queryKey: authKeys.me });
    useApp.getState().setRole("student");
    throw redirect({ to: "/login" });
  }

  if ((pathname === "/app" || pathname === "/app/") && role !== "student") {
    throw redirect({ to: getDefaultAppPathForRole(role) });
  }

  if (matchesAny(pathname, adminRoutes) && role !== "admin") {
    useAuth.getState().clearAuth();
    queryClient.removeQueries({ queryKey: authKeys.me });
    useApp.getState().setRole("student");
    throw redirect({ to: "/login" });
  }

  if (!canAccessPath(role, pathname)) {
    throw redirect({ to: getDefaultAppPathForRole(role) });
  }
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (pathname === "/app" || pathname === "/app/") return true;
  if (matchesAny(pathname, sharedAuthenticatedRoutes)) return true;
  if (pathname === "/app/analytics") {
    return ["city_manager", "manager", "committee", "admin"].includes(role);
  }
  if (matchesAny(pathname, dataUploaderRoutes)) return role === "data_uploader";
  if (matchesAny(pathname, awardRegistryRoutes))
    return role === "data_uploader" || role === "admin";
  if (matchesAny(pathname, studentOrCollectiveRoutes)) {
    return role === "student" || role === "class_representative";
  }
  if (matchesAny(pathname, studentEvidenceRoutes)) return role === "student";
  if (matchesAny(pathname, studentRoutes)) return role === "student";
  if (matchesAny(pathname, collectiveRoutes)) return role === "class_representative";
  if (matchesAny(pathname, adminRoutes)) return role === "admin";
  if (matchesAny(pathname, officerRoutes)) return reviewRoles.includes(role);
  if (matchesAny(pathname, evidenceKnowledgeRoutes)) return evidenceKnowledgeRoles.includes(role);
  if (pathname === "/app/manager/results") {
    return ["city_manager", "city_committee", "manager", "committee", "admin"].includes(role);
  }
  if (pathname.startsWith("/app/manager/results/")) {
    return ["city_manager", "city_committee", "manager", "committee", "admin"].includes(role);
  }
  if (matchesAny(pathname, cityCommitteeRoutes)) {
    return role === "city_committee" || role === "city_manager";
  }
  if (matchesAny(pathname, cityManagerRoutes)) return role === "city_manager";
  if (matchesAny(pathname, managerRoutes))
    return role === "manager" || role === "committee" || role === "admin";
  if (pathname.startsWith("/app/event-registry")) return eventRegistryRoles.includes(role);
  if (pathname.startsWith("/app/decision-imports")) return decisionImportRoles.includes(role);
  if (pathname.startsWith("/app/resolution")) return resolutionRoles.includes(role);

  return false;
}

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
