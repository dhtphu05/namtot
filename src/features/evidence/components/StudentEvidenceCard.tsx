import { useRef, useState } from "react";
import { Eye, FileText, Loader2, Pencil, RefreshCw, Trash2, Upload } from "lucide-react";
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
  const [previewLoading, setPreviewLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEvidence = useUpdateEvidence();
  const uploadFile = useUploadEvidenceFile(applicationId);
  const files = getEvidenceFiles(evidence);
  const primaryFile = getPrimaryFile(evidence);
  const isBusy = updateEvidence.isPending || uploadFile.isPending || previewLoading;

  const saveName = async () => {
    const evidenceName = name.trim();
    if (evidenceName.length < 3) {
      toast.error("Tên minh chứng cần ít nhất 3 ký tự.");
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
      toast.error("Minh chứng này chưa có file để xem.");
      return;
    }
    try {
      setPreviewLoading(true);
      const res = await evidenceApi.getSignedFileUrl(primaryFile.id);
      const url = res.data?.url;
      if (!url) throw new Error("Không lấy được đường dẫn xem file.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở file minh chứng.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const replaceFile = async (file: File | undefined) => {
    if (!file) return;
    await uploadFile.mutateAsync({ evidenceId: evidence.id, applicationId, file });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="rounded-lg border border-[#E3ECF6] bg-white p-4 shadow-sm transition-colors hover:border-[#B8CEE8]">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(event) => replaceFile(event.target.files?.[0])}
        disabled={!canEdit || uploadFile.isPending}
      />

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F1F7FD] text-[#0057C2]">
          {uploadFile.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
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
            Đã tải lên: <b>{getFileName(primaryFile)}</b>
            <span className="ml-2 text-xs text-muted-foreground">({files.length} file)</span>
          </div>
        ) : (
          <div className="text-amber-800">Chưa có file tài liệu</div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onViewDetails(evidence)}>
          <Eye className="h-4 w-4" /> Xem chi tiết
        </Button>
        {primaryFile ? (
          <Button size="sm" variant="outline" onClick={previewFile} disabled={previewLoading}>
            {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Xem file
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={!canEdit || uploadFile.isPending}>
            <Upload className="h-4 w-4" /> Tải file lên
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setRenaming((current) => !current)} disabled={!canEdit || isBusy}>
          <Pencil className="h-4 w-4" /> Đổi tên
        </Button>
        <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()} disabled={!canEdit || uploadFile.isPending}>
          <RefreshCw className="h-4 w-4" /> Thay file
        </Button>
        {onDelete && (
          <Button size="sm" variant="danger" onClick={() => onDelete(evidence)} disabled={!canEdit || isBusy}>
            <Trash2 className="h-4 w-4" /> Xóa
          </Button>
        )}
      </div>
    </div>
  );
}

