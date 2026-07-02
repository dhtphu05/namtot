import type {
  Criterion,
  EvidenceResponse,
  EvidenceSourceType,
  EvidenceStatus,
  IndexingStatus,
} from "@/lib/api/types";

export const studentCriterionLabel: Record<Criterion, string> = {
  ethics: "Đạo đức tốt",
  academic: "Học tập tốt",
  physical: "Thể lực tốt",
  volunteer: "Tình nguyện tốt",
  integration: "Hội nhập tốt",
  priority: "Thành tích ưu tiên",
  collective: "Tập thể",
};

export const sourceTypeLabel: Record<EvidenceSourceType, string> = {
  manual_upload: "Tải lên thủ công",
  event_import: "Nhập từ sự kiện",
  metric_input: "Nhập chỉ số",
  collective_import: "Nhập từ tập thể",
};

export const evidenceStatusLabel: Record<EvidenceStatus, string> = {
  draft: "Bản nháp",
  pending_indexing: "Chờ xử lý",
  indexed: "Đã được AI xử lý",
  needs_supplement: "Cần bổ sung",
  under_review: "Chờ cán bộ kiểm tra",
  accepted: "Đã được chấp nhận",
  rejected: "Không hợp lệ",
  resolution_needed: "Cần hội đồng xem xét",
};

export const indexingStatusLabel: Record<IndexingStatus, string> = {
  not_started: "Chưa xử lý AI",
  uploaded: "Đã tải lên",
  pending_indexing: "Đang chờ AI xử lý",
  ocr_processing: "AI đang đọc file",
  extracting: "AI đang trích xuất thông tin",
  checking_registry: "Đang đối chiếu dữ liệu",
  indexed: "AI đã xử lý xong",
  needs_manual_review: "Cần cán bộ kiểm tra",
  failed: "AI không đọc được",
};

export function formatStudentDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return "--";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export type StudentEvidenceFile = {
  id?: string;
  fileName?: string;
  originalName?: string;
  mimeType?: string | null;
  fileSize?: number | null;
  size?: number | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
};

export function getEvidenceFiles(evidence: EvidenceResponse): StudentEvidenceFile[] {
  const raw = evidence.files;
  return Array.isArray(raw) ? (raw as StudentEvidenceFile[]) : [];
}

export function getPrimaryFile(evidence: EvidenceResponse) {
  return getEvidenceFiles(evidence)[0];
}

export function getFileName(file?: StudentEvidenceFile | null) {
  return file?.originalName ?? file?.fileName ?? "File minh chứng";
}

export function getFileSize(file?: StudentEvidenceFile | null) {
  return file?.fileSize ?? file?.size ?? null;
}

export function isImageFile(file?: StudentEvidenceFile | null) {
  return !!file?.mimeType?.startsWith("image/");
}

export function isPdfFile(file?: StudentEvidenceFile | null) {
  return file?.mimeType === "application/pdf";
}

