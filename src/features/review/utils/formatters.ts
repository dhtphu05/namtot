import type {
  ApplicationStatus,
  Criterion,
  EvidenceStatus,
  Level,
  ReviewTaskStatus,
} from "../types";

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
  supplement_required: "Cần bổ sung",
  accepted: "Đạt",
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
  rejected: "Không đạt",
};

const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  draft: "Bản nháp",
  pending_indexing: "Chờ xử lý",
  indexed: "Đã xử lý",
  needs_supplement: "Cần bổ sung",
  under_review: "Đang xét",
  accepted: "Đạt",
  rejected: "Không đạt",
  resolution_needed: "Cần hội ý",
};

export function getCriterionLabel(criterion?: Criterion | null) {
  return criterion ? criterionLabels[criterion] : fallbackText;
}

export function getLevelLabel(level?: Level | null) {
  return level ? levelLabels[level] : fallbackText;
}

export function getTaskStatusLabel(
  status?: ReviewTaskStatus | ApplicationStatus | EvidenceStatus | null,
) {
  if (!status) {
    return fallbackText;
  }

  return (
    taskStatusLabels[status as ReviewTaskStatus] ??
    applicationStatusLabels[status as ApplicationStatus] ??
    evidenceStatusLabels[status as EvidenceStatus] ??
    fallbackText
  );
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
