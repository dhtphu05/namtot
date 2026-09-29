import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileUp, Loader2, Play, RefreshCw, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { ProgressBadges } from "@/components/status/ProgressBadges";
import { StatusBadge } from "@/components/status/StatusBadge";
import { UxStatusCard } from "@/components/status/UxStatusCard";
import { useAuth } from "@/features/auth/store/auth-store";
import { useDecisionImportPolling } from "@/hooks/useDecisionImportPolling";
import type { Role } from "@/lib/api/types";
import type { DecisionImport, DecisionImportStatus } from "@/types/decision-import";
import {
  decisionImportKeys,
  useCancelDecisionImport,
  useConfirmDecisionImport,
  useDecisionImport,
  useDecisionImportMetadata,
  useDecisionImportPreview,
  useDecisionImportTables,
  useStartDecisionImport,
  useUpdateDecisionColumnMapping,
  useUploadDecisionImportFile,
} from "@/features/decision-import/hooks/useDecisionImports";
import { isActiveDecisionImportStatus } from "@/types/decision-import";
import { useQueryClient } from "@tanstack/react-query";
import { ColumnMappingDrawer } from "./ColumnMappingDrawer";
import { ConfirmDecisionImportModal } from "./ConfirmDecisionImportModal";
import { DecisionImportAuditButton } from "./DecisionImportAuditButton";
import { DecisionImportStepper } from "./DecisionImportStepper";
import { DecisionMetadataPanel } from "./DecisionMetadataPanel";
import { RosterPreviewSummary } from "./RosterPreviewSummary";
import { RosterPreviewTable } from "./RosterPreviewTable";
import {
  compactFacts,
  fallbackDecisionUxStatus,
  formatConvertedValue,
  formatCriterion,
  formatEventDateRange,
  formatLevel,
  getDecisionDisplayTitle,
  getDecisionErrorMessage,
  isPresentDisplayValue,
} from "./decision-import-utils";

type DecisionImportDetailProps = {
  importId: string;
};

const allowedRoles: Role[] = ["officer", "manager", "committee", "admin"];

