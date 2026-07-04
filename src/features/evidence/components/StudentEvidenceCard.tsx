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

export function StudentEvidenceCard({
  evidence,
  applicationId,
  canEdit = true,
  onViewDetails,
  onDelete,
}: {
  evidence: EvidenceResponse;
  applicationId: string;
  canEdit?: boolean;
  onViewDetails: (evidence: EvidenceResponse) => void;
  onDelete?: (evidence: EvidenceResponse) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(evidence.evidenceName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEvidence = useUpdateEvidence();
  const uploadFile = useUploadEvidenceFile(applicationId);
  const files = getEvidenceFiles(evidence);
  const primaryFile = getPrimaryFile(evidence);
  const issuerLabel = (evidence as EvidenceResponse & { issuerName?: string | null; issuingUnit?: string | null }).issuerName
    ?? (evidence as EvidenceResponse & { issuerName?: string | null; issuingUnit?: string | null }).issuingUnit
    ?? "Chưa ghi nhận";
  const isBusy = updateEvidence.isPending || uploadFile.isPending || previewLoading;

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
    await updateEvidence.mutateAsync({
      evidenceId: evidence.id,
      applicationId,
      data: { evidenceName },
    });
    setRenaming(false);
  };

  const previewFile = async () => {
    if (!primaryFile?.id) {
      toast.error("Tài liệu này chưa có tệp để xem.");
      return;
    }
    try {
      setPreviewLoading(true);
      const res = await evidenceApi.getSignedFileUrl(primaryFile.id);
      const url = res.data?.url;
      if (!url) throw new Error("Không lấy được đường dẫn xem tệp.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở tệp đính kèm.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const replaceFile = async (file: File | undefined) => {
    if (!file) return;
    await uploadFile.mutateAsync({ evidenceId: evidence.id, applicationId, file });
    if (inputRef.current) inputRef.current.value = "";
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
              Chưa có tệp đính kèm. Tải giấy xác nhận lên để hồ sơ được kiểm tra.
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
    <div className="rounded-lg border border-[#E3ECF6] bg-white p-4 shadow-sm transition-colors hover:border-[#B8CEE8]">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(event) => replaceFile(event.target.files?.[0])}
        disabled={!canEdit || uploadFile.isPending}
      />

      <div className="flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#DCE7F2] bg-[#F1F7FD] text-[#0057C2]">
          {uploadFile.isPending ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : previewUrl && isImageFile(primaryFile) ? (
            <img src={previewUrl} alt={evidence.evidenceName} className="h-full w-full object-cover" />
          ) : previewUrl && isPdfFile(primaryFile) ? (
            <iframe src={previewUrl} title={evidence.evidenceName} className="h-full w-full border-0 bg-white" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
          )}
        </div>
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
            <button
              className="block max-w-full truncate text-left text-sm font-bold text-brand-deep hover:text-[#0057C2]"
              onClick={() => onViewDetails(evidence)}
            >
              {evidence.evidenceName}
            </button>
          )}

          <div className="mt-1 text-xs text-muted-foreground">
            {studentCriterionLabel[evidence.criterion]} • {formatStudentDate(evidence.createdAt)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Đơn vị cấp: {issuerLabel}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="muted">{sourceTypeLabel[evidence.sourceType]}</Chip>
            <Chip tone={evidence.status === "accepted" ? "success" : evidence.status === "rejected" ? "error" : "warning"}>
              {evidenceStatusLabel[evidence.status]}
            </Chip>
            <Chip tone={evidence.indexingStatus === "indexed" ? "success" : evidence.indexingStatus === "failed" ? "error" : "brand"}>
              {indexingStatusLabel[evidence.indexingStatus]}
            </Chip>
          </div>
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
          <Button size="sm" variant="outline" onClick={previewFile} disabled={previewLoading}>
            {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Xem lớn
          </Button>
        ) : null}
        {canEdit ? (
        <Button size="sm" variant="ghost" onClick={() => setRenaming((current) => !current)} disabled={isBusy}>
          <Pencil className="h-4 w-4" /> Đổi tên
        </Button>
        ) : null}
        {canEdit ? (
        <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()} disabled={uploadFile.isPending}>
          <RefreshCw className="h-4 w-4" /> Đổi tệp
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
