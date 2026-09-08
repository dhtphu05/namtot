import { getRuleSentence, OTHER_SECTION_KEY, type EditorSectionKey } from "./editor-model.ts";
import {
  CORE_CRITERION_KEYS,
  type CoreCriterionKey,
  type CriteriaConfiguration,
  type CriterionRule,
  type OtherEvidencePurpose,
  type RuleGroup,
} from "./types.ts";

export type CriteriaValidationSeverity = "error" | "warning";

export type CriteriaValidationSection = EditorSectionKey;

export type CriteriaValidationIssue = {
  id: string;
  severity: CriteriaValidationSeverity;
  section: CriteriaValidationSection;
  groupId?: string;
  ruleId?: string;
  otherEvidenceId?: string;
  message: string;
};

const validOtherPurposes: OtherEvidencePurpose[] = [
  "priority",
  "reference",
  "unclassified",
  "manual_review",
];

export function validateCriteriaConfiguration(value: unknown): CriteriaValidationIssue[] {
  const issues: CriteriaValidationIssue[] = [];
  if (!value || typeof value !== "object") {
    return [
      issue(
        "error",
        "ethics",
        "configuration-unreadable",
        "Dữ liệu cấu hình chưa thể đọc an toàn.",
      ),
    ];
  }

  const configuration = value as CriteriaConfiguration;
  const criteriaRecord = asRecord(configuration.criteria);
  if (!criteriaRecord) {
    return [issue("error", "ethics", "criteria-missing", "Dữ liệu năm tiêu chí chưa đầy đủ.")];
  }

  const keys = Object.keys(criteriaRecord);
  const unknownKeys = keys.filter((key) => !CORE_CRITERION_KEYS.includes(key as CoreCriterionKey));
  if (unknownKeys.length) {
    issues.push(
      issue(
        "error",
        "ethics",
        "criteria-unknown",
        "Cấu hình có tiêu chí ngoài năm tiêu chí Sinh viên 5 tốt.",
      ),
    );
  }
  if (Object.prototype.hasOwnProperty.call(criteriaRecord, OTHER_SECTION_KEY)) {
    issues.push(
      issue(
        "error",
        "other",
        "other-in-core",
        "Mục Khác phải tách riêng khỏi năm tiêu chí cốt lõi.",
      ),
    );
  }

  for (const criterionKey of CORE_CRITERION_KEYS) {
    const criterion = criteriaRecord[criterionKey];
    if (!criterion || typeof criterion !== "object") {
      issues.push(
        issue(
          "error",
          criterionKey,
          `${criterionKey}-missing`,
          "Một tiêu chí cốt lõi đang bị thiếu.",
        ),
      );
      continue;
    }
    const criterionRecord = criterion as { ruleGroups?: unknown };
    if (!Array.isArray(criterionRecord.ruleGroups)) {
      issues.push(
        issue(
          "error",
          criterionKey,
          `${criterionKey}-groups-invalid`,
          "Tiêu chí này chưa có cấu trúc nhóm điều kiện hợp lệ.",
        ),
      );
      continue;
    }
    validateCriterionGroups(issues, criterionKey, criterionRecord.ruleGroups as RuleGroup[]);
  }

  validateOtherEvidence(issues, configuration);
  return stableIssues(issues);
}

export function getBlockingValidationIssues(issues: CriteriaValidationIssue[]) {
  return issues.filter((item) => item.severity === "error");
}

export function getWarningValidationIssues(issues: CriteriaValidationIssue[]) {
  return issues.filter((item) => item.severity === "warning");
}

export function canApplyConfiguration(configuration: CriteriaConfiguration) {
  return getBlockingValidationIssues(validateCriteriaConfiguration(configuration)).length === 0;
}

