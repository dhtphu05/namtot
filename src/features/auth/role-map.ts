import type { Role as ApiRole } from "@/lib/api/types";
import { ROLES, type Role as UiRole } from "@/lib/mock-data";
import type { Criterion, SafeUser } from "@/lib/api/types";

export const ENABLE_DEMO_ROLE_SWITCH =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ROLE_SWITCH === "true";

export function toUiRole(role: ApiRole): UiRole {
  if (role === "class_representative") return "collective";
  return role;
}

export function getDefaultAppPathForRole(role: ApiRole): string {
  if (role === "student") return "/app";
  if (role === "data_uploader") return "/app/data-uploader";
  if (role === "class_representative") return "/app/collective";
  if (role === "officer" || role === "city_officer") return "/app/queue";
  if (role === "city_committee") return "/app/resolution";
  if (role === "admin") return "/app/admin/workspaces";
  if (role === "manager" || role === "committee" || role === "city_manager") {
    return "/app/analytics";
  }
  return "/app";
}

export function isUiRole(role: string): role is UiRole {
  return Object.prototype.hasOwnProperty.call(ROLES, role);
}

export function getRoleLabel(role: ApiRole): string {
  if (role === "student") return "Sinh viên";
  if (role === "class_representative") return "Tập thể / Chi hội";
  if (role === "data_uploader") return "Cán bộ nhập liệu";
  if (role === "officer") return "Cán bộ xét duyệt";
  if (role === "city_officer") return "Cán bộ xét duyệt thành phố";
  if (role === "city_manager") return "Quản lý thành phố";
  if (role === "city_committee") return "Hội đồng thành phố";
  if (role === "manager") return "Quản lý trường";
  if (role === "committee") return "Hội đồng trường";
  if (role === "admin") return "Quản trị hệ thống";
  return role;
}

const officerCriterionLabel: Partial<Record<Criterion, string>> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
};

const officerCriterionOrder: Criterion[] = [
  "academic",
  "ethics",
  "physical",
  "volunteer",
  "integration",
];

const demoOfficerCriterionByEmail: Partial<Record<string, Criterion>> = {
  "officer.academic@dut.udn.vn": "academic",
  "officer.ethics@dut.udn.vn": "ethics",
  "officer.physical@dut.udn.vn": "physical",
  "officer.volunteer@dut.udn.vn": "volunteer",
  "officer.integration@dut.udn.vn": "integration",
};

export function getOfficerLockedCriterion(user: SafeUser | null | undefined): Criterion | null {
  if (!user || (user.role !== "officer" && user.role !== "city_officer")) return null;

  const activeCriteria = Array.from(
    new Set(
      (user.officerSpecializations ?? [])
        .filter((item) => item.isActive !== false)
        .map((item) => item.criterion)
        .filter((criterion) => officerCriterionOrder.includes(criterion)),
    ),
  );

  const backendCriterion = officerCriterionOrder.find((criterion) =>
    activeCriteria.includes(criterion),
  );
  if (backendCriterion) return backendCriterion;

  return demoOfficerCriterionByEmail[user.email] ?? null;
}

export function getUserRoleLabel(user: SafeUser | null | undefined): string {
  if (!user) return "Sinh viên";
  return getRoleLabel(user.role);
}

export function getUserAssignmentLabel(user: SafeUser | null | undefined): string {
  if (!user) return "Sinh viên";
  if (user.role !== "officer" && user.role !== "city_officer") {
    return getRoleLabel(user.role);
  }

  const lockedCriterion = getOfficerLockedCriterion(user);
  if (lockedCriterion) return officerCriterionLabel[lockedCriterion] ?? getRoleLabel(user.role);
  return "Chưa phân công tiêu chí";
}
