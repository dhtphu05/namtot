import { useMemo, useState } from "react";
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
import { ReviewTaskTable } from "@/features/review/components/ReviewTaskTable";
import { useClaimReviewTask, useReviewTasks } from "@/features/review/hooks/useReview";
import type {
  ReviewTaskListItem,
  ReviewTaskListParams,
  ReviewTaskStatus,
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

const officerTabs: Array<{ value: QueueTab; label: string; description: string }> = [
  { value: "actionable", label: "Cần xử lý", description: "Task đang được giao và có thể quyết định." },
  { value: "claimable", label: "Có thể nhận", description: "Task chưa phân công, thuộc tiêu chí phụ trách." },
  { value: "mine", label: "Của tôi", description: "Tất cả task đã giao cho bạn." },
  { value: "supplement", label: "Chờ bổ sung", description: "Task đang chờ sinh viên bổ sung minh chứng." },
  { value: "readonly", label: "Chỉ xem", description: "Task có thể xem nhưng không được xử lý." },
  { value: "all", label: "Tất cả", description: "Tất cả task backend cho phép xem." },
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
  const priorityItems = useMemo(() => getPriorityTasks(items).slice(0, 6), [items]);
  const visibleItems = useMemo(
    () => (role === "officer" ? filterOfficerTasks(items, activeTab) : items),
    [activeTab, items, role],
  );

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
          label="Tổng hồ sơ trong danh sách"
          value={summary.total}
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
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-deep">Việc ưu tiên</h2>
                <p className="text-sm text-muted-foreground">
                  Hệ thống xếp trước task quá hạn, AI thấp, deadline gần, task được giao và task có thể nhận.
                </p>
              </div>
              <Badge variant="outline">{priorityItems.length} việc nổi bật</Badge>
            </div>
            {priorityItems.length ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {priorityItems.map((item) => (
                  <PriorityTaskCard
                    key={item.id}
                    item={item}
                    onClaim={() => setClaimCandidate(item)}
                    onOpen={() => openTask(item.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Chưa có việc ưu tiên. Bạn có thể xem hàng đợi hoặc chờ phân công mới.
              </div>
            )}
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
          <div className="mt-3 text-xs text-muted-foreground">
            Thống kê đang tính trên danh sách hiện tại. Cán bộ xét duyệt chỉ xem các hồ sơ được phân
            công; quản lý, hội đồng và quản trị viên có thể xem phạm vi rộng hơn nếu backend cho
            phép.
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
            <ReviewTaskTable
              isLoading={isLoading}
              items={visibleItems}
              onClaimTask={(taskId) => {
                const item = items.find((candidate) => candidate.id === taskId);
                if (item) setClaimCandidate(item);
              }}
              onOpenTask={openTask}
            />
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
            Deadline: {formatDateTime(item.dueDate)} • AI: {formatConfidence(item.aiConfidence)}
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
  if (item.priorityReason === "low_ai_confidence") return "AI thấp";
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
  if (value === null || value === undefined) return "AI chưa có dữ liệu";
  return `${Math.round(value * 100)}%`;
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
