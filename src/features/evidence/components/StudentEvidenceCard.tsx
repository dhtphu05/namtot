import { useMemo, useRef, useState } from "react";
import {
  FileText,
  ImageIcon,
  ListChecks,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AppButton, StatusBadge } from "@/features/student/components/primitives";
import { getEvidenceDisplayModel } from "@/features/application/presentation";
import {
  useEvidencePreviewVisibility,
  useSignedFileUrl,
  useUpdateEvidence,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import { getEvidenceStudentStatus } from "@/features/student/selectors/student-ui";
import { PRESENTATION_SEMANTICS_V2 } from "@/lib/presentation-semantics";
import type { EvidenceResponse } from "@/lib/api/types";
import {
  getEvidenceFiles,
  getFileName,
  getPrimaryFile,
  isImageFile,
  isPdfFile,
  studentCriterionLabel,
} from "./student-evidence-utils";
import type { EvidenceLibraryStatus } from "../utils/evidenceLibrary";
import { EVIDENCE_UPLOAD_ACCEPT, validateEvidenceUploadFile } from "../utils/evidenceLibrary";

export function StudentEvidenceCard({
  evidence,
  applicationId,
  canEdit = true,
  profile,
  onViewDetails,
  onDelete,
  statusOverride,
  viewLabel = "Xem",
}: {
  evidence: EvidenceResponse;
  applicationId: string;
  canEdit?: boolean;
  profile?: { fullName?: string | null; studentCode?: string | null };
  onViewDetails: (evidence: EvidenceResponse) => void;
  onDelete?: (evidence: EvidenceResponse) => void;
  statusOverride?: Pick<EvidenceLibraryStatus, "label" | "message" | "tone">;
  viewLabel?: string;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(evidence.evidenceName);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEvidence = useUpdateEvidence();
  const uploadFile = useUploadEvidenceFile(applicationId);
  const files = useMemo(() => getEvidenceFiles(evidence), [evidence]);
  const primaryFile = useMemo(() => getPrimaryFile(evidence), [evidence]);
  const { elementRef, isNearViewport } = useEvidencePreviewVisibility();
  const signedUrl = useSignedFileUrl(
    primaryFile?.id,
    isNearViewport &&
      Boolean(primaryFile?.id) &&
      Boolean(isImageFile(primaryFile) || isPdfFile(primaryFile)),
  );
  const previewUrl = signedUrl.data ?? null;
  const status = getEvidenceStudentStatus(evidence);
  const display = useMemo(() => getEvidenceDisplayModel(evidence), [evidence]);
  const statusTone = statusOverride
    ? mapLibraryTone(statusOverride.tone)
    : PRESENTATION_SEMANTICS_V2
      ? display.tone
      : status.tone;
  const isBusy = updateEvidence.isPending || uploadFile.isPending;
  const extractedSummary = getExtractedSummary(evidence);
  const warnings = getEvidenceWarnings(evidence, profile);
  const needsFileCheckAgain =
    evidence.indexingStatus === "failed" || evidence.indexingStatus === "needs_manual_review";

  const saveName = async () => {
    const evidenceName = name.trim();
    if (evidenceName.length < 3) {
      toast.error("Tên minh chứng cần ít nhất 3 ký tự.");
      return;
    }
    try {
      await updateEvidence.mutateAsync({
        evidenceId: evidence.id,
        applicationId,
        data: { evidenceName },
      });
      setRenaming(false);
      toast.success("Đã lưu tên minh chứng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu tên minh chứng.");
    }
  };

  const replaceFile = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validateEvidenceUploadFile(file);
    if (validationError) {
      toast.error(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    try {
      await uploadFile.mutateAsync({ evidenceId: evidence.id, applicationId, file });
      toast.success("Đã lưu tệp minh chứng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu tệp minh chứng.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-[#9FC4EA]">
      <input
        ref={inputRef}
        type="file"
        accept={EVIDENCE_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => void replaceFile(event.target.files?.[0])}
        disabled={!canEdit || uploadFile.isPending}
      />

      <div className="flex min-w-0 flex-col gap-3 md:flex-row">
        <div
          ref={elementRef}
          role="button"
          tabIndex={isBusy ? -1 : 0}
          className="relative aspect-video w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-[#F8FBFE] text-[#0057C2] md:w-32"
          onClick={() => {
            if (!isBusy) onViewDetails(evidence);
          }}
          onKeyDown={(event) => {
            if (isBusy) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onViewDetails(evidence);
            }
          }}
          aria-label="Xem minh chứng"
          title="Xem minh chứng"
        >
          {uploadFile.isPending ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : previewUrl && primaryFile && isImageFile(primaryFile) ? (
            <img
              src={previewUrl}
              alt={evidence.evidenceName}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : previewUrl && primaryFile && isPdfFile(primaryFile) ? (
            <iframe
              title={evidence.evidenceName}
              src={previewUrl}
              loading="lazy"
              className="pointer-events-none h-full w-full bg-white"
            />
          ) : (
            <PreviewFallback evidence={evidence} fileName={getFileName(primaryFile)} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="min-w-0">
              {renaming ? (
                <div className="flex min-w-0 gap-2">
                  <input
                    aria-label="Tên minh chứng"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoFocus
                  />
                  <AppButton size="sm" onClick={saveName} disabled={!canEdit || isBusy}>
                    {updateEvidence.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Lưu
                  </AppButton>
                </div>
              ) : (
                <h3 className="break-words text-sm font-bold leading-5 text-[var(--text-primary)] [overflow-wrap:anywhere]">
                  {PRESENTATION_SEMANTICS_V2
                    ? display.title
                    : evidence.evidenceName || "Minh chứng chưa đặt tên"}
                </h3>
              )}
              <p className="mt-1 line-clamp-1 text-xs font-medium text-[var(--text-secondary)]">
                {studentCriterionLabel[evidence.criterion]}
              </p>
            </div>
            <div>
              <StatusBadge
                tone={statusTone}
                label={
                  statusOverride?.label ??
                  (PRESENTATION_SEMANTICS_V2 ? display.statusLabel : status.label)
                }
              />
            </div>
          </div>

          {statusOverride?.message ? (
            <p className="mt-1 line-clamp-1 text-xs leading-4 text-muted-foreground">
              {statusOverride.message}
            </p>
          ) : null}

          {extractedSummary || !primaryFile ? (
            <p className="mt-1 line-clamp-1 text-xs leading-4 text-[var(--text-secondary)]">
              {extractedSummary ||
                "Chưa có tệp đính kèm. Bạn có thể bổ sung tệp để cán bộ có căn cứ xét."}
            </p>
          ) : null}

          {warnings.length ? (
            <p className="mt-1 line-clamp-1 text-xs leading-4 text-amber-700">{warnings[0]}</p>
          ) : null}

          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="min-w-0 flex-1 truncate">
              {primaryFile ? getFileName(primaryFile) : "Chưa có tệp"}
            </span>
            <span className="shrink-0">{files.length} tệp</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <AppButton size="sm" variant="secondary" onClick={() => onViewDetails(evidence)}>
              <FileText className="h-4 w-4" />
              {viewLabel}
            </AppButton>
            {canEdit ? (
              <AppButton
                size="sm"
                variant="ghost"
                onClick={() => setRenaming((current) => !current)}
                disabled={isBusy}
              >
                <Pencil className="h-4 w-4" />
                Sửa
              </AppButton>
            ) : null}
            {canEdit ? (
              <AppButton
                size="sm"
                variant="ghost"
                onClick={() => inputRef.current?.click()}
                disabled={uploadFile.isPending}
              >
                <RefreshCw className="h-4 w-4" />
                {needsFileCheckAgain ? "Thay thế tệp" : "Thay thế"}
              </AppButton>
            ) : null}
            {canEdit && onDelete ? (
              <AppButton
                size="sm"
                variant="danger"
                onClick={() => onDelete(evidence)}
                disabled={isBusy}
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </AppButton>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function mapLibraryTone(tone: EvidenceLibraryStatus["tone"]) {
  if (tone === "success") return "good" as const;
  if (tone === "error") return "danger" as const;
  return tone;
}

function PreviewFallback({ evidence, fileName }: { evidence: EvidenceResponse; fileName: string }) {
  const extension = getExtension(fileName);
  const isEvent = evidence.sourceType === "event_import";
  const Icon = isEvent ? ListChecks : extension.match(/png|jpg|jpeg|webp/) ? ImageIcon : FileText;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
      <Icon className="h-6 w-6" />
      <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase text-[#0057C2]">
        {isEvent ? "DS" : extension || "FILE"}
      </span>
    </div>
  );
}

function getExtractedSummary(evidence: EvidenceResponse) {
  const values = [
    findNestedValue(evidence, "studentName") ?? findNestedValue(evidence, "student_name"),
    findNestedValue(evidence, "organizer") ?? findNestedValue(evidence, "issuerName"),
    findNestedValue(evidence, "score") ?? findNestedValue(evidence, "gpa"),
  ]
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

  if (values.length) return values.slice(0, 3).join(" · ");
  if (typeof evidence.description === "string") return evidence.description;
  if (typeof evidence.note === "string") return evidence.note;
  return "";
}

function getEvidenceWarnings(
  evidence: EvidenceResponse,
  profile?: { fullName?: string | null; studentCode?: string | null },
) {
  const warnings: string[] = [];
  if (getProfileMismatch(evidence, profile)) {
    warnings.push("Thông tin trong minh chứng không khớp với hồ sơ hiện tại.");
  }
  if (evidence.indexingStatus === "failed") {
    warnings.push("File chưa đọc được. Vui lòng thay thế bằng bản rõ hơn.");
  }
  if (evidence.indexingStatus === "needs_manual_review") {
    warnings.push("Minh chứng cần cán bộ kiểm tra thêm.");
  }
  const rawWarnings = findNestedValue(evidence, "warnings");
  if (Array.isArray(rawWarnings)) {
    rawWarnings.slice(0, 2).forEach((item) => {
      const text = typeof item === "string" ? item : findNestedValue(item, "message");
      if (text) warnings.push(String(text));
    });
  }
  return warnings.slice(0, 2);
}

function getProfileMismatch(
  evidence: EvidenceResponse,
  profile?: { fullName?: string | null; studentCode?: string | null },
) {
  if (!profile) return false;
  const extractedName =
    findNestedValue(evidence, "studentName") ??
    findNestedValue(evidence, "student_name") ??
    findNestedValue(evidence, "fullName") ??
    findNestedValue(evidence, "full_name");
  const extractedCode =
    findNestedValue(evidence, "studentCode") ??
    findNestedValue(evidence, "student_code") ??
    findNestedValue(evidence, "mssv");

  if (
    profile.studentCode &&
    extractedCode &&
    normalizeCompare(profile.studentCode) !== normalizeCompare(String(extractedCode))
  ) {
    return true;
  }
  if (
    profile.fullName &&
    extractedName &&
    normalizeCompare(profile.fullName) !== normalizeCompare(String(extractedName))
  ) {
    return true;
  }
  return false;
}

function findNestedValue(source: unknown, key: string, depth = 0): unknown {
  if (!source || typeof source !== "object" || Array.isArray(source) || depth > 4) return undefined;
  const record = source as Record<string, unknown>;
  if (record[key] !== undefined) return record[key];

  const preferredContainers = [
    "card",
    "metadata",
    "extractedFields",
    "extractedFieldsJson",
    "extracted_fields",
    "structuredData",
    "data",
  ];
  for (const container of preferredContainers) {
    const value = findNestedValue(record[container], key, depth + 1);
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizeCompare(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getExtension(fileName: string) {
  return fileName.includes(".") ? (fileName.split(".").pop() ?? "").toUpperCase() : "";
}
