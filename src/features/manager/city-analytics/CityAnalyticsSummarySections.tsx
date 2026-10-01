import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Hourglass,
  ShieldQuestion,
} from "lucide-react";
import { Card } from "@/components/ui-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CriterionBadge } from "@/features/review/components/CriterionBadge";
import {
  criterionLabels,
  criterionOrder,
  criterionTaskStatusKeys,
  finalStatuses,
} from "./constants";
import type { CityAnalyticsListFilters, CityAnalyticsSummary } from "./types";

type Props = {
  summary: CityAnalyticsSummary;
  onOpenList: (title: string, filters?: CityAnalyticsListFilters) => void;
  showSubmittedBySchool?: boolean;
};

export function CityAnalyticsSummarySections({
  summary,
  onOpenList,
  showSubmittedBySchool = false,
}: Props) {
  const criteriaByKey = useMemo(
    () => new Map(summary.criteria.map((row) => [row.criterion, row])),
    [summary.criteria],
  );

  return (
    <div className="space-y-5">
      <section aria-label="Tổng quan hồ sơ" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryButton
          label="Hồ sơ đã tạo"
          value={summary.applications.created}
          icon={<ClipboardList className="h-4 w-4" />}
          onClick={() => onOpenList("Hồ sơ theo bộ lọc hiện tại")}
        />
        <SummaryButton
          label="Chưa nộp"
          value={summary.applications.notSubmitted}
          icon={<FileWarning className="h-4 w-4" />}
          onClick={() => onOpenList("Hồ sơ chưa nộp", { submitted: false })}
        />
        <SummaryButton
          label="Hồ sơ đã nộp"
          value={summary.applications.submitted}
          icon={<CheckCircle2 className="h-4 w-4" />}
          onClick={() => onOpenList("Hồ sơ đã nộp", { submitted: true })}
        />
        <SummaryButton
          label="Đang xét"
          value={summary.applications.inReview}
          icon={<Hourglass className="h-4 w-4" />}
          onClick={() => onOpenList("Hồ sơ đang xét", { inReview: true })}
        />
        <SummaryButton
          label="Cần bổ sung hồ sơ"
          value={summary.applications.supplementRequired}
          icon={<FileWarning className="h-4 w-4" />}
          onClick={() => onOpenList("Hồ sơ cần bổ sung", { supplementRequired: true })}
        />
        <SummaryButton
          label="Vướng hội đồng"
          value={summary.applications.resolutionBlocked}
          icon={<ShieldQuestion className="h-4 w-4" />}
          onClick={() => onOpenList("Hồ sơ vướng hội đồng", { resolutionBlocked: true })}
        />
        <SummaryButton
          label="Đã review đủ 5 tiêu chí"
          value={summary.applications.reviewComplete}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </section>

      {showSubmittedBySchool ? (
        <Card className="p-0">
          <div className="border-b p-4">
            <SectionHeading
              title="Thống kê hồ sơ đã nộp theo trường"
              description="Số hồ sơ đã nộp theo trường trong mùa xét và bộ lọc đang chọn."
            />
          </div>
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="Bảng hồ sơ đã nộp theo trường"
            tabIndex={0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trường</TableHead>
                  <TableHead className="text-right">Hồ sơ đã nộp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.bySchool.map((school) => (
                  <TableRow key={school.workspaceId}>
                    <TableCell>
                      <span className="font-semibold">{school.name}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{school.code}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <MetricLink
                        label={`${school.name}: hồ sơ đã nộp`}
                        value={school.submitted}
                        onClick={() =>
                          onOpenList(`Hồ sơ đã nộp: ${school.name}`, {
                            workspaceId: school.workspaceId,
                            submitted: true,
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell>Tổng theo bộ lọc</TableCell>
                  <TableCell className="text-right">{summary.applications.submitted}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="p-0">
          <div className="border-b p-4">
            <SectionHeading
              title="Tiến độ theo 5 tiêu chí"
              description="Chỉ trạng thái review của cán bộ được tính là hoàn tất."
            />
          </div>
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="Bảng trạng thái tiêu chí"
            tabIndex={0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu chí</TableHead>
                  <TableHead className="text-right">Tổng task</TableHead>
                  {criterionTaskStatusKeys.map((statusItem) => (
                    <TableHead key={statusItem.key} className="text-right">
                      {statusItem.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {criterionOrder.map((criterion) => {
                  const row = criteriaByKey.get(criterion);
                  return (
                    <TableRow key={criterion}>
                      <TableCell>
                        <CriterionBadge criterion={criterion} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MetricLink
                          label={`${criterionLabels[criterion]} tổng task`}
                          value={row?.totalTasks ?? 0}
                          onClick={() =>
                            onOpenList(`${criterionLabels[criterion]}: tất cả trạng thái`, {
                              criterion,
                            })
                          }
                        />
                      </TableCell>
                      {criterionTaskStatusKeys.map((statusItem) => {
                        const value = row?.[statusItem.key] ?? 0;
                        return (
                          <TableCell key={statusItem.key} className="text-right">
                            <MetricLink
                              label={`${criterionLabels[criterion]}: ${statusItem.label}`}
                              value={value}
                              onClick={() =>
                                onOpenList(`${criterionLabels[criterion]}: ${statusItem.label}`, {
                                  criterion,
                                  taskStatus: statusItem.status,
                                })
                              }
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card>
          <SectionHeading
            title="Phân bố tiến độ review"
            description="Số hồ sơ theo số tiêu chí đã được cán bộ xử lý."
          />
          <div className="mt-4 space-y-2">
            {Object.entries(summary.applications.progressDistribution).map(([count, value]) => (
              <div
                key={count}
                role="img"
                aria-label={`${count} tiêu chí đã review: ${value} hồ sơ`}
                className="grid w-full grid-cols-[minmax(7rem,auto)_minmax(2rem,1fr)_2.5rem] items-center gap-3 px-1 py-1 text-left text-sm"
              >
                <span>{count}/5 tiêu chí</span>
                <span className="h-2 overflow-hidden rounded bg-muted">
                  <span
                    className="block h-full rounded bg-primary"
                    style={{ width: `${percent(value, summary.applications.submitted)}%` }}
                  />
                </span>
                <span className="text-right font-semibold">{value}</span>
              </div>
            ))}
          </div>
          {summary.applications.unexpectedTaskCount > 0 ||
          summary.applications.missingCriterionSlots > 0 ? (
            <div
              className="mt-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800"
              role="status"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {summary.applications.unexpectedTaskCount > 0 ? (
                  <span className="block">
                    Có {summary.applications.unexpectedTaskCount} task ngoài bộ 5 tiêu chí chuẩn; số
                    liệu được tách riêng.
                  </span>
                ) : null}
                {summary.applications.missingCriterionSlots > 0 ? (
                  <span className="block">
                    Thiếu {summary.applications.missingCriterionSlots} vị trí task trong bộ 5 tiêu
                    chí; không suy diễn thành đã review.
                  </span>
                ) : null}
              </span>
            </div>
          ) : null}
        </Card>
      </section>

      <Card className="p-0">
        <div className="border-b p-4">
          <SectionHeading
            title="Theo trường"
            description="Số hồ sơ được tính theo trường đang hoạt động."
          />
        </div>
        <div className="overflow-x-auto" role="region" aria-label="Bảng theo trường" tabIndex={0}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trường</TableHead>
                <TableHead className="text-right">Đã nộp</TableHead>
                <TableHead className="text-right">Đang xét</TableHead>
                <TableHead className="text-right">Bổ sung</TableHead>
                <TableHead className="text-right">Review đủ</TableHead>
                <TableHead className="text-right">Đạt</TableHead>
                <TableHead className="text-right">Chưa đạt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.bySchool.map((school) => (
                <TableRow key={school.workspaceId}>
                  <TableCell>
                    <button
                      type="button"
                      aria-label={`Xem hồ sơ trường ${school.name}`}
                      className="text-left font-semibold text-brand-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      onClick={() =>
                        onOpenList(`Hồ sơ: ${school.name}`, { workspaceId: school.workspaceId })
                      }
                    >
                      {school.name}
                      <span className="ml-1 text-xs text-muted-foreground">{school.code}</span>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricLink
                      label={`${school.name}: đã nộp`}
                      value={school.submitted}
                      onClick={() =>
                        onOpenList(`Hồ sơ đã nộp: ${school.name}`, {
                          workspaceId: school.workspaceId,
                          submitted: true,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <SchoolMetric
                      school={school}
                      label="đang xét"
                      value={school.inReview}
                      filter="inReview"
                      open={onOpenList}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <SchoolMetric
                      school={school}
                      label="cần bổ sung"
                      value={school.supplementRequired}
                      filter="supplementRequired"
                      open={onOpenList}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <span aria-label={`${school.name}: review đủ ${school.reviewComplete}`}>
                      {school.reviewComplete}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricLink
                      label={`${school.name}: kết quả đạt`}
                      value={school.finalPassed}
                      onClick={() =>
                        onOpenList(`Hồ sơ đạt: ${school.name}`, {
                          workspaceId: school.workspaceId,
                          submitted: true,
                          finalStatus: "passed",
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricLink
                      label={`${school.name}: chưa đạt Thành phố`}
                      value={school.finalFailed}
                      onClick={() =>
                        onOpenList(`Hồ sơ chưa đạt: ${school.name}`, {
                          workspaceId: school.workspaceId,
                          submitted: true,
                          finalStatus: "failed",
                        })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
              {summary.bySchool.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Chưa có dữ liệu theo trường.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card>
          <SectionHeading title="Kết quả cuối" description="Lấy từ quyết định chốt hồ sơ." />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {finalStatuses.map((item) => {
              const value =
                item.value === "passed"
                  ? summary.finalResults.passed
                  : item.value === "failed"
                    ? summary.finalResults.failed
                    : summary.finalResults.notFinalized;
              return (
                <MetricTile
                  key={item.value}
                  label={item.label}
                  value={value}
                  onClick={() =>
                    onOpenList(`Kết quả cuối: ${item.label}`, {
                      submitted: true,
                      finalStatus: item.value,
                    })
                  }
                />
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Đã chốt: {summary.finalResults.finalized}. Chỉ kết quả đạt Thành phố được tính là đạt.
          </p>
        </Card>

        <Card>
          <SectionHeading
            title="Bổ sung và hội đồng"
            description="Hồ sơ đếm một lần; task và case hiển thị riêng."
          />
          <div className="mt-3 space-y-2">
            <MetricRow
              label="Hồ sơ cần bổ sung"
              value={summary.supplement.applications}
              onClick={() => onOpenList("Hồ sơ cần bổ sung", { supplementRequired: true })}
            />
            <MetricRow
              label="Task cần bổ sung"
              value={summary.supplement.tasks}
              onClick={() => onOpenList("Task cần bổ sung", { taskStatus: "supplement_required" })}
            />
            <MetricRow label="Case hội đồng đang mở" value={summary.resolution.openCases} />
            <MetricRow
              label="Case hội đồng đã giải quyết"
              value={summary.resolution.resolvedCases}
            />
            <MetricRow
              label="Hồ sơ đang vướng hội đồng"
              value={summary.resolution.blockedApplications}
              onClick={() => onOpenList("Hồ sơ vướng hội đồng", { resolutionBlocked: true })}
            />
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b p-4">
            <SectionHeading
              title="Khối lượng City Officer"
              description="Chỉ task thuộc hồ sơ cá nhân cấp Thành phố."
            />
          </div>
          <div
            className="overflow-x-auto"
            role="region"
            aria-label="Bảng khối lượng City Officer"
            tabIndex={0}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cán bộ</TableHead>
                  <TableHead className="text-right">Đang xử lý</TableHead>
                  <TableHead className="text-right">Chờ</TableHead>
                  <TableHead className="text-right">Hoàn tất</TableHead>
                  <TableHead className="text-right">Bổ sung</TableHead>
                  <TableHead className="text-right">Hội đồng</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.reviewers.map((reviewer) => (
                  <TableRow key={reviewer.officerId}>
                    <TableCell className="font-medium">{reviewer.fullName}</TableCell>
                    <TableCell className="text-right">{reviewer.assignedActive}</TableCell>
                    <TableCell className="text-right">{reviewer.pending}</TableCell>
                    <TableCell className="text-right">{reviewer.completed}</TableCell>
                    <TableCell className="text-right">{reviewer.supplementRequired}</TableCell>
                    <TableCell className="text-right">{reviewer.resolutionNeeded}</TableCell>
                  </TableRow>
                ))}
                {summary.reviewers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      Chưa có dữ liệu workload.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function SummaryButton({
  label,
  value,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <div
      className={`card-soft flex min-h-[82px] items-center justify-between gap-3 p-3.5 ${
        onClick ? "transition-colors hover:bg-[var(--surface-secondary)]" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold leading-none text-brand-deep">{value}</div>
      </div>
      <span className="text-brand-primary" aria-hidden="true">
        {icon}
      </span>
    </div>
  );

  if (!onClick) return content;

  return (
    <button
      type="button"
      aria-label={`${label}: ${value}; mở danh sách hồ sơ`}
      onClick={onClick}
      className="rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {content}
    </button>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-bold text-brand-deep">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function MetricLink({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${value}; xem hồ sơ`}
      onClick={onClick}
      className="min-h-8 min-w-8 rounded px-1 font-semibold text-brand-deep underline-offset-2 hover:bg-[var(--surface-selected)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {value}
    </button>
  );
}

function MetricTile({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${value}; xem hồ sơ`}
      onClick={onClick}
      className="rounded-md border border-slate-200/60 p-3 text-left hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 block text-xl font-bold text-brand-deep">{value}</span>
    </button>
  );
}

function MetricRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {onClick ? (
        <MetricLink label={label} value={value} onClick={onClick} />
      ) : (
        <span className="font-semibold text-brand-deep">{value}</span>
      )}
    </div>
  );
}

function SchoolMetric({
  school,
  label,
  value,
  filter,
  open,
}: {
  school: { workspaceId: string; name: string };
  label: string;
  value: number;
  filter: "inReview" | "supplementRequired";
  open: (title: string, filters: CityAnalyticsListFilters) => void;
}) {
  return (
    <MetricLink
      label={`${school.name}: ${label}`}
      value={value}
      onClick={() =>
        open(`${label}: ${school.name}`, {
          workspaceId: school.workspaceId,
          ...(filter === "inReview" ? { inReview: true } : { supplementRequired: true }),
        })
      }
    />
  );
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}
