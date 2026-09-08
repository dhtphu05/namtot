import {
  type CriteriaConfiguration,
  type CoreCriterionKey,
  type CriterionConfiguration,
  type CriterionRule,
  type RuleGroup,
} from "./types.ts";
import {
  CORE_CRITERION_LABELS,
  CORE_CRITERION_SHORT_LABELS,
  createEmptyCriterion,
} from "./criteria-model.ts";

const coreEvidence: Record<CoreCriterionKey, string[]> = {
  ethics: ["Phiếu điểm rèn luyện", "Xác nhận không vi phạm"],
  academic: ["Bảng điểm", "Xác nhận học phần", "Giấy khen nghiên cứu khoa học"],
  physical: ["Xác nhận Giáo dục thể chất", "Giấy chứng nhận hoạt động thể thao"],
  volunteer: ["Giấy chứng nhận chiến dịch", "Xác nhận ngày tình nguyện"],
  integration: ["Chứng chỉ ngoại ngữ", "Xác nhận tập huấn hoặc giao lưu quốc tế"],
};

export const DUT_CRITERIA_CONFIGURATION_SEED: CriteriaConfiguration[] = [
  createConfiguration("criteria-dut-2025-2026-published", "2025–2026", "published"),
  createConfiguration("criteria-dut-2026-2027-draft", "2026–2027", "draft"),
  createConfiguration("criteria-dut-2024-2025-archived", "2024–2025", "archived"),
];

export function createBasicDraftConfiguration(
  id: string,
  schoolYear: string,
): CriteriaConfiguration {
  return {
    id,
    schoolYear,
    status: "draft",
    criteria: {
      ethics: createEmptyCriterion("ethics"),
      academic: createEmptyCriterion("academic"),
      physical: createEmptyCriterion("physical"),
      volunteer: createEmptyCriterion("volunteer"),
      integration: createEmptyCriterion("integration"),
    },
    otherEvidenceGroups: createSeedOtherEvidenceGroups(),
  };
}

function createConfiguration(
  id: string,
  schoolYear: string,
  status: CriteriaConfiguration["status"],
): CriteriaConfiguration {
  const configuration: CriteriaConfiguration = {
    id,
    schoolYear,
    status,
    criteria: createPublishedCriteria(),
    otherEvidenceGroups: createSeedOtherEvidenceGroups(),
  };

  if (status === "draft") {
    configuration.criteria.volunteer = {
      ...configuration.criteria.volunteer,
      ruleGroups: configuration.criteria.volunteer.ruleGroups.map((group) =>
        group.id === "volunteer-any"
          ? {
              ...group,
              rules: group.rules.map((rule) =>
                rule.id === "volunteer-days-minimum" ? { ...rule, value: undefined } : rule,
              ),
            }
          : group,
      ),
    };
    configuration.criteria.integration = {
      ...configuration.criteria.integration,
      ruleGroups: [
        ...configuration.criteria.integration.ruleGroups,
        {
          id: "integration-empty-draft-group",
          title: "Nhóm điều kiện cần hoàn thiện",
          logic: "any",
          rules: [],
        },
      ],
    };
  }

  return configuration;
}

function createPublishedCriteria(): CriteriaConfiguration["criteria"] {
  return {
    ethics: criterion("ethics", [
      group("ethics-all", "Phải đáp ứng tất cả", "all", [
        rule(
          "ethics-conduct-score",
          "Điểm rèn luyện từ 82/100 trở lên.",
          "numeric_threshold",
          "gte",
          82,
          "điểm",
        ),
        rule(
          "ethics-no-violation",
          "Không vi phạm pháp luật, quy chế hoặc nội quy.",
          "boolean_condition",
          "eq",
          true,
        ),
      ]),
    ]),
    academic: criterion("academic", [
      group("academic-all", "Phải đáp ứng tất cả", "all", [
        rule("academic-gpa", "GPA từ 3.0/4.0 trở lên.", "numeric_threshold", "gte", 3, "GPA"),
        rule("academic-no-f", "Không có học phần bị điểm F.", "boolean_condition", "eq", true),
      ]),
      group("academic-supplementary", "Minh chứng học thuật bổ sung", "any", [
        rule(
          "academic-research",
          "Có nghiên cứu khoa học từ cấp Khoa trở lên.",
          "organizer_level",
          "exists",
        ),
      ]),
    ]),
    physical: criterion("physical", [
      group("physical-any", "Chỉ cần đáp ứng một", "any", [
        rule("physical-score", "Điểm Giáo dục thể chất từ loại Khá.", "enum_match", "in", "Khá"),
        rule(
          "physical-activity",
          "Tham gia hoạt động thể thao phù hợp.",
          "evidence_presence",
          "exists",
        ),
        rule("physical-competition", "Tham gia giải thể thao.", "evidence_presence", "exists"),
        rule(
          "physical-regular-training",
          "Rèn luyện định kỳ tại câu lạc bộ, đội hoặc nhóm thể thao.",
          "manual_confirmation",
          "exists",
        ),
      ]),
    ]),
    volunteer: criterion("volunteer", [
      group("volunteer-any", "Chỉ cần đáp ứng một", "any", [
        rule(
          "volunteer-campaign",
          "Hoàn thành chiến dịch tình nguyện.",
          "evidence_presence",
          "exists",
        ),
        rule(
          "volunteer-days-minimum",
          "Có ít nhất 2 ngày tình nguyện.",
          "numeric_threshold",
          "gte",
          2,
          "ngày",
        ),
        rule(
          "volunteer-blood-donation",
          "Hiến máu được quy đổi theo ngày tình nguyện.",
          "evidence_presence",
          "exists",
        ),
        rule(
          "volunteer-award",
          "Có giấy khen hoạt động tình nguyện.",
          "evidence_presence",
          "exists",
        ),
        rule(
          "volunteer-three-activities",
          "Có ít nhất 3 hoạt động được xác nhận.",
          "evidence_count",
          "gte",
          3,
          "hoạt động",
        ),
      ]),
    ]),
    integration: criterion("integration", [
      group("integration-any", "Chỉ cần đáp ứng một", "any", [
        rule(
          "integration-training",
          "Tham gia tập huấn Đoàn – Hội.",
          "evidence_presence",
          "exists",
        ),
        rule("integration-exchange", "Tham gia giao lưu quốc tế.", "evidence_presence", "exists"),
        rule("integration-a2", "Có ngoại ngữ A2 đối với năm 1–2.", "enum_match", "in", "A2"),
        rule("integration-b1", "Có ngoại ngữ B1 đối với năm 3–5.", "enum_match", "in", "B1"),
        rule(
          "integration-language-activity",
          "Tham gia hoặc đạt kết quả trong hoạt động sử dụng ngoại ngữ.",
          "evidence_presence",
          "exists",
        ),
      ]),
    ]),
  };
}

