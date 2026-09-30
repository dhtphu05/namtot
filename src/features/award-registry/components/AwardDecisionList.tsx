import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/features/auth/store/auth-store";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import type { AwardDecision, AwardDecisionStatus } from "@/types/award-registry";
import {
  useAwardDecisions,
  useAwardWorkspaceNames,
  useCreateAwardDecision,
} from "@/features/award-registry/hooks/useAwardRegistry";
import { getAwardDecisionStatusPresentation } from "@/features/award-registry/presentation";
import { errorMessage } from "@/features/award-registry/utils/errors";

const PAGE_LIMIT = 20;

export function AwardDecisionList() {
  const role = useAuth((state) => state.user?.role);
  const navigate = useNavigate();
  const [qInput, setQInput] = useState("");
  const [schoolYearInput, setSchoolYearInput] = useState("");
  const [statusInput, setStatusInput] = useState<"all" | AwardDecisionStatus>("all");
  const [archiveInput, setArchiveInput] = useState<"exclude" | "only" | "all">("exclude");
  const [filters, setFilters] = useState({
    page: 1,
    q: "",
    schoolYear: "",
    status: "all" as "all" | AwardDecisionStatus,
    archive: "exclude" as "exclude" | "only" | "all",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const decisions = useAwardDecisions({
    page: filters.page,
    limit: PAGE_LIMIT,
    q: filters.q || undefined,
    schoolYear: filters.schoolYear || undefined,
    status: filters.status === "all" ? undefined : filters.status,
    archive: filters.archive,
  });
  const isAdmin = role === "admin";
  const workspaces = useAwardWorkspaceNames(isAdmin && createOpen);
  const createDecision = useCreateAwardDecision();
  const rows = decisions.data?.items ?? [];
  const pagination = decisions.data?.pagination;
  const hasActiveFilters = Boolean(
    filters.q || filters.schoolYear || filters.status !== "all" || filters.archive !== "exclude",
  );

  const applyFilters = () => {
    setFilters({
      page: 1,
      q: qInput.trim(),
      schoolYear: schoolYearInput.trim(),
      status: statusInput,
      archive: archiveInput,
    });
  };

  return (
    <>
      <TopBar
        title="Quyết định công nhận"
        subtitle="Quản lý quyết định và danh sách sinh viên được đơn vị công nhận để phục vụ kiểm tra điều kiện hồ sơ cấp Thành phố."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus aria-hidden="true" /> Tạo quyết định công nhận
          </Button>
        }
      />

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(200px,1fr)_minmax(150px,0.65fr)_190px_170px_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Tìm số quyết định hoặc năm học</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
            />
            <Input
              value={qInput}
              onChange={(event) => setQInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              className="pl-9"
              placeholder="Số quyết định, năm học..."
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span>Năm học</span>
            <Input
              aria-label="Năm học"
              value={schoolYearInput}
              onChange={(event) => setSchoolYearInput(event.target.value)}
              placeholder="Ví dụ: 2025-2026"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span>Trạng thái</span>
            <select
              aria-label="Trạng thái"
              value={statusInput}
              onChange={(event) => {
                const status = event.target.value as "all" | AwardDecisionStatus;
                setStatusInput(status);
                if (status === "ARCHIVED") setArchiveInput("only");
                else if (archiveInput === "only") setArchiveInput("exclude");
              }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-700">
            <span>Lưu trữ</span>
            <select
              aria-label="Lưu trữ"
              value={archiveInput}
              onChange={(event) => {
                setArchiveInput(event.target.value as "exclude" | "only" | "all");
                setStatusInput("all");
              }}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              <option value="exclude">Đang hoạt động</option>
              <option value="only">Đã lưu trữ</option>
              <option value="all">Tất cả</option>
            </select>
          </label>
          <Button className="self-end" type="button" variant="secondary" onClick={applyFilters}>
            Lọc
          </Button>
          <Button
            className="self-end"
            type="button"
            variant="outline"
            onClick={() => void decisions.refetch()}
            disabled={decisions.isFetching}
          >
            <RefreshCw aria-hidden="true" className={decisions.isFetching ? "animate-spin" : ""} />{" "}
            Làm mới
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-600">
          Mặc định chỉ hiển thị quyết định đang hoạt động. Có thể chuyển sang quyết định đã lưu trữ
          hoặc xem tất cả trạng thái.
        </p>
      </Card>

      <div className="mt-4">
        {decisions.isLoading ? (
          <LoadingState label="Đang tải danh sách quyết định..." />
        ) : decisions.isError ? (
          <ErrorState
            title="Không thể tải Award Registry"
            message={errorMessage(decisions.error)}
            onRetry={() => void decisions.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={
              hasActiveFilters
                ? "Không tìm thấy quyết định phù hợp"
                : "Chưa có quyết định công nhận"
            }
            description={
              hasActiveFilters
                ? "Thử thay đổi từ khóa hoặc bộ lọc để tìm quyết định khác."
                : "Award Registry là nơi lưu dữ liệu công nhận chính thức của đơn vị. Tạo bản nháp đầu tiên bằng nút ở đầu trang."
            }
            action={
              hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setQInput("");
                    setSchoolYearInput("");
                    setStatusInput("all");
                    setArchiveInput("exclude");
                    setFilters({
                      page: 1,
                      q: "",
                      schoolYear: "",
                      status: "all",
                      archive: "exclude",
                    });
                  }}
                >
                  Xóa bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-sm">
              <span className="font-medium text-slate-800">
                {pagination?.total ?? rows.length} quyết định
              </span>
              <span className="text-xs text-slate-500">
                Trang {pagination?.page ?? filters.page} /{" "}
                {Math.max(1, pagination?.totalPages ?? 1)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Quyết định / đơn vị phát hành</th>
                    <th className="px-4 py-3 font-semibold">Năm học</th>
                    <th className="px-4 py-3 font-semibold">Ngày quyết định</th>
                    <th className="px-4 py-3 font-semibold">Tệp nguồn</th>
                    <th className="px-4 py-3 font-semibold">Người nhận</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Ghi nhận lúc</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((decision) => (
                    <DecisionRow key={decision.id} decision={decision} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <Button
                type="button"
                variant="outline"
                disabled={(pagination?.page ?? filters.page) <= 1 || decisions.isFetching}
                onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}
              >
                Trang trước
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={
                  !pagination || filters.page >= pagination.totalPages || decisions.isFetching
                }
                onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}
              >
                Trang sau
              </Button>
            </div>
          </Card>
        )}
      </div>

      <CreateAwardDecisionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isAdmin={isAdmin}
        workspaceOptions={workspaces.data ?? []}
        workspaceError={workspaces.isError ? errorMessage(workspaces.error) : null}
        saving={createDecision.isPending}
        error={createDecision.isError ? errorMessage(createDecision.error) : null}
        onCreate={async (schoolYear, decisionNumber, decisionDate, issuerWorkspaceId) => {
          try {
            const response = await createDecision.mutateAsync({
              schoolYear,
              decisionNumber: decisionNumber || null,
              decisionDate: decisionDate || null,
              ...(issuerWorkspaceId ? { issuerWorkspaceId } : {}),
            });
            setCreateOpen(false);
            await navigate({
              to: "/app/award-registry/$awardDecisionId",
              params: { awardDecisionId: response.id },
            });
          } catch {
            // The mutation error is shown inside the create dialog.
          }
        }}
      />
    </>
  );
}

function DecisionRow({ decision }: { decision: AwardDecision }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/70">
      <td className="px-4 py-3">
        <Link
          to="/app/award-registry/$awardDecisionId"
          params={{ awardDecisionId: decision.id }}
          className="font-medium text-slate-900 underline-offset-4 hover:text-blue-700 hover:underline"
        >
          {decision.decisionNumber || "Chưa có số quyết định"}
        </Link>
        <div className="mt-1 text-xs text-slate-600">
          {decision.issuerWorkspace.shortName || decision.issuerWorkspace.name}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {decision.awardLevel === "SCHOOL" ? "Cấp trường" : "Cấp Đại học Đà Nẵng"}
        </div>
      </td>
      <td className="px-4 py-3 text-slate-700">{decision.schoolYear.replace("-", "–")}</td>
      <td className="px-4 py-3 text-slate-700">
        {decision.decisionDate ? formatShortDate(decision.decisionDate) : "—"}
      </td>
      <td className="px-4 py-3 text-slate-600">
        <div>{decision.rosterFile?.originalName || "Chưa có danh sách"}</div>
        {decision.decisionFile && (
          <div className="mt-1 text-xs">Văn bản: {decision.decisionFile.originalName}</div>
        )}
      </td>
      <td className="px-4 py-3 text-slate-700">{decision.recipientCount}</td>
      <td className="px-4 py-3">
        <DecisionStatus status={decision.status} />
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">{formatDate(decision.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        <Link
          to="/app/award-registry/$awardDecisionId"
          params={{ awardDecisionId: decision.id }}
          aria-label={`Mở ${decision.decisionNumber || decision.id}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        >
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </td>
    </tr>
  );
}

function DecisionStatus({ status }: { status: AwardDecisionStatus }) {
  const presentation = getAwardDecisionStatusPresentation(status);
  const className =
    presentation.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : presentation.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-slate-100 text-slate-700";
  return (
    <Badge variant="outline" className={className} title={presentation.description}>
      {presentation.label}
    </Badge>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function CreateAwardDecisionDialog({
  open,
  onOpenChange,
  isAdmin,
  workspaceOptions,
  workspaceError,
  saving,
  error,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  workspaceOptions: Array<{ id: string; code: string; name: string; shortName: string | null }>;
  workspaceError: string | null;
  saving: boolean;
  error: string | null;
  onCreate: (
    schoolYear: string,
    decisionNumber: string,
    decisionDate: string,
    issuerWorkspaceId?: string,
  ) => Promise<void>;
}) {
  const currentYear = new Date().getFullYear();
  const [schoolYear, setSchoolYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [decisionNumber, setDecisionNumber] = useState("");
  const [decisionDate, setDecisionDate] = useState("");
  const [issuerWorkspaceId, setIssuerWorkspaceId] = useState("");
  const canSubmit =
    schoolYear.trim().length > 0 && (!isAdmin || issuerWorkspaceId.length > 0) && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo quyết định công nhận</DialogTitle>
          <DialogDescription>
            Tạo bản nháp trước, sau đó tải tệp và xử lý danh sách ở trang chi tiết.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {isAdmin && (
            <label className="block space-y-1.5 text-sm font-medium">
              <span>Workspace phát hành</span>
              <select
                aria-label="Workspace phát hành"
                value={issuerWorkspaceId}
                onChange={(event) => setIssuerWorkspaceId(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Chọn workspace</option>
                {workspaceOptions.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.code} · {workspace.shortName || workspace.name}
                  </option>
                ))}
              </select>
              <span className="block text-xs font-normal text-slate-600">
                Backend chỉ chấp nhận workspace School hoặc University System và sẽ xác thực loại
                workspace khi tạo.
              </span>
              {workspaceError && (
                <span role="alert" className="block text-xs text-red-700">
                  {workspaceError}
                </span>
              )}
            </label>
          )}
          <label className="block space-y-1.5 text-sm font-medium">
            <span>
              Năm học <span className="text-red-700">*</span>
            </span>
            <Input
              aria-label="Năm học"
              value={schoolYear}
              onChange={(event) => setSchoolYear(event.target.value)}
              placeholder="2025-2026"
              required
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>
              Số quyết định <span className="font-normal text-slate-500">(có thể bổ sung sau)</span>
            </span>
            <Input
              aria-label="Số quyết định"
              value={decisionNumber}
              onChange={(event) => setDecisionNumber(event.target.value)}
              maxLength={120}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>
              Ngày quyết định{" "}
              <span className="font-normal text-slate-500">(có thể bổ sung sau)</span>
            </span>
            <Input
              aria-label="Ngày quyết định"
              type="date"
              value={decisionDate}
              onChange={(event) => setDecisionDate(event.target.value)}
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              void onCreate(
                schoolYear.trim(),
                decisionNumber.trim(),
                decisionDate,
                issuerWorkspaceId || undefined,
              )
            }
          >
            {saving ? "Đang tạo..." : "Tạo bản nháp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
