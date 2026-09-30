import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FileWarning,
  Hourglass,
  ListChecks,
  MessageSquare,
  Search,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getOfficerLockedCriterion } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { ReviewErrorState } from "@/features/review/components/ReviewErrorState";
import { CityOfficerQueue } from "@/features/review/components/CityOfficerQueue";
import { ReviewFilters } from "@/features/review/components/ReviewFilters";
import { ReviewDecisionPanel } from "@/features/review/components/ReviewDecisionPanel";
import { ReviewTaskTable } from "@/features/review/components/ReviewTaskTable";
import {
  useClaimReviewTask,
  useReviewTask,
  useReviewTasks,
  useSignedFileUrl,
  useSubmitReviewDecision,
} from "@/features/review/hooks/useReview";
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
  buildEvidenceDisplayModel,
  getFieldLabel,
  getReviewGpaThreshold,
  getMetricValue,
  getVisibleEvidenceFieldEntries,
} from "@/features/review/utils/evidenceDisplay";
import {
  formatDateTime,
  getCriterionLabel,
  getLevelLabel,
  getTaskStatusLabel,
} from "@/features/review/utils/formatters";
import { useSmartUXTracking } from "@/hooks/useSmartUXTracking";

export const Route = createFileRoute("/app/queue")({
  component: ReviewQueueRoute,
});

const allowedRoles: Role[] = [
  "officer",
  "manager",
  "committee",
  "city_officer",
  "city_manager",
  "admin",
];
const defaultLimit = 10;
const officerQueueLimit = 100;
type QueueTab = "all" | "mine" | "due_soon" | "supplement" | "ambiguous";
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
type ReviewMode = "evidence_review" | "criterion_finalize";
type ReviewDrawer =
  null | "queue" | "checklist" | "reference" | "ai" | "technical_log" | "evidence_list";
type EvidenceDecisionStatus = "accepted" | "supplement_required" | "rejected" | "resolution_needed";
type EvidenceDecisionDraft = {
  status: EvidenceDecisionStatus;
  reason?: string;
  note?: string;
  supplementDeadline?: string;
  selectedQuickReasons?: string[];
  decidedAt: string;
};
type ReviewEvidence = NonNullable<ReviewTaskDetail["evidences"]>[number];
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

const fiveGoodCriteria: Criterion[] = [
  "ethics",
  "academic",
  "physical",
  "volunteer",
  "integration",
];

const officerTabs: Array<{ value: QueueTab; label: string; description: string }> = [
  {
    value: "all",
    label: "Cần xử lý",
    description: "Chỉ hồ sơ chưa chốt và còn cần cán bộ xem xét.",
  },
  { value: "mine", label: "Được giao cho tôi", description: "Task bạn có thể quyết định." },
  { value: "due_soon", label: "Sắp đến hạn", description: "Ưu tiên xử lý theo deadline." },
  {
    value: "supplement",
    label: "Cần bổ sung",
    description: "Hồ sơ đang thiếu hoặc chờ sinh viên bổ sung.",
  },
  { value: "ambiguous", label: "Mập mờ", description: "Confidence thấp hoặc cần hội ý." },
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

  if (role === "city_officer") {
    return <CityOfficerQueue />;
  }

  return <ReviewQueueContent role={role} />;
}

