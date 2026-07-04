import type { Role as ApiRole } from "@/lib/api/types";
import type { Role as UiRole } from "@/lib/mock-data";
import type { Criterion, SafeUser } from "@/lib/api/types";

export const ENABLE_DEMO_ROLE_SWITCH =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ROLE_SWITCH === "true";

export function toUiRole(role: ApiRole): UiRole {
  if (role === "class_representative") return "collective";
  if (role === "officer") return "officer";
  if (role === "manager" || role === "committee" || role === "admin") return "manager";
  return "student";
}

export function getDefaultAppPathForRole(role: ApiRole): string {
  if (role === "student") return "/app/drafts";
  if (role === "class_representative") return "/app/collective";
  if (role === "officer") return "/app/queue";
  if (role === "manager" || role === "committee" || role === "admin") return "/app/analytics";
  return "/app/drafts";
}

export function isUiRole(role: string): role is UiRole {
  return role === "student" || role === "officer" || role === "manager" || role === "collective";
}

export function getRoleLabel(role: ApiRole): string {
  if (role === "student") return "Sinh viên";
  if (role === "class_representative") return "Tập thể / Chi hội";
  if (role === "officer") return "Cán bộ xét duyệt";
  if (role === "admin") return "Quản trị hệ thống";
  return "Hội đồng / Cấp quản lý";
}

const officerCriterionLabel: Partial<Record<Criterion, string>> = {
  ethics: "Đạo đức",
  academic: "Học tập",
  physical: "Thể lực",
  volunteer: "Tình nguyện",
  integration: "Hội nhập",
};

const allOfficerCriteria: Criterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
];

const demoAllCriteriaOfficerEmail = "officer.academic@dut.udn.vn";

export function getUserRoleLabel(user: SafeUser | null | undefined): string {
  if (!user) return "Sinh viên";
  return getRoleLabel(user.role);
}

export function getUserAssignmentLabel(user: SafeUser | null | undefined): string {
  if (!user) return "Sinh viên";
  if (user.role !== "officer") return getRoleLabel(user.role);

  const criteria =
    user.email === demoAllCriteriaOfficerEmail
      ? allOfficerCriteria
      : (user.officerSpecializations ?? []).map((item) => item.criterion);

  const uniqueCriteria = Array.from(new Set(criteria));
  const coversAllCriteria = allOfficerCriteria.every((criterion) =>
    uniqueCriteria.includes(criterion),
  );

  if (coversAllCriteria) return "5 tiêu chí xét duyệt";

  const labels = uniqueCriteria
    .map((criterion) => officerCriterionLabel[criterion])
    .filter((label): label is string => Boolean(label));

  if (labels.length) return labels.join(", ");
  return "Chưa phân công tiêu chí";
}
