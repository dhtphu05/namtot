import {
  CORE_CRITERION_KEYS,
  type CoreCriterionKey,
  type CriteriaConfiguration,
  type CriteriaConfigurationSummary,
  type CriterionConfiguration,
} from "./types.ts";
import { validateCriteriaConfiguration } from "./validation.ts";

export const CORE_CRITERION_LABELS: Record<CoreCriterionKey, string> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
};

export const CORE_CRITERION_SHORT_LABELS: Record<CoreCriterionKey, string> = {
  ethics: "Đạo đức",
  academic: "Học tập",
  physical: "Thể lực",
  volunteer: "Tình nguyện",
  integration: "Hội nhập",
};

export function getCriteriaInFixedOrder(configuration: CriteriaConfiguration) {
  return CORE_CRITERION_KEYS.map((key) => configuration.criteria[key]);
}

export function hasExactlyFiveCoreCriteria(configuration: CriteriaConfiguration): boolean {
  const keys = Object.keys(configuration.criteria).sort();
  const expected = [...CORE_CRITERION_KEYS].sort();
  return keys.length === expected.length && expected.every((key, index) => key === keys[index]);
}

export function summarizeConfiguration(
  configuration: CriteriaConfiguration,
): CriteriaConfigurationSummary {
  return {
    id: configuration.id,
    schoolYear: configuration.schoolYear,
    status: configuration.status,
    coreCriteriaCount: 5,
    criteriaLabels: CORE_CRITERION_KEYS.map((key) => CORE_CRITERION_SHORT_LABELS[key]),
    validationIssues:
      configuration.status === "draft" ? getActionableDraftIssues(configuration) : [],
  };
}

export function getActionableDraftIssues(configuration: CriteriaConfiguration): string[] {
  return validateCriteriaConfiguration(configuration)
    .filter((issue) => issue.severity === "error")
    .map((issue) => issue.message);
}

export function createEmptyCriterion(key: CoreCriterionKey): CriterionConfiguration {
  return {
    key,
    label: CORE_CRITERION_LABELS[key],
    shortLabel: CORE_CRITERION_SHORT_LABELS[key],
    ruleGroups: [],
  };
}
