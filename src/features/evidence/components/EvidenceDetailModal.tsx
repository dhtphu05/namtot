import { useMemo, useRef, useState } from "react";
import { FilePlus2, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { useEvidenceCardPolling } from "@/hooks/useEvidenceCardPolling";
import { useJobPolling } from "@/hooks/useJobPolling";
import type { EvidenceResponse } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { getEvidenceStudentStatus } from "@/features/student/selectors/student-ui";
import {
  useEvidenceCard,
  useEvidenceDetail,
  useRetryEvidenceJob,
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import {
  canRetryEvidence,
  isTerminalEvidenceStatus,
  normalizeEvidenceCard,
  sourceTypeCopy,
} from "./evidence-card-utils";
import { EvidenceCardPanel } from "./EvidenceCardPanel";
import { EvidenceFilePreview } from "./EvidenceFilePreview";
import { formatStudentDate, studentCriterionLabel } from "./student-evidence-utils";

type EvidenceDetailModalProps = {
  evidence: EvidenceResponse | null;
  applicationId?: string;
  canEdit?: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

type DetailTab = "card" | "files";

const maxFileSize = 10 * 1024 * 1024;
const acceptedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const acceptedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export function EvidenceDetailModal({
  evidence,
  applicationId,
  canEdit = false,
  onClose,
  onChanged,
}: EvidenceDetailModalProps) {
  const [tab, setTab] = useState<DetailTab>("card");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailQuery = useEvidenceDetail(evidence?.id);
  const detail = (detailQuery.data ?? evidence) as EvidenceResponse | null;
  const activeEvidence = detail ?? evidence;
  const isEventImport = activeEvidence?.sourceType === "event_import";
  const pollingCardQuery = useEvidenceCardPolling(activeEvidence?.id, {
    enabled: Boolean(
      activeEvidence?.id &&
      !isEventImport &&
      !isTerminalEvidenceStatus(activeEvidence?.indexingStatus),
    ),
    initialIntervalMs: 2000,
    backoffAfterMs: 30000,
    backoffIntervalMs: 5000,
    slowAfterMs: 120000,
    slowIntervalMs: 10000,
    maxElapsedMs: 180000,
    stopWhen: (card) => isTerminalEvidenceStatus(card?.uxStatus?.step),
  });
  const officialCardQuery = useEvidenceCard(isEventImport ? activeEvidence?.id : undefined);
  const cardQuery = isEventImport ? officialCardQuery : pollingCardQuery;
  const card = useMemo(() => normalizeEvidenceCard(cardQuery.data), [cardQuery.data]);
  const jobId = activeEvidence?.jobId;
  const jobQuery = useJobPolling(jobId, {
    enabled: Boolean(
      jobId && !isEventImport && !isTerminalEvidenceStatus(activeEvidence?.indexingStatus),
    ),
    initialIntervalMs: 2000,
    backoffAfterMs: 30000,
    backoffIntervalMs: 5000,
    slowAfterMs: 120000,
    slowIntervalMs: 10000,
    maxElapsedMs: 180000,
  });
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const retryJob = useRetryEvidenceJob(applicationId);

  if (!evidence) return null;

  const cardError = cardQuery.error instanceof ApiError ? cardQuery.error : null;
  const canUploadMore = Boolean(canEdit && activeEvidence);
  const retryable = canRetryEvidence(activeEvidence);

  const uploadMore = async (file?: File) => {
    if (!file || !activeEvidence) return;
    const validationError = validateEvidenceFile(file);
    if (validationError) {
      toast.error(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    try {
      const uploaded = await uploadFile.mutateAsync({
        evidenceId: activeEvidence.id,
        applicationId,
        file,
      });
      if (!uploaded.res?.jobId) {
        try {
          await startIndexing.mutateAsync({ evidenceId: activeEvidence.id });
        } catch {
          toast.warning("Đã lưu file minh chứng. Hệ thống sẽ kiểm tra lại file sau.");
        }
      }
      toast.success("Đã tải file bổ sung.");
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải file bổ sung.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const retry = async () => {
    if (!activeEvidence?.jobId) return;
    await retryJob.mutateAsync({ evidenceId: activeEvidence.id, jobId: activeEvidence.jobId });
    onChanged?.();
  };

  return (
    <Dialog open={Boolean(evidence)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-h-[calc(100dvh-48px)] max-w-6xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                {activeEvidence ? (
                  <>
                    <Badge variant="outline">
                      {studentCriterionLabel[activeEvidence.criterion]}
                    </Badge>
                    <Badge variant="outline">{sourceTypeCopy[activeEvidence.sourceType]}</Badge>
                    <Badge variant="outline">
                      {getEvidenceStudentStatus(activeEvidence).label}
                    </Badge>
                  </>
                ) : null}
              </div>
              <DialogTitle className="truncate text-xl">
                {activeEvidence?.evidenceName ?? "Thẻ minh chứng"}
              </DialogTitle>
              <DialogDescription>
                Kết quả số hoá chỉ hỗ trợ kiểm tra. Cán bộ/Hội đồng sẽ xác nhận cuối cùng.
              </DialogDescription>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Đóng"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={tab === "card" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("card")}
            >
              Kết quả đọc
            </Button>
            <Button
              type="button"
              variant={tab === "files" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("files")}
            >
              File
            </Button>
            {retryable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void retry()}
                disabled={retryJob.isPending}
              >
                <RefreshCw className="h-4 w-4" />
                Thử xử lý lại
              </Button>
            ) : null}
            {canUploadMore ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={acceptedExtensions.join(",")}
                  onChange={(event) => void uploadMore(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadFile.isPending || startIndexing.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadFile.isPending || startIndexing.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus2 className="h-4 w-4" />
                  )}
                  Tải file bổ sung
                </Button>
              </>
            ) : null}
          </div>
        </DialogHeader>

        <div className="grid min-h-0 gap-0 overflow-y-auto lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="space-y-3 border-b p-5 lg:border-b-0 lg:border-r">
            {detailQuery.isLoading ? (
              <LoadingState label="Đang tải minh chứng..." />
            ) : detailQuery.isError ? (
              <ErrorState
                title="Không thể tải minh chứng"
                message={
                  detailQuery.error instanceof Error
                    ? detailQuery.error.message
                    : "Vui lòng thử lại."
                }
                onRetry={() => void detailQuery.refetch()}
              />
            ) : activeEvidence ? (
              <>
                <Info
                  label="Trạng thái xử lý"
                  value={getEvidenceStudentStatus(activeEvidence).label}
                />
                <Info label="Cập nhật" value={formatStudentDate(activeEvidence.updatedAt)} />
                <Info label="Tạo lúc" value={formatStudentDate(activeEvidence.createdAt)} />
                <div className="hidden lg:block">
                  <EvidenceFilePreview
                    evidence={activeEvidence}
                    onUploadMore={canUploadMore ? () => fileInputRef.current?.click() : undefined}
                  />
                </div>
              </>
            ) : null}
          </aside>

          <main className="p-5">
            {tab === "files" && activeEvidence ? (
              <EvidenceFilePreview
                evidence={activeEvidence}
                onUploadMore={canUploadMore ? () => fileInputRef.current?.click() : undefined}
              />
            ) : null}

            {tab === "card" && activeEvidence ? (
              cardQuery.isLoading && !card ? (
                <LoadingState label="Đang tải thẻ minh chứng..." />
              ) : cardQuery.isError ? (
                <ErrorState
                  title="Không thể tải thẻ minh chứng"
                  message={cardError?.message ?? "Vui lòng thử lại sau."}
                  requestId={cardError?.meta?.requestId}
                  onRetry={() => void cardQuery.refetch()}
                />
              ) : (
                <EvidenceCardPanel
                  evidence={activeEvidence}
                  card={card}
                  job={jobQuery.data}
                  requestId={cardError?.meta?.requestId}
                  onRetry={retryable ? () => void retry() : undefined}
                  retrying={retryJob.isPending}
                />
              )
            ) : null}
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function validateEvidenceFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const validType = acceptedMimeTypes.includes(file.type) || acceptedExtensions.includes(extension);
  if (!validType) return "Tệp không đúng định dạng. Vui lòng tải PDF, PNG, JPG, JPEG hoặc WEBP.";
  if (file.size > maxFileSize)
    return "Tệp vượt quá dung lượng cho phép. Vui lòng chọn file tối đa 10MB.";
  return "";
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md border bg-background p-3 text-sm">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value || "--"}</div>
    </div>
  );
}
