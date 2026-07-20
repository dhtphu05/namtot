export type StatusTone = "brand" | "success" | "warning" | "error" | "muted";

export type ApplicationStatusLabelKey =
  | "not_started"
  | "draft"
  | "prechecked"
  | "ready_to_submit"
  | "submitted"
  | "under_review"
  | "supplement_required"
  | "draft_supplement"
  | "resolution_needed"
  | "completed"
  | "rejected";

export type ReviewTaskStatusLabelKey =
  "waiting" | "reviewing" | "supplement_required" | "accepted" | "rejected" | "resolution_needed";

export type EvidenceStatusLabelKey =
  | "draft"
  | "pending_indexing"
  | "indexed"
  | "needs_supplement"
  | "under_review"
  | "accepted"
  | "rejected"
  | "resolution_needed";

export type FinalStatusLabelKey = "pending" | "passed" | "failed" | "partially_passed";

export type StudentApplicationStatus = ApplicationStatusLabelKey | string;

export const fallbackStatusLabel = "Chưa rõ";

export const applicationStatusLabel: Record<ApplicationStatusLabelKey, string> = {
  not_started: "Chưa có hồ sơ",
  draft: "Bản nháp",
  prechecked: "Đã tự kiểm tra",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  draft_supplement: "Đang bổ sung",
  resolution_needed: "Cần hội ý",
  completed: "Hoàn tất",
  rejected: "Chưa đạt",
};

export const studentApplicationStatusLabel: Record<ApplicationStatusLabelKey, string> = {
  not_started: "Chưa có hồ sơ",
  draft: "Đang hoàn thiện",
  prechecked: "Đã tự kiểm tra",
  ready_to_submit: "Đủ dữ liệu để nộp",
  submitted: "Đã nộp",
  under_review: "Đang được xét duyệt",
  supplement_required: "Cần bổ sung",
  draft_supplement: "Cần bổ sung",
  resolution_needed: "Đang được xét duyệt",
  completed: "Đã có kết quả",
  rejected: "Chưa đạt",
};

export const reviewTaskStatusLabel: Record<ReviewTaskStatusLabelKey, string> = {
  waiting: "Chờ xét",
  reviewing: "Đang xét",
  supplement_required: "Chờ bổ sung",
  accepted: "Đã đạt",
  rejected: "Không đạt",
  resolution_needed: "Cần hội ý",
};

export const evidenceStatusLabel: Record<EvidenceStatusLabelKey, string> = {
  draft: "Bản nháp",
  pending_indexing: "Chờ xử lý",
  indexed: "Đã xử lý",
  needs_supplement: "Cần bổ sung",
  under_review: "Đang xét duyệt",
  accepted: "Đã duyệt",
  rejected: "Từ chối",
  resolution_needed: "Cần hội ý",
};

export const finalStatusLabel: Record<FinalStatusLabelKey, string> = {
  pending: "Chưa chốt",
  passed: "Đạt",
  failed: "Chưa đạt",
  partially_passed: "Đạt cấp thấp hơn",
};

export const applicationStatusTone: Record<ApplicationStatusLabelKey, StatusTone> = {
  not_started: "muted",
  draft: "muted",
  prechecked: "brand",
  ready_to_submit: "brand",
  submitted: "brand",
  under_review: "brand",
  supplement_required: "warning",
  draft_supplement: "warning",
  resolution_needed: "warning",
  completed: "success",
  rejected: "error",
};

export const reviewTaskStatusTone: Record<ReviewTaskStatusLabelKey, StatusTone> = {
  waiting: "muted",
  reviewing: "brand",
  supplement_required: "warning",
  accepted: "success",
  rejected: "error",
  resolution_needed: "warning",
};

export const evidenceStatusTone: Record<EvidenceStatusLabelKey, StatusTone> = {
  draft: "muted",
  pending_indexing: "muted",
  indexed: "success",
  needs_supplement: "warning",
  under_review: "brand",
  accepted: "success",
  rejected: "error",
  resolution_needed: "warning",
};

export const finalStatusTone: Record<FinalStatusLabelKey, StatusTone> = {
  pending: "warning",
  passed: "success",
  failed: "error",
  partially_passed: "warning",
};

export const criterionResultStatusLabel: Record<string, string> = {
  complete: "Đủ dữ liệu",
  ready: "Đủ dữ liệu cơ bản",
  passed: "Đủ dữ liệu",
  passed_with_warning: "Chờ cán bộ xác nhận",
  pending: "Chờ cán bộ xác nhận",
  failed: "Cần bổ sung",
  needs_supplement: "Cần bổ sung",
  needs_officer_confirmation: "Chờ cán bộ xác nhận",
  missing_evidence: "Chưa có minh chứng",
  ai_processing: "Hệ thống đang kiểm tra",
  ai_failed: "Cần kiểm tra thủ công",
  risky: "Cần kiểm tra thêm",
};

export function getApplicationStatusLabel(status?: StudentApplicationStatus | null) {
  if (!status) return fallbackStatusLabel;
  return applicationStatusLabel[String(status) as ApplicationStatusLabelKey] ?? fallbackStatusLabel;
}

export function getStudentApplicationStatusLabel(status?: StudentApplicationStatus | null) {
  if (!status) return fallbackStatusLabel;
  return (
    studentApplicationStatusLabel[String(status) as ApplicationStatusLabelKey] ??
    fallbackStatusLabel
  );
}

export function getReviewTaskStatusLabel(status?: string | null) {
  if (!status) return fallbackStatusLabel;
  return reviewTaskStatusLabel[status as ReviewTaskStatusLabelKey] ?? fallbackStatusLabel;
}

export function getEvidenceStatusLabel(status?: string | null) {
  if (!status) return fallbackStatusLabel;
  return evidenceStatusLabel[status as EvidenceStatusLabelKey] ?? fallbackStatusLabel;
}

export function getFinalStatusLabel(status?: string | null) {
  if (!status) return fallbackStatusLabel;
  return finalStatusLabel[status as FinalStatusLabelKey] ?? fallbackStatusLabel;
}

export function getWorkflowStatusLabel(status?: string | null) {
  if (!status) return fallbackStatusLabel;
  return (
    reviewTaskStatusLabel[status as ReviewTaskStatusLabelKey] ??
    applicationStatusLabel[status as ApplicationStatusLabelKey] ??
    evidenceStatusLabel[status as EvidenceStatusLabelKey] ??
    finalStatusLabel[status as FinalStatusLabelKey] ??
    fallbackStatusLabel
  );
}

export function getCriterionResultStatusLabel(status?: string | null) {
  if (!status) return "Chờ cán bộ xác nhận";
  return criterionResultStatusLabel[status] ?? "Chờ cán bộ xác nhận";
}

export function getStatusTone(status?: string | null): StatusTone {
  if (!status) return "muted";
  return (
    reviewTaskStatusTone[status as ReviewTaskStatusLabelKey] ??
    applicationStatusTone[status as ApplicationStatusLabelKey] ??
    evidenceStatusTone[status as EvidenceStatusLabelKey] ??
    finalStatusTone[status as FinalStatusLabelKey] ??
    "muted"
  );
}
