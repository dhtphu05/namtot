import { useMemo, useRef, useState } from "react";
import { FilePlus2, Loader2, X } from "lucide-react";
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
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { useEvidenceCardPolling } from "@/hooks/useEvidenceCardPolling";
import { useJobPolling } from "@/hooks/useJobPolling";
import type { EvidenceResponse } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import {
  useEvidenceCard,
  useEvidenceDetail,
  useConfirmEvidenceCard,
  useRetryEvidenceJob,
  useSaveEvidenceCardCorrections,
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
  initialMode?: "confirm" | "view";
  onClose: () => void;
  onChanged?: () => void;
};

export function EvidenceDetailModal({
  evidence,
  applicationId,
  canEdit = false,
  initialMode = "view",
  onClose,
  onChanged,
}: EvidenceDetailModalProps) {
  const [hasUnsavedCardChanges, setHasUnsavedCardChanges] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailQuery = useEvidenceDetail(evidence?.id);
  const detail = (detailQuery.data ?? evidence) as EvidenceResponse | null;
  const activeEvidence = detail ?? evidence;
  const isEventImport = activeEvidence?.sourceType === "event_import";
  const canMutateEvidence = Boolean(
    canEdit &&
    activeEvidence &&
    !["accepted", "rejected", "resolution_needed"].includes(activeEvidence.status),
  );
  const shouldPollCard = Boolean(
    activeEvidence?.id &&
    !isEventImport &&
    !isTerminalEvidenceStatus(activeEvidence?.indexingStatus),
  );
  const pollingCardQuery = useEvidenceCardPolling(activeEvidence?.id, {
    enabled: shouldPollCard,
    initialIntervalMs: 2000,
    backoffAfterMs: 20000,
    backoffIntervalMs: 5000,
    maxElapsedMs: 180000,
    stopWhen: (card) =>
      isTerminalEvidenceStatus(card?.uxStatus?.step) ||
      isTerminalStudentStatus(card?.studentStatus?.code),
  });
  const officialCardQuery = useEvidenceCard(isEventImport ? activeEvidence?.id : undefined);
  const settledCardQuery = useEvidenceCard(
    activeEvidence?.id && !isEventImport && !shouldPollCard ? activeEvidence.id : undefined,
  );
  const cardQuery = isEventImport
    ? officialCardQuery
    : shouldPollCard
      ? pollingCardQuery
      : settledCardQuery;
  const card = useMemo(() => normalizeEvidenceCard(cardQuery.data), [cardQuery.data]);
  const polledEvidence = (card as { evidence?: EvidenceResponse | null } | null)?.evidence;
  const renderedEvidence = polledEvidence ?? activeEvidence;
  const canMutateCard = Boolean(
    canMutateEvidence &&
    renderedEvidence &&
    !isEventImport &&
    !["accepted", "rejected", "resolution_needed"].includes(renderedEvidence.status),
  );
  const jobId = activeEvidence?.jobId;
  const jobQuery = useJobPolling(jobId, {
    enabled: Boolean(
      jobId &&
      canMutateEvidence &&
      !isEventImport &&
      (!isTerminalEvidenceStatus(activeEvidence?.indexingStatus) ||
        activeEvidence?.indexingStatus === "failed"),
    ),
    initialIntervalMs: 2000,
    backoffAfterMs: 20000,
    backoffIntervalMs: 5000,
    maxElapsedMs: 180000,
  });
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const retryJob = useRetryEvidenceJob(applicationId);
  const saveCorrections = useSaveEvidenceCardCorrections(applicationId);
  const confirmCard = useConfirmEvidenceCard(applicationId);

  if (!evidence) return null;

  const cardError = cardQuery.error instanceof ApiError ? cardQuery.error : null;
  const canUploadMore = canMutateEvidence;
  const retryable = Boolean(
    canMutateEvidence &&
    canRetryEvidence(activeEvidence) &&
    jobQuery.data?.status === "failed" &&
    jobQuery.data.retryable === true,
  );

  const uploadMore = async (file?: File) => {
    if (!canMutateEvidence || !file || !activeEvidence) return;
    try {
      const uploaded = await uploadFile.mutateAsync({
        evidenceId: activeEvidence.id,
        applicationId,
        file,
      });
      if (!uploaded.res?.jobId) {
        await startIndexing.mutateAsync({ evidenceId: activeEvidence.id });
      }
      toast.success("Đã nhận file bổ sung. Hệ thống đang đọc nhanh file.");
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải file bổ sung.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const retry = async () => {
    if (
      !canMutateEvidence ||
      !canRetryEvidence(activeEvidence) ||
      jobQuery.data?.status !== "failed" ||
      jobQuery.data.retryable !== true ||
      !activeEvidence?.jobId
    ) {
      return;
    }
    await retryJob.mutateAsync({ evidenceId: activeEvidence.id, jobId: activeEvidence.jobId });
    onChanged?.();
  };

  const requestClose = () => {
    if (hasUnsavedCardChanges) {
      setConfirmCloseOpen(true);
      return;
    }
    closeWithoutSaving();
  };

  const closeWithoutSaving = () => {
    setHasUnsavedCardChanges(false);
    setConfirmCloseOpen(false);
    onClose();
  };

  const saveCardCorrections = async (
    fields: Record<string, unknown>,
    expectedUpdatedAt?: string,
  ) => {
    if (!activeEvidence) return;
    await saveCorrections.mutateAsync({
      evidenceId: activeEvidence.id,
      fields,
      expectedUpdatedAt,
    });
    setHasUnsavedCardChanges(false);
    onChanged?.();
  };

  const confirmEvidenceCard = async (expectedUpdatedAt?: string) => {
    if (!activeEvidence) return;
    await confirmCard.mutateAsync({
      evidenceId: activeEvidence.id,
      expectedUpdatedAt,
    });
    setHasUnsavedCardChanges(false);
    onChanged?.();
  };

  return (
    <Dialog open={Boolean(evidence)} onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-2rem)] max-w-[1440px] flex-col overflow-hidden p-0 [&>button:last-child]:hidden">
        <DialogHeader className="shrink-0 border-b px-4 py-4 md:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Minh chứng hồ sơ Sinh viên 5 tốt cấp Thành phố
              </p>
              <div className="mb-2 flex flex-wrap gap-2">
                {activeEvidence ? (
                  <>
                    <Badge variant="outline">
                      {studentCriterionLabel[activeEvidence.criterion] ?? "Chưa rõ tiêu chí"}
                    </Badge>
                    <Badge variant="outline">
                      {sourceTypeCopy[activeEvidence.sourceType] ?? "Nguồn minh chứng"}
                    </Badge>
                  </>
                ) : null}
              </div>
              <DialogTitle className="break-words text-xl leading-tight">
                {activeEvidence?.evidenceName ?? "Minh chứng"}
              </DialogTitle>
              <DialogDescription>
                Đối chiếu tài liệu với thông tin nhận diện được trước khi xác nhận.
              </DialogDescription>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-v2-focus-ring)]"
              aria-label="Đóng"
              onClick={requestClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canUploadMore ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  aria-label="Chọn file bổ sung"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => void uploadMore(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
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

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.9fr)] lg:overflow-hidden">
          <section className="min-w-0 border-b p-4 md:p-6 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-semibold text-foreground">Tài liệu đã tải</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cập nhật {formatStudentDate(activeEvidence?.updatedAt)}
                </p>
              </div>
              {detailQuery.isFetching ? (
                <span className="text-xs text-muted-foreground">Đang làm mới…</span>
              ) : null}
            </div>
            {detailQuery.isError ? (
              <div className="mb-4">
                <ErrorState
                  title="Không thể làm mới thông tin minh chứng"
                  message="Đang hiển thị thông tin đã có. Bạn có thể thử tải lại."
                  onRetry={() => void detailQuery.refetch()}
                />
              </div>
            ) : null}
            {activeEvidence ? (
              <EvidenceFilePreview evidence={activeEvidence} />
            ) : detailQuery.isLoading ? (
              <LoadingState label="Đang tải minh chứng…" />
            ) : null}
            {activeEvidence ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Info label="Ngày tải lên" value={formatStudentDate(activeEvidence.createdAt)} />
                <Info
                  label="Cập nhật gần nhất"
                  value={formatStudentDate(activeEvidence.updatedAt)}
                />
              </div>
            ) : null}
          </section>

          <main
            aria-label="Thông tin minh chứng"
            className="min-w-0 p-4 md:p-6 lg:min-h-0 lg:overflow-y-auto"
          >
            {cardQuery.isError ? (
              <div className="mb-4">
                <ErrorState
                  title="Không thể tải thông tin nhận diện"
                  message="Bạn vẫn có thể xem tài liệu. Hãy thử tải lại phần thông tin."
                  requestId={cardError?.meta?.requestId}
                  onRetry={() => void cardQuery.refetch()}
                />
              </div>
            ) : null}
            {activeEvidence ? (
              <EvidenceCardPanel
                evidence={renderedEvidence ?? activeEvidence}
                card={card}
                loadingCard={cardQuery.isLoading && !card}
                onRetry={retryable ? () => void retry() : undefined}
                retrying={retryJob.isPending}
                confirmationMode={initialMode === "confirm"}
                onSaveCorrections={canMutateCard ? saveCardCorrections : undefined}
                savingCorrections={saveCorrections.isPending}
                onConfirm={canMutateCard ? confirmEvidenceCard : undefined}
                confirming={confirmCard.isPending}
                onDirtyChange={setHasUnsavedCardChanges}
              />
            ) : null}
          </main>
        </div>
      </DialogContent>
      <ConfirmDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        title="Bỏ thay đổi chưa lưu?"
        description="Các chỉnh sửa bạn vừa nhập sẽ không được lưu nếu đóng cửa sổ này."
        impact="Bạn có thể tiếp tục chỉnh sửa hoặc xác nhận bỏ các thay đổi."
        confirmLabel="Bỏ thay đổi"
        destructive
        onConfirm={closeWithoutSaving}
      />
    </Dialog>
  );
}

function isTerminalStudentStatus(status?: string | null) {
  return [
    "evidence_read",
    "needs_more_info",
    "needs_human_verification",
    "unreadable_file",
    "recorded_waiting_review",
  ].includes(status ?? "");
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium text-foreground">
        {value || "Chưa có dữ liệu"}
      </div>
    </div>
  );
}
