import type { Criterion } from "@/lib/api/types";
import type { ApprovedEvidenceSearchItem } from "@/types/evidence";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";

export const criterionCopy: Record<string, string> = {
  all: "Tất cả",
  ethics: getCoreCriterionLabel("ethics"),
  academic: getCoreCriterionLabel("academic"),
  physical: getCoreCriterionLabel("physical"),
  volunteer: getCoreCriterionLabel("volunteer"),
  integration: getCoreCriterionLabel("integration"),
};

export const criterionOptions: Array<{ value: Criterion | "all"; label: string }> = [
  { value: "all", label: "Tất cả tiêu chí" },
  { value: "ethics", label: "Đạo đức" },
  { value: "academic", label: "Học tập" },
  { value: "physical", label: "Thể lực" },
  { value: "volunteer", label: "Tình nguyện" },
  { value: "integration", label: "Hội nhập" },
];

export const levelCopy: Record<string, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

export function formatEventDateRange(startDate?: string | null, endDate?: string | null) {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  if (!start && !end) return null;
  if (!end || start === end) return start;
  if (!start) return end;
  return `${start} - ${end}`;
}

export function formatImportedValue(item: ApprovedEvidenceSearchItem) {
  const value = item.event.convertedValue ?? item.participant.convertedValue;
  if (value === null || value === undefined) return null;
  return `${value}${item.event.convertedUnit ? ` ${item.event.convertedUnit}` : ""}`;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
