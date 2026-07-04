import type { Criterion } from "@/lib/api/types";
import type { ApprovedEvidenceSearchItem } from "@/types/evidence";

export const criterionCopy: Record<string, string> = {
  all: "Tất cả",
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
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
  if (start === "--" && end === "--") return "--";
  if (end === "--" || start === end) return start;
  return `${start} - ${end}`;
}

export function formatImportedValue(item: ApprovedEvidenceSearchItem) {
  if (item.event.convertedValue === null || item.event.convertedValue === undefined) return "--";
  return `${item.event.convertedValue}${item.event.convertedUnit ? ` ${item.event.convertedUnit}` : ""}`;
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
