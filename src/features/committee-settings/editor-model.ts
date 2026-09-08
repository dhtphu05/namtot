import {
  CORE_CRITERION_KEYS,
  type CoreCriterionKey,
  type CriteriaConfiguration,
  type CriterionConfiguration,
  type CriterionRule,
  type CriterionRuleType,
  type OtherEvidenceGroup,
  type OtherEvidencePurpose,
  type OtherEvidenceType,
  type RuleGroup,
  type RuleGroupLogic,
} from "./types.ts";

export const OTHER_SECTION_KEY = "other" as const;

export const EDITOR_SECTION_KEYS = [...CORE_CRITERION_KEYS, OTHER_SECTION_KEY] as const;

export type EditorSectionKey = (typeof EDITOR_SECTION_KEYS)[number];

export type RuleGroupInput = {
  title: string;
  logic: RuleGroupLogic;
  minimumRequired?: number;
};

export type RuleInput = {
  label: string;
  type: CriterionRuleType;
  operator?: CriterionRule["operator"];
  value?: CriterionRule["value"];
  unit?: string;
  scale?: number;
  metricLabel?: string;
  evidenceLabel?: string;
  contextLabel?: string;
  evidenceCount?: number;
  sumLabel?: string;
  dateMode?: CriterionRule["dateMode"];
  startDate?: string;
  endDate?: string;
  acceptedValues?: string[];
  evidenceTypes?: string[];
  manualInstruction?: string;
};

export type OtherEvidenceInput = {
  label: string;
  description?: string;
  purpose: OtherEvidencePurpose;
  relatedCriteria: CoreCriterionKey[];
};

export const RULE_TYPE_LABELS: Record<CriterionRuleType, string> = {
  numeric_threshold: "Ngưỡng điểm hoặc số liệu",
  boolean_condition: "Điều kiện có / không",
  evidence_count: "Số lượng minh chứng",
  evidence_sum: "Tổng số từ minh chứng",
  evidence_presence: "Có minh chứng phù hợp",
  organizer_level: "Cấp tổ chức / cấp khen thưởng",
  date_range: "Khoảng thời gian hợp lệ",
  enum_match: "Giá trị trong danh sách",
  manual_confirmation: "Hội đồng xác nhận thủ công",
};

export const RULE_TYPE_DESCRIPTIONS: Record<CriterionRuleType, string> = {
  numeric_threshold: "Dùng cho GPA, điểm rèn luyện, số ngày, số hoạt động.",
  boolean_condition: "Dùng cho điều kiện không vi phạm hoặc đã hoàn thành.",
  evidence_count: "Đếm số minh chứng được sinh viên nộp.",
  evidence_sum: "Cộng tổng số ngày, giờ hoặc điểm từ minh chứng.",
  evidence_presence: "Chỉ yêu cầu có minh chứng được chấp nhận.",
  organizer_level: "Ràng buộc cấp Khoa, Trường, Thành phố, Trung ương.",
  date_range: "Giới hạn minh chứng trong năm học hoặc một giai đoạn.",
  enum_match: "Chọn các mức như A2, B1, Khá, Giỏi.",
  manual_confirmation: "Đưa điều kiện cho Hội đồng xác minh trước khi kết luận.",
};

export const RULE_TYPE_ORDER: CriterionRuleType[] = [
  "numeric_threshold",
  "boolean_condition",
  "evidence_count",
  "evidence_sum",
  "evidence_presence",
  "organizer_level",
  "date_range",
  "enum_match",
  "manual_confirmation",
];

export const GROUP_LOGIC_LABELS: Record<RuleGroupLogic, string> = {
  all: "Phải đạt tất cả điều kiện trong nhóm",
  any: "Chỉ cần đạt một điều kiện trong nhóm",
  minimum: "Cần đạt một số điều kiện tối thiểu",
};

export const OTHER_PURPOSE_LABELS: Record<OtherEvidencePurpose, string> = {
  priority: "Ưu tiên khi xét chọn",
  reference: "Thông tin tham khảo",
  unclassified: "Chưa phân loại",
  manual_review: "Cần Hội đồng xem xét",
};

export function normalizeEditorSection(section: unknown): EditorSectionKey {
  return EDITOR_SECTION_KEYS.includes(section as EditorSectionKey)
    ? (section as EditorSectionKey)
    : CORE_CRITERION_KEYS[0];
}

export function isCoreEditorSection(section: EditorSectionKey): section is CoreCriterionKey {
  return section !== OTHER_SECTION_KEY;
}

