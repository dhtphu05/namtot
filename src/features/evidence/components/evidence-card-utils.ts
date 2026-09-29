import type { UxStatus } from "@/types/api";
import type { EvidenceCard } from "@/types/evidence";
import type { EvidenceResponse } from "@/lib/api/types";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";

export const studentEvidenceCriteria = [
  { key: "ethics", label: getCoreCriterionLabel("ethics") },
  { key: "academic", label: getCoreCriterionLabel("academic") },
  { key: "physical", label: getCoreCriterionLabel("physical") },
  { key: "volunteer", label: getCoreCriterionLabel("volunteer") },
  { key: "integration", label: getCoreCriterionLabel("integration") },
] as const;

export const sourceTypeCopy: Record<string, string> = {
  manual_upload: "Upload thủ công",
  event_import: "Danh sách chính thức",
  metric_input: "Chỉ số",
  collective_import: "Từ hồ sơ tập thể",
};

export const indexingStatusCopy: Record<string, string> = {
  not_started: "Chưa xử lý",
  uploaded: "Đã nhận file",
  pending_indexing: "Chờ đọc file",
  ocr_processing: "Đang đọc file",
  processing: "Đang xử lý",
  extracting: "Đang tạo tóm tắt",
  extracting_fields: "Đang tạo tóm tắt",
  checking_registry: "Đang đối chiếu kho minh chứng",
  indexed: "Đã tạo tóm tắt",
  needs_manual_review: "Cần cán bộ kiểm tra",
  failed: "Chưa đọc được file",
};

export const warningCopy: Record<string, string> = {
  missing_student_name: "Chưa nhận diện được họ tên",
  missing_student_code: "Chưa nhận diện được MSSV",
  missing_issue_date: "Chưa nhận diện được ngày cấp/ngày ký",
  missing_organizer: "Chưa nhận diện được đơn vị tổ chức",
  missing_event_name: "Chưa nhận diện rõ tên hoạt động/minh chứng",
  not_matched_registry: "Chưa tìm thấy minh chứng này trong kho danh sách chính thức",
  ocr_empty_text: "Chưa đọc được nội dung rõ ràng từ file",
  possible_wrong_student: "Thông tin sinh viên có thể chưa khớp",
  smartreader_warning_anh_dau_vao_nghieng: "Ảnh/tài liệu có thể bị nghiêng",
  smartreader_warning_anh_dau_vao_mat_goc: "Ảnh/tài liệu có thể bị mất góc",
};

const unsafeFieldPatterns = [
  /raw/i,
  /token/i,
  /header/i,
  /signed.*url/i,
  /authorization/i,
  /vnpt.*json/i,
];

export function normalizeEvidenceCard(payload: unknown): EvidenceCard | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const nested = record.card;
  if (nested && typeof nested === "object") {
    return nested as EvidenceCard;
  }
  return record as EvidenceCard;
}

export function getEvidenceUxStatus(
  evidence: EvidenceResponse,
  card?: EvidenceCard | null,
): UxStatus {
  const status = evidence.indexingStatus;
  const backendStatus =
    card?.uxStatus ?? (evidence as EvidenceResponse & { uxStatus?: UxStatus }).uxStatus;
  if (backendStatus?.label) return backendStatus;

  if (status === "indexed") {
    return {
      label: "Đã đọc minh chứng",
      message: "Hệ thống đã đọc xong minh chứng và rút trích thông tin chính.",
      nextAction: "Kiểm tra lại thông tin trước khi nộp hồ sơ.",
      severity: "success",
      progressPercent: 100,
      badges: ["Đã đọc"],
    };
  }

  if (status === "needs_manual_review") {
    return {
      label: "Cần cán bộ kiểm tra",
      message: "Hệ thống đã đọc được một phần minh chứng nhưng cần cán bộ kiểm tra thêm.",
      nextAction: "Bạn có thể tải file rõ hơn nếu hồ sơ vẫn còn được chỉnh sửa.",
      severity: "warning",
      badges: ["Cần kiểm tra"],
    };
  }

  if (status === "failed") {
    return {
      label: "Không đọc rõ file",
      message: "Hệ thống chưa đọc được nội dung minh chứng.",
      nextAction: "Thử xử lý lại hoặc tải file rõ hơn.",
      severity: "error",
      badges: ["Có lỗi"],
    };
  }

  if (status === "ocr_processing" || status === "processing") {
    return {
      label: "Đang đọc minh chứng",
      message: "Hệ thống đang đọc nội dung trong file. Bạn có thể rời trang và quay lại sau.",
      nextAction: "Hệ thống sẽ tự cập nhật khi tóm tắt sẵn sàng.",
      severity: "info",
      badges: ["Đang xử lý"],
    };
  }

  if (status === "extracting" || status === "checking_registry") {
    return {
      label: status === "checking_registry" ? "Đang đối chiếu Event Hub" : "Đang tạo tóm tắt",
      message: "Hệ thống đang rút trích thông tin chính từ minh chứng.",
      nextAction: "Bạn có thể tiếp tục hoàn thiện hồ sơ trong lúc chờ.",
      severity: "info",
      badges: ["Tóm tắt"],
    };
  }

  return {
    label: "File đã được nhận",
    message: "File đã được nhận. Hệ thống sẽ bắt đầu đọc file trong nền.",
    nextAction: "Bạn có thể rời trang và quay lại sau.",
    severity: "neutral",
    badges: ["Chờ xử lý"],
  };
}

