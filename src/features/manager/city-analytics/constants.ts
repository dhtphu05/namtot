import type { CityAnalyticsCriterion } from "./types";

export const criterionOrder: CityAnalyticsCriterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
];

export const criterionLabels: Record<CityAnalyticsCriterion, string> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
};

export const criterionTaskStatusKeys = [
  { key: "pending", status: "waiting", label: "Chờ" },
  { key: "inReview", status: "reviewing", label: "Đang xét" },
  { key: "supplementRequired", status: "supplement_required", label: "Bổ sung" },
  { key: "resolutionNeeded", status: "resolution_needed", label: "Hội đồng" },
  { key: "pass", status: "accepted", label: "Đạt" },
  { key: "fail", status: "rejected", label: "Không đạt" },
] as const;

export const finalStatuses = [
  { value: "pending", label: "Chưa chốt" },
  { value: "passed", label: "Đạt" },
  { value: "partially_passed", label: "Đạt cấp thấp hơn" },
  { value: "failed", label: "Chưa đạt" },
] as const;
