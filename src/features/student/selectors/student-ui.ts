import type { Notification } from "@/features/notifications/api/notifications";
import type {
  ApplicationStatus,
  Criterion,
  EvidenceResponse,
  Level,
  PrecheckCriterionResult,
  PrecheckMissingItem,
  PrecheckResult,
} from "@/lib/api/types";

export type StudentTone = "good" | "warning" | "danger" | "neutral" | "info";
export type CriterionUiStatus = "ok" | "missing" | "needs_review" | "empty" | "processing";

export type StudentAction = {
  label: string;
  route: string;
  params?: Record<string, unknown>;
};

export const studentApplicationStatusCopy: Record<ApplicationStatus | "not_started", string> = {
  not_started: "Chưa bắt đầu",
  draft: "Đang hoàn thiện",
  prechecked: "Đã kiểm tra sơ bộ",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang chờ cán bộ xét",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Đang được xem xét thêm",
  completed: "Đã có kết quả",
  rejected: "Chưa đạt",
};

export const criterionLabels: Record<Criterion, string> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
  priority: "Thành tích ưu tiên",
  collective: "Tập thể",
};

export const coreStudentCriteria: Criterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
];

const targetLevelLabels: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

export function unwrapApiData<T>(
  payload: T | { success?: boolean; data?: T | null } | null | undefined,
): T | null {
  if (!payload) return null;
  if (typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T | null }).data ?? null;
  }
  return payload as T;
}

export function toArray<T>(
  payload: T[] | { success?: boolean; data?: T[] | null } | null | undefined,
): T[] {
  const data = unwrapApiData(payload);
  return Array.isArray(data) ? data : [];
}

export function getStudentApplicationStatus(status?: string | null): {
  label: string;
  tone: StudentTone;
  normalizedStatus: ApplicationStatus | "not_started";
} {
  const normalizedStatus = normalizeApplicationStatus(status);
  return {
    label: studentApplicationStatusCopy[normalizedStatus],
    tone: applicationStatusTone[normalizedStatus],
    normalizedStatus,
  };
}

export function getStudentApplicationSummary(
  applicationInput: unknown,
  precheckInput?: unknown,
  cascadeInput?: unknown,
  feedbackInput?: unknown,
) {
  const application = asRecord(unwrapApiData(applicationInput));
  const precheck = asRecord(unwrapApiData(precheckInput));
  const feedback = toFeedbackItems(feedbackInput);
  const status = getStudentApplicationStatus(stringValue(application?.status));
  const criteriaStates = coreStudentCriteria.map((criterion) =>
    getCriteriaUiState(criterion, getArray(application?.evidences), precheck, feedback),
  );
  const completedCriteriaCount = criteriaStates.filter((item) => item.status === "ok").length;
  const pendingActionCount =
    criteriaStates.filter((item) => item.status !== "ok").length +
    feedback.filter((item) => item.isActionable).length;
  const missingCount = criteriaStates.filter(
    (item) => item.status === "missing" || item.status === "empty",
  ).length;
  const applicationStatus = status.normalizedStatus;
  const cascade = asRecord(unwrapApiData(cascadeInput));

  return {
    headline: getApplicationHeadline(applicationStatus, missingCount, pendingActionCount),
    description: getApplicationDescription(applicationStatus, pendingActionCount),
    metadataLine: getMetadataLine(application, cascade),
    statusBadge: { label: status.label, tone: status.tone },
    primaryAction: getPrimaryApplicationAction(applicationStatus, Boolean(application)),
    secondaryAction: getSecondaryApplicationAction(applicationStatus, Boolean(precheck)),
    completedCriteriaCount,
    totalCriteriaCount: 5,
    pendingActionCount,
  };
}

