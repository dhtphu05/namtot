import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Clock3, FileCheck2, Loader2, XCircle } from "lucide-react";
import { criterionLabel, levelLabel, type Criterion, type Level } from "@/lib/api/types";
import type {
  DecisionImport,
  DecisionImportPreviewRow,
  DecisionImportStatus,
  DecisionImportValidationStatus,
} from "@/types/decision-import";
import type { UxStatus } from "@/types/api";

export const criterionOptions = Object.entries(criterionLabel).map(([value, label]) => ({
  value: value as Criterion,
  label,
}));

export const levelOptions = Object.entries(levelLabel).map(([value, label]) => ({
  value: value as Level,
  label,
}));

export const statusOptions: Array<{ value: DecisionImportStatus | "all"; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "draft", label: "Đang chuẩn bị" },
  { value: "uploaded", label: "Đã nhận tài liệu" },
  { value: "extracting_metadata", label: "Đọc thông tin văn bản" },
  { value: "ocr_processing", label: "Đọc danh sách sinh viên" },
  { value: "parsing_roster", label: "Chuẩn hoá danh sách" },
  { value: "preview_ready", label: "Sẵn sàng kiểm tra" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "failed", label: "Thất bại" },
  { value: "cancelled", label: "Đã huỷ" },
];

export const validationStatusOptions: Array<{
  value: DecisionImportValidationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "valid", label: "Hợp lệ" },
  { value: "warning", label: "Cần xem lại" },
  { value: "duplicate", label: "Trùng MSSV" },
  { value: "missing_student_code", label: "Thiếu MSSV" },
  { value: "invalid", label: "Không hợp lệ" },
  { value: "needs_manual_review", label: "Cần kiểm tra" },
];

export const validationStatusLabel: Record<DecisionImportValidationStatus, string> = {
  valid: "Hợp lệ",
  warning: "Cần xem lại",
  duplicate: "Trùng MSSV",
  missing_student_code: "Thiếu MSSV",
  invalid: "Không hợp lệ",
  needs_manual_review: "Cần kiểm tra",
};

const warningLabels: Record<string, string> = {
  missing_student_code: "Thiếu MSSV",
  missing_student_name: "Thiếu họ tên",
  invalid_student_code_format: "MSSV chưa đúng định dạng",
  duplicate_student_code: "Trùng MSSV trong danh sách",
  low_table_confidence: "Độ chắc chắn bảng thấp",
  missing_class: "Thiếu lớp",
  missing_faculty: "Thiếu khoa",
  row_parse_uncertain: "Dòng này cần kiểm tra lại",
};

export function warningLabel(code: string) {
  return warningLabels[code] ?? code.replace(/[_-]+/g, " ");
}

export function decisionStatusLabel(status?: string | null) {
  return statusOptions.find((item) => item.value === status)?.label ?? formatOptional(status);
}

export function decisionStatusIcon(status?: DecisionImportStatus | null): LucideIcon {
  if (status === "confirmed" || status === "preview_ready") return CheckCircle2;
  if (status === "failed") return XCircle;
  if (status === "cancelled") return AlertCircle;
  if (
    status === "extracting_metadata" ||
    status === "ocr_processing" ||
    status === "parsing_roster"
  ) {
    return Loader2;
  }
  if (status === "uploaded") return FileCheck2;
  return Clock3;
}

