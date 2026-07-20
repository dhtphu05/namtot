import type {
  ApplicationStatus,
  Criterion,
  EvidenceStatus,
  Level,
  ReviewTaskListItem,
  ReviewTaskStatus,
} from "../types";
import { getWorkflowStatusLabel } from "@/lib/status-labels";

export const fallbackText = "Chưa có dữ liệu";

const criterionLabels: Record<Criterion, string> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
  priority: "Ưu tiên",
  collective: "Tập thể",
};

const levelLabels: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const taskStatusLabels: Record<ReviewTaskStatus, string> = {
  waiting: "Chờ xét",
  reviewing: "Đang xét",
  supplement_required: "Chờ bổ sung",
  accepted: "Đã đạt",
  rejected: "Không đạt",
  resolution_needed: "Cần hội ý",
};

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  draft: "Bản nháp",
  prechecked: "Đã tiền kiểm",
  ready_to_submit: "Sẵn sàng nộp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội ý",
  completed: "Hoàn tất",
  rejected: "Chưa đạt",
};

const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  draft: "Bản nháp",
  pending_indexing: "Chờ xử lý",
  indexed: "Đã xử lý",
  needs_supplement: "Cần bổ sung",
  under_review: "Đang xét duyệt",
  accepted: "Đạt",
  rejected: "Không đạt",
  resolution_needed: "Cần hội ý",
};

export function getCriterionLabel(criterion?: Criterion | null) {
  return criterion ? (criterionLabels[criterion] ?? fallbackText) : fallbackText;
}

export const formatCriterionLabel = getCriterionLabel;

export function getLevelLabel(level?: Level | null) {
  return level ? (levelLabels[level] ?? fallbackText) : fallbackText;
}

export const formatLevelLabel = getLevelLabel;

export function getTaskStatusLabel(
  status?: ReviewTaskStatus | ApplicationStatus | EvidenceStatus | null,
) {
  if (!status) {
    return fallbackText;
  }

  if (status in taskStatusLabels) {
    return taskStatusLabels[status as ReviewTaskStatus];
  }

  return getWorkflowStatusLabel(status) ?? fallbackText;
}

export const formatTaskStatusLabel = getTaskStatusLabel;

export function formatApplicationStatusLabel(status?: ApplicationStatus | null) {
  if (!status) return fallbackText;
  return applicationStatusLabels[status] ?? getWorkflowStatusLabel(status) ?? fallbackText;
}

export function getReadabilityLabel(value?: number | null) {
  if (value === null || value === undefined) return "Chưa có dữ liệu đọc";
  if (value < 0.55) return "Tài liệu khó đọc";
  if (value < 0.7) return "Cần kiểm tra";
  return "Đọc rõ";
}

export const formatEvidenceClarityLabel = getReadabilityLabel;

export function formatRoleLabel(role?: string | null) {
  if (!role) return fallbackText;
  const labels: Record<string, string> = {
    officer: "Cán bộ xét duyệt",
    manager: "Cấp quản lý",
    committee: "Hội đồng",
    admin: "Quản trị viên",
    student: "Sinh viên",
    class_representative: "Tập thể / Chi hội",
  };
  return labels[role] ?? role;
}