function validateCriterionGroups(
  issues: CriteriaValidationIssue[],
  section: CoreCriterionKey,
  groups: RuleGroup[],
) {
  const activeRules = groups.flatMap((group) => group.rules.filter(isActiveRule));
  if (!activeRules.length) {
    issues.push(
      issue("error", section, `${section}-no-active-rules`, "Tiêu chí này chưa có điều kiện xét."),
    );
  }
  if (groups.length > 7) {
    issues.push(
      issue(
        "warning",
        section,
        `${section}-many-groups`,
        "Tiêu chí này có nhiều nhóm và nên được rà soát lại để dễ đọc.",
      ),
    );
  }

  for (const group of groups) {
    const groupRules = Array.isArray(group.rules) ? group.rules.filter(isActiveRule) : [];
    const groupId = safeId(group.id, "group");
    if (!groupRules.length) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${groupId}-empty`,
          `Nhóm "${group.title || "chưa đặt tên"}" đang không có điều kiện nào.`,
          {
            groupId: group.id,
          },
        ),
      );
    }
    if (group.logic === "minimum") {
      if (group.minimumRequired === undefined || group.minimumRequired === null) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${groupId}-minimum-missing`,
            "Nhóm này cần có số điều kiện tối thiểu.",
            {
              groupId: group.id,
            },
          ),
        );
      } else if (!Number.isInteger(group.minimumRequired)) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${groupId}-minimum-integer`,
            "Số điều kiện cần đạt phải là số nguyên.",
            {
              groupId: group.id,
            },
          ),
        );
      } else if (group.minimumRequired < 1) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${groupId}-minimum-small`,
            "Số điều kiện cần đạt phải từ 1 trở lên.",
            {
              groupId: group.id,
            },
          ),
        );
      } else if (group.minimumRequired > groupRules.length && groupRules.length > 0) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${groupId}-minimum-large`,
            "Số điều kiện cần đạt không thể lớn hơn số điều kiện trong nhóm.",
            {
              groupId: group.id,
            },
          ),
        );
      }
    }
    if (group.logic === "any" && groupRules.length === 1) {
      issues.push(
        issue(
          "warning",
          section,
          `${section}-${groupId}-any-one`,
          `Nhóm "${group.title}" chỉ có một điều kiện nên cách tính này chưa tạo khác biệt.`,
          {
            groupId: group.id,
          },
        ),
      );
    }
    addDuplicateWarnings(issues, section, group, groupRules);
    for (const rule of groupRules) {
      validateRule(issues, section, group, rule);
    }
  }

  addCriterionSentenceWarnings(issues, section, activeRules);
}

function validateRule(
  issues: CriteriaValidationIssue[],
  section: CoreCriterionKey,
  group: RuleGroup,
  rule: CriterionRule,
) {
  const groupId = group.id;
  const ruleId = rule.id;
  const label = rule.label?.trim();
  if (!label) {
    issues.push(
      issue("error", section, `${section}-${ruleId}-label`, "Một điều kiện chưa có tên hiển thị.", {
        groupId,
        ruleId,
      }),
    );
  }

  if (rule.type === "numeric_threshold") {
    const value = toFiniteNumber(rule.value);
    if (value === null) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-numeric-missing`,
          `Điều kiện "${label || "chưa đặt tên"}" chưa có giá trị tối thiểu.`,
          {
            groupId,
            ruleId,
          },
        ),
      );
    } else {
      if (value < 0) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${ruleId}-numeric-negative`,
            "Giá trị tối thiểu phải lớn hơn hoặc bằng 0.",
            {
              groupId,
              ruleId,
            },
          ),
        );
      }
      if (requiresInteger(rule) && !Number.isInteger(value)) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${ruleId}-numeric-integer`,
            "Số lượng phải là số nguyên từ 1 trở lên.",
            {
              groupId,
              ruleId,
            },
          ),
        );
      }
    }
    const scale = toFiniteNumber(rule.scale);
    if (scale === null) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-scale-missing`,
          "Vui lòng nhập thang điểm hoặc giới hạn để kiểm tra điều kiện này.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    } else if (scale <= 0) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-scale-positive`,
          "Thang điểm hoặc giới hạn phải lớn hơn 0.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    } else if (value !== null && value > scale) {
      issues.push(
        issue("error", section, `${section}-${ruleId}-above-scale`, getAboveScaleMessage(rule), {
          groupId,
          ruleId,
        }),
      );
    }
    return;
  }

  if (rule.type === "boolean_condition") {
    if (typeof rule.value !== "boolean") {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-boolean-state`,
          "Vui lòng chọn trạng thái cần xác nhận.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (!label || label.length < 6) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-boolean-meaning`,
          "Điều kiện có / không cần mô tả rõ nội dung cần xác nhận.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    return;
  }

  if (rule.type === "evidence_count") {
    const count = toFiniteNumber(rule.value ?? rule.evidenceCount);
    if (!hasEvidenceContext(rule)) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-count-evidence`,
          "Vui lòng chọn loại minh chứng hoặc hoạt động cần đếm.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (count === null) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-count-missing`,
          "Vui lòng nhập số lượng yêu cầu.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    } else if (!Number.isInteger(count) || count < 1) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-count-invalid`,
          "Số lượng phải là số nguyên từ 1 trở lên.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    return;
  }

  if (rule.type === "evidence_sum") {
    const total = toFiniteNumber(rule.value);
    if (!hasEvidenceContext(rule)) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-sum-evidence`,
          "Vui lòng chọn loại minh chứng cần cộng tổng.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (!rule.sumLabel?.trim()) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-sum-field`,
          "Vui lòng chọn thông tin cần cộng tổng.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (total === null || total <= 0) {
      issues.push(
        issue("error", section, `${section}-${ruleId}-sum-total`, "Tổng yêu cầu phải lớn hơn 0.", {
          groupId,
          ruleId,
        }),
      );
    }
    return;
  }

  if (rule.type === "evidence_presence") {
    if (!hasEvidenceContext(rule)) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-presence-evidence`,
          "Vui lòng chọn loại minh chứng được chấp nhận.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    return;
  }

  if (rule.type === "organizer_level") {
    if (!hasEvidenceContext(rule) && !rule.contextLabel?.trim()) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-level-context`,
          "Vui lòng mô tả hoạt động hoặc minh chứng cần kiểm tra cấp.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (rule.value === undefined || rule.value === "") {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-level-value`,
          "Vui lòng chọn cấp tối thiểu.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    return;
  }

  if (rule.type === "date_range") {
    if (!rule.dateMode) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-date-mode`,
          "Vui lòng chọn cách xác định khoảng thời gian.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (rule.dateMode === "custom") {
      if (!rule.startDate) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${ruleId}-date-start`,
            "Vui lòng chọn ngày bắt đầu.",
            {
              groupId,
              ruleId,
            },
          ),
        );
      }
      if (!rule.endDate) {
        issues.push(
          issue("error", section, `${section}-${ruleId}-date-end`, "Vui lòng chọn ngày kết thúc.", {
            groupId,
            ruleId,
          }),
        );
      }
      if (rule.startDate && rule.endDate && rule.endDate < rule.startDate) {
        issues.push(
          issue(
            "error",
            section,
            `${section}-${ruleId}-date-reversed`,
            "Ngày kết thúc phải sau ngày bắt đầu.",
            {
              groupId,
              ruleId,
            },
          ),
        );
      }
    }
    return;
  }

  if (rule.type === "enum_match") {
    if (!rule.contextLabel?.trim() && !rule.metricLabel?.trim() && !rule.evidenceLabel?.trim()) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-enum-context`,
          "Vui lòng mô tả trường hoặc bối cảnh cần so khớp.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (!rule.acceptedValues?.length) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-enum-values`,
          "Vui lòng chọn ít nhất một mức được chấp nhận.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    return;
  }

  if (rule.type === "manual_confirmation") {
    if (!label) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-manual-title`,
          "Điều kiện cần Hội đồng xác nhận phải có tên rõ ràng.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
    if (!rule.manualInstruction?.trim()) {
      issues.push(
        issue(
          "error",
          section,
          `${section}-${ruleId}-manual-instruction`,
          "Vui lòng nhập hướng xử lý để Hội đồng xác minh.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    } else if (rule.manualInstruction.trim().length < 12) {
      issues.push(
        issue(
          "warning",
          section,
          `${section}-${ruleId}-manual-short`,
          "Hướng xử lý thủ công còn ngắn và nên được viết rõ hơn.",
          {
            groupId,
            ruleId,
          },
        ),
      );
    }
  }
}

function validateOtherEvidence(
  issues: CriteriaValidationIssue[],
  configuration: CriteriaConfiguration,
) {
  const groups = Array.isArray(configuration.otherEvidenceGroups)
    ? configuration.otherEvidenceGroups
    : [];
  const allEvidence = groups.flatMap((group) =>
    Array.isArray(group.evidenceTypes)
      ? group.evidenceTypes.map((evidence) => ({ group, evidence }))
      : [],
  );
  if (!allEvidence.length) {
    issues.push(
      issue("warning", "other", "other-empty", "Mục Khác hiện chưa có minh chứng bổ sung."),
    );
  }
  for (const { group, evidence } of allEvidence) {
    const evidenceId = evidence.id || safeId(evidence.label, "other");
    if (evidence.mandatory === true) {
      issues.push(
        issue(
          "error",
          "other",
          `other-${evidenceId}-mandatory`,
          "Minh chứng Khác không được đánh dấu là điều kiện bắt buộc để đạt.",
          {
            otherEvidenceId: evidence.id,
          },
        ),
      );
    }
    if (!evidence.label?.trim()) {
      issues.push(
        issue("error", "other", `other-${evidenceId}-name`, "Một minh chứng Khác chưa có tên.", {
          otherEvidenceId: evidence.id,
        }),
      );
    }
    const purpose = evidence.handling ?? group.purpose;
    if (!validOtherPurposes.includes(purpose)) {
      issues.push(
        issue(
          "error",
          "other",
          `other-${evidenceId}-purpose`,
          "Vui lòng chọn cách xử lý cho minh chứng Khác.",
          {
            otherEvidenceId: evidence.id,
          },
        ),
      );
    }
    const relatedCriteria = evidence.relatedCriteria ?? group.relatedCriteria;
    if (!Array.isArray(relatedCriteria)) {
      issues.push(
        issue(
          "error",
          "other",
          `other-${evidenceId}-related-malformed`,
          "Dữ liệu tiêu chí liên quan của minh chứng Khác chưa hợp lệ.",
          {
            otherEvidenceId: evidence.id,
          },
        ),
      );
    } else if (relatedCriteria.some((key) => !CORE_CRITERION_KEYS.includes(key))) {
      issues.push(
        issue(
          "error",
          "other",
          `other-${evidenceId}-related-unknown`,
          "Minh chứng Khác đang liên kết đến tiêu chí không hợp lệ.",
          {
            otherEvidenceId: evidence.id,
          },
        ),
      );
    } else if (!relatedCriteria.length) {
      issues.push(
        issue(
          "warning",
          "other",
          `other-${evidenceId}-no-related`,
          `Minh chứng "${evidence.label}" chưa liên kết với tiêu chí nào.`,
          {
            otherEvidenceId: evidence.id,
          },
        ),
      );
    }
  }
}

function addDuplicateWarnings(
  issues: CriteriaValidationIssue[],
  section: CoreCriterionKey,
  group: RuleGroup,
  rules: CriterionRule[],
) {
  const seen = new Map<string, CriterionRule>();
  for (const rule of rules) {
    const key = `${rule.type}:${rule.label}:${String(rule.value)}:${rule.acceptedValues?.join("|") ?? ""}`;
    const previous = seen.get(key);
    if (previous) {
      issues.push(
        issue(
          "warning",
          section,
          `${section}-${group.id}-${rule.id}-duplicate`,
          "Nhóm này có các điều kiện trông giống nhau và nên được rà soát.",
          {
            groupId: group.id,
            ruleId: rule.id,
          },
        ),
      );
      return;
    }
    seen.set(key, rule);
  }
}

function addCriterionSentenceWarnings(
  issues: CriteriaValidationIssue[],
  section: CoreCriterionKey,
  rules: CriterionRule[],
) {
  const seen = new Map<string, CriterionRule>();
  for (const rule of rules) {
    const sentence = getRuleSentence(rule);
    const previous = seen.get(sentence);
    if (previous) {
      issues.push(
        issue(
          "warning",
          section,
          `${section}-${rule.id}-same-sentence`,
          "Hai điều kiện trong tiêu chí này đang hiển thị cùng một nội dung.",
          {
            ruleId: rule.id,
          },
        ),
      );
      return;
    }
    seen.set(sentence, rule);
  }
}

function issue(
  severity: CriteriaValidationSeverity,
  section: CriteriaValidationSection,
  id: string,
  message: string,
  target: Partial<Pick<CriteriaValidationIssue, "groupId" | "ruleId" | "otherEvidenceId">> = {},
): CriteriaValidationIssue {
  return { id, severity, section, message, ...target };
}

function stableIssues(issues: CriteriaValidationIssue[]) {
  return issues.sort(
    (left, right) =>
      severityRank(left.severity) - severityRank(right.severity) ||
      sectionRank(left.section) - sectionRank(right.section) ||
      left.id.localeCompare(right.id),
  );
}

function severityRank(severity: CriteriaValidationSeverity) {
  return severity === "error" ? 0 : 1;
}

function sectionRank(section: CriteriaValidationSection) {
  return section === "other" ? 5 : CORE_CRITERION_KEYS.indexOf(section);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function isActiveRule(rule: CriterionRule) {
  return rule.active !== false;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === "" || value === undefined || value === null || typeof value === "boolean") {
    return null;
  }
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function requiresInteger(rule: CriterionRule) {
  const text = `${rule.unit ?? ""} ${rule.metricLabel ?? ""} ${rule.label ?? ""}`.toLowerCase();
  return /ngày|hoạt động|lần|số lượng|count/.test(text);
}

function hasEvidenceContext(rule: CriterionRule) {
  return Boolean(rule.evidenceLabel?.trim() || rule.evidenceTypes?.length);
}

function getAboveScaleMessage(rule: CriterionRule) {
  const text = `${rule.metricLabel ?? ""} ${rule.unit ?? ""} ${rule.label ?? ""}`.toLowerCase();
  if (text.includes("gpa")) return "GPA không được lớn hơn thang điểm đã chọn.";
  if (text.includes("rèn luyện") || text.includes("điểm")) {
    return "Điểm rèn luyện không được lớn hơn thang điểm đã chọn.";
  }
  return "Giá trị yêu cầu không được lớn hơn thang đo đã chọn.";
}

function safeId(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value.replace(/[^0-9a-zA-Z_-]+/g, "-");
  return fallback;
}
