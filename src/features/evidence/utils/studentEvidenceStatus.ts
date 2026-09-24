import type { EvidenceResponse } from "@/lib/api/types";
import type { EvidenceCard, EvidenceStudentStatusCode } from "@/types/evidence";
import { normalizeWarnings } from "../components/evidence-card-utils";

export type StudentEvidenceStatusKey =
  | "official_match_found"
  | "official_match_not_found"
  | "similar_name_found"
  | "evidence_read"
  | "needs_more_info"
  | "needs_human_verification"
  | "unreadable_file"
  | "recorded_waiting_review";

export type StudentEvidenceStatus = {
  key: StudentEvidenceStatusKey;
  label: string;
  message: string;
  primaryActionLabel: string;
  tone: "neutral" | "info" | "success" | "warning" | "error";
};

export const studentEvidenceStatusMap: Record<StudentEvidenceStatusKey, StudentEvidenceStatus> = {
  official_match_found: {
    key: "official_match_found",
    label: "Đã tìm thấy trong danh sách chính thức",
    message: "Bạn có tên trong danh sách xác nhận của hoạt động này.",
    primaryActionLabel: "Thêm vào hồ sơ",
    tone: "success",
  },
  official_match_not_found: {
    key: "official_match_not_found",
    label: "Chưa tìm thấy trong danh sách chính thức",
    message: "Bạn vẫn có thể upload minh chứng để cán bộ xác minh.",
    primaryActionLabel: "Upload minh chứng",
    tone: "warning",
  },
  similar_name_found: {
    key: "similar_name_found",
    label: "Có hoạt động tương tự",
    message:
      "Hệ thống tìm thấy hoạt động có tên gần giống. Vui lòng kiểm tra trước khi thêm vào hồ sơ.",
    primaryActionLabel: "Xem hoạt động",
    tone: "warning",
  },
  evidence_read: {
    key: "evidence_read",
    label: "Đã đọc minh chứng",
    message: "Hệ thống đã đọc được các thông tin chính từ file.",
    primaryActionLabel: "Xem minh chứng",
    tone: "success",
  },
  needs_more_info: {
    key: "needs_more_info",
    label: "Cần bổ sung thông tin",
    message: "Minh chứng còn thiếu một số thông tin cần thiết.",
    primaryActionLabel: "Bổ sung",
    tone: "warning",
  },
  needs_human_verification: {
    key: "needs_human_verification",
    label: "Cần cán bộ xác minh",
    message: "Minh chứng đã được ghi nhận và chờ cán bộ kiểm tra.",
    primaryActionLabel: "Xem lịch sử",
    tone: "warning",
  },
  unreadable_file: {
    key: "unreadable_file",
    label: "Không đọc rõ file",
    message: "File chưa đọc rõ. Bạn có thể tải lại bản rõ hơn.",
    primaryActionLabel: "Tải lại file",
    tone: "error",
  },
  recorded_waiting_review: {
    key: "recorded_waiting_review",
    label: "Đã ghi nhận, chờ xét duyệt",
    message: "Minh chứng đã nằm trong hồ sơ của bạn.",
    primaryActionLabel: "Xem hồ sơ",
    tone: "info",
  },
};

export function getStudentEvidenceStatus(
  evidence: EvidenceResponse,
  card?: EvidenceCard | null,
): StudentEvidenceStatus {
  if (
    evidence.indexingStatus === "indexed" &&
    card?.evidencePrecheck?.status === "ready_for_confirmation"
  ) {
    return studentEvidenceStatusMap.evidence_read;
  }

  const backendStatus = normalizeBackendStatus(card?.studentStatus ?? evidence.studentStatus);
  if (backendStatus) return backendStatus;

  if (evidence.sourceType === "event_import") {
    return studentEvidenceStatusMap.official_match_found;
  }

  if (evidence.indexingStatus === "failed") {
    return studentEvidenceStatusMap.unreadable_file;
  }

  if (evidence.indexingStatus === "needs_manual_review") {
    return studentEvidenceStatusMap.needs_human_verification;
  }

  const warnings = normalizeWarnings(card?.warnings ?? card?.warningsJson);
  if (warnings.some((warning) => warning.startsWith("missing_"))) {
    return studentEvidenceStatusMap.needs_more_info;
  }

  if (evidence.indexingStatus === "indexed") {
    return studentEvidenceStatusMap.evidence_read;
  }

  return studentEvidenceStatusMap.recorded_waiting_review;
}

export function getStudentEventHubStatus(found: boolean) {
  return found
    ? studentEvidenceStatusMap.official_match_found
    : studentEvidenceStatusMap.official_match_not_found;
}

function normalizeBackendStatus(value: unknown): StudentEvidenceStatus | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    code?: EvidenceStudentStatusCode;
    label?: string | null;
    message?: string | null;
    severity?: string | null;
  };
  const fallback = record.code ? studentEvidenceStatusMap[record.code] : null;
  if (!fallback) return null;

  return {
    ...fallback,
    label: record.label || fallback.label,
    message: record.message || fallback.message,
    tone: severityToTone(record.severity) ?? fallback.tone,
  };
}

function severityToTone(severity?: string | null): StudentEvidenceStatus["tone"] | null {
  if (
    severity === "success" ||
    severity === "info" ||
    severity === "warning" ||
    severity === "error"
  ) {
    return severity;
  }
  return null;
}