export function getCriterionRuleCount(criterion: CriterionConfiguration) {
  return criterion.ruleGroups.reduce((total, group) => total + group.rules.length, 0);
}

export function getOtherEvidenceCount(configuration: CriteriaConfiguration) {
  return configuration.otherEvidenceGroups.reduce(
    (total, group) => total + group.evidenceTypes.length,
    0,
  );
}

export function getCriterionStateLabel(criterion: CriterionConfiguration) {
  const issues = getCriterionDraftIssues(criterion);
  if (!criterion.ruleGroups.length) return "Thiếu cấu hình";
  if (issues.length) return "Cần hoàn thiện";
  const ruleCount = getCriterionRuleCount(criterion);
  return `${ruleCount} điều kiện`;
}

export function getCriterionDraftIssues(criterion: CriterionConfiguration): string[] {
  const issues: string[] = [];
  if (!criterion.ruleGroups.length) {
    issues.push(`${criterion.shortLabel} chưa có nhóm điều kiện`);
  }
  criterion.ruleGroups.forEach((group) => {
    if (!group.rules.length) {
      issues.push(`${group.title} chưa có điều kiện`);
    }
    if (
      group.logic === "minimum" &&
      group.rules.length > 0 &&
      (!group.minimumRequired ||
        group.minimumRequired < 1 ||
        group.minimumRequired > group.rules.length)
    ) {
      issues.push(`${group.title} có số điều kiện tối thiểu chưa hợp lệ`);
    }
    group.rules.forEach((rule) => {
      if (!rule.label.trim()) {
        issues.push("Một điều kiện chưa có tên hiển thị");
      }
      if (ruleNeedsValue(rule) && (rule.value === undefined || rule.value === "")) {
        issues.push(`${rule.label || "Một điều kiện"} chưa có giá trị yêu cầu`);
      }
    });
  });
  return issues;
}

export function getConfigurationEditorIssues(configuration: CriteriaConfiguration): string[] {
  return CORE_CRITERION_KEYS.flatMap((key) => getCriterionDraftIssues(configuration.criteria[key]));
}

export function getGroupLogicSentence(group: RuleGroup) {
  if (group.logic === "all") return "Sinh viên phải đạt tất cả điều kiện trong nhóm.";
  if (group.logic === "any") return "Sinh viên chỉ cần đạt một điều kiện trong nhóm.";
  const minimum = group.minimumRequired ?? 1;
  return `Sinh viên cần đạt ít nhất ${minimum}/${Math.max(group.rules.length, minimum)} điều kiện trong nhóm.`;
}

export function getRuleSentence(rule: CriterionRule) {
  if (rule.type === "numeric_threshold") {
    return `${rule.metricLabel || "Giá trị"} ${operatorLabel(rule.operator)} ${formatRuleValue(rule)}${rule.unit ? ` ${rule.unit}` : ""}.`;
  }
  if (rule.type === "boolean_condition") {
    return `${rule.label} ${rule.value === false ? "không được xảy ra" : "được xác nhận"}.`;
  }
  if (rule.type === "evidence_count") {
    return `Có ít nhất ${rule.value ?? rule.evidenceCount ?? 1} minh chứng${rule.evidenceLabel ? `: ${rule.evidenceLabel}` : ""}.`;
  }
  if (rule.type === "evidence_sum") {
    return `Tổng ${rule.sumLabel || "giá trị"} từ minh chứng ${operatorLabel(rule.operator)} ${formatRuleValue(rule)}${rule.unit ? ` ${rule.unit}` : ""}.`;
  }
  if (rule.type === "evidence_presence") {
    return `Có minh chứng phù hợp${rule.evidenceLabel ? `: ${rule.evidenceLabel}` : ""}.`;
  }
  if (rule.type === "organizer_level") {
    return `Minh chứng đạt cấp ${formatRuleValue(rule) || "được chọn"} trở lên.`;
  }
  if (rule.type === "date_range") {
    return `Minh chứng trong khoảng ${rule.startDate || "ngày bắt đầu"} đến ${rule.endDate || "ngày kết thúc"}.`;
  }
  if (rule.type === "enum_match") {
    const values = rule.acceptedValues?.length ? rule.acceptedValues : toStringArray(rule.value);
    return `Giá trị được chấp nhận: ${values.length ? values.join(", ") : "chưa chọn"}.`;
  }
  return "Hội đồng xác nhận thủ công trước khi kết luận.";
}

