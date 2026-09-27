import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardList, Search } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EligibilityVerificationPanel } from "@/features/manager/components/EligibilityVerificationPanel";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewLoadingState } from "@/features/review/components/ReviewLoadingState";
import { getErrorMessage } from "@/features/review/utils/errors";
import { useCityAnalyticsApplications, useCityAnalyticsSummary } from "./hooks";
import type {
  CityAnalyticsDrilldown,
  CityAnalyticsListParams,
  CityAnalyticsListFilters,
  CityAnalyticsStatus,
  CityAnalyticsTaskStatus,
} from "./types";
import { criterionLabels, criterionOrder, finalStatuses } from "./constants";
import { CityAnalyticsSummarySections } from "./CityAnalyticsSummarySections";

const applicationStatuses: Array<{ value: CityAnalyticsStatus; label: string }> = [
  { value: "not_started", label: "Chưa khởi tạo" },
  { value: "draft", label: "Bản nháp" },
  { value: "prechecked", label: "Đã tiền kiểm" },
  { value: "ready_to_submit", label: "Sẵn sàng nộp" },
  { value: "submitted", label: "Đã nộp" },
  { value: "under_review", label: "Đang xét" },
  { value: "supplement_required", label: "Cần bổ sung" },
  { value: "resolution_needed", label: "Cần hội đồng xử lý" },
  { value: "completed", label: "Hoàn tất" },
  { value: "rejected", label: "Không đạt" },
];

const taskStatuses: Array<{ value: CityAnalyticsTaskStatus; label: string }> = [
  { value: "waiting", label: "Chờ xét" },
  { value: "reviewing", label: "Đang xét" },
  { value: "supplement_required", label: "Cần bổ sung" },
  { value: "resolution_needed", label: "Cần hội đồng" },
  { value: "accepted", label: "Đạt" },
  { value: "rejected", label: "Không đạt" },
];

const pageSize = 20;

