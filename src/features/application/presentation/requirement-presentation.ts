import type { RequirementItem } from "@/lib/api/types";
import {
  fieldLabels,
  isFriendlyVietnameseTitle,
  requirementLabels,
  unknownRequirementLabel,
} from "./presentation-copy";
import type { RequirementLike, RequirementPresentation } from "./presentation-types";

export function getRequirementPresentation(
  requirement?: RequirementLike | RequirementItem | null,
): RequirementPresentation {
  const key = requirement?.key ?? "";
  const title = typeof requirement?.title === "string" ? requirement.title.trim() : "";
  if (isFriendlyVietnameseTitle(title)) {
    return { key, label: title, description: requirement?.description, isFallback: false };
  }
  const mapped = requirementLabels[key];
  return {
    key,
    label: mapped ?? unknownRequirementLabel,
    description: requirement?.description,
    isFallback: !mapped,
  };
}

export function getRequirementLabel(requirementKey?: string | null, fallbackTitle?: string | null) {
  return getRequirementPresentation({ key: requirementKey ?? "", title: fallbackTitle ?? "" })
    .label;
}

export function getRequirementFieldLabel(field?: string | null) {
  if (!field) return "Thông tin bổ sung";
  return fieldLabels[field] ?? "Thông tin bổ sung";
}

export function getRequirementChipLabel(value?: string | null) {
  if (!value) return unknownRequirementLabel;
  return requirementLabels[value] ?? fieldLabels[value] ?? unknownRequirementLabel;
}
