import type { Criterion, Level, MetricType } from "@/lib/api/types";

export type CoreCriterion = Exclude<Criterion, "priority" | "collective">;

export type CriteriaMatrixItem = {
  level: Level;
  criterion: CoreCriterion;
  hardRequirements: string[];
  additionalRequirements: string[];
  suggestedEvidenceTypes: string[];
  sourceLabel: string;
  sourceDocument: string;
  thresholds?: {
    gpaMin?: number;
    conductMin?: number;
    volunteerDaysMin?: number;
    languageRequired?: boolean;
    evidenceRequired?: boolean;
    achievementRequired?: boolean;
  };
};

export type CriteriaLevelSummary = {
  level: Level;
  label: string;
  shortLabel: string;
  description: string;
  difference: string;
  overallRequirements: string[];
};

export type CriterionInputField =
  | { kind: "metric"; metricType: MetricType; label: string; placeholder: string; scale?: number }
  | { kind: "select"; key: string; label: string; options: string[]; defaultValue: string }
  | { kind: "text"; key: string; label: string; inputType?: "text" | "date" };

export type MatrixMetricLike = {
  metricType: string;
  value?: number | string | null;
  scale?: number | null;
};

export type MatrixEvidenceLike = {
  criterion?: Criterion | null;
  evidenceName?: string | null;
  confidence?: number | null;
  status?: string | null;
};

export type CriteriaSuitabilityStatus = "met" | "needs_supplement" | "missing_data" | "not_suitable";

export type CriterionSuitability = {
  criterion: CoreCriterion;
  label: string;
  status: CriteriaSuitabilityStatus;
  statusLabel: string;
  facts: string[];
  missing: string[];
};

export type LevelSuitability = {
  level: Level;
  status: CriteriaSuitabilityStatus;
  statusLabel: string;
  criteria: CriterionSuitability[];
  missing: string[];
};

const source = {
  label: "Bộ tiêu chí Sinh viên 5 tốt",
  document: "Quy định xét chọn Sinh viên 5 tốt theo cấp",
};

export const coreCriteria: Array<{
  key: CoreCriterion;
  label: string;
  color: string;
  description: string;
}> = [
  {
    key: "ethics",
    label: "Đạo đức tốt",
    color: "#EF4444",
    description: "Điểm rèn luyện, cam kết không vi phạm và thành tích Đoàn - Hội khi cấp xét yêu cầu.",
  },
  {
    key: "academic",
    label: "Học tập tốt",
    color: "#0057C2",
    description: "GPA/ĐTB, xác nhận không có điểm F và thành tích học thuật hoặc nghiên cứu khoa học nếu có.",
  },
  {
    key: "physical",
    label: "Thể lực tốt",
    color: "#10B981",
    description: "Sinh viên khỏe, Thanh niên khỏe hoặc hoạt động thể thao được đơn vị tổ chức xác nhận.",
  },
  {
    key: "volunteer",
    label: "Tình nguyện tốt",
    color: "#F59E0B",
    description: "Số ngày tình nguyện, hoạt động tham gia, đơn vị tổ chức và giấy khen/chứng nhận nếu có.",
  },
  {
    key: "integration",
    label: "Hội nhập tốt",
    color: "#7C3AED",
    description: "Chứng chỉ ngoại ngữ, hoạt động hội nhập, thời hạn và cấp tổ chức.",
  },
];

