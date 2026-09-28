import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileCheck2, FileUp, RefreshCw, Save, Upload } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type {
  AwardDecisionStatus,
  AwardRecipientMatchStatus,
  AwardRosterMapping,
  AwardRosterRowStatus,
} from "@/types/award-registry";
import {
  useAwardDecision,
  useAwardRecipients,
  useAwardRosterPreview,
  useAwardRosterProcessing,
  useAwardWorkspaceNames,
  useConfirmAwardDecision,
  useProcessAwardRoster,
  useUpdateAwardDecision,
  useUpdateAwardRosterMapping,
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
  const [recipientPage, setRecipientPage] = useState(1);
  const preview = useAwardRosterPreview(
    decisionId,
    previewPage,
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
  const confirm = useConfirmAwardDecision(decisionId);
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
        title={decision.decisionNumber || "Chi tiết quyết định"}
        subtitle={`${decision.issuerWorkspace.name} · ${decision.awardLevel === "SCHOOL" ? "Cấp trường" : "Cấp Đại học Đà Nẵng"} · Năm học ${decision.schoolYear.replace("-", "–")}`}
        action={
          <Link
            to="/app/award-registry"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Danh sách
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <section className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Thông tin quyết định</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Cập nhật lần cuối {formatDate(decision.updatedAt)}
                </p>
              </div>
              <DecisionBadge status={decision.status} />
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
                <span>Số dòng người nhận</span>
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
                disabled={update.isPending || !schoolYear.trim()}
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
          </Card>

          <Card className="space-y-4 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tệp nguồn</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Tệp quyết định chỉ được lưu làm nguồn. Tệp danh sách mới được đưa vào xử lý roster.
              </p>
            </div>
            <UploadField
              label="Văn bản quyết định"
              kind="decision"
              fileName={decision.decisionFile?.originalName}
              disabled={!isDraft || upload.isPending}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onSelect={(input) => handleUpload("decision", input)}
            />
            <UploadField
              label="Danh sách người nhận"
              kind="roster"
              fileName={decision.rosterFile?.originalName}
              disabled={!isDraft || upload.isPending}
              accept=".csv,.xlsx,.pdf"
              onSelect={(input) => handleUpload("roster", input)}
            />
            {upload.isPending && (
              <p role="status" className="text-sm text-slate-600">
                Đang tải tệp lên...
              </p>
            )}
            {upload.isError && (
              <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {errorMessage(upload.error)}
              </p>
            )}
            {mappingError && (
              <p role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                {mappingError}
              </p>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Trạng thái xử lý roster</h2>
                <p className="mt-1 text-xs text-slate-600">
                  PDF được OCR bất đồng bộ; CSV/XLSX được phân tích bằng parser hiện có.
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
                Đang xử lý tệp. Hệ thống tự làm mới trong tối đa 2 phút; nếu chưa xong, hãy kiểm tra
                lại thủ công.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {isDraft &&
                decision.rosterFile &&
                (processing.data?.status === "not_started" || !processing.data) && (
                  <Button
                    type="button"
                    onClick={() => startProcessing.mutate()}
                    disabled={startProcessing.isPending}
                  >
                    <FileCheck2 aria-hidden="true" />
                    {startProcessing.isPending ? "Đang gửi xử lý..." : "Xử lý danh sách"}
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
              {!decision.rosterFile && (
                <p className="text-sm text-slate-600">Tải tệp danh sách lên để bắt đầu xử lý.</p>
              )}
            </div>
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

        <section className="space-y-4">
          {isDraft && processing.data?.status === "preview_ready" && (
            <PreviewPanel
              preview={preview.data}
              loading={preview.isLoading}
              error={preview.error ? errorMessage(preview.error) : null}
              mapping={mapping}
              saving={updateMapping.isPending}
              mappingError={mappingError}
              page={previewPage}
              onPage={setPreviewPage}
              onMappingChange={setMapping}
              onSaveMapping={() => mapping && updateMapping.mutate(mapping)}
              onRefresh={() => void preview.refetch()}
              institutionNameById={institutionNameById}
            />
          )}
          {isDraft && processing.data?.status === "preview_ready" && (
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Xác nhận quyết định</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Chỉ xác nhận sau khi toàn bộ dòng vượt qua kiểm tra. Award UDN đã xác nhận có
                    thể ảnh hưởng eligibility nộp hồ sơ Thành phố của sinh viên.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" disabled={!canConfirm || confirm.isPending}>
                      Xác nhận quyết định
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Xác nhận và lưu roster?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hệ thống sẽ kiểm tra lại toàn bộ danh sách và lưu các recipient. Quyết định
                        đã xác nhận không thể sửa bằng các thao tác draft hiện có. Với issuer UDN,
                        dữ liệu có thể tham gia kiểm tra eligibility của sinh viên.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Quay lại kiểm tra</AlertDialogCancel>
                      <AlertDialogAction onClick={() => confirm.mutate()}>
                        Xác nhận và lưu
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {preview.data?.validationSummary && (blockingRows > 0 || validRows === 0) && (
                <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                  Còn {blockingRows} dòng lỗi hoặc xung đột. Hãy sửa mapping/tệp nguồn và xử lý lại;
                  backend sẽ kiểm tra lại trước khi xác nhận.
                </p>
              )}
              {confirm.isError && (
                <p role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {errorMessage(confirm.error)}
                </p>
              )}
            </Card>
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
                Backend trả trạng thái ARCHIVED nhưng hiện chưa có API archive/unarchive để vận hành
                trạng thái này từ giao diện.
              </p>
            </Card>
          )}

          <Card className="border-amber-200 bg-amber-50/70 p-4">
            <h2 className="text-sm font-semibold text-amber-950">Giới hạn backend hiện tại</h2>
            <p className="mt-1 text-sm leading-5 text-amber-900">
              Backend chưa có API lưu trữ/khôi phục quyết định hoặc xem audit history riêng cho
              uploader. Trạng thái hiện tại do server quản lý; giao diện không giả lập các thao tác
              này.
            </p>
          </Card>
        </section>
      </div>
    </>
  );
}

function UploadField({
  label,
  kind,
  fileName,
  disabled,
  accept,
  onSelect,
}: {
  label: string;
  kind: "decision" | "roster";
  fileName?: string;
  disabled: boolean;
  accept: string;
  onSelect: (input: HTMLInputElement) => void;
}) {
  return (
    <label className="block rounded-md border border-slate-200 p-3">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <FileUp aria-hidden="true" className="h-4 w-4 text-slate-500" />
        {label}
      </span>
      <span className="mt-1 block truncate text-xs text-slate-600">
        {fileName || "Chưa tải tệp"}
      </span>
      {disabled ? (
        <span className="mt-2 block text-xs text-slate-500">
          Tải tệp chỉ khả dụng khi quyết định ở trạng thái nháp.
        </span>
      ) : (
        <span className="mt-2 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
          <Upload aria-hidden="true" className="h-4 w-4" /> Chọn tệp
          <input
            aria-label={kind === "roster" ? "Tệp danh sách" : "Tệp văn bản quyết định"}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(event) => onSelect(event.currentTarget)}
          />
        </span>
      )}
      {!disabled && <span className="sr-only">Định dạng: {accept.replaceAll(",", " ")}</span>}
    </label>
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
  onMappingChange,
  onSaveMapping,
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
  onMappingChange: (mapping: AwardRosterMapping) => void;
  onSaveMapping: () => void;
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
          <h2 className="text-sm font-semibold text-slate-900">Xem trước người nhận</h2>
          <p className="mt-1 text-xs text-slate-600">
            {preview.validationSummary.total} dòng · {preview.validationSummary.valid} hợp lệ ·{" "}
            {preview.validationSummary.matched} đã khớp tài khoản ·{" "}
            {preview.validationSummary.unmatched} chưa khớp
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" /> Làm mới
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MappingSelect
          label="Cột MSSV"
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
      <div className="mt-4 flex flex-wrap gap-2">
        <SummaryChip label="Lỗi" count={preview.validationSummary.invalid} />
        <SummaryChip label="Trùng" count={preview.validationSummary.duplicate} />
        <SummaryChip label="Xung đột" count={preview.validationSummary.conflict} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[900px] text-left text-[12px]">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Dòng</th>
              <th className="px-3 py-2">MSSV</th>
              <th className="px-3 py-2">Họ tên</th>
              <th className="px-3 py-2">Lớp</th>
              <th className="px-3 py-2">Trường nguồn / đã resolve</th>
              <th className="px-3 py-2">Khớp tài khoản</th>
              <th className="px-3 py-2">Kiểm tra</th>
            </tr>
          </thead>
          <tbody>
            {preview.items.map((row) => (
              <tr key={row.sourceRow} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2">{row.sourceRow}</td>
                <td className="px-3 py-2 font-mono">{row.studentCode || "—"}</td>
                <td className="px-3 py-2">{row.fullName || "—"}</td>
                <td className="px-3 py-2">{row.className || "—"}</td>
                <td className="px-3 py-2">
                  <div>{row.institutionText || "—"}</div>
                  {row.institutionWorkspaceId && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      {institutionNameById.get(row.institutionWorkspaceId) ||
                        `Workspace ${row.institutionWorkspaceId}`}
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
                  <RowStatus status={row.status} />
                  {row.errors.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-red-800">
                      {row.errors.map((issue) => (
                        <li key={issue}>{rowErrorLabel(issue)}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    processing: ["Đang xử lý", "border-blue-200 bg-blue-50 text-blue-800"],
    failed: ["Xử lý thất bại", "border-red-200 bg-red-50 text-red-800"],
    preview_ready: ["Sẵn sàng xem trước", "border-emerald-200 bg-emerald-50 text-emerald-800"],
  }[status];
  return (
    <Badge variant="outline" className={content[1]}>
      {content[0]}
    </Badge>
  );
}

function MatchBadge({ status }: { status: AwardRecipientMatchStatus }) {
  const content = {
    MATCHED: ["Đã khớp tài khoản", "border-emerald-200 bg-emerald-50 text-emerald-800"],
    UNMATCHED: ["Chưa khớp tài khoản", "border-slate-200 bg-slate-100 text-slate-700"],
    CONFLICT: ["Xung đột dữ liệu", "border-amber-200 bg-amber-50 text-amber-900"],
  }[status];
  return (
    <Badge variant="outline" className={content[1]}>
      {content[0]}
    </Badge>
  );
}

function RowStatus({ status }: { status: AwardRosterRowStatus }) {
  const content = {
    VALID: ["Hợp lệ", "border-emerald-200 bg-emerald-50 text-emerald-800"],
    INVALID: ["Không hợp lệ", "border-red-200 bg-red-50 text-red-800"],
    DUPLICATE: ["Trùng dòng", "border-amber-200 bg-amber-50 text-amber-900"],
    CONFLICT: ["Xung đột", "border-amber-200 bg-amber-50 text-amber-900"],
  }[status];
  return (
    <Badge variant="outline" className={content[1]}>
      {content[0]}
    </Badge>
  );
}

function SummaryChip({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700">
      {label}: <strong>{count}</strong>
    </span>
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
