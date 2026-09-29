import { useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/store/auth-store";
import { ApiError } from "@/lib/api/client";
import { useClaimReviewTask, useReviewTasks } from "../hooks/useReview";
import type {
  Criterion,
  ReviewTaskListItem,
  ReviewTaskListParams,
  ReviewTaskStatus,
} from "../types";
import { getErrorMessage } from "../utils/errors";
import { getCriterionLabel, getLevelLabel } from "../utils/formatters";
import { EmptyReviewState } from "./EmptyReviewState";
import { ReviewErrorState } from "./ReviewErrorState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CITY_CRITERIA: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];
const PAGE_SIZE = 20;

type CityQueueTab =
  | { key: "waiting"; label: "Cần xử lý"; status: ReviewTaskStatus }
  | { key: "reviewing"; label: "Đang xét"; status: ReviewTaskStatus }
  | { key: "supplement_required"; label: "Chờ bổ sung"; status: ReviewTaskStatus }
  | { key: "resolution_needed"; label: "Cần Hội đồng"; status: ReviewTaskStatus }
  | { key: "completed"; label: "Đã hoàn thành"; statuses: [ReviewTaskStatus, ReviewTaskStatus] };

const CITY_QUEUE_TABS: CityQueueTab[] = [
  { key: "waiting", label: "Cần xử lý", status: "waiting" },
  { key: "reviewing", label: "Đang xét", status: "reviewing" },
  { key: "supplement_required", label: "Chờ bổ sung", status: "supplement_required" },
  { key: "resolution_needed", label: "Cần Hội đồng", status: "resolution_needed" },
  { key: "completed", label: "Đã hoàn thành", statuses: ["accepted", "rejected"] },
];

const STATUS_LABELS: Record<ReviewTaskStatus, string> = {
  waiting: "Chờ xử lý",
  reviewing: "Đang xét",
  supplement_required: "Chờ sinh viên bổ sung",
  resolution_needed: "Đã chuyển Hội đồng",
  accepted: "Tiêu chí đạt",
  rejected: "Tiêu chí không đạt",
};

export function CityOfficerQueue() {
  const user = useAuth((state) => state.user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CityQueueTab["key"]>("waiting");
  const [criterion, setCriterion] = useState<Criterion | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
  const claimingTaskRef = useRef<string | null>(null);

  const specializedCriteria = useMemo(
    () =>
      Array.from(
        new Set(
          (user?.officerSpecializations ?? [])
            .filter((specialization) => specialization.isActive !== false)
            .map((specialization) => specialization.criterion)
            .filter((value): value is Criterion => CITY_CRITERIA.includes(value)),
        ),
      ),
    [user?.officerSpecializations],
  );

  const selectedTab = CITY_QUEUE_TABS.find((tab) => tab.key === activeTab) ?? CITY_QUEUE_TABS[0];
  const queryParams = useMemo<ReviewTaskListParams>(() => {
    const params: ReviewTaskListParams = {
      page,
      limit: PAGE_SIZE,
      q: search.trim() || undefined,
      criterion: criterion === "all" ? undefined : criterion,
    };

    if ("statuses" in selectedTab) {
      params.statuses = selectedTab.statuses;
    } else {
      params.status = selectedTab.status;
    }

    return params;
  }, [criterion, page, search, selectedTab]);

  const { data, error, isError, isFetching, isLoading, refetch } = useReviewTasks(queryParams);
  const claimTask = useClaimReviewTask();
  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  const openTask = (taskId: string) => {
    navigate({ to: "/app/review/$id", params: { id: taskId } });
  };

  const selectTab = (key: CityQueueTab["key"]) => {
    setActiveTab(key);
    setPage(1);
  };

  const claim = async (taskId: string) => {
    if (claimingTaskRef.current) return;
    claimingTaskRef.current = taskId;
    setClaimingTaskId(taskId);

    try {
      await claimTask.mutateAsync(taskId);
      await refetch();
      navigate({ to: "/app/review/$id", params: { id: taskId } });
    } catch (claimError) {
      if (isConflictError(claimError)) {
        toast.error("Hồ sơ này vừa được cán bộ khác nhận xử lý. Danh sách đã được cập nhật.");
      } else {
        toast.error(getErrorMessage(claimError, "Không thể nhận xử lý hồ sơ. Vui lòng thử lại."));
      }
      await refetch();
    } finally {
      claimingTaskRef.current = null;
      setClaimingTaskId(null);
    }
  };

  if (!specializedCriteria.length) {
    return (
      <>
        <TopBar
          title="Hàng đợi xét duyệt cấp Thành phố"
          subtitle="Các task cá nhân trong phạm vi tiêu chí được phân công cho bạn."
        />
        <Card className="mt-5 border-dashed p-8 text-center">
          <div className="text-lg font-bold text-brand-deep">
            Tài khoản chưa được phân công tiêu chí
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Vui lòng liên hệ quản trị viên để gán một hoặc nhiều tiêu chí City trước khi xử lý hồ
            sơ.
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Hàng đợi xét duyệt cấp Thành phố"
        subtitle="Theo dõi task cá nhân theo tiêu chí, trạng thái và phân công xử lý."
      />

      <Card className="mt-5 space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-brand-deep">Phạm vi chuyên trách</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {specializedCriteria.map((value) => (
                <Badge key={value} variant="secondary">
                  {getCriterionLabel(value)}
                </Badge>
              ))}
            </div>
          </div>
          {isFetching && !isLoading ? (
            <span className="text-xs text-muted-foreground" role="status">
              Đang cập nhật danh sách…
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trạng thái hàng đợi">
          {CITY_QUEUE_TABS.map((tab) => (
            <Button
              key={tab.key}
              aria-selected={activeTab === tab.key}
              role="tab"
              type="button"
              variant={activeTab === tab.key ? "default" : "outline"}
              onClick={() => selectTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(260px,1fr)_minmax(180px,220px)]">
          <label className="relative block">
            <span className="sr-only">Tìm sinh viên hoặc MSSV</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm sinh viên hoặc MSSV"
              className="pl-9"
              placeholder="Tìm tên sinh viên hoặc MSSV"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="text-sm">
            <span className="sr-only">Lọc tiêu chí</span>
            <select
              aria-label="Lọc tiêu chí"
              className="h-9 w-full rounded-[var(--radius-control)] border border-[var(--border-control)] bg-[var(--surface-primary)] px-3 text-sm"
              value={criterion}
              onChange={(event) => {
                setCriterion(event.target.value as Criterion | "all");
                setPage(1);
              }}
            >
              <option value="all">Tất cả tiêu chí</option>
              {specializedCriteria.map((value) => (
                <option key={value} value={value}>
                  {getCriterionLabel(value)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isError ? (
          <ReviewErrorState
            title="Không thể tải hàng đợi City"
            description={getErrorMessage(error, "Vui lòng thử lại sau.")}
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
            Đang tải task cần xét…
          </div>
        ) : items.length === 0 ? (
          <EmptyReviewState
            title="Không có task trong trạng thái này"
            description="Danh sách sẽ tự cập nhật khi backend trả về task thuộc phạm vi chuyên trách của bạn."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sinh viên</TableHead>
                  <TableHead>Tiêu chí</TableHead>
                  <TableHead>Cấp xét</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Phân công</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <CityQueueRow
                    key={item.id}
                    item={item}
                    isClaiming={claimingTaskId === item.id}
                    onClaim={() => void claim(item.id)}
                    onOpen={() => openTask(item.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3 text-sm text-muted-foreground">
          <span>
            Trang {pagination?.page ?? page} / {Math.max(totalPages, 1)}
          </span>
          <div className="flex gap-2">
            <Button
              aria-label="Trang trước"
              disabled={page <= 1 || isFetching}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ArrowLeft />
              Trước
            </Button>
            <Button
              aria-label="Trang sau"
              disabled={page >= totalPages || isFetching}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
              <ArrowRight />
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}

function CityQueueRow({
  item,
  isClaiming,
  onClaim,
  onOpen,
}: {
  item: ReviewTaskListItem;
  isClaiming: boolean;
  onClaim: () => void;
  onOpen: () => void;
}) {
  const statusLabel = STATUS_LABELS[item.status];
  const assignmentLabel = item.assignedOfficerId
    ? (item.assignedOfficerName ?? "Đã phân công")
    : "Chưa phân công";

  return (
    <TableRow
      className="cursor-pointer"
      data-testid={`city-queue-row-${item.id}`}
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <TableCell className="min-w-[220px]">
        <div className="font-semibold text-brand-deep">{item.studentName || "Chưa có tên"}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {[item.studentCode, item.faculty, item.className].filter(Boolean).join(" • ")}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{getCriterionLabel(item.criterion)}</Badge>
      </TableCell>
      <TableCell>{getLevelLabel(item.targetLevel)}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant={item.status === "rejected" ? "destructive" : "secondary"}>
            {statusLabel}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="max-w-[180px] text-sm">{assignmentLabel}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {item.assignedOfficerId ? "Theo dõi phân công" : "Có thể nhận nếu được phép"}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">
        {item.dueDate ? new Date(item.dueDate).toLocaleDateString("vi-VN") : "Chưa có hạn"}
      </TableCell>
      <TableCell className="text-right">
        {item.permissions?.canClaim ? (
          <Button
            disabled={isClaiming}
            size="sm"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClaim();
            }}
          >
            {isClaiming ? "Đang nhận…" : "Nhận xử lý"}
          </Button>
        ) : (
          <Button
            size="sm"
            type="button"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            Xem task
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function isConflictError(error: unknown) {
  return error instanceof ApiError && (error.status === 409 || error.code === "CONFLICT");
}
