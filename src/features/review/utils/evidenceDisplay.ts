import type {
  CriterionLevelAssessment,
  Level,
  ReviewTaskDetail,
  ReviewTaskEvidence,
} from "../types";

export type EvidenceDisplayKind = "academic_transcript" | "event_achievement" | "generic_document";

export type EvidenceDisplayModel = {
  kind: EvidenceDisplayKind;
  title: string;
  sourceLabel: string;
  readerLabel: string;
  matchLabel: string;
  fields: Record<string, unknown>;
  fieldConfidence?: Record<string, number> | null;
  gpa?: number | null;
  gpaRequiresConfirmation?: boolean;
  scale?: string | null;
  eventName?: string | null;
  organizer?: string | null;
  organizerLevel?: Level | string | null;
  issueDate?: string | null;
  activityDate?: string | null;
};

const fallbackText = "Chưa có dữ liệu";

const sourceLabels: Record<ReviewTaskEvidence["sourceType"], string> = {
  metric_input: "Sinh viên nhập",
  manual_upload: "Tự tải lên",
  event_import: "Từ danh sách chính thức",
  collective_import: "Từ hồ sơ tập thể",
};

const readerLabels: Record<string, string> = {
  not_started: "Chưa đọc",
  uploaded: "Đã tải lên",
  pending_indexing: "Đang kiểm tra",
  ocr_processing: "Đang đọc file",
  extracting: "Đang đọc file",
  checking_registry: "Đang đối chiếu",
  indexed: "Đã đọc",
  needs_manual_review: "Cần cán bộ kiểm tra",
  failed: "Cần kiểm tra thêm",
};

export function buildEvidenceDisplayModel(evidence: ReviewTaskEvidence): EvidenceDisplayModel {
  const fields = getEvidenceFields(evidence);
  const eventName =
    stringField(fields, "eventName", "event_name") ?? evidence.event?.eventName ?? null;
  const organizer = stringField(fields, "organizer") ?? evidence.event?.organizer ?? null;
  const organizerLevel =
    stringField(fields, "organizerLevel", "organizer_level") ??
    evidence.event?.organizerLevel ??
    null;
  const documentType = stringField(fields, "documentType", "document_type");
  const gpaSuggestion = asRecord(evidence.card?.metricSuggestions).gpa;
  const gpa = numberField(asRecord(gpaSuggestion), "value") ?? numberField(fields, "gpa");
  const title = evidence.evidenceName || eventName || documentType || fallbackText;
  const kind = classifyEvidence(evidence, fields, title);

  return {
    kind,
    title,
    sourceLabel: sourceLabels[evidence.sourceType] ?? fallbackText,
    readerLabel: readerLabels[evidence.indexingStatus ?? ""] ?? fallbackText,
    matchLabel: getMatchLabel(evidence),
    fields,
    fieldConfidence: evidence.card?.fieldConfidence ?? null,
    gpa,
    gpaRequiresConfirmation: Boolean(asRecord(gpaSuggestion).requiresConfirmation),
    scale: stringField(fields, "scale", "gpaScale", "gpa_scale"),
    eventName,
    organizer,
    organizerLevel,
    issueDate: stringField(fields, "issueDate", "issue_date"),
    activityDate:
      stringField(fields, "activityDate", "activity_date") ??
      evidence.event?.startDate ??
      evidence.event?.endDate ??
      null,
  };
}

export function getMetricValue(
  metrics: ReviewTaskDetail["metrics"],
  metricType: string,
): string | number | null {
  const metric = metrics.find((item) => item.metricType === metricType);
  return metric?.value ?? null;
}

export function getGpaThreshold(targetLevel: Level): number | null {
  const thresholds: Record<Level, number> = {
    school: 3,
    university: 3.2,
    city: 3.2,
    central: 3.4,
  };
  return thresholds[targetLevel] ?? null;
}

export function getReviewGpaThreshold(
  targetLevel: Level,
  assessment?: CriterionLevelAssessment | null,
): number | null {
  const configured = assessment?.levels
    .find((level) => level.level === targetLevel)
    ?.requirements.find(
      (requirement) =>
        requirement.source === "criteria_version" && requirement.check?.metric === "gpa",
    )?.check?.value;

  if (typeof configured === "number" && Number.isFinite(configured)) return configured;
  if (targetLevel === "city") return null;
  return getGpaThreshold(targetLevel);
}

export function getEvidenceFields(evidence: ReviewTaskEvidence): Record<string, unknown> {
  return {
    ...asRecord(evidence.card?.extractedFieldsJson),
    ...asRecord(evidence.card?.normalizedFieldsJson),
    ...asRecord(evidence.card?.extractedFields),
    ...asRecord(evidence.card?.normalizedFields),
    ...asRecord(evidence.card?.readableSummary),
    ...asRecord(evidence.card?.primaryFields),
  };
}

