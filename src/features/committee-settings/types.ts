export const DUT_COMMITTEE_UNIT_NAME = "Trường Đại học Bách khoa - Đại học Đà Nẵng";

export const DUT_COMMITTEE_REVIEW_LEVEL = "Cấp Trường";

export const CORE_CRITERION_KEYS = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
] as const;

export type CoreCriterionKey = (typeof CORE_CRITERION_KEYS)[number];

export type CriteriaConfigurationStatus = "draft" | "published" | "archived";

export type RuleGroupLogic = "all" | "any" | "minimum";

export type CriterionRuleType =
  | "numeric_threshold"
  | "boolean_condition"
  | "evidence_count"
  | "evidence_sum"
  | "evidence_presence"
  | "organizer_level"
  | "date_range"
  | "enum_match"
  | "manual_confirmation";

export type RuleOperator = "gte" | "lte" | "eq" | "neq" | "exists" | "not_exists" | "in" | "not_in";

export type OtherEvidencePurpose = "priority" | "reference" | "unclassified" | "manual_review";

export type OtherEvidenceType = {
  id: string;
  label: string;
  description?: string;
  relatedCriteria?: CoreCriterionKey[];
  handling?: OtherEvidencePurpose;
  mandatory?: boolean;
};

export type CriterionRule = {
  id: string;
  label: string;
  type: CriterionRuleType;
  operator: RuleOperator;
  value?: string | number | boolean;
  unit?: string;
  scale?: number;
  metricLabel?: string;
  evidenceLabel?: string;
  contextLabel?: string;
  evidenceCount?: number;
  sumLabel?: string;
  dateMode?: "school_year" | "custom";
  startDate?: string;
  endDate?: string;
  acceptedValues?: string[];
  acceptedAlternatives?: string[];
  evidenceTypes?: string[];
  manualInstruction?: string;
  active?: boolean;
};

export type RuleGroup = {
  id: string;
  title: string;
  logic: RuleGroupLogic;
  minimumRequired?: number;
  rules: CriterionRule[];
};

export type CriterionConfiguration = {
  key: CoreCriterionKey;
  label: string;
  shortLabel: string;
  description?: string;
  ruleGroups: RuleGroup[];
};

export type OtherEvidenceGroup = {
  id: string;
  title: string;
  purpose: OtherEvidencePurpose;
  relatedCriteria: CoreCriterionKey[];
  evidenceTypes: OtherEvidenceType[];
};

export type CriteriaConfiguration = {
  id: string;
  schoolYear: string;
  status: CriteriaConfigurationStatus;
  criteria: Record<CoreCriterionKey, CriterionConfiguration>;
  otherEvidenceGroups: OtherEvidenceGroup[];
};

export type CriteriaConfigurationSummary = {
  id: string;
  schoolYear: string;
  status: CriteriaConfigurationStatus;
  coreCriteriaCount: 5;
  criteriaLabels: string[];
  validationIssues: string[];
};

export type CreateDraftInput = {
  schoolYear: string;
};

export type CriteriaRepositoryRecoveryState = {
  recoveredFromInvalidStorage: boolean;
};

export interface CriteriaRepository {
  list(): Promise<CriteriaConfigurationSummary[]>;
  get(id: string): Promise<CriteriaConfiguration>;
  createDraft(input: CreateDraftInput): Promise<CriteriaConfiguration>;
  cloneAsDraft(
    sourceConfigurationId: string,
    targetSchoolYear: string,
  ): Promise<CriteriaConfiguration>;
  save(configuration: CriteriaConfiguration): Promise<CriteriaConfiguration>;
  publish(configurationId: string): Promise<CriteriaConfiguration>;
  archive(configurationId: string): Promise<CriteriaConfiguration>;
  resetDemo(): Promise<void>;
}

export class CriteriaConfigurationNotFoundError extends Error {
  constructor() {
    super("Criteria configuration was not found");
    this.name = "CriteriaConfigurationNotFoundError";
  }
}

export class DuplicateDraftSchoolYearError extends Error {
  readonly schoolYear: string;
  readonly draftId: string;

  constructor(schoolYear: string, draftId: string) {
    super(`Draft already exists for ${schoolYear}`);
    this.name = "DuplicateDraftSchoolYearError";
    this.schoolYear = schoolYear;
    this.draftId = draftId;
  }
}
