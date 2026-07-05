import { type Dispatch, type ReactNode, type SetStateAction, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock3, Download, ExternalLink, Eye, FileText, FileWarning, Hourglass, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/store/auth-store";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewFilters } from "@/features/review/components/ReviewFilters";
import { ReviewTaskTable } from "@/features/review/components/ReviewTaskTable";
import { reviewApi } from "@/features/review/api/review";
import {
  useClaimReviewTask,
  useEscalateResolution,
  useRequestSupplement,
  useReviewTask,
  useReviewTasks,
  useSubmitReviewDecision,
} from "@/features/review/hooks/useReview";
import type {
  ReviewTaskListItem,
  ReviewTaskListParams,
  ReviewTaskStatus,
  Criterion,
  Level,
  ReviewTaskDetail,
  Role,
} from "@/features/review/types";
import { getErrorMessage } from "@/features/review/utils/errors";
import {
  formatDateTime,
  getCriterionLabel,
  getLevelLabel,
  getTaskStatusLabel,
} from "@/features/review/utils/formatters";

export const Route = createFileRoute("/app/queue")({
  component: ReviewQueueRoute,
});

const allowedRoles: Role[] = ["officer", "manager", "committee", "admin"];
const defaultLimit = 10;
type QueueTab = "actionable" | "claimable" | "mine" | "supplement" | "readonly" | "all";
type QueueViewMode = "application" | "criterion";
type QueueDecisionAction = "accepted" | "rejected" | "supplement_required" | "resolution_needed";
type QueueEvidenceAssessmentValue = "valid" | "ambiguous" | "invalid";
type QueueSort =
  | "newest"
  | "oldest"
  | "student_name"
  | "student_code"
  | "criterion"
  | "status"
  | "review_need"
  | "deadline"
  | "level"
  | "evidence_count";
type EvidenceViewMode = "criterion" | "all";
type OfficerApplicationGroup = {
  applicationId: string;
  studentName: string;
  studentCode: string;
  faculty?: string | null;
  className?: string | null;
  schoolYear: string;
  targetLevel: ReviewTaskListItem["targetLevel"];
  applicationStatus: ReviewTaskListItem["applicationStatus"];
  tasks: ReviewTaskListItem[];
  actionableTasks: ReviewTaskListItem[];
  claimableTasks: ReviewTaskListItem[];
  readonlyTasks: ReviewTaskListItem[];
  primaryTask: ReviewTaskListItem;
  dueDate?: string | null;
  updatedAt: string;
};

const fiveGoodCriteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

const officerTabs: Array<{ value: QueueTab; label: string; description: string }> = [
  { value: "actionable", label: "Cần xử lý", description: "Việc đang được giao và có thể quyết định." },
  { value: "claimable", label: "Có thể nhận", description: "Việc chưa phân công, thuộc tiêu chí phụ trách." },
  { value: "mine", label: "Của tôi", description: "Tất cả việc đã giao cho bạn." },
  { value: "supplement", label: "Chờ bổ sung", description: "Việc đang chờ sinh viên bổ sung giấy xác nhận." },
  { value: "readonly", label: "Chỉ xem", description: "Việc có thể xem nhưng không được xử lý." },
  { value: "all", label: "Tất cả", description: "Tất cả việc được phép xem." },
];

const queueTabValues: QueueTab[] = ["actionable", "claimable", "mine", "supplement", "readonly", "all"];
const reviewTaskStatusValues: ReviewTaskStatus[] = [
  "waiting",
  "reviewing",
  "supplement_required",
  "accepted",
  "rejected",
  "resolution_needed",
];

const queueRejectionReasons = [
  "Không đạt điều kiện cứng của tiêu chí",
  "Dữ liệu sinh viên không khớp với tài liệu",
  "Tài liệu không hợp lệ cho tiêu chí này",
  "Quá hạn bổ sung nhưng chưa đủ điều kiện",
];
const queueSupplementChecklist = ["Thiếu tệp xác nhận", "Thiếu dữ liệu", "Giấy xác nhận chưa rõ", "Khác"];
const queueResolutionReasons = [
  "Dữ liệu và tài liệu mâu thuẫn",
  "Cần cấp có thẩm quyền hội ý",
  "Tài liệu cần xác minh thêm",
  "Trường hợp ngoài quy trình thông thường",
];

function getInitialQueueTab(): QueueTab {
  if (typeof window === "undefined") return "actionable";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return queueTabValues.includes(tab as QueueTab) ? (tab as QueueTab) : "actionable";
}

function getInitialQueueFilters(): ReviewTaskListParams {
  const base: ReviewTaskListParams = {
    page: 1,
    limit: defaultLimit,
  };
  if (typeof window === "undefined") return base;

  const params = new URLSearchParams(window.location.search);
  const status = parseReviewTaskStatus(params.get("status"));
  return {
    ...base,
    ...(status ? { status } : {}),
    ...(params.get("dueSoon") === "1" ? { dueSoon: true } : {}),
    ...(params.get("overdue") === "1" ? { overdue: true } : {}),
    ...(params.get("supplementRequired") === "1" ? { supplementRequired: true } : {}),
    ...(params.get("resolutionNeeded") === "1" ? { resolutionNeeded: true } : {}),
  };
}

function parseReviewTaskStatus(value: string | null): ReviewTaskStatus | undefined {
  return reviewTaskStatusValues.includes(value as ReviewTaskStatus)
    ? (value as ReviewTaskStatus)
    : undefined;
}

function ReviewQueueRoute() {
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Hàng đợi xét duyệt"
          subtitle="Theo dõi và xử lý các hồ sơ được phân công theo từng tiêu chí Sinh viên 5 tốt."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập hàng đợi xét duyệt.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Vui lòng liên hệ quản trị viên nếu bạn cần quyền cán bộ xét duyệt.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return <ReviewQueueContent role={role} />;
}

function ReviewQueueContent({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<QueueTab>(() => getInitialQueueTab());
  const [viewMode, setViewMode] = useState<QueueViewMode>("application");
  const [sortBy, setSortBy] = useState<QueueSort>("deadline");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion | null>(null);
  const [claimCandidate, setClaimCandidate] = useState<ReviewTaskListItem | null>(null);
  const [filters, setFilters] = useState<ReviewTaskListParams>(() => getInitialQueueFilters());

  const queryParams = useMemo<ReviewTaskListParams>(
    () => ({
      ...filters,
    }),
    [filters],
  );

  const { data, error, isError, isFetching, isLoading, refetch } = useReviewTasks(queryParams);
  const claimTask = useClaimReviewTask();
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const summary = useMemo(() => getCurrentListSummary(items), [items]);
  const allApplicationGroups = useMemo(() => groupOfficerApplications(items), [items]);
  const priorityGroups = useMemo(() => getPriorityApplicationGroups(items).slice(0, 6), [items]);
  const visibleItems = useMemo(
    () => sortQueueItems(role === "officer" ? filterOfficerTasks(items, activeTab) : items, sortBy),
    [activeTab, items, role, sortBy],
  );
  const visibleGroups = useMemo(
    () => sortQueueGroups(groupOfficerApplications(visibleItems), sortBy),
    [sortBy, visibleItems],
  );
  const selectedGroup = useMemo(
    () =>
      visibleGroups.find((group) => group.applicationId === selectedApplicationId) ??
      visibleGroups[0] ??
      null,
    [selectedApplicationId, visibleGroups],
  );

  useEffect(() => {
    if (role !== "officer" || viewMode !== "application") return;
    if (!visibleGroups.length) {
      setSelectedApplicationId(null);
      setSelectedCriterion(null);
      return;
    }
    const stillVisible = selectedApplicationId
      ? visibleGroups.some((group) => group.applicationId === selectedApplicationId)
      : false;
    if (!stillVisible) {
      const nextGroup = visibleGroups[0];
      setSelectedApplicationId(nextGroup.applicationId);
      setSelectedCriterion(getDefaultCriterionForGroup(nextGroup));
    }
  }, [role, selectedApplicationId, viewMode, visibleGroups]);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? defaultLimit;
  const canGoPrevious = page > 1 && !isFetching;
  const canGoNext = items.length >= limit && !isFetching;

  const openTask = (taskId: string) => {
    navigate({ to: "/app/review/$id", params: { id: taskId } });
  };

  const confirmClaimTask = () => {
    if (!claimCandidate) return;

    claimTask.mutate(claimCandidate.id, {
      onSuccess: () => {
        toast.success("Đã nhận xử lý. Hồ sơ đã chuyển sang danh sách của bạn.");
        setClaimCandidate(null);
      },
      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            "Tiêu chí này vừa được giao cho cán bộ khác. Bạn đang ở chế độ chỉ xem.",
          ),
        );
        setClaimCandidate(null);
      },
    });
  };


  if (role === "officer") {
    return (
      <>
        <OfficerQueueWorkbench
          activeTab={activeTab}
          canGoNext={canGoNext}
          canGoPrevious={canGoPrevious}
          filters={filters}
          groups={visibleGroups}
          isError={isError}
          isFetching={isFetching}
          isLoading={isLoading}
          items={items}
          page={page}
          selectedApplicationId={selectedGroup?.applicationId ?? null}
          selectedCriterion={selectedCriterion}
          selectedGroup={selectedGroup}
          sortBy={sortBy}
          summary={summary}
          viewMode={viewMode}
          onClaimTask={(task) => setClaimCandidate(task)}
          onFiltersChange={setFilters}
          onOpenTask={openTask}
          onRetry={() => void refetch()}
          onSelectCriterion={setSelectedCriterion}
          onSelectGroup={(group, criterion) => {
            setSelectedApplicationId(group.applicationId);
            setSelectedCriterion(criterion ?? getDefaultCriterionForGroup(group));
          }}
          onSetActiveTab={setActiveTab}
          onSetSortBy={setSortBy}
          onSetViewMode={setViewMode}
        />
        <QueueClaimDialog
          claimCandidate={claimCandidate}
          isPending={claimTask.isPending}
          onClose={() => setClaimCandidate(null)}
          onConfirm={confirmClaimTask}
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title={role === "officer" ? "Việc được giao" : "Hồ sơ đang xét"}
        subtitle="Xử lý các tiêu chí và minh chứng thuộc phạm vi phụ trách."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={role === "officer" ? "Hồ sơ trong phạm vi" : "Tổng task trong danh sách"}
          value={role === "officer" ? allApplicationGroups.length : summary.total}
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          label="Chờ xét"
          value={summary.waiting}
          icon={<Clock3 className="h-5 w-5" />}
          tint="#64748B"
        />
        <StatCard
          label="Đang xét"
          value={summary.reviewing}
          icon={<Hourglass className="h-5 w-5" />}
          tint="#0057C2"
        />
        <StatCard
          label="Cần bổ sung"
          value={summary.supplementRequired}
          icon={<FileWarning className="h-5 w-5" />}
          tint="#F59E0B"
        />
        <StatCard
          label="Đạt / không đạt"
          value={`${summary.accepted}/${summary.rejected}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tint="#16A34A"
        />
      </div>

      {role === "officer" ? (
        <>
          <Card className="mt-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-deep">Chế độ hiển thị</h2>
                <p className="text-sm text-muted-foreground">
                  Mặc định xem theo hồ sơ để tránh lặp sinh viên. Chỉ chuyển sang tiêu chí khi cần rà từng task rời.
                </p>
              </div>
              <div className="flex rounded-md border bg-muted/30 p-1">
                <Button
                  size="sm"
                  type="button"
                  variant={viewMode === "application" ? "default" : "ghost"}
                  onClick={() => setViewMode("application")}
                >
                  Xem theo hồ sơ
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant={viewMode === "criterion" ? "default" : "ghost"}
                  onClick={() => setViewMode("criterion")}
                >
                  Xem theo tiêu chí
                </Button>
              </div>
            </div>
          </Card>

          <Card className="mt-5">
            <div className="mb-3 flex flex-col gap-1">
              <h2 className="text-base font-bold text-brand-deep">Bàn làm việc cán bộ</h2>
              <p className="text-sm text-muted-foreground">
                Hệ thống tách rõ task được xử lý, task có thể nhận và task chỉ được xem.
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              {officerTabs.map((tab) => {
                const count = filterOfficerTasks(items, tab.value).length;
                const selected = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    className={`rounded-md border p-3 text-left transition ${
                      selected ? "border-brand bg-brand/5 text-brand-deep" : "hover:bg-muted/40"
                    }`}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{tab.label}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        {count}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{tab.description}</div>
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

      <div className="mt-5">
        <Card>
          <ReviewFilters
            disabled={isFetching}
            value={filters}
            onChange={(nextFilters) =>
              setFilters((current) => ({
                q: nextFilters.q,
                criterion: nextFilters.criterion,
                status: nextFilters.status,
                targetLevel: nextFilters.targetLevel,
                riskLevel: nextFilters.riskLevel,
                aiConfidenceMax: nextFilters.aiConfidenceMax,
                dueSoon: nextFilters.dueSoon,
                overdue: nextFilters.overdue,
                supplementRequired: nextFilters.supplementRequired,
                resolutionNeeded: nextFilters.resolutionNeeded,
                page: 1,
                limit: current.limit ?? defaultLimit,
              }))
            }
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Thống kê đang tính trên danh sách hiện tại theo quyền xem của tài khoản.
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-brand-deep">
              Sắp xếp
              <select
                className="rounded-lg border border-[#DCE7F2] bg-white px-3 py-2 text-sm outline-none"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as QueueSort)}
                disabled={isFetching}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="student_name">Sinh viên A-Z</option>
                <option value="student_code">MSSV</option>
                <option value="criterion">Theo tiêu chí</option>
                <option value="status">Theo trạng thái</option>
                <option value="review_need">Theo mức cần kiểm tra</option>
                <option value="deadline">Deadline gần nhất</option>
                <option value="level">Cấp xét</option>
                <option value="evidence_count">Số minh chứng</option>
              </select>
            </label>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          {isError ? (
            <ReviewErrorState
              description={getErrorMessage(
                error,
                "Không thể tải hàng đợi xét duyệt. Vui lòng thử lại sau.",
              )}
              onRetry={() => void refetch()}
            />
          ) : (
            role === "officer" ? (
              viewMode === "application" ? (
                <OfficerMasterDetailQueue
                  activeCriterion={selectedCriterion}
                  groups={visibleGroups}
                  isLoading={isLoading}
                  selectedApplicationId={selectedGroup?.applicationId ?? null}
                  onClaimTask={(task) => setClaimCandidate(task)}
                  onOpenTask={openTask}
                  onSelectCriterion={setSelectedCriterion}
                  onSelectGroup={(group, criterion) => {
                    setSelectedApplicationId(group.applicationId);
                    setSelectedCriterion(criterion ?? getDefaultCriterionForGroup(group));
                  }}
                  selectedGroup={selectedGroup}
                />
              ) : (
                <ReviewTaskTable
                  isLoading={isLoading}
                  items={visibleItems}
                  onClaimTask={(taskId) => {
                    const item = items.find((candidate) => candidate.id === taskId);
                    if (item) setClaimCandidate(item);
                  }}
                  onOpenTask={openTask}
                />
              )
            ) : (
              <ReviewTaskTable
                isLoading={isLoading}
                items={visibleItems}
                onClaimTask={(taskId) => {
                  const item = items.find((candidate) => candidate.id === taskId);
                  if (item) setClaimCandidate(item);
                }}
                onOpenTask={openTask}
              />
            )
          )}
        </Card>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span>Hiển thị</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            disabled={isFetching}
            value={limit}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                limit: Number(event.target.value),
              }))
            }
          >
            {[10, 20, 50].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span>hồ sơ mỗi trang</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            disabled={!canGoPrevious}
            type="button"
            variant="outline"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: Math.max(1, (current.page ?? 1) - 1),
              }))
            }
          >
            Trang trước
          </Button>
          <span className="min-w-16 text-center">Trang {page}</span>
          <Button
            disabled={!canGoNext}
            type="button"
            variant="outline"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: (current.page ?? 1) + 1,
              }))
            }
          >
            Trang sau
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(claimCandidate)} onOpenChange={(open) => !open && setClaimCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận nhận xử lý</DialogTitle>
            <DialogDescription>
              Sau khi nhận, hồ sơ sẽ được giao cho bạn và bạn chịu trách nhiệm đưa quyết định.
            </DialogDescription>
          </DialogHeader>
          {claimCandidate ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-semibold text-brand-deep">{claimCandidate.studentName}</div>
              <div className="mt-1 text-muted-foreground">
                {claimCandidate.studentCode || "Chưa có MSSV"} • {getCriterionLabel(claimCandidate.criterion)} •{" "}
                {getLevelLabel(claimCandidate.targetLevel)}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setClaimCandidate(null)}>
              Hủy
            </Button>
            <Button disabled={claimTask.isPending} type="button" onClick={confirmClaimTask}>
              {claimTask.isPending ? "Đang nhận..." : "Xác nhận nhận xử lý"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OfficerQueueWorkbench({
  activeTab,
  canGoNext,
  canGoPrevious,
  filters,
  groups,
  isError,
  isFetching,
  isLoading,
  items,
  page,
  selectedApplicationId,
  selectedCriterion,
  selectedGroup,
  sortBy,
  summary,
  viewMode,
  onClaimTask,
  onFiltersChange,
  onOpenTask,
  onRetry,
  onSelectCriterion,
  onSelectGroup,
  onSetActiveTab,
  onSetSortBy,
  onSetViewMode,
}: {
  activeTab: QueueTab;
  canGoNext: boolean;
  canGoPrevious: boolean;
  filters: ReviewTaskListParams;
  groups: OfficerApplicationGroup[];
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  items: ReviewTaskListItem[];
  page: number;
  selectedApplicationId: string | null;
  selectedCriterion: Criterion | null;
  selectedGroup: OfficerApplicationGroup | null;
  sortBy: QueueSort;
  summary: ReturnType<typeof getCurrentListSummary>;
  viewMode: QueueViewMode;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onFiltersChange: Dispatch<SetStateAction<ReviewTaskListParams>>;
  onOpenTask: (taskId: string) => void;
  onRetry: () => void;
  onSelectCriterion: (criterion: Criterion) => void;
  onSelectGroup: (group: OfficerApplicationGroup, criterion?: Criterion) => void;
  onSetActiveTab: (tab: QueueTab) => void;
  onSetSortBy: (sort: QueueSort) => void;
  onSetViewMode: (mode: QueueViewMode) => void;
}) {
  const totalCriteria = groups.reduce((sum, group) => sum + group.tasks.length, 0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const updateAdvancedFilters = (nextFilters: ReviewTaskListParams) => {
    onFiltersChange((current) => ({ ...current, ...nextFilters, page: 1 }));
  };

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden bg-[var(--surface-app)] text-[var(--text-primary)]">
      <div className="flex min-h-14 flex-wrap items-center gap-3 bg-white px-4 py-2 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
        <div className="min-w-0 shrink-0 md:min-w-[210px]">
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Việc được giao</h1>
          <div className="text-xs text-[#475569]">
            {groups.length} hồ sơ · {totalCriteria} tiêu chí · {summary.reviewing} đang xét · {summary.supplementRequired} cần bổ sung
          </div>
        </div>

        <input
          className="h-9 min-w-[160px] flex-1 rounded-full bg-[var(--surface-muted)] px-3 text-sm outline-none shadow-[0_0_0_1px_rgba(15,23,42,0.07)] focus:bg-white focus:ring-2 focus:ring-[#0057C2]/20"
          disabled={isFetching}
          placeholder="Tìm tên, MSSV, lớp, tiêu chí hoặc tên minh chứng"
          value={filters.q ?? ""}
          onChange={(event) =>
            onFiltersChange((current) => ({
              ...current,
              q: event.target.value,
              page: 1,
            }))
          }
        />

        <div className="hidden items-center gap-1 xl:flex">
          {officerTabs.slice(0, 5).map((tab) => (
            <button
              key={tab.value}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                activeTab === tab.value ? "bg-[#EAF3FF] text-[#0057C2]" : "text-[#475569] hover:bg-[#F8FAFC]",
              ].join(" ")}
              type="button"
              onClick={() => onSetActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button
          className="h-9 rounded-full"
          disabled={isFetching}
          size="sm"
          type="button"
          variant={filtersOpen ? "default" : "outline"}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Bộ lọc
        </Button>

        <select
          className="h-9 rounded-full bg-white px-3 text-sm outline-none shadow-[0_0_0_1px_rgba(15,23,42,0.07)] focus:ring-2 focus:ring-[#0057C2]/20"
          disabled={isFetching}
          value={sortBy}
          onChange={(event) => onSetSortBy(event.target.value as QueueSort)}
        >
          <option value="deadline">Deadline gần nhất</option>
          <option value="newest">Mới cập nhật</option>
          <option value="student_name">Tên A-Z</option>
          <option value="student_code">MSSV</option>
        </select>

        <div className="hidden rounded-full bg-[var(--surface-muted)] p-1 lg:flex">
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold ${viewMode === "application" ? "bg-white text-[#0057C2]" : "text-[#475569]"}`}
            type="button"
            onClick={() => onSetViewMode("application")}
          >
            Hồ sơ
          </button>
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold ${viewMode === "criterion" ? "bg-white text-[#0057C2]" : "text-[#475569]"}`}
            type="button"
            onClick={() => onSetViewMode("criterion")}
          >
            Tiêu chí
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <div className="bg-white px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
          <ReviewFilters value={filters} disabled={isFetching} onChange={updateAdvancedFilters} />
        </div>
      ) : null}

      <div
        className={
          viewMode === "application"
            ? "grid min-h-0 flex-1 grid-rows-[minmax(220px,34vh)_minmax(0,1fr)] gap-3 p-3 xl:grid-cols-[minmax(300px,340px)_minmax(0,1fr)] xl:grid-rows-1"
            : "min-h-0 flex-1 overflow-y-auto p-3"
        }
      >
        {viewMode === "application" ? (
        <aside className="min-h-0 overflow-hidden rounded-lg bg-white shadow-[var(--shadow-card)]">
          <div className="p-4 shadow-[0_1px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#0F172A]">Hồ sơ trong phạm vi</h2>
                <p className="text-xs text-[#475569]">{groups.length} hồ sơ · {totalCriteria} tiêu chí</p>
              </div>
              <Badge variant="outline">Trang {page}</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 xl:hidden">
              {officerTabs.slice(0, 5).map((tab) => (
                <button
                  key={tab.value}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${activeTab === tab.value ? "bg-[#EAF3FF] text-[#0057C2]" : "bg-[#F8FAFC] text-[#475569]"}`}
                  type="button"
                  onClick={() => onSetActiveTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[calc(100%-118px)] overflow-y-auto p-3">
            {isLoading ? (
              <div className="rounded-lg bg-[var(--surface-muted)] p-5 text-sm text-[#475569]">Đang tải hàng chờ hồ sơ...</div>
            ) : groups.length ? (
              <div className="space-y-2">
                {groups.map((group) => (
                  <OfficerCaseCompactCard
                    group={group}
                    isSelected={group.applicationId === selectedApplicationId}
                    key={group.applicationId}
                    onSelect={onSelectGroup}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-[var(--surface-muted)] p-5 text-sm text-[#475569]">
                Chưa có hồ sơ trong nhóm này. Thử đổi bộ lọc để xem hồ sơ khác.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 shadow-[0_-1px_0_rgba(15,23,42,0.05)]">
            <Button size="sm" variant="outline" disabled={!canGoPrevious} onClick={() => onFiltersChange((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))}>
              Trước
            </Button>
            <span className="text-xs text-[#475569]">Trang {page}</span>
            <Button size="sm" variant="outline" disabled={!canGoNext} onClick={() => onFiltersChange((current) => ({ ...current, page: (current.page ?? 1) + 1 }))}>
              Sau
            </Button>
          </div>
        </aside>
        ) : null}

        <main className={viewMode === "application" ? "min-h-0 overflow-y-auto rounded-lg bg-white shadow-[var(--shadow-card)]" : "min-h-full rounded-lg bg-white shadow-[var(--shadow-card)]"}>
          {isError ? (
            <div className="p-6">
              <ReviewErrorState description="Không thể tải hàng đợi xét duyệt. Vui lòng thử lại sau." onRetry={onRetry} />
            </div>
          ) : viewMode === "application" ? (
            <OfficerApplicationWorkspace
              activeCriterion={selectedCriterion ?? getDefaultCriterionForGroup(selectedGroup)}
              group={selectedGroup}
              onClaimTask={onClaimTask}
              onOpenTask={onOpenTask}
              onSelectCriterion={onSelectCriterion}
            />
          ) : (
            <div className="p-4">
              <ReviewTaskTable
                isLoading={isLoading}
                items={items}
                onClaimTask={(taskId) => {
                  const item = items.find((candidate) => candidate.id === taskId);
                  if (item) onClaimTask(item);
                }}
                onOpenTask={onOpenTask}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function QueueClaimDialog({
  claimCandidate,
  isPending,
  onClose,
  onConfirm,
}: {
  claimCandidate: ReviewTaskListItem | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(claimCandidate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận nhận xử lý</DialogTitle>
          <DialogDescription>
            Sau khi nhận, hồ sơ sẽ được giao cho bạn và bạn chịu trách nhiệm đưa quyết định.
          </DialogDescription>
        </DialogHeader>
        {claimCandidate ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-semibold text-brand-deep">{claimCandidate.studentName}</div>
            <div className="mt-1 text-muted-foreground">
              {claimCandidate.studentCode || "Chưa có MSSV"} • {getCriterionLabel(claimCandidate.criterion)} •{" "}
              {getLevelLabel(claimCandidate.targetLevel)}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>
            Hủy
          </Button>
          <Button disabled={isPending} type="button" onClick={onConfirm}>
            {isPending ? "Đang nhận..." : "Xác nhận nhận xử lý"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfficerMasterDetailQueue({
  activeCriterion,
  groups,
  isLoading,
  selectedApplicationId,
  selectedGroup,
  onClaimTask,
  onOpenTask,
  onSelectCriterion,
  onSelectGroup,
}: {
  activeCriterion: Criterion | null;
  groups: OfficerApplicationGroup[];
  isLoading: boolean;
  selectedApplicationId: string | null;
  selectedGroup: OfficerApplicationGroup | null;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onOpenTask: (taskId: string) => void;
  onSelectCriterion: (criterion: Criterion) => void;
  onSelectGroup: (group: OfficerApplicationGroup, criterion?: Criterion) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
        Đang tải hàng chờ hồ sơ...
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <div className="font-semibold text-brand-deep">Chưa có hồ sơ trong nhóm này</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Thử đổi tab hoặc bộ lọc để xem các hồ sơ khác trong phạm vi của bạn.
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[720px] min-w-0 gap-4 xl:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
      <aside className="rounded-md border bg-muted/20 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-brand-deep">Hồ sơ trong phạm vi</h2>
            <p className="text-xs text-muted-foreground">{groups.length} hồ sơ, {groups.reduce((sum, group) => sum + group.tasks.length, 0)} task tiêu chí</p>
          </div>
          <Badge variant="outline">Hồ sơ</Badge>
        </div>
        <div className="max-h-[650px] space-y-2 overflow-y-auto pr-1">
          {groups.map((group) => (
            <OfficerCaseCompactCard
              group={group}
              isSelected={group.applicationId === selectedApplicationId}
              key={group.applicationId}
              onSelect={onSelectGroup}
            />
          ))}
        </div>
      </aside>

      <OfficerApplicationWorkspace
        activeCriterion={activeCriterion ?? getDefaultCriterionForGroup(selectedGroup)}
        group={selectedGroup}
        onClaimTask={onClaimTask}
        onOpenTask={onOpenTask}
        onSelectCriterion={onSelectCriterion}
      />
    </div>
  );
}

function OfficerCaseCompactCard({
  group,
  isSelected,
  onSelect,
}: {
  group: OfficerApplicationGroup;
  isSelected: boolean;
  onSelect: (group: OfficerApplicationGroup, criterion?: Criterion) => void;
}) {
  const assignedCount = group.tasks.filter((task) => task.permissions?.reason === "assigned_to_you").length;
  const completedCount = group.tasks.filter((task) => isCompletedTask(task)).length;
  const priorityTask = group.primaryTask;

  return (
    <button
      className={`w-full rounded-lg p-3 text-left transition ${
        isSelected ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "bg-white hover:bg-[var(--surface-muted)]"
      }`}
      type="button"
      onClick={() => onSelect(group)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-brand-deep">{group.studentName || "Chưa có tên sinh viên"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{group.studentCode || "Chưa có MSSV"}</div>
        </div>
        <Badge variant={isSelected ? "default" : "secondary"}>{getLevelLabel(group.targetLevel)}</Badge>
      </div>
      <div className="mt-2 truncate text-xs text-muted-foreground">
        {[group.className, group.faculty].filter(Boolean).join(" • ") || "Chưa có lớp/khoa"} • {group.schoolYear}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-white/70 px-2 py-1">Giao: {assignedCount}/5</div>
        <div className="rounded bg-white/70 px-2 py-1">Xong: {completedCount}/{group.tasks.length}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {fiveGoodCriteria.map((criterion) => {
          const task = group.tasks.find((item) => item.criterion === criterion);
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getCriterionChipClass(task)}`}
              key={criterion}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(group, criterion);
              }}
            >
              {getCriterionAbbreviation(criterion)}
            </span>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{getQueueIssueSummary(priorityTask)}</span>
      </div>
    </button>
  );
}

function OfficerApplicationWorkspace({
  activeCriterion,
  group,
  onClaimTask,
  onOpenTask,
  onSelectCriterion,
}: {
  activeCriterion: Criterion | null;
  group: OfficerApplicationGroup | null;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onOpenTask: (taskId: string) => void;
  onSelectCriterion: (criterion: Criterion) => void;
}) {
  const [activeDecisionAction, setActiveDecisionAction] = useState<QueueDecisionAction | null>(null);
  const [evidenceAssessments, setEvidenceAssessments] = useState<Record<string, QueueEvidenceAssessmentValue>>({});
  const activeTask = group
    ? group.tasks.find((task) => task.criterion === activeCriterion) ?? group.primaryTask
    : null;
  const { data: activeDetail = null, isLoading: isDetailLoading } = useReviewTask(activeTask?.id);

  useEffect(() => {
    setActiveDecisionAction(null);
    setEvidenceAssessments({});
  }, [activeTask?.id]);

  if (!group || !activeTask) {
    return (
      <section className="flex h-full items-center justify-center p-8 text-center text-sm text-[#475569]">
        Chọn một hồ sơ ở danh sách bên trái để bắt đầu xét duyệt.
      </section>
    );
  }

  const evidenceItems = activeDetail?.evidences ?? [];
  const completedCount = group.tasks.filter((task) => isCompletedTask(task)).length;
  const assignedCount = group.tasks.filter((task) => task.permissions?.reason === "assigned_to_you").length;
  const nextCriterion = getNextActionableCriterion(group, activeTask.criterion);
  const criterionEvidences = evidenceItems.filter((evidence) => evidence.criterion === activeTask.criterion);
  const criterionMetrics = (activeDetail?.metrics ?? []).filter((metric) => metric.criterion === activeTask.criterion || getMetricTypesForCriterion(activeTask.criterion).includes(metric.metricType));
  const hasCriterionFile = criterionEvidences.some((evidence) => evidence.files?.length);
  const canAct = Boolean(activeTask.permissions?.canAct && activeDetail);

  return (
    <section className="min-h-full bg-white">
      <div className="border-b border-[rgba(15,23,42,0.08)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">{group.studentName || "Chưa có tên sinh viên"}</h2>
            <div className="mt-1 text-sm text-[#475569]">
              {[group.studentCode, group.className, group.faculty].filter(Boolean).join(" • ") || "Chưa có thông tin sinh viên"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Aim: {getLevelLabel(group.targetLevel)}</Badge>
            <Badge variant="outline">{group.schoolYear}</Badge>
            <Badge variant="secondary">{getApplicationStatusLabel(group.applicationStatus)}</Badge>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#475569]">
          <span className="rounded-full bg-[#F8FAFC] px-3 py-1">Bạn được giao {assignedCount}/5 tiêu chí</span>
          <span className="rounded-full bg-[#F8FAFC] px-3 py-1">Đã xử lý {completedCount}/{group.tasks.length}</span>
          <span className="rounded-full bg-[#F8FAFC] px-3 py-1">Deadline {formatDateTime(group.dueDate)}</span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <QueueCriteriaSummaryTable
          activeDetail={activeDetail}
          activeTask={activeTask}
          group={group}
          onSelectCriterion={onSelectCriterion}
        />

        <div className="flex flex-wrap gap-2">
          {fiveGoodCriteria.map((criterion) => {
            const task = group.tasks.find((item) => item.criterion === criterion);
            const selected = task?.criterion === activeTask.criterion || (!task && criterion === activeCriterion);
            return (
              <button
                className={[
                  "flex min-w-[92px] items-center justify-between gap-2 rounded-full border border-[rgba(15,23,42,0.08)] px-3 py-2 text-sm font-semibold transition",
                  selected ? "bg-[#EAF3FF] text-[#0057C2]" : "bg-white text-[#0F172A] hover:bg-[#F8FAFC]",
                ].join(" ")}
                key={criterion}
                type="button"
                onClick={() => onSelectCriterion(criterion)}
              >
                <span className="sm:hidden">{getCriterionAbbreviation(criterion)}</span>
                <span className="hidden sm:inline">{getCriterionLabel(criterion)}</span>
                <span className="text-xs font-normal text-[#475569]">{task ? getTaskStatusLabel(task.status) : "Chỉ xem"}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-4 pb-28">
          <CriterionSummaryPanel
            detail={activeDetail}
            hasFile={hasCriterionFile}
            metrics={criterionMetrics}
            task={activeTask}
          />
          {!hasCriterionFile && criterionMetrics.length ? (
            <div className="rounded-lg border border-amber-200 bg-[#FFF7E6] p-4 text-sm text-amber-900">
              Gợi ý: Nên yêu cầu sinh viên bổ sung tệp xác nhận trước khi kết luận đạt.
            </div>
          ) : null}
          <EvidenceWorkspacePanel
            activeCriterion={activeTask.criterion}
            allEvidences={evidenceItems}
            evidences={criterionEvidences}
            evidenceAssessments={evidenceAssessments}
            isLoading={isDetailLoading}
            metrics={criterionMetrics}
            onEvidenceAssessmentChange={(evidenceId, assessment) =>
              setEvidenceAssessments((current) => ({ ...current, [evidenceId]: assessment }))
            }
            onRequestSupplement={activeTask.permissions?.canAct ? () => setActiveDecisionAction("supplement_required") : undefined}
            onSelectCriterion={onSelectCriterion}
          />
          <DataMatchPanel activeCriterion={activeTask.criterion} detail={activeDetail} evidences={criterionEvidences} />
          <CriterionChecklistPanel detail={activeDetail} task={activeTask} />

          {activeTask.permissions?.canClaim ? (
            <div className="rounded-lg border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] p-4">
              <div className="text-sm font-semibold text-[#0F172A]">Hồ sơ chưa được giao</div>
              <p className="mt-1 text-sm text-[#475569]">{activeTask.permissions.reasonLabel}</p>
              <Button className="mt-3" type="button" onClick={() => onClaimTask(activeTask)}>
                Mở xét duyệt
              </Button>
            </div>
          ) : null}

          {!canAct && activeDetail ? (
            <div className="rounded-lg border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] p-4">
              <div className="text-sm font-semibold text-[#0F172A]">Chỉ xem</div>
              <p className="mt-1 text-sm text-[#475569]">
                {activeTask.permissions?.reasonLabel ?? "Bạn không có quyền gửi kết luận cho tiêu chí này."}
              </p>
              <Button className="mt-3" variant="outline" type="button" onClick={() => onOpenTask(activeTask.id)}>
                Mở chi tiết
              </Button>
            </div>
          ) : null}

          {!activeDetail ? (
            <div className="rounded-lg border border-[rgba(15,23,42,0.08)] p-4 text-sm text-[#475569]">Đang tải dữ liệu tiêu chí...</div>
          ) : null}
        </div>
      </div>

      {canAct ? (
        <QueueDecisionActionBar
          criterion={activeTask.criterion}
          status={activeTask.status}
          onAction={setActiveDecisionAction}
        />
      ) : null}
      {activeDetail ? (
        <QueueDecisionModal
          action={activeDecisionAction}
          evidenceAssessments={evidenceAssessments}
          task={activeDetail}
          onClose={() => setActiveDecisionAction(null)}
          onSuccess={() => {
            setActiveDecisionAction(null);
            if (nextCriterion) onSelectCriterion(nextCriterion);
          }}
        />
      ) : null}
    </section>
  );
}

function QueueDecisionActionBar({
  criterion,
  status,
  onAction,
}: {
  criterion: Criterion;
  status: ReviewTaskStatus;
  onAction: (action: QueueDecisionAction) => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 border-t border-[rgba(15,23,42,0.08)] bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#0F172A]">{getCriterionLabel(criterion)} · {getTaskStatusLabel(status)}</div>
          <div className="text-xs text-[#475569]">Chọn kết luận để mở form xác nhận. Không có quyết định nào được chọn sẵn.</div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[560px]">
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" type="button" onClick={() => onAction("accepted")}>
            Đạt tiêu chí
          </Button>
          <Button className="bg-rose-600 text-white hover:bg-rose-700" type="button" onClick={() => onAction("rejected")}>
            Không đạt
          </Button>
          <Button className="bg-sky-50 text-sky-700 hover:bg-sky-100" type="button" variant="secondary" onClick={() => onAction("supplement_required")}>
            Yêu cầu bổ sung
          </Button>
          <Button className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" type="button" variant="outline" onClick={() => onAction("resolution_needed")}>
            Chuyển hội ý
          </Button>
        </div>
      </div>
    </div>
  );
}

function QueueDecisionModal({
  action,
  evidenceAssessments,
  task,
  onClose,
  onSuccess,
}: {
  action: QueueDecisionAction | null;
  evidenceAssessments: Record<string, QueueEvidenceAssessmentValue>;
  task: ReviewTaskDetail;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const submitDecision = useSubmitReviewDecision(task.id);
  const requestSupplement = useRequestSupplement(task.id);
  const escalateResolution = useEscalateResolution(task.id);
  const relatedEvidences = useMemo(() => task.evidences ?? [], [task.evidences]);
  const [note, setNote] = useState("");
  const [reasonTemplate, setReasonTemplate] = useState("");
  const [supplementItems, setSupplementItems] = useState<string[]>([]);
  const [supplementContent, setSupplementContent] = useState("");
  const [supplementDeadline, setSupplementDeadline] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>(
    relatedEvidences.filter((evidence) => evidence.files?.length).map((evidence) => evidence.id),
  );

  useEffect(() => {
    setNote("");
    setReasonTemplate("");
    setSupplementItems([]);
    setSupplementContent("");
    setSupplementDeadline("");
    setResolutionReason("");
    setResolutionSummary("");
    setSelectedEvidenceIds(relatedEvidences.filter((evidence) => evidence.files?.length).map((evidence) => evidence.id));
  }, [action, relatedEvidences, task.id]);

  const isPending = submitDecision.isPending || requestSupplement.isPending || escalateResolution.isPending;
  const confirmDisabled = isPending || !isQueueDecisionReady(action, {
    note,
    reasonTemplate,
    supplementItems,
    supplementContent,
    supplementDeadline,
    resolutionReason,
    resolutionSummary,
  });
  const primaryData = getQueuePrimaryDataText(task.metrics, task.criterion);
  const documentCount = relatedEvidences.reduce((sum, evidence) => sum + (evidence.files?.length ?? 0), 0);

  const closeAfterSuccess = (message: string) => {
    toast.success(message);
    onSuccess();
  };

  const handleConfirm = () => {
    if (!action) return;
    const evidencePayload = toQueueEvidenceAssessmentsPayload(evidenceAssessments);

    if (action === "accepted") {
      submitDecision.mutate(
        {
          payload: {
            decision: "accepted",
            evidenceAssessments: evidencePayload,
            officerSuggestedLevel: task.application.targetLevel,
            levelAssessmentJson: task.criterionLevelAssessment ? { assessment: task.criterionLevelAssessment } : undefined,
            note: note.trim(),
          },
        },
        { onSuccess: () => closeAfterSuccess("Đã xác nhận tiêu chí đạt.") },
      );
      return;
    }

    if (action === "rejected") {
      submitDecision.mutate(
        {
          payload: {
            decision: "rejected",
            evidenceAssessments: evidencePayload,
            officerSuggestedLevel: null,
            note: `${reasonTemplate}. ${note.trim()}`,
          },
        },
        { onSuccess: () => closeAfterSuccess("Đã xác nhận tiêu chí không đạt.") },
      );
      return;
    }

    if (action === "supplement_required") {
      requestSupplement.mutate(
        {
          payload: {
            note: buildQueueSupplementNote(supplementItems, supplementContent),
            deadline: supplementDeadline,
            evidenceIds: selectedEvidenceIds,
          },
        },
        { onSuccess: () => closeAfterSuccess("Đã gửi yêu cầu bổ sung cho sinh viên.") },
      );
      return;
    }

    escalateResolution.mutate(
      {
        payload: {
          reason: `${resolutionReason}. ${resolutionSummary.trim()}`,
          evidenceIds: selectedEvidenceIds,
        },
      },
      { onSuccess: () => closeAfterSuccess("Đã chuyển case sang hội ý.") },
    );
  };

  return (
    <Dialog open={Boolean(action)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getQueueDecisionModalTitle(action)}</DialogTitle>
          <DialogDescription>
            Kiểm tra thông tin chính trước khi xác nhận. Nút xác nhận chỉ mở khi đã đủ dữ liệu bắt buộc.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-lg bg-[#F8FAFC] p-3 sm:grid-cols-2">
          <QueueInfo label="Sinh viên" value={task.application.student.fullName} />
          <QueueInfo label="Tiêu chí" value={getCriterionLabel(task.criterion)} />
          <QueueInfo label="Dữ liệu chính" value={primaryData} />
          <QueueInfo label="Số tài liệu" value={`${documentCount} tệp`} />
        </div>

        {action === "accepted" ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Cán bộ đang xác nhận tiêu chí này ở {getLevelLabel(task.application.targetLevel)}. Kết quả cuối toàn hồ sơ sẽ do cấp quản lý/hội đồng tổng hợp.
            </div>
            <QueueField label="Ghi chú">
              <textarea
                className="mt-2 min-h-[88px] w-full rounded-lg border border-[rgba(15,23,42,0.12)] bg-white px-3 py-2 text-sm"
                placeholder="Có thể ghi thêm căn cứ xác nhận nếu cần."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </QueueField>
          </div>
        ) : null}

        {action === "rejected" ? (
          <div className="space-y-4">
            <QueueField label="Mẫu lý do">
              <select
                className="mt-2 h-10 w-full rounded-lg border border-[rgba(15,23,42,0.12)] bg-white px-3 text-sm"
                value={reasonTemplate}
                onChange={(event) => setReasonTemplate(event.target.value)}
              >
                <option value="">Chọn lý do không đạt</option>
                {queueRejectionReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </QueueField>
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
              Nếu tiêu chí này không đạt, hồ sơ có thể không đủ điều kiện cho {getLevelLabel(task.application.targetLevel)}.
            </div>
            <QueueField label="Ghi chú bắt buộc">
              <textarea
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[rgba(15,23,42,0.12)] bg-white px-3 py-2 text-sm"
                placeholder="Ghi rõ căn cứ không đạt để sinh viên và cấp xét theo dõi."
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </QueueField>
          </div>
        ) : null}

        {action === "supplement_required" ? (
          <div className="space-y-4">
            <QueueChecklistField selected={supplementItems} onChange={setSupplementItems} />
            <QueueField label="Nội dung gửi sinh viên">
              <textarea
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[rgba(15,23,42,0.12)] bg-white px-3 py-2 text-sm"
                placeholder="Ví dụ: Sinh viên đã nhập dữ liệu nhưng chưa tải chứng chỉ hoặc giấy xác nhận."
                value={supplementContent}
                onChange={(event) => setSupplementContent(event.target.value)}
              />
            </QueueField>
            <QueueField label="Deadline bổ sung">
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[rgba(15,23,42,0.12)] bg-white px-3 text-sm"
                type="date"
                value={supplementDeadline}
                onChange={(event) => setSupplementDeadline(event.target.value)}
              />
            </QueueField>
            <QueueEvidenceSelection evidences={relatedEvidences} selectedIds={selectedEvidenceIds} onChange={setSelectedEvidenceIds} />
            <div className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800">
              Khi xác nhận, hệ thống chuyển tác vụ sang Cần bổ sung, gửi thông báo cho sinh viên và ghi lịch sử xử lý.
            </div>
          </div>
        ) : null}

        {action === "resolution_needed" ? (
          <div className="space-y-4">
            <QueueField label="Lý do chuyển">
              <select
                className="mt-2 h-10 w-full rounded-lg border border-[rgba(15,23,42,0.12)] bg-white px-3 text-sm"
                value={resolutionReason}
                onChange={(event) => setResolutionReason(event.target.value)}
              >
                <option value="">Chọn lý do chuyển hội ý</option>
                {queueResolutionReasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
              </select>
            </QueueField>
            <QueueField label="Tóm tắt vấn đề">
              <textarea
                className="mt-2 min-h-[96px] w-full rounded-lg border border-[rgba(15,23,42,0.12)] bg-white px-3 py-2 text-sm"
                placeholder="Tóm tắt điểm cần hội ý, dữ liệu đang mâu thuẫn hoặc tài liệu cần xác minh."
                value={resolutionSummary}
                onChange={(event) => setResolutionSummary(event.target.value)}
              />
            </QueueField>
            <QueueEvidenceSelection evidences={relatedEvidences} selectedIds={selectedEvidenceIds} onChange={setSelectedEvidenceIds} />
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Khi xác nhận, tác vụ được chuyển hội ý và ghi lịch sử xử lý.
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button disabled={isPending} type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button className={getQueueDecisionConfirmButtonClass(action)} disabled={confirmDisabled} type="button" onClick={handleConfirm}>
            {isPending ? "Đang xử lý..." : getQueueDecisionConfirmLabel(action)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QueueField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block text-sm font-semibold text-[#0F172A]">
      {label}
      {children}
    </label>
  );
}

function QueueChecklistField({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-[#0F172A]">Nội dung cần bổ sung</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {queueSupplementChecklist.map((item) => {
          const checked = selected.includes(item);
          return (
            <label className="flex items-center gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2 text-sm" key={item}>
              <input
                checked={checked}
                type="checkbox"
                onChange={() =>
                  onChange(checked ? selected.filter((value) => value !== item) : [...selected, item])
                }
              />
              {item}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function QueueEvidenceSelection({
  evidences,
  selectedIds,
  onChange,
}: {
  evidences: NonNullable<ReviewTaskDetail["evidences"]>;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (!evidences.length) return null;
  return (
    <div>
      <div className="text-sm font-semibold text-[#0F172A]">Tài liệu liên quan</div>
      <div className="mt-2 space-y-2">
        {evidences.map((evidence) => {
          const checked = selectedIds.includes(evidence.id);
          return (
            <label className="flex items-start gap-2 rounded-lg bg-[#F8FAFC] px-3 py-2 text-sm" key={evidence.id}>
              <input
                checked={checked}
                type="checkbox"
                onChange={() =>
                  onChange(checked ? selectedIds.filter((id) => id !== evidence.id) : [...selectedIds, evidence.id])
                }
              />
              <span>
                <span className="font-semibold text-[#0F172A]">{evidence.evidenceName || "Tài liệu hồ sơ"}</span>
                <span className="block text-xs text-[#475569]">{getCriterionLabel(evidence.criterion)} · {evidence.files?.length ?? 0} tệp</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function OfficerApplicationQueue({
  groups,
  isLoading,
  onClaimTask,
  onOpenTask,
}: {
  groups: OfficerApplicationGroup[];
  isLoading: boolean;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onOpenTask: (taskId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed p-8 text-sm text-muted-foreground">
        Đang tải hàng chờ hồ sơ...
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <div className="font-semibold text-brand-deep">Chưa có hồ sơ trong nhóm này</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Thử đổi tab hoặc bộ lọc để xem các hồ sơ khác trong phạm vi của bạn.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <OfficerApplicationCard
          group={group}
          key={group.applicationId}
          onClaimTask={onClaimTask}
          onOpenTask={onOpenTask}
        />
      ))}
    </div>
  );
}

function OfficerApplicationCard({
  group,
  onClaimTask,
  onOpenTask,
}: {
  group: OfficerApplicationGroup;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const assignedCount = group.tasks.filter((task) => task.permissions?.reason === "assigned_to_you").length;
  const completedCount = group.tasks.filter((task) => isCompletedTask(task)).length;
  const nextClaimableTask = group.claimableTasks[0];

  return (
    <article className="rounded-md bg-[var(--surface-muted)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={group.actionableTasks.length ? "default" : group.claimableTasks.length ? "outline" : "secondary"}>
              {getApplicationWorkBadge(group)}
            </Badge>
            <Badge variant="outline">{getLevelLabel(group.targetLevel)}</Badge>
            <Badge variant="outline">{group.schoolYear}</Badge>
          </div>
          <h3 className="mt-3 truncate text-base font-bold text-brand-deep">
            {group.studentName || "Chưa có tên sinh viên"}
          </h3>
          <div className="mt-1 text-sm text-muted-foreground">
            {[group.studentCode, group.className, group.faculty].filter(Boolean).join(" • ") || "Chưa có thông tin lớp/khoa"}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Bạn được giao {assignedCount}/{fiveGoodCriteria.length} tiêu chí trong hồ sơ này. Toàn hồ sơ đã xử lý {completedCount}/{group.tasks.length} tiêu chí.
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {nextClaimableTask ? (
            <Button size="sm" type="button" onClick={() => onClaimTask(nextClaimableTask)}>
              Mở xét duyệt
            </Button>
          ) : null}
          <Button size="sm" type="button" onClick={() => onOpenTask(group.primaryTask.id)}>
            {getApplicationActionLabel(group)}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {fiveGoodCriteria.map((criterion) => {
          const task = group.tasks.find((item) => item.criterion === criterion);
          return <CriterionTaskChip criterion={criterion} key={criterion} task={task} />;
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Cập nhật: {formatDateTime(group.updatedAt)}</span>
        <span>Deadline gần nhất: {formatDateTime(group.dueDate)}</span>
        {group.readonlyTasks.length ? <span>{group.readonlyTasks.length} tiêu chí chỉ xem</span> : null}
      </div>
    </article>
  );
}

function CriterionTaskChip({ criterion, task }: { criterion: Criterion; task?: ReviewTaskListItem }) {
  if (!task) {
    return (
      <div className="rounded-md bg-white/70 p-3">
        <div className="text-sm font-semibold text-brand-deep">{getCriterionLabel(criterion)}</div>
        <div className="mt-1 text-xs text-muted-foreground">Chưa có task</div>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-white/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-brand-deep">{getCriterionLabel(criterion)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{getCriterionPermissionLabel(task)}</div>
        </div>
        <Badge variant={getTaskStatusBadgeVariant(task)}>{getTaskStatusLabel(task.status)}</Badge>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {task.evidenceCount ?? 0} giấy xác nhận • Độ rõ: {formatConfidence(task.aiConfidence)}
      </div>
    </div>
  );
}

function QueueCriteriaSummaryTable({
  activeDetail,
  activeTask,
  group,
  onSelectCriterion,
}: {
  activeDetail: ReviewTaskDetail | null;
  activeTask: ReviewTaskListItem;
  group: OfficerApplicationGroup;
  onSelectCriterion: (criterion: Criterion) => void;
}) {
  return (
    <div className="responsive-scroll rounded-lg bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.05)]">
      <table className="min-w-[860px] w-full text-left text-sm">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#475569]">
          <tr>
            <th className="px-3 py-2">Tiêu chí</th>
            <th className="px-3 py-2">Dữ liệu chính</th>
            <th className="px-3 py-2">Tài liệu/giấy xác nhận</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Quyền</th>
            <th className="px-3 py-2">Việc cần làm</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[rgba(15,23,42,0.08)]">
          {fiveGoodCriteria.map((criterion) => {
            const task = group.tasks.find((item) => item.criterion === criterion);
            const isActive = activeTask.criterion === criterion;
            const metrics = isActive ? getCriterionDetailMetrics(activeDetail, criterion) : [];
            const evidences = isActive ? getCriterionDetailEvidences(activeDetail, criterion) : [];
            const fileCount = isActive
              ? evidences.reduce((sum, evidence) => sum + (evidence.files?.length ?? 0), 0)
              : task?.evidenceCount ?? 0;
            return (
              <tr key={criterion} className={isActive ? "bg-[#EAF3FF]" : "hover:bg-[#F8FAFC]"}>
                <td className="px-3 py-3">
                  <button className="font-semibold text-[#0F172A] hover:underline" type="button" onClick={() => onSelectCriterion(criterion)}>
                    {getCriterionLabel(criterion)}
                  </button>
                </td>
                <td className="px-3 py-3 text-[#475569]">{getQueuePrimaryDataText(metrics, criterion)}</td>
                <td className="px-3 py-3 font-semibold text-[#0F172A]">{fileCount} tệp</td>
                <td className="px-3 py-3"><Badge variant={task ? getTaskStatusBadgeVariant(task) : "secondary"}>{task ? getTaskStatusLabel(task.status) : "Chỉ xem"}</Badge></td>
                <td className="px-3 py-3 text-[#475569]">{task ? getCriterionPermissionLabel(task) : "Chỉ xem"}</td>
                <td className="px-3 py-3 text-[#475569]">{getQueueNextAction(task, metrics.length, fileCount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CriterionSummaryPanel({
  detail,
  hasFile,
  metrics,
  task,
}: {
  detail: ReviewTaskDetail | null;
  hasFile: boolean;
  metrics: ReviewTaskDetail["metrics"];
  task: ReviewTaskListItem;
}) {
  return (
    <section className="rounded-lg bg-[#F8FAFC] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">{getCriterionLabel(task.criterion)} · {getLevelLabel(task.targetLevel)}</h3>
          <p className="mt-1 text-sm text-[#475569]">
            {getCriterionSummarySentence(task, metrics, hasFile)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={getTaskStatusBadgeVariant(task)}>{getTaskStatusLabel(task.status)}</Badge>
          <Badge variant={task.permissions?.canAct ? "default" : task.permissions?.canClaim ? "outline" : "secondary"}>
            {getCriterionPermissionLabel(task)}
          </Badge>
        </div>
      </div>
      {detail?.criterionLevelAssessment?.suggestedCriterionLevel ? (
        <div className="mt-3 text-sm text-[#475569]">
          Gợi ý cấp phù hợp: <span className="font-semibold text-[#0F172A]">{getLevelLabel(detail.criterionLevelAssessment.suggestedCriterionLevel)}</span>
        </div>
      ) : null}
    </section>
  );
}

function EvidenceWorkspacePanel({
  activeCriterion,
  allEvidences,
  evidences,
  evidenceAssessments,
  isLoading,
  metrics,
  onEvidenceAssessmentChange,
  onRequestSupplement,
  onSelectCriterion,
}: {
  activeCriterion: Criterion;
  allEvidences: NonNullable<ReviewTaskDetail["evidences"]>;
  evidences: NonNullable<ReviewTaskDetail["evidences"]>;
  evidenceAssessments: Record<string, QueueEvidenceAssessmentValue>;
  isLoading: boolean;
  metrics: ReviewTaskDetail["metrics"];
  onEvidenceAssessmentChange: (evidenceId: string, assessment: QueueEvidenceAssessmentValue) => void;
  onRequestSupplement?: () => void;
  onSelectCriterion: (criterion: Criterion) => void;
}) {
  const hasFiles = evidences.some((evidence) => evidence.files?.length);
  const criterionLabel = getCriterionLabel(activeCriterion);
  const otherEvidencesWithFiles = allEvidences.filter(
    (evidence) => evidence.criterion !== activeCriterion && evidence.files?.length,
  );

  return (
    <section className="rounded-lg border border-[rgba(15,23,42,0.08)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#0F172A]">Tài liệu / giấy xác nhận</h3>
          <p className="mt-1 text-sm text-[#475569]">{criterionLabel}</p>
        </div>
        <Badge variant="outline">{evidences.reduce((sum, evidence) => sum + (evidence.files?.length ?? 0), 0)} tệp</Badge>
      </div>
      {isLoading ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-[#475569]">Đang tải tài liệu...</div>
      ) : hasFiles ? (
        <div className="space-y-4">
          {evidences.map((evidence) => (
            <QueueEvidenceCard
              assessment={evidenceAssessments[evidence.id] ?? null}
              evidence={evidence}
              key={evidence.id}
              onAssessmentChange={onEvidenceAssessmentChange}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed bg-[#F8FAFC] p-4">
            <div className="font-semibold text-[#0F172A]">
              {metrics.length ? "Chưa có tệp xác nhận cho " + criterionLabel + "." : "Sinh viên chưa cung cấp dữ liệu hoặc tài liệu cho tiêu chí này."}
            </div>
            <p className="mt-1 text-sm text-[#475569]">
              {metrics.length
                ? "Sinh viên đã nhập " + getQueuePrimaryDataText(metrics, activeCriterion) + " nhưng chưa tải chứng chỉ hoặc giấy xác nhận."
                : "Cán bộ có thể yêu cầu sinh viên bổ sung thông tin và tài liệu liên quan."}
            </p>
            {onRequestSupplement ? (
              <Button className="mt-3" type="button" onClick={onRequestSupplement}>
                {metrics.length ? "Yêu cầu bổ sung tệp xác nhận" : "Yêu cầu bổ sung thông tin"}
              </Button>
            ) : null}
          </div>

          {otherEvidencesWithFiles.length ? (
            <div className="rounded-lg border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <div className="font-semibold text-[#0F172A]">Tài liệu khác trong hồ sơ</div>
              <p className="mt-1 text-sm text-[#475569]">
                Tiêu chí {criterionLabel} chưa có tệp riêng. Các tài liệu dưới đây thuộc tiêu chí khác trong cùng hồ sơ.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {otherEvidencesWithFiles.map((evidence) => (
                  <button
                    className="rounded-lg border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] p-3 text-left text-sm transition hover:bg-[#EAF3FF]"
                    key={evidence.id}
                    type="button"
                    onClick={() => onSelectCriterion(evidence.criterion)}
                  >
                    <div className="font-semibold text-[#0F172A]">{evidence.evidenceName || "Tài liệu hồ sơ"}</div>
                    <div className="mt-1 text-xs text-[#475569]">
                      {getCriterionLabel(evidence.criterion)} · {evidence.files?.length ?? 0} tệp
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function QueueEvidenceCard({
  assessment,
  evidence,
  onAssessmentChange,
}: {
  assessment: QueueEvidenceAssessmentValue | null;
  evidence: NonNullable<ReviewTaskDetail["evidences"]>[number];
  onAssessmentChange: (evidenceId: string, assessment: QueueEvidenceAssessmentValue) => void;
}) {
  const fields = toQueueFieldEntries(evidence.card?.extractedFieldsJson);
  const warnings = toQueueReadableList(evidence.card?.warningsJson);
  const markDocument = (nextMark: QueueEvidenceAssessmentValue) => {
    onAssessmentChange(evidence.id, nextMark);
    const labels = {
      valid: "Đã đánh dấu tài liệu phù hợp.",
      ambiguous: "Đã đánh dấu tài liệu cần xem lại.",
      invalid: "Đã đánh dấu không dùng tài liệu này cho tiêu chí.",
    };
    toast.success(labels[nextMark]);
  };

  return (
    <div className="rounded-lg border border-[rgba(15,23,42,0.08)] p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-[#F8FAFC] p-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-[#475569]">Đánh dấu tài liệu</span>
        <Button
          size="sm"
          type="button"
          variant={assessment === "valid" ? "default" : "outline"}
          onClick={() => markDocument("valid")}
        >
          Phù hợp
        </Button>
        <Button
          size="sm"
          type="button"
          variant={assessment === "ambiguous" ? "secondary" : "outline"}
          onClick={() => markDocument("ambiguous")}
        >
          Cần xem lại
        </Button>
        <Button
          size="sm"
          type="button"
          variant={assessment === "invalid" ? "destructive" : "outline"}
          onClick={() => markDocument("invalid")}
        >
          Không dùng cho tiêu chí này
        </Button>
        <Button size="sm" variant="outline" type="button">So với tiêu chí</Button>
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(min(100%,240px),360px)_minmax(0,1fr)]">
        <div className="space-y-2">
          {evidence.files?.length ? evidence.files.map((file) => <QueueFilePreview file={file} key={file.id} />) : (
            <div className="rounded-[14px] border border-dashed p-4 text-sm text-[#475569]">Mục này chưa có tệp đính kèm.</div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <h4 className="font-bold text-[#0F172A]">{evidence.evidenceName || "Tài liệu hồ sơ"}</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{getCriterionLabel(evidence.criterion)}</Badge>
              <Badge variant="secondary">{getTaskStatusLabel(evidence.status)}</Badge>
              {typeof evidence.confidence === "number" ? <Badge variant="outline">Độ rõ {formatConfidence(evidence.confidence)}</Badge> : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <QueueInfo label="Ngày ghi nhận" value={formatDateTime(evidence.createdAt)} />
            <QueueInfo label="Đơn vị cấp" value={evidence.event?.organizer} />
            <QueueInfo label="Cấp tổ chức" value={evidence.event?.organizerLevel ? getLevelLabel(evidence.event.organizerLevel) : undefined} />
            <QueueInfo label="Loại tài liệu" value={getSourceTypeQueueLabel(evidence.sourceType)} />
          </div>
          {fields.length ? (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[#475569]">Thông tin đọc được</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {fields.map(([key, value]) => <QueueInfo key={key} label={key} value={String(value)} />)}
              </div>
            </div>
          ) : null}
          {warnings.length ? (
            <div className="rounded-[14px] border border-amber-200 bg-[#FFF7E6] p-3 text-sm text-amber-900">
              <div className="font-semibold">Cần kiểm tra thêm</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {warnings.map((warning, index) => <li key={warning + "-" + index}>{warning}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function QueueFilePreview({ file }: { file: NonNullable<NonNullable<ReviewTaskDetail["evidences"]>[number]["files"]>[number] }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(file.url ?? null);
  const [loadingAction, setLoadingAction] = useState<"preview" | "open" | "download" | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (previewUrl || !file.id) return;
    let active = true;
    reviewApi.getSignedFileUrl(file.id)
      .then((response) => {
        if (active && response.data?.url) setPreviewUrl(response.data.url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [file.id, previewUrl]);

  const openFile = async (action: "preview" | "open" | "download") => {
    setLoadingAction(action);
    try {
      const response = await reviewApi.getSignedFileUrl(file.id);
      const url = response.data?.url ?? previewUrl;
      if (url) {
        setPreviewUrl(url);
        if (action === "preview") {
          setPreviewOpen(true);
        } else {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở tài liệu.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white">
        <div className="flex min-h-[220px] items-center justify-center bg-[#F8FAFC]">
          {previewUrl && file.mimeType?.startsWith("image/") ? (
            <img alt={file.originalName} className="max-h-[340px] w-full object-contain" src={previewUrl} />
          ) : previewUrl && file.mimeType === "application/pdf" ? (
            <iframe className="h-[340px] w-full" src={previewUrl} title={file.originalName} />
          ) : (
            <div className="p-4 text-center text-sm text-[#475569]">
              <FileText className="mx-auto mb-2 h-8 w-8" />
              Chưa tải được preview.
            </div>
          )}
        </div>
        <div className="border-t border-[rgba(15,23,42,0.08)] p-3">
          <div className="truncate text-sm font-semibold text-[#0F172A]">{file.originalName || "Tệp đính kèm"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" type="button" disabled={Boolean(loadingAction)} onClick={() => void openFile("preview")}><Eye className="h-4 w-4" /> Xem lớn</Button>
            <Button size="sm" variant="outline" type="button" disabled={Boolean(loadingAction)} onClick={() => void openFile("open")}><ExternalLink className="h-4 w-4" /> Mở</Button>
            <Button size="sm" variant="outline" type="button" disabled={Boolean(loadingAction)} onClick={() => void openFile("download")}><Download className="h-4 w-4" /> Tải xuống</Button>
          </div>
        </div>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[94vh] max-w-[min(96vw,1280px)] overflow-hidden p-0">
          <div className="grid max-h-[94vh] min-h-[72vh] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-h-0 bg-[#0F172A] p-3">
              {previewUrl && file.mimeType?.startsWith("image/") ? (
                <img alt={file.originalName} className="h-full max-h-[88vh] w-full object-contain" src={previewUrl} />
              ) : previewUrl && file.mimeType === "application/pdf" ? (
                <iframe className="h-[88vh] w-full rounded-lg bg-white" src={previewUrl} title={file.originalName} />
              ) : (
                <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg bg-white text-sm text-[#475569]">
                  Chưa tải được preview tài liệu.
                </div>
              )}
            </div>
            <aside className="space-y-4 overflow-y-auto border-l border-[rgba(15,23,42,0.08)] bg-white p-4">
              <DialogHeader>
                <DialogTitle className="text-base">{file.originalName || "Tệp đính kèm"}</DialogTitle>
                <DialogDescription>Đọc nhanh tài liệu mà không rời khỏi màn xét duyệt.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <QueueInfo label="Loại tệp" value={file.mimeType} />
                <QueueInfo label="Ngày tải lên" value={formatDateTime(file.createdAt)} />
              </div>
              <div className="grid gap-2">
                <Button type="button" variant="outline" onClick={() => toast.success("Đã đánh dấu tài liệu phù hợp.")}>Phù hợp</Button>
                <Button type="button" variant="outline" onClick={() => toast.success("Đã đánh dấu tài liệu cần xem lại.")}>Cần xem lại</Button>
                <Button type="button" variant="outline" onClick={() => toast.success("Đã đánh dấu không dùng tài liệu này cho tiêu chí.")}>Không dùng cho tiêu chí này</Button>
                <Button type="button" variant="outline" onClick={() => void openFile("download")}><Download className="h-4 w-4" /> Tải xuống</Button>
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DataMatchPanel({
  activeCriterion,
  detail,
  evidences,
}: {
  activeCriterion: Criterion;
  detail: ReviewTaskDetail | null;
  evidences: NonNullable<ReviewTaskDetail["evidences"]>;
}) {
  const metrics = getCriterionDetailMetrics(detail, activeCriterion);
  const hasFile = evidences.some((evidence) => evidence.files?.length);
  return (
    <section className="rounded-lg border border-[rgba(15,23,42,0.08)] p-4">
      <h3 className="font-bold text-[#0F172A]">Dữ liệu đối chiếu</h3>
      {metrics.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {metrics.map((metric) => (
            <div className="space-y-2 rounded-[14px] bg-[#F8FAFC] p-3" key={metric.id}>
              <QueueInfo label="Loại dữ liệu" value={getQueueMetricLabel(metric.metricType)} />
              <QueueInfo label="Giá trị" value={String(metric.value) + (metric.unit ? " " + metric.unit : "")} />
              <QueueInfo label="Nguồn" value="Sinh viên nhập" />
              <QueueInfo label="Tệp xác nhận" value={hasFile ? "Đã có" : "Chưa có"} />
              <QueueInfo label="Trạng thái kiểm tra" value={hasFile ? "Cần cán bộ xác nhận" : "Thiếu tệp xác nhận"} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-[14px] border border-dashed p-4 text-sm text-[#475569]">
          Sinh viên chưa nhập dữ liệu cho tiêu chí này.
        </div>
      )}
    </section>
  );
}

function CriterionChecklistPanel({ detail, task }: { detail: ReviewTaskDetail | null; task: ReviewTaskListItem }) {
  const targetLevel = detail?.application.targetLevel ?? task.targetLevel;
  const checklist =
    detail?.checklist?.length
      ? detail.checklist
      : detail?.criterionLevelAssessment?.levels
          ?.find((level) => level.level === targetLevel)
          ?.requirements.map((requirement) => ({
            id: requirement.key,
            label: requirement.label,
            passed: requirement.status === "passed",
            required: true,
            note: requirement.reason ?? requirement.actualValue ?? requirement.requiredValue,
          })) ?? [];
  const otherLevels = detail?.criterionLevelAssessment?.levels?.filter((level) => level.level !== targetLevel) ?? [];

  return (
    <section className="rounded-lg border border-[rgba(15,23,42,0.08)] p-4">
      <h3 className="font-bold text-[#0F172A]">Checklist {getLevelLabel(targetLevel)}</h3>
      {checklist.length ? (
        <div className="mt-3 space-y-2">
          {checklist.map((item) => (
            <div className="flex items-start justify-between gap-3 rounded-[14px] bg-[#F8FAFC] p-3" key={item.id}>
              <div>
                <div className="text-sm font-semibold text-[#0F172A]">{item.label}</div>
                {item.note ? <div className="mt-1 text-xs text-[#475569]">{String(item.note)}</div> : null}
              </div>
              <Badge variant={item.passed ? "default" : item.passed === false ? "outline" : "secondary"}>
                {item.passed ? "Đạt" : item.passed === false ? "Cần bổ sung" : "Cần cán bộ xác nhận"}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-[14px] border border-dashed p-4 text-sm text-[#475569]">Chưa có checklist cho cấp đang xét.</div>
      )}
      {otherLevels.length ? (
        <div className="mt-3 space-y-2">
          {otherLevels.map((level) => (
            <details className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-[#F8FAFC] p-3" key={level.level}>
              <summary className="cursor-pointer text-sm font-semibold text-[#0F172A]">Xem điều kiện cấp {getLevelLabel(level.level)}</summary>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#475569]">
                {level.requirements.map((requirement) => <li key={requirement.key}>{requirement.label}</li>)}
              </ul>
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QueueInfo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-[#475569]">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-[#0F172A]">{value || "Chưa có dữ liệu"}</div>
    </div>
  );
}

function PriorityTaskCard({
  item,
  onClaim,
  onOpen,
}: {
  item: ReviewTaskListItem;
  onClaim: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getPriorityBadgeVariant(item.priorityReason)}>
              {getPriorityReasonLabel(item)}
            </Badge>
            <Badge variant="outline">{getTaskStatusLabel(item.status)}</Badge>
          </div>
          <div className="mt-3 font-semibold text-brand-deep">
            {item.studentName || "Chưa có tên sinh viên"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {[item.studentCode, item.className, item.faculty].filter(Boolean).join(" • ") || "Chưa có thông tin lớp/khoa"}
          </div>
          <div className="mt-2 text-sm">
            {getCriterionLabel(item.criterion)} • {getLevelLabel(item.targetLevel)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Deadline: {formatDateTime(item.dueDate)} • Độ rõ: {formatConfidence(item.aiConfidence)}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {item.permissions?.canClaim ? (
            <Button size="sm" type="button" onClick={onClaim}>
              Mở xét duyệt
            </Button>
          ) : null}
          <Button size="sm" type="button" variant="outline" onClick={onOpen}>
            {getTaskActionLabel(item)}
          </Button>
        </div>
      </div>
      {item.permissions?.reasonLabel ? (
        <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {item.permissions.reasonLabel}
        </div>
      ) : null}
    </div>
  );
}

function filterOfficerTasks(items: ReviewTaskListItem[], tab: QueueTab) {
  if (tab === "actionable") {
    return items.filter((item) => item.permissions?.canAct);
  }
  if (tab === "claimable") {
    return items.filter((item) => item.permissions?.canClaim);
  }
  if (tab === "mine") {
    return items.filter((item) => item.permissions?.reason === "assigned_to_you");
  }
  if (tab === "supplement") {
    return items.filter((item) => item.status === "supplement_required");
  }
  if (tab === "readonly") {
    return items.filter((item) => item.permissions?.canView && !item.permissions.canAct && !item.permissions.canClaim);
  }
  return items;
}

function sortQueueItems(items: ReviewTaskListItem[], sortBy: QueueSort) {
  const list = [...items];
  const dateValue = (value?: string | null) => (value ? new Date(value).getTime() : 0);
  const text = (value?: string | null) => value ?? "";
  if (sortBy === "oldest") return list.sort((a, b) => dateValue(a.createdAt ?? a.updatedAt) - dateValue(b.createdAt ?? b.updatedAt));
  if (sortBy === "student_name") return list.sort((a, b) => text(a.studentName).localeCompare(text(b.studentName), "vi"));
  if (sortBy === "student_code") return list.sort((a, b) => text(a.studentCode).localeCompare(text(b.studentCode), "vi"));
  if (sortBy === "criterion") return list.sort((a, b) => text(a.criterion).localeCompare(text(b.criterion), "vi"));
  if (sortBy === "status") return list.sort((a, b) => text(a.status).localeCompare(text(b.status), "vi"));
  if (sortBy === "review_need") return list.sort((a, b) => getPriorityWeight(a) - getPriorityWeight(b));
  if (sortBy === "deadline") return list.sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate));
  if (sortBy === "level") return list.sort((a, b) => text(a.targetLevel).localeCompare(text(b.targetLevel), "vi"));
  if (sortBy === "evidence_count") return list.sort((a, b) => (b.evidenceCount ?? 0) - (a.evidenceCount ?? 0));
  return list.sort((a, b) => dateValue(b.createdAt ?? b.updatedAt) - dateValue(a.createdAt ?? a.updatedAt));
}

function sortQueueGroups(groups: OfficerApplicationGroup[], sortBy: QueueSort) {
  const list = [...groups];
  const dateValue = (value?: string | null) => (value ? new Date(value).getTime() : 0);
  const text = (value?: string | null) => value ?? "";
  if (sortBy === "oldest") return list.sort((a, b) => dateValue(a.updatedAt) - dateValue(b.updatedAt));
  if (sortBy === "student_name") return list.sort((a, b) => text(a.studentName).localeCompare(text(b.studentName), "vi"));
  if (sortBy === "student_code") return list.sort((a, b) => text(a.studentCode).localeCompare(text(b.studentCode), "vi"));
  if (sortBy === "criterion") return list.sort((a, b) => text(a.primaryTask.criterion).localeCompare(text(b.primaryTask.criterion), "vi"));
  if (sortBy === "status") return list.sort((a, b) => text(a.applicationStatus).localeCompare(text(b.applicationStatus), "vi"));
  if (sortBy === "review_need") return list.sort((a, b) => getPriorityWeight(a.primaryTask) - getPriorityWeight(b.primaryTask));
  if (sortBy === "deadline") return list.sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate));
  if (sortBy === "level") return list.sort((a, b) => text(a.targetLevel).localeCompare(text(b.targetLevel), "vi"));
  if (sortBy === "evidence_count") {
    return list.sort(
      (a, b) =>
        b.tasks.reduce((sum, task) => sum + (task.evidenceCount ?? 0), 0) -
        a.tasks.reduce((sum, task) => sum + (task.evidenceCount ?? 0), 0),
    );
  }
  return list.sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
}

function groupOfficerApplications(items: ReviewTaskListItem[]): OfficerApplicationGroup[] {
  const groups = new Map<string, ReviewTaskListItem[]>();

  for (const item of items) {
    const key = item.applicationId || item.id;
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([applicationId, tasks]) => {
      const sortedTasks = [...tasks].sort((a, b) => getPriorityWeight(a) - getPriorityWeight(b));
      const first = sortedTasks[0];
      const actionableTasks = sortedTasks.filter((task) => task.permissions?.canAct);
      const claimableTasks = sortedTasks.filter((task) => task.permissions?.canClaim);
      const readonlyTasks = sortedTasks.filter(
        (task) => task.permissions?.canView && !task.permissions.canAct && !task.permissions.canClaim,
      );
      const primaryTask = actionableTasks[0] ?? claimableTasks[0] ?? sortedTasks[0];
      const dueDate = sortedTasks
        .map((task) => task.dueDate)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
      const updatedAt = sortedTasks
        .map((task) => task.updatedAt)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? first.updatedAt;

      return {
        applicationId,
        studentName: first.studentName,
        studentCode: first.studentCode,
        faculty: first.faculty,
        className: first.className,
        schoolYear: first.schoolYear,
        targetLevel: first.targetLevel,
        applicationStatus: first.applicationStatus,
        tasks: sortedTasks,
        actionableTasks,
        claimableTasks,
        readonlyTasks,
        primaryTask,
        dueDate,
        updatedAt,
      };
    })
    .sort((a, b) => getPriorityWeight(a.primaryTask) - getPriorityWeight(b.primaryTask));
}

function getDefaultCriterionForGroup(group: OfficerApplicationGroup | null): Criterion | null {
  if (!group) return null;
  const orderedTasks = [...group.tasks].sort((a, b) => getPriorityWeight(a) - getPriorityWeight(b));
  const actionable = orderedTasks.find((task) => task.permissions?.canAct && isOpenTask(task));
  const claimable = orderedTasks.find((task) => task.permissions?.canClaim && isOpenTask(task));
  const visible = orderedTasks.find((task) => task.permissions?.canView);
  return (actionable ?? claimable ?? visible ?? orderedTasks[0])?.criterion ?? null;
}

function getNextActionableCriterion(group: OfficerApplicationGroup, currentCriterion: Criterion): Criterion | null {
  const currentIndex = fiveGoodCriteria.indexOf(currentCriterion);
  const orderedCriteria =
    currentIndex >= 0
      ? [...fiveGoodCriteria.slice(currentIndex + 1), ...fiveGoodCriteria.slice(0, currentIndex)]
      : fiveGoodCriteria;

  return (
    orderedCriteria.find((criterion) => {
      const task = group.tasks.find((item) => item.criterion === criterion);
      return task?.permissions?.canAct && isOpenTask(task);
    }) ?? null
  );
}

function isQueueDecisionReady(
  action: QueueDecisionAction | null,
  values: {
    note: string;
    reasonTemplate: string;
    supplementItems: string[];
    supplementContent: string;
    supplementDeadline: string;
    resolutionReason: string;
    resolutionSummary: string;
  },
) {
  if (!action) return false;
  if (action === "accepted") return true;
  if (action === "rejected") return Boolean(values.reasonTemplate && values.note.trim());
  if (action === "supplement_required") {
    return Boolean(values.supplementItems.length && values.supplementContent.trim() && values.supplementDeadline);
  }
  return Boolean(values.resolutionReason && values.resolutionSummary.trim());
}

function toQueueEvidenceAssessmentsPayload(assessments: Record<string, QueueEvidenceAssessmentValue>) {
  return Object.entries(assessments).map(([evidenceId, assessment]) => ({
    evidenceId,
    assessment,
    tags: assessment === "invalid" ? ["not_for_this_criterion"] : undefined,
  }));
}

function buildQueueSupplementNote(items: string[], content: string) {
  return [items.length ? `Cần bổ sung: ${items.join(", ")}` : "", content.trim()].filter(Boolean).join(". ");
}

function getQueueDecisionModalTitle(action: QueueDecisionAction | null) {
  if (action === "accepted") return "Đạt tiêu chí";
  if (action === "rejected") return "Không đạt";
  if (action === "supplement_required") return "Yêu cầu bổ sung";
  if (action === "resolution_needed") return "Chuyển hội ý";
  return "Kết luận xét duyệt";
}

function getQueueDecisionConfirmLabel(action: QueueDecisionAction | null) {
  if (action === "accepted") return "Xác nhận đạt";
  if (action === "rejected") return "Xác nhận không đạt";
  if (action === "supplement_required") return "Gửi yêu cầu bổ sung";
  if (action === "resolution_needed") return "Chuyển hội ý";
  return "Xác nhận";
}

function getQueueDecisionConfirmButtonClass(action: QueueDecisionAction | null) {
  if (action === "accepted") return "bg-emerald-600 text-white hover:bg-emerald-700";
  if (action === "rejected") return "bg-rose-600 text-white hover:bg-rose-700";
  if (action === "supplement_required") return "bg-sky-600 text-white hover:bg-sky-700";
  if (action === "resolution_needed") return "bg-amber-600 text-white hover:bg-amber-700";
  return "";
}

function getCriterionAbbreviation(criterion: Criterion) {
  const labels: Partial<Record<Criterion, string>> = {
    ethics: "DD",
    academic: "HT",
    physical: "TL",
    volunteer: "TN",
    integration: "HN",
  };
  return labels[criterion] ?? criterion.slice(0, 2).toUpperCase();
}

function getCriterionChipClass(task?: ReviewTaskListItem) {
  if (!task) return "bg-slate-100 text-slate-500";
  if (task.status === "accepted") return "bg-emerald-100 text-emerald-700";
  if (task.status === "rejected") return "bg-rose-100 text-rose-700";
  if (task.status === "supplement_required") return "bg-amber-100 text-amber-800";
  if (task.status === "resolution_needed") return "bg-violet-100 text-violet-700";
  if (task.permissions?.canAct) return "bg-blue-100 text-blue-700";
  if (task.permissions?.canClaim) return "bg-cyan-100 text-cyan-700";
  return "bg-slate-100 text-slate-600";
}

function getPriorityApplicationGroups(items: ReviewTaskListItem[]) {
  return groupOfficerApplications(items).filter((group) =>
    group.tasks.some(
      (item) =>
        isOpenTask(item) &&
        Boolean(item.priorityReason || item.permissions?.canAct || item.permissions?.canClaim),
    ),
  );
}

function getApplicationWorkBadge(group: OfficerApplicationGroup) {
  if (group.actionableTasks.length) return `${group.actionableTasks.length} tiêu chí cần xử lý`;
  if (group.claimableTasks.length) return `${group.claimableTasks.length} tiêu chí có thể nhận`;
  return "Theo dõi hồ sơ";
}

function getApplicationActionLabel(group: OfficerApplicationGroup) {
  if (group.actionableTasks.length === 1) {
    return `Mở ${getShortCriterionLabel(group.actionableTasks[0].criterion)}`;
  }
  if (group.actionableTasks.length > 1) return "Mở hồ sơ xét duyệt";
  if (group.claimableTasks.length) return "Xem hồ sơ";
  return "Xem chi tiết";
}

function getShortCriterionLabel(criterion: Criterion) {
  const labels: Partial<Record<Criterion, string>> = {
    ethics: "Đạo đức",
    academic: "Học tập",
    physical: "Thể lực",
    volunteer: "Tình nguyện",
    integration: "Hội nhập",
  };
  return labels[criterion] ?? getCriterionLabel(criterion);
}

function getCriterionPermissionLabel(task: ReviewTaskListItem) {
  if (task.permissions?.canAct) return "Được giao cho bạn";
  if (task.permissions?.canClaim) return "Có thể nhận xử lý";
  if (task.permissions?.reason === "assigned_to_other") {
    return task.assignedOfficerName ? `Đã giao ${task.assignedOfficerName}` : "Đã giao cán bộ khác";
  }
  if (task.permissions?.reason === "finalized") return "Đã có kết luận";
  if (task.permissions?.canView) return "Chỉ xem";
  return "Không thuộc phạm vi";
}

function getTaskStatusBadgeVariant(task: ReviewTaskListItem) {
  if (task.status === "accepted") return "default";
  if (task.status === "rejected") return "destructive";
  if (task.status === "supplement_required" || task.status === "resolution_needed") return "outline";
  return "secondary";
}

function isCompletedTask(task: ReviewTaskListItem) {
  return ["accepted", "rejected", "resolution_needed"].includes(task.status);
}

function getPriorityTasks(items: ReviewTaskListItem[]) {
  return [...items]
    .filter((item) => isOpenTask(item) && (item.priorityReason || item.permissions?.canAct || item.permissions?.canClaim))
    .sort((a, b) => getPriorityWeight(a) - getPriorityWeight(b));
}

function isOpenTask(item: ReviewTaskListItem) {
  return !["accepted", "rejected", "resolution_needed"].includes(item.status);
}

function getPriorityWeight(item: ReviewTaskListItem) {
  const weights: Record<NonNullable<ReviewTaskListItem["priorityReason"]>, number> = {
    overdue: 0,
    student_resubmitted: 1,
    low_ai_confidence: 2,
    due_soon: 3,
    assigned_to_you: 4,
    unassigned_claimable: 5,
  };

  if (item.priorityReason) return weights[item.priorityReason];
  if (item.permissions?.canAct) return 6;
  if (item.permissions?.canClaim) return 7;
  return 99;
}

function getPriorityReasonLabel(item: ReviewTaskListItem) {
  if (item.priorityReason === "overdue") return "Quá hạn";
  if (item.priorityReason === "student_resubmitted") return "Vừa bổ sung";
  if (item.priorityReason === "low_ai_confidence") return "Cần kiểm tra thêm";
  if (item.priorityReason === "due_soon") return "Sắp đến hạn";
  if (item.priorityReason === "assigned_to_you") return "Được giao cho bạn";
  if (item.priorityReason === "unassigned_claimable") return "Có thể nhận";
  if (item.permissions?.canAct) return "Cần xử lý";
  if (item.permissions?.canClaim) return "Có thể nhận";
  return "Theo dõi";
}

function getPriorityBadgeVariant(reason: ReviewTaskListItem["priorityReason"]) {
  if (reason === "overdue" || reason === "low_ai_confidence") return "destructive";
  if (reason === "due_soon" || reason === "student_resubmitted") return "outline";
  return "secondary";
}

function formatConfidence(value?: number | null) {
  if (value === null || value === undefined) return "Chưa có";
  if (value < 0.7) return "Cần kiểm tra";
  return "Đã đọc được";
}

function getQueueMetricLabel(metricType?: string | null) {
  const labels: Record<string, string> = {
    gpa: "GPA/ĐTB",
    conduct_score: "Điểm rèn luyện",
    physical_score: "Điểm thể lực",
    volunteer_days: "Ngày/giờ tình nguyện",
    foreign_language_score: "Chứng chỉ ngoại ngữ",
  };
  return metricType ? labels[metricType] ?? metricType : "Chưa có dữ liệu";
}

function getMetricTypesForCriterion(criterion: Criterion) {
  const map: Partial<Record<Criterion, string[]>> = {
    ethics: ["conduct_score"],
    academic: ["gpa"],
    physical: ["physical_score"],
    volunteer: ["volunteer_days"],
    integration: ["foreign_language_score"],
  };
  return map[criterion] ?? [];
}

function getCriterionDetailMetrics(detail: ReviewTaskDetail | null, criterion: Criterion) {
  const metricTypes = getMetricTypesForCriterion(criterion);
  return (detail?.metrics ?? []).filter(
    (metric) => metric.criterion === criterion || metricTypes.includes(metric.metricType),
  );
}

function getCriterionDetailEvidences(detail: ReviewTaskDetail | null, criterion: Criterion) {
  return (detail?.evidences ?? []).filter((evidence) => evidence.criterion === criterion);
}

function getQueuePrimaryDataText(metrics: ReviewTaskDetail["metrics"], criterion: Criterion) {
  if (!metrics.length) return "Chưa có dữ liệu";
  const primaryTypes = getMetricTypesForCriterion(criterion);
  const metric = metrics.find((item) => primaryTypes.includes(item.metricType)) ?? metrics[0];
  const value = String(metric.value ?? "Chưa có dữ liệu") + (metric.unit ? " " + metric.unit : "");
  return getQueueMetricLabel(metric.metricType) + " " + value;
}

function getQueueNextAction(task: ReviewTaskListItem | undefined, metricCount: number, fileCount: number) {
  if (metricCount > 0 && fileCount === 0) return "Yêu cầu tệp xác nhận";
  if (!task) return "Theo dõi nếu sinh viên bổ sung";
  if (task.status === "supplement_required") return "Chờ sinh viên bổ sung";
  if (task.permissions?.canAct) return "Đối chiếu và kết luận";
  if (task.permissions?.canClaim) return "Có thể nhận xử lý";
  return "Chỉ xem";
}

function getCriterionSummarySentence(task: ReviewTaskListItem, metrics: ReviewTaskDetail["metrics"], hasFile: boolean) {
  const dataText = getQueuePrimaryDataText(metrics, task.criterion);
  if (metrics.length && !hasFile) {
    return "Sinh viên đã nhập " + dataText + " nhưng chưa tải chứng chỉ hoặc giấy xác nhận.";
  }
  if (!metrics.length && !hasFile) {
    return "Sinh viên chưa cung cấp dữ liệu hoặc tài liệu cho tiêu chí này.";
  }
  return "Cán bộ đối chiếu tài liệu và dữ liệu trước khi lưu kết luận.";
}

function getQueueIssueSummary(task: ReviewTaskListItem) {
  if ((task.evidenceCount ?? 0) === 0 && task.aiConfidence !== null && task.aiConfidence !== undefined) {
    return "Có dữ liệu nhưng chưa có tệp xác nhận";
  }
  if ((task.evidenceCount ?? 0) === 0) return "Thiếu tệp xác nhận";
  if (task.aiConfidence !== null && task.aiConfidence !== undefined && task.aiConfidence < 0.7) {
    return "Cần cán bộ xác nhận";
  }
  return getPriorityReasonLabel(task);
}

function getApplicationStatusLabel(status: ReviewTaskListItem["applicationStatus"]) {
  const labels: Partial<Record<ReviewTaskListItem["applicationStatus"], string>> = {
    draft: "Bản nháp",
    submitted: "Đã nộp",
    under_review: "Đang xét duyệt",
    supplement_required: "Cần bổ sung",
    approved: "Đã đạt",
    rejected: "Không đạt",
  };
  return labels[status] ?? getTaskStatusLabel(status as ReviewTaskStatus);
}

function getSourceTypeQueueLabel(sourceType: NonNullable<ReviewTaskDetail["evidences"]>[number]["sourceType"]) {
  const labels: Record<string, string> = {
    metric_input: "Dữ liệu sinh viên nhập",
    manual_upload: "Tài liệu tải lên",
    event_import: "Dữ liệu từ sự kiện",
    collective_import: "Dữ liệu tập thể",
  };
  return labels[sourceType] ?? "Tài liệu hồ sơ";
}

function toQueueFieldEntries(value: unknown): Array<[string, unknown]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).filter(([, fieldValue]) => fieldValue !== null && fieldValue !== undefined && fieldValue !== "");
}

function toQueueReadableList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return String(record.message ?? record.reason ?? record.code ?? JSON.stringify(record));
    }
    return String(item);
  });
}

function getTaskActionLabel(item: ReviewTaskListItem) {
  if (item.permissions?.canAct) return "Mở xét duyệt";
  if (item.status === "supplement_required") return "Xem yêu cầu";
  return "Xem chi tiết";
}

function getCurrentListSummary(items: ReviewTaskListItem[]) {
  const countByStatus = items.reduce<Record<ReviewTaskStatus, number>>(
    (acc, item) => {
      acc[item.status] += 1;
      return acc;
    },
    {
      waiting: 0,
      reviewing: 0,
      supplement_required: 0,
      accepted: 0,
      rejected: 0,
      resolution_needed: 0,
    },
  );

  return {
    total: items.length,
    waiting: countByStatus.waiting,
    reviewing: countByStatus.reviewing,
    supplementRequired: countByStatus.supplement_required,
    accepted: countByStatus.accepted,
    rejected: countByStatus.rejected,
  };
}
