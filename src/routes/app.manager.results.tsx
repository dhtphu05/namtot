import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ClipboardCheck, FileSearch, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, StatCard } from "@/components/ui-kit";
import { useAuth } from "@/features/auth/store/auth-store";
import { useManagerDashboardSummary, useManagerResults } from "@/features/manager/hooks/useManager";
import { cityPilotSchoolYear } from "@/features/manager/city-analytics/constants";
import { FinalizationDialog } from "@/features/manager/components/FinalizationDialog";
import type {
  ApplicationArchiveFilter,
  ApplicationLifecycleFilter,
  ManagerResultFilters,
  ManagerResultItem,
} from "@/features/manager/types";
import type { Criterion, Level, ReviewTaskStatus, Role } from "@/features/review/types";
import { getTaskStatusLabel } from "@/features/review/utils/formatters";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";
import type { FinalStatus } from "@/lib/api/types";
import {
  ACTIVE_LEVELS,
  getDownrankReason,
  getFinalizeActionLabel,
  getLevelLabel,
  isLegacyCentral,
} from "@/lib/levels";
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
const allowedRoles: Role[] = ["manager", "committee", "city_manager", "city_committee", "admin"];
const finalizerRoles: Role[] = ["manager", "committee", "city_manager", "city_committee", "admin"];
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
  const cityOnly = role === "city_manager" || role === "city_committee" || role === "admin";
  const searchState = Route.useSearch();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(searchState.filter ?? "all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lifecycle, setLifecycle] = useState<ApplicationLifecycleFilter>("active");
  const [archive, setArchive] = useState<ApplicationArchiveFilter>("exclude");
  const [sortBy, setSortBy] =
    useState<NonNullable<ManagerResultFilters["sortBy"]>>("lastActivityAt");
  const [selected, setSelected] = useState<ManagerResultItem | null>(null);
  const canFinalize = finalizerRoles.includes(role);
  const summaryQuery = useManagerDashboardSummary(!cityOnly);
  const filters = useMemo<ManagerResultFilters>(() => {
    const next: ManagerResultFilters = {
      page,
      pageSize,
      lifecycle,
      archive,
      sortBy,
      sortOrder: sortBy === "oldest" ? "asc" : "desc",
      search: search.trim() || undefined,
      ...(cityOnly ? { schoolYear: cityPilotSchoolYear } : {}),
    };
    if (!cityOnly && levels.includes(activeFilter as Level)) {
      next.finalLevel = activeFilter as Level;
    }
    if (cityOnly && activeFilter === "city") {
      next.finalStatus = "passed";
    } else if (activeFilter === "failed") {
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
  }, [activeFilter, archive, cityOnly, lifecycle, page, pageSize, search, sortBy]);
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

  useEffect(() => {
    if (cityOnly && ["school", "university", "central"].includes(activeFilter)) {
      setActiveFilter("all");
    }
  }, [activeFilter, cityOnly]);

  return (
    <>
      <TopBar
        title={cityOnly ? "Kết quả xét duyệt cấp Thành phố" : "Kết quả xét duyệt theo cấp"}
        subtitle={
          cityOnly
            ? `Hồ sơ cá nhân cấp Thành phố · Năm học ${cityPilotSchoolYear}`
            : "Phân loại sinh viên đạt/chưa đạt theo kết quả cuối cùng."
        }
      />

      {cityOnly ? (
        <div className="mb-5 grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            icon={<FileSearch className="h-5 w-5" />}
            label="Hồ sơ trong mùa xét"
            value={resultsQuery.data?.summary?.totalApplications ?? 0}
          />
          <StatCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Đạt Thành phố"
            value={resultsQuery.data?.summary?.passedCity ?? 0}
            tint="#16A34A"
          />
          <StatCard
            icon={<XCircle className="h-5 w-5" />}
            label="Chưa đạt Thành phố"
            value={resultsQuery.data?.summary?.notAchievedCity ?? 0}
            tint="#DC2626"
          />
          <StatCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            label="Chưa chốt"
            value={resultsQuery.data?.summary?.unfinalized ?? 0}
            tint="#F59E0B"
          />
        </div>
      ) : (
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
      )}

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {(cityOnly
            ? [
                ["all", "Tất cả"],
                ["ready", "Có thể chốt"],
                ["resolution", "Cần hội ý"],
                ["supplement", "Cần bổ sung"],
                ["unfinished", "Chưa đủ tiêu chí"],
                ["city", "Đạt Thành phố"],
                ["failed", "Chưa đạt Thành phố"],
                ["pending", "Chưa chốt"],
              ]
            : [
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
              ]
          ).map(([value, label]) => (
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
          {role === "city_manager" || role === "admin" ? (
            <>
              <label className="sr-only" htmlFor="application-lifecycle-filter">
                Vòng đời hồ sơ
              </label>
              <select
                id="application-lifecycle-filter"
                aria-label="Vòng đời hồ sơ"
                value={lifecycle}
                onChange={(event) => setLifecycle(event.target.value as ApplicationLifecycleFilter)}
                className="rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-[13px] font-medium text-brand-deep outline-none focus:ring-2 focus:ring-[#0057C2]/20"
              >
                <option value="active">Đang hoạt động</option>
                <option value="cancelled">Đã hủy</option>
                <option value="all">Tất cả vòng đời</option>
              </select>
              <label className="sr-only" htmlFor="application-archive-filter">
                Trạng thái lưu trữ
              </label>
              <select
                id="application-archive-filter"
                aria-label="Trạng thái lưu trữ"
                value={archive}
                onChange={(event) => setArchive(event.target.value as ApplicationArchiveFilter)}
                className="rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-[13px] font-medium text-brand-deep outline-none focus:ring-2 focus:ring-[#0057C2]/20"
              >
                <option value="exclude">Chưa lưu trữ</option>
                <option value="only">Đã lưu trữ</option>
                <option value="all">Tất cả trạng thái lưu trữ</option>
              </select>
            </>
          ) : null}
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
            onChange={(event) =>
              setSortBy(event.target.value as NonNullable<ManagerResultFilters["sortBy"]>)
            }
            className="rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-[13px] font-medium text-brand-deep outline-none focus:ring-2 focus:ring-[#0057C2]/20"
          >
            <option value="lastActivityAt">Mới cập nhật nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="readiness_desc">Mức sẵn sàng cao nhất</option>
            <option value="unfinalized_first">Chưa chốt trước</option>
            {!cityOnly ? <option value="target_level_desc">Cấp đăng ký cao nhất</option> : null}
          </select>
        </div>
      </Card>

      {resultsQuery.isLoading || (!cityOnly && summaryQuery.isLoading) ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải kết quả xét duyệt...
          </div>
        </Card>
      ) : resultsQuery.isError || (!cityOnly && summaryQuery.isError) ? (
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">Không thể tải dữ liệu kết quả.</div>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                void resultsQuery.refetch();
                if (!cityOnly) void summaryQuery.refetch();
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
        <Card className="overflow-hidden p-0">
          <div className="divide-y">
            {items.map((item) => (
              <ResultSummaryCard
                key={item.applicationId}
                item={item}
                canFinalize={canFinalize}
                cityOnly={cityOnly}
                onFinalize={setSelected}
              />
            ))}
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
        cityOnly={cityOnly}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}

function ResultSummaryCard({
  item,
  canFinalize,
  cityOnly,
  onFinalize,
}: {
  item: ManagerResultItem;
  canFinalize: boolean;
  cityOnly: boolean;
  onFinalize: (item: ManagerResultItem) => void;
}) {
  const finalized = item.finalStatus !== "pending" && Boolean(item.finalizedAt);
  const rawBlockedReason = item.blockingReasons?.join(" ") || "Hồ sơ chưa đủ điều kiện chốt.";
  const blockedReason = cityOnly
    ? getCityFriendlyBlockedReason(rawBlockedReason)
    : rawBlockedReason;
  const legacyCentral = isLegacyCentral(item.targetLevel);
  const cancelled = Boolean(item.cancelledAt);
  const finalizeDisabled =
    !canFinalize || finalized || !item.canFinalize || legacyCentral || cancelled;
  const finalizeTitle = !canFinalize
    ? "Chỉ Hội đồng/Cấp quản lý được chốt kết quả."
    : finalized
      ? "Hồ sơ đã có kết quả cuối."
      : legacyCentral
        ? "Scope Trung ương không nằm trong flow chính hiện tại."
        : cancelled
          ? "Hồ sơ đã hủy; cần mở lại trước khi chốt kết quả."
          : !item.canFinalize
            ? blockedReason
            : "Chốt kết quả hồ sơ";
  const downrankReason =
    item.topBlockerReason ?? getDownrankReason(item.targetLevel, item.suggestedLevel);
  const acceptedCount = item.taskProgress?.accepted ?? item.reviewTaskSummary.accepted;
  const totalCount = item.taskProgress?.total ?? item.reviewTaskSummary.total;

  return (
    <article className="bg-white p-4 transition hover:bg-slate-50/70 lg:p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(420px,1.5fr)_minmax(260px,0.85fr)] xl:items-start">
        <section className="min-w-0">
          <Link
            to="/app/manager/results/$applicationId"
            params={{ applicationId: item.applicationId }}
            search={{ focus: undefined, resolutionCaseId: undefined, filter: undefined }}
            className="line-clamp-2 text-base font-bold leading-snug text-[#0057C2] hover:underline"
          >
            {item.studentName}
          </Link>
          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {cityOnly ? (
              <>
                <span>{item.className ?? "Chưa rõ lớp"}</span>
                <span>•</span>
                <span className="max-w-full break-words">
                  {item.schoolName ?? "Chưa rõ trường"}
                </span>
              </>
            ) : (
              <>
                <span>{item.studentCode ?? "--"}</span>
                <span>•</span>
                <span>{item.className ?? "--"}</span>
                <span>•</span>
                <span className="max-w-full truncate">{item.faculty ?? "--"}</span>
              </>
            )}
          </div>
          {cancelled || item.archivedAt ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {cancelled ? <Chip tone="error">Đã hủy hồ sơ</Chip> : null}
              {item.archivedAt ? <Chip tone="muted">Đã lưu trữ</Chip> : null}
              {cancelled && item.cancelReason ? (
                <span className="text-xs text-rose-700">{item.cancelReason}</span>
              ) : null}
              {item.archivedAt && item.archiveReason ? (
                <span className="text-xs text-muted-foreground">{item.archiveReason}</span>
              ) : null}
            </div>
          ) : null}
          {!cityOnly ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <SmallInfo label="Cấp đăng ký" value={getLevelLabel(item.targetLevel)} />
              <SmallInfo
                label="Đề xuất"
                value={item.suggestedLevel ? getLevelLabel(item.suggestedLevel) : "--"}
              />
            </div>
          ) : null}
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <FinalStatusChip
              status={item.finalStatus}
              finalLevel={item.finalLevel}
              cityOnly={cityOnly}
            />
            {!cityOnly ? (
              <Chip tone={item.finalLevel ? "brand" : "muted"}>
                {`Cấp đạt: ${item.finalLevel ? getLevelLabel(item.finalLevel) : "--"}`}
              </Chip>
            ) : null}
            <Chip tone="brand">
              {cityOnly
                ? `${acceptedCount}/${totalCount} tiêu chí đã được chấp nhận`
                : `${acceptedCount}/${totalCount} task đạt`}
            </Chip>
          </div>
          <CriterionStatusStrip item={item} />
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-600">
            <span className="font-semibold text-brand-deep">Lý do: </span>
            {cityOnly ? cityReason(item.finalStatus, item.finalLevel) : downrankReason}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3 xl:items-end">
          <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <SmallInfo
              label="Trạng thái"
              value={getApplicationStatusLabel(item.applicationStatus)}
            />
            <SmallInfo
              label="Cập nhật"
              value={formatDateTime(item.lastActivityAt ?? item.updatedAt)}
            />
          </div>
          <div className="flex w-full flex-wrap gap-2 xl:justify-end">
            <Button asChild size="sm" variant="outline">
              <Link
                to="/app/manager/results/$applicationId"
                params={{ applicationId: item.applicationId }}
                search={{ focus: undefined, resolutionCaseId: undefined, filter: undefined }}
              >
                Xem chi tiết
              </Link>
            </Button>
            <Button
              size="sm"
              disabled={finalizeDisabled}
              title={finalizeTitle}
              onClick={() => onFinalize(item)}
            >
              {cityOnly ? "Chốt kết quả" : getFinalizeActionLabel(item.suggestedLevel)}
            </Button>
          </div>
          {canFinalize && !finalized && !item.canFinalize ? (
            <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800">
              {blockedReason}
            </div>
          ) : null}
        </section>
      </div>
    </article>
  );
}

function SmallInfo({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-lg border bg-white px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-brand-deep">{value}</div>
    </div>
  );
}

function getCityFriendlyBlockedReason(reason: string) {
  if (/resolution\s+case|resolution hub/i.test(reason)) {
    return "Hồ sơ còn nội dung cần Hội đồng xem xét. Vui lòng hoàn tất bước này trước khi chốt kết quả.";
  }
  if (/\btask\b/i.test(reason)) {
    return "Hồ sơ còn tiêu chí chưa được xem xét.";
  }
  return reason;
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

function FinalStatusChip({
  status,
  finalLevel,
  cityOnly = false,
}: {
  status: FinalStatus;
  finalLevel?: Level | null;
  cityOnly?: boolean;
}) {
  return (
    <Chip tone={cityOnly ? cityResultTone(status, finalLevel) : finalStatusTone[status]}>
      {cityOnly ? cityResultLabel(status, finalLevel) : getFinalStatusLabel(status)}
    </Chip>
  );
}

function cityResultTone(status: FinalStatus, finalLevel?: Level | null) {
  if (status === "passed" && finalLevel === "city") return "success";
  if (status === "pending") return "warning";
  if (status === "passed" && !finalLevel) return "warning";
  return "error";
}

function cityResultLabel(status: FinalStatus, finalLevel?: Level | null) {
  if (status === "passed") {
    if (finalLevel === "city") return "Đạt Thành phố";
    return finalLevel ? "Chưa đạt Thành phố" : "Cần đối soát";
  }
  if (status === "partially_passed" || status === "failed") return "Chưa đạt Thành phố";
  return "Chưa chốt";
}

function cityReason(status: FinalStatus, finalLevel?: Level | null) {
  if (status === "passed") return "Đã chốt đạt danh hiệu cấp Thành phố.";
  if (status === "partially_passed" || status === "failed") {
    return finalLevel && finalLevel !== "city"
      ? "Quyết định hiện tại không công nhận danh hiệu cấp Thành phố."
      : "Đã chốt hồ sơ chưa đạt danh hiệu cấp Thành phố.";
  }
  return "Hồ sơ đang chờ Hội đồng hoàn tất quyết định cuối cùng.";
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
            title={`${criterionShortLabel[criterion]}: ${task ? getTaskStatusLabel(task.status) : "Chưa có kết quả"}`}
            aria-label={`${getCoreCriterionLabel(criterion)}: ${task ? getTaskStatusLabel(task.status) : "Chưa có kết quả"}`}
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
