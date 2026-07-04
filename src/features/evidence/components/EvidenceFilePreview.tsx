import { useState } from "react";
import { ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { evidenceApi } from "@/features/evidence/api/evidence";
import type { EvidenceResponse } from "@/lib/api/types";
import {
  formatFileSize,
  formatStudentDate,
  getEvidenceFiles,
  getFileName,
  getFileSize,
  isImageFile,
  isPdfFile,
  type StudentEvidenceFile,
} from "./student-evidence-utils";

type EvidenceFilePreviewProps = {
  evidence: EvidenceResponse;
  onUploadMore?: () => void;
};

export function EvidenceFilePreview({ evidence, onUploadMore }: EvidenceFilePreviewProps) {
  const files = getEvidenceFiles(evidence);
  const [selectedFile, setSelectedFile] = useState<StudentEvidenceFile | null>(files[0] ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const loadPreview = async (file: StudentEvidenceFile, openInNewTab = false) => {
    if (!file.id) return;
    try {
      setLoadingUrl(true);
      const response = await evidenceApi.getSignedFileUrl(file.id);
      const url = response.data?.url;
      if (!url) throw new Error("Không lấy được đường dẫn xem file.");
      setSelectedFile(file);
      setPreviewUrl(url);
      if (openInNewTab) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở file minh chứng.");
    } finally {
      setLoadingUrl(false);
    }
  };

  if (!files.length) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Chưa có file minh chứng.
        {onUploadMore ? (
          <div className="mt-3">
            <Button type="button" size="sm" onClick={onUploadMore}>
              Tải file bổ sung
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id ?? getFileName(file)}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{getFileName(file)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatFileSize(getFileSize(file))} •{" "}
                {formatStudentDate(file.uploadedAt ?? file.createdAt)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loadingUrl}
                onClick={() => void loadPreview(file)}
              >
                {loadingUrl && selectedFile?.id === file.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Xem file
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loadingUrl}
                onClick={() => void loadPreview(file, true)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {onUploadMore ? (
        <Button type="button" variant="outline" size="sm" onClick={onUploadMore}>
          <RefreshCw className="h-4 w-4" />
          Tải file bổ sung
        </Button>
      ) : null}

      {previewUrl && selectedFile ? (
        <div className="overflow-hidden rounded-md border bg-muted/30">
          {isImageFile(selectedFile) ? (
            <img
              src={previewUrl}
              alt={getFileName(selectedFile)}
              className="max-h-[460px] w-full object-contain"
            />
          ) : isPdfFile(selectedFile) ? (
            <iframe
              title={getFileName(selectedFile)}
              src={previewUrl}
              className="h-[460px] w-full"
            />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              Trình duyệt không hỗ trợ preview loại file này. Hãy mở trong tab mới.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