export function CityAnalyticsDashboard({
  showEligibilityVerification,
}: {
  showEligibilityVerification: boolean;
}) {
  const [schoolYear, setSchoolYear] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("");
  const [drilldown, setDrilldown] = useState<CityAnalyticsDrilldown | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());

  const summaryParams = useMemo(
    () => ({
      schoolYear: schoolYear || undefined,
      workspaceId: workspaceId || undefined,
      status: status ? (status as CityAnalyticsStatus) : undefined,
    }),
    [schoolYear, status, workspaceId],
  );
  const summaryQuery = useCityAnalyticsSummary(summaryParams);
  const summary = summaryQuery.data;
  const activeSchoolYear = schoolYear || summary?.filters.schoolYear || "";
  const listParams: CityAnalyticsListParams = useMemo(
    () => ({
      schoolYear: activeSchoolYear || undefined,
      workspaceId: workspaceId || undefined,
      status: status ? (status as CityAnalyticsStatus) : undefined,
      ...drilldown?.filters,
      q: deferredSearch || undefined,
      page,
      limit: pageSize,
    }),
    [activeSchoolYear, deferredSearch, drilldown, page, status, workspaceId],
  );
  const listQuery = useCityAnalyticsApplications(listParams, Boolean(drilldown));
  const isEmptyYear = Boolean(summary && summary.availableSchoolYears.length === 0);

  function openDrilldown(title: string, filters: CityAnalyticsListFilters = {}) {
    const { status: selectedStatus, workspaceId: selectedWorkspaceId, ...listFilters } = filters;
    if (selectedStatus !== undefined) setStatus(selectedStatus);
    if (selectedWorkspaceId !== undefined) setWorkspaceId(selectedWorkspaceId);
    setDrilldown({ title, filters: listFilters });
    setPage(1);
  }

  function changeSchoolYear(value: string) {
    setSchoolYear(value);
    setPage(1);
  }

  function changeSchool(value: string) {
    setWorkspaceId(value);
    setPage(1);
  }

  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <>
      <TopBar
        title="Theo dõi hồ sơ cấp Thành phố"
        subtitle="Tiến độ xét duyệt và kết quả chính thức từ hồ sơ, review và quyết định của cán bộ."
      />

      {showEligibilityVerification ? <EligibilityVerificationPanel /> : null}

      {summaryQuery.isLoading ? (
        <ReviewLoadingState label="Đang tải thống kê Thành phố..." />
      ) : summaryQuery.isError || !summary ? (
        <ReviewErrorState
          title="Không thể tải dashboard Thành phố"
          description={getErrorMessage(summaryQuery.error, "Vui lòng thử tải lại dashboard.")}
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : (
        <div className="space-y-5">
          <Card className="!p-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Năm học
                <select
                  aria-label="Năm học"
                  value={activeSchoolYear}
                  onChange={(event) => changeSchoolYear(event.target.value)}
                  disabled={summary.availableSchoolYears.length === 0}
                  className="h-9 rounded-md bg-[var(--surface-muted)] px-3 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  {summary.availableSchoolYears.length === 0 ? (
                    <option value="">Chưa có năm học</option>
                  ) : (
                    summary.availableSchoolYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Trường
                <select
                  aria-label="Trường"
                  value={workspaceId}
                  onChange={(event) => changeSchool(event.target.value)}
                  className="h-9 rounded-md bg-[var(--surface-muted)] px-3 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="">Tất cả trường</option>
                  {summary.filterOptions.schools.map((school) => (
                    <option key={school.workspaceId} value={school.workspaceId}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-muted-foreground">
                Trạng thái hồ sơ
                <select
                  aria-label="Trạng thái hồ sơ"
                  value={status}
                  onChange={(event) => changeStatus(event.target.value)}
                  className="h-9 rounded-md bg-[var(--surface-muted)] px-3 text-sm text-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <option value="">Mọi trạng thái</option>
                  {applicationStatuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Card>

          {isEmptyYear ? (
            <Card>
              <div
                className="flex items-center gap-2 py-2 text-sm text-muted-foreground"
                role="status"
              >
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Chưa có hồ sơ Thành phố trong dữ liệu.
              </div>
            </Card>
          ) : null}

          <CityAnalyticsSummarySections summary={summary} onOpenList={openDrilldown} />

          {drilldown ? (
            <Card className="p-0" id="city-analytics-applications">
              <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                <SectionHeading
                  title="Danh sách hồ sơ"
                  description={`${drilldown.title} · ${listQuery.data?.pagination.total ?? 0} hồ sơ`}
                />
                <Button variant="outline" size="sm" onClick={() => setDrilldown(null)}>
                  Đóng danh sách
                </Button>
              </div>
              <div className="grid gap-2 border-b p-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="relative sm:col-span-2">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    aria-label="Tìm hồ sơ"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm theo tên hoặc MSSV"
                    className="h-9 w-full rounded-md bg-[var(--surface-muted)] pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                </label>
                <select
                  aria-label="Tiêu chí trong danh sách"
                  value={drilldown.filters.criterion ?? ""}
                  onChange={(event) => updateDrilldownFilter("criterion", event.target.value)}
                  className="h-9 rounded-md bg-[var(--surface-muted)] px-3 text-sm"
                >
                  <option value="">Mọi tiêu chí</option>
                  {criterionOrder.map((criterion) => (
                    <option key={criterion} value={criterion}>
                      {criterionLabels[criterion]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Trạng thái task trong danh sách"
                  value={drilldown.filters.taskStatus ?? ""}
                  onChange={(event) => updateDrilldownFilter("taskStatus", event.target.value)}
                  className="h-9 rounded-md bg-[var(--surface-muted)] px-3 text-sm"
                >
                  <option value="">Mọi trạng thái task</option>
                  {taskStatuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Kết quả cuối trong danh sách"
                  value={drilldown.filters.finalStatus ?? ""}
                  onChange={(event) => updateDrilldownFilter("finalStatus", event.target.value)}
                  className="h-9 rounded-md bg-[var(--surface-muted)] px-3 text-sm"
                >
                  <option value="">Mọi kết quả cuối</option>
                  {finalStatuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {listQuery.isLoading ? (
                <ReviewLoadingState label="Đang tải danh sách hồ sơ..." />
              ) : listQuery.isError ? (
                <ReviewErrorState
                  title="Không thể tải danh sách hồ sơ"
                  description={getErrorMessage(listQuery.error, "Vui lòng thử lại.")}
                  onRetry={() => void listQuery.refetch()}
                />
              ) : (
                <>
                  <div
                    className="overflow-x-auto"
                    role="region"
                    aria-label="Danh sách City hồ sơ"
                    tabIndex={0}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sinh viên</TableHead>
                          <TableHead>Trường</TableHead>
                          <TableHead>Năm học</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead className="text-right">Review</TableHead>
                          <TableHead>Kết quả</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listQuery.data?.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Link
                                to="/app/manager/results/$applicationId"
                                params={{ applicationId: item.id }}
                                search={{
                                  filter: undefined,
                                  focus: undefined,
                                  resolutionCaseId: undefined,
                                }}
                                className="font-semibold text-brand-deep underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                              >
                                {item.student.fullName}
                              </Link>
                              <div className="text-xs text-muted-foreground">
                                {item.student.studentCode ?? "Chưa có MSSV"}
                              </div>
                              {item.reviewProgress.anomalous ? (
                                <Badge variant="outline" className="mt-1">
                                  Dữ liệu task bất thường
                                </Badge>
                              ) : null}
                            </TableCell>
                            <TableCell>{item.school.name}</TableCell>
                            <TableCell>{item.schoolYear}</TableCell>
                            <TableCell>{applicationStatusLabel(item.status)}</TableCell>
                            <TableCell className="text-right">
                              {item.reviewProgress.reviewed}/{item.reviewProgress.expected}
                            </TableCell>
                            <TableCell>{finalStatusLabel(item.finalStatus)}</TableCell>
                          </TableRow>
                        ))}
                        {listQuery.data?.items.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="py-8 text-center text-muted-foreground"
                            >
                              Không có hồ sơ phù hợp.
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
                    <span className="text-muted-foreground">
                      Trang {listQuery.data?.pagination.page ?? page} /{" "}
                      {Math.max(1, listQuery.data?.pagination.totalPages ?? 0)} ·{" "}
                      {listQuery.data?.pagination.total ?? 0} hồ sơ
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || listQuery.isFetching}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        Trang trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          page >= (listQuery.data?.pagination.totalPages ?? 0) ||
                          listQuery.isFetching
                        }
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Trang sau
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          ) : null}
        </div>
      )}
    </>
  );

  function updateDrilldownFilter(key: "criterion" | "taskStatus" | "finalStatus", value: string) {
    if (!drilldown) return;
    setDrilldown({
      ...drilldown,
      filters: { ...drilldown.filters, [key]: value || undefined },
    });
    setPage(1);
  }
}

function applicationStatusLabel(status: CityAnalyticsStatus) {
  return applicationStatuses.find((item) => item.value === status)?.label ?? status;
}

function finalStatusLabel(status: string) {
  return finalStatuses.find((item) => item.value === status)?.label ?? status;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-bold text-brand-deep">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