function ReviewQueueContent({ role }: { role: Role }) {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const { trackAction } = useSmartUXTracking();
  const lockedOfficerCriterion = useMemo(
    () => (role === "officer" || role === "city_officer" ? getOfficerLockedCriterion(user) : null),
    [role, user],
  );
  const [activeTab, setActiveTab] = useState<QueueTab>("all");
  const [viewMode, setViewMode] = useState<QueueViewMode>("application");
  const [sortBy, setSortBy] = useState<QueueSort>("newest");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedCriterion, setSelectedCriterion] = useState<Criterion | null>(null);
  const [claimCandidate, setClaimCandidate] = useState<ReviewTaskListItem | null>(null);
  const [filters, setFilters] = useState<ReviewTaskListParams>({
    page: 1,
    limit: role === "officer" || role === "city_officer" ? officerQueueLimit : defaultLimit,
  });
  const [officerItems, setOfficerItems] = useState<ReviewTaskListItem[]>([]);

  const queryParams = useMemo<ReviewTaskListParams>(
    () => ({
      ...filters,
    }),
    [filters],
  );

  const { data, error, isError, isFetching, isLoading, refetch } = useReviewTasks(queryParams);
  const claimTask = useClaimReviewTask();
  const pageItems = useMemo(() => data?.items ?? [], [data?.items]);
  const officerFilterKey = useMemo(
    () => JSON.stringify({ q: filters.q ?? "", limit: filters.limit ?? officerQueueLimit }),
    [filters.limit, filters.q],
  );

  useEffect(() => {
    if (role !== "officer" && role !== "city_officer") return;
    setOfficerItems([]);
  }, [officerFilterKey, role]);

  useEffect(() => {
    if ((role !== "officer" && role !== "city_officer") || !data) return;
    setOfficerItems((current) => {
      const nextItems = (filters.page ?? 1) <= 1 ? pageItems : [...current, ...pageItems];
      const byId = new Map<string, ReviewTaskListItem>();
      for (const item of nextItems) byId.set(item.id, item);
      return Array.from(byId.values());
    });
  }, [data, filters.page, pageItems, role]);

  const items = useMemo(
    () => (role === "officer" || role === "city_officer" ? officerItems : pageItems),
    [officerItems, pageItems, role],
  );
  const officerScopedItems = useMemo(
    () =>
      (role === "officer" || role === "city_officer") && lockedOfficerCriterion
        ? items.filter(
            (item) => item.criterion === lockedOfficerCriterion && hasCriterionEvidenceTask(item),
          )
        : items,
    [items, lockedOfficerCriterion, role],
  );
  const officerQueueItems = useMemo(
    () =>
      role === "officer" || role === "city_officer"
        ? officerScopedItems.filter((item) => isOfficerQueueVisibleTask(item))
        : officerScopedItems,
    [officerScopedItems, role],
  );
  const isOfficer = role === "officer" || role === "city_officer";
  const summaryItems = isOfficer ? officerQueueItems : items;
  const summary = useMemo(() => getCurrentListSummary(summaryItems), [summaryItems]);
  const allApplicationGroups = useMemo(
    () => groupOfficerApplications(isOfficer ? officerQueueItems : items),
    [isOfficer, items, officerQueueItems],
  );
  const officerScopedGroups = useMemo(
    () =>
      isOfficer && lockedOfficerCriterion
        ? allApplicationGroups.filter((group) =>
            hasCriterionEvidenceTask(getTaskForCriterion(group, lockedOfficerCriterion)),
          )
        : allApplicationGroups,
    [allApplicationGroups, isOfficer, lockedOfficerCriterion],
  );
  const priorityGroups = useMemo(() => getPriorityApplicationGroups(items).slice(0, 6), [items]);
  const visibleItems = useMemo(
    () =>
      sortQueueItems(isOfficer ? filterOfficerTasks(officerQueueItems, activeTab) : items, sortBy),
    [activeTab, isOfficer, items, officerQueueItems, sortBy],
  );
  const visibleGroups = useMemo(() => {
    if (isOfficer) {
      if (!lockedOfficerCriterion) return [];
      return sortQueueGroups(
        filterOfficerGroupsByCriterion(officerScopedGroups, activeTab, lockedOfficerCriterion),
        sortBy,
        lockedOfficerCriterion,
      );
    }
    return sortQueueGroups(groupOfficerApplications(visibleItems), sortBy);
  }, [activeTab, isOfficer, lockedOfficerCriterion, officerScopedGroups, sortBy, visibleItems]);
  const selectedGroup = useMemo(
    () =>
      visibleGroups.find((group) => group.applicationId === selectedApplicationId) ??
      visibleGroups[0] ??
      null,
    [selectedApplicationId, visibleGroups],
  );

  useEffect(() => {
    if (!isOfficer || viewMode !== "application") return;
    if (!lockedOfficerCriterion) {
      setSelectedApplicationId(null);
      setSelectedCriterion(null);
      return;
    }
    if (!visibleGroups.length) {
      setSelectedApplicationId(null);
      setSelectedCriterion(lockedOfficerCriterion);
      return;
    }
    if (selectedCriterion !== lockedOfficerCriterion) {
      setSelectedCriterion(lockedOfficerCriterion);
    }
    const stillVisible = selectedApplicationId
      ? visibleGroups.some((group) => group.applicationId === selectedApplicationId)
      : false;
    if (!stillVisible) {
      const nextGroup = visibleGroups[0];
      setSelectedApplicationId(nextGroup.applicationId);
      setSelectedCriterion(lockedOfficerCriterion);
    }
  }, [
    lockedOfficerCriterion,
    isOfficer,
    selectedApplicationId,
    selectedCriterion,
    viewMode,
    visibleGroups,
  ]);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? defaultLimit;
  const canGoPrevious = page > 1 && !isFetching;
  const canGoNext = pageItems.length >= limit && !isFetching;

  const openTask = (taskId: string) => {
    const task = items.find((item) => item.id === taskId);
    trackAction("officer_open_task", {
      role,
      criterion: task?.criterion,
      status: task?.status,
      target_level: task?.targetLevel,
    });
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

  if (isOfficer) {
    if (!lockedOfficerCriterion) {
      return (
        <>
          <TopBar
            title="Việc cần xử lý"
            subtitle="Hàng đợi xét duyệt SV5T theo hồ sơ, tiêu chí, minh chứng và quyết định cần làm."
          />
          <div className="mt-5 rounded-2xl border border-dashed border-[#D7E3F2] bg-white p-8 text-center">
            <div className="text-lg font-bold text-brand-deep">
              Tài khoản chưa được phân công tiêu chí
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Vui lòng liên hệ quản trị viên để gán một tiêu chí xét duyệt trước khi xử lý hồ sơ.
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <TopBar
          title="Việc cần xử lý"
          subtitle="Hàng đợi xét duyệt SV5T theo hồ sơ, tiêu chí, minh chứng và quyết định cần làm."
        />

        <OfficerLeanReviewQueue
          activeTab={activeTab}
          canLoadMore={canGoNext}
          filters={filters}
          groups={visibleGroups}
          isError={isError}
          isFetching={isFetching}
          isLoading={isLoading}
          lockedCriterion={lockedOfficerCriterion}
          onClaimTask={(task) => setClaimCandidate(task)}
          onOpenTask={openTask}
          onRetry={() => void refetch()}
          onLoadMore={() =>
            setFilters((current) => ({
              ...current,
              page: (current.page ?? 1) + 1,
            }))
          }
          onSearchChange={(q) =>
            setFilters((current) => ({
              ...current,
              q,
              page: 1,
              limit: current.limit ?? officerQueueLimit,
            }))
          }
          onSelectCriterion={() => setSelectedCriterion(lockedOfficerCriterion)}
          onSelectGroup={(group) => {
            setSelectedApplicationId(group.applicationId);
            setSelectedCriterion(lockedOfficerCriterion);
          }}
          onTabChange={setActiveTab}
          selectedApplicationId={selectedGroup?.applicationId ?? null}
          selectedCriterion={lockedOfficerCriterion}
          selectedGroup={selectedGroup}
          sortBy={sortBy}
          taskItems={officerQueueItems}
          errorDescription={getErrorMessage(
            error,
            "Không thể tải hàng đợi xét duyệt. Vui lòng thử lại sau.",
          )}
          onSortChange={setSortBy}
        />

        <ClaimTaskDialog
          claimCandidate={claimCandidate}
          isPending={claimTask.isPending}
          onCancel={() => setClaimCandidate(null)}
          onConfirm={confirmClaimTask}
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Hàng đợi xét duyệt"
        subtitle="Theo dõi và xử lý các hồ sơ được phân công theo từng tiêu chí Sinh viên 5 tốt."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={isOfficer ? "Hồ sơ trong phạm vi" : "Tổng task trong danh sách"}
          value={isOfficer ? allApplicationGroups.length : summary.total}
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

      {isOfficer ? (
        <>
          <Card className="mt-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-bold text-brand-deep">Chế độ hiển thị</h2>
                <p className="text-sm text-muted-foreground">
                  Mặc định xem theo hồ sơ để tránh lặp sinh viên. Chỉ chuyển sang tiêu chí khi cần
                  rà từng task rời.
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
          ) : isOfficer ? (
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

      <ClaimTaskDialog
        claimCandidate={claimCandidate}
        isPending={claimTask.isPending}
        onCancel={() => setClaimCandidate(null)}
        onConfirm={confirmClaimTask}
      />
    </>
  );
}

function ClaimTaskDialog({
  claimCandidate,
  isPending,
  onCancel,
  onConfirm,
}: {
  claimCandidate: ReviewTaskListItem | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(claimCandidate)} onOpenChange={(open) => !open && onCancel()}>
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
              {claimCandidate.studentCode || "Chưa có MSSV"} •{" "}
              {getCriterionLabel(claimCandidate.criterion)} •{" "}
              {getLevelLabel(claimCandidate.targetLevel)}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>
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

function OfficerLeanReviewQueue({
  activeTab,
  canLoadMore,
  errorDescription,
  filters,
  groups,
  isError,
  isFetching,
  isLoading,
  lockedCriterion,
  onClaimTask,
  onLoadMore,
  onOpenTask,
  onRetry,
  onSearchChange,
  onSelectCriterion,
  onSelectGroup,
  onSortChange,
  onTabChange,
  selectedApplicationId,
  selectedCriterion,
  selectedGroup,
  sortBy,
  taskItems,
}: {
  activeTab: QueueTab;
  canLoadMore: boolean;
  errorDescription: string;
  filters: ReviewTaskListParams;
  groups: OfficerApplicationGroup[];
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  lockedCriterion: Criterion;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onLoadMore: () => void;
  onOpenTask: (taskId: string) => void;
  onRetry: () => void;
  onSearchChange: (q: string) => void;
  onSelectCriterion: (criterion: Criterion) => void;
  onSelectGroup: (group: OfficerApplicationGroup, criterion?: Criterion) => void;
  onSortChange: (sort: QueueSort) => void;
  onTabChange: (tab: QueueTab) => void;
  selectedApplicationId: string | null;
  selectedCriterion: Criterion | null;
  selectedGroup: OfficerApplicationGroup | null;
  sortBy: QueueSort;
  taskItems: ReviewTaskListItem[];
}) {
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);

  if (isError) {
    return (
      <div className="mt-5">
        <ReviewErrorState description={errorDescription} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="mt-5 min-w-0">
      <div className="mb-3 flex lg:hidden">
        <Button type="button" variant="outline" onClick={() => setQueueDrawerOpen(true)}>
          <ClipboardList className="h-4 w-4" />
          Mở danh sách hồ sơ
        </Button>
      </div>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)] min-[1440px]:grid-cols-[340px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <OfficerQueueColumn
            activeTab={activeTab}
            canLoadMore={canLoadMore}
            filters={filters}
            groups={groups}
            isFetching={isFetching}
            isLoading={isLoading}
            lockedCriterion={lockedCriterion}
            onLoadMore={onLoadMore}
            onSearchChange={onSearchChange}
            onSelectGroup={onSelectGroup}
            onSortChange={onSortChange}
            onTabChange={onTabChange}
            selectedApplicationId={selectedApplicationId}
            sortBy={sortBy}
            taskItems={taskItems}
          />
        </div>

        <SequentialOfficerApplicationWorkspace
          activeCriterion={
            lockedCriterion ?? selectedCriterion ?? getDefaultCriterionForGroup(selectedGroup)
          }
          group={selectedGroup}
          onClaimTask={onClaimTask}
          onOpenTask={onOpenTask}
          onSelectCriterion={onSelectCriterion}
        />
      </div>

      <Sheet open={queueDrawerOpen} onOpenChange={setQueueDrawerOpen}>
        <SheetContent side="left" className="w-full overflow-y-auto p-3 sm:max-w-md">
          <SheetHeader className="mb-3 pr-8">
            <SheetTitle>Việc cần xử lý</SheetTitle>
            <SheetDescription>Chọn hồ sơ để tiếp tục xét duyệt.</SheetDescription>
          </SheetHeader>
          <OfficerQueueColumn
            activeTab={activeTab}
            canLoadMore={canLoadMore}
            filters={filters}
            groups={groups}
            isFetching={isFetching}
            isLoading={isLoading}
            lockedCriterion={lockedCriterion}
            onLoadMore={onLoadMore}
            onSearchChange={onSearchChange}
            onSelectGroup={(group, criterion) => {
              onSelectGroup(group, criterion);
              setQueueDrawerOpen(false);
            }}
            onSortChange={onSortChange}
            onTabChange={onTabChange}
            selectedApplicationId={selectedApplicationId}
            sortBy={sortBy}
            taskItems={taskItems}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OfficerQueueColumn({
  activeTab,
  canLoadMore,
  filters,
  groups,
  isFetching,
  isLoading,
  lockedCriterion,
  onLoadMore,
  onSearchChange,
  onSelectGroup,
  onSortChange,
  onTabChange,
  selectedApplicationId,
  sortBy,
  taskItems,
}: {
  activeTab: QueueTab;
  canLoadMore: boolean;
  filters: ReviewTaskListParams;
  groups: OfficerApplicationGroup[];
  isFetching: boolean;
  isLoading: boolean;
  lockedCriterion?: Criterion;
  onLoadMore: () => void;
  onSearchChange: (q: string) => void;
  onSelectGroup: (group: OfficerApplicationGroup, criterion?: Criterion) => void;
  onSortChange: (sort: QueueSort) => void;
  onTabChange: (tab: QueueTab) => void;
  selectedApplicationId: string | null;
  sortBy: QueueSort;
  taskItems: ReviewTaskListItem[];
}) {
  return (
    <aside className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm lg:sticky lg:top-4">
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold text-brand-deep">Việc cần xử lý</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {groups.length} hồ sơ • {taskItems.length} task
          </p>
        </div>
        {isFetching ? <Badge variant="outline">Đang tải</Badge> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {officerTabs.map((tab) => {
          const selected = activeTab === tab.value;
          const count = filterOfficerTasks(taskItems, tab.value).length;
          return (
            <button
              key={tab.value}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2]"
                  : "border-[#E5E7EB] bg-white text-slate-600 hover:border-[#9FC4EA]"
              }`}
              onClick={() => onTabChange(tab.value)}
              title={tab.description}
              data-smartux-tag="officer_open_queue"
            >
              {tab.label} <span className="ml-1 text-[11px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-3 flex h-10 min-w-0 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm focus-within:border-[#0057C2]">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
          disabled={isFetching}
          placeholder="Tìm tên, MSSV, lớp..."
          value={filters.q ?? ""}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      <label className="mt-3 flex items-center justify-between gap-2 px-1 text-xs font-semibold text-slate-600">
        Sắp xếp
        <select
          className="h-8 rounded-lg border border-[#E5E7EB] bg-white px-2 text-xs outline-none"
          value={sortBy}
          disabled={isFetching}
          onChange={(event) => onSortChange(event.target.value as QueueSort)}
        >
          <option value="newest">Mới nhất</option>
          <option value="review_need">Mức cần xử lý</option>
          <option value="deadline">Deadline gần nhất</option>
          <option value="student_name">Sinh viên A-Z</option>
          <option value="evidence_count">Số minh chứng</option>
        </select>
      </label>

      <div className="mt-3 max-h-[calc(100dvh-300px)] space-y-2 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] p-4 text-sm text-muted-foreground">
            Đang tải hàng đợi...
          </div>
        ) : groups.length ? (
          groups.map((group) => (
            <OfficerCaseCompactCard
              group={group}
              isSelected={group.applicationId === selectedApplicationId}
              key={group.applicationId}
              lockedCriterion={lockedCriterion}
              onSelect={onSelectGroup}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[#E5E7EB] p-4 text-sm text-muted-foreground">
            {lockedCriterion
              ? `Chưa có hồ sơ có minh chứng ${getCriterionLabel(lockedCriterion)} cần xét.`
              : "Chưa có hồ sơ trong bộ lọc này."}
          </div>
        )}
      </div>
      {canLoadMore ? (
        <Button
          className="mt-3 w-full"
          disabled={isFetching}
          type="button"
          variant="outline"
          onClick={onLoadMore}
        >
          {isFetching ? "Đang tải thêm..." : "Tải thêm hồ sơ"}
        </Button>
      ) : null}
    </aside>
  );
}

function SequentialOfficerApplicationWorkspace({
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
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("evidence_review");
  const [openDrawer, setOpenDrawer] = useState<ReviewDrawer>(null);
  const [evidenceDecisions, setEvidenceDecisions] = useState<Record<string, EvidenceDecisionDraft>>(
    {},
  );
  const workspaceTopRef = useRef<HTMLDivElement>(null);
  const lastSessionKeyRef = useRef("");
  const activeTask = group && activeCriterion ? getTaskForCriterion(group, activeCriterion) : null;
  const { data: activeDetail = null, isLoading: isDetailLoading } = useReviewTask(activeTask?.id);
  const evidenceItems = useMemo(
    () =>
      (activeDetail?.evidences ?? []).filter(
        (evidence) => evidence.criterion === activeTask?.criterion,
      ),
    [activeDetail?.evidences, activeTask?.criterion],
  );
  const evidenceKey = evidenceItems.map((evidence) => evidence.id).join("|");
  const currentEvidence = evidenceItems[activeEvidenceIndex] ?? null;
  const currentDraft = currentEvidence ? evidenceDecisions[currentEvidence.id] : undefined;
  const nextCriterion =
    group && activeTask ? getNextActionableCriterion(group, activeTask.criterion) : null;
  const resolvedCount = evidenceItems.filter((evidence) =>
    isEvidenceResolvedForCriterion(evidence, evidenceDecisions),
  ).length;
  const isApplicationEvidenceLoading = isDetailLoading;

  useEffect(() => {
    const sessionKey = `${activeTask?.id ?? "none"}:${evidenceKey}`;
    if (lastSessionKeyRef.current === sessionKey) return;
    lastSessionKeyRef.current = sessionKey;
    setReviewMode("evidence_review");
    setOpenDrawer(null);
    setActiveEvidenceIndex(getNextUnresolvedEvidenceIndex(evidenceItems, evidenceDecisions));
  }, [activeTask?.id, evidenceDecisions, evidenceItems, evidenceKey]);

  if (!group || !activeTask) {
    return (
      <section className="rounded-2xl border border-dashed border-[#D7E3F2] bg-white p-8 text-center text-sm text-muted-foreground">
        Chọn một hồ sơ ở danh sách để bắt đầu xét duyệt.
      </section>
    );
  }

  const handleSelectCriterion = (criterion: Criterion) => {
    onSelectCriterion(criterion);
    setReviewMode("evidence_review");
  };
  const goToEvidence = (index: number) => {
    setReviewMode("evidence_review");
    setActiveEvidenceIndex(Math.max(0, Math.min(index, Math.max(0, evidenceItems.length - 1))));
    workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const saveDecisionDraft = (evidenceId: string, draft: EvidenceDecisionDraft) => {
    setEvidenceDecisions((current) => ({ ...current, [evidenceId]: draft }));
    toast.success("Đã lưu xử lý minh chứng.");
  };
  const goToNextStep = () => {
    if (!evidenceItems.length || activeEvidenceIndex >= evidenceItems.length - 1) {
      setReviewMode("criterion_finalize");
      workspaceTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    goToEvidence(activeEvidenceIndex + 1);
  };

  return (
    <section
      ref={workspaceTopRef}
      className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-[#E5E7EB] bg-[#F7F9FC] p-3 shadow-sm"
    >
      <ReviewHeader
        activeTask={activeTask}
        group={group}
        resolvedCount={resolvedCount}
        totalEvidenceCount={evidenceItems.length}
      />
      <OfficerCriterionFocus
        activeTask={activeTask}
        criterionEvidenceCount={evidenceItems.length}
      />

      <div className="mt-3 flex min-h-0 flex-col rounded-2xl border border-[#E5E7EB] bg-white lg:max-h-[calc(100dvh-300px)]">
        <div className="shrink-0 border-b border-[#E5E7EB] p-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <EvidenceStepper
              activeCriterion={activeTask.criterion}
              activeIndex={activeEvidenceIndex}
              drafts={evidenceDecisions}
              evidences={evidenceItems}
              mode={reviewMode}
              onGoFinalize={() => setReviewMode("criterion_finalize")}
              onSelectEvidence={goToEvidence}
            />
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setOpenDrawer("checklist")}
              >
                <ListChecks className="h-4 w-4" />
                Checklist
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setOpenDrawer("reference")}
              >
                <ClipboardList className="h-4 w-4" />
                Đối chiếu
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setOpenDrawer("ai")}>
                <MessageSquare className="h-4 w-4" />
                Trợ lý AI
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setOpenDrawer("technical_log")}
              >
                <Clock3 className="h-4 w-4" />
                Nhật ký
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto p-3">
          {isApplicationEvidenceLoading ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] p-5 text-sm text-muted-foreground">
              Đang tải dữ liệu minh chứng...
            </div>
          ) : reviewMode === "criterion_finalize" ? (
            <CriterionFinalizationPanel
              activeDetail={activeDetail}
              activeTask={activeTask}
              decisions={evidenceDecisions}
              evidences={evidenceItems}
              nextCriterion={nextCriterion}
              onClaimTask={onClaimTask}
              onOpenTask={onOpenTask}
              onSelectCriterion={handleSelectCriterion}
            />
          ) : (
            <ActiveEvidenceReviewSurface
              activeDetail={activeDetail}
              activeTask={activeTask}
              currentDraft={currentDraft}
              evidence={currentEvidence}
              evidenceIndex={activeEvidenceIndex}
              onOpenDrawer={setOpenDrawer}
              onOpenTask={() => onOpenTask(activeTask.id)}
              onSaveDecision={saveDecisionDraft}
              totalEvidenceCount={evidenceItems.length}
            />
          )}
        </div>
      </div>

      {reviewMode === "evidence_review" ? (
        <ReviewBottomBar
          activeIndex={activeEvidenceIndex}
          currentDraft={currentDraft}
          evidenceCount={evidenceItems.length}
          mode={reviewMode}
          onNext={goToNextStep}
          onPrevious={() => goToEvidence(activeEvidenceIndex - 1)}
        />
      ) : null}

      <ReviewDrawers
        activeDetail={activeDetail}
        activeTask={activeTask}
        activeEvidenceIndex={activeEvidenceIndex}
        decisions={evidenceDecisions}
        evidences={evidenceItems}
        openDrawer={openDrawer}
        onOpenChange={(open) => setOpenDrawer(open ? openDrawer : null)}
        onSelectEvidence={(index) => {
          goToEvidence(index);
          setOpenDrawer(null);
        }}
      />
    </section>
  );
}

function ReviewHeader({
  activeTask,
  group,
  resolvedCount,
  totalEvidenceCount,
}: {
  activeTask: ReviewTaskListItem;
  group: OfficerApplicationGroup;
  resolvedCount: number;
  totalEvidenceCount: number;
}) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
      <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="line-clamp-1 text-[20px] font-bold leading-tight text-brand-deep">
            {group.studentName || "Chưa có tên sinh viên"}
          </h2>
          <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {[group.studentCode, group.className, group.faculty].filter(Boolean).join(" • ") ||
              "Chưa có thông tin sinh viên"}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#0057C2]">
            Aim: {getLevelLabel(group.targetLevel)} ·{" "}
            {getApplicationStatusLabel(group.applicationStatus)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{getTaskStatusLabel(activeTask.status)}</Badge>
          <Badge variant="outline">
            {resolvedCount}/{totalEvidenceCount || activeTask.evidenceCount || 0} minh chứng
          </Badge>
          <Badge variant="outline">Deadline {formatDateTime(group.dueDate)}</Badge>
        </div>
      </div>
    </div>
  );
}

function OfficerCriterionFocus({
  activeTask,
  criterionEvidenceCount,
}: {
  activeTask: ReviewTaskListItem;
  criterionEvidenceCount: number;
}) {
  return (
    <div className="mt-3 rounded-xl border border-[#D7E3F2] bg-white px-3 py-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-muted-foreground">
            Tiêu chí phụ trách
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-[#0057C2]">
              {getCriterionLabel(activeTask.criterion)}
            </span>
            <Badge variant="secondary">{getTaskStatusLabel(activeTask.status)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-lg bg-[#EAF3FF] px-3 py-2 text-[#0057C2]">
            {criterionEvidenceCount} minh chứng tiêu chí
          </span>
        </div>
      </div>
    </div>
  );
}

function CriterionStrip({
  activeCriterion,
  group,
  onSelectCriterion,
}: {
  activeCriterion: Criterion;
  group: OfficerApplicationGroup;
  onSelectCriterion: (criterion: Criterion) => void;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      {fiveGoodCriteria.map((criterion) => {
        const task = group.tasks.find((item) => item.criterion === criterion);
        const selected = criterion === activeCriterion;
        return (
          <button
            className={`min-h-16 rounded-xl border px-3 py-2 text-left transition ${
              selected
                ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2] shadow-sm"
                : "border-[#E5E7EB] bg-white text-slate-600 hover:border-[#9FC4EA]"
            }`}
            key={criterion}
            type="button"
            onClick={() => onSelectCriterion(criterion)}
          >
            <span className="block truncate text-sm font-bold">
              {getShortCriterionLabel(criterion)}
            </span>
            <span className="mt-1 block text-xs font-semibold">
              {getCriterionCompactStatus(task)}
            </span>
            <span className="mt-1 block text-xs opacity-80">
              {task ? `${task.evidenceCount ?? 0} minh chứng` : "Ngoài phạm vi"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EvidenceStepper({
  activeCriterion,
  activeIndex,
  drafts,
  evidences,
  mode,
  onGoFinalize,
  onSelectEvidence,
}: {
  activeCriterion: Criterion;
  activeIndex: number;
  drafts: Record<string, EvidenceDecisionDraft>;
  evidences: ReviewEvidence[];
  mode: ReviewMode;
  onGoFinalize: () => void;
  onSelectEvidence: (index: number) => void;
}) {
  if (!evidences.length) {
    return (
      <div className="text-sm font-semibold text-muted-foreground">
        Chưa có minh chứng trong hồ sơ · Có thể chốt yêu cầu bổ sung hoặc chuyển hội ý
      </div>
    );
  }

  const criterionEvidences = evidences
    .map((evidence, index) => ({ evidence, index }))
    .filter(({ evidence }) => evidence.criterion === activeCriterion);
  const renderEvidenceButton = (evidence: ReviewEvidence, index: number) => {
    const draft = drafts[evidence.id];
    const active = mode === "evidence_review" && index === activeIndex;
    return (
      <button
        className={`min-w-[132px] rounded-xl border px-3 py-2 text-left text-xs transition ${
          active
            ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2] shadow-sm"
            : draft
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-[#E5E7EB] bg-white text-slate-600 hover:border-[#9FC4EA]"
        }`}
        key={evidence.id}
        type="button"
        onClick={() => onSelectEvidence(index)}
      >
        <span className="block font-bold">Minh chứng {index + 1}</span>
        <span className="mt-1 block line-clamp-1">
          {draft ? getEvidenceDecisionLabel(draft.status) : "Chưa xử lý"}
        </span>
      </button>
    );
  };

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-xs font-bold uppercase text-muted-foreground">Tiêu chí</span>
        {criterionEvidences.length ? (
          criterionEvidences.map(({ evidence, index }) => renderEvidenceButton(evidence, index))
        ) : (
          <span className="rounded-lg border border-dashed border-[#D7E3F2] px-3 py-2 text-xs font-semibold text-muted-foreground">
            Chưa có minh chứng riêng
          </span>
        )}
        <button
          className={`min-w-[132px] rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
            mode === "criterion_finalize"
              ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2] shadow-sm"
              : "border-[#E5E7EB] bg-white text-slate-600 hover:border-[#9FC4EA]"
          }`}
          type="button"
          onClick={onGoFinalize}
        >
          Chốt tiêu chí
          <span className="mt-1 block font-normal">Bước cuối</span>
        </button>
      </div>
    </div>
  );
}

function ActiveEvidenceReviewSurface({
  activeDetail,
  activeTask,
  currentDraft,
  evidence,
  evidenceIndex,
  onOpenDrawer,
  onOpenTask,
  onSaveDecision,
  totalEvidenceCount,
}: {
  activeDetail: ReviewTaskDetail | null;
  activeTask: ReviewTaskListItem;
  currentDraft?: EvidenceDecisionDraft;
  evidence: ReviewEvidence | null;
  evidenceIndex: number;
  onOpenDrawer: (drawer: ReviewDrawer) => void;
  onOpenTask: () => void;
  onSaveDecision: (evidenceId: string, draft: EvidenceDecisionDraft) => void;
  totalEvidenceCount: number;
}) {
  if (!evidence) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D7E3F2] bg-white p-6">
        <h3 className="text-lg font-bold text-brand-deep">Chưa có minh chứng trong hồ sơ này</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Cán bộ vẫn có thể đi tới bước chốt tiêu chí để yêu cầu bổ sung, đánh dấu không đủ dữ liệu
          hoặc chuyển hội ý.
        </p>
      </div>
    );
  }

  const model = buildEvidenceDisplayModel(evidence);
  const visibleFields = getVisibleEvidenceFieldEntries(model).filter(
    ([key, value]) => isVisibleExtractedField(key) && hasDisplayableEvidenceValue(value),
  );
  const warnings = getEvidenceWarningMessages(evidence, model);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              Minh chứng {evidenceIndex + 1}/{totalEvidenceCount}
            </div>
            <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-6 text-brand-deep">
              {model.kind === "event_achievement" ? model.eventName || model.title : model.title}
            </h3>
            <div className="mt-2 text-sm text-muted-foreground">
              Nguồn: {model.sourceLabel} · Tiêu chí: {getCriterionLabel(evidence.criterion)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Badge variant={currentDraft ? "default" : "secondary"}>
              {currentDraft ? getEvidenceDecisionLabel(currentDraft.status) : "Chưa xử lý"}
            </Badge>
            {warnings.length ? <Badge variant="outline">{warnings.length} cảnh báo</Badge> : null}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 items-start gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.55fr)]">
        <div className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white p-3">
          <EvidencePreviewPanel compact evidence={evidence} />
        </div>
        <div className="min-w-0 space-y-3">
          <ExtractedDataPanel
            detail={activeDetail}
            evidence={evidence}
            fields={visibleFields}
            model={model}
          />
          <EvidenceWarnings warnings={warnings} />
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
            <div className="text-sm font-bold text-brand-deep">Công cụ hỗ trợ</div>
            <div className="mt-3 grid gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenDrawer("ai")}>
                Tóm tắt / soạn yêu cầu bổ sung
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenDrawer("reference")}>
                Xem đối chiếu
              </Button>
              <Button type="button" variant="outline" onClick={onOpenTask}>
                Mở task chi tiết
              </Button>
            </div>
          </div>
        </div>
      </div>

      <EvidenceInlineDecisionForm
        activeTask={activeTask}
        currentDraft={currentDraft}
        evidence={evidence}
        onSaveDecision={onSaveDecision}
      />
    </div>
  );
}

function ExtractedDataPanel({
  detail,
  evidence,
  fields,
  model,
}: {
  detail: ReviewTaskDetail | null;
  evidence: ReviewEvidence;
  fields: Array<[string, unknown]>;
  model: ReturnType<typeof buildEvidenceDisplayModel>;
}) {
  const metricGpa = detail ? getMetricValue(detail.metrics ?? [], "gpa") : null;
  const threshold = detail
    ? getReviewGpaThreshold(detail.application.targetLevel, detail.criterionLevelAssessment)
    : null;
  const rows: Array<[string, React.ReactNode]> = [
    ["Tên minh chứng", model.title],
    ["Sự kiện/thành tích", model.kind === "event_achievement" ? model.eventName : null],
    ["Đơn vị tổ chức", model.kind === "event_achievement" ? model.organizer : null],
    [
      "Cấp tổ chức",
      model.kind === "event_achievement" ? formatOrganizerLevel(model.organizerLevel) : null,
    ],
    [
      "Ngày hoạt động",
      model.kind === "event_achievement" && model.activityDate
        ? formatDateTime(model.activityDate)
        : null,
    ],
    [
      "Ngày cấp",
      model.kind === "event_achievement" && model.issueDate
        ? formatDateTime(model.issueDate)
        : null,
    ],
    ["Nguồn dữ liệu", model.sourceLabel],
    ["Độ tin cậy", getConfidencePhrase(evidence.confidence)],
  ].filter(([, value]) => hasDisplayableEvidenceValue(value));

  if (model.kind === "academic_transcript") {
    const academicRows: Array<[string, React.ReactNode]> = [
      ["GPA sinh viên nhập", metricGpa],
      [
        "GPA SmartReader",
        model.gpa !== null && model.gpa !== undefined
          ? `${formatEvidenceValue(model.gpa)}/4`
          : null,
      ],
      ["Ngưỡng cấp xét", threshold ? `${threshold}/4` : null],
    ];
    rows.push(...academicRows.filter(([, value]) => hasDisplayableEvidenceValue(value)));
  }
  const additionalFields = fields
    .filter(([key, value]) => isVisibleExtractedField(key) && hasDisplayableEvidenceValue(value))
    .slice(0, 6);

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
      <h4 className="text-base font-bold text-brand-deep">Dữ liệu đã bóc tách</h4>
      {rows.length ? (
        <div className="mt-3 grid gap-2">
          {rows.map(([label, value]) => (
            <EvidenceFact key={label} label={label} value={value} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[#E5E7EB] bg-slate-50 p-3 text-sm text-muted-foreground">
          Chưa bóc tách được dữ liệu đáng tin cậy từ minh chứng này.
        </div>
      )}
      {additionalFields.length ? (
        <div className="mt-3 grid gap-2">
          {additionalFields.map(([key, value]) => (
            <EvidenceFact key={key} label={getFieldLabel(key)} value={formatEvidenceValue(value)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EvidenceInlineDecisionForm({
  activeTask,
  currentDraft,
  evidence,
  onSaveDecision,
}: {
  activeTask: ReviewTaskListItem;
  currentDraft?: EvidenceDecisionDraft;
  evidence: ReviewEvidence;
  onSaveDecision: (evidenceId: string, draft: EvidenceDecisionDraft) => void;
}) {
  const [status, setStatus] = useState<EvidenceDecisionStatus>(currentDraft?.status ?? "accepted");
  const [note, setNote] = useState(currentDraft?.note ?? "");
  const [reason, setReason] = useState(currentDraft?.reason ?? "");
  const [supplementDeadline, setSupplementDeadline] = useState(
    currentDraft?.supplementDeadline ?? "",
  );

  useEffect(() => {
    setStatus(currentDraft?.status ?? "accepted");
    setNote(currentDraft?.note ?? "");
    setReason(currentDraft?.reason ?? "");
    setSupplementDeadline(currentDraft?.supplementDeadline ?? "");
  }, [currentDraft, evidence.id]);

  const canAct = Boolean(activeTask.permissions?.canAct);
  const noteRequired = status !== "accepted";
  const trimmedNote = note.trim();
  const canSave = canAct && (!noteRequired || trimmedNote.length >= 10);

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-bold text-brand-deep">Xử lý minh chứng này</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Quyết định được lưu nháp ở UI và gửi cùng lúc khi chốt tiêu chí.
          </p>
        </div>
        {currentDraft ? <Badge variant="secondary">Đã xử lý</Badge> : null}
      </div>
      {!canAct ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {activeTask.permissions?.reasonLabel ?? "Bạn không có quyền xử lý tiêu chí này."}
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {evidenceDecisionOptions.map((option) => (
          <button
            className={`rounded-xl border px-3 py-3 text-left transition ${
              status === option.value
                ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2]"
                : "border-[#E5E7EB] bg-white text-slate-700 hover:border-[#9FC4EA]"
            }`}
            disabled={!canAct}
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
          >
            <span className="block text-sm font-bold">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {option.description}
            </span>
          </button>
        ))}
      </div>

      {status === "supplement_required" ? (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-brand-deep">Lý do nhanh</div>
          <select
            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#0057C2]"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            <option value="">Chọn lý do bổ sung</option>
            <option value="Thiếu đơn vị tổ chức/cấp tổ chức">
              Thiếu đơn vị tổ chức/cấp tổ chức
            </option>
            <option value="Thiếu ngày hoạt động">Thiếu ngày hoạt động</option>
            <option value="Minh chứng chưa khớp danh sách chính thức">
              Chưa khớp danh sách chính thức
            </option>
            <option value="Cần file rõ hơn">Cần file rõ hơn</option>
          </select>
          <input
            className="mt-2 h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#0057C2]"
            type="date"
            value={supplementDeadline}
            onChange={(event) => setSupplementDeadline(event.target.value)}
          />
        </div>
      ) : null}

      {status === "rejected" ? (
        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-brand-deep">Mẫu lý do</div>
          <select
            className="h-10 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm outline-none focus:border-[#0057C2]"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            <option value="">Chọn mẫu lý do</option>
            <option value="Không thuộc tiêu chí này">Không thuộc tiêu chí này</option>
            <option value="Không đủ căn cứ xác nhận">Không đủ căn cứ xác nhận</option>
            <option value="Ngoài thời gian xét">Ngoài thời gian xét</option>
            <option value="Không đúng cấp tổ chức yêu cầu">Không đúng cấp tổ chức yêu cầu</option>
            <option value="Không khớp thông tin sinh viên">Không khớp thông tin sinh viên</option>
          </select>
        </div>
      ) : null}

      <textarea
        className="mt-3 min-h-20 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm outline-none focus:border-[#0057C2]"
        disabled={!canAct}
        placeholder={
          status === "accepted"
            ? "Ghi chú nội bộ nếu cần..."
            : "Nhập căn cứ xét duyệt, nhận xét và lý do kết luận..."
        }
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      {noteRequired && trimmedNote.length < 10 ? (
        <div className="mt-2 text-xs font-semibold text-amber-700">
          Quyết định này cần ghi chú tối thiểu 10 ký tự.
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          disabled={!canSave}
          type="button"
          onClick={() =>
            onSaveDecision(evidence.id, {
              status,
              note: trimmedNote,
              reason,
              supplementDeadline,
              selectedQuickReasons: reason ? [reason] : [],
              decidedAt: new Date().toISOString(),
            })
          }
        >
          {getEvidenceDecisionCta(status)}
        </Button>
      </div>
    </div>
  );
}

function ReviewBottomBar({
  activeIndex,
  currentDraft,
  evidenceCount,
  mode,
  onNext,
  onPrevious,
}: {
  activeIndex: number;
  currentDraft?: EvidenceDecisionDraft;
  evidenceCount: number;
  mode: ReviewMode;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const isLastEvidence = evidenceCount === 0 || activeIndex >= evidenceCount - 1;
  const hasDraft = Boolean(currentDraft);
  return (
    <div className="mt-3 shrink-0 rounded-xl border border-[#DCE7F2] bg-white p-2 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-sm font-semibold text-brand-deep">
          {mode === "criterion_finalize"
            ? "Đang chốt tiêu chí"
            : evidenceCount
              ? `Minh chứng ${activeIndex + 1}/${evidenceCount}`
              : "Tiêu chí chưa có minh chứng"}
          {evidenceCount > 0 && !hasDraft ? (
            <span className="ml-2 font-normal text-muted-foreground">
              Có thể xem tiếp trước khi lưu quyết định.
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={activeIndex <= 0} type="button" variant="outline" onClick={onPrevious}>
            Trước
          </Button>
          <Button disabled={false} type="button" variant="outline" onClick={onNext}>
            {isLastEvidence ? "Đi tới chốt tiêu chí" : "Minh chứng tiếp theo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CriterionFinalizationPanel({
  activeDetail,
  activeTask,
  decisions,
  evidences,
  nextCriterion,
  onClaimTask,
  onOpenTask,
  onSelectCriterion,
}: {
  activeDetail: ReviewTaskDetail | null;
  activeTask: ReviewTaskListItem;
  decisions: Record<string, EvidenceDecisionDraft>;
  evidences: ReviewEvidence[];
  nextCriterion: Criterion | null;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onOpenTask: (taskId: string) => void;
  onSelectCriterion: (criterion: Criterion) => void;
}) {
  const submitDecision = useSubmitReviewDecision(activeTask.id);
  const [decision, setDecision] = useState<EvidenceDecisionStatus>("accepted");
  const [note, setNote] = useState("");
  const summary = getEvidenceDecisionSummary(evidences, decisions);
  const unresolvedCount = evidences.filter(
    (evidence) => !isEvidenceResolvedForCriterion(evidence, decisions),
  ).length;
  const recommendedDecision = getRecommendedCriterionDecision(summary);
  const effectiveDecision = unresolvedCount > 0 ? decision : recommendedDecision;
  const canAct = Boolean(activeTask.permissions?.canAct);
  const noteRequired = effectiveDecision !== "accepted";
  const canSubmit =
    canAct && activeDetail && unresolvedCount === 0 && (!noteRequired || note.trim().length >= 10);

  useEffect(() => {
    if (unresolvedCount === 0) setDecision(recommendedDecision);
  }, [recommendedDecision, unresolvedCount]);

  const submitCriterionDecision = () => {
    if (!activeDetail) return;
    submitDecision.mutate(
      {
        payload: {
          decision: effectiveDecision,
          officerSuggestedLevel:
            effectiveDecision === "accepted" ? activeDetail.application.targetLevel : null,
          note:
            note.trim() ||
            `Đã xét ${evidences.length} minh chứng cho tiêu chí ${getCriterionLabel(activeTask.criterion)}.`,
          supplementRequestJson:
            effectiveDecision === "supplement_required"
              ? { evidenceDecisions: Object.values(decisions) }
              : undefined,
          evidenceDecisions: buildEvidenceDecisionPayloads(evidences, decisions),
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã chốt tiêu chí.");
          if (nextCriterion) onSelectCriterion(nextCriterion);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "Không thể chốt tiêu chí. Vui lòng thử lại."));
        },
      },
    );
  };
  const submitLabel = submitDecision.isPending
    ? "Đang gửi..."
    : nextCriterion
      ? `${getCriterionDecisionCta(effectiveDecision)} và sang tiêu chí tiếp theo`
      : getCriterionDecisionCta(effectiveDecision);

  if (!activeDetail) {
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E7EB] p-5 text-sm text-muted-foreground">
        Đang tải dữ liệu tiêu chí...
      </div>
    );
  }

  if (activeTask.permissions?.canClaim) {
    return (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
        <h3 className="text-lg font-bold text-brand-deep">Task chưa được giao</h3>
        <p className="mt-2 text-sm text-muted-foreground">{activeTask.permissions.reasonLabel}</p>
        <Button className="mt-4" type="button" onClick={() => onClaimTask(activeTask)}>
          Nhận xử lý
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase text-muted-foreground">Bước cuối</div>
          <h3 className="mt-1 text-xl font-bold text-brand-deep">
            Chốt tiêu chí {getCriterionLabel(activeTask.criterion)}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cán bộ xác nhận kết luận cuối cùng cho tiêu chí sau khi xử lý minh chứng.
          </p>
        </div>
        <Badge variant={unresolvedCount ? "outline" : "default"}>
          {unresolvedCount ? `Còn ${unresolvedCount} minh chứng` : "Sẵn sàng chốt"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <EvidenceFact label="Đã chấp nhận" value={summary.accepted} />
        <EvidenceFact label="Cần bổ sung" value={summary.supplementRequired} />
        <EvidenceFact label="Không chấp nhận" value={summary.rejected} />
        <EvidenceFact label="Chuyển hội ý" value={summary.resolutionNeeded} />
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        <span className="font-semibold">Gợi ý hệ thống: </span>
        {getSystemFinalizationSuggestion(summary, unresolvedCount)}
      </div>

      {!canAct ? (
        <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-slate-50 p-3 text-sm text-muted-foreground">
          {activeTask.permissions?.reasonLabel ?? "Bạn không có quyền chốt tiêu chí này."}
          <Button
            className="mt-3"
            type="button"
            variant="outline"
            onClick={() => onOpenTask(activeTask.id)}
          >
            Mở task chi tiết
          </Button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {criterionDecisionOptions.map((option) => (
          <button
            className={`rounded-xl border px-3 py-3 text-left transition ${
              decision === option.value
                ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2]"
                : "border-[#E5E7EB] bg-white text-slate-700 hover:border-[#9FC4EA]"
            }`}
            disabled={!canAct || unresolvedCount > 0}
            key={option.value}
            type="button"
            onClick={() => setDecision(option.value)}
          >
            <span className="block text-sm font-bold">{option.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {option.description}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#DCE7F2] bg-[#F8FBFF] p-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          {unresolvedCount
            ? "Cần xử lý hết minh chứng trước khi chốt tiêu chí."
            : "Cán bộ xác nhận quyết định cuối cùng cho tiêu chí này."}
        </div>
        <Button
          disabled={!canSubmit || submitDecision.isPending}
          type="button"
          onClick={submitCriterionDecision}
        >
          {submitLabel}
        </Button>
      </div>
      <textarea
        className="mt-4 min-h-28 w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-sm outline-none focus:border-[#0057C2]"
        placeholder="Ghi chú xét duyệt tiêu chí..."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </div>
  );
}

function ReviewDrawers({
  activeDetail,
  activeTask,
  activeEvidenceIndex,
  decisions,
  evidences,
  openDrawer,
  onOpenChange,
  onSelectEvidence,
}: {
  activeDetail: ReviewTaskDetail | null;
  activeTask: ReviewTaskListItem;
  activeEvidenceIndex: number;
  decisions: Record<string, EvidenceDecisionDraft>;
  evidences: ReviewEvidence[];
  openDrawer: ReviewDrawer;
  onOpenChange: (open: boolean) => void;
  onSelectEvidence: (index: number) => void;
}) {
  const title =
    openDrawer === "checklist"
      ? "Checklist chi tiết"
      : openDrawer === "reference"
        ? "Đối chiếu"
        : openDrawer === "ai"
          ? "Trợ lý AI"
          : openDrawer === "technical_log"
            ? "Nhật ký kỹ thuật"
            : "Danh sách minh chứng";

  return (
    <Sheet open={Boolean(openDrawer && openDrawer !== "queue")} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-4 sm:max-w-2xl">
        <SheetHeader className="mb-4 pr-8">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Thông tin phụ trợ, không chiếm luồng xử lý minh chứng chính.
          </SheetDescription>
        </SheetHeader>
        {openDrawer === "checklist" ? (
          <CriterionSummaryPanel detail={activeDetail} task={activeTask} />
        ) : null}
        {openDrawer === "reference" ? <DataMatchPanel detail={activeDetail} /> : null}
        {openDrawer === "ai" ? (
          <div className="space-y-3">
            {[
              "Tóm tắt minh chứng",
              "Minh chứng còn thiếu gì?",
              "Tìm case tương tự",
              "Soạn yêu cầu bổ sung",
            ].map((prompt) => (
              <button
                className="w-full rounded-xl border border-[#E5E7EB] bg-white p-3 text-left text-sm font-semibold text-brand-deep hover:border-[#9FC4EA]"
                key={prompt}
                type="button"
              >
                {prompt}
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  AI chỉ tạo nháp, cán bộ cần kiểm tra trước khi áp dụng.
                </span>
              </button>
            ))}
          </div>
        ) : null}
        {openDrawer === "technical_log" ? (
          <DecisionHistoryPanel detail={activeDetail} task={activeTask} />
        ) : null}
        {openDrawer === "evidence_list" ? (
          <div className="space-y-2">
            {evidences.map((evidence, index) => (
              <button
                className={`w-full rounded-xl border p-3 text-left transition ${
                  index === activeEvidenceIndex
                    ? "border-[#0057C2] bg-[#EAF3FF]"
                    : "border-[#E5E7EB] bg-white hover:border-[#9FC4EA]"
                }`}
                key={evidence.id}
                type="button"
                onClick={() => onSelectEvidence(index)}
              >
                <div className="font-semibold text-brand-deep">
                  Minh chứng {index + 1}: {buildEvidenceDisplayModel(evidence).title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {decisions[evidence.id]
                    ? getEvidenceDecisionLabel(decisions[evidence.id].status)
                    : "Chưa xử lý"}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
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
            <p className="text-xs text-muted-foreground">
              {groups.length} hồ sơ, {groups.reduce((sum, group) => sum + group.tasks.length, 0)}{" "}
              task tiêu chí
            </p>
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
  lockedCriterion,
  onSelect,
}: {
  group: OfficerApplicationGroup;
  isSelected: boolean;
  lockedCriterion?: Criterion;
  onSelect: (group: OfficerApplicationGroup, criterion?: Criterion) => void;
}) {
  const lockedTask = lockedCriterion ? getTaskForCriterion(group, lockedCriterion) : null;
  const priorityTask = lockedTask ?? group.primaryTask;
  const activeCriterion =
    lockedCriterion ?? getDefaultCriterionForGroup(group) ?? priorityTask.criterion;
  const completedCount = lockedTask
    ? Number(isCompletedTask(lockedTask))
    : group.tasks.filter((task) => isCompletedTask(task)).length;
  const totalCount = lockedTask ? 1 : group.tasks.length;

  return (
    <button
      className={`w-full rounded-xl border p-3 text-left transition ${
        isSelected
          ? "border-[#0057C2] bg-[#F1F7FD] shadow-sm"
          : "border-[#E5E7EB] bg-white hover:border-[#9FC4EA]"
      }`}
      type="button"
      onClick={() => onSelect(group)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-bold text-brand-deep">
            {group.studentName || "Chưa có tên sinh viên"}
          </div>
          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {[group.studentCode, group.className, group.faculty].filter(Boolean).join(" • ") ||
              "Chưa có lớp/khoa"}
          </div>
        </div>
        <Badge variant={isSelected ? "default" : "secondary"}>
          {getLevelLabel(group.targetLevel)}
        </Badge>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-brand-deep">
          {getShortCriterionLabel(activeCriterion)}
        </span>
        <span className="text-muted-foreground">
          {lockedTask
            ? `${lockedTask.evidenceCount ?? 0} minh chứng`
            : `${completedCount}/${totalCount} tiêu chí`}
        </span>
      </div>
      {lockedCriterion ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <span
            className={`h-2.5 w-2.5 rounded-full ${getCriterionDotClass(lockedTask)}`}
            aria-hidden="true"
          />
          <span className="line-clamp-1">{getCriterionCompactStatus(lockedTask)}</span>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5">
          {fiveGoodCriteria.map((criterion) => {
            const task = group.tasks.find((item) => item.criterion === criterion);
            return (
              <button
                className={`h-2.5 w-2.5 rounded-full transition ${getCriterionDotClass(task)} ${
                  criterion === activeCriterion ? "ring-2 ring-[#0057C2]/30" : ""
                }`}
                aria-label={`${getCriterionLabel(criterion)}: ${getCriterionCompactStatus(task)}`}
                key={criterion}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(group, criterion);
                }}
                type="button"
                title={`${getCriterionLabel(criterion)}: ${getCriterionCompactStatus(task)}`}
              />
            );
          })}
        </div>
      )}
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-2 text-xs text-slate-600">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span className="line-clamp-2">
          {getPriorityReasonLabel(priorityTask)} • Deadline {formatDateTime(group.dueDate)}
        </span>
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
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("evidence");
  const [decisionDrawerOpen, setDecisionDrawerOpen] = useState(false);
  const activeTask = group
    ? (group.tasks.find((task) => task.criterion === activeCriterion) ?? group.primaryTask)
    : null;
  const { data: activeDetail = null, isLoading: isDetailLoading } = useReviewTask(activeTask?.id);

  useEffect(() => {
    setEvidenceMode("criterion");
    setActiveWorkspaceTab("evidence");
    setDecisionDrawerOpen(false);
  }, [activeCriterion, group?.applicationId]);

  if (!group || !activeTask) {
    return (
      <section className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        Chọn một hồ sơ ở danh sách bên trái để bắt đầu xét duyệt.
      </section>
    );
  }

  const allEvidenceItems = activeDetail?.evidences ?? [];
  const evidenceItems =
    evidenceMode === "criterion"
      ? allEvidenceItems.filter((evidence) => evidence.criterion === activeTask.criterion)
      : allEvidenceItems;
  const completedCount = group.tasks.filter((task) => isCompletedTask(task)).length;
  const assignedCount = group.tasks.filter(
    (task) => task.permissions?.reason === "assigned_to_you",
  ).length;
  const nextCriterion = getNextActionableCriterion(group, activeTask.criterion);

  return (
    <section className="min-w-0">
      <div className="grid min-w-0 gap-4 min-[1440px]:grid-cols-[minmax(420px,1fr)_350px]">
        <div className="min-w-0 rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E5E7EB] p-4">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="line-clamp-1 text-[22px] font-bold leading-tight text-brand-deep">
                  {group.studentName || "Chưa có tên sinh viên"}
                </h2>
                <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {[group.studentCode, group.className, group.faculty]
                    .filter(Boolean)
                    .join(" • ") || "Chưa có thông tin sinh viên"}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Badge variant="secondary">Aim {getLevelLabel(group.targetLevel)}</Badge>
                <Badge variant="secondary">
                  {getApplicationStatusLabel(group.applicationStatus)}
                </Badge>
                <Badge variant="outline">
                  {assignedCount} giao / {completedCount} xong
                </Badge>
                {activeTask.permissions?.canAct ? (
                  <Button
                    className="min-[1440px]:hidden"
                    size="sm"
                    type="button"
                    onClick={() => setDecisionDrawerOpen(true)}
                  >
                    Ra quyết định
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <CompactInfo
                label="Tiêu chí active"
                value={getCriterionLabel(activeTask.criterion)}
              />
              <CompactInfo label="Trạng thái" value={getTaskStatusLabel(activeTask.status)} />
              <CompactInfo label="Deadline" value={formatDateTime(group.dueDate)} />
            </div>

            {completedCount === group.tasks.length && group.tasks.length > 0 ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Đã xử lý {completedCount}/{group.tasks.length} tiêu chí trong phạm vi tài khoản.
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span className="font-semibold">Cảnh báo chính: </span>
                {getPriorityReasonLabel(activeTask)} cho{" "}
                {getShortCriterionLabel(activeTask.criterion)}.
              </div>
            )}
          </div>

          <div className="border-b border-[#E5E7EB] p-3">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 min-[1180px]:grid-cols-5">
              {fiveGoodCriteria.map((criterion) => {
                const task = group.tasks.find((item) => item.criterion === criterion);
                const selected =
                  task?.criterion === activeTask.criterion ||
                  (!task && criterion === activeCriterion);
                return (
                  <button
                    className={`min-w-0 rounded-xl border px-3 py-2 text-left transition ${
                      selected
                        ? "border-[#0057C2] bg-[#EAF3FF] text-[#0057C2]"
                        : "border-[#E5E7EB] bg-white text-slate-600 hover:border-[#9FC4EA]"
                    }`}
                    key={criterion}
                    type="button"
                    onClick={() => onSelectCriterion(criterion)}
                  >
                    <span className="block truncate text-sm font-semibold">
                      {getShortCriterionLabel(criterion)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs opacity-80">
                      {getCriterionCompactStatus(task)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-[#E5E7EB] px-4 pt-3">
            <div className="flex flex-wrap gap-2 pb-3">
              {workspaceTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    activeWorkspaceTab === tab.value
                      ? "bg-[#0057C2] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  onClick={() => setActiveWorkspaceTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 p-4">
            {activeWorkspaceTab === "evidence" ? (
              <EvidenceWorkspacePanel
                activeCriterion={activeTask.criterion}
                detail={activeDetail}
                evidenceMode={evidenceMode}
                evidences={evidenceItems}
                isLoading={isDetailLoading}
                onModeChange={setEvidenceMode}
                onOpenDecision={() => setDecisionDrawerOpen(true)}
                onOpenTask={() => onOpenTask(activeTask.id)}
                totalEvidenceCount={allEvidenceItems.length || activeTask.evidenceCount}
              />
            ) : null}
            {activeWorkspaceTab === "checklist" ? (
              <CriterionSummaryPanel task={activeTask} detail={activeDetail} />
            ) : null}
            {activeWorkspaceTab === "crosscheck" ? <DataMatchPanel detail={activeDetail} /> : null}
            {activeWorkspaceTab === "history" ? (
              <DecisionHistoryPanel detail={activeDetail} task={activeTask} />
            ) : null}
          </div>
        </div>

        <div className="hidden min-[1440px]:block">
          <DecisionPanelSlot
            activeDetail={activeDetail}
            activeTask={activeTask}
            nextCriterion={nextCriterion}
            onClaimTask={onClaimTask}
            onOpenTask={onOpenTask}
            onSelectCriterion={onSelectCriterion}
          />
        </div>
      </div>

      <Drawer open={decisionDrawerOpen} onOpenChange={setDecisionDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ra quyết định</DrawerTitle>
            <DrawerDescription>
              {getCriterionLabel(activeTask.criterion)} • {getTaskStatusLabel(activeTask.status)}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <DecisionPanelSlot
              activeDetail={activeDetail}
              activeTask={activeTask}
              nextCriterion={nextCriterion}
              onClaimTask={onClaimTask}
              onOpenTask={onOpenTask}
              onSelectCriterion={(criterion) => {
                setDecisionDrawerOpen(false);
                onSelectCriterion(criterion);
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}

function CompactInfo({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-brand-deep">{value}</div>
    </div>
  );
}

function DecisionPanelSlot({
  activeDetail,
  activeTask,
  nextCriterion,
  onClaimTask,
  onOpenTask,
  onSelectCriterion,
}: {
  activeDetail: ReviewTaskDetail | null;
  activeTask: ReviewTaskListItem;
  nextCriterion: Criterion | null;
  onClaimTask: (task: ReviewTaskListItem) => void;
  onOpenTask: (taskId: string) => void;
  onSelectCriterion: (criterion: Criterion) => void;
}) {
  return (
    <div className="sticky top-4 max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-sm">
      {activeTask.permissions?.canClaim ? (
        <div className="mb-3 rounded-xl border border-[#E5E7EB] bg-slate-50 p-3">
          <div className="text-sm font-semibold text-brand-deep">Task chưa được giao</div>
          <p className="mt-1 text-sm text-muted-foreground">{activeTask.permissions.reasonLabel}</p>
          <Button className="mt-3 w-full" type="button" onClick={() => onClaimTask(activeTask)}>
            Nhận xử lý
          </Button>
        </div>
      ) : null}

      {activeDetail ? (
        activeTask.permissions?.canAct ? (
          <ReviewDecisionPanel
            task={activeDetail}
            submitLabel={
              nextCriterion ? "Xác nhận và sang tiêu chí tiếp theo" : "Xác nhận quyết định"
            }
            onSuccess={() => {
              if (nextCriterion) onSelectCriterion(nextCriterion);
            }}
          />
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="text-sm font-semibold text-brand-deep">Chỉ xem</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeTask.permissions?.reasonLabel ??
                "Bạn không có quyền gửi kết luận cho tiêu chí này."}
            </p>
            <Button
              className="mt-3 w-full"
              variant="outline"
              type="button"
              onClick={() => onOpenTask(activeTask.id)}
            >
              Mở task chi tiết
            </Button>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 text-sm text-muted-foreground">
          Đang tải dữ liệu tiêu chí...
        </div>
      )}
    </div>
  );
}

function DecisionHistoryPanel({
  detail,
  task,
}: {
  detail: ReviewTaskDetail | null;
  task: ReviewTaskListItem;
}) {
  const history = detail?.decisionHistory ?? [];

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-brand-deep">Lịch sử xử lý</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {getCriterionLabel(task.criterion)} • Cập nhật {formatDateTime(task.updatedAt)}
          </p>
        </div>
        <Badge variant={getTaskStatusBadgeVariant(task)}>{getTaskStatusLabel(task.status)}</Badge>
      </div>

      {history.length ? (
        <div className="mt-4 space-y-3">
          {history.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#E5E7EB] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-brand-deep">{item.actorName}</div>
                <Badge variant="secondary">{getTaskStatusLabel(item.decision)}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(item.createdAt)} • {item.actorRole ?? "cán bộ"}
              </div>
              {item.note ? (
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.note}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[#E5E7EB] p-4 text-sm text-muted-foreground">
          Chưa có lịch sử quyết định cho tiêu chí này.
        </div>
      )}
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
  const assignedCount = group.tasks.filter(
    (task) => task.permissions?.reason === "assigned_to_you",
  ).length;
  const completedCount = group.tasks.filter((task) => isCompletedTask(task)).length;
  const nextClaimableTask = group.claimableTasks[0];

  return (
    <article className="rounded-md border bg-background p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                group.actionableTasks.length
                  ? "default"
                  : group.claimableTasks.length
                    ? "outline"
                    : "secondary"
              }
            >
              {getApplicationWorkBadge(group)}
            </Badge>
            <Badge variant="outline">{getLevelLabel(group.targetLevel)}</Badge>
            <Badge variant="outline">{group.schoolYear}</Badge>
          </div>
          <h3 className="mt-3 truncate text-base font-bold text-brand-deep">
            {group.studentName || "Chưa có tên sinh viên"}
          </h3>
          <div className="mt-1 text-sm text-muted-foreground">
            {[group.studentCode, group.className, group.faculty].filter(Boolean).join(" • ") ||
              "Chưa có thông tin lớp/khoa"}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Bạn được giao {assignedCount}/{fiveGoodCriteria.length} tiêu chí trong hồ sơ này. Đang
            hiển thị {group.tasks.length}/{fiveGoodCriteria.length} tiêu chí theo phạm vi tài khoản;
            đã xử lý {completedCount}/{group.tasks.length} tiêu chí hiển thị.
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
        {group.readonlyTasks.length ? (
          <span>{group.readonlyTasks.length} tiêu chí chỉ xem</span>
        ) : null}
      </div>
    </article>
  );
}

function CriterionTaskChip({
  criterion,
  task,
}: {
  criterion: Criterion;
  task?: ReviewTaskListItem;
}) {
  if (!task) {
    return (
      <div className="rounded-md border border-dashed p-3">
        <div className="text-sm font-semibold text-brand-deep">{getCriterionLabel(criterion)}</div>
        <div className="mt-1 text-xs text-muted-foreground">Ngoài phạm vi của bạn</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-brand-deep">
            {getCriterionLabel(criterion)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {getCriterionPermissionLabel(task)}
          </div>
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
  const checklist = detail?.checklist?.length
    ? detail.checklist
    : (detail?.criterionLevelAssessment?.levels
        ?.find((level) => level.level === detail.application.targetLevel)
        ?.requirements.map((requirement) => ({
          id: requirement.key,
          label: requirement.label,
          passed: requirement.status === "passed",
          required: true,
          note: requirement.reason ?? requirement.actualValue ?? requirement.requiredValue,
        })) ?? []);

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-brand-deep">Checklist tiêu chí</h3>
          <p className="mt-1 text-sm text-muted-foreground">{getCriterionLabel(task.criterion)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={getTaskStatusBadgeVariant(task)}>{getTaskStatusLabel(task.status)}</Badge>
          <Badge
            variant={
              task.permissions?.canAct
                ? "default"
                : task.permissions?.canClaim
                  ? "outline"
                  : "secondary"
            }
          >
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
                <Badge
                  variant={
                    item.passed ? "default" : item.passed === false ? "destructive" : "outline"
                  }
                >
                  {item.passed ? "Đạt" : item.passed === false ? "Chưa đạt" : "Cần rà"}
                </Badge>
              </div>
              {item.note ? (
                <div className="mt-1 text-xs text-muted-foreground">{String(item.note)}</div>
              ) : null}
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
  detail,
  evidenceMode,
  evidences,
  isLoading,
  onModeChange,
  onOpenDecision,
  onOpenTask,
  totalEvidenceCount,
}: {
  activeCriterion: Criterion;
  detail: ReviewTaskDetail | null;
  evidenceMode: EvidenceViewMode;
  evidences: NonNullable<ReviewTaskDetail["evidences"]>;
  isLoading: boolean;
  onModeChange: (mode: EvidenceViewMode) => void;
  onOpenDecision: () => void;
  onOpenTask: () => void;
  totalEvidenceCount: number;
}) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-brand-deep">Minh chứng</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {evidenceMode === "criterion"
              ? getCriterionLabel(activeCriterion)
              : `${totalEvidenceCount} minh chứng toàn hồ sơ`}
          </p>
        </div>
        <div className="flex rounded-md border bg-muted/30 p-1">
          <Button
            size="sm"
            type="button"
            variant={evidenceMode === "criterion" ? "default" : "ghost"}
            onClick={() => onModeChange("criterion")}
          >
            Minh chứng tiêu chí này
          </Button>
          <Button
            size="sm"
            type="button"
            variant={evidenceMode === "all" ? "default" : "ghost"}
            onClick={() => onModeChange("all")}
          >
            Tất cả minh chứng hồ sơ
          </Button>
        </div>
      </div>
      {isLoading ? (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Đang tải minh chứng...
        </div>
      ) : evidences.length ? (
        <div className="mt-4 grid gap-3">
          {evidences.map((evidence) => (
            <QueueEvidenceCard
              detail={detail}
              evidence={evidence}
              key={evidence.id}
              onOpenDecision={onOpenDecision}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Chưa có minh chứng trong chế độ xem này.
        </div>
      )}
    </div>
  );
}

function QueueEvidenceCard({
  detail,
  evidence,
  onOpenDecision,
  onOpenTask,
}: {
  detail: ReviewTaskDetail | null;
  evidence: NonNullable<ReviewTaskDetail["evidences"]>[number];
  onOpenDecision: () => void;
  onOpenTask: () => void;
}) {
  const model = buildEvidenceDisplayModel(evidence);
  const metricGpa = detail ? getMetricValue(detail.metrics ?? [], "gpa") : null;
  const threshold = detail
    ? getReviewGpaThreshold(detail.application.targetLevel, detail.criterionLevelAssessment)
    : null;
  const visibleFields = getVisibleEvidenceFieldEntries(model);
  const warnings = getEvidenceWarningMessages(evidence, model);
  const firstFileUrl = evidence.files?.find((file) => file.url)?.url;

  if (model.kind === "academic_transcript") {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-base font-semibold leading-6 text-brand-deep">{model.title}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant={getEvidenceReviewBadgeVariant(evidence)}>{model.readerLabel}</Badge>
              <Badge variant={model.matchLabel.startsWith("Khớp") ? "secondary" : "outline"}>
                {model.matchLabel}
              </Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Nguồn: {model.sourceLabel} • {getCriterionLabel(evidence.criterion)}
            </div>
          </div>
          <div className="text-sm font-semibold text-brand-deep">
            {evidence.files?.length ?? 0} file
          </div>
        </div>

        <EvidencePreviewPanel evidence={evidence} />

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <EvidenceFact label="GPA sinh viên nhập" value={formatMetricInputValue(metricGpa)} />
          <EvidenceFact
            label="GPA SmartReader gợi ý"
            value={
              model.gpa !== null && model.gpa !== undefined
                ? `${formatEvidenceValue(model.gpa)}/4`
                : "Chưa đọc được"
            }
          />
          <EvidenceFact
            label="Ngưỡng cấp đang xét"
            value={threshold ? `${threshold}/4` : "Chưa có ngưỡng"}
          />
        </div>

        <div className="mt-3 rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
          {getGpaConclusion(metricGpa, model.gpa, threshold, model.gpaRequiresConfirmation)}
        </div>

        <EvidenceWarnings warnings={warnings} />

        {visibleFields.length ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {visibleFields.map(([key, value]) => (
              <EvidenceFact
                key={key}
                label={getFieldLabel(key)}
                value={formatEvidenceValue(value)}
              />
            ))}
          </div>
        ) : null}
        <EvidenceContentPanel
          evidence={evidence}
          fields={visibleFields}
          model={model}
          showFields={false}
        />
        <EvidenceCardActions
          firstFileUrl={firstFileUrl}
          onOpenDecision={onOpenDecision}
          onOpenTask={onOpenTask}
        />
      </div>
    );
  }

  if (model.kind === "event_achievement") {
    return (
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-base font-semibold leading-6 text-brand-deep">
              {model.eventName || model.title}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {model.organizer || "Chưa rõ đơn vị tổ chức"}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Badge variant={getEvidenceReviewBadgeVariant(evidence)}>{model.readerLabel}</Badge>
            <Badge variant={model.matchLabel.startsWith("Khớp") ? "secondary" : "outline"}>
              {model.matchLabel}
            </Badge>
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Nguồn: {model.sourceLabel} • {evidence.files?.length ?? 0} file
        </div>
        <EvidencePreviewPanel evidence={evidence} />
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <EvidenceFact label="Cấp tổ chức" value={formatOrganizerLevel(model.organizerLevel)} />
          <EvidenceFact
            label="Ngày hoạt động"
            value={model.activityDate ? formatDateTime(model.activityDate) : undefined}
          />
          <EvidenceFact
            label="Ngày cấp"
            value={model.issueDate ? formatDateTime(model.issueDate) : undefined}
          />
        </div>
        <EvidenceContentPanel evidence={evidence} fields={visibleFields} model={model} />
        <EvidenceWarnings warnings={warnings} />
        <EvidenceCardActions
          firstFileUrl={firstFileUrl}
          onOpenDecision={onOpenDecision}
          onOpenTask={onOpenTask}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-semibold leading-6 text-brand-deep">{model.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {getCriterionLabel(evidence.criterion)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Badge variant={getEvidenceReviewBadgeVariant(evidence)}>{model.readerLabel}</Badge>
          <Badge variant={model.matchLabel.startsWith("Khớp") ? "secondary" : "outline"}>
            {model.matchLabel}
          </Badge>
        </div>
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        Nguồn: {model.sourceLabel} • {evidence.files?.length ?? 0} file
      </div>
      <EvidencePreviewPanel evidence={evidence} />
      <EvidenceContentPanel evidence={evidence} fields={visibleFields} model={model} />
      <EvidenceWarnings warnings={warnings} />
      <EvidenceCardActions
        firstFileUrl={firstFileUrl}
        onOpenDecision={onOpenDecision}
        onOpenTask={onOpenTask}
      />
    </div>
  );
}

function EvidencePreviewPanel({
  compact = false,
  evidence,
}: {
  compact?: boolean;
  evidence: NonNullable<ReviewTaskDetail["evidences"]>[number];
}) {
  const files = evidence.files ?? [];
  const initialFile = files.find((file) => file.url) ?? files[0] ?? null;
  const [activeFileId, setActiveFileId] = useState(initialFile?.id ?? "");
  const activeFile = files.find((file) => file.id === activeFileId) ?? initialFile;
  const needsSignedUrl = Boolean(activeFile?.id && !activeFile.url);
  const {
    data: signedUrl,
    isError: isSignedUrlError,
    isLoading: isSignedUrlLoading,
  } = useSignedFileUrl(activeFile?.id, needsSignedUrl);
  const previewUrl = activeFile?.url ?? signedUrl ?? null;

  if (!files.length) {
    return (
      <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-slate-50 p-4 text-sm text-muted-foreground">
        Minh chứng chưa có file đính kèm. Kiểm tra nội dung AI/OCR bên dưới nếu hệ thống đã đọc được
        dữ liệu.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-slate-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-deep">
            <FileText className="h-4 w-4 text-[#0057C2]" />
            Preview minh chứng
          </div>
          <div className="mt-1 break-words text-xs text-muted-foreground">
            {activeFile?.originalName ?? "Chưa chọn file"}
          </div>
        </div>
        {previewUrl ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={previewUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Mở file
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={previewUrl} download={activeFile?.originalName}>
                <Download className="h-4 w-4" />
                Tải xuống
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {files.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {files.map((file) => {
            const active = activeFile?.id === file.id;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setActiveFileId(file.id)}
                className={`min-w-44 rounded-lg border px-3 py-2 text-left text-xs transition ${
                  active
                    ? "border-[#0057C2] bg-blue-50 text-brand-deep"
                    : "border-[#E5E7EB] bg-white text-muted-foreground hover:bg-slate-100"
                }`}
              >
                <div className="break-words font-semibold">{file.originalName}</div>
                <div className="mt-1 text-muted-foreground">
                  {file.mimeType || "File"} • {formatFileSize(file.size)}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className={`mt-3 flex items-center justify-center overflow-hidden rounded-lg border border-[#E5E7EB] bg-white ${
          compact ? "h-[min(52dvh,560px)] min-h-[360px]" : "min-h-72"
        }`}
      >
        {isSignedUrlLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hourglass className="h-4 w-4 animate-pulse" />
            Đang tải preview...
          </div>
        ) : previewUrl ? (
          isImageMime(activeFile.mimeType, activeFile.originalName) ? (
            <img
              alt={activeFile.originalName}
              className={
                compact ? "h-full w-full object-contain" : "max-h-[520px] w-full object-contain"
              }
              src={previewUrl}
            />
          ) : isPdfMime(activeFile.mimeType, activeFile.originalName) ? (
            <iframe
              className={compact ? "h-full w-full bg-white" : "h-[520px] w-full bg-white"}
              src={previewUrl}
              title={activeFile.originalName}
            />
          ) : (
            <div className="max-w-md p-5 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="mt-3 break-words font-semibold text-brand-deep">
                {activeFile.originalName}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {activeFile.mimeType || "File"} • {formatFileSize(activeFile.size)}
              </div>
              <Button asChild className="mt-4" variant="outline">
                <a href={previewUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Mở file
                </a>
              </Button>
            </div>
          )
        ) : (
          <div className="max-w-md p-5 text-center text-sm text-muted-foreground">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <div className="mt-3 font-semibold text-brand-deep">
              {isSignedUrlError
                ? "Không lấy được đường dẫn preview"
                : "File chưa có đường dẫn preview"}
            </div>
            <div className="mt-1 break-words">
              {activeFile?.originalName ?? "Không có file để hiển thị"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceContentPanel({
  evidence,
  fields,
  model,
  showFields = true,
}: {
  evidence: NonNullable<ReviewTaskDetail["evidences"]>[number];
  fields: Array<[string, unknown]>;
  model: ReturnType<typeof buildEvidenceDisplayModel>;
  showFields?: boolean;
}) {
  const aiSummary = evidence.card?.aiSummary?.trim();
  const ocrText = evidence.card?.ocrText?.trim();
  const fieldEntries = showFields
    ? fields.length
      ? fields
      : getReadableFieldEntries(model.fields)
    : [];

  if (!aiSummary && !ocrText && !fieldEntries.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-3">
      <div className="text-sm font-semibold text-brand-deep">Nội dung đã đọc</div>
      {aiSummary ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Tóm tắt AI</div>
          <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {aiSummary}
          </div>
        </div>
      ) : null}
      {ocrText ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            OCR / nội dung file
          </div>
          <div className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            {ocrText}
          </div>
        </div>
      ) : null}
      {fieldEntries.length ? (
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            Trường trích xuất
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {fieldEntries.map(([key, value]) => (
              <EvidenceFact
                key={key}
                label={getFieldLabel(key)}
                value={formatEvidenceValue(value)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
      <span className="font-semibold">Cảnh báo: </span>
      {warnings.slice(0, 3).join(" • ")}
    </div>
  );
}

function EvidenceCardActions({
  firstFileUrl,
  onOpenDecision,
  onOpenTask,
}: {
  firstFileUrl?: string | null;
  onOpenDecision: () => void;
  onOpenTask: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button
        size="sm"
        type="button"
        variant="outline"
        disabled={!firstFileUrl}
        onClick={() => {
          if (firstFileUrl) window.open(firstFileUrl, "_blank", "noopener,noreferrer");
        }}
      >
        Xem file
      </Button>
      <Button size="sm" type="button" variant="outline" onClick={onOpenTask}>
        Sửa metadata
      </Button>
      <Button size="sm" type="button" onClick={onOpenDecision}>
        Chấp nhận
      </Button>
      <Button size="sm" type="button" variant="outline" onClick={onOpenDecision}>
        Yêu cầu bổ sung
      </Button>
    </div>
  );
}

function DataMatchPanel({ detail }: { detail: ReviewTaskDetail | null }) {
  const relatedEvidences =
    detail?.evidences?.filter((evidence) => evidence.criterion === detail.criterion) ?? [];
  const displayModels = relatedEvidences.map(buildEvidenceDisplayModel);
  const academicModel = displayModels.find((model) => model.kind === "academic_transcript");
  const metricGpa = detail ? getMetricValue(detail.metrics ?? [], "gpa") : null;
  const threshold = detail
    ? getReviewGpaThreshold(detail.application.targetLevel, detail.criterionLevelAssessment)
    : null;
  const matchedCount = displayModels.filter((model) => model.matchLabel.startsWith("Khớp")).length;

  return (
    <Card>
      <h3 className="font-bold text-brand-deep">Dữ liệu đối chiếu</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="text-sm font-semibold text-brand-deep">GPA / dữ liệu học tập</div>
          <div className="mt-3 grid gap-2">
            <EvidenceFact label="Sinh viên nhập" value={formatMetricInputValue(metricGpa)} />
            <EvidenceFact
              label="SmartReader gợi ý"
              value={
                academicModel?.gpa !== null && academicModel?.gpa !== undefined
                  ? `${formatEvidenceValue(academicModel.gpa)}/4`
                  : "Chưa đọc được"
              }
            />
            <EvidenceFact
              label="Ngưỡng cấp đang xét"
              value={threshold ? `${threshold}/4` : "Chưa có ngưỡng"}
            />
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-sm font-semibold text-brand-deep">
            Minh chứng / đối chiếu chính thức
          </div>
          <div className="mt-3 grid gap-2">
            <EvidenceFact
              label="Minh chứng liên quan"
              value={`${relatedEvidences.length} tài liệu`}
            />
            <EvidenceFact
              label="Đối chiếu danh sách"
              value={matchedCount ? `${matchedCount} khớp` : "Chưa khớp"}
            />
            <EvidenceFact
              label="Kết luận tạm"
              value={
                academicModel
                  ? getGpaConclusion(
                      metricGpa,
                      academicModel.gpa,
                      threshold,
                      academicModel.gpaRequiresConfirmation,
                    )
                  : detail?.criterionLevelAssessment
                    ? `Gợi ý cấp: ${getLevelLabel(detail.criterionLevelAssessment.suggestedCriterionLevel)}`
                    : "Cần cán bộ xác nhận"
              }
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

function EvidenceFact({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/30 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-brand-deep">{value || "Chưa có dữ liệu"}</div>
    </div>
  );
}

function getEvidenceReviewBadgeVariant(
  evidence: NonNullable<ReviewTaskDetail["evidences"]>[number],
) {
  if (
    evidence.status === "rejected" ||
    evidence.indexingStatus === "failed" ||
    evidence.indexingStatus === "needs_manual_review"
  ) {
    return "outline";
  }
  if (evidence.status === "accepted") return "secondary";
  return "default";
}

function getEvidenceWarningMessages(
  evidence: NonNullable<ReviewTaskDetail["evidences"]>[number],
  model: ReturnType<typeof buildEvidenceDisplayModel>,
) {
  const warnings = new Set<string>();
  const rawWarnings = evidence.card?.warningsJson;

  if (Array.isArray(rawWarnings)) {
    for (const warning of rawWarnings) {
      if (typeof warning === "string") warnings.add(warning);
      else if (warning && typeof warning === "object") {
        const record = warning as Record<string, unknown>;
        const text = record.message ?? record.label ?? record.reason ?? record.code;
        if (text) warnings.add(String(text));
      }
    }
  } else if (rawWarnings && typeof rawWarnings === "object") {
    for (const value of Object.values(rawWarnings as Record<string, unknown>)) {
      if (typeof value === "string") warnings.add(value);
    }
  }

  if (evidence.indexingStatus === "failed") warnings.add("File chưa đọc được");
  if (evidence.indexingStatus === "needs_manual_review") warnings.add("OCR cần cán bộ kiểm tra");
  if (!model.activityDate && model.kind === "event_achievement")
    warnings.add("Thiếu ngày hoạt động");
  if (!model.organizer && model.kind === "event_achievement") warnings.add("Thiếu đơn vị tổ chức");
  if (typeof evidence.confidence === "number" && evidence.confidence < 0.65) {
    warnings.add("Confidence thấp");
  }
  if (!model.matchLabel.startsWith("Khớp") && evidence.sourceType !== "metric_input") {
    warnings.add(model.matchLabel);
  }

  return Array.from(warnings);
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
            {[item.studentCode, item.className, item.faculty].filter(Boolean).join(" • ") ||
              "Chưa có thông tin lớp/khoa"}
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
  if (tab === "all") return items;
  if (tab === "mine") {
    return items.filter(
      (item) => item.permissions?.canAct || item.permissions?.reason === "assigned_to_you",
    );
  }
  if (tab === "due_soon") {
    return items.filter(
      (item) => item.priorityReason === "due_soon" || item.priorityReason === "overdue",
    );
  }
  if (tab === "supplement") {
    return items.filter((item) => item.status === "supplement_required");
  }
  if (tab === "ambiguous") {
    return items.filter(
      (item) =>
        item.priorityReason === "low_ai_confidence" ||
        item.status === "resolution_needed" ||
        (item.aiConfidence !== null && item.aiConfidence !== undefined && item.aiConfidence < 0.65),
    );
  }
  return items;
}

function hasCriterionEvidenceTask(task?: ReviewTaskListItem | null) {
  return Boolean(task && (task.evidenceCount ?? 0) > 0);
}

function isOfficerQueueVisibleTask(task: ReviewTaskListItem) {
  return hasCriterionEvidenceTask(task) && isOpenTask(task);
}

function getTaskForCriterion(
  group: OfficerApplicationGroup,
  criterion: Criterion,
): ReviewTaskListItem | null {
  return group.tasks.find((task) => task.criterion === criterion) ?? null;
}

function filterOfficerGroupsByCriterion(
  groups: OfficerApplicationGroup[],
  tab: QueueTab,
  criterion: Criterion,
) {
  return groups.filter((group) => {
    const task = getTaskForCriterion(group, criterion);
    if (!task || !isOfficerQueueVisibleTask(task)) return false;
    return filterOfficerTasks([task], tab).length > 0;
  });
}

function sortQueueItems(items: ReviewTaskListItem[], sortBy: QueueSort) {
  const list = [...items];
  const dateValue = (value?: string | null) => (value ? new Date(value).getTime() : 0);
  const text = (value?: string | null) => value ?? "";
  if (sortBy === "oldest")
    return list.sort(
      (a, b) => dateValue(a.createdAt ?? a.updatedAt) - dateValue(b.createdAt ?? b.updatedAt),
    );
  if (sortBy === "student_name")
    return list.sort((a, b) => text(a.studentName).localeCompare(text(b.studentName), "vi"));
  if (sortBy === "student_code")
    return list.sort((a, b) => text(a.studentCode).localeCompare(text(b.studentCode), "vi"));
  if (sortBy === "criterion")
    return list.sort((a, b) => text(a.criterion).localeCompare(text(b.criterion), "vi"));
  if (sortBy === "status")
    return list.sort((a, b) => text(a.status).localeCompare(text(b.status), "vi"));
  if (sortBy === "review_need")
    return list.sort((a, b) => getPriorityWeight(a) - getPriorityWeight(b));
  if (sortBy === "deadline")
    return list.sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate));
  if (sortBy === "level")
    return list.sort((a, b) => text(a.targetLevel).localeCompare(text(b.targetLevel), "vi"));
  if (sortBy === "evidence_count")
    return list.sort((a, b) => (b.evidenceCount ?? 0) - (a.evidenceCount ?? 0));
  return list.sort(
    (a, b) => dateValue(b.createdAt ?? b.updatedAt) - dateValue(a.createdAt ?? a.updatedAt),
  );
}

function sortQueueGroups(
  groups: OfficerApplicationGroup[],
  sortBy: QueueSort,
  activeCriterion?: Criterion | null,
) {
  const list = [...groups];
  const dateValue = (value?: string | null) => (value ? new Date(value).getTime() : 0);
  const text = (value?: string | null) => value ?? "";
  const sortTask = (group: OfficerApplicationGroup) =>
    activeCriterion
      ? (getTaskForCriterion(group, activeCriterion) ?? group.primaryTask)
      : group.primaryTask;
  if (sortBy === "oldest")
    return list.sort((a, b) => dateValue(a.updatedAt) - dateValue(b.updatedAt));
  if (sortBy === "student_name")
    return list.sort((a, b) => text(a.studentName).localeCompare(text(b.studentName), "vi"));
  if (sortBy === "student_code")
    return list.sort((a, b) => text(a.studentCode).localeCompare(text(b.studentCode), "vi"));
  if (sortBy === "criterion")
    return list.sort((a, b) =>
      text(sortTask(a).criterion).localeCompare(text(sortTask(b).criterion), "vi"),
    );
  if (sortBy === "status")
    return list.sort((a, b) =>
      text(sortTask(a).status).localeCompare(text(sortTask(b).status), "vi"),
    );
  if (sortBy === "review_need")
    return list.sort((a, b) => getPriorityWeight(sortTask(a)) - getPriorityWeight(sortTask(b)));
  if (sortBy === "deadline")
    return list.sort(
      (a, b) =>
        dateValue(sortTask(a).dueDate ?? a.dueDate) - dateValue(sortTask(b).dueDate ?? b.dueDate),
    );
  if (sortBy === "newest")
    return list.sort((a, b) => dateValue(b.updatedAt) - dateValue(a.updatedAt));
  if (sortBy === "level")
    return list.sort((a, b) => text(a.targetLevel).localeCompare(text(b.targetLevel), "vi"));
  if (sortBy === "evidence_count") {
    return list.sort((a, b) => {
      if (activeCriterion) {
        return (sortTask(b).evidenceCount ?? 0) - (sortTask(a).evidenceCount ?? 0);
      }
      return (
        b.tasks.reduce((sum, task) => sum + (task.evidenceCount ?? 0), 0) -
        a.tasks.reduce((sum, task) => sum + (task.evidenceCount ?? 0), 0)
      );
    });
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
        (task) =>
          task.permissions?.canView && !task.permissions.canAct && !task.permissions.canClaim,
      );
      const primaryTask = actionableTasks[0] ?? claimableTasks[0] ?? sortedTasks[0];
      const dueDate =
        sortedTasks
          .map((task) => task.dueDate)
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;
      const updatedAt =
        sortedTasks
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

function getNextActionableCriterion(
  group: OfficerApplicationGroup,
  currentCriterion: Criterion,
): Criterion | null {
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

function getCriterionCompactStatus(task?: ReviewTaskListItem) {
  if (!task) return "N/A";
  if (task.status === "accepted") return "Đạt";
  if (task.status === "rejected") return "Chưa đạt";
  if (task.status === "supplement_required") return "Cần bổ sung";
  if (task.status === "resolution_needed") return "Cần rõ";
  if (task.permissions?.canAct) return "Cần xử lý";
  return "Chờ";
}

function getCriterionDotClass(task?: ReviewTaskListItem) {
  if (!task) return "bg-slate-300";
  if (task.status === "accepted") return "bg-emerald-500";
  if (task.status === "rejected") return "bg-rose-500";
  if (task.status === "supplement_required" || task.priorityReason === "low_ai_confidence")
    return "bg-amber-500";
  if (task.status === "resolution_needed") return "bg-amber-600";
  if (task.permissions?.canAct) return "bg-[#0057C2]";
  return "bg-slate-400";
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

function getApplicationStatusLabel(status: OfficerApplicationGroup["applicationStatus"]) {
  const labels: Record<OfficerApplicationGroup["applicationStatus"], string> = {
    draft: "Bản nháp",
    prechecked: "Đã tiền kiểm",
    ready_to_submit: "Sẵn sàng nộp",
    submitted: "Chờ xét",
    under_review: "Đang xét",
    supplement_required: "Cần bổ sung",
    resolution_needed: "Chờ hội ý",
    completed: "Hoàn tất",
    rejected: "Không đạt",
  };
  return labels[status] ?? status;
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
  if (task.status === "supplement_required" || task.status === "resolution_needed")
    return "outline";
  return "secondary";
}

const evidenceDecisionOptions: Array<{
  value: EvidenceDecisionStatus;
  label: string;
  description: string;
}> = [
  {
    value: "accepted",
    label: "Chấp nhận minh chứng",
    description: "Tài liệu đủ căn cứ cho tiêu chí.",
  },
  {
    value: "supplement_required",
    label: "Cần sinh viên bổ sung",
    description: "Thiếu dữ liệu hoặc file chưa rõ.",
  },
  {
    value: "rejected",
    label: "Không chấp nhận",
    description: "Không phù hợp hoặc không đủ căn cứ.",
  },
  {
    value: "resolution_needed",
    label: "Chuyển hội ý",
    description: "Trường hợp cần hội đồng xem xét.",
  },
];

const criterionDecisionOptions = [
  {
    value: "accepted" as const,
    label: "Đạt tiêu chí",
    description: "Tổng hợp minh chứng đủ căn cứ.",
  },
  {
    value: "rejected" as const,
    label: "Không đạt tiêu chí",
    description: "Không đủ điều kiện sau xét duyệt.",
  },
  {
    value: "supplement_required" as const,
    label: "Cần bổ sung",
    description: "Gửi yêu cầu bổ sung cho tiêu chí.",
  },
  {
    value: "resolution_needed" as const,
    label: "Chuyển hội ý",
    description: "Đưa sang Resolution Hub.",
  },
];

function getNextUnresolvedEvidenceIndex(
  evidences: ReviewEvidence[],
  decisions: Record<string, EvidenceDecisionDraft>,
) {
  const index = evidences.findIndex(
    (evidence) => !isEvidenceResolvedForCriterion(evidence, decisions),
  );
  return index >= 0 ? index : 0;
}

function getExistingEvidenceDecision(evidence: ReviewEvidence): EvidenceDecisionStatus | null {
  if (evidence.status === "accepted") return "accepted";
  if (evidence.status === "rejected") return "rejected";
  if (evidence.status === "resolution_needed") return "resolution_needed";
  return null;
}

function getEffectiveEvidenceDecision(
  evidence: ReviewEvidence,
  decisions: Record<string, EvidenceDecisionDraft>,
): EvidenceDecisionStatus | null {
  return decisions[evidence.id]?.status ?? getExistingEvidenceDecision(evidence);
}

function isEvidenceResolvedForCriterion(
  evidence: ReviewEvidence,
  decisions: Record<string, EvidenceDecisionDraft>,
) {
  return Boolean(getEffectiveEvidenceDecision(evidence, decisions));
}

function getEvidenceDecisionLabel(status: EvidenceDecisionStatus) {
  const labels: Record<EvidenceDecisionStatus, string> = {
    accepted: "Đã chấp nhận",
    supplement_required: "Cần bổ sung",
    rejected: "Không chấp nhận",
    resolution_needed: "Chuyển hội ý",
  };
  return labels[status];
}

function getEvidenceDecisionCta(status: EvidenceDecisionStatus) {
  if (status === "accepted") return "Xác nhận minh chứng hợp lệ";
  if (status === "supplement_required") return "Lưu yêu cầu bổ sung";
  if (status === "rejected") return "Xác nhận không chấp nhận";
  return "Chuyển hội ý";
}

function getCriterionDecisionCta(status: EvidenceDecisionStatus) {
  if (status === "accepted") return "Chốt tiêu chí";
  if (status === "supplement_required") return "Gửi yêu cầu bổ sung";
  if (status === "rejected") return "Xác nhận không đạt";
  return "Chuyển hội ý";
}

function mapEvidenceDecisionToPayload(status: EvidenceDecisionStatus) {
  if (status === "supplement_required") return "needs_supplement";
  return status;
}

function getEvidenceDecisionSummary(
  evidences: ReviewEvidence[],
  decisions: Record<string, EvidenceDecisionDraft>,
) {
  return evidences.reduce(
    (summary, evidence) => {
      const status = getEffectiveEvidenceDecision(evidence, decisions);
      if (status === "accepted") summary.accepted += 1;
      if (status === "supplement_required") summary.supplementRequired += 1;
      if (status === "rejected") summary.rejected += 1;
      if (status === "resolution_needed") summary.resolutionNeeded += 1;
      return summary;
    },
    { accepted: 0, supplementRequired: 0, rejected: 0, resolutionNeeded: 0 },
  );
}

function getRecommendedCriterionDecision(
  summary: ReturnType<typeof getEvidenceDecisionSummary>,
): EvidenceDecisionStatus {
  if (summary.resolutionNeeded > 0) return "resolution_needed";
  if (summary.supplementRequired > 0) return "supplement_required";
  if (summary.rejected > 0 && summary.accepted === 0) return "rejected";
  return "accepted";
}

function buildEvidenceDecisionPayloads(
  evidences: ReviewEvidence[],
  decisions: Record<string, EvidenceDecisionDraft>,
) {
  return evidences
    .map((evidence) => {
      const draft = decisions[evidence.id];
      const status = draft?.status ?? getExistingEvidenceDecision(evidence);
      if (!status) return null;
      return {
        evidenceId: evidence.id,
        status: mapEvidenceDecisionToPayload(status),
        note: draft?.note || draft?.reason || evidence.reviewerNote || evidence.note || undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function getSystemFinalizationSuggestion(
  summary: ReturnType<typeof getEvidenceDecisionSummary>,
  unresolvedCount: number,
) {
  if (unresolvedCount > 0) return "Cần xử lý hết minh chứng trước khi chốt tiêu chí.";
  if (summary.resolutionNeeded > 0) return "Nên chuyển hội ý vì có minh chứng cần xem xét thêm.";
  if (summary.supplementRequired > 0) return "Nên yêu cầu bổ sung trước khi chốt đạt tiêu chí.";
  if (summary.rejected > 0 && summary.accepted === 0)
    return "Có thể không đạt tiêu chí do chưa có minh chứng hợp lệ.";
  return "Có thể đạt tiêu chí nếu checklist điều kiện chính cũng phù hợp.";
}

function getConfidencePhrase(value?: number | null) {
  if (value === null || value === undefined) return "Chưa có dữ liệu";
  if (value >= 0.8) return "Độ tin cậy tốt";
  if (value >= 0.65) return "Cần kiểm tra";
  return "Độ tin cậy thấp";
}

function isCompletedTask(task: ReviewTaskListItem) {
  return ["accepted", "rejected", "resolution_needed"].includes(task.status);
}

function getPriorityTasks(items: ReviewTaskListItem[]) {
  return [...items]
    .filter(
      (item) =>
        isOpenTask(item) &&
        (item.priorityReason || item.permissions?.canAct || item.permissions?.canClaim),
    )
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

function getReadableFieldEntries(fields: Record<string, unknown>) {
  return Object.entries(fields).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
}

function hasDisplayableEvidenceValue(value: React.ReactNode) {
  if (value === null || value === undefined || value === false) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return ![
      "chưa có dữ liệu",
      "chưa đọc được",
      "chưa nhập",
      "không áp dụng",
      "--",
      "null",
      "undefined",
      "unknown",
      "n/a",
    ].includes(normalized);
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function isVisibleExtractedField(key: string) {
  const normalized = key.replace(/[_\s-]/g, "").toLowerCase();
  return ![
    "evidencename",
    "evidencetitle",
    "title",
    "studentcode",
    "mssv",
    "id",
    "uuid",
    "applicationid",
    "evidenceid",
    "fileid",
    "createdat",
    "updatedat",
    "readinessscore",
  ].includes(normalized);
}

function formatEvidenceValue(value?: unknown) {
  if (value === null || value === undefined || value === "") return "Chưa có dữ liệu";
  if (Array.isArray(value)) {
    const formattedItems = value
      .map((item) => formatEvidenceValue(item))
      .filter((item) => item !== "Chưa có dữ liệu");
    return formattedItems.length ? formattedItems.join(", ") : "Chưa có dữ liệu";
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const display = record.display ?? record.label ?? record.value ?? record.raw;
    if (display !== undefined && display !== null && display !== "")
      return formatEvidenceValue(display);
    return JSON.stringify(record);
  }
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
  return String(value);
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return "--";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mimeType?: string | null, fileName?: string | null) {
  if (mimeType?.startsWith("image/")) return true;
  return Boolean(fileName && /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName));
}

function isPdfMime(mimeType?: string | null, fileName?: string | null) {
  return mimeType === "application/pdf" || Boolean(fileName && /\.pdf$/i.test(fileName));
}

function formatMetricInputValue(value?: unknown) {
  if (value === null || value === undefined || value === "") return "Chưa nhập";
  return formatEvidenceValue(value);
}

function formatOrganizerLevel(value?: unknown) {
  if (!value) return "Chưa có dữ liệu";
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return formatOrganizerLevel(record.display ?? record.label ?? record.value ?? record.raw);
  }
  if (value === "school" || value === "university" || value === "city" || value === "central") {
    return getLevelLabel(value);
  }
  if (value === "faculty") return "Cấp Khoa";
  if (value === "club") return "CLB/Đội/Nhóm";
  if (value === "external") return "Đơn vị ngoài trường";
  if (value === "unknown") return "Chưa xác định";
  return String(value);
}

function getGpaConclusion(
  studentValue?: unknown,
  readerValue?: number | null,
  threshold?: number | null,
  readerRequiresConfirmation = true,
) {
  const studentGpa =
    typeof studentValue === "number"
      ? studentValue
      : typeof studentValue === "string"
        ? Number(studentValue)
        : null;
  if (studentGpa !== null && Number.isFinite(studentGpa) && threshold) {
    if (studentGpa >= threshold)
      return `Sinh viên nhập GPA ${formatEvidenceValue(studentGpa)}, đạt ngưỡng ${threshold}/4.`;
    return `Sinh viên nhập GPA ${formatEvidenceValue(studentGpa)}, chưa đạt ngưỡng ${threshold}/4.`;
  }
  if (readerValue !== null && readerValue !== undefined && threshold) {
    const suffix =
      readerValue >= threshold ? "có thể dùng để đối chiếu ngưỡng" : "chưa đủ ngưỡng tham chiếu";
    return readerRequiresConfirmation
      ? `SmartReader phát hiện GPA ${formatEvidenceValue(readerValue)}/4. Vui lòng xác nhận trước khi dùng để tiền kiểm.`
      : `GPA SmartReader gợi ý ${suffix} ${threshold}/4.`;
  }
  return "Chưa đủ dữ liệu để kết luận tự động, cán bộ cần đối chiếu tài liệu.";
}

function getQueueMetricLabel(metricType?: string | null) {
  const labels: Record<string, string> = {
    gpa: "GPA/ĐTB",
    conduct_score: "Điểm rèn luyện",
    physical_score: "Điểm thể lực",
    volunteer_days: "Ngày/giờ tình nguyện",
    foreign_language_score: "Chứng chỉ ngoại ngữ",
  };
  return metricType ? (labels[metricType] ?? metricType) : "Chưa có dữ liệu";
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
