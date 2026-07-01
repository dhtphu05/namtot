import { useAuth } from "@/features/auth/store/auth-store";
import { ENABLE_DEMO_ROLE_SWITCH, isUiRole, toUiRole } from "@/features/auth/role-map";
import { useApp } from "@/lib/store";

export function StudentRoleSurface({
  student,
  fallback,
}: {
  student: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const user = useAuth((s) => s.user);
  const storedRole = useApp((s) => s.role);
  const authenticatedRole = user ? toUiRole(user.role) : "student";
  const role = ENABLE_DEMO_ROLE_SWITCH && isUiRole(storedRole) ? storedRole : authenticatedRole;

  return role === "student" ? student : fallback;
}
