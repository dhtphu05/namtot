import type { Criterion } from "@/lib/api/types";

const criterionName: Record<Criterion, string> = {
  ethics: "đạo đức",
  academic: "học tập",
  physical: "thể lực",
  volunteer: "tình nguyện",
  integration: "hội nhập",
  priority: "ưu tiên",
  collective: "tập thể",
};

export function officialEventLibraryTitleForCriterion(criterion?: Criterion) {
  if (!criterion || criterion === "priority" || criterion === "collective") return "Tìm minh chứng";
  return `Tìm minh chứng ${criterionName[criterion]}`;
}
