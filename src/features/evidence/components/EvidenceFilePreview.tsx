import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignedFileUrl } from "@/features/evidence/hooks/useEvidence";
import type { EvidenceResponse } from "@/lib/api/types";
import {
  formatFileSize,
  formatStudentDate,
  getEvidenceFiles,
  getFileName,
  getFileSize,
  isImageFile,
  isPdfFile,
} from "./student-evidence-utils";

type EvidenceFilePreviewProps = {
  evidence: EvidenceResponse;
  onUploadMore?: () => void;
};

export function EvidenceFilePreview({ evidence, onUploadMore }: EvidenceFilePreviewProps) {
  const files = useMemo(() => getEvidenceFiles(evidence), [evidence]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const fileKey = useCallback((file: (typeof files)[number]) => file.id ?? getFileName(file), []);
  const selectedFile = files.find((file) => fileKey(file) === selectedKey) ?? files[0] ?? null;
  const directUrl = selectedFile?.signedUrl ?? selectedFile?.url ?? selectedFile?.publicUrl ?? null;
  const signedUrlQuery = useSignedFileUrl(
    selectedFile?.id,
    Boolean(selectedFile?.id && !directUrl),
  );
  const previewUrl = directUrl ?? signedUrlQuery.data ?? null;

  useEffect(() => {
    if (selectedKey && files.some((file) => fileKey(file) === selectedKey)) return;
    setSelectedKey(files[0] ? fileKey(files[0]) : null);
  }, [fileKey, files, selectedKey]);

  if (!files.length) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center">
        <FileText className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 font-medium text-foreground">Chưa có tệp trong minh chứng này.</p>
        {onUploadMore ? (
          <Button type="button" variant="outline" className="mt-4" onClick={onUploadMore}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tải tệp bổ sung
          </Button>
        ) : null}
      </div>
    );
  }

  const fileDate = selectedFile?.uploadedAt ?? selectedFile?.createdAt ?? evidence.createdAt;

  return (
    <section aria-label="Tài liệu đã tải" className="flex min-h-[28rem] flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-background p-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="break-all font-medium text-foreground">{getFileName(selectedFile)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatFileSize(getFileSize(selectedFile))} · {formatStudentDate(fileDate)}
            </p>
          </div>
        </div>
        {previewUrl ? (
          <Button asChild type="button" variant="outline" size="sm" className="shrink-0">
            <a href={previewUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Mở bản gốc
            </a>
          </Button>
        ) : null}
      </div>

      {files.length > 1 ? (
        <div className="flex flex-wrap gap-2" aria-label="Chọn tệp minh chứng">
          {files.map((file) => {
            const key = fileKey(file);
            const selected = fileKey(selectedFile!) === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                title={getFileName(file)}
                onClick={() => setSelectedKey(key)}
                className={`max-w-full rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className="block max-w-64 truncate">{getFileName(file)}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="relative flex min-h-[22rem] flex-1 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
        {signedUrlQuery.isFetching ? (
          <div
            role="status"
            className="flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground"
          >
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            Đang tải bản xem trước…
          </div>
        ) : signedUrlQuery.isError ? (
          <div role="alert" className="max-w-sm p-6 text-center">
            <p className="font-medium text-foreground">Không thể tải bản xem trước.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tài liệu gốc vẫn được giữ trong hồ sơ. Bạn có thể thử tải lại bản xem trước.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void signedUrlQuery.refetch()}
            >
              Thử lại
            </Button>
          </div>
        ) : !previewUrl ? (
          <div className="max-w-sm p-6 text-center text-sm text-muted-foreground">
            Chưa có đường dẫn xem tài liệu. Vui lòng thử lại sau.
          </div>
        ) : isImageFile(selectedFile) ? (
          <img
            src={previewUrl}
            alt={`Bản xem trước: ${getFileName(selectedFile)}`}
            className="h-full max-h-[min(68vh,760px)] w-full object-contain"
            decoding="async"
          />
        ) : isPdfFile(selectedFile) ? (
          <iframe
            title={`Bản xem trước: ${getFileName(selectedFile)}`}
            src={previewUrl}
            className="h-[min(68vh,760px)] min-h-[22rem] w-full bg-background"
          />
        ) : (
          <div className="max-w-sm p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium text-foreground">Không thể hiển thị bản xem trước.</p>
            <p className="mt-1 text-sm text-muted-foreground">
            Mở bản gốc để xem tệp bằng ứng dụng phù hợp.
            </p>
          </div>
        )}
      </div>

      {onUploadMore ? (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onUploadMore}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Tải tệp bổ sung
          </Button>
        </div>
      ) : null}
    </section>
  );
}