export function getCriteriaUiState(
  criteriaKey: Criterion,
  evidencesInput?: unknown,
  precheckInput?: unknown,
  feedbackInput?: unknown,
) {
  const evidences = toArray<EvidenceResponse>(evidencesInput as EvidenceResponse[]).filter(
    (item) => item?.criterion === criteriaKey,
  );
  const precheck = asRecord(unwrapApiData(precheckInput));
  const feedback = toFeedbackItems(feedbackInput).filter(
    (item) => item.criterionKey === criteriaKey,
  );
  const precheckMissing = getPrecheckMissing(criteriaKey, precheck);
  const failedEvidence = evidences.find(
    (item) => getEvidenceStudentStatus(item).normalizedStatus === "failed",
  );
  const processing = evidences.some(
    (item) => getEvidenceStudentStatus(item).normalizedStatus === "processing",
  );
  const warningCount =
    feedback.filter((item) => item.isActionable).length +
    (failedEvidence ? 1 : 0) +
    (precheckMissing ? 1 : 0) +
    getCriterionWarnings(criteriaKey, precheck).length;

  let status: CriterionUiStatus = "needs_review";
  if (feedback.some((item) => item.isActionable)) status = "missing";
  else if (failedEvidence) status = "needs_review";
  else if (precheckMissing) status = "missing";
  else if (evidences.length === 0) status = "empty";
  else if (processing) status = "processing";
  else if (warningCount === 0) status = "ok";

  return {
    key: criteriaKey,
    label: criterionLabels[criteriaKey],
    status,
    statusLabel: criterionStatusCopy[status],
    tone: criterionTone[status],
    evidenceCount: evidences.length,
    warningCount,
    description: getCriterionDescription(criteriaKey, status, evidences.length),
    primaryMissingReason:
      feedback.find((item) => item.isActionable)?.message ??
      precheckMissing?.message ??
      (failedEvidence ? "Minh chứng chưa đọc được, cần kiểm tra lại file." : ""),
  };
}

export function getNextActions(
  applicationInput?: unknown,
  criteriaStatesInput?: unknown,
  feedbackInput?: unknown,
  precheckInput?: unknown,
) {
  const application = asRecord(unwrapApiData(applicationInput));
  const applicationStatus = normalizeApplicationStatus(stringValue(application?.status));
  const criteriaStates = toArray<ReturnType<typeof getCriteriaUiState>>(
    criteriaStatesInput as ReturnType<typeof getCriteriaUiState>[],
  );
  const feedback = toFeedbackItems(feedbackInput);
  const precheck = asRecord(unwrapApiData(precheckInput));
  const actions: Array<{
    priority: number;
    title: string;
    description: string;
    actionLabel: string;
    route: string;
    criterionKey?: Criterion;
  }> = [];

  feedback
    .filter((item) => item.isActionable)
    .forEach((item) =>
      actions.push({
        priority: 1,
        title: item.title || "Cần bổ sung theo phản hồi",
        description: item.message || "Cán bộ đã gửi yêu cầu bổ sung cho hồ sơ.",
        actionLabel: item.actionLabel,
        route: item.route,
        criterionKey: item.criterionKey,
      }),
    );

  criteriaStates
    .filter((item) => item.status === "needs_review")
    .forEach((item) =>
      actions.push({
        priority: item.primaryMissingReason.toLowerCase().includes("đọc") ? 2 : 4,
        title: `${item.label} cần kiểm tra`,
        description: item.primaryMissingReason || "Xem lại minh chứng trước khi nộp.",
        actionLabel: "Xem minh chứng",
        route: "/app/application",
        criterionKey: item.key,
      }),
    );

  criteriaStates
    .filter((item) => item.status === "empty" || item.status === "missing")
    .forEach((item) =>
      actions.push({
        priority: item.status === "missing" ? 3 : 3,
        title: `${item.label} chưa đủ minh chứng`,
        description: item.primaryMissingReason || "Bổ sung minh chứng phù hợp cho tiêu chí này.",
        actionLabel: "Bổ sung",
        route: "/app/application",
        criterionKey: item.key,
      }),
    );

  if (!precheck && application) {
    actions.push({
      priority: 5,
      title: "Kiểm tra sơ bộ hồ sơ",
      description: "Chạy kiểm tra để biết còn thiếu tiêu chí hoặc minh chứng nào.",
      actionLabel: "Kiểm tra hồ sơ",
      route: "/app/application",
    });
  }

  if (applicationStatus === "ready_to_submit") {
    actions.push({
      priority: 6,
      title: "Hồ sơ đã sẵn sàng",
      description: "Bạn có thể nộp hồ sơ để cán bộ bắt đầu xét duyệt.",
      actionLabel: "Nộp hồ sơ",
      route: "/app/application",
    });
  }

  return actions.sort((left, right) => left.priority - right.priority).slice(0, 3);
}

