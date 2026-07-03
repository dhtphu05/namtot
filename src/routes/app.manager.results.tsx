import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  ClipboardCheck,
  FileSearch,
  Loader2,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, StatCard } from "@/components/ui-kit";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useManagerDashboardSummary,
  useManagerResults,
} from "@/features/manager/hooks/useManager";
import { FinalizationDialog } from "@/features/manager/components/FinalizationDialog";
import type { ManagerResultFilters, ManagerResultItem } from "@/features/manager/types";
import type { Criterion, Level, ReviewTaskStatus, Role } from "@/features/review/types";
import type { FinalStatus } from "@/lib/api/types";
import { ACTIVE_LEVELS, getDownrankReason, getFinalizeActionLabel, getLevelLabel, isLegacyCentral } from "@/lib/levels";
import {
  finalStatusTone,
  getApplicationStatusLabel,
  getFinalStatusLabel,
} from "@/lib/status-labels";

export const Route = createFileRoute("/app/manager/results")({
  validateSearch: (search) => ({
    filter: typeof search.filter === "string" ? normalizeActiveFilter(search.filter) : undefined,
  }),
  component: ManagerResultsShell,
});

const levels: Level[] = [...ACTIVE_LEVELS];
const allowedRoles: Role[] = ["manager", "committee", "admin"];
const finalizerRoles: Role[] = ["manager", "committee", "admin"];
const criterionOrder: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

const criterionShortLabel: Record<Criterion, string> = {
  ethics: "ĐĐ",
  academic: "HT",
  physical: "TL",
  volunteer: "TN",
  integration: "HN",
  priority: "UT",
  collective: "TT",
};

type ActiveFilter =
  | "all"
  | Level
  | "failed"
  | "pending"
  | "ready"
  | "downgraded"
  | "not_eligible"
  | "resolution"
  | "supplement"
  | "overdue"
  | "recently_finalized"
  | "unfinished";

function ManagerResultsShell() {
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Kết quả xét duyệt theo cấp"
          subtitle="Phân loại sinh viên đạt/chưa đạt theo kết quả cuối cùng."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập màn kết quả theo cấp.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (pathname !== "/app/manager/results") {
    return <Outlet />;
  }

  return <ManagerResultsContent role={role} />;
}

