import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  FileCheck2,
  PencilLine,
  RefreshCw,
  Save,
  Undo2,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { AwardNextAction } from "@/features/award-registry/components/AwardNextAction";
import { AwardConfirmationPanel } from "@/features/award-registry/components/AwardConfirmationPanel";
import { AwardRosterReviewTable } from "@/features/award-registry/components/AwardRosterReviewTable";
import { AwardRosterValidationSummary } from "@/features/award-registry/components/AwardRosterValidationSummary";
import { AwardSourceFilePanel } from "@/features/award-registry/components/AwardSourceFilePanel";
import { AwardWorkflowProgress } from "@/features/award-registry/components/AwardWorkflowProgress";
import {
  awardPreviewFilterOptions,
  getAwardDecisionTitle,
  getAwardMatchPresentation,
  getAwardRowPresentation,
} from "@/features/award-registry/presentation";
import type {
  AwardDecisionStatus,
  AwardRecipientMatchStatus,
  AwardRosterMapping,
  AwardRosterPreviewFilter,
  AwardRosterPreviewRow,
  AwardRosterRowCorrection,
  AwardRosterRowStatus,
} from "@/types/award-registry";
import {
  useAwardDecision,
  useAwardRecipients,
  useAwardRosterPreview,
  useAwardRosterProcessing,
  useAwardWorkspaceNames,
  useArchiveAwardDecision,
  useConfirmAwardDecision,
  useProcessAwardRoster,
  useUpdateAwardDecision,
  useUpdateAwardRosterMapping,
  useUpdateAwardRosterRow,
  useRevertAwardRosterRowCorrection,
  useUnarchiveAwardDecision,
  useUploadAwardFile,
} from "@/features/award-registry/hooks/useAwardRegistry";
import { errorMessage } from "@/features/award-registry/utils/errors";

const PAGE_LIMIT = 20;
const VALID_DECISION_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const VALID_ROSTER_EXTENSIONS = [".csv", ".xlsx", ".pdf"];