export function fallbackDecisionUxStatus(item?: DecisionImport | null): UxStatus | null {
  if (!item) return null;
  if (item.uxStatus) return sanitizeDecisionUxStatus(item.uxStatus);

  const failedMessage =
    typeof item.userMessage === "string"
      ? item.userMessage
      : "Chưa xử lý được file này. Vui lòng thử lại hoặc kiểm tra chất lượng file.";

  const fallback: Record<DecisionImportStatus, UxStatus> = {
    draft: {
      step: "draft",
      label: "Đang chuẩn bị",
      message:
        "Tải quyết định, công văn hoặc danh sách chính thức để bắt đầu tạo kho minh chứng SV5T.",
      nextAction: "Tải quyết định/danh sách",
      severity: "neutral",
    },
    uploaded: {
      step: "uploaded",
      label: "Đã nhận tài liệu",
      message: "Tài liệu đã sẵn sàng để đọc danh sách sinh viên.",
      nextAction: "Đọc danh sách sinh viên",
      severity: "info",
    },
    queued: {
      step: "queued",
      label: "Đang chờ xử lý",
      message: "Hệ thống đã đưa file vào hàng đợi xử lý.",
      nextAction: "Chờ hệ thống xử lý",
      severity: "info",
    },
    processing: {
      step: "processing",
      label: "Đang xử lý",
      message: "Hệ thống đang đọc quyết định và danh sách sinh viên.",
      nextAction: "Chờ xử lý hoàn tất",
      severity: "info",
    },
    extracting_metadata: {
      step: "extracting_metadata",
      label: "Đang đọc thông tin quyết định",
      message: "Hệ thống đang đọc số văn bản, ngày ban hành, đơn vị ban hành và người ký.",
      nextAction: "Chờ hệ thống xử lý",
      severity: "info",
    },
    metadata_ready: {
      step: "metadata_ready",
      label: "Đã đọc thông tin văn bản",
      message: "Thông tin quyết định đã sẵn sàng để kiểm tra cùng danh sách sinh viên.",
      nextAction: "Tiếp tục kiểm tra danh sách",
      severity: "info",
    },
    ocr_processing: {
      step: "ocr_processing",
      label: "Đang đọc danh sách sinh viên",
      message:
        "Hệ thống đang đọc bảng danh sách sinh viên. Tài liệu nhiều trang có thể mất vài phút.",
      nextAction: "Bạn có thể rời trang và quay lại sau",
      severity: "info",
    },
    tables_ready: {
      step: "tables_ready",
      label: "Đã nhận diện bảng",
      message: "Bảng danh sách đã được nhận diện và đang chuẩn hoá.",
      nextAction: "Chờ danh sách kiểm tra",
      severity: "info",
    },
    parsing_roster: {
      step: "parsing_roster",
      label: "Đang chuẩn hoá danh sách SV5T",
      message: "Hệ thống đang nhận diện MSSV, họ tên, lớp và trạng thái từng dòng.",
      nextAction: "Chờ danh sách kiểm tra",
      severity: "info",
    },
    preview_ready: {
      step: "preview_ready",
      label: "Sẵn sàng kiểm tra",
      message: "Danh sách đã được đọc xong. Vui lòng kiểm tra trước khi xác nhận.",
      nextAction: "Kiểm tra danh sách",
      severity: "success",
    },
    confirmed: {
      step: "confirmed",
      label: "Đã lưu vào kho minh chứng chính thức",
      message:
        "Danh sách đã được xác nhận. Sinh viên trong danh sách có thể import minh chứng vào hồ sơ SV5T.",
      nextAction: "Xem kho sự kiện",
      severity: "success",
    },
    failed: {
      step: "failed",
      label: "Xử lý chưa thành công",
      message: failedMessage,
      nextAction: "Thử lại hoặc tải file rõ hơn",
      severity: "error",
    },
    cancelled: {
      step: "cancelled",
      label: "Đã huỷ",
      message: "Phiên import này đã được huỷ.",
      nextAction: "Tạo phiên đọc quyết định mới nếu cần",
      severity: "neutral",
    },
  };

  return sanitizeDecisionUxStatus(fallback[item.status] ?? fallback.draft);
}

export function sanitizeDecisionUxStatus(status?: UxStatus | null): UxStatus | null {
  if (!status) return null;

  return {
    ...status,
    label: cleanDecisionCopy(status.label),
    message: cleanDecisionCopy(status.message),
    nextAction: cleanDecisionCopy(status.nextAction),
    badges: status.badges?.map((badge) => cleanDecisionCopy(badge)),
  };
}

function cleanDecisionCopy(value: string): string;
function cleanDecisionCopy(value: null | undefined): null | undefined;
function cleanDecisionCopy(value: string | null | undefined) {
  if (!value) return value;

  return value
    .replace(/Event Registry/gi, "kho sự kiện")
    .replace(/\bpreview\b/gi, "danh sách kiểm tra")
    .replace(/\bmetadata\b/gi, "thông tin văn bản")
    .replace(/\bOCR\b/g, "đọc dữ liệu")
    .replace(/SmartReader/gi, "Hệ thống")
    .replace(/\bindexed\b/gi, "đã xác nhận")
    .replace(/\bindex\b/gi, "xác nhận");
}