export function DecisionImportDetail({ importId }: DecisionImportDetailProps) {
  const role = useAuth((state) => state.user?.role);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const detail = useDecisionImport(importId);
  const item = detail.data;
  const polling = useDecisionImportPolling(importId, {
    enabled: Boolean(item?.status && isActiveDecisionImportStatus(item.status)),
    queryKey: decisionImportKeys.status(importId),
  });
  const activeItem = (polling.data ?? item) as DecisionImport | null;
  const status = activeItem?.status;
  const metadata = useDecisionImportMetadata(importId, shouldLoadMetadata(status));
  const tables = useDecisionImportTables(importId, shouldLoadTables(status));
  const preview = useDecisionImportPreview(importId, shouldLoadPreview(status));
  const uploadFile = useUploadDecisionImportFile(importId);
  const startImport = useStartDecisionImport(importId);
  const cancelImport = useCancelDecisionImport(importId);
  const updateMapping = useUpdateDecisionColumnMapping(importId);
  const confirmImport = useConfirmDecisionImport(importId);
  const uxStatus = fallbackDecisionUxStatus(activeItem);

  useEffect(() => {
    if (polling.data?.status === "preview_ready") {
      queryClient.invalidateQueries({ queryKey: decisionImportKeys.detail(importId) });
      queryClient.invalidateQueries({ queryKey: decisionImportKeys.metadata(importId) });
      queryClient.invalidateQueries({ queryKey: decisionImportKeys.preview(importId) });
      queryClient.invalidateQueries({ queryKey: decisionImportKeys.audit(importId) });
    }
  }, [importId, polling.data?.status, queryClient]);

  const detectedColumns = useMemo(() => {
    const previewColumns = preview.data?.detectedColumns ?? [];
    const tableColumns = tables.data?.flatMap((table) => table.columns) ?? [];
    return Array.from(new Set([...previewColumns, ...tableColumns])).filter(Boolean);
  }, [preview.data?.detectedColumns, tables.data]);
  const hasMappingWarnings = useMemo(
    () =>
      Boolean(
        preview.data?.rows.some(
          (row) =>
            row.validationStatus === "missing_student_code" ||
            row.validationWarnings.some((warning) =>
              ["missing_student_code", "missing_student_name", "row_parse_uncertain"].includes(
                warning,
              ),
            ),
        ),
      ),
    [preview.data?.rows],
  );

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar title="Import quyết định" subtitle="Kiểm tra và xác nhận danh sách chính thức." />
        <ErrorState
          title="Bạn không có quyền truy cập"
          message="Chỉ cán bộ, quản lý hoặc quản trị viên mới có thể import quyết định."
        />
      </>
    );
  }

  if (detail.isLoading) return <LoadingState label="Đang tải phiên import..." />;

  if (detail.isError) {
    return (
      <>
        <TopBar title="Import quyết định" subtitle="Kiểm tra và xác nhận danh sách chính thức." />
        <ErrorState
          title="Không thể tải phiên import"
          message={getDecisionErrorMessage(detail.error)}
          onRetry={() => void detail.refetch()}
        />
      </>
    );
  }

  if (!activeItem) {
    return (
      <>
        <TopBar title="Import quyết định" subtitle="Kiểm tra và xác nhận danh sách chính thức." />
        <EmptyState title="Không tìm thấy phiên import." />
      </>
    );
  }

  const hasFile = Boolean(activeItem.sourceFileId || activeItem.fileStatus || activeItem.fileName);
  const canUpload = activeItem.status === "draft" || activeItem.status === "failed";
  const canStart =
    activeItem.status === "uploaded" ||
    activeItem.status === "failed" ||
    (activeItem.status === "draft" && hasFile);
  const canCancel = isActiveDecisionImportStatus(activeItem.status);
  const canConfirm = activeItem.status === "preview_ready";
  const processing = isActiveDecisionImportStatus(activeItem.status);
  const displayTitle = getDecisionDisplayTitle(activeItem);
  const eventDateRange = formatEventDateRange(activeItem.startDate, activeItem.endDate);
  const subtitleParts = [activeItem.organizer, eventDateRange].filter(isPresentDisplayValue);
  const previewSummaryFacts = preview.data
    ? compactFacts([
        { label: "Tổng dòng", value: preview.data.summary.totalRows },
        { label: "Hợp lệ", value: preview.data.summary.validRows },
        ...(preview.data.summary.duplicateRows > 0
          ? [{ label: "Trùng MSSV", value: preview.data.summary.duplicateRows }]
          : []),
        ...(preview.data.summary.invalidRows > 0
          ? [{ label: "Không hợp lệ", value: preview.data.summary.invalidRows }]
          : []),
      ])
    : [];
  const detailFacts = compactFacts([
    { label: "Cấp tổ chức", value: formatLevel(activeItem.organizerLevel) },
    {
      label: "Giá trị quy đổi",
      value: formatConvertedValue(activeItem.convertedValue, activeItem.convertedUnit),
    },
    { label: "File nguồn", value: activeItem.fileName },
    {
      label: "Event sau xác nhận",
      value: activeItem.eventId ? `#${activeItem.eventId.slice(0, 8)}` : null,
    },
  ]);
  const canOpenMapping = detectedColumns.length > 0 || hasMappingWarnings;

  const upload = async (file?: File) => {
    if (!file) return;
    await uploadFile.mutateAsync(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <TopBar
        title={displayTitle}
        subtitle="Kiểm tra danh sách chính thức trước khi lưu vào kho minh chứng SV5T."
        action={
          <Button asChild variant="outline">
            <Link to="/app/decision-imports">
              <ArrowLeft className="h-4 w-4" />
              Danh sách import
            </Link>
          </Button>
        }
      />

      <div className="space-y-5">
        <section className="rounded-md border bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap gap-2">
                {formatCriterion(activeItem.criterion) ? (
                  <Badge variant="outline">{formatCriterion(activeItem.criterion)}</Badge>
                ) : null}
                {formatLevel(activeItem.organizerLevel) ? (
                  <Badge variant="outline">{formatLevel(activeItem.organizerLevel)}</Badge>
                ) : null}
                <StatusBadge domain="decisionImport" status={activeItem.status} compact />
                {activeItem.fileStatus ? (
                  <Badge variant="outline">File: {activeItem.fileStatus}</Badge>
                ) : null}
              </div>
              <h1 className="text-xl font-bold text-brand-deep">{displayTitle}</h1>
              {subtitleParts.length ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {subtitleParts.map(String).join(" · ")}
                </p>
              ) : null}
              {previewSummaryFacts.length ? (
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {previewSummaryFacts.map((fact) => (
                    <Info key={fact.label} label={fact.label} value={fact.value} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canUpload ? (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => void upload(event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadFile.isPending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadFile.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="h-4 w-4" />
                    )}
                    Tải tài liệu
                  </Button>
                </>
              ) : null}
              {canStart ? (
                <Button
                  type="button"
                  disabled={startImport.isPending}
                  onClick={() => void startImport.mutateAsync()}
                >
                  {startImport.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {activeItem.status === "failed" ? "Thử lại" : "Đọc danh sách sinh viên"}
                </Button>
              ) : null}
              {canCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={cancelImport.isPending}
                  onClick={() => void cancelImport.mutateAsync()}
                >
                  <XCircle className="h-4 w-4" />
                  Hủy xử lý
                </Button>
              ) : null}
              {canConfirm ? (
                <Button type="button" onClick={() => setConfirmOpen(true)}>
                  <CheckCircle2 className="h-4 w-4" />
                  Xác nhận danh sách
                </Button>
              ) : null}
              <DecisionImportAuditButton importId={importId} />
            </div>
          </div>

          <div className="mt-4">
            <UxStatusCard status={uxStatus} />
          </div>

          {uxStatus?.badges?.length ? (
            <div className="mt-3">
              <ProgressBadges badges={uxStatus.badges} />
            </div>
          ) : null}

          {processing ? (
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              {typeof activeItem.processedPages === "number" ||
              typeof activeItem.remainingPages === "number"
                ? `Đã xử lý ${activeItem.processedPages ?? 0} trang, còn ${activeItem.remainingPages ?? 0} trang.`
                : "Đang xử lý. File nhiều trang có thể mất vài phút."}{" "}
              Bạn có thể rời trang và quay lại sau.
            </div>
          ) : null}
        </section>

        <DecisionImportStepper status={activeItem.status} />

        {detailFacts.length ? (
          <section className="grid gap-3 rounded-md border bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {detailFacts.map((fact) => (
              <Info key={fact.label} label={fact.label} value={fact.value} />
            ))}
          </section>
        ) : null}

        {activeItem.status === "confirmed" ? (
          <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="font-semibold">Đã lưu vào kho minh chứng chính thức</div>
            <p className="mt-1 text-sm">
              {typeof activeItem.participantCount === "number"
                ? `Đã lưu ${activeItem.participantCount} sinh viên.`
                : "Danh sách đã được xác nhận vào kho minh chứng SV5T."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild variant="outline" className="bg-white">
                <Link to="/app/event-registry">Xem kho sự kiện</Link>
              </Button>
              {activeItem.eventId ? (
                <Button asChild variant="outline" className="bg-white">
                  <Link to="/app/event-registry">Xem danh sách sinh viên</Link>
                </Button>
              ) : null}
              <DecisionImportAuditButton importId={importId} />
            </div>
          </section>
        ) : null}

        <DecisionMetadataPanel
          metadata={metadata.data}
          isLoading={metadata.isLoading}
          isError={metadata.isError}
          errorMessage={metadata.error instanceof Error ? metadata.error.message : undefined}
          onRetry={() => void metadata.refetch()}
        />

        {preview.isLoading ? <LoadingState label="Đang tải preview danh sách..." /> : null}
        {preview.isError ? (
          <ErrorState
            title="Không thể tải preview"
            message={getDecisionErrorMessage(preview.error)}
            onRetry={() => void preview.refetch()}
          />
        ) : null}
        {preview.data ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Preview danh sách</h2>
              {canOpenMapping ? (
                <Button type="button" variant="outline" onClick={() => setMappingOpen(true)}>
                  <RefreshCw className="h-4 w-4" />
                  Chỉnh cột danh sách
                </Button>
              ) : null}
            </div>
            <RosterPreviewSummary summary={preview.data.summary} />
            <RosterPreviewTable rows={preview.data.rows} />
          </div>
        ) : activeItem.status === "preview_ready" || activeItem.status === "confirmed" ? (
          <EmptyState
            title="Chưa có preview danh sách"
            description="Backend chưa trả dòng preview nào cho phiên import này."
          />
        ) : null}
      </div>

      <ColumnMappingDrawer
        open={mappingOpen}
        columns={detectedColumns}
        mapping={preview.data?.columnMapping}
        isSubmitting={updateMapping.isPending}
        onOpenChange={setMappingOpen}
        onSubmit={(mapping) => {
          updateMapping.mutate(mapping, {
            onSuccess: () => {
              setMappingOpen(false);
              void preview.refetch();
            },
          });
        }}
      />

      <ConfirmDecisionImportModal
        open={confirmOpen}
        item={activeItem}
        metadata={metadata.data}
        preview={preview.data}
        isSubmitting={confirmImport.isPending}
        onOpenChange={setConfirmOpen}
        onConfirm={(input) => {
          confirmImport.mutate(input, {
            onSuccess: () => {
              setConfirmOpen(false);
            },
          });
        }}
      />
    </>
  );
}

function shouldLoadMetadata(status?: DecisionImportStatus | null) {
  return Boolean(status && status !== "draft" && status !== "uploaded" && status !== "cancelled");
}

function shouldLoadTables(status?: DecisionImportStatus | null) {
  return Boolean(
    status &&
    ["ocr_processing", "tables_ready", "parsing_roster", "preview_ready", "confirmed"].includes(
      status,
    ),
  );
}

function shouldLoadPreview(status?: DecisionImportStatus | null) {
  return Boolean(status && ["preview_ready", "confirmed"].includes(status));
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  if (!isPresentDisplayValue(value)) return null;

  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}
