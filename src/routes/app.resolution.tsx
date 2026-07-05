import { useMemo, useState } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Eye, Filter, Search } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { LevelBadge } from "@/features/review/components/LevelBadge";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { ReviewLoadingState } from "@/features/review/components/ReviewLoadingState";
import type { Criterion, Level, Role } from "@/features/review/types";
import { getErrorMessage } from "@/features/review/utils/errors";
import {
  formatDateTime,
  getCriterionLabel,
} from "@/features/review/utils/formatters";
import { useResolutionCases } from "@/features/resolution/hooks/useResolution";
import type {
  ResolutionCaseListItem,
  ResolutionCasesParams,
  ResolutionCaseStatus,
} from "@/features/resolution/types";

export const Route = createFileRoute("/app/resolution")({
  component: ResolutionCasesRoute,
});

const managerRoles: Role[] = ["officer", "manager", "committee", "admin"];
const defaultLimit = 10;
const fallbackText = "Chưa có dữ liệu";

const criterionOptions: Criterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
];

const statusOptions: ResolutionCaseStatus[] = ["open", "in_review", "resolved"];
const levelOptions: Level[] = ["school", "university", "city", "central"];

function ResolutionCasesRoute() {
  const user = useAuth((state) => state.user);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const role = user?.role as Role | undefined;

  if (!role || !managerRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Hồ sơ hội ý"
          subtitle="Theo dõi các hồ sơ cần xử lý do tiêu chí hoặc minh chứng chưa rõ ràng."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập hồ sơ hội ý.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  if (pathname !== "/app/resolution") {
    return <Outlet />;
  }

  return <ResolutionCasesContent role={role} />;
}

function ResolutionCasesContent({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ResolutionCasesParams>({
    page: 1,
    limit: defaultLimit,
  });

  const { data, error, isError, isFetching, isLoading, refetch } = useResolutionCases(filters);
  const rawItems = useMemo(() => data?.items ?? [], [data?.items]);
  const items = useMemo(() => {
    const escalator = filters.escalator?.trim().toLowerCase();
    if (!escalator) return rawItems;

    return rawItems.filter((item) =>
      [
        item.escalatedByName,
        item.escalatedByRole,
        item.createdByName,
        item.createdByRole,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(escalator)),
    );
  }, [filters.escalator, rawItems]);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? defaultLimit;
  const canGoPrevious = page > 1 && !isFetching;
  const canGoNext = items.length >= limit && !isFetching;

  const officerView = role === "officer";

  return (
    <>
      <TopBar
        title={officerView ? "Hội ý của tôi" : "Hồ sơ hội ý"}
        subtitle={
          officerView
            ? "Theo dõi case do bạn chuyển lên hoặc liên quan đến task bạn được giao."
            : "Theo dõi các hồ sơ cần hội ý, minh chứng chưa rõ hoặc trường hợp cán bộ chuyển xử lý."
        }
      />

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tìm kiếm
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                disabled={isFetching}
                placeholder="Tìm theo mã hồ sơ, sinh viên hoặc nội dung hội ý"
                value={filters.q ?? ""}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, page: 1, q: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="min-w-[180px] lg:w-52">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Người chuyển
            </label>
            <Input
              className="mt-1"
              disabled={isFetching}
              placeholder="Tên hoặc vai trò"
              value={filters.escalator ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  escalator: event.target.value,
                  page: 1,
                }))
              }
            />
          </div>

          <FilterSelect
            disabled={isFetching}
            label="Trạng thái"
            value={filters.status ?? "all"}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                status: value === "all" ? undefined : (value as ResolutionCaseStatus),
              }))
            }
          >
            <option value="all">Tất cả trạng thái</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {getResolutionStatusLabel(status)}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            disabled={isFetching}
            label="Tiêu chí"
            value={filters.criterion ?? "all"}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                criterion: value === "all" ? undefined : (value as Criterion),
              }))
            }
          >
            <option value="all">Tất cả tiêu chí</option>
            {criterionOptions.map((criterion) => (
              <option key={criterion} value={criterion}>
                {getCriterionLabel(criterion)}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            disabled={isFetching}
            label="Cấp xét"
            value={filters.level ?? "all"}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                page: 1,
                level: value === "all" ? undefined : (value as Level),
              }))
            }
          >
            <option value="all">Tất cả cấp xét</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {getLevelFilterLabel(level)}
              </option>
            ))}
          </FilterSelect>

          <Button
            disabled={isFetching}
            type="button"
            variant="outline"
            onClick={() => setFilters({ page: 1, limit: defaultLimit })}
          >
            <Filter className="h-4 w-4" />
            Xóa lọc
          </Button>
        </div>
      </Card>

      <div className="mt-5">
        {isLoading ? (
          <ReviewLoadingState label="Đang tải danh sách hồ sơ hội ý..." />
        ) : isError ? (
          <ReviewErrorState
            title="Không thể tải hồ sơ hội ý"
            description={getErrorMessage(
              error,
              "Vui lòng thử lại hoặc kiểm tra quyền truy cập với backend.",
            )}
            onRetry={() => void refetch()}
          />
        ) : items.length ? (
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã case</TableHead>
                  <TableHead>Sinh viên</TableHead>
                  <TableHead>Tiêu chí</TableHead>
                  <TableHead>Cấp xét</TableHead>
                  <TableHead>Lý do hội ý</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Người chuyển</TableHead>
                  <TableHead>Ngày chuyển</TableHead>
                  <TableHead>Minh chứng</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/app/resolution/$id", params: { id: item.id } })}
                  >
                    <TableCell className="font-semibold text-brand-deep">
                      #{shortId(item.id)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {item.studentName || fallbackText}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[item.studentCode, item.faculty, item.className]
                          .filter(Boolean)
                          .join(" / ") || fallbackText}
                      </div>
                    </TableCell>
                    <TableCell>
                      <CriterionBadge criterion={item.criterion} />
                    </TableCell>
                    <TableCell>
                      <LevelBadge level={item.targetLevel} />
                    </TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="line-clamp-2 text-sm text-foreground">
                        {item.reason || "Chưa có lý do hội ý"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${resolutionStatusClass(item.status)}`}>
                        {getResolutionStatusLabel(item.status)}
                      </span>
                    </TableCell>
                    <TableCell>{getCreatorLabel(item)}</TableCell>
                    <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      {item.evidenceIds?.length ? `${item.evidenceIds.length} minh chứng` : "Chưa liên kết"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate({ to: "/app/resolution/$id", params: { id: item.id } });
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <EmptyReviewState
            title="Chưa có case hội ý."
            description="Các trường hợp cán bộ chuyển hội ý sẽ hiển thị tại đây với đầy đủ hồ sơ, task và minh chứng liên quan."
          />
        )}
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

function FilterSelect({
  children,
  disabled,
  label,
  value,
  onChange,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-48">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <select
        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function getCreatorLabel(item: ResolutionCaseListItem) {
  const name = item.escalatedByName || item.createdByName;
  const role = item.escalatedByRole || item.createdByRole;

  if (!name && !role) {
    return fallbackText;
  }

  return [name, formatResolutionRole(role)].filter(Boolean).join(" / ");
}

function getResolutionStatusLabel(status: ResolutionCaseStatus) {
  if (status === "resolved") {
    return "Đã kết luận";
  }

  if (status === "in_review") {
    return "Đang xem xét";
  }

  return "Chờ hội ý";
}

function resolutionStatusClass(status: ResolutionCaseStatus) {
  if (status === "resolved") return "bg-emerald-50 text-emerald-700";
  if (status === "in_review") return "bg-sky-50 text-sky-700";
  return "bg-violet-50 text-violet-700";
}

function getLevelFilterLabel(level: Level) {
  const labels: Record<Level, string> = {
    school: "Cấp Trường",
    university: "Cấp ĐHĐN",
    city: "Cấp Thành phố",
    central: "Cấp Trung ương",
  };
  return labels[level];
}

function formatResolutionRole(role?: string | null) {
  if (!role) return "";
  if (role === "officer") return "Cán bộ xét duyệt";
  if (role === "manager") return "Cấp quản lý";
  if (role === "committee") return "Hội đồng";
  if (role === "admin") return "Quản trị viên";
  return role;
}

function shortId(id?: string | null) {
  return id ? id.slice(0, 8).toUpperCase() : "N/A";
}
