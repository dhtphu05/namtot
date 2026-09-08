import type { Role } from "@/lib/api/types";

const criteriaSettingsRoles: Role[] = ["manager", "committee", "admin"];

export function canManageCriteriaSettings(role?: Role | null) {
  return Boolean(role && criteriaSettingsRoles.includes(role));
}