export const criteriaLevelSummaries: Record<Level, CriteriaLevelSummary> = {
  school: {
    level: "school",
    label: "Cấp Trường",
    shortLabel: "Trường",
    description: "Phù hợp khi hồ sơ có đủ dữ liệu cơ bản và giấy xác nhận rõ ràng.",
    difference: "Ngưỡng nền tảng để xét các cấp cao hơn.",
    overallRequirements: [
      "GPA/ĐTB từ 3.0/4.0 trở lên.",
      "Điểm rèn luyện từ 82/100 trở lên.",
      "Có dữ liệu hoặc giấy xác nhận cho đủ 5 tiêu chí.",
    ],
  },
  university: {
    level: "university",
    label: "Cấp Đại học Đà Nẵng",
    shortLabel: "ĐHĐN",
    description: "Cần học tập, tình nguyện và giấy xác nhận nổi bật hơn cấp Trường.",
    difference: "Tăng ngưỡng GPA, yêu cầu tình nguyện tối thiểu 3 ngày hoặc tương đương.",
    overallRequirements: [
      "GPA/ĐTB từ 3.2/4.0 trở lên.",
      "Điểm rèn luyện từ 80/100 trở lên.",
      "Có thành tích hoặc giấy xác nhận đủ rõ cho các tiêu chí chính.",
    ],
  },
  city: {
    level: "city",
    label: "Cấp Thành phố",
    shortLabel: "Thành phố",
    description: "Dành cho hồ sơ có tình nguyện, hội nhập và thành tích được xác nhận rõ.",
    difference: "Tình nguyện tối thiểu 5 ngày và yêu cầu hội nhập rõ hơn cấp ĐHĐN.",
    overallRequirements: [
      "GPA/ĐTB từ 3.2/4.0 hoặc tương đương.",
      "Điểm rèn luyện từ 80/100 trở lên.",
      "Tình nguyện từ 5 ngày trở lên và có yêu cầu hội nhập theo cấp.",
    ],
  },
  central: {
    level: "central",
    label: "Cấp Trung ương",
    shortLabel: "Trung ương",
    description: "Dành cho hồ sơ nổi bật ở nhiều nhóm tiêu chí và có thành tích ưu tiên.",
    difference: "Ngưỡng GPA/ĐRL cao hơn, cần tình nguyện, hội nhập và thành tích mạnh hơn.",
    overallRequirements: [
      "GPA/ĐTB từ 3.4/4.0 trở lên.",
      "Điểm rèn luyện từ 90/100 trở lên.",
      "Có tình nguyện, hội nhập và thành tích nổi bật được xác nhận.",
    ],
  },
};