export function formatAuditActionLabel(action?: string | null) {
  if (!action) return "Cập nhật hồ sơ";
  const normalized = action.trim().toUpperCase();
  const labels: Record<string, string> = {
    APPLICATION_SUBMITTED: "Sinh viên đã nộp hồ sơ",
    REVIEW_TASK_CREATED: "Tạo tác vụ xét duyệt",
    REVIEW_TASK_ASSIGNED: "Giao tác vụ cho cán bộ",
    REVIEW_DECISION_ACCEPTED: "Cán bộ xác nhận đạt tiêu chí",
    REVIEW_DECISION_REJECTED: "Cán bộ xác nhận không đạt tiêu chí",
    REVIEW_DECISION_SUPPLEMENT_REQUIRED: "Yêu cầu sinh viên bổ sung",
    REVIEW_DECISION_RESOLUTION_NEEDED: "Chuyển case hội ý",
    SUPPLEMENT_REQUESTED: "Yêu cầu sinh viên bổ sung",
    SUPPLEMENT_SUBMITTED: "Sinh viên đã gửi bổ sung",
    RESOLUTION_CASE_CREATED: "Chuyển case hội ý",
    RESOLUTION_CASE_IN_REVIEW: "Hội đồng đang xem xét",
    RESOLUTION_CASE_RESOLVED: "Hội đồng đã kết luận case",
    APPLICATION_AGGREGATED: "Hệ thống tổng hợp kết quả",
    APPLICATION_FINALIZED: "Hồ sơ đã được chốt kết quả",
    FINALIZE_CASCADE_MISMATCH: "Kết quả đã thay đổi, cần tổng hợp lại",
  };
  if (labels[normalized]) return labels[normalized];
  if (normalized.includes("VIEW")) return "Mở xem dữ liệu";
  if (normalized.includes("ASSIGN")) return "Giao tác vụ cho cán bộ";
  if (normalized.includes("SUPPLEMENT")) return "Yêu cầu hoặc nhận bổ sung";
  if (normalized.includes("RESOLUTION")) return "Cập nhật case hội ý";
  if (normalized.includes("FINALIZE")) return "Cập nhật kết quả cuối";
  if (normalized.includes("AGGREGATE")) return "Hệ thống tổng hợp kết quả";
  return action
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function isUserFacingAuditAction(action?: string | null) {
  if (!action) return true;
  const normalized = action.toUpperCase();
  return (
    !normalized.includes("VIEWED") &&
    !normalized.includes("_VIEW") &&
    !normalized.includes("DETAIL_VIEW")
  );
}

export function getOfficerTaskActionLabel(item: ReviewTaskListItem) {
  if (item.status === "supplement_required") return "Xem yêu cầu";
  if (item.priorityReason === "student_resubmitted") return "Xét lại";
  if (item.permissions?.canAct) return "Mở xét duyệt";
  return "Xem chi tiết";
}

export function getOfficerTaskWorkLabel(item: ReviewTaskListItem) {
  const criterion = getCriterionLabel(item.criterion).toLowerCase();
  const evidenceCount = item.evidenceCount ?? 0;

  if (item.priorityReason === "student_resubmitted") {
    return `Sinh viên đã bổ sung, cần xét lại minh chứng ${criterion}.`;
  }
  if (item.status === "supplement_required") {
    return `Theo dõi yêu cầu bổ sung cho tiêu chí ${criterion}.`;
  }
  if (item.status === "resolution_needed") {
    return `Case cần hội ý trước khi kết luận tiêu chí ${criterion}.`;
  }
  if (item.priorityReason === "overdue") {
    return `Quá hạn xử lý, cần kết luận ${evidenceCount || 1} minh chứng ${criterion}.`;
  }
  if (item.priorityReason === "due_soon") {
    return `Sắp đến hạn, cần đối chiếu ${evidenceCount || 1} minh chứng ${criterion}.`;
  }
  if (item.priorityReason === "low_ai_confidence" || (item.aiConfidence ?? 1) < 0.7) {
    return `Kiểm tra tài liệu ${criterion}, hệ thống đọc chưa đủ rõ hoặc thiếu thông tin.`;
  }
  if (item.permissions?.canClaim) {
    return `Có thể nhận xử lý ${evidenceCount || 1} minh chứng ${criterion}.`;
  }
  return `Đối chiếu ${evidenceCount || 1} minh chứng ${criterion} và lưu kết luận.`;
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return fallbackText;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallbackText;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFileSize(bytes?: number | null) {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) {
    return fallbackText;
  }

  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toLocaleString("vi-VN", {
    maximumFractionDigits: value >= 10 || unitIndex === 0 ? 0 : 1,
  })} ${units[unitIndex]}`;
}