export function getEvidenceStudentStatus(evidenceInput?: unknown): {
  label: string;
  tone: StudentTone;
  normalizedStatus:
    | "processing"
    | "recorded"
    | "needs_review"
    | "failed"
    | "supplement_required"
    | "accepted"
    | "rejected"
    | "empty";
} {
  const evidence = asRecord(unwrapApiData(evidenceInput));
  const rawStatus = stringValue(evidence?.status);
  const indexingStatus = stringValue(evidence?.indexingStatus ?? evidence?.indexing_status);
  const source =
    rawStatus === "draft" || rawStatus === "" ? indexingStatus || rawStatus : rawStatus;

  if (!source || source === "not_started" || source === "draft") {
    return { label: "Chưa có", tone: "neutral", normalizedStatus: "empty" };
  }
  if (
    [
      "uploaded",
      "pending_indexing",
      "ocr_processing",
      "extracting",
      "checking_registry",
      "under_review",
    ].includes(source)
  ) {
    return { label: "Đang xử lý", tone: "info", normalizedStatus: "processing" };
  }
  if (source === "indexed")
    return { label: "Đã ghi nhận", tone: "good", normalizedStatus: "recorded" };
  if (source === "needs_manual_review" || source === "resolution_needed") {
    return { label: "Cần kiểm tra", tone: "warning", normalizedStatus: "needs_review" };
  }
  if (source === "failed")
    return { label: "Không đọc được", tone: "danger", normalizedStatus: "failed" };
  if (source === "needs_supplement" || source === "supplement_required") {
    return { label: "Cần bổ sung", tone: "warning", normalizedStatus: "supplement_required" };
  }
  if (source === "accepted")
    return { label: "Đã xác nhận", tone: "good", normalizedStatus: "accepted" };
  if (source === "rejected")
    return { label: "Chưa phù hợp", tone: "danger", normalizedStatus: "rejected" };
  return { label: "Cần kiểm tra", tone: "warning", normalizedStatus: "needs_review" };
}

export function getFeedbackUiItems(notificationsInput?: unknown) {
  return toArray<Notification>(notificationsInput as Notification[]).map((item) => {
    const metadata = asRecord(item.metadata);
    const criterionKey = normalizeCriterion(metadata?.criterion ?? metadata?.criteria);
    const text = `${item.type} ${item.title} ${item.message}`.toLowerCase();
    const isSystemInfo =
      text.includes("upload") ||
      text.includes("indexing") ||
      text.includes("ocr") ||
      text.includes("đang xử lý") ||
      text.includes("file đã");
    const isResult =
      text.includes("final") ||
      text.includes("result") ||
      text.includes("kết quả") ||
      text.includes("đã có kết quả") ||
      text.includes("completed") ||
      text.includes("rejected");
    const isReviewInfo =
      text.includes("review") ||
      text.includes("status") ||
      text.includes("xét duyệt") ||
      text.includes("đang xét");
    const isActionable =
      text.includes("supplement") ||
      text.includes("bổ sung") ||
      text.includes("request") ||
      text.includes("yêu cầu") ||
      text.includes("deadline") ||
      text.includes("hạn bổ sung") ||
      text.includes("quá hạn");
    const status = isActionable ? "action_required" : item.readAt ? "read" : "new";
    const route = criterionKey ? `/app/application?criterion=${criterionKey}` : "/app/feedback";
    return {
      id: item.id,
      title: cleanStudentText(item.title) || "Phản hồi hồ sơ",
      message: cleanStudentText(item.message) || "Mở chi tiết để xem phản hồi.",
      criterionKey,
      criterionLabel: criterionKey ? criterionLabels[criterionKey] : "",
      evidenceId: item.evidenceId,
      dueDate: stringValue(metadata?.dueDate ?? metadata?.deadline),
      status,
      statusLabel: status === "action_required" ? "Cần xử lý" : status === "new" ? "Mới" : "Đã đọc",
      feedbackType: isActionable
        ? "action"
        : isResult
          ? "result"
          : isSystemInfo
            ? "system"
            : isReviewInfo
              ? "review"
              : "info",
      actionLabel: isActionable ? "Đi đến tiêu chí" : isResult ? "Xem kết quả" : "Đã hiểu",
      route,
      isActionable,
    };
  });
}

