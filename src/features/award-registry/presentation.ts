import type {
  AwardDecisionStatus,
  AwardRecipientMatchStatus,
  AwardRosterPreviewRow,
  AwardRosterRowStatus,
  AwardRosterSummary,
} from "@/types/award-registry";

export type AwardPresentationTone = "success" | "warning" | "danger" | "muted" | "brand";

export type AwardStatusPresentation = {
  label: string;
  description: string;
  tone: AwardPresentationTone;
};

export type AwardRowPresentation = AwardStatusPresentation & {
  key:
    | "valid"
    | "warning"
    | "invalid"
    | "duplicate"
    | "missing_student_code"
    | "needs_manual_review";
};

const decisionStatusPresentation: Record<AwardDecisionStatus, AwardStatusPresentation> = {
  DRAFT: {
    label: "Bản nháp",
    description: "Đang hoàn thiện quyết định và dữ liệu sinh viên.",
    tone: "warning",
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    description: "Dữ liệu công nhận đã trở thành dữ liệu chính thức.",
    tone: "success",
  },
  ARCHIVED: {
    label: "Đã lưu trữ",
    description: "Dữ liệu được giữ lại nhưng hiện không có hiệu lực sử dụng.",
    tone: "muted",
  },
};

const matchPresentation: Record<AwardRecipientMatchStatus, AwardStatusPresentation> = {
  MATCHED: {
    label: "Đã xác định sinh viên tương ứng",
    description: "MSSV đã được đối chiếu với sinh viên trong hệ thống.",
    tone: "success",
  },
  UNMATCHED: {
    label: "Chưa tìm thấy sinh viên phù hợp",
    description: "Dòng vẫn có thể là dữ liệu hợp lệ, nhưng chưa gắn với tài khoản sinh viên.",
    tone: "warning",
  },
  CONFLICT: {
    label: "Có dữ liệu cần kiểm tra",
    description: "Chưa xác định được sinh viên hoặc đơn vị tương ứng từ dữ liệu hiện có.",
    tone: "danger",
  },
};

const rowPresentation: Record<AwardRowPresentation["key"], AwardRowPresentation> = {
  valid: {
    key: "valid",
    label: "Hợp lệ",
    description: "Dòng đã vượt qua kiểm tra dữ liệu.",
    tone: "success",
  },
  warning: {
    key: "warning",
    label: "Cần theo dõi",
    description: "Dữ liệu hợp lệ nhưng chưa tìm thấy sinh viên tương ứng.",
    tone: "warning",
  },
  invalid: {
    key: "invalid",
    label: "Có lỗi dữ liệu",
    description: "Thiếu hoặc sai dữ liệu bắt buộc; cần chỉnh trước khi xác nhận.",
    tone: "danger",
  },
  duplicate: {
    key: "duplicate",
    label: "Trùng dữ liệu",
    description: "Mã sinh viên bị trùng trong cùng phạm vi quyết định.",
    tone: "warning",
  },
  missing_student_code: {
    key: "missing_student_code",
    label: "Thiếu MSSV",
    description: "Dòng chưa có mã sinh viên hợp lệ để đối chiếu.",
    tone: "danger",
  },
  needs_manual_review: {
    key: "needs_manual_review",
    label: "Cần kiểm tra thủ công",
    description: "Cần xác định lại đơn vị hoặc dữ liệu nguồn trước khi xác nhận.",
    tone: "warning",
  },
};

export function getAwardDecisionTitle(decisionNumber: string | null | undefined) {
  const normalized = decisionNumber?.trim();
  return normalized ? `Quyết định công nhận số ${normalized}` : "Quyết định công nhận";
}

export const awardPreviewFilterOptions = [
  { value: "all", label: "Tất cả dòng" },
  { value: "attention", label: "Cần kiểm tra" },
  { value: "invalid", label: "Có lỗi dữ liệu" },
  { value: "duplicate", label: "Trùng dữ liệu" },
  { value: "conflict", label: "Cần kiểm tra thủ công" },
  { value: "unmatched", label: "Chưa tìm thấy sinh viên" },
  { value: "matched", label: "Đã xác định sinh viên" },
  { value: "corrected", label: "Đã chỉnh sửa" },
] as const;

export function getAwardDecisionStatusPresentation(
  status: AwardDecisionStatus,
): AwardStatusPresentation {
  return decisionStatusPresentation[status];
}

export function getAwardMatchPresentation(
  status: AwardRecipientMatchStatus,
): AwardStatusPresentation {
  return matchPresentation[status];
}

export function getAwardRowPresentation(
  row: Pick<AwardRosterPreviewRow, "status" | "matchStatus" | "errors">,
): AwardRowPresentation {
  if (row.status === "DUPLICATE") return rowPresentation.duplicate;
  if (row.status === "CONFLICT") return rowPresentation.needs_manual_review;
  if (row.status === "INVALID") {
    if (row.errors.some((error) => error === "STUDENT_CODE_REQUIRED" || error === "STUDENT_CODE_MUST_BE_TEXT")) {
      return rowPresentation.missing_student_code;
    }
    return rowPresentation.invalid;
  }
  return row.matchStatus === "UNMATCHED" ? rowPresentation.warning : rowPresentation.valid;
}

export function getAwardPreviewSummary(summary: AwardRosterSummary) {
  return {
    total: summary.total,
    valid: summary.valid,
    attention: summary.conflict + summary.unmatched,
    invalid: summary.invalid,
    duplicate: summary.duplicate,
    matched: summary.matched,
    unmatched: summary.unmatched,
  };
}

export function getAwardRowStatusLabel(status: AwardRosterRowStatus) {
  return getAwardRowPresentation({ status, matchStatus: "MATCHED", errors: [] }).label;
}
