import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Hourglass,
  ListChecks,
  ShieldQuestion,
  XCircle,
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
import type { Criterion, Level, ReviewTaskStatus, Role } from "@/features/review/types";
import { getErrorMessage } from "@/features/review/utils/errors";
import {
  formatDateTime,
  getLevelLabel,
  getTaskStatusLabel,
} from "@/features/review/utils/formatters";
import { useManagerDashboardSummary } from "@/features/manager/hooks/useManager";
import type { ManagerDashboardSummary } from "@/features/manager/types";
import { ACTIVE_LEVELS } from "@/lib/levels";
import { CityAnalyticsDashboard } from "@/features/manager/city-analytics/CityAnalyticsDashboard";

export const Route = createFileRoute("/app/analytics")({
  component: AnalyticsRoute,
});

const allowedRoles: Role[] = ["manager", "committee", "city_manager", "city_committee", "admin"];
const levels: Level[] = [...ACTIVE_LEVELS];
const criteria: Criterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
  "priority",
  "collective",
];
const taskStatuses: ReviewTaskStatus[] = [
  "waiting",
  "reviewing",
  "supplement_required",
  "accepted",
  "rejected",
  "resolution_needed",
];
const fallbackText = "Chưa có dữ liệu";

function AnalyticsRoute() {
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Tổng quan xét duyệt"
          subtitle="Theo dõi tiến độ hồ sơ và khối lượng xử lý theo trạng thái, tiêu chí và cấp xét."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập trang tổng quan xét duyệt.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (role === "city_manager" || role === "city_committee" || role === "admin") {
    return (
      <CityAnalyticsDashboard
        showEligibilityVerification={role === "city_manager"}
        showSeasonAdministration={role !== "city_committee"}
        showSubmittedBySchool={role === "city_committee"}
      />
    );
  }

  return <AnalyticsContent />;
}