function getApplicationHeadline(
  status: ApplicationStatus | "not_started",
  missingCount: number,
  pendingActionCount: number,
) {
  if (status === "not_started") return "Bắt đầu hồ sơ Sinh viên 5 tốt";
  if (status === "draft" || status === "prechecked") {
    return `Còn ${Math.max(missingCount, pendingActionCount)} việc cần làm trước khi nộp hồ sơ`;
  }
  if (status === "ready_to_submit") return "Hồ sơ đã sẵn sàng để nộp";
  if (status === "submitted" || status === "under_review")
    return "Hồ sơ của bạn đang được xét duyệt";
  if (status === "supplement_required") return "Bạn cần bổ sung hồ sơ";
  if (status === "completed") return "Hồ sơ đã có kết quả";
  if (status === "rejected") return "Hồ sơ chưa đạt";
  return "Hồ sơ đang được xem xét thêm";
}

function getApplicationDescription(
  status: ApplicationStatus | "not_started",
  pendingActionCount: number,
) {
  if (status === "not_started") return "Tạo hồ sơ để bắt đầu hoàn thiện 5 tiêu chí.";
  if (pendingActionCount > 0) return "Ưu tiên xử lý các việc còn thiếu trước khi nộp.";
  if (status === "ready_to_submit") return "Kiểm tra lần cuối rồi nộp hồ sơ.";
  if (status === "submitted" || status === "under_review")
    return "Theo dõi phản hồi từ cán bộ tại mục Phản hồi.";
  return "Xem trạng thái và phản hồi mới nhất của hồ sơ.";
}