export const criteriaMatrix: Record<Level, Record<CoreCriterion, CriteriaMatrixItem>> = {
  school: {
    ethics: matrixItem("school", "ethics", {
      hardRequirements: ["Điểm rèn luyện từ 82/100 trở lên.", "Không vi phạm pháp luật, kỷ luật hoặc nội quy."],
      additionalRequirements: ["Có cam kết hoặc xác nhận của đơn vị khi hồ sơ cần đối chiếu."],
      suggestedEvidenceTypes: ["Phiếu điểm rèn luyện", "Giấy xác nhận không vi phạm", "Thành tích Đoàn - Hội nếu có"],
      thresholds: { conductMin: 82, evidenceRequired: true },
    }),
    academic: matrixItem("school", "academic", {
      hardRequirements: ["GPA/ĐTB từ 3.0/4.0 trở lên.", "Không có học phần điểm F trong năm xét."],
      additionalRequirements: ["Thành tích học thuật, nghiên cứu khoa học hoặc giải thưởng được ghi nhận là điểm cộng."],
      suggestedEvidenceTypes: ["Bảng điểm", "Giấy khen học thuật hoặc nghiên cứu khoa học"],
      thresholds: { gpaMin: 3.0, evidenceRequired: true },
    }),
    physical: matrixItem("school", "physical", {
      hardRequirements: ["Đạt Sinh viên khỏe, Thanh niên khỏe hoặc tiêu chuẩn thể lực tương đương."],
      additionalRequirements: ["Hoạt động thể thao có đơn vị tổ chức rõ ràng được ưu tiên."],
      suggestedEvidenceTypes: ["Giấy chứng nhận Sinh viên khỏe", "Giấy xác nhận hoạt động thể thao"],
      thresholds: { evidenceRequired: true },
    }),
    volunteer: matrixItem("school", "volunteer", {
      hardRequirements: ["Có hoạt động tình nguyện được ghi nhận hoặc tối thiểu 2 ngày tình nguyện."],
      additionalRequirements: ["Hoạt động trong kho sự kiện giúp hồ sơ được đối chiếu nhanh hơn."],
      suggestedEvidenceTypes: ["Giấy chứng nhận chiến dịch tình nguyện", "Giấy xác nhận hiến máu hoặc hoạt động cộng đồng"],
      thresholds: { volunteerDaysMin: 2, evidenceRequired: true },
    }),
    integration: matrixItem("school", "integration", {
      hardRequirements: ["Có chứng chỉ ngoại ngữ hoặc hoạt động hội nhập phù hợp."],
      additionalRequirements: ["Cần ngày cấp, thời hạn và đơn vị cấp khi dùng chứng chỉ ngoại ngữ."],
      suggestedEvidenceTypes: ["Chứng chỉ ngoại ngữ", "Giấy chứng nhận tập huấn, hội thảo hoặc giao lưu quốc tế"],
      thresholds: { languageRequired: true, evidenceRequired: true },
    }),
  },
  university: {
    ethics: matrixItem("university", "ethics", {
      hardRequirements: ["Điểm rèn luyện từ 80/100 trở lên.", "Không vi phạm pháp luật, kỷ luật hoặc nội quy."],
      additionalRequirements: ["Nên có quyết định hoặc xác nhận đạt cấp Trường nếu đơn vị yêu cầu."],
      suggestedEvidenceTypes: ["Phiếu điểm rèn luyện", "Quyết định công nhận cấp Trường", "Thành tích Đoàn - Hội"],
      thresholds: { conductMin: 80, evidenceRequired: true },
    }),
    academic: matrixItem("university", "academic", {
      hardRequirements: ["GPA/ĐTB từ 3.2/4.0 trở lên.", "Không có học phần điểm F."],
      additionalRequirements: ["Cần thêm thành tích học thuật, nghiên cứu khoa học hoặc giải thưởng nếu hồ sơ xét cạnh tranh."],
      suggestedEvidenceTypes: ["Bảng điểm", "Giấy khen nghiên cứu khoa học", "Quyết định đội tuyển học thuật"],
      thresholds: { gpaMin: 3.2, evidenceRequired: true, achievementRequired: true },
    }),
    physical: matrixItem("university", "physical", {
      hardRequirements: ["Đạt Sinh viên khỏe, Thanh niên khỏe hoặc hoạt động thể thao được xác nhận."],
      additionalRequirements: ["Ưu tiên giấy xác nhận từ cấp Trường trở lên."],
      suggestedEvidenceTypes: ["Giấy chứng nhận Sinh viên khỏe", "Giấy chứng nhận giải thể thao cấp Trường trở lên"],
      thresholds: { evidenceRequired: true },
    }),
    volunteer: matrixItem("university", "volunteer", {
      hardRequirements: ["Có tối thiểu 3 ngày tình nguyện hoặc tiêu chuẩn tương đương."],
      additionalRequirements: ["Giấy khen hoặc chứng nhận cấp Trường trở lên giúp hồ sơ rõ hơn."],
      suggestedEvidenceTypes: ["Giấy chứng nhận chiến dịch tình nguyện", "Giấy khen tình nguyện cấp Trường"],
      thresholds: { volunteerDaysMin: 3, evidenceRequired: true },
    }),
    integration: matrixItem("university", "integration", {
      hardRequirements: ["Có chứng chỉ ngoại ngữ hoặc hoạt động hội nhập được xác nhận."],
      additionalRequirements: ["Ưu tiên chứng chỉ còn thời hạn hoặc hoạt động giao lưu, hội thảo có cấp tổ chức rõ."],
      suggestedEvidenceTypes: ["Chứng chỉ B1 hoặc tương đương", "Giấy chứng nhận giao lưu quốc tế", "Giấy khen Hội - Đoàn"],
      thresholds: { languageRequired: true, evidenceRequired: true },
    }),
  },
  city: {
    ethics: matrixItem("city", "ethics", {
      hardRequirements: ["Điểm rèn luyện từ 80/100 trở lên.", "Không vi phạm pháp luật, kỷ luật hoặc nội quy."],
      additionalRequirements: ["Có thành tích đạo đức, Đoàn - Hội hoặc xác nhận đề nghị xét cấp Thành phố nếu đơn vị yêu cầu."],
      suggestedEvidenceTypes: ["Phiếu điểm rèn luyện", "Quyết định cấp Trường", "Thành tích Đoàn - Hội hoặc thanh niên tiêu biểu"],
      thresholds: { conductMin: 80, evidenceRequired: true, achievementRequired: true },
    }),
    academic: matrixItem("city", "academic", {
      hardRequirements: ["GPA/ĐTB từ 3.2/4.0 hoặc 8.0/10 trở lên.", "Không có học phần điểm F."],
      additionalRequirements: ["Cần thành tích học thuật, nghiên cứu khoa học hoặc giải thưởng được xác nhận."],
      suggestedEvidenceTypes: ["Bảng điểm", "Giấy khen nghiên cứu khoa học", "Giấy chứng nhận cuộc thi học thuật"],
      thresholds: { gpaMin: 3.2, evidenceRequired: true, achievementRequired: true },
    }),
    physical: matrixItem("city", "physical", {
      hardRequirements: ["Đạt Sinh viên khỏe, Thanh niên khỏe hoặc hoạt động thể thao cấp Khoa trở lên."],
      additionalRequirements: ["Nên có ngày cấp và cấp tổ chức rõ trong giấy xác nhận."],
      suggestedEvidenceTypes: ["Giấy chứng nhận Sinh viên khỏe", "Giấy chứng nhận giải thể thao cấp Khoa trở lên"],
      thresholds: { evidenceRequired: true },
    }),
    volunteer: matrixItem("city", "volunteer", {
      hardRequirements: ["Có tối thiểu 5 ngày tình nguyện trong năm xét.", "Hoạt động cần có đơn vị tổ chức hoặc giấy xác nhận."],
      additionalRequirements: ["Giấy khen/chứng nhận tình nguyện cấp Khoa trở lên là điểm cộng quan trọng."],
      suggestedEvidenceTypes: ["Giấy chứng nhận chiến dịch tình nguyện", "Giấy khen tình nguyện cấp Khoa trở lên"],
      thresholds: { volunteerDaysMin: 5, evidenceRequired: true, achievementRequired: true },
    }),
    integration: matrixItem("city", "integration", {
      hardRequirements: ["Có chứng chỉ ngoại ngữ hoặc điểm ngoại ngữ theo ngưỡng cấp Thành phố.", "Chứng chỉ cần còn thời hạn hoặc có xác nhận hợp lệ."],
      additionalRequirements: ["Hoạt động hội nhập, giao lưu quốc tế hoặc giải ngoại ngữ giúp hồ sơ phù hợp hơn."],
      suggestedEvidenceTypes: ["Chứng chỉ ngoại ngữ", "Giấy chứng nhận giao lưu quốc tế", "Giấy chứng nhận cuộc thi ngoại ngữ"],
      thresholds: { languageRequired: true, evidenceRequired: true, achievementRequired: true },
    }),
  },
  central: {
    ethics: matrixItem("central", "ethics", {
      hardRequirements: ["Điểm rèn luyện từ 90/100 trở lên.", "Không vi phạm pháp luật, kỷ luật hoặc nội quy."],
      additionalRequirements: ["Cần thành tích đạo đức, Đoàn - Hội hoặc danh hiệu nổi bật được xác nhận."],
      suggestedEvidenceTypes: ["Phiếu điểm rèn luyện", "Quyết định công nhận cấp Tỉnh/Thành", "Thành tích đạo đức hoặc Đoàn - Hội nổi bật"],
      thresholds: { conductMin: 90, evidenceRequired: true, achievementRequired: true },
    }),
    academic: matrixItem("central", "academic", {
      hardRequirements: ["GPA/ĐTB từ 3.4/4.0 hoặc 8.5/10 trở lên.", "Không có học phần điểm F."],
      additionalRequirements: ["Cần thành tích học thuật mạnh như nghiên cứu khoa học, đội tuyển, giải thưởng hoặc sản phẩm sáng tạo."],
      suggestedEvidenceTypes: ["Bảng điểm", "Giải nghiên cứu khoa học", "Quyết định đội tuyển hoặc giải học thuật"],
      thresholds: { gpaMin: 3.4, evidenceRequired: true, achievementRequired: true },
    }),
    physical: matrixItem("central", "physical", {
      hardRequirements: ["Đạt Sinh viên khỏe, Thanh niên khỏe hoặc thành tích thể thao từ cấp Trường trở lên."],
      additionalRequirements: ["Ưu tiên giấy xác nhận cấp Tỉnh/Thành hoặc Trung ương nếu có."],
      suggestedEvidenceTypes: ["Giấy chứng nhận Sinh viên khỏe", "Giấy chứng nhận giải thể thao cấp Trường trở lên"],
      thresholds: { evidenceRequired: true, achievementRequired: true },
    }),
    volunteer: matrixItem("central", "volunteer", {
      hardRequirements: ["Có tối thiểu 5 ngày tình nguyện trong năm xét.", "Hoạt động tình nguyện cần có vai trò hoặc thành tích nổi bật."],
      additionalRequirements: ["Ưu tiên bằng khen cấp Tỉnh/Thành, UBND huyện trở lên hoặc tương đương."],
      suggestedEvidenceTypes: ["Giấy chứng nhận chiến dịch tình nguyện", "Bằng khen hoặc giấy khen tình nguyện cấp cao"],
      thresholds: { volunteerDaysMin: 5, evidenceRequired: true, achievementRequired: true },
    }),
    integration: matrixItem("central", "integration", {
      hardRequirements: ["Có chứng chỉ ngoại ngữ hoặc điểm ngoại ngữ phù hợp.", "Có hoạt động hội nhập cấp Trường trở lên hoặc thành tích hội nhập nổi bật."],
      additionalRequirements: ["Cần ngày cấp, thời hạn, đơn vị cấp và tài liệu xác nhận rõ."],
      suggestedEvidenceTypes: ["Chứng chỉ ngoại ngữ", "Giấy chứng nhận giao lưu quốc tế", "Giải thưởng ngoại ngữ hoặc hội nhập"],
      thresholds: { languageRequired: true, evidenceRequired: true, achievementRequired: true },
    }),
  },
};