export function getConfidenceSummary(confidence?: number | null) {
  if (typeof confidence !== "number") return null;
  const percent = Math.round(confidence * 100);
  if (confidence >= 0.85) return { label: "Độ chắc chắn cao", percent, tone: "success" as const };
  if (confidence >= 0.6) return { label: "Cần xem lại nhẹ", percent, tone: "warning" as const };
  return { label: "Cần cán bộ kiểm tra", percent, tone: "warning" as const };
}

export function normalizeWarnings(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => normalizeWarningValue(item)).filter(Boolean);
  }
  if (typeof value === "string") return [value];
  return [];
}

export function normalizeWarningValue(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.code ?? record.message ?? record.label ?? "");
  }
  return "";
}

export function getSafeExtractedFields(card?: EvidenceCard | null) {
  const value = card?.extractedFields ?? card?.extractedFieldsJson;
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .filter(([key, fieldValue]) => {
      if (unsafeFieldPatterns.some((pattern) => pattern.test(key))) return false;
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
    })
    .map(([key, fieldValue]) => ({
      key,
      label: fieldLabel(key),
      value: formatFieldValue(fieldValue),
    }));
}

export function getSafeOcrText(card?: EvidenceCard | null) {
  const text = card?.ocrText;
  return typeof text === "string" ? text : "";
}

export function isTerminalEvidenceStatus(status?: string | null) {
  return ["indexed", "needs_manual_review", "failed", "completed", "cancelled"].includes(
    status ?? "",
  );
}

export function canRetryEvidence(evidence?: EvidenceResponse | null) {
  return evidence?.indexingStatus === "failed" && Boolean(evidence.jobId);
}

function fieldLabel(key: string) {
  const known: Record<string, string> = {
    studentName: "Họ tên",
    student_name: "Họ tên",
    fullName: "Họ tên",
    studentCode: "MSSV",
    student_code: "MSSV",
    className: "Lớp",
    class_name: "Lớp",
    faculty: "Khoa",
    evidenceType: "Loại minh chứng",
    evidence_type: "Loại minh chứng",
    eventName: "Tên hoạt động/cuộc thi/chứng chỉ",
    event_name: "Tên hoạt động/cuộc thi/chứng chỉ",
    certificateName: "Tên hoạt động/cuộc thi/chứng chỉ",
    organizer: "Đơn vị tổ chức",
    organizerName: "Đơn vị tổ chức",
    organizerLevel: "Cấp tổ chức",
    organizer_level: "Cấp tổ chức",
    issueDate: "Ngày cấp/ngày ký",
    issue_date: "Ngày cấp/ngày ký",
    activityTime: "Thời gian hoạt động",
    activity_time: "Thời gian hoạt động",
    convertedValue: "Số ngày/điểm/chứng chỉ",
    converted_value: "Số ngày/điểm/chứng chỉ",
  };

  return (
    known[key] ??
    key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/^./, (char) => char.toUpperCase())
  );
}

function formatFieldValue(value: unknown) {
  if (Array.isArray(value)) return value.map(formatFieldValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
