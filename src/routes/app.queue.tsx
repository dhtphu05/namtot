import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock3, FileWarning, Hourglass } from "lucide-react";
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
import { ReviewDecisionPanel } from "@/features/review/components/ReviewDecisionPanel";
import { ReviewTaskTable } from "@/features/review/components/ReviewTaskTable";
import { useClaimReviewTask, useReviewTask, useReviewTasks } from "@/features/review/hooks/useReview";
import type {
  ReviewTaskListItem,
  ReviewTaskListParams,
  ReviewTaskStatus,
  Criterion,
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
  const [activeTab, setActiveTab] = useState<QueueTab>("actionable");
  const [viewMode, setViewMode] = useState<QueueViewMode>("application");
  const [sortBy, setSortBy] = useState<QueueSort>("deadline");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion | null>(null);
  const [claimCandidate, setClaimCandidate] = useState<ReviewTaskListItem | null>(null);
  const [filters, setFilters] = useState<ReviewTaskListParams>({
    page: 1,
    limit: defaultLimit,
  });

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
        toast.success("Đã nhận xử lý task. Task đã chuyển sang danh sách của bạn.");
        setClaimCandidate(null);
      },
      onError: (error) => {
        toast.error(
          getErrorMessage(
            error,
            "Task này vừa được giao cho cán bộ khác. Bạn đang ở chế độ chỉ xem.",
          ),
        );
        setClaimCandidate(null);
      },
    });
  };

  return (
    <>
      <TopBar
        title="Hàng đợi xét duyệt"
        subtitle="Theo dõi và xử lý các hồ sơ được phân công theo từng tiêu chí Sinh viên 5 tốt."
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
              Sau khi nhận, task sẽ được giao cho bạn và bạn chịu trách nhiệm đưa quyết định.
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
    <div className="grid min-h-[720px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
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
      className={`w-full rounded-md border p-3 text-left transition ${
        isSelected ? "border-brand bg-brand/5 shadow-sm" : "bg-background hover:bg-muted/40"
      }`}
      type="button"
      onClick={() => onSelect(group)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-brand-deep">{group.studentName || "Chưa có tên sinh viên"}</div>
          <div className="mt-1 text-xs text-muted-foreground">{group.studentCode || "Chưa có MSSV"}</div>
        </div>
        <Badge variant={isSelected ? "default" : "outline"}>{getLevelLabel(group.targetLevel)}</Badge>
      </div>
      <div className="mt-2 truncate text-xs text-muted-foreground">
        {[group.className, group.faculty].filter(Boolean).join(" • ") || "Chưa có lớp/khoa"} • {group.schoolYear}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-muted/50 px-2 py-1">Giao: {assignedCount}/5</div>
        <div className="rounded bg-muted/50 px-2 py-1">Xong: {completedCount}/{group.tasks.length}</div>
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
        <span>{getPriorityReasonLabel(priorityTask)}</span>
        <span>Deadline: {formatDateTime(group.dueDate)}</span>
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
  const [evidenceMode, setEvidenceMode] = useState<EvidenceViewMode>("criterion");
  const activeTask = group
    ? group.tasks.find((task) => task.criterion === activeCriterion) ?? group.primaryTask
    : null;
  const { data: activeDetail = null, isLoading: isDetailLoading } = useReviewTask(activeTask?.id);

  useEffect(() => {
    setEvidenceMode("criterion");
  }, [activeCriterion, group?.applicationId]);

  if (!group || !activeTask) {
    return (
      <section className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Chọn một hồ sơ ở danh sách bên trái để bắt đầu xét duyệt.
      </section>
    );
  }

  const evidenceItems = activeDetail?.evidences ?? [];
  const completedCount = group.tasks.filter((task) => isCompletedTask(task)).length;
  const assignedCount = group.tasks.filter((task) => task.permissions?.reason === "assigned_to_you").length;
  const nextCriterion = getNextActionableCriterion(group, activeTask.criterion);

  return (
    <section className="rounded-md border bg-background">
      <div className="border-b p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-deep">{group.studentName || "Chưa có tên sinh viên"}</h2>
            <div className="mt-1 text-sm text-muted-foreground">
              {[group.studentCode, group.className, group.faculty].filter(Boolean).join(" • ") || "Chưa có thông tin sinh viên"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Aim {getLevelLabel(group.targetLevel)}</Badge>
            <Badge variant="outline">{group.schoolYear}</Badge>
            <Badge variant="secondary">{group.applicationStatus}</Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md bg-muted/40 p-3">Bạn được giao: <span className="font-bold">{assignedCount}/5</span></div>
          <div className="rounded-md bg-muted/40 p-3">Toàn hồ sơ đã xử lý: <span className="font-bold">{completedCount}/{group.tasks.length}</span></div>
          <div className="rounded-md bg-muted/40 p-3">Deadline gần nhất: <span className="font-bold">{formatDateTime(group.dueDate)}</span></div>
          <div className="rounded-md bg-muted/40 p-3">Trạng thái: <span className="font-bold">{getTaskStatusLabel(activeTask.status)}</span></div>
        </div>
        {completedCount === group.tasks.length && group.tasks.length > 0 ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Đã xử lý {completedCount}/{group.tasks.length} tiêu chí, chờ cấp có thẩm quyền tổng hợp/chốt.
          </div>
        ) : null}
      </div>

      <div className="border-b px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-3">
          {fiveGoodCriteria.map((criterion) => {
            const task = group.tasks.find((item) => item.criterion === criterion);
            const selected = task?.criterion === activeTask.criterion || (!task && criterion === activeCriterion);
            return (
              <button
                className={`min-w-fit rounded-md border px-3 py-2 text-sm font-semibold transition ${
                  selected ? "border-brand bg-brand/5 text-brand-deep" : "hover:bg-muted/40"
                }`}
                key={criterion}
                type="button"
                onClick={() => onSelectCriterion(criterion)}
              >
                {getCriterionLabel(criterion)}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {task ? getTaskStatusLabel(task.status) : "Chưa có task"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <CriterionSummaryPanel task={activeTask} detail={activeDetail} />
          <EvidenceWorkspacePanel
            activeCriterion={activeTask.criterion}
            evidenceMode={evidenceMode}
            evidences={evidenceItems}
            isLoading={isDetailLoading}
            onModeChange={setEvidenceMode}
            totalEvidenceCount={activeDetail?.evidences?.length ?? activeTask.evidenceCount}
          />
          <DataMatchPanel detail={activeDetail} />
        </div>

        <div className="space-y-4">
          {activeTask.permissions?.canClaim ? (
            <Card>
              <div className="text-sm font-semibold text-brand-deep">Task chưa được giao</div>
              <p className="mt-1 text-sm text-muted-foreground">{activeTask.permissions.reasonLabel}</p>
              <Button className="mt-3 w-full" type="button" onClick={() => onClaimTask(activeTask)}>
                Nhận xử lý
              </Button>
            </Card>
          ) : null}
          {activeDetail ? (
            activeTask.permissions?.canAct ? (
              <ReviewDecisionPanel
                task={activeDetail}
                submitLabel={nextCriterion ? "Lưu và sang tiêu chí tiếp theo" : "Lưu kết luận"}
                onSuccess={() => {
                  if (nextCriterion) onSelectCriterion(nextCriterion);
                }}
              />
            ) : (
              <Card>
                <div className="text-sm font-semibold text-brand-deep">Chỉ xem</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTask.permissions?.reasonLabel ?? "Bạn không có quyền gửi kết luận cho tiêu chí này."}
                </p>
                <Button className="mt-3 w-full" variant="outline" type="button" onClick={() => onOpenTask(activeTask.id)}>
                  Mở task chi tiết
                </Button>
              </Card>
            )
          ) : (
            <Card>
              <div className="text-sm text-muted-foreground">Đang tải dữ liệu tiêu chí...</div>
            </Card>
          )}
        </div>
      </div>
    </section>
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
    <article className="rounded-md border bg-background p-4">
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
              Nhận xử lý
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
      <div className="rounded-md border border-dashed p-3">
        <div className="text-sm font-semibold text-brand-deep">{getCriterionLabel(criterion)}</div>
        <div className="mt-1 text-xs text-muted-foreground">Chưa có task</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3">
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

function CriterionSummaryPanel({
  detail,
  task,
}: {
  detail: ReviewTaskDetail | null;
  task: ReviewTaskListItem;
}) {
  const checklist =
    detail?.checklist?.length
      ? detail.checklist
      : detail?.criterionLevelAssessment?.levels
          ?.find((level) => level.level === detail.application.targetLevel)
          ?.requirements.map((requirement) => ({
            id: requirement.key,
            label: requirement.label,
            passed: requirement.status === "passed",
            required: true,
            note: requirement.reason ?? requirement.actualValue ?? requirement.requiredValue,
          })) ?? [];

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-brand-deep">Checklist tiêu chí</h3>
          <p className="mt-1 text-sm text-muted-foreground">{getCriterionLabel(task.criterion)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={getTaskStatusBadgeVariant(task)}>{getTaskStatusLabel(task.status)}</Badge>
          <Badge variant={task.permissions?.canAct ? "default" : task.permissions?.canClaim ? "outline" : "secondary"}>
            {task.permissions?.badges?.[0] ?? getCriterionPermissionLabel(task)}
          </Badge>
          <Badge variant="outline">{task.evidenceCount ?? 0} minh chứng</Badge>
          <Badge variant="outline">Độ rõ {formatConfidence(task.aiConfidence)}</Badge>
        </div>
      </div>
      {checklist.length ? (
        <div className="mt-4 space-y-2">
          {checklist.map((item) => (
            <div className="rounded-md border p-3" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-brand-deep">{item.label}</div>
                <Badge variant={item.passed ? "default" : item.passed === false ? "destructive" : "outline"}>
                  {item.passed ? "Đạt" : item.passed === false ? "Chưa đạt" : "Cần rà"}
                </Badge>
              </div>
              {item.note ? <div className="mt-1 text-xs text-muted-foreground">{String(item.note)}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Chưa có checklist tự động cho tiêu chí này.
        </div>
      )}
    </Card>
  );
}

function EvidenceWorkspacePanel({
  activeCriterion,
  evidenceMode,
  evidences,
  isLoading,
  onModeChange,
  totalEvidenceCount,
}: {
  activeCriterion: Criterion;
  evidenceMode: EvidenceViewMode;
  evidences: NonNullable<ReviewTaskDetail["evidences"]>;
  isLoading: boolean;
  onModeChange: (mode: EvidenceViewMode) => void;
  totalEvidenceCount: number;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-brand-deep">Minh chứng</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {evidenceMode === "criterion" ? getCriterionLabel(activeCriterion) : `${totalEvidenceCount} minh chứng toàn hồ sơ`}
          </p>
        </div>
        <div className="flex rounded-md border bg-muted/30 p-1">
          <Button size="sm" type="button" variant={evidenceMode === "criterion" ? "default" : "ghost"} onClick={() => onModeChange("criterion")}>
            Minh chứng tiêu chí này
          </Button>
          <Button size="sm" type="button" variant={evidenceMode === "all" ? "default" : "ghost"} onClick={() => onModeChange("all")}>
            Tất cả minh chứng hồ sơ
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">Đang tải minh chứng...</div>
      ) : evidences.length ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {evidences.map((evidence) => (
            <div className="rounded-md border p-3" key={evidence.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-brand-deep">{evidence.evidenceName || "Minh chứng"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{getCriterionLabel(evidence.criterion)} • {evidence.sourceType}</div>
                </div>
                <Badge variant="outline">{evidence.status}</Badge>
              </div>
              {evidence.card?.aiSummary ? <div className="mt-2 text-sm text-muted-foreground">{evidence.card.aiSummary}</div> : null}
              <div className="mt-2 text-xs text-muted-foreground">
                {evidence.files?.length ?? 0} file • Độ rõ {formatConfidence(evidence.confidence ?? evidence.card?.confidence)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Chưa có minh chứng trong chế độ xem này.
        </div>
      )}
    </Card>
  );
}

function DataMatchPanel({ detail }: { detail: ReviewTaskDetail | null }) {
  return (
    <Card>
      <h3 className="font-bold text-brand-deep">Dữ liệu đối chiếu</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="text-sm font-semibold text-brand-deep">Dữ liệu sinh viên</div>
          {detail?.metrics?.length ? (
            <div className="mt-2 space-y-2">
              {detail.metrics.map((metric) => (
                <div className="flex justify-between gap-3 text-sm" key={metric.id}>
                  <span className="text-muted-foreground">{getQueueMetricLabel(metric.metricType)}</span>
                  <span className="font-semibold">{metric.value}{metric.unit ? ` ${metric.unit}` : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Chưa có dữ liệu đối chiếu.</div>
          )}
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm font-semibold text-brand-deep">Kiểm tra hồ sơ</div>
          {detail?.criterionLevelAssessment ? (
            <div className="mt-2 text-sm text-muted-foreground">
              Gợi ý cấp tiêu chí: {getLevelLabel(detail.criterionLevelAssessment.suggestedCriterionLevel)}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Chưa có dữ liệu kiểm tra cho tiêu chí này.</div>
          )}
        </div>
      </div>
    </Card>
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
              Nhận xử lý
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
  if (value === null || value === undefined) return "Chưa có dữ liệu";
  return `${Math.round(value * 100)}%`;
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
