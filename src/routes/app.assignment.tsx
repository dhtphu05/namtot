import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  FileWarning,
  Hourglass,
  ShieldAlert,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, StatCard } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/store/auth-store";
import { CriterionBadge } from "@/features/review/components/CriterionBadge";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewLoadingState } from "@/features/review/components/ReviewLoadingState";
import type { Criterion, Role } from "@/features/review/types";
import { getErrorMessage } from "@/features/review/utils/errors";
import { getCriterionLabel } from "@/features/review/utils/formatters";
import { useManagerWorkload } from "@/features/manager/hooks/useManager";
import type { ManagerWorkloadResponse, OfficerWorkload } from "@/features/manager/types";

export const Route = createFileRoute("/app/assignment")({
  component: AssignmentWorkloadRoute,
});

const allowedRoles: Role[] = ["manager", "committee", "admin"];
const fallbackText = "Chưa có dữ liệu";
const trackedCriteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

function AssignmentWorkloadRoute() {
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Phân công cán bộ"
          subtitle="Theo dõi workload cán bộ và phân bổ tác vụ xét duyệt theo tiêu chí."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập trang phân công cán bộ.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return <AssignmentWorkloadContent role={role} />;
}

function AssignmentWorkloadContent({ role }: { role: Role }) {
  const { data, error, isError, isLoading, refetch } = useManagerWorkload();
  const workloads = useMemo(() => data?.workloads ?? [], [data?.workloads]);
  const summary = useMemo(() => getWorkloadSummary(data), [data]);
  const distribution = useMemo(() => getCriterionDistribution(data), [data]);
  const committeeReadOnly = role === "committee";

  return (
    <>
      <TopBar
        title={committeeReadOnly ? "Theo dõi phân công" : "Phân công cán bộ"}
        subtitle={
          committeeReadOnly
            ? "Theo dõi workload cán bộ và tình trạng phân công; tài khoản hội đồng không thực hiện assign/reassign."
            : "Theo dõi workload cán bộ và phân bổ tác vụ xét duyệt theo từng tiêu chí Sinh viên 5 tốt."
        }
      />

      {isLoading ? (
        <ReviewLoadingState label="Đang tải workload cán bộ..." />
      ) : isError ? (
        <ReviewErrorState
          title="Không thể tải dữ liệu phân công"
          description={getErrorMessage(
            error,
            "Vui lòng thử lại hoặc kiểm tra quyền truy cập với backend.",
          )}
          onRetry={() => void refetch()}
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              icon={<UsersRound className="h-5 w-5" />}
              label="Tổng cán bộ"
              value={summary.totalOfficers}
            />
            <StatCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="Tổng tác vụ"
              value={summary.totalTasks}
              tint="#0057C2"
            />
            <StatCard
              icon={<Hourglass className="h-5 w-5" />}
              label="Chờ xét"
              value={summary.waitingTasks}
              tint="#64748B"
            />
            <StatCard
              icon={<UserRoundCheck className="h-5 w-5" />}
              label="Đang xét"
              value={summary.reviewingTasks}
              tint="#16A34A"
            />
            <StatCard
              icon={<FileWarning className="h-5 w-5" />}
              label="Cần bổ sung"
              value={summary.supplementRequiredTasks}
              tint="#F59E0B"
            />
            <StatCard
              icon={<ShieldAlert className="h-5 w-5" />}
              label="Quá tải"
              value={summary.overloadedOfficers}
              tint="#DC2626"
            />
          </div>

          <Card>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-deep">Phân bổ theo tiêu chí</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Số liệu do backend trả về; tiêu chí chưa có dữ liệu được hiển thị là 0.
                </p>
              </div>
              <Badge variant="outline">{committeeReadOnly ? "Theo dõi" : "Read-only"}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {trackedCriteria.map((criterion) => (
                <div key={criterion} className="rounded-md border p-3">
                  <CriterionBadge criterion={criterion} />
                  <div className="mt-3 text-2xl font-bold text-brand-deep">
                    {distribution[criterion] ?? 0}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">tác vụ</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-0">
            <div className="border-b p-5">
              <h2 className="text-base font-bold text-brand-deep">Workload từng cán bộ</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {committeeReadOnly
                  ? "Hội đồng chỉ theo dõi phân công và workload, không thao tác assign/reassign."
                  : "Điều phối lại cán bộ sẽ được bật ở phase sau."}
              </p>
            </div>

            {workloads.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cán bộ</TableHead>
                    <TableHead>Tiêu chí phụ trách</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                    <TableHead className="text-right">Chờ xét</TableHead>
                    <TableHead className="text-right">Đang xét</TableHead>
                    <TableHead className="text-right">Bổ sung</TableHead>
                    <TableHead className="text-right">Đạt</TableHead>
                    <TableHead className="text-right">Không đạt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workloads.map((officer) => (
                    <TableRow key={officer.officerId}>
                      <TableCell>
                        <div className="font-semibold text-brand-deep">
                          {officer.officerName || fallbackText}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {officer.officerEmail || fallbackText}
                        </div>
                      </TableCell>
                      <TableCell>
                        <CriteriaList criteria={officer.specializedCriteria ?? []} />
                      </TableCell>
                      <NumberCell value={getCount(officer.total)} />
                      <NumberCell value={getBreakdownCount(officer, "waiting")} />
                      <NumberCell value={getBreakdownCount(officer, "reviewing")} />
                      <NumberCell value={getBreakdownCount(officer, "supplement_required")} />
                      <NumberCell value={getBreakdownCount(officer, "accepted")} />
                      <NumberCell value={getBreakdownCount(officer, "rejected")} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-5">
                <EmptyReviewState
                  title="Chưa có dữ liệu workload"
                  description="Khi backend trả về danh sách cán bộ và tác vụ được phân công, dữ liệu sẽ hiển thị tại đây."
                />
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function CriteriaList({ criteria }: { criteria: Criterion[] }) {
  if (!criteria.length) {
    return <span className="text-sm text-muted-foreground">{fallbackText}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {criteria.map((criterion) => (
        <CriterionBadge key={criterion} criterion={criterion} />
      ))}
    </div>
  );
}

function NumberCell({ value }: { value: number }) {
  return <TableCell className="text-right font-semibold text-brand-deep">{value}</TableCell>;
}

function getWorkloadSummary(data?: ManagerWorkloadResponse | null) {
  const workloads = data?.workloads ?? [];

  return {
    totalOfficers: data?.totalOfficers ?? workloads.length,
    totalTasks: data?.totalTasks ?? sum(workloads, (item) => getCount(item.total)),
    waitingTasks:
      data?.waitingTasks ?? sum(workloads, (item) => getBreakdownCount(item, "waiting")),
    reviewingTasks:
      data?.reviewingTasks ?? sum(workloads, (item) => getBreakdownCount(item, "reviewing")),
    supplementRequiredTasks:
      data?.supplementRequiredTasks ??
      sum(workloads, (item) => getBreakdownCount(item, "supplement_required")),
    overloadedOfficers: data?.overloadedOfficers ?? 0,
  };
}

function getCriterionDistribution(data?: ManagerWorkloadResponse | null) {
  const distribution = data?.criterionDistribution ?? {};

  return trackedCriteria.reduce<Partial<Record<Criterion, number>>>((acc, criterion) => {
    acc[criterion] = getCount(distribution[criterion]);
    return acc;
  }, {});
}

function getBreakdownCount(
  officer: OfficerWorkload,
  status: keyof NonNullable<OfficerWorkload["taskStatusBreakdown"]>,
) {
  const directMap = {
    waiting: officer.waiting,
    reviewing: officer.reviewing,
    supplement_required: officer.supplementRequired,
    accepted: officer.accepted,
    rejected: officer.rejected,
    resolution_needed: officer.resolutionNeeded,
  };

  return getCount(officer.taskStatusBreakdown?.[status] ?? directMap[status]);
}

function getCount(value?: number | null) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function sum<T>(items: T[], selector: (item: T) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}