export function getVisibleEvidenceFieldEntries(model: EvidenceDisplayModel) {
  const hiddenByKind: Record<EvidenceDisplayKind, Set<string>> = {
    academic_transcript: new Set([
      "activityDate",
      "activity_date",
      "certificateType",
      "certificate_type",
      "documentType",
      "document_type",
      "endDate",
      "end_date",
      "eventName",
      "event_name",
      "gpa",
      "gpaScale",
      "gpa_scale",
      "issueDate",
      "issue_date",
      "organizer",
      "organizerLevel",
      "organizer_level",
      "scale",
      "startDate",
      "start_date",
    ]),
    event_achievement: new Set([
      "activityDate",
      "activity_date",
      "endDate",
      "end_date",
      "eventName",
      "event_name",
      "issueDate",
      "issue_date",
      "organizer",
      "organizerLevel",
      "organizer_level",
      "startDate",
      "start_date",
    ]),
    generic_document: new Set(),
  };
  const seenCanonicalKeys = new Set<string>();

  return Object.entries(model.fields).filter(([key, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (hiddenByKind[model.kind].has(key)) return false;

    const canonicalKey = canonicalFieldKey(key);
    const confidence = model.fieldConfidence?.[canonicalKey] ?? model.fieldConfidence?.[key];
    if (confidence !== undefined && confidence < 0.5) return false;
    if (seenCanonicalKeys.has(canonicalKey)) return false;
    seenCanonicalKeys.add(canonicalKey);
    return true;
  });
}

export function getFieldLabel(key: string) {
  const labels: Record<string, string> = {
    studentName: "Sinh viên",
    student_name: "Sinh viên",
    studentCode: "Mã sinh viên",
    student_code: "Mã sinh viên",
    className: "Lớp",
    class_name: "Lớp",
    faculty: "Khoa",
    documentType: "Loại tài liệu",
    document_type: "Loại tài liệu",
    eventName: "Tên sự kiện/thành tích",
    event_name: "Tên sự kiện/thành tích",
    organizer: "Đơn vị tổ chức/cấp",
    organizerLevel: "Cấp tổ chức",
    organizer_level: "Cấp tổ chức",
    issueDate: "Ngày cấp",
    issue_date: "Ngày cấp",
    activityDate: "Ngày hoạt động",
    activity_date: "Ngày hoạt động",
    gpa: "GPA/ĐTB",
    conductScore: "Điểm rèn luyện",
    conduct_score: "Điểm rèn luyện",
    volunteerDays: "Ngày tình nguyện",
    volunteer_days: "Ngày tình nguyện",
    languageScore: "Chứng chỉ ngoại ngữ",
    language_score: "Chứng chỉ ngoại ngữ",
  };
  return labels[key] ?? key;
}

function canonicalFieldKey(key: string) {
  const aliases: Record<string, string> = {
    activity_date: "activityDate",
    certificate_type: "certificateType",
    class_name: "className",
    conduct_score: "conductScore",
    document_type: "documentType",
    event_name: "eventName",
    gpa_scale: "gpaScale",
    issue_date: "issueDate",
    language_score: "languageScore",
    organizer_level: "organizerLevel",
    student_code: "studentCode",
    student_name: "studentName",
    volunteer_days: "volunteerDays",
  };
  return aliases[key] ?? key;
}

export function classifyEvidence(
  evidence: Pick<ReviewTaskEvidence, "criterion" | "sourceType" | "card" | "event">,
  fields: Record<string, unknown>,
  title: string,
): EvidenceDisplayKind {
  const normalizedTitle = normalizeText(title);
  const documentType = normalizeText(stringField(fields, "documentType", "document_type") ?? "");
  const hasGpa = numberField(fields, "gpa") !== null;
  const transcriptLike =
    evidence.criterion === "academic" &&
    (hasGpa ||
      /bang diem|diem trung binh|gpa|hoc tap|transcript/.test(
        `${normalizedTitle} ${documentType}`,
      ));

  if (transcriptLike) return "academic_transcript";

  const hasEventShape = Boolean(
    evidence.event ||
    evidence.card?.matchedEventId ||
    stringField(fields, "eventName", "event_name") ||
    stringField(fields, "organizer"),
  );

  if (hasEventShape || evidence.sourceType === "event_import") return "event_achievement";
  return "generic_document";
}

function getMatchLabel(evidence: ReviewTaskEvidence) {
  const code = evidence.card?.matchingStatus?.code;
  if (code === "official_match_found" || evidence.event || evidence.sourceType === "event_import") {
    return "Khớp danh sách chính thức";
  }
  if (code === "official_match_not_found") {
    return evidence.criterion === "academic" && !evidence.event
      ? "Cần cán bộ xác nhận"
      : "Chưa khớp danh sách chính thức";
  }
  if (evidence.card?.matchedEventId) return "Khớp danh sách chính thức";
  return "Cần cán bộ xác nhận";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringField(fields: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    const record = asRecord(value);
    const display = record.display ?? record.label ?? record.value;
    if (typeof display === "string" && display.trim()) return display.trim();
    if (typeof display === "number") return String(display);
  }
  return null;
}

function numberField(fields: Record<string, unknown>, key: string) {
  const value = fields[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