export const criterionInputFields: Record<CoreCriterion, CriterionInputField[]> = {
  ethics: [
    { kind: "metric", metricType: "conduct_score", label: "Điểm rèn luyện", placeholder: "Ví dụ 90" },
    { kind: "select", key: "discipline", label: "Có vi phạm pháp luật/kỷ luật không", options: ["Không", "Có"], defaultValue: "Không" },
    { kind: "text", key: "ethics_achievement", label: "Minh chứng đạo đức/Đoàn-Hội nếu cấp yêu cầu" },
  ],
  academic: [
    { kind: "metric", metricType: "gpa", label: "GPA/ĐTB", placeholder: "Ví dụ 3.4", scale: 4 },
    { kind: "select", key: "gpa_scale", label: "Thang điểm", options: ["4", "10"], defaultValue: "4" },
    { kind: "select", key: "has_f", label: "Có điểm F không", options: ["Không", "Có"], defaultValue: "Không" },
    { kind: "text", key: "academic_achievement", label: "Minh chứng học thuật/NCKH/giải thưởng" },
  ],
  physical: [
    { kind: "select", key: "physical_passed", label: "Đạt Sinh viên khỏe/Thanh niên khỏe", options: ["Đạt", "Chưa đạt", "Chờ cán bộ kiểm tra sau khi nộp"], defaultValue: "Đạt" },
    { kind: "text", key: "sport_activity_type", label: "Loại hoạt động thể thao" },
    { kind: "text", key: "physical_issued_at", label: "Ngày cấp", inputType: "date" },
    { kind: "text", key: "physical_organizer_level", label: "Cấp tổ chức" },
  ],
  volunteer: [
    { kind: "metric", metricType: "volunteer_days", label: "Số ngày tình nguyện", placeholder: "Ví dụ 5" },
    { kind: "text", key: "volunteer_activity", label: "Hoạt động" },
    { kind: "text", key: "volunteer_organizer", label: "Đơn vị tổ chức" },
    { kind: "select", key: "volunteer_certificate", label: "Có giấy khen/chứng nhận không", options: ["Có", "Chưa có", "Cần bổ sung"], defaultValue: "Có" },
  ],
  integration: [
    { kind: "metric", metricType: "foreign_language_score", label: "Chứng chỉ hoặc điểm ngoại ngữ", placeholder: "Ví dụ IELTS 6.5 hoặc TOEIC 650" },
    { kind: "text", key: "language_issued_at", label: "Ngày cấp", inputType: "date" },
    { kind: "text", key: "language_expires_at", label: "Thời hạn", inputType: "date" },
    { kind: "text", key: "integration_activity", label: "Hoạt động hội nhập" },
    { kind: "text", key: "integration_organizer_level", label: "Cấp tổ chức" },
  ],
};