export function createRuleGroup(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  input: RuleGroupInput,
) {
  return updateCriterion(configuration, criterionKey, (criterion) => ({
    ...criterion,
    ruleGroups: [
      ...criterion.ruleGroups,
      {
        id: nextId(
          "group",
          criterion.ruleGroups.map((group) => group.id),
        ),
        title: input.title.trim(),
        logic: input.logic,
        minimumRequired: input.logic === "minimum" ? (input.minimumRequired ?? 1) : undefined,
        rules: [],
      },
    ],
  }));
}

export function updateRuleGroup(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  input: RuleGroupInput,
) {
  return updateCriterion(configuration, criterionKey, (criterion) => ({
    ...criterion,
    ruleGroups: criterion.ruleGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            title: input.title.trim(),
            logic: input.logic,
            minimumRequired: input.logic === "minimum" ? (input.minimumRequired ?? 1) : undefined,
          }
        : group,
    ),
  }));
}

export function duplicateRuleGroup(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
) {
  return updateCriterion(configuration, criterionKey, (criterion) => {
    const source = criterion.ruleGroups.find((group) => group.id === groupId);
    if (!source) return criterion;
    const existingIds = criterion.ruleGroups.flatMap((group) => [
      group.id,
      ...group.rules.map((rule) => rule.id),
    ]);
    const copy: RuleGroup = {
      ...clone(source),
      id: nextId(`${source.id}-copy`, existingIds),
      title: `${source.title} (bản sao)`,
      rules: source.rules.map((rule, index) => ({
        ...rule,
        id: nextId(`${rule.id}-copy-${index + 1}`, existingIds),
      })),
    };
    const index = criterion.ruleGroups.findIndex((group) => group.id === groupId);
    return {
      ...criterion,
      ruleGroups: insertAt(criterion.ruleGroups, index + 1, copy),
    };
  });
}

export function deleteRuleGroup(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
) {
  return updateCriterion(configuration, criterionKey, (criterion) => ({
    ...criterion,
    ruleGroups: criterion.ruleGroups.filter((group) => group.id !== groupId),
  }));
}

export function moveRuleGroup(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  direction: "up" | "down",
) {
  return updateCriterion(configuration, criterionKey, (criterion) => ({
    ...criterion,
    ruleGroups: moveById(criterion.ruleGroups, groupId, direction),
  }));
}

export function createRule(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  input: RuleInput,
) {
  return updateGroup(configuration, criterionKey, groupId, (group, criterion) => ({
    ...group,
    rules: [
      ...group.rules,
      {
        ...normalizeRuleInput(input),
        id: nextId(
          "rule",
          criterion.ruleGroups.flatMap((item) => item.rules.map((rule) => rule.id)),
        ),
      },
    ],
  }));
}

export function updateRule(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  ruleId: string,
  input: RuleInput,
) {
  return updateGroup(configuration, criterionKey, groupId, (group) => ({
    ...group,
    rules: group.rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...normalizeRuleInput(input), id: rule.id } : rule,
    ),
  }));
}

export function duplicateRule(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  ruleId: string,
) {
  return updateGroup(configuration, criterionKey, groupId, (group, criterion) => {
    const source = group.rules.find((rule) => rule.id === ruleId);
    if (!source) return group;
    const copy = {
      ...clone(source),
      id: nextId(
        `${source.id}-copy`,
        criterion.ruleGroups.flatMap((item) => item.rules.map((rule) => rule.id)),
      ),
      label: `${source.label} (bản sao)`,
    };
    const index = group.rules.findIndex((rule) => rule.id === ruleId);
    return { ...group, rules: insertAt(group.rules, index + 1, copy) };
  });
}

export function deleteRule(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  ruleId: string,
) {
  return updateGroup(configuration, criterionKey, groupId, (group) => ({
    ...group,
    rules: group.rules.filter((rule) => rule.id !== ruleId),
  }));
}

export function moveRule(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  ruleId: string,
  direction: "up" | "down",
) {
  return updateGroup(configuration, criterionKey, groupId, (group) => ({
    ...group,
    rules: moveById(group.rules, ruleId, direction),
  }));
}