function ManagerResultsContent({ role }: { role: Role }) {
  const searchState = Route.useSearch();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(searchState.filter ?? "all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<NonNullable<ManagerResultFilters["sortBy"]>>("lastActivityAt");
  const [selected, setSelected] = useState<ManagerResultItem | null>(null);
  const canFinalize = finalizerRoles.includes(role);
  const summaryQuery = useManagerDashboardSummary();
  const filters = useMemo<ManagerResultFilters>(() => {
    const next: ManagerResultFilters = {
      page,
      pageSize,
      sortBy,
      sortOrder: sortBy === "oldest" ? "asc" : "desc",
      search: search.trim() || undefined,
    };
    if (levels.includes(activeFilter as Level)) {
      next.finalLevel = activeFilter as Level;
    }
    if (activeFilter === "failed") {
      next.finalStatus = "failed";
    }
    if (activeFilter === "pending") {
      next.finalStatus = "pending";
    }
    if (
      activeFilter === "ready" ||
      activeFilter === "downgraded" ||
      activeFilter === "not_eligible" ||
      activeFilter === "resolution" ||
      activeFilter === "supplement" ||
      activeFilter === "overdue" ||
      activeFilter === "recently_finalized" ||
      activeFilter === "unfinished"
    ) {
      next.resultView = activeFilter;
    }
    return next;
  }, [activeFilter, page, pageSize, search, sortBy]);
  const resultsQuery = useManagerResults(filters);
  const summary = summaryQuery.data;
  const breakdown = summary?.finalLevelBreakdown;
  const total = summary?.applicationOverview?.totalApplications ?? summary?.totalApplications ?? 0;
  const items = resultsQuery.data?.items ?? [];
  const pagination = resultsQuery.data?.pagination ?? { page, pageSize, total: 0, totalPages: 0 };
  const firstItem = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.total, pagination.page * pagination.pageSize);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, pageSize, search, sortBy]);

  return (
    <>
      <TopBar
        title="Kết quả xét duyệt theo cấp"
        subtitle="Phân loại sinh viên đạt/chưa đạt theo kết quả cuối cùng."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard icon={<FileSearch className="h-5 w-5" />} label="Tổng hồ sơ" value={total} />
        {levels.map((level) => (
          <StatCard
            key={level}
            icon={<ShieldCheck className="h-5 w-5" />}
            label={`Dat ${getLevelLabel(level)}`}
            value={breakdown?.[level] ?? 0}
            tint={level === "city" ? "#7C3AED" : "#16A34A"}
          />
        ))}
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Chưa đạt"
          value={breakdown?.notAchieved ?? 0}
          tint="#DC2626"
        />
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          label="Chưa chốt"
          value={breakdown?.unfinalized ?? 0}
          tint="#F59E0B"
        />
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["all", "Tất cả"],
            ["ready", "Có thể chốt"],
            ["downgraded", "Bị hạ cấp"],
            ["not_eligible", "Không đạt cấp nào"],
            ["resolution", "Cần hội ý"],
            ["supplement", "Cần bổ sung"],
            ["unfinished", "Chưa đủ task"],
            ["school", "Cấp Trường"],
            ["university", "Cấp ĐHĐN"],
            ["city", "Cấp Thành phố"],
            ["failed", "Chưa đạt"],
            ["pending", "Chưa chốt"],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={activeFilter === value ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(value as ActiveFilter)}
            >
              {label}
            </Button>
          ))}
          <div className="relative ml-auto min-w-[240px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sinh viên, MSSV, lớp, khoa..."
              className="w-full rounded-lg border border-[#DCE7F2] bg-white py-2 pl-8 pr-3 text-[13px] font-medium text-brand-deep outline-none focus:ring-2 focus:ring-[#0057C2]/20"
            />
          </div>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as NonNullable<ManagerResultFilters["sortBy"]>)}
            className="rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-[13px] font-medium text-brand-deep outline-none focus:ring-2 focus:ring-[#0057C2]/20"
          >
            <option value="lastActivityAt">Mới cập nhật nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="readiness_desc">Mức sẵn sàng cao nhất</option>
            <option value="unfinalized_first">Chưa chốt trước</option>
            <option value="target_level_desc">Cấp đăng ký cao nhất</option>
          </select>
        </div>
      </Card>

      {resultsQuery.isLoading || summaryQuery.isLoading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải kết quả xét duyệt...
          </div>
        </Card>
      ) : resultsQuery.isError || summaryQuery.isError ? (
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">Không thể tải dữ liệu kết quả.</div>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                void resultsQuery.refetch();
                void summaryQuery.refetch();
              }}
            >
              Thử lại
            </Button>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-sm text-muted-foreground">
            Chưa có hồ sơ phù hợp với bộ lọc hiện tại.
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b bg-[#F6F9FC] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Sinh viên</th>
                  <th className="px-4 py-3">MSSV</th>
                  <th className="px-4 py-3">Lớp</th>
                  <th className="px-4 py-3">Khoa</th>
                  <th className="px-4 py-3">Cấp đăng ký</th>
                  <th className="px-4 py-3">Đề xuất cấp đạt</th>
                  <th className="px-4 py-3">Kết quả cuối</th>
                  <th className="px-4 py-3">Cấp đạt</th>
                  <th className="px-4 py-3">5 tiêu chí</th>
                  <th className="px-4 py-3">Lý do</th>
                  <th className="px-4 py-3">Trạng thái hồ sơ</th>
                  <th className="px-4 py-3">Tiến độ task</th>
                  <th className="px-4 py-3">Cập nhật lần cuối</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const finalized = item.finalStatus !== "pending" && Boolean(item.finalizedAt);
                  const blockedReason = item.blockingReasons?.join(" ") || "Hồ sơ chưa đủ điều kiện chốt.";
                  const legacyCentral = isLegacyCentral(item.targetLevel);
                  const finalizeDisabled = !canFinalize || finalized || !item.canFinalize || legacyCentral;
                  const finalizeTitle = !canFinalize
                    ? "Chỉ Hội đồng/Cấp quản lý được chốt kết quả."
                    : finalized
                      ? "Hồ sơ đã có kết quả cuối."
                      : legacyCentral
                        ? "Scope Trung ương không nằm trong flow chính hiện tại."
                      : !item.canFinalize
                        ? blockedReason
                        : "Chốt kết quả hồ sơ";
                  const downrankReason =
                    item.topBlockerReason ??
                    getDownrankReason(item.targetLevel, item.suggestedLevel, item.blockingReasons);
                  return (
                    <tr key={item.applicationId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-semibold text-brand-deep">{item.studentName}</td>
                      <td className="px-4 py-3">{item.studentCode ?? "--"}</td>
                      <td className="px-4 py-3">{item.className ?? "--"}</td>
                      <td className="px-4 py-3">{item.faculty ?? "--"}</td>
                      <td className="px-4 py-3">{getLevelLabel(item.targetLevel)}</td>
                      <td className="px-4 py-3">
                        {item.suggestedLevel ? getLevelLabel(item.suggestedLevel) : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <FinalStatusChip status={item.finalStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {item.finalLevel ? getLevelLabel(item.finalLevel) : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <CriterionStatusStrip item={item} />
                      </td>
                      <td className="max-w-64 px-4 py-3 text-xs text-muted-foreground">
                        {downrankReason}
                      </td>
                      <td className="px-4 py-3">
                        {getApplicationStatusLabel(item.applicationStatus)}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone="brand">
                          {item.taskProgress?.accepted ?? item.reviewTaskSummary.accepted}/{item.taskProgress?.total ?? item.reviewTaskSummary.total} đạt
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        {formatDateTime(item.lastActivityAt ?? item.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/app/manager/results/$applicationId" params={{ applicationId: item.applicationId }}>
                              Xem chi tiết
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            disabled={finalizeDisabled}
                            title={finalizeTitle}
                            onClick={() => setSelected(item)}
                          >
                            {getFinalizeActionLabel(item.suggestedLevel)}
                          </Button>
                          {canFinalize && !finalized && !item.canFinalize ? (
                            <div className="max-w-44 text-right text-[11px] font-medium text-amber-700">
                              {blockedReason}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div>
              Hiển thị {firstItem}-{lastItem} trên tổng {pagination.total} hồ sơ
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-[#DCE7F2] bg-white px-2 py-1.5 text-brand-deep"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}/trang
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1 || resultsQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Trang trước
              </Button>
              <span className="font-semibold text-brand-deep">
                Trang {pagination.page} / {Math.max(1, pagination.totalPages)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= pagination.totalPages || resultsQuery.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Trang sau
              </Button>
            </div>
          </div>
        </Card>
      )}

      <FinalizationDialog
        item={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}

function normalizeActiveFilter(value: string): ActiveFilter | undefined {
  const allowed: ActiveFilter[] = [
    "all",
    ...levels,
    "failed",
    "pending",
    "ready",
    "downgraded",
    "not_eligible",
    "resolution",
    "supplement",
    "unfinished",
  ];
  return allowed.includes(value as ActiveFilter) ? (value as ActiveFilter) : undefined;
}

function FinalStatusChip({ status }: { status: FinalStatus }) {
  return <Chip tone={finalStatusTone[status]}>{getFinalStatusLabel(status)}</Chip>;
}

function CriterionStatusStrip({ item }: { item: ManagerResultItem }) {
  return (
    <div className="flex min-w-40 flex-wrap gap-1.5">
      {criterionOrder.map((criterion) => {
        const task = item.criterionStatuses?.[criterion];
        return (
          <span
            key={criterion}
            className={`inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 text-[11px] font-bold ${criterionClass(task?.status)}`}
            title={`${criterionShortLabel[criterion]}: ${task?.status ?? "Chưa có task"}`}
          >
            {criterionShortLabel[criterion]}
          </span>
        );
      })}
    </div>
  );
}

function criterionClass(status?: ReviewTaskStatus) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-rose-50 text-rose-700";
  if (status === "supplement_required") return "bg-amber-50 text-amber-700";
  if (status === "resolution_needed") return "bg-violet-50 text-violet-700";
  if (status === "reviewing") return "bg-sky-50 text-sky-700";
  return "bg-slate-100 text-slate-600";
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