export const priorityAchievementGroup = {
  label: "Minh chứng ưu tiên / Danh hiệu nổi bật",
  examples: ["Sao Tháng Giêng", "Giải thưởng nghiên cứu khoa học", "Danh hiệu thanh niên tiêu biểu", "Giải thưởng học thuật hoặc hội nhập cấp cao"],
};

export const suitabilityLabels: Record<CriteriaSuitabilityStatus, string> = {
  met: "Đạt",
  needs_supplement: "Cần bổ sung",
  missing_data: "Chưa đủ dữ liệu",
  not_suitable: "Không phù hợp",
};

export function getCriterionMatrixItem(level: Level, criterion: Criterion) {
  if (!isCoreCriterion(criterion)) return null;
  return criteriaMatrix[level]?.[criterion] ?? null;
}

export function getLevelCriteria(level: Level) {
  return coreCriteria.map((criterion) => criteriaMatrix[level][criterion.key]);
}

export function getPrimaryMetricInput(criterion: Criterion) {
  if (!isCoreCriterion(criterion)) return null;
  return criterionInputFields[criterion].find((field): field is Extract<CriterionInputField, { kind: "metric" }> => field.kind === "metric") ?? null;
}

export function evaluateLevelAgainstMatrix(
  level: Level,
  context: { metrics: MatrixMetricLike[]; evidences: MatrixEvidenceLike[] },
): LevelSuitability {
  const criteria = coreCriteria.map((criterion) => evaluateCriterionAgainstMatrix(level, criterion.key, context));
  const missing = criteria.flatMap((item) => item.missing.map((message) => `${item.label}: ${message}`));
  const status = combineStatuses(criteria.map((item) => item.status));
  return {
    level,
    status,
    statusLabel: suitabilityLabels[status],
    criteria,
    missing,
  };
}