export function moveRuleToGroup(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  sourceGroupId: string,
  targetGroupId: string,
  ruleId: string,
) {
  if (sourceGroupId === targetGroupId) return configuration;
  const criterion = configuration.criteria[criterionKey];
  const sourceGroup = criterion.ruleGroups.find((group) => group.id === sourceGroupId);
  const rule = sourceGroup?.rules.find((item) => item.id === ruleId);
  if (!rule) return configuration;

  return updateCriterion(configuration, criterionKey, (current) => ({
    ...current,
    ruleGroups: current.ruleGroups.map((group) => {
      if (group.id === sourceGroupId) {
        return { ...group, rules: group.rules.filter((item) => item.id !== ruleId) };
      }
      if (group.id === targetGroupId) {
        return { ...group, rules: [...group.rules, rule] };
      }
      return group;
    }),
  }));
}

export function createOtherEvidence(
  configuration: CriteriaConfiguration,
  input: OtherEvidenceInput,
) {
  const groups = ensureOtherPurposeGroup(configuration.otherEvidenceGroups, input.purpose);
  return {
    ...configuration,
    otherEvidenceGroups: groups.map((group) =>
      group.purpose === input.purpose
        ? {
            ...group,
            relatedCriteria: mergeCriteria(group.relatedCriteria, input.relatedCriteria),
            evidenceTypes: [
              ...group.evidenceTypes,
              {
                id: nextId(
                  "other",
                  groups.flatMap((item) => item.evidenceTypes.map((evidence) => evidence.id)),
                ),
                label: input.label.trim(),
                description: input.description?.trim() || undefined,
                relatedCriteria: input.relatedCriteria,
                handling: input.purpose,
              },
            ],
          }
        : group,
    ),
  };
}

export function updateOtherEvidence(
  configuration: CriteriaConfiguration,
  evidenceId: string,
  input: OtherEvidenceInput,
) {
  const source = findOtherEvidence(configuration.otherEvidenceGroups, evidenceId);
  if (!source) return configuration;
  const groups = ensureOtherPurposeGroup(configuration.otherEvidenceGroups, input.purpose);
  const updatedEvidence: OtherEvidenceType = {
    ...source.evidence,
    id: evidenceId,
    label: input.label.trim(),
    description: input.description?.trim() || undefined,
    relatedCriteria: input.relatedCriteria,
    handling: input.purpose,
  };

  return {
    ...configuration,
    otherEvidenceGroups: groups.map((group) => {
      const evidenceTypes = group.evidenceTypes.filter((evidence) => evidence.id !== evidenceId);
      if (group.purpose !== input.purpose) {
        return { ...group, evidenceTypes };
      }
      return {
        ...group,
        relatedCriteria: mergeCriteria(group.relatedCriteria, input.relatedCriteria),
        evidenceTypes: [...evidenceTypes, updatedEvidence],
      };
    }),
  };
}

export function duplicateOtherEvidence(configuration: CriteriaConfiguration, evidenceId: string) {
  const source = findOtherEvidence(configuration.otherEvidenceGroups, evidenceId);
  if (!source) return configuration;
  return createOtherEvidence(configuration, {
    label: `${source.evidence.label} (bản sao)`,
    description: source.evidence.description,
    purpose: source.group.purpose,
    relatedCriteria: source.evidence.relatedCriteria ?? source.group.relatedCriteria,
  });
}

export function deleteOtherEvidence(configuration: CriteriaConfiguration, evidenceId: string) {
  return {
    ...configuration,
    otherEvidenceGroups: removeOtherEvidence(configuration.otherEvidenceGroups, evidenceId).groups,
  };
}

export function moveOtherEvidencePurpose(
  configuration: CriteriaConfiguration,
  evidenceId: string,
  purpose: OtherEvidencePurpose,
) {
  const source = findOtherEvidence(configuration.otherEvidenceGroups, evidenceId);
  if (!source) return configuration;
  return updateOtherEvidence(configuration, evidenceId, {
    label: source.evidence.label,
    description: source.evidence.description,
    purpose,
    relatedCriteria: source.evidence.relatedCriteria ?? source.group.relatedCriteria,
  });
}

export function hasMalformedOtherEvidence(configuration: CriteriaConfiguration) {
  return configuration.otherEvidenceGroups.some(
    (group) =>
      !Object.keys(OTHER_PURPOSE_LABELS).includes(group.purpose) ||
      group.evidenceTypes.some((evidence) => evidence.mandatory === true),
  );
}

function updateCriterion(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  updater: (criterion: CriterionConfiguration) => CriterionConfiguration,
) {
  return {
    ...configuration,
    criteria: {
      ...configuration.criteria,
      [criterionKey]: updater(configuration.criteria[criterionKey]),
    },
  };
}

