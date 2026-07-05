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
  manual_upload: "Upload thủ công",
  event_import: "Sự kiện đã xác nhận",
  metric_input: "Nhập chỉ số",
  collective_import: "Minh chứng tập thể",
};

export const evidenceStatusLabel: Record<EvidenceStatus, string> = {
  draft: "Đã lưu",
  pending_indexing: "Đang kiểm tra file",
  indexed: "Đã đọc được file",
  needs_supplement: "Cần bổ sung",
  under_review: "Chờ cán bộ xác nhận sau khi nộp",
  accepted: "Đã được xác nhận",
  rejected: "Không đọc rõ file",
  resolution_needed: "File cần kiểm tra thêm",
};

export const indexingStatusLabel: Record<IndexingStatus, string> = {
  not_started: "Đã lưu",
  uploaded: "Đã lưu",
  pending_indexing: "Đang kiểm tra file",
  ocr_processing: "Đang kiểm tra file",
  extracting: "Đang kiểm tra file",
  checking_registry: "Đang kiểm tra file",
  indexed: "Đã đọc được file",
  needs_manual_review: "File cần kiểm tra thêm",
  failed: "Không đọc rõ file",
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
  if (Array.isArray(raw) && raw.length > 0) return raw as StudentEvidenceFile[];

  const fileId = typeof evidence.fileId === "string" ? evidence.fileId : "";
  const fileName = getStringValue(evidence.fileName) || getStringValue(evidence.originalName) || getStringValue(evidence.file_name);
  if (!fileId && !fileName) return [];

  return [{
    id: fileId || undefined,
    fileName: fileName || "Tệp đính kèm",
    originalName: fileName || undefined,
    mimeType: getStringValue(evidence.mimeType) || getStringValue(evidence.mime_type) || inferMimeType(fileName),
    fileSize: getNumberValue(evidence.fileSize ?? evidence.file_size ?? evidence.size),
    size: getNumberValue(evidence.fileSize ?? evidence.file_size ?? evidence.size),
    uploadedAt: getStringValue(evidence.uploadedAt ?? evidence.uploaded_at),
    createdAt: evidence.createdAt,
  }];
}

export function getPrimaryFile(evidence: EvidenceResponse) {
  return getEvidenceFiles(evidence)[0];
}

export function getFileName(file?: StudentEvidenceFile | null) {
  return file?.originalName ?? file?.fileName ?? "Tệp đính kèm";
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

function getStringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function getNumberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferMimeType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  return null;
}
