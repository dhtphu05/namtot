import type { EvidenceResponse } from "@/lib/api/types";
import type { EvidenceCard } from "@/types/evidence";

export const CORE_EVIDENCE_CRITERIA = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
] as const;

export type CoreEvidenceCriterion = (typeof CORE_EVIDENCE_CRITERIA)[number];
export type EvidenceLibraryStatusKey =
  "processing" | "attention" | "ready" | "waiting" | "error" | "recorded";

export type EvidenceLibraryStatus = {
  key: EvidenceLibraryStatusKey;
  label: string;
  message: string;
  tone: "neutral" | "info" | "success" | "warning" | "error";
};

export type StudentEvidenceListItem = Pick<
  EvidenceResponse,
  "id" | "criterion" | "evidenceName"
> & {
  indexingStatus?: string | null;
  sourceType?: string | null;
  studentStatus?: unknown;
  fileName?: string | null;
  files?: Array<{ fileName?: string | null; originalName?: string | null }>;
};

export const EVIDENCE_UPLOAD_LIMIT_MB = 20;
export const EVIDENCE_UPLOAD_LIMIT_BYTES = EVIDENCE_UPLOAD_LIMIT_MB * 1024 * 1024;
export const EVIDENCE_UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = new Set(EVIDENCE_UPLOAD_ACCEPT.split(","));

const statusPresentation: Record<EvidenceLibraryStatusKey, EvidenceLibraryStatus> = {
  processing: {
    key: "processing",
    label: "Đang đọc tài liệu",
    message: "Bạn có thể tiếp tục hoàn thiện các phần khác trong lúc hệ thống xử lý.",
    tone: "info",
  },
  attention: {
    key: "attention",
    label: "Cần bạn kiểm tra",
    message: "Mở minh chứng để xem thông tin cần xác nhận hoặc bổ sung.",
    tone: "warning",
  },
  ready: {
    key: "ready",
    label: "Đã sẵn sàng",
    message: "Minh chứng đã được ghi nhận trong hồ sơ.",
    tone: "success",
  },
  waiting: {
    key: "waiting",
    label: "Đã tiếp nhận",
    message: "Minh chứng đã được lưu trong hồ sơ của bạn.",
    tone: "info",
  },
  error: {
    key: "error",
    label: "Không thể đọc tài liệu",
    message: "Mở minh chứng để xem tình trạng đọc tài liệu và hướng xử lý.",
    tone: "error",
  },
  recorded: {
    key: "recorded",
    label: "Đã ghi nhận",
    message: "Minh chứng đã được lưu trong hồ sơ.",
    tone: "neutral",
  },
};

const processingStates = new Set([
  "queued",
  "uploading_to_smartreader",
  "uploaded",
  "pending_indexing",
  "ocr_processing",
  "extracting",
  "extracting_fields",
  "checking_registry",
  "matching_registry",
]);

export function isCoreEvidenceCriterion(value: unknown): value is CoreEvidenceCriterion {
  return (
    typeof value === "string" && CORE_EVIDENCE_CRITERIA.includes(value as CoreEvidenceCriterion)
  );
}

export function filterStudentEvidences<T extends StudentEvidenceListItem>(
  evidences: readonly T[],
  filters: {
    criterion?: CoreEvidenceCriterion | "all";
    status?: EvidenceLibraryStatusKey | "all";
    search?: string;
  } = {},
): T[] {
  const query = filters.search?.trim().toLocaleLowerCase("vi") ?? "";

  return evidences.filter((evidence) => {
    if (!isCoreEvidenceCriterion(evidence.criterion)) return false;
    if (
      filters.criterion &&
      filters.criterion !== "all" &&
      evidence.criterion !== filters.criterion
    ) {
      return false;
    }
    if (filters.status && filters.status !== "all") {
      const card = evidence as T & { card?: EvidenceCard | null };
      if (getEvidenceLibraryStatus(evidence, card.card).key !== filters.status) return false;
    }
    if (!query) return true;

    const fileNames = [
      evidence.fileName,
      ...(evidence.files ?? []).flatMap((file) => [file.fileName, file.originalName]),
    ];
    return [evidence.evidenceName, ...fileNames]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLocaleLowerCase("vi").includes(query));
  });
}

export function getEvidenceLibraryStatus(
  evidence: Pick<StudentEvidenceListItem, "indexingStatus" | "sourceType" | "studentStatus">,
  card?: Pick<
    EvidenceCard,
    | "confirmationStatus"
    | "requiresHumanConfirmation"
    | "evidencePrecheck"
    | "studentStatus"
    | "uxStatus"
  > | null,
): EvidenceLibraryStatus {
  const studentStatus = asStatusCode(card?.studentStatus ?? evidence.studentStatus);
  const polledStatus = card?.uxStatus?.step;
  const indexingStatus =
    (typeof polledStatus === "string" ? polledStatus : evidence.indexingStatus)?.toLowerCase() ??
    "";

  if (indexingStatus === "failed" || studentStatus === "unreadable_file") {
    return statusPresentation.error;
  }
  if (processingStates.has(indexingStatus)) return statusPresentation.processing;
  if (studentStatus === "needs_more_info") {
    return statusPresentation.attention;
  }
  if (studentStatus === "needs_human_verification" || studentStatus === "recorded_waiting_review") {
    return statusPresentation.waiting;
  }
  if (indexingStatus === "needs_manual_review") return statusPresentation.waiting;

  const confirmationStatus = card?.confirmationStatus;
  const needsConfirmation =
    card?.requiresHumanConfirmation === true ||
    confirmationStatus === "pending" ||
    confirmationStatus === "correction_required" ||
    confirmationStatus === "needs_recheck" ||
    card?.evidencePrecheck?.status === "ready_for_confirmation";
  if (needsConfirmation) return statusPresentation.attention;
  if (
    indexingStatus === "indexed" ||
    evidence.sourceType === "event_import" ||
    studentStatus === "official_match_found"
  ) {
    return statusPresentation.ready;
  }

  return statusPresentation.recorded;
}

export function validateEvidenceUploadFile(file: {
  name: string;
  type?: string;
  size: number;
}): string | null {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const mimeType = file.type?.trim().toLowerCase() ?? "";
  const supported =
    allowedMimeTypes.has(mimeType) ||
    ((!mimeType || mimeType === "application/octet-stream") && allowedExtensions.has(extension));
  if (!supported) return "Định dạng chưa được hỗ trợ. Hãy chọn PDF, JPG, PNG hoặc WEBP.";
  if (file.size > EVIDENCE_UPLOAD_LIMIT_BYTES) {
    return `Tài liệu vượt quá giới hạn ${EVIDENCE_UPLOAD_LIMIT_MB} MB.`;
  }
  return null;
}

function asStatusCode(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const code = (value as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}
