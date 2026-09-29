import type { CityAnalyticsCriterion } from "./types";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";

export const criterionOrder: CityAnalyticsCriterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
];

export const criterionLabels: Record<CityAnalyticsCriterion, string> = {
  ethics: getCoreCriterionLabel("ethics"),
  academic: getCoreCriterionLabel("academic"),
  physical: getCoreCriterionLabel("physical"),
  volunteer: getCoreCriterionLabel("volunteer"),
  integration: getCoreCriterionLabel("integration"),
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