export function formatDecisionDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(date);
}

export function formatDecisionDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatCriterion(value?: string | null) {
  return value ? (criterionLabel[value as Criterion] ?? value) : null;
}

export function formatLevel(value?: string | null) {
  return value ? (levelLabel[value as Level] ?? value) : null;
}

export function formatEventDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return null;
  if (startDate && endDate && startDate !== endDate) {
    return `${formatDecisionDate(startDate)} - ${formatDecisionDate(endDate)}`;
  }
  return formatDecisionDate(startDate ?? endDate);
}

export function formatConvertedValue(value?: number | null, unit?: string | null) {
  if (typeof value !== "number") return formatOptional(unit);
  return [value, unit].filter(Boolean).join(" ");
}

export type DisplayFact = {
  label: string;
  value?: string | number | null;
};

export function isPresentDisplayValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return Boolean(trimmed && trimmed !== "--" && trimmed !== "null" && trimmed !== "undefined");
  }
  return true;
}

export function formatOptional(value?: string | number | null) {
  if (!isPresentDisplayValue(value)) return null;
  return typeof value === "string" ? value.trim() : String(value);
}

export function compactFacts(facts: DisplayFact[]) {
  return facts
    .map((fact) => ({ ...fact, value: formatOptional(fact.value) }))
    .filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
}

export function hasColumnValue<T>(rows: T[], getter: (row: T) => unknown) {
  return rows.some((row) => isPresentDisplayValue(getter(row)));
}

export function getDecisionDisplayTitle(item?: DecisionImport | null) {
  return formatOptional(item?.eventName) ?? formatOptional(item?.title) ?? "Phiên đọc quyết định";
}

export function formatParticipationStatus(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const mapped: Record<string, string> = {
    confirmed: "Đã xác nhận",
    participated: "Đã tham gia",
    participant: "Đã tham gia",
    attended: "Đã tham gia",
    present: "Đã tham gia",
    pending: "Chờ xác nhận",
    absent: "Vắng",
    not_participated: "Không tham gia",
    rejected: "Không hợp lệ",
  };
  return mapped[normalized] ?? value;
}

export function formatSourceLocation(row: DecisionImportPreviewRow) {
  const parts: string[] = [];
  if (typeof row.sourcePage === "number") parts.push(`Trang ${row.sourcePage}`);
  if (typeof row.sourceTableIndex === "number" && row.sourceTableIndex > 0) {
    parts.push(`Bảng ${row.sourceTableIndex}`);
  }
  if (typeof row.sourceRowIndex === "number") parts.push(`Dòng ${row.sourceRowIndex}`);
  return parts.length ? parts.join(" · ") : null;
}

export function getDecisionErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message =
    typeof error === "object" && error && "message" in error ? String(error.message) : "";

  const mapped: Record<string, string> = {
    VNPT_AUTH_FAILED: "Hệ thống chưa thể kết nối dịch vụ số hoá. Vui lòng thử lại sau.",
    VNPT_UPLOAD_FAILED: "Chưa gửi được file đến dịch vụ số hoá.",
    VNPT_ADMIN_DOC_FAILED:
      "Chưa đọc được thông tin văn bản. Bạn vẫn có thể kiểm tra danh sách sinh viên.",
    VNPT_ASYNC_TIMEOUT: "File xử lý lâu hơn dự kiến. Bạn có thể thử lại hoặc quay lại sau.",
    OCR_NO_TABLE_FOUND:
      "Chưa nhận diện được bảng danh sách sinh viên. Vui lòng kiểm tra file hoặc thử bản rõ hơn.",
    ROSTER_PARSE_FAILED:
      "Chưa chuẩn hoá được danh sách. Vui lòng kiểm tra file hoặc cột danh sách.",
    CONFIRM_WITHOUT_PREVIEW: "Cần có danh sách kiểm tra trước khi xác nhận.",
  };

  return mapped[code] ?? message ?? "Vui lòng kiểm tra kết nối và thử lại.";
}
