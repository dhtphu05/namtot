import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, Chip } from "@/components/ui-kit";
import { evidenceApi } from "@/features/evidence/api/evidence";
import { useUpdateEvidence, useUploadEvidenceFile } from "@/features/evidence/hooks/useEvidence";
import type { EvidenceResponse } from "@/lib/api/types";
import {
  evidenceStatusLabel,
  formatStudentDate,
  getEvidenceFiles,
  getFileName,
  getPrimaryFile,
  indexingStatusLabel,
  isImageFile,
  isPdfFile,
  sourceTypeLabel,
  studentCriterionLabel,
} from "./student-evidence-utils";

const maxFileSize = 10 * 1024 * 1024;
const acceptedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const acceptedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export function StudentEvidenceCard({
  evidence,
  applicationId,
  canEdit = true,
  profile,
  onViewDetails,
  onDelete,
}: {
  evidence: EvidenceResponse;
  applicationId: string;
  canEdit?: boolean;
  profile?: { fullName?: string | null; studentCode?: string | null };
  onViewDetails: (evidence: EvidenceResponse) => void;
  onDelete?: (evidence: EvidenceResponse) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(evidence.evidenceName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEvidence = useUpdateEvidence();
  const uploadFile = useUploadEvidenceFile(applicationId);
  const files = getEvidenceFiles(evidence);
  const primaryFile = getPrimaryFile(evidence);
  const issuerLabel = (evidence as EvidenceResponse & { issuerName?: string | null; issuingUnit?: string | null }).issuerName
    ?? (evidence as EvidenceResponse & { issuerName?: string | null; issuingUnit?: string | null }).issuingUnit
    ?? "Chưa ghi nhận";
  const isBusy = updateEvidence.isPending || uploadFile.isPending;
  const needsFileCheckAgain = evidence.indexingStatus === "failed" || evidence.indexingStatus === "needs_manual_review";
  const extractedRows = getStudentExtractedRows(evidence, issuerLabel);
  const profileMismatch = getProfileMismatch(evidence, profile);
  const readableStatus = getReadableEvidenceStatus(evidence);

  useEffect(() => {
    let active = true;
    setPreviewUrl(null);
    if (!primaryFile?.id) return;

    evidenceApi
      .getSignedFileUrl(primaryFile.id)
      .then((res) => {
        if (active) setPreviewUrl(res.data?.url ?? null);
      })
      .catch(() => {
        if (active) setPreviewUrl(null);
      });

    return () => {
      active = false;
    };
  }, [primaryFile?.id]);

  const saveName = async () => {
    const evidenceName = name.trim();
    if (evidenceName.length < 3) {
      toast.error("Tên tài liệu cần ít nhất 3 ký tự.");
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
      toast.error(error instanceof Error ? error.message : "Không thể lưu minh chứng. Vui lòng thử lại.");
    }
  };

  const replaceFile = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validateEvidenceFile(file);
    if (validationError) {
      toast.error(validationError);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    try {
      await uploadFile.mutateAsync({ evidenceId: evidence.id, applicationId, file });
      toast.success("Đã lưu tệp minh chứng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu tệp minh chứng. Vui lòng thử lại.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!primaryFile) {
    return (
      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(event) => replaceFile(event.target.files?.[0])}
          disabled={!canEdit || uploadFile.isPending}
        />
        <div className="flex items-start gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700">
            {uploadFile.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-brand-deep">{evidence.evidenceName || "Tài liệu chưa đặt tên"}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {studentCriterionLabel[evidence.criterion]} • {formatStudentDate(evidence.createdAt)}
            </div>
            <div className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-amber-900">
              Chưa có tệp đính kèm. Bạn vẫn có thể lưu thông tin trước và bổ sung tệp sau.
            </div>
            {canEdit ? (
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploadFile.isPending}>
                {uploadFile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Tải tệp lên
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#E3ECF6] bg-white p-3 shadow-sm transition-colors hover:border-[#B8CEE8]">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(event) => replaceFile(event.target.files?.[0])}
        disabled={!canEdit || uploadFile.isPending}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1fr)]">
        <button
          type="button"
          className="group relative min-h-[260px] w-full overflow-hidden rounded-xl border border-[#DCE7F2] bg-white text-[#0057C2] transition-colors hover:border-[#0057C2]"
          onClick={() => onViewDetails(evidence)}
          disabled={uploadFile.isPending}
          title="Xem minh chứng kích thước lớn"
        >
          {uploadFile.isPending ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : previewUrl && isImageFile(primaryFile) ? (
            <img src={previewUrl} alt={evidence.evidenceName} className="h-full max-h-[360px] min-h-[260px] w-full object-contain p-2" />
          ) : previewUrl && isPdfFile(primaryFile) ? (
            <iframe src={previewUrl} title={evidence.evidenceName} className="h-[320px] w-full border-0 bg-white" />
          ) : (
            <div className="flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-3 bg-[#F8FBFE] px-4 text-center">
              <FileText className="h-6 w-6" />
              <span className="text-sm font-semibold">Mở xem minh chứng</span>
              <span className="text-xs text-slate-500">{getFileName(primaryFile)}</span>
            </div>
          )}
          {!uploadFile.isPending ? (
            <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#0057C2] shadow-sm ring-1 ring-[#DCE7F2]">
              Xem lớn
            </span>
          ) : null}
        </button>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-[#DCE7F2] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0057C2]/20"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
              <Button size="sm" onClick={saveName} disabled={!canEdit || updateEvidence.isPending}>
                {updateEvidence.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Lưu
              </Button>
            </div>
          ) : (
            <div className="block max-w-full truncate text-left text-sm font-bold text-brand-deep">
              {evidence.evidenceName}
            </div>
          )}

          <div className="mt-1 text-xs text-muted-foreground">
            {studentCriterionLabel[evidence.criterion]} • {formatStudentDate(evidence.createdAt)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Đơn vị cấp: {issuerLabel}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="muted">Nguồn: {sourceTypeLabel[evidence.sourceType]}</Chip>
            <Chip tone={evidence.status === "accepted" ? "success" : evidence.status === "rejected" ? "error" : "warning"}>
              {evidenceStatusLabel[evidence.status]}
            </Chip>
            <Chip tone={readableStatus.tone}>
              {readableStatus.label}
            </Chip>
          </div>
          {profileMismatch ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Thông tin trong minh chứng không khớp với hồ sơ hiện tại.
            </div>
          ) : null}
          {extractedRows.length > 0 ? (
            <div className="mt-3 rounded-lg bg-[#F8FBFE] px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Thông tin trích xuất</div>
              <div className="mt-2 grid gap-1.5 text-sm">
                {extractedRows.slice(0, 4).map((row) => (
                  <div key={row.label} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{row.label}</span>
                    <b className="min-w-0 truncate text-right text-brand-deep">{row.value}</b>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-[#F6F9FC] px-3 py-2 text-sm">
        {primaryFile ? (
          <div className="text-brand-deep">
            Tệp đính kèm: <b>{getFileName(primaryFile)}</b>
            <span className="ml-2 text-xs text-muted-foreground">({files.length} tệp)</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {primaryFile ? (
          <Button size="sm" variant="outline" onClick={() => onViewDetails(evidence)}>
            <FileText className="h-4 w-4" />
            Xem lớn
          </Button>
        ) : null}
        {canEdit ? (
        <Button size="sm" variant="ghost" onClick={() => setRenaming((current) => !current)} disabled={isBusy}>
          <Pencil className="h-4 w-4" /> Sửa
        </Button>
        ) : null}
        {canEdit ? (
        <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()} disabled={uploadFile.isPending}>
          <RefreshCw className="h-4 w-4" /> {needsFileCheckAgain ? "Kiểm tra lại file" : "Đổi tệp"}
        </Button>
        ) : null}
        {canEdit && onDelete && (
          <Button size="sm" variant="danger" onClick={() => onDelete(evidence)} disabled={isBusy}>
            <Trash2 className="h-4 w-4" /> Xóa
          </Button>
        )}
      </div>
    </div>
  );
}

function validateEvidenceFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const validType = acceptedMimeTypes.includes(file.type) || acceptedExtensions.includes(extension);
  if (!validType) return "Tệp không đúng định dạng. Vui lòng tải PDF, PNG, JPG, JPEG hoặc WEBP.";
  if (file.size > maxFileSize) return "Tệp vượt quá dung lượng cho phép. Vui lòng chọn file tối đa 10MB.";
  return "";
}

function getReadableEvidenceStatus(evidence: EvidenceResponse) {
  if (evidence.indexingStatus === "indexed") {
    return { label: "Đã đọc được minh chứng", tone: "success" as const };
  }
  if (evidence.indexingStatus === "failed" || evidence.indexingStatus === "needs_manual_review") {
    return { label: "Cần cán bộ kiểm tra thêm", tone: "warning" as const };
  }
  return { label: indexingStatusLabel[evidence.indexingStatus] ?? "Đã ghi nhận", tone: "brand" as const };
}

function getStudentExtractedRows(evidence: EvidenceResponse, issuerLabel: string) {
  const getValue = (keys: string[]) => {
    for (const key of keys) {
      const value = findNestedValue(evidence, key);
      if (value !== undefined && value !== null && value !== "") return String(value);
    }
    return "";
  };

  return [
    { label: "Họ tên", value: getValue(["studentName", "student_name", "fullName", "full_name"]) },
    { label: "MSSV", value: getValue(["studentCode", "student_code", "mssv"]) },
    { label: "Điểm/GPA", value: getValue(["gpa", "score", "convertedValue", "converted_value"]) },
    { label: "Đơn vị cấp", value: issuerLabel !== "Chưa ghi nhận" ? issuerLabel : getValue(["organizer", "organizerName", "issuerName", "issuingUnit"]) },
  ].filter((row) => row.value);
}

function getProfileMismatch(
  evidence: EvidenceResponse,
  profile?: { fullName?: string | null; studentCode?: string | null },
) {
  if (!profile) return false;
  const extractedName = findNestedValue(evidence, "studentName")
    ?? findNestedValue(evidence, "student_name")
    ?? findNestedValue(evidence, "fullName")
    ?? findNestedValue(evidence, "full_name");
  const extractedCode = findNestedValue(evidence, "studentCode")
    ?? findNestedValue(evidence, "student_code")
    ?? findNestedValue(evidence, "mssv");

  if (profile.studentCode && extractedCode && normalizeCompare(profile.studentCode) !== normalizeCompare(String(extractedCode))) {
    return true;
  }
  if (profile.fullName && extractedName && normalizeCompare(profile.fullName) !== normalizeCompare(String(extractedName))) {
    return true;
  }
  return false;
}

function findNestedValue(source: unknown, key: string, depth = 0): unknown {
  if (!source || typeof source !== "object" || Array.isArray(source) || depth > 4) return undefined;
  const record = source as Record<string, unknown>;
  if (record[key] !== undefined) return record[key];

  const preferredContainers = ["card", "metadata", "extractedFields", "extractedFieldsJson", "extracted_fields", "structuredData", "data"];
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