export function AwardDecisionDetail({ decisionId }: { decisionId: string }) {
  const decisionQuery = useAwardDecision(decisionId);
  const decision = decisionQuery.data;
  const isDraft = decision?.status === "DRAFT";
  const processing = useAwardRosterProcessing(decisionId, Boolean(decision?.rosterFile));
  const [previewPage, setPreviewPage] = useState(1);
  const [previewFilter, setPreviewFilter] = useState<AwardRosterPreviewFilter>("all");
  const [recipientPage, setRecipientPage] = useState(1);
  const preview = useAwardRosterPreview(
    decisionId,
    previewPage,
    previewFilter,
    Boolean(isDraft && processing.data?.status === "preview_ready"),
  );
  const recipients = useAwardRecipients(
    decisionId,
    recipientPage,
    decision?.status === "CONFIRMED",
  );
  const workspaces = useAwardWorkspaceNames(
    decision?.awardLevel === "UNIVERSITY_SYSTEM" && processing.data?.status === "preview_ready",
  );
  const update = useUpdateAwardDecision(decisionId);
  const upload = useUploadAwardFile(decisionId);
  const startProcessing = useProcessAwardRoster(decisionId);
  const updateMapping = useUpdateAwardRosterMapping(decisionId);
  const updateRosterRow = useUpdateAwardRosterRow(decisionId);
  const revertRosterRow = useRevertAwardRosterRowCorrection(decisionId);
  const confirm = useConfirmAwardDecision(decisionId);
  const archive = useArchiveAwardDecision(decisionId);
  const unarchive = useUnarchiveAwardDecision(decisionId);
  const [schoolYear, setSchoolYear] = useState("");
  const [decisionNumber, setDecisionNumber] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [mapping, setMapping] = useState<AwardRosterMapping | null>(null);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const institutionNameById = useMemo(
    () =>
      new Map(
        (workspaces.data ?? []).map((workspace) => [
          workspace.id,
          workspace.shortName ? `${workspace.name} (${workspace.shortName})` : workspace.name,
        ]),
      ),
    [workspaces.data],
  );

  useEffect(() => {
    if (!decision) return;
    setSchoolYear(decision.schoolYear);
    setDecisionNumber(decision.decisionNumber ?? "");
    setDecisionDate(decision.decisionDate?.slice(0, 10) ?? "");
  }, [decision]);

  useEffect(() => {
    if (preview.data) setMapping(preview.data.mapping ?? preview.data.suggestedMapping);
  }, [preview.data]);

  if (decisionQuery.isLoading) return <LoadingState label="Đang tải quyết định..." />;
  if (decisionQuery.isError || !decision) {
    return (
      <ErrorState
        title="Không thể mở quyết định"
        message={
          decisionQuery.error ? errorMessage(decisionQuery.error) : "Không tìm thấy quyết định."
        }
        onRetry={() => void decisionQuery.refetch()}
      />
    );
  }

  const validRows = preview.data?.validationSummary.valid ?? 0;
  const blockingRows =
    (preview.data?.validationSummary.invalid ?? 0) +
    (preview.data?.validationSummary.duplicate ?? 0) +
    (preview.data?.validationSummary.conflict ?? 0);
  const canConfirm = Boolean(
    isDraft && validRows > 0 && blockingRows === 0 && processing.data?.status === "preview_ready",
  );
  const reviewReady = isDraft && processing.data?.status === "preview_ready";
  const primaryWorkReady = reviewReady || decision.status === "CONFIRMED";
  const metadataDirty =
    schoolYear.trim() !== decision.schoolYear ||
    decisionNumber.trim() !== (decision.decisionNumber ?? "") ||
    decisionDate !== (decision.decisionDate?.slice(0, 10) ?? "");

  const saveMetadata = () => {
    const payload = {
      schoolYear: schoolYear.trim(),
      decisionNumber: decisionNumber.trim() || null,
      decisionDate: decisionDate || null,
    };
    void update.mutateAsync(payload);
  };

  const handleUpload = (kind: "decision" | "roster", input: HTMLInputElement) => {
    const file = input.files?.[0];
    if (!file) return;
    const extension = extensionOf(file.name);
    const allowed = kind === "decision" ? VALID_DECISION_EXTENSIONS : VALID_ROSTER_EXTENSIONS;
    if (kind === "roster" && extension === ".xls") {
      setMappingError("Tệp .xls cũ không được hỗ trợ. Hãy lưu lại thành .xlsx hoặc .csv.");
      input.value = "";
      return;
    }
    if (!allowed.includes(extension)) {
      setMappingError(
        kind === "roster"
          ? "Danh sách chỉ nhận CSV, XLSX hoặc PDF."
          : "Văn bản quyết định chỉ nhận PDF, JPG, PNG hoặc WEBP.",
      );
      input.value = "";
      return;
    }
    setMappingError(null);
    upload.mutate({ kind, file });
    input.value = "";
  };

  return (
    <>
      <TopBar
        title={getAwardDecisionTitle(decision.decisionNumber)}
        subtitle={`${decision.awardLevel === "SCHOOL" ? `${decision.issuerWorkspace.name} · Cấp trường` : decision.issuerWorkspace.name} · Năm học ${decision.schoolYear.replace("-", "–")}`}
        action={
          <Link
            to="/app/award-registry"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Danh sách
          </Link>
        }
      />

      <AwardWorkflowProgress decision={decision} processing={processing.data} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section
          data-testid={primaryWorkReady ? "award-workspace-rail" : "award-workspace-main"}
          className={`min-w-0 space-y-4 ${primaryWorkReady ? "order-2" : "order-1"}`}
        >
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Thông tin quyết định</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Cập nhật lần cuối {formatDate(decision.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {decision.status === "ARCHIVED" ? (
                  <AlertDialog key="unarchive">
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={unarchive.isPending}
                      >
                        <ArchiveRestore aria-hidden="true" /> Khôi phục
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Khôi phục quyết định?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Quyết định sẽ được khôi phục về trạng thái trước khi lưu trữ. Nếu quyết
                          định đã được xác nhận, hiệu lực eligibility sẽ được khôi phục.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Để sau</AlertDialogCancel>
                        <AlertDialogAction onClick={() => unarchive.mutate()}>
                          Khôi phục quyết định
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <AlertDialog key="archive">
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" disabled={archive.isPending}>
                        <Archive aria-hidden="true" /> Lưu trữ
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Lưu trữ quyết định?</AlertDialogTitle>
                        <AlertDialogDescription
                          className={
                            decision.status === "CONFIRMED"
                              ? "rounded-md border border-amber-300 bg-amber-50 p-3 font-semibold text-amber-950"
                              : undefined
                          }
                        >
                          Quyết định lưu trữ sẽ không còn được dùng để xác định điều kiện nộp hồ sơ
                          cấp Thành phố. Dữ liệu quyết định và danh sách sinh viên vẫn được giữ lại.
                        </AlertDialogDescription>
                        {decision.status === "CONFIRMED" && (
                          <p className="rounded-md bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-950">
                            Quyết định đã xác nhận này đang có hiệu lực eligibility. Lưu trữ sẽ tắt
                            hiệu lực đó cho các lần nộp hồ sơ mới.
                          </p>
                        )}
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Không lưu trữ</AlertDialogCancel>
                        <AlertDialogAction onClick={() => archive.mutate()}>
                          Xác nhận lưu trữ
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <DecisionBadge status={decision.status} />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Năm học
                <Input
                  aria-label="Năm học quyết định"
                  value={schoolYear}
                  disabled={!isDraft}
                  onChange={(event) => setSchoolYear(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Số quyết định
                <Input
                  aria-label="Số quyết định"
                  value={decisionNumber}
                  disabled={!isDraft}
                  onChange={(event) => setDecisionNumber(event.target.value)}
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-700">
                Ngày quyết định
                <Input
                  aria-label="Ngày quyết định"
                  type="date"
                  value={decisionDate}
                  disabled={!isDraft}
                  onChange={(event) => setDecisionDate(event.target.value)}
                />
              </label>
              <div className="space-y-1 text-xs font-medium text-slate-700">
                <span>Số sinh viên</span>
                <p className="flex h-9 items-center rounded-md bg-slate-50 px-3 text-sm text-slate-800">
                  {decision.recipientCount}
                </p>
              </div>
            </div>
            {isDraft && (
              <Button
                type="button"
                className="mt-3"
                variant="outline"
                onClick={saveMetadata}
                disabled={update.isPending || !metadataDirty || !schoolYear.trim()}
              >
                <Save aria-hidden="true" />
                {update.isPending ? "Đang lưu..." : "Lưu thông tin"}
              </Button>
            )}
            {update.isError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {errorMessage(update.error)}
              </p>
            )}
            {(archive.isError || unarchive.isError) && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {errorMessage(archive.isError ? archive.error : unarchive.error)}
              </p>
            )}
          </Card>

          <AwardSourceFilePanel
            decisionFile={decision.decisionFile}
            rosterFile={decision.rosterFile}
            layout={primaryWorkReady ? "stacked" : "split"}
            disabled={!isDraft || upload.isPending}
            uploadPending={upload.isPending}
            error={upload.isError ? errorMessage(upload.error) : mappingError}
            onSelect={(kind, input) => handleUpload(kind, input)}
          />

          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Đọc và kiểm tra danh sách</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Hệ thống đọc danh sách bất đồng bộ rồi trả lại kết quả để bạn kiểm tra.
                </p>
              </div>
              <ProcessingBadge status={processing.data?.status ?? "not_started"} />
            </div>
            {processing.isError && (
              <p role="alert" className="mt-3 text-sm text-red-800">
                {errorMessage(processing.error)}
              </p>
            )}
            {processing.data?.status === "failed" && (
              <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                {processingError(processing.data.errorCode)}{" "}
                <span className="font-mono text-xs">({processing.data.errorCode})</span>
              </p>
            )}
            {processing.data?.status === "processing" && (
              <p role="status" className="mt-3 text-sm text-blue-800">
                Đang đọc danh sách sinh viên. Hệ thống tự làm mới trong tối đa 2 phút; nếu chưa
                xong, bạn có thể kiểm tra lại thủ công.
              </p>
            )}
            <AwardNextAction
              title={
                !decision.rosterFile
                  ? "Tải danh sách sinh viên"
                  : processing.data?.status === "processing"
                    ? "Chờ hệ thống đọc danh sách"
                    : processing.data?.status === "failed"
                      ? "Xử lý lại danh sách"
                      : processing.data?.status === "preview_ready"
                        ? "Mở Kiểm tra dữ liệu"
                        : "Bắt đầu đọc danh sách"
              }
              description={
                !decision.rosterFile
                  ? "Tải tệp CSV, XLSX hoặc PDF để bắt đầu."
                  : processing.data?.status === "processing"
                    ? "Hệ thống đang đọc danh sách; kết quả sẽ xuất hiện sau khi hoàn tất."
                    : processing.data?.status === "failed"
                      ? "Kiểm tra lại tệp hoặc thử lại thao tác đọc danh sách."
                      : processing.data?.status === "preview_ready"
                        ? "Danh sách đã sẵn sàng để kiểm tra và xử lý các dòng có vấn đề."
                        : "Hệ thống sẽ đọc và đối chiếu danh sách với dữ liệu đơn vị."
              }
              action={
                <div className="flex flex-wrap gap-2">
                  {isDraft &&
                    decision.rosterFile &&
                    (processing.data?.status === "not_started" || !processing.data) && (
                      <Button
                        type="button"
                        onClick={() => startProcessing.mutate()}
                        disabled={startProcessing.isPending}
                      >
                        <FileCheck2 aria-hidden="true" />
                        {startProcessing.isPending ? "Đang bắt đầu..." : "Đọc danh sách"}
                      </Button>
                    )}
                  {isDraft && decision.rosterFile && processing.data?.status === "processing" && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={processing.isFetching}
                      onClick={() => void processing.refetch()}
                    >
                      <RefreshCw aria-hidden="true" /> Làm mới trạng thái
                    </Button>
                  )}
                  {isDraft && processing.data?.status === "failed" && processing.data.retryable && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startProcessing.mutate()}
                      disabled={startProcessing.isPending}
                    >
                      Thử lại
                    </Button>
                  )}
                </div>
              }
            />
            {startProcessing.isError && (
              <p role="alert" className="mt-3 text-sm text-red-800">
                {errorMessage(startProcessing.error)}
              </p>
            )}
            {updateMapping.isError && (
              <p role="alert" className="mt-3 text-sm text-red-800">
                {errorMessage(updateMapping.error)}
              </p>
            )}
          </Card>
        </section>

        <section
          data-testid={primaryWorkReady ? "award-workspace-main" : "award-workspace-rail"}
          className={`min-w-0 space-y-4 ${primaryWorkReady ? "order-1" : "order-2"}`}
        >
          {reviewReady && (
            <PreviewPanel
              preview={preview.data}
              loading={preview.isLoading}
              error={preview.error ? errorMessage(preview.error) : null}
              mapping={mapping}
              saving={updateMapping.isPending}
              mappingError={mappingError}
              page={previewPage}
              onPage={setPreviewPage}
              filter={previewFilter}
              onFilter={(filter) => {
                setPreviewFilter(filter);
                setPreviewPage(1);
              }}
              onMappingChange={setMapping}
              onSaveMapping={() => mapping && updateMapping.mutate(mapping)}
              onUpdateRow={(sourceRow, correction) =>
                updateRosterRow.mutateAsync({ sourceRow, correction })
              }
              onRevertRow={(sourceRow) => revertRosterRow.mutateAsync(sourceRow)}
              rowMutationPending={updateRosterRow.isPending || revertRosterRow.isPending}
              onRefresh={() => void preview.refetch()}
              institutionNameById={institutionNameById}
            />
          )}
          {isDraft && processing.data?.status === "preview_ready" && (
            <AwardConfirmationPanel
              canConfirm={canConfirm}
              validRows={validRows}
              blockingRows={blockingRows}
              pending={confirm.isPending}
              error={confirm.isError ? errorMessage(confirm.error) : null}
              onConfirm={() => confirm.mutate()}
            />
          )}

          {decision.status === "CONFIRMED" && (
            <RecipientPanel
              recipients={recipients.data?.items ?? []}
              loading={recipients.isLoading}
              error={recipients.error ? errorMessage(recipients.error) : null}
              page={recipientPage}
              pageCount={recipients.data?.pagination?.totalPages ?? 1}
              onPage={setRecipientPage}
            />
          )}

          {decision.status === "ARCHIVED" && (
            <Card className="border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Quyết định đã lưu trữ</h2>
              <p className="mt-1 text-sm text-slate-600">
                Dữ liệu quyết định và danh sách sinh viên vẫn được giữ lại. Quyết định chưa có hiệu
                lực eligibility cho đến khi được khôi phục.
              </p>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}

function PreviewPanel({
  preview,
  loading,
  error,
  mapping,
  saving,
  mappingError,
  page,
  onPage,
  filter,
  onFilter,
  onMappingChange,
  onSaveMapping,
  onUpdateRow,
  onRevertRow,
  rowMutationPending,
  onRefresh,
  institutionNameById,
}: {
  preview: Awaited<ReturnType<typeof useAwardRosterPreview>>["data"];
  loading: boolean;
  error: string | null;
  mapping: AwardRosterMapping | null;
  saving: boolean;
  mappingError: string | null;
  page: number;
  onPage: (page: number) => void;
  filter: AwardRosterPreviewFilter;
  onFilter: (filter: AwardRosterPreviewFilter) => void;
  onMappingChange: (mapping: AwardRosterMapping) => void;
  onSaveMapping: () => void;
  onUpdateRow: (sourceRow: number, correction: AwardRosterRowCorrection) => Promise<unknown>;
  onRevertRow: (sourceRow: number) => Promise<unknown>;
  rowMutationPending: boolean;
  onRefresh: () => void;
  institutionNameById: Map<string, string>;
}) {
  if (loading)
    return (
      <Card className="p-4">
        <LoadingState label="Đang tải bản xem trước..." />
      </Card>
    );
  if (error)
    return (
      <Card className="p-4">
        <ErrorState title="Không thể tải bản xem trước" message={error} onRetry={onRefresh} />
      </Card>
    );
  if (!preview) return null;
  const selectColumn = (field: keyof AwardRosterMapping, value: string) => {
    const next = { ...(mapping ?? preview.suggestedMapping) };
    if (value) next[field] = value;
    else delete next[field];
    onMappingChange(next);
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Kiểm tra dữ liệu</h2>
          <p className="mt-1 text-xs text-slate-600">
            Tìm và xử lý nhanh những dòng cần xem lại trước khi xác nhận dữ liệu công nhận.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" /> Làm mới
        </Button>
      </div>
      <div className="mt-4">
        <AwardRosterValidationSummary summary={preview.validationSummary} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MappingSelect
          label="Cột mã sinh viên *"
          field="studentCode"
          mapping={mapping}
          columns={preview.columns}
          onChange={selectColumn}
        />
        <MappingSelect
          label="Cột họ tên"
          field="fullName"
          mapping={mapping}
          columns={preview.columns}
          onChange={selectColumn}
        />
        <MappingSelect
          label="Cột lớp (không bắt buộc)"
          field="className"
          mapping={mapping}
          columns={preview.columns}
          onChange={selectColumn}
          optional
        />
        <MappingSelect
          label="Cột trường (không bắt buộc với School)"
          field="institution"
          mapping={mapping}
          columns={preview.columns}
          onChange={selectColumn}
          optional
        />
      </div>
      <Button
        type="button"
        className="mt-3"
        variant="outline"
        onClick={onSaveMapping}
        disabled={!mapping || saving}
      >
        <Save aria-hidden="true" />
        {saving ? "Đang lưu mapping..." : "Cập nhật mapping"}
      </Button>
      {mappingError && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {mappingError}
        </p>
      )}
      <label className="mt-4 inline-flex flex-col gap-1 text-xs font-medium text-slate-700">
        <span>Lọc dòng cần xử lý</span>
        <select
          aria-label="Lọc dòng cần xử lý"
          className="h-9 min-w-64 rounded-md border border-slate-200 bg-white px-2 text-sm"
          value={filter}
          onChange={(event) => onFilter(event.target.value as AwardRosterPreviewFilter)}
        >
          {awardPreviewFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <AwardRosterReviewTable
        rows={preview.items}
        renderRow={(row) => (
          <tr key={row.sourceRow} className="border-t border-slate-100 align-top">
            <td className="px-3 py-2">{row.sourceRow}</td>
            <td className="px-3 py-2 font-mono">
              <OriginalAndCurrent
                value={row.studentCode}
                original={row.original?.studentCode ?? row.studentCode}
              />
            </td>
            <td className="px-3 py-2">
              <OriginalAndCurrent
                value={row.fullName}
                original={row.original?.fullName ?? row.fullName}
              />
            </td>
            <td className="px-3 py-2">
              <OriginalAndCurrent
                value={row.className}
                original={row.original?.className ?? row.className}
              />
            </td>
            <td className="px-3 py-2">
              <OriginalAndCurrent
                value={row.institutionText}
                original={row.original?.institutionText ?? row.institutionText}
              />
              {row.institutionWorkspaceId && (
                <div className="mt-1 text-[11px] text-slate-500">
                  {institutionNameById.get(row.institutionWorkspaceId) || "Đã đối chiếu đơn vị"}
                </div>
              )}
              {row.status === "CONFLICT" && (
                <div className="mt-1 text-[11px] text-amber-800">Chưa resolve được đơn vị</div>
              )}
            </td>
            <td className="px-3 py-2">
              <MatchBadge status={row.matchStatus} />
            </td>
            <td className="px-3 py-2">
              <RowStatus status={row.status} matchStatus={row.matchStatus} errors={row.errors} />
              <p className="mt-1 text-[11px] text-slate-600">
                {rowStatusExplanation(row.status, row.matchStatus)}
              </p>
              {row.isCorrected && (
                <span className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                  Đã chỉnh thủ công
                </span>
              )}
              {row.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-red-800">
                  {row.errors.map((issue) => (
                    <li key={issue}>{rowErrorLabel(issue)}</li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <RosterRowEditor row={row} disabled={rowMutationPending} onSave={onUpdateRow} />
                {row.isCorrected && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Hoàn tác sửa dòng ${row.sourceRow}`}
                    disabled={rowMutationPending}
                    onClick={() => void onRevertRow(row.sourceRow)}
                  >
                    <Undo2 aria-hidden="true" /> Hoàn tác
                  </Button>
                )}
              </div>
            </td>
          </tr>
        )}
      />
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-600">
        <span>
          Trang {preview.pagination.page} / {Math.max(1, preview.pagination.totalPages)} ·{" "}
          {preview.pagination.total} dòng
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Trước
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= preview.pagination.totalPages}
            onClick={() => onPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      </div>
    </Card>
  );
}

function OriginalAndCurrent({
  value,
  original,
}: {
  value: string | null;
  original: string | null;
}) {
  const display = (text: string | null) => text || "—";
  return (
    <div className="space-y-1">
      <div>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Đang dùng</span>
        <div>{display(value)}</div>
      </div>
      <div className="text-[11px] text-slate-500">Giá trị từ tài liệu gốc: {display(original)}</div>
    </div>
  );
}

function RosterRowEditor({
  row,
  disabled,
  onSave,
}: {
  row: AwardRosterPreviewRow;
  disabled: boolean;
  onSave: (sourceRow: number, correction: AwardRosterRowCorrection) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [studentCode, setStudentCode] = useState(row.studentCode ?? "");
  const [fullName, setFullName] = useState(row.fullName ?? "");
  const [className, setClassName] = useState(row.className ?? "");
  const [institutionText, setInstitutionText] = useState(row.institutionText ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

  const openEditor = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setSaveError(null);
    if (nextOpen) {
      setStudentCode(row.studentCode ?? "");
      setFullName(row.fullName ?? "");
      setClassName(row.className ?? "");
      setInstitutionText(row.institutionText ?? "");
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const correction: AwardRosterRowCorrection = {};
    if (studentCode !== (row.studentCode ?? "")) correction.studentCode = studentCode;
    if (fullName !== (row.fullName ?? "")) correction.fullName = fullName;
    if (className !== (row.className ?? "")) correction.className = className.trim() || null;
    if (institutionText !== (row.institutionText ?? "")) {
      correction.institutionText = institutionText.trim() || null;
    }
    if (Object.keys(correction).length === 0) {
      setOpen(false);
      return;
    }
    try {
      await onSave(row.sourceRow, correction);
      setOpen(false);
    } catch (error) {
      setSaveError(errorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={openEditor}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Sửa dòng ${row.sourceRow}`}
          disabled={disabled}
        >
          <PencilLine aria-hidden="true" /> Sửa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kiểm tra và sửa dòng {row.sourceRow}</DialogTitle>
          <p className="text-sm text-slate-600">
            Giá trị từ tài liệu gốc được giữ nguyên. Giá trị bạn lưu sẽ được kiểm tra lại về đơn vị,
            sinh viên và dòng trùng.
          </p>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(event) => void save(event)}>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>MSSV dòng {row.sourceRow}</span>
            <Input value={studentCode} onChange={(event) => setStudentCode(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Họ tên dòng {row.sourceRow}</span>
            <Input value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Lớp dòng {row.sourceRow}</span>
            <Input value={className} onChange={(event) => setClassName(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            <span>Trường trong roster dòng {row.sourceRow}</span>
            <Input
              value={institutionText}
              onChange={(event) => setInstitutionText(event.target.value)}
            />
          </label>
          {saveError && (
            <p role="alert" className="text-sm text-red-700">
              {saveError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => openEditor(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={disabled}>
              {disabled ? "Đang lưu..." : "Lưu chỉnh sửa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function rowStatusExplanation(
  status: AwardRosterRowStatus,
  matchStatus: AwardRecipientMatchStatus,
) {
  return getAwardRowPresentation({ status, matchStatus, errors: [] }).description;
}

function MappingSelect({
  label,
  field,
  mapping,
  columns,
  onChange,
  optional = false,
}: {
  label: string;
  field: keyof AwardRosterMapping;
  mapping: AwardRosterMapping | null;
  columns: string[];
  onChange: (field: keyof AwardRosterMapping, value: string) => void;
  optional?: boolean;
}) {
  const value = mapping?.[field] ?? "";
  return (
    <label className="space-y-1 text-xs font-medium text-slate-700">
      <span>{label}</span>
      <select
        aria-label={label}
        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
      >
        <option value="">{optional ? "Không chọn" : "Chọn cột"}</option>
        {columns.map((column) => (
          <option key={column} value={column}>
            {column}
          </option>
        ))}
      </select>
    </label>
  );
}

function RecipientPanel({
  recipients,
  loading,
  error,
  page,
  pageCount,
  onPage,
}: {
  recipients: Array<{
    id: string;
    studentCode: string;
    fullName: string;
    institutionWorkspace: { name: string; shortName: string | null };
    className: string | null;
    matchStatus: AwardRecipientMatchStatus;
    sourceRow: number;
  }>;
  loading: boolean;
  error: string | null;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Người nhận đã lưu</h2>
          <p className="mt-1 text-xs text-slate-600">
            Danh sách chính thức do backend trả về sau khi xác nhận.
          </p>
        </div>
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800">
          Đã xác nhận
        </Badge>
      </div>
      {loading ? (
        <div className="mt-4">
          <LoadingState label="Đang tải người nhận..." />
        </div>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-red-800">
          {error}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[650px] text-left text-[12px]">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Dòng</th>
                <th className="px-3 py-2">MSSV</th>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">Lớp</th>
                <th className="px-3 py-2">Đơn vị</th>
                <th className="px-3 py-2">Khớp tài khoản</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{row.sourceRow}</td>
                  <td className="px-3 py-2 font-mono">{row.studentCode}</td>
                  <td className="px-3 py-2">{row.fullName}</td>
                  <td className="px-3 py-2">{row.className || "—"}</td>
                  <td className="px-3 py-2">
                    {row.institutionWorkspace.name}
                    {row.institutionWorkspace.shortName
                      ? ` (${row.institutionWorkspace.shortName})`
                      : ""}
                  </td>
                  <td className="px-3 py-2">
                    <MatchBadge status={row.matchStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
        <span>
          Trang {page} / {Math.max(1, pageCount)}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            Trước
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => onPage(page + 1)}
          >
            Sau
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DecisionBadge({ status }: { status: AwardDecisionStatus }) {
  const content =
    status === "CONFIRMED"
      ? ["Đã xác nhận", "border-emerald-200 bg-emerald-50 text-emerald-800"]
      : status === "ARCHIVED"
        ? ["Đã lưu trữ", "border-slate-200 bg-slate-100 text-slate-700"]
        : ["Bản nháp", "border-amber-200 bg-amber-50 text-amber-800"];
  return (
    <Badge variant="outline" className={content[1]}>
      {content[0]}
    </Badge>
  );
}

function ProcessingBadge({
  status,
}: {
  status: "not_started" | "processing" | "failed" | "preview_ready";
}) {
  const content = {
    not_started: ["Chưa xử lý", "border-slate-200 bg-slate-100 text-slate-700"],
    processing: ["Đang đọc danh sách", "border-blue-200 bg-blue-50 text-blue-800"],
    failed: ["Xử lý thất bại", "border-red-200 bg-red-50 text-red-800"],
    preview_ready: ["Sẵn sàng kiểm tra", "border-emerald-200 bg-emerald-50 text-emerald-800"],
  }[status];
  return (
    <Badge variant="outline" className={content[1]}>
      {content[0]}
    </Badge>
  );
}

function MatchBadge({ status }: { status: AwardRecipientMatchStatus }) {
  const presentation = getAwardMatchPresentation(status);
  const className =
    presentation.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : presentation.tone === "danger"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <Badge variant="outline" className={className} title={presentation.description}>
      {presentation.label}
    </Badge>
  );
}

function RowStatus({
  status,
  matchStatus,
  errors,
}: {
  status: AwardRosterRowStatus;
  matchStatus: AwardRecipientMatchStatus;
  errors: string[];
}) {
  const presentation = getAwardRowPresentation({ status, matchStatus, errors });
  const className =
    presentation.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : presentation.tone === "danger"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <Badge variant="outline" className={className} title={presentation.description}>
      {presentation.label}
    </Badge>
  );
}

function rowErrorLabel(code: string) {
  const labels: Record<string, string> = {
    STUDENT_CODE_REQUIRED: "Thiếu MSSV.",
    STUDENT_CODE_MUST_BE_TEXT: "MSSV phải là ô văn bản để giữ số 0 đầu.",
    FULL_NAME_REQUIRED: "Thiếu họ tên.",
    INSTITUTION_CONTEXT_UNRESOLVED: "Không xác định được trường từ roster.",
  };
  return labels[code] || code;
}

function processingError(code: string) {
  const labels: Record<string, string> = {
    ROSTER_PARSE_FAILED:
      "Không đọc được bảng trong tệp. Kiểm tra lại cấu trúc hoặc tải tệp khác rồi thử lại.",
    OCR_NO_TABLE_FOUND:
      "OCR không tìm thấy bảng trong PDF. Hãy kiểm tra tệp hoặc chuyển danh sách sang CSV/XLSX.",
    FILE_TYPE_NOT_ALLOWED: "Định dạng tệp không được backend hỗ trợ.",
  };
  return labels[code] || "Không thể xử lý roster. Có thể thử lại hoặc tải lên tệp khác.";
}

function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index).toLowerCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
