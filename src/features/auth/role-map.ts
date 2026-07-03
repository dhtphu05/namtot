import type { Role as ApiRole } from "@/lib/api/types";
import type { Role as UiRole } from "@/lib/mock-data";

export const ENABLE_DEMO_ROLE_SWITCH =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ROLE_SWITCH === "true";

export function toUiRole(role: ApiRole): UiRole {
  if (role === "class_representative") return "collective";
  if (role === "officer") return "officer";
  if (role === "manager" || role === "committee" || role === "admin") {
    return "manager";
  }
  return "student";
}

export function isUiRole(role: string): role is UiRole {
  return (
    role === "student" ||
    role === "officer" ||
    role === "manager" ||
    role === "collective"
  );
}

export function getRoleLabel(role: ApiRole): string {
  if (role === "student") return "Sinh viên";
  if (role === "class_representative") return "Tập thể / Chi hội";
  if (role === "officer") return "Cán bộ xét duyệt";
  if (role === "admin") return "Quản trị hệ thống";
  return "Hội đồng / Cấp quản lý";
}
