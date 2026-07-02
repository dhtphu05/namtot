import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Clock3, FileWarning, Hourglass } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/store/auth-store";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewFilters } from "@/features/review/components/ReviewFilters";
import { ReviewTaskTable } from "@/features/review/components/ReviewTaskTable";
import { useReviewTasks } from "@/features/review/hooks/useReview";
import type {
  ReviewTaskListItem,
  ReviewTaskListParams,
  ReviewTaskStatus,
  Role,
} from "@/features/review/types";
import { getErrorMessage } from "@/features/review/utils/errors";

export const Route = createFileRoute("/app/queue")({
  component: ReviewQueueRoute,
});

const allowedRoles: Role[] = ["officer", "manager", "committee", "admin"];
const defaultLimit = 10;

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
  const [filters, setFilters] = useState<ReviewTaskListParams>({
    page: 1,
    limit: defaultLimit,
  });

  const queryParams = useMemo<ReviewTaskListParams>(
    () => ({
      ...filters,
      assignedToMe: role === "officer" ? true : undefined,
    }),
    [filters, role],
  );

  const { data, error, isError, isFetching, isLoading, refetch } = useReviewTasks(queryParams);
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const summary = useMemo(() => getCurrentListSummary(items), [items]);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? defaultLimit;
  const canGoPrevious = page > 1 && !isFetching;
  const canGoNext = items.length >= limit && !isFetching;

  const openTask = (taskId: string) => {
    navigate({ to: "/app/review/$id", params: { id: taskId } });
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
            <ReviewTaskTable isLoading={isLoading} items={items} onOpenTask={openTask} />
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
    </>
  );
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