function AnalyticsContent() {
  const { data: summary, error, isError, isLoading, refetch } = useManagerDashboardSummary();
  const hasData = Boolean(summary);
  const levelRows = useMemo(() => getLevelRows(summary), [summary]);
  const criterionRows = useMemo(() => getCriterionRows(summary), [summary]);
  const facultyRows = summary?.byFaculty ?? [];
  const lastUpdatedAt = summary?.lastUpdatedAt ?? new Date().toISOString();

  return (
    <>
      <TopBar
        title="Tổng quan xét duyệt"
        subtitle="Theo dõi tiến độ hồ sơ và khối lượng xử lý theo trạng thái, tiêu chí và cấp xét."
      />

      {isLoading ? (
        <ReviewLoadingState label="Đang tải tổng quan xét duyệt..." />
      ) : isError ? (
        <ReviewErrorState
          title="Không thể tải tổng quan xét duyệt"
          description={getErrorMessage(
            error,
            "Dashboard backend có thể chưa sẵn sàng. Vui lòng thử lại sau.",
          )}
          onRetry={() => void refetch()}
        />
      ) : !hasData ? (
        <EmptyReviewState
          title="Chưa có dữ liệu tổng quan"
          description="Khi backend trả về thống kê xét duyệt, dữ liệu sẽ hiển thị tại đây."
        />
      ) : (
        <div className="space-y-5">
          <div className="flex justify-end">
            <Badge variant="outline">Cập nhật: {formatDateTime(lastUpdatedAt)}</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <StatCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="Tổng hồ sơ"
              value={getCount(summary.totalApplications)}
            />
            <StatCard
              icon={<Hourglass className="h-5 w-5" />}
              label="Đang xét duyệt"
              value={getCount(summary.underReview)}
              tint="#0057C2"
            />
            <StatCard
              icon={<FileWarning className="h-5 w-5" />}
              label="Cần bổ sung"
              value={getCount(summary.supplementRequired)}
              tint="#F59E0B"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Hoàn tất"
              value={getCount(summary.completed)}
              tint="#16A34A"
            />
            <StatCard
              icon={<XCircle className="h-5 w-5" />}
              label="Không đạt"
              value={getCount(summary.rejected)}
              tint="#DC2626"
            />
            <StatCard
              icon={<ShieldQuestion className="h-5 w-5" />}
              label="Cần hội đồng xử lý"
              value={getCount(summary.resolutionNeeded)}
              tint="#7C3AED"
            />
          </div>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Card>
              <SectionTitle
                icon={<ListChecks className="h-5 w-5" />}
                title="Theo cấp xét"
                description="Phân bổ hồ sơ theo target level backend trả về."
              />
              <div className="space-y-3">
                {levelRows.map((row) => (
                  <BreakdownRow
                    key={row.level}
                    label={getLevelLabel(row.level)}
                    value={row.value}
                  />
                ))}
              </div>
            </Card>

            <Card className="p-0">
              <div className="border-b p-5">
                <SectionTitle
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Trạng thái tác vụ theo tiêu chí"
                  description="Các ô thiếu dữ liệu được hiển thị là 0."
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tiêu chí</TableHead>
                    <TableHead className="text-right">Chờ</TableHead>
                    <TableHead className="text-right">Đang xét</TableHead>
                    <TableHead className="text-right">Bổ sung</TableHead>
                    <TableHead className="text-right">Đạt</TableHead>
                    <TableHead className="text-right">Không đạt</TableHead>
                    <TableHead className="text-right">Hội ý</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criterionRows.map((row) => (
                    <TableRow key={row.criterion}>
                      <TableCell>
                        <CriterionBadge criterion={row.criterion} />
                      </TableCell>
                      {taskStatuses.map((status) => (
                        <TableCell
                          key={status}
                          className="text-right font-semibold text-brand-deep"
                        >
                          {row.statuses[status] ?? 0}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

          <Card className="p-0">
            <div className="border-b p-5">
              <SectionTitle
                icon={<ClipboardList className="h-5 w-5" />}
                title="Theo khoa"
                description="Hiển thị khi backend trả về breakdown theo khoa."
              />
            </div>
            {facultyRows.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khoa</TableHead>
                    <TableHead className="text-right">Tổng</TableHead>
                    <TableHead className="text-right">Đang xét</TableHead>
                    <TableHead className="text-right">Hoàn tất</TableHead>
                    <TableHead className="text-right">Không đạt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facultyRows.map((faculty) => (
                    <TableRow key={faculty.faculty || fallbackText}>
                      <TableCell className="font-semibold text-brand-deep">
                        {faculty.faculty || fallbackText}
                      </TableCell>
                      <TableCell className="text-right">{getCount(faculty.total)}</TableCell>
                      <TableCell className="text-right">{getCount(faculty.underReview)}</TableCell>
                      <TableCell className="text-right">{getCount(faculty.completed)}</TableCell>
                      <TableCell className="text-right">{getCount(faculty.rejected)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-5">
                <EmptyReviewState
                  title="Chưa có dữ liệu theo khoa"
                  description="Backend chưa trả về breakdown theo khoa cho kỳ xét hiện tại."
                />
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

function SectionTitle({
  description,
  icon,
  title,
}: {
  description?: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 text-brand-deep">{icon}</div>
      <div>
        <h2 className="text-base font-bold text-brand-deep">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  const width = Math.min(100, Math.max(0, value));

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-brand-deep">{label}</div>
        <div className="text-sm font-bold text-brand-deep">{value}</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function getLevelRows(summary?: ManagerDashboardSummary | null) {
  return levels.map((level) => ({
    level,
    value: getCount(summary?.byTargetLevel?.[level]),
  }));
}

function getCriterionRows(summary?: ManagerDashboardSummary | null) {
  return criteria.map((criterion) => ({
    criterion,
    statuses: taskStatuses.reduce<Partial<Record<ReviewTaskStatus, number>>>((acc, status) => {
      acc[status] = getCount(summary?.criterionTaskStatus?.[criterion]?.[status]);
      return acc;
    }, {}),
  }));
}

function getCount(value?: number | null) {
  return Number.isFinite(value) ? Number(value) : 0;
}