function updateGroup(
  configuration: CriteriaConfiguration,
  criterionKey: CoreCriterionKey,
  groupId: string,
  updater: (group: RuleGroup, criterion: CriterionConfiguration) => RuleGroup,
) {
  return updateCriterion(configuration, criterionKey, (criterion) => ({
    ...criterion,
    ruleGroups: criterion.ruleGroups.map((group) =>
      group.id === groupId ? updater(group, criterion) : group,
    ),
  }));
}

function normalizeRuleInput(input: RuleInput): CriterionRule {
  return {
    id: "",
    label: input.label.trim(),
    type: input.type,
    operator: input.operator ?? defaultOperator(input.type),
    value: input.value,
    unit: input.unit?.trim() || undefined,
    scale: input.scale,
    metricLabel: input.metricLabel?.trim() || undefined,
    evidenceLabel: input.evidenceLabel?.trim() || undefined,
    contextLabel: input.contextLabel?.trim() || undefined,
    evidenceCount: input.evidenceCount,
    sumLabel: input.sumLabel?.trim() || undefined,
    dateMode: input.dateMode,
    startDate: input.startDate || undefined,
    endDate: input.endDate || undefined,
    acceptedValues: input.acceptedValues?.filter(Boolean),
    evidenceTypes: input.evidenceTypes?.filter(Boolean),
    manualInstruction: input.manualInstruction?.trim() || undefined,
  };
}

function defaultOperator(type: CriterionRuleType): CriterionRule["operator"] {
  if (type === "enum_match") return "in";
  if (type === "boolean_condition") return "eq";
  return "gte";
}

function ruleNeedsValue(rule: CriterionRule) {
  return ["numeric_threshold", "evidence_count", "evidence_sum", "organizer_level"].includes(
    rule.type,
  );
}

function operatorLabel(operator: CriterionRule["operator"]) {
  const labels: Record<CriterionRule["operator"], string> = {
    gte: "từ",
    lte: "không quá",
    eq: "bằng",
    neq: "khác",
    exists: "có",
    not_exists: "không có",
    in: "thuộc",
    not_in: "không thuộc",
  };
  return labels[operator];
}

function formatRuleValue(rule: CriterionRule) {
  if (Array.isArray(rule.value)) return rule.value.join(", ");
  if (rule.value === undefined || rule.value === "") return "";
  return String(rule.value);
}

function toStringArray(value: CriterionRule["value"]) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value) return [value];
  return [];
}

function ensureOtherPurposeGroup(groups: OtherEvidenceGroup[], purpose: OtherEvidencePurpose) {
  if (groups.some((group) => group.purpose === purpose)) return groups;
  return [
    ...groups,
    {
      id: nextId(
        "other-group",
        groups.map((group) => group.id),
      ),
      title: OTHER_PURPOSE_LABELS[purpose],
      purpose,
      relatedCriteria: [],
      evidenceTypes: [],
    },
  ];
}

function removeOtherEvidence(groups: OtherEvidenceGroup[], evidenceId: string) {
  let removed: OtherEvidenceType | null = null;
  const nextGroups = groups.map((group) => ({
    ...group,
    evidenceTypes: group.evidenceTypes.filter((evidence) => {
      if (evidence.id !== evidenceId) return true;
      removed = evidence;
      return false;
    }),
  }));
  return {
    removed,
    groups: nextGroups,
  };
}

function findOtherEvidence(groups: OtherEvidenceGroup[], evidenceId: string) {
  for (const group of groups) {
    const evidence = group.evidenceTypes.find((item) => item.id === evidenceId);
    if (evidence) return { group, evidence };
  }
  return null;
}

function mergeCriteria(left: CoreCriterionKey[], right: CoreCriterionKey[]) {
  return Array.from(new Set([...left, ...right]));
}

function insertAt<T>(items: T[], index: number, item: T) {
  return [...items.slice(0, index), item, ...items.slice(index)];
}

function moveById<T extends { id: string }>(items: T[], id: string, direction: "up" | "down") {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return items;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

function nextId(prefix: string, existingIds: string[]) {
  const normalizedPrefix = prefix
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9a-zA-Z-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  let index = existingIds.length + 1;
  let id = `${normalizedPrefix}-${index}`;
  while (existingIds.includes(id)) {
    index += 1;
    id = `${normalizedPrefix}-${index}`;
  }
  return id;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
