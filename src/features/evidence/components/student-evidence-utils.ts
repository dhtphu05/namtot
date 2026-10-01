import type {
  Criterion,
  EvidenceResponse,
  EvidenceSourceType,
  EvidenceStatus,
  IndexingStatus,
} from "@/lib/api/types";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";

export const studentCriterionLabel: Record<Criterion, string> = {
  ethics: getCoreCriterionLabel("ethics"),
  academic: getCoreCriterionLabel("academic"),
  physical: getCoreCriterionLabel("physical"),
  volunteer: getCoreCriterionLabel("volunteer"),
  integration: getCoreCriterionLabel("integration"),
  priority: "Thành tích ưu tiên",
  collective: "Tập thể",
};

export const sourceTypeLabel: Record<EvidenceSourceType, string> = {
  manual_upload: "Tải lên",
  event_import: "Danh sách đã xác nhận",
  metric_input: "Chỉ số đã nhập",
  collective_import: "Dữ liệu tập thể",
};

export const evidenceStatusLabel: Record<EvidenceStatus, string> = {
  draft: "Đã lưu",
  pending_indexing: "Đang kiểm tra tệp",
  indexed: "Đã đọc được nội dung tệp",
  needs_supplement: "Cần bổ sung",
  under_review: "Chờ cán bộ xác nhận sau khi nộp",
  accepted: "Đã được xác nhận",
  rejected: "Không đọc rõ nội dung tệp",
  resolution_needed: "Tệp cần kiểm tra thêm",
};

export const indexingStatusLabel: Record<IndexingStatus, string> = {
  not_started: "Đã lưu",
  uploaded: "Đã lưu",
  pending_indexing: "Đang kiểm tra tệp",
  ocr_processing: "Đang kiểm tra tệp",
  extracting: "Đang kiểm tra tệp",
  checking_registry: "Đang kiểm tra tệp",
  indexed: "Đã đọc được nội dung tệp",
  needs_manual_review: "Tệp cần kiểm tra thêm",
  failed: "Không đọc rõ nội dung tệp",
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
  url?: string | null;
  signedUrl?: string | null;
  publicUrl?: string | null;
  fileSize?: number | null;
  size?: number | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
};

export function getEvidenceFiles(evidence: EvidenceResponse): StudentEvidenceFile[] {
  const raw = evidence.files;
  if (Array.isArray(raw) && raw.length > 0) return raw as StudentEvidenceFile[];

  const fileId = typeof evidence.fileId === "string" ? evidence.fileId : "";
  const fileName =
    getStringValue(evidence.fileName) ||
    getStringValue(evidence.originalName) ||
    getStringValue(evidence.file_name);
  if (!fileId && !fileName) return [];

  return [
    {
      id: fileId || undefined,
      fileName: fileName || "Tệp đính kèm",
      originalName: fileName || undefined,
      mimeType:
        getStringValue(evidence.mimeType) ||
        getStringValue(evidence.mime_type) ||
        inferMimeType(fileName),
      fileSize: getNumberValue(evidence.fileSize ?? evidence.file_size ?? evidence.size),
      size: getNumberValue(evidence.fileSize ?? evidence.file_size ?? evidence.size),
      uploadedAt: getStringValue(evidence.uploadedAt ?? evidence.uploaded_at),
      createdAt: evidence.createdAt,
    },
  ];
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