function getMetadataLine(
  application: Record<string, unknown> | null,
  cascade: Record<string, unknown> | null,
) {
  if (!application) return "Chưa có hồ sơ năm học hiện tại";
  const year = stringValue(application.schoolYear) || "Năm học hiện tại";
  const level = stringValue(application.targetLevel) as Level | "";
  const summary = asRecord(application.summary);
  const deadline = stringValue(
    application.deadline ??
      application.submitDeadline ??
      application.dueDate ??
      summary?.deadline ??
      cascade?.deadline,
  );
  return [
    `Năm học ${year}`,
    level ? `Cấp đăng ký: ${targetLevelLabels[level as Level] ?? level}` : "",
    `Hạn nộp: ${deadline ? formatDate(deadline) : "Chưa công bố"}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function getPrimaryApplicationAction(
  status: ApplicationStatus | "not_started",
  hasApplication: boolean,
): StudentAction {
  if (!hasApplication || status === "not_started")
    return { label: "Bắt đầu hồ sơ", route: "/app/application" };
  if (status === "draft" || status === "prechecked")
    return { label: "Tiếp tục hoàn thiện", route: "/app/application" };
  if (status === "ready_to_submit") return { label: "Nộp hồ sơ", route: "/app/application" };
  if (status === "supplement_required")
    return { label: "Xem phản hồi cần xử lý", route: "/app/feedback" };
  if (status === "submitted" || status === "under_review" || status === "resolution_needed") {
    return { label: "Xem tiến độ", route: "/app/application" };
  }
  if (status === "completed" || status === "rejected")
    return { label: "Xem kết quả", route: "/app/application" };
  return { label: "Hoàn thiện hồ sơ", route: "/app/application" };
}

function getSecondaryApplicationAction(
  status: ApplicationStatus | "not_started",
  hasPrecheck: boolean,
): StudentAction | undefined {
  if (status === "not_started" || status === "submitted" || status === "under_review")
    return undefined;
  return hasPrecheck
    ? { label: "Xem kiểm tra sơ bộ", route: "/app/application" }
    : { label: "Kiểm tra hồ sơ", route: "/app/application" };
}

function getPrecheckMissing(
  criteriaKey: Criterion,
  precheck: Record<string, unknown> | null,
): PrecheckMissingItem | null {
  const missingItems = getArray(precheck?.missingItems) as PrecheckMissingItem[];
  const direct = missingItems.find((item) => item?.criterion === criteriaKey);
  if (direct) return direct;
  const result = getCriterionResult(criteriaKey, precheck);
  if (!result) return null;
  if (
    result.passed === false ||
    ["failed", "needs_supplement", "missing"].includes(String(result.status))
  ) {
    return {
      criterion: criteriaKey,
      message: result.reasons?.[0] ?? "Tiêu chí này cần bổ sung thêm dữ liệu.",
    };
  }
  return null;
}

function getCriterionWarnings(criteriaKey: Criterion, precheck: Record<string, unknown> | null) {
  return getCriterionResult(criteriaKey, precheck)?.warnings ?? [];
}

function getCriterionResult(
  criteriaKey: Criterion,
  precheck: Record<string, unknown> | null,
): PrecheckCriterionResult | null {
  const results = getArray(precheck?.criteriaResults) as PrecheckCriterionResult[];
  return results.find((item) => item?.criterion === criteriaKey) ?? null;
}

function getCriterionDescription(
  criteriaKey: Criterion,
  status: CriterionUiStatus,
  evidenceCount: number,
) {
  if (status === "empty") return "Chưa có minh chứng cho tiêu chí này.";
  if (status === "processing") return `${evidenceCount} minh chứng đang được xử lý.`;
  if (status === "ok") return `${evidenceCount} minh chứng đã được ghi nhận.`;
  if (status === "missing") return "Cần bổ sung minh chứng hoặc thông tin theo yêu cầu.";
  return `${criterionLabels[criteriaKey]} cần được kiểm tra lại trước khi nộp.`;
}

function toFeedbackItems(input: unknown) {
  const value = unwrapApiData(input);
  if (Array.isArray(value) && value.every((item) => asRecord(item)?.statusLabel)) {
    return value as ReturnType<typeof getFeedbackUiItems>;
  }
  return getFeedbackUiItems(value);
}

function normalizeApplicationStatus(status?: string | null): ApplicationStatus | "not_started" {
  if (!status || status === "not_started") return "not_started";
  if (status === "draft_supplement") return "supplement_required";
  const allowed = Object.keys(studentApplicationStatusCopy);
  return allowed.includes(status) ? (status as ApplicationStatus | "not_started") : "draft";
}

function normalizeCriterion(value: unknown): Criterion | undefined {
  const raw = stringValue(value);
  return (Object.keys(criterionLabels) as Criterion[]).includes(raw as Criterion)
    ? (raw as Criterion)
    : undefined;
}

function cleanStudentText(value: string) {
  return value
    .replace(/\bintegration\b/g, "Hội nhập tốt")
    .replace(/\bvolunteer\b/g, "Tình nguyện tốt")
    .replace(/\bphysical\b/g, "Thể lực tốt")
    .replace(/\bacademic\b/g, "Học tập tốt")
    .replace(/\bethics\b/g, "Đạo đức tốt")
    .replace(/\bOCR\b/g, "xử lý file")
    .replace(/\bAI confidence\b/gi, "mức độ rõ ràng")
    .replace(/[A-Z]+_[A-Z0-9_]+/g, "Cập nhật xử lý")
    .trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const applicationStatusTone: Record<ApplicationStatus | "not_started", StudentTone> = {
  not_started: "neutral",
  draft: "warning",
  prechecked: "info",
  ready_to_submit: "good",
  submitted: "info",
  under_review: "info",
  supplement_required: "warning",
  resolution_needed: "info",
  completed: "good",
  rejected: "danger",
};

const criterionStatusCopy: Record<CriterionUiStatus, string> = {
  ok: "Tạm ổn",
  missing: "Cần bổ sung",
  needs_review: "Cần kiểm tra",
  empty: "Chưa có",
  processing: "Đang xử lý",
};

const criterionTone: Record<CriterionUiStatus, StudentTone> = {
  ok: "good",
  missing: "warning",
  needs_review: "warning",
  empty: "neutral",
  processing: "info",
};
