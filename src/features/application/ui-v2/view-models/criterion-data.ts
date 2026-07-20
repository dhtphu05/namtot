import {
  getRequirementChipLabel,
  getRequirementPresentation,
} from "@/features/application/presentation";
import type { RequirementGroup, RequirementItem } from "@/lib/api/types";

export function getOptionalAchievementCopy(group?: Pick<RequirementGroup, "optional"> | null) {
  return group?.optional !== false
    ? "Không bắt buộc ở cấp hiện tại"
    : "Cần bổ sung theo cấu hình hiện tại";
}

export function getSafeRequirementLabel(
  requirement?: Pick<RequirementItem, "key" | "title" | "description"> | null,
) {
  const presentation = getRequirementPresentation(requirement as RequirementItem | null);
  const chipLabel = getRequirementChipLabel(requirement?.key);
  const label = presentation.label || chipLabel;
  if (!label || label === requirement?.key || label.includes("_")) {
    return chipLabel && !chipLabel.includes("_") ? chipLabel : "Thành tích khác";
  }
  return label;
}

export function validateConductScoreValue(rawValue: string) {
  const value = Number(rawValue);
  if (!rawValue || !Number.isFinite(value)) return "Vui lòng nhập điểm rèn luyện hợp lệ.";
  if (value < 0 || value > 100) return "Điểm rèn luyện phải nằm trong khoảng 0-100.";
  return null;
}

export function validateAcademicGpaValue(rawValue: string, scale: 4 | 10) {
  const value = Number(rawValue);
  if (!rawValue || !Number.isFinite(value)) return "Vui lòng nhập GPA/ĐTB hợp lệ.";
  if (value < 0 || value > scale) return `GPA/ĐTB phải nằm trong khoảng 0-${scale}.`;
  return null;
}