function criterion(key: CoreCriterionKey, ruleGroups: RuleGroup[]): CriterionConfiguration {
  return {
    key,
    label: CORE_CRITERION_LABELS[key],
    shortLabel: CORE_CRITERION_SHORT_LABELS[key],
    ruleGroups: ruleGroups.map((group) => ({
      ...group,
      rules: group.rules.map((item) => ({
        ...item,
        evidenceTypes: item.evidenceTypes ?? coreEvidence[key],
      })),
    })),
  };
}

function group(
  id: string,
  title: string,
  logic: RuleGroup["logic"],
  rules: CriterionRule[],
): RuleGroup {
  return { id, title, logic, rules };
}

function rule(
  id: string,
  label: string,
  type: CriterionRule["type"],
  operator: CriterionRule["operator"],
  value?: CriterionRule["value"],
  unit?: string,
): CriterionRule {
  const rule: CriterionRule = { id, label, type, operator, value, unit };
  if (type === "numeric_threshold") {
    rule.metricLabel = unit || label;
    rule.scale = unit === "GPA" ? 4 : label.toLowerCase().includes("rèn luyện") ? 100 : 999;
  }
  if (type === "evidence_count") {
    rule.evidenceLabel = "hoạt động được xác nhận";
  }
  if (type === "evidence_sum") {
    rule.evidenceLabel = "minh chứng được xác nhận";
    rule.sumLabel = unit || "giá trị";
  }
  if (type === "evidence_presence") {
    rule.evidenceLabel = "minh chứng phù hợp";
  }
  if (type === "organizer_level") {
    rule.contextLabel = "thành tích hoặc hoạt động được xác nhận";
    rule.evidenceLabel = "minh chứng cấp tổ chức";
    rule.value = value ?? "Cấp Khoa";
  }
  if (type === "enum_match") {
    rule.contextLabel = "mức được chấp nhận";
    rule.acceptedValues = value === undefined ? [] : [String(value)];
  }
  if (type === "manual_confirmation") {
    rule.manualInstruction = "Hội đồng kiểm tra minh chứng và xác nhận trước khi kết luận.";
  }
  return rule;
}

function createSeedOtherEvidenceGroups(): CriteriaConfiguration["otherEvidenceGroups"] {
  return [
    {
      id: "other-priority-academic",
      title: "Minh chứng ưu tiên",
      purpose: "priority",
      relatedCriteria: ["academic"],
      evidenceTypes: [
        {
          id: "other-research-achievement",
          label: "Thành tích nghiên cứu nổi bật",
        },
        {
          id: "other-creative-product",
          label: "Sản phẩm sáng tạo",
        },
      ],
    },
    {
      id: "other-manual-review",
      title: "Minh chứng cần Hội đồng xác minh",
      purpose: "manual_review",
      relatedCriteria: [],
      evidenceTypes: [
        {
          id: "other-special-activity-confirmation",
          label: "Giấy xác nhận hoạt động đặc thù",
        },
      ],
    },
  ];
}

export function createDraftIdForSchoolYear(schoolYear: string) {
  const normalized = schoolYear
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9a-zA-Z]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `criteria-dut-${normalized}-draft`;
}
