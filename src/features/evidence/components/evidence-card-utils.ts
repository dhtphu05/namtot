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
  manual_upload: "Tải lên thủ công",
  event_import: "Danh sách chính thức",
  metric_input: "Chỉ số",
  collective_import: "Từ hồ sơ tập thể",
};

export const indexingStatusCopy: Record<string, string> = {
  not_started: "Chưa xử lý",
  uploaded: "Đã nhận tệp",
  pending_indexing: "Chờ đọc nội dung tệp",
  ocr_processing: "Đang đọc nội dung tệp",
  processing: "Đang xử lý",
  extracting: "Đang tạo tóm tắt",
  extracting_fields: "Đang tạo tóm tắt",
  checking_registry: "Đang đối chiếu kho minh chứng",
  indexed: "Đã tạo tóm tắt",
  needs_manual_review: "Cần cán bộ kiểm tra",
  failed: "Chưa đọc được nội dung tệp",
};

export const warningCopy: Record<string, string> = {
  missing_student_name: "Chưa nhận diện được họ tên",
  missing_student_code: "Chưa nhận diện được MSSV",
  missing_student_info: "Chưa nhận diện được họ tên hoặc MSSV",
  missing_issue_date: "Chưa nhận diện được ngày cấp/ngày ký",
  missing_date: "Chưa nhận diện được ngày cấp hoặc ngày tham gia",
  missing_organizer: "Chưa nhận diện được đơn vị tổ chức",
  missing_event_name: "Chưa nhận diện rõ tên hoạt động/minh chứng",
  ocr_failed: "Chưa đọc được nội dung minh chứng. Bạn có thể thử lại hoặc tải bản rõ hơn.",
  not_matched_registry: "Chưa tìm thấy minh chứng này trong kho danh sách chính thức",
  ocr_empty_text: "Chưa đọc được nội dung rõ ràng từ tệp",
  possible_wrong_student: "Thông tin sinh viên có thể chưa khớp",
  possible_student_mismatch: "Thông tin sinh viên trong tài liệu có dấu hiệu không khớp hồ sơ.",
  low_confidence: "Thông tin nhận diện chưa đủ chắc chắn; vui lòng kiểm tra lại.",
  field_low_confidence: "Một số thông tin nhận diện chưa đủ chắc chắn; vui lòng kiểm tra lại.",
  ocr_text_low_quality: "Nội dung đọc được có thể chưa chính xác; vui lòng đối chiếu với tài liệu.",
  ocr_student_name_conflict: "Họ tên trong tài liệu chưa khớp rõ với hồ sơ.",
  ocr_class_conflict: "Lớp trong tài liệu chưa khớp rõ với hồ sơ.",
  ocr_faculty_conflict: "Khoa trong tài liệu chưa khớp rõ với hồ sơ.",
  event_name_mismatch_with_user_input:
    "Tên hoạt động hệ thống đọc được khác tên minh chứng đã nhập.",
  participant_name_duplicate: "Có nhiều sinh viên trùng họ tên trong danh sách chính thức.",
  participant_name_not_matched: "Không tìm thấy họ tên sinh viên trong danh sách chính thức.",
  participant_not_matched_registry: "Không tìm thấy sinh viên trong danh sách chính thức.",
  smartreader_warning_anh_dau_vao_nghieng: "Ảnh/tài liệu có thể bị nghiêng",
  smartreader_warning_anh_dau_vao_mat_goc: "Ảnh/tài liệu có thể bị mất góc",
  issuer_stamp_visible:
    "Đã nhận diện dấu hoặc thông tin đơn vị cấp trên tài liệu; vui lòng đối chiếu.",
  document_image_skewed:
    "Ảnh hoặc tài liệu có thể bị nghiêng; vui lòng kiểm tra lại thông tin nhận diện.",
  document_image_cropped:
    "Ảnh hoặc tài liệu có thể bị mất góc; vui lòng kiểm tra lại thông tin nhận diện.",
  document_quality_warning:
    "Ảnh hoặc tài liệu có thể khó đọc; vui lòng kiểm tra lại thông tin nhận diện.",
  visual_fields_need_confirmation:
    "Thông tin trong ảnh đã được nhận diện; vui lòng đối chiếu MSSV và GPA với hồ sơ.",
  file_quality_poor: "File hiện khó đọc. Bạn nên tải bản rõ hơn trước khi xác nhận.",
  low_resolution: "Ảnh hoặc tài liệu có độ phân giải thấp; một số chữ nhỏ có thể khó đọc.",
  image_low_resolution: "Ảnh hoặc tài liệu có độ phân giải thấp; một số chữ nhỏ có thể khó đọc.",
  low_image_quality: "Ảnh hoặc tài liệu có thể mờ, nghiêng hoặc mất góc; vui lòng kiểm tra lại.",
  mock_analysis: "Thông tin nhận diện đang ở chế độ kiểm thử; vui lòng kiểm tra lại.",
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
      nextAction: "Bạn có thể tải tệp rõ hơn nếu hồ sơ vẫn còn được chỉnh sửa.",
      severity: "warning",
      badges: ["Cần kiểm tra"],
    };
  }

  if (status === "failed") {
    return {
      label: "Không đọc rõ nội dung tệp",
      message: "Hệ thống chưa đọc được nội dung minh chứng.",
      nextAction: "Thử kiểm tra lại hoặc tải tệp rõ hơn.",
      severity: "error",
      badges: ["Có lỗi"],
    };
  }

  if (status === "ocr_processing" || status === "processing") {
    return {
      label: "Đang đọc minh chứng",
      message: "Hệ thống đang đọc nội dung tệp. Bạn có thể rời trang và quay lại sau.",
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
    message: "Tệp đã được nhận. Hệ thống sẽ bắt đầu đọc nội dung trong nền.",
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

export function getWarningDisplayCopy(code?: string | null, message?: string | null) {
  const normalizedCode = (code ?? "").trim().toLowerCase();
  const normalizedMessage = (message ?? "").toLowerCase();
  if (/values? (?:were|was) detected visually from the uploaded image/.test(normalizedMessage)) {
    return warningCopy.visual_fields_need_confirmation;
  }
  if (/issuer.*stamp|stamp.*visible|seal.*visible/.test(normalizedMessage)) {
    return warningCopy.issuer_stamp_visible;
  }
  if (/low.{0,24}resolution|resolution.{0,24}low/.test(normalizedMessage)) {
    return warningCopy.low_resolution;
  }
  if (/skew|tilt/.test(normalizedMessage)) return warningCopy.document_image_skewed;
  if (/crop|missing corner/.test(normalizedMessage)) return warningCopy.document_image_cropped;
  const mapped = warningCopy[normalizedCode];
  if (mapped) return mapped;
  if (/issuer.*stamp|stamp.*visible|seal.*visible/.test(normalizedCode)) {
    return warningCopy.issuer_stamp_visible;
  }
  if (/skew|tilt/.test(normalizedCode)) return warningCopy.document_image_skewed;
  if (/crop|missing_corner/.test(normalizedCode)) return warningCopy.document_image_cropped;
  if (/resolution|low_res|image_quality|blur|readable|quality/.test(normalizedCode)) {
    return warningCopy.document_quality_warning;
  }

  const safeMessage = message?.trim();
  if (
    safeMessage &&
    hasVietnameseDiacritics(safeMessage) &&
    !containsEnglishSystemText(safeMessage)
  ) {
    return safeMessage;
  }
  return "Có thông tin cần bạn kiểm tra lại.";
}

export function localizeEvidenceValue(value?: string | number | null) {
  if (typeof value !== "string") return value == null ? null : String(value);
  const normalized = value.trim().toLowerCase();
  const controlledValues: Record<string, string> = {
    class: "Cấp Lớp",
    faculty: "Cấp Khoa",
    school: "Cấp Trường",
    university: "Cấp Đại học",
    city: "Cấp Thành phố",
    central: "Cấp Trung ương",
    club: "CLB/Đội/Nhóm",
    external: "Đơn vị ngoài trường",
    unknown: "Chưa xác định",
    excellent: "Xuất sắc",
    "very good": "Tốt",
    good: "Tốt",
    fair: "Khá",
    average: "Trung bình",
    weak: "Yếu",
    poor: "Yếu",
    pass: "Đạt",
    passed: "Đạt",
    fail: "Chưa đạt",
    failed: "Chưa đạt",
    academic_result: "Kết quả học tập",
    conduct_result: "Kết quả rèn luyện",
    student_healthy_certificate: "Chứng nhận Sinh viên khỏe",
    volunteer_certificate: "Minh chứng tình nguyện",
    activity_certificate: "Giấy chứng nhận hoạt động",
    award_certificate: "Giấy khen/giải thưởng",
    research_achievement: "Thành tích nghiên cứu",
    international_exchange: "Minh chứng hội nhập",
    participant_confirmation: "Xác nhận tham gia",
    language_certificate: "Chứng chỉ ngoại ngữ",
  };
  return controlledValues[normalized] ?? value;
}

export function isVietnameseUiCopy(value?: string | null) {
  return Boolean(value && hasVietnameseDiacritics(value) && !containsEnglishSystemText(value));
}

function hasVietnameseDiacritics(value: string) {
  return /[ăâđêôơưĂÂĐÊÔƠƯàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹ]/i.test(
    value,
  );
}

function containsEnglishSystemText(value: string) {
  return /\b(?:image|resolution|skewed|stamp|visible|unreadable|classification|university|issuer|low\s+resolution|slightly|provider|warning|confidence|detected|not\s+readable|academic|transcript|certificate|student|system|recognized|extracted|quality|blurred|cropped|readable|document)\b/i.test(
    value,
  );
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