export function evaluateCriterionAgainstMatrix(
  level: Level,
  criterion: CoreCriterion,
  context: { metrics: MatrixMetricLike[]; evidences: MatrixEvidenceLike[] },
): CriterionSuitability {
  const item = criteriaMatrix[level][criterion];
  const facts: string[] = [];
  const missing: string[] = [];
  const failed: string[] = [];
  const relatedEvidence = context.evidences.filter((evidence) => evidence.criterion === criterion);
  const thresholds = item.thresholds ?? {};

  if (typeof thresholds.gpaMin === "number") {
    const value = getMetricNumber(context.metrics, "gpa");
    if (value === null) missing.push("Cần nhập GPA/ĐTB.");
    else if (value < thresholds.gpaMin) failed.push(`GPA hiện tại ${value} chưa đủ ngưỡng ${thresholds.gpaMin}.`);
    else facts.push(`GPA ${value} đạt ngưỡng ${thresholds.gpaMin}.`);
  }

  if (typeof thresholds.conductMin === "number") {
    const value = getMetricNumber(context.metrics, "conduct_score");
    if (value === null) missing.push("Cần nhập điểm rèn luyện.");
    else if (value < thresholds.conductMin) failed.push(`Điểm rèn luyện ${value} chưa đủ ngưỡng ${thresholds.conductMin}.`);
    else facts.push(`Điểm rèn luyện ${value} đạt ngưỡng ${thresholds.conductMin}.`);
  }

  if (typeof thresholds.volunteerDaysMin === "number") {
    const value = getMetricNumber(context.metrics, "volunteer_days");
    if (value === null) missing.push("Cần nhập số ngày tình nguyện.");
    else if (value < thresholds.volunteerDaysMin) failed.push(`Số ngày tình nguyện ${value} chưa đủ ngưỡng ${thresholds.volunteerDaysMin}.`);
    else facts.push(`${value} ngày tình nguyện đạt ngưỡng ${thresholds.volunteerDaysMin}.`);
  }

  if (thresholds.languageRequired) {
    const languageMetric = getMetricValue(context.metrics, "foreign_language_score");
    if (criterion === "integration" && !languageMetric && relatedEvidence.length === 0) {
      missing.push("Cần chứng chỉ ngoại ngữ hoặc giấy xác nhận hoạt động hội nhập.");
    } else if (languageMetric) {
      facts.push(`Đã ghi nhận ${languageMetric}.`);
    }
  }

  if (thresholds.evidenceRequired) {
    if (relatedEvidence.length === 0) missing.push("Cần thêm thành tích hoặc giấy xác nhận liên quan.");
    else facts.push(`Có ${relatedEvidence.length} thành tích/giấy xác nhận.`);
  }

  if (thresholds.achievementRequired && relatedEvidence.length === 0) {
    missing.push("Cần thành tích nổi bật hoặc giấy xác nhận phù hợp với cấp xét.");
  }

  const lowClarity = relatedEvidence.some((evidence) => typeof evidence.confidence === "number" && evidence.confidence < 0.7);
  if (lowClarity) missing.push("Có tài liệu cần cán bộ xác nhận thêm.");

  const status: CriteriaSuitabilityStatus = failed.length
    ? "not_suitable"
    : missing.some((message) => message.startsWith("Cần nhập") || message.startsWith("Cần chứng chỉ"))
      ? "missing_data"
      : missing.length
        ? "needs_supplement"
        : "met";

  return {
    criterion,
    label: coreCriteria.find((entry) => entry.key === criterion)?.label ?? criterion,
    status,
    statusLabel: suitabilityLabels[status],
    facts,
    missing: [...failed, ...missing],
  };
}

export function isCoreCriterion(criterion: Criterion): criterion is CoreCriterion {
  return criterion !== "priority" && criterion !== "collective";
}

function matrixItem(
  level: Level,
  criterion: CoreCriterion,
  item: Omit<CriteriaMatrixItem, "level" | "criterion" | "sourceLabel" | "sourceDocument">,
): CriteriaMatrixItem {
  return {
    level,
    criterion,
    sourceLabel: source.label,
    sourceDocument: source.document,
    ...item,
  };
}

function getMetricNumber(metrics: MatrixMetricLike[], metricType: MetricType) {
  const raw = getMetricValue(metrics, metricType);
  if (raw === null) return null;
  const value = typeof raw === "number" ? raw : Number(String(raw).replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function getMetricValue(metrics: MatrixMetricLike[], metricType: MetricType) {
  const metric = metrics.find((item) => item.metricType === metricType);
  return metric?.value ?? null;
}

function combineStatuses(statuses: CriteriaSuitabilityStatus[]): CriteriaSuitabilityStatus {
  if (statuses.includes("not_suitable")) return "not_suitable";
  if (statuses.includes("missing_data")) return "missing_data";
  if (statuses.includes("needs_supplement")) return "needs_supplement";
  return "met";
}
