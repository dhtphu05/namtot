import * as React from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, FilePlus2, FilterX, Loader2, Search, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { CriterionIcon } from "@/components/AppIcon";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { useAuth } from "@/features/auth/store/auth-store";
import { useEvidenceCardPolling } from "@/hooks/useEvidenceCardPolling";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import { getCoreCriterionKey, type CoreCriterionKey } from "@/lib/criteria-presentation";
import {
  evidenceKeys,
  useDeleteEvidence,
  useEvidences,
} from "@/features/evidence/hooks/useEvidence";
import { useQueryClient } from "@tanstack/react-query";
import type { EvidenceCard } from "@/types/evidence";
import { AddEvidenceDrawer } from "./AddEvidenceDrawer";
import { EvidenceDetailModal } from "./EvidenceDetailModal";
import { StudentEvidenceCard } from "./StudentEvidenceCard";
import { studentEvidenceCriteria } from "./evidence-card-utils";
import {
  filterStudentEvidences,
  getEvidenceLibraryStatus,
  isCoreEvidenceCriterion,
  type EvidenceLibraryStatusKey,
} from "../utils/evidenceLibrary";

type CriterionFilter = CoreCriterionKey | "all";
type StatusFilter = EvidenceLibraryStatusKey | "all";

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Mọi trạng thái" },
  { value: "processing", label: "Đang được xử lý" },
  { value: "attention", label: "Cần bạn kiểm tra" },
  { value: "ready", label: "Đã sẵn sàng" },
  { value: "waiting", label: "Đã tiếp nhận" },
  { value: "error", label: "Có vấn đề" },
  { value: "recorded", label: "Đã ghi nhận" },
];

class EvidenceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <ErrorState
            title="Không tải được minh chứng"
            message={this.state.error.message}
            onRetry={() => window.location.reload()}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export function EvidenceWorkspaceSafe() {
  return (
    <EvidenceErrorBoundary>
      <EvidenceWorkspace />
    </EvidenceErrorBoundary>
  );
}

function EvidenceWorkspace() {
  const user = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const currentApplication = useCurrentApplication();
  const application = currentApplication.data?.application;
  const applicationId = application?.id;
  const applicationStatus = application?.status;
  const evidenceQuery = useEvidences(applicationId);
  const deleteEvidence = useDeleteEvidence(applicationId);
  const [criterionFilter, setCriterionFilter] = React.useState<CriterionFilter>(() =>
    readCriterionFilter(),
  );
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [search, setSearch] = React.useState("");
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerCriterion, setDrawerCriterion] = React.useState<Criterion | undefined>();
  const [selectedEvidence, setSelectedEvidence] = React.useState<EvidenceResponse | null>(null);
  const [detailMode, setDetailMode] = React.useState<"view" | "confirm">("view");
  const [evidenceToDelete, setEvidenceToDelete] = React.useState<EvidenceResponse | null>(null);
  const [deleteError, setDeleteError] = React.useState("");
  const [handledRouteRequest, setHandledRouteRequest] = React.useState(false);
  const handledEvidenceLink = React.useRef(false);

  const evidenceList = React.useMemo(
    () =>
      Array.isArray(evidenceQuery.data)
        ? (evidenceQuery.data as EvidenceResponse[]).filter((item) =>
            isCoreEvidenceCriterion(item.criterion),
          )
        : [],
    [evidenceQuery.data],
  );
  const isEditable = ["draft", "prechecked", "ready_to_submit"].includes(applicationStatus ?? "");
  const filteredEvidences = React.useMemo(
    () =>
      filterStudentEvidences(evidenceList, {
        criterion: criterionFilter,
        status: statusFilter,
        search,
      }),
    [criterionFilter, evidenceList, search, statusFilter],
  );
  const openUpload = (criterion?: CoreCriterionKey) => {
    setDrawerCriterion(criterion);
    setDrawerOpen(true);
  };

  React.useEffect(() => {
    if (handledRouteRequest || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const requestedCriterion = getCoreCriterionKey(params.get("criterion"));
    if (requestedCriterion) setCriterionFilter(requestedCriterion);
    if (params.get("action") === "upload" || params.get("uploadEvidence") === "1") {
      setDrawerCriterion(requestedCriterion ?? undefined);
      setDrawerOpen(true);
      params.delete("action");
      params.delete("uploadEvidence");
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`,
      );
    }
    setHandledRouteRequest(true);
  }, [handledRouteRequest]);

  React.useEffect(() => {
    if (
      handledEvidenceLink.current ||
      !applicationId ||
      evidenceQuery.isLoading ||
      evidenceQuery.isError
    )
      return;
    const params = new URLSearchParams(window.location.search);
    const evidenceId = params.get("evidenceId");
    if (!evidenceId) return;
    const match = evidenceList.find((item) => item.id === evidenceId);
    if (!match) return;
    handledEvidenceLink.current = true;
    setSelectedEvidence(match);
    setDetailMode(params.get("mode") === "confirm" ? "confirm" : "view");
    params.delete("evidenceId");
    if (params.get("mode") === "confirm") params.delete("mode");
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`,
    );
  }, [applicationId, evidenceList, evidenceQuery.isError, evidenceQuery.isLoading]);

  const chooseCriterion = (criterion: CriterionFilter) => {
    setCriterionFilter(criterion);
    const url = new URL(window.location.href);
    if (criterion === "all") url.searchParams.delete("criterion");
    else url.searchParams.set("criterion", criterion);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const confirmDelete = async () => {
    if (!evidenceToDelete || !applicationId) return;
    setDeleteError("");
    try {
      await deleteEvidence.mutateAsync({ id: evidenceToDelete.id, applicationId });
      setEvidenceToDelete(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Chưa xóa được minh chứng. Vui lòng thử lại.",
      );
    }
  };

  if (currentApplication.isLoading) {
    return (
      <>
        <TopBar title="Minh chứng" subtitle="Tài liệu trong hồ sơ của bạn." />
        <LoadingState label="Đang tải hồ sơ hiện tại..." />
      </>
    );
  }

  if (currentApplication.isError) {
    return (
      <>
        <TopBar title="Minh chứng" subtitle="Tài liệu trong hồ sơ của bạn." />
        <ErrorState
          title="Không thể tải hồ sơ"
          message={
            currentApplication.error instanceof Error
              ? currentApplication.error.message
              : "Vui lòng thử lại."
          }
          onRetry={() => void currentApplication.refetch()}
        />
      </>
    );
  }

  if (!application) {
    return (
      <>
        <TopBar title="Minh chứng" subtitle="Tài liệu trong hồ sơ của bạn." />
        <EmptyState
          title="Bạn chưa có hồ sơ"
          description="Tạo hồ sơ để thêm minh chứng."
          action={
            <Button asChild>
              <Link to="/app/application">Tạo hồ sơ</Link>
            </Button>
          }
        />
      </>
    );
  }

  const activeApplicationId = application.id;
  const activeCriterion = criterionFilter === "all" ? undefined : criterionFilter;
  const noResults = filteredEvidences.length === 0 && (search.trim() || statusFilter !== "all");
  const noEvidenceForCriterion =
    filteredEvidences.length === 0 && !noResults && criterionFilter !== "all";
  const noEvidence = filteredEvidences.length === 0 && !noResults && criterionFilter === "all";

  return (
    <>
      <TopBar
        title="Minh chứng"
        subtitle="Tài liệu trong hồ sơ của bạn."
        action={
          isEditable ? (
            <Button className="min-h-11" onClick={() => openUpload(activeCriterion)}>
              <FilePlus2 className="h-4 w-4" />
              Thêm minh chứng
            </Button>
          ) : null
        }
      />

      <main className="mx-auto w-full max-w-[1240px] space-y-5 px-4 pb-8 pt-4 md:px-6">
        {!isEditable ? (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p>
                {applicationStatus === "supplement_required"
                  ? "Thư viện đang ở chế độ xem. Hãy mở đúng tiêu chí được yêu cầu trong hồ sơ để bổ sung tài liệu."
                  : "Hồ sơ đang được xét. Bạn vẫn có thể xem các tài liệu đã gửi."}
              </p>
              {applicationStatus === "supplement_required" ? (
                <Link
                  to="/app/application"
                  className="mt-1 inline-block font-medium text-primary underline-offset-4 hover:underline"
                >
                  Mở hồ sơ
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        <section
          aria-label="Tóm tắt minh chứng"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          <span>
            <strong className="font-semibold text-foreground">{evidenceList.length}</strong> tài
            liệu
          </span>
        </section>

        <section aria-label="Lọc minh chứng" className="space-y-3 rounded-xl border bg-white p-3">
          <div role="group" aria-label="Lọc theo tiêu chí" className="flex flex-wrap gap-2">
            <CriterionFilterButton
              active={criterionFilter === "all"}
              label="Tất cả"
              count={evidenceList.length}
              onClick={() => chooseCriterion("all")}
            />
            {studentEvidenceCriteria.map((criterion) => (
              <CriterionFilterButton
                key={criterion.key}
                criterion={criterion.key}
                active={criterionFilter === criterion.key}
                label={criterion.label}
                count={evidenceList.filter((item) => item.criterion === criterion.key).length}
                onClick={() => chooseCriterion(criterion.key)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                aria-label="Tìm minh chứng theo tên hoặc tên tệp"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tên minh chứng hoặc tài liệu"
                className="min-h-11 pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger
                className="min-h-11 w-full sm:w-[220px]"
                aria-label="Lọc theo trạng thái"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeCriterion ? (
              <Button asChild variant="outline" className="min-h-11 shrink-0">
                <Link to="/app/event-library" search={{ criterion: activeCriterion } as never}>
                  Tìm hoạt động đã ghi nhận
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        {evidenceQuery.isLoading ? (
          <LoadingState label="Đang tải minh chứng..." />
        ) : evidenceQuery.isError ? (
          <ErrorState
            title="Không thể tải danh sách minh chứng"
            message={
              evidenceQuery.error instanceof Error
                ? evidenceQuery.error.message
                : "Vui lòng thử lại."
            }
            onRetry={() => void evidenceQuery.refetch()}
          />
        ) : noResults ? (
          <EmptyState
            title="Không tìm thấy minh chứng phù hợp"
            description="Thử thay đổi nội dung tìm kiếm hoặc bộ lọc."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                <FilterX className="h-4 w-4" />
                Xóa bộ lọc
              </Button>
            }
          />
        ) : noEvidenceForCriterion ? (
          <EmptyState
            title={`Chưa có minh chứng · ${studentEvidenceCriteria.find((item) => item.key === criterionFilter)?.label}.`}
            action={
              isEditable ? (
                <Button onClick={() => openUpload(criterionFilter)} size="sm">
                  <FilePlus2 className="h-4 w-4" />
                  Thêm
                </Button>
              ) : undefined
            }
            className="p-3 text-left"
          />
        ) : noEvidence ? (
          <EmptyState
            title="Chưa có minh chứng."
            action={
              isEditable ? (
                <Button onClick={() => openUpload()} size="sm">
                  <FilePlus2 className="h-4 w-4" />
                  Thêm
                </Button>
              ) : undefined
            }
            className="p-3 text-left"
          />
        ) : (
          <section
            aria-label="Danh sách minh chứng"
            className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3"
          >
            {filteredEvidences.map((evidence) => (
              <PollingStudentEvidenceCard
                key={evidence.id}
                evidence={evidence}
                applicationId={activeApplicationId}
                canEdit={isEditable && isEvidenceMutable(evidence)}
                profile={{ fullName: user?.fullName, studentCode: user?.studentCode }}
                onView={() => setSelectedEvidence(evidence)}
                onDelete={() => {
                  setDeleteError("");
                  setEvidenceToDelete(evidence);
                }}
              />
            ))}
          </section>
        )}
      </main>

      <AddEvidenceDrawer
        applicationId={activeApplicationId}
        open={drawerOpen && isEditable}
        onOpenChange={(open) => setDrawerOpen(open)}
        initialCriterion={drawerCriterion}
        criterionMode="select"
        onCreated={(created) => {
          setDrawerOpen(false);
          void queryClient.invalidateQueries({ queryKey: evidenceKeys.list(activeApplicationId) });
          void evidenceQuery.refetch();
        }}
      />

      <EvidenceDetailModal
        evidence={selectedEvidence}
        applicationId={activeApplicationId}
        canEdit={Boolean(isEditable && selectedEvidence && isEvidenceMutable(selectedEvidence))}
        initialMode={detailMode}
        onChanged={() => void evidenceQuery.refetch()}
        onClose={() => {
          setSelectedEvidence(null);
          setDetailMode("view");
        }}
      />

      <AlertDialog
        open={Boolean(evidenceToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteEvidence.isPending) {
            setEvidenceToDelete(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa minh chứng khỏi hồ sơ?</AlertDialogTitle>
            <AlertDialogDescription>
              “{evidenceToDelete?.evidenceName}” và tài liệu đính kèm sẽ bị xóa khỏi hồ sơ. Thao tác
              này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvidence.isPending}>Giữ lại</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleteEvidence.isPending}
            >
              {deleteEvidence.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deleteEvidence.isPending ? "Đang xóa..." : "Xóa minh chứng"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CriterionFilterButton({
  criterion,
  active,
  label,
  count,
  onClick,
}: {
  criterion?: CoreCriterionKey;
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      aria-pressed={active}
      className="min-h-11 shrink-0 justify-start gap-2 px-3"
      onClick={onClick}
    >
      {criterion ? <CriterionIcon criterion={criterion} size={16} /> : null}
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </Button>
  );
}

function PollingStudentEvidenceCard({
  evidence,
  applicationId,
  canEdit,
  profile,
  onView,
  onDelete,
}: {
  evidence: EvidenceResponse;
  applicationId: string;
  canEdit: boolean;
  profile: { fullName?: string | null; studentCode?: string | null };
  onView: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const evidenceWithCard = evidence as EvidenceResponse & { card?: EvidenceCard | null };
  const initialStatus = getEvidenceLibraryStatus(evidence, evidenceWithCard.card);
  const cardQuery = useEvidenceCardPolling(evidence.id, {
    enabled: evidence.sourceType !== "event_import" && initialStatus.key === "processing",
    initialIntervalMs: 2000,
    backoffAfterMs: 20000,
    backoffIntervalMs: 5000,
    maxElapsedMs: 180000,
    stopWhen: (card) => getEvidenceLibraryStatus(evidence, card).key !== "processing",
  });
  const card = (cardQuery.data ?? evidenceWithCard.card ?? null) as EvidenceCard | null;
  const status = getEvidenceLibraryStatus(evidence, card);

  React.useEffect(() => {
    if (initialStatus.key !== "processing" || !cardQuery.data || status.key === "processing")
      return;
    void queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
  }, [applicationId, cardQuery.data, initialStatus.key, queryClient, status.key]);

  return (
    <StudentEvidenceCard
      evidence={evidence}
      applicationId={applicationId}
      canEdit={canEdit}
      profile={profile}
      statusOverride={status}
      viewLabel="Xem minh chứng"
      onViewDetails={onView}
      onDelete={canEdit ? onDelete : undefined}
    />
  );
}

function readCriterionFilter(): CriterionFilter {
  if (typeof window === "undefined") return "all";
  return getCoreCriterionKey(new URLSearchParams(window.location.search).get("criterion")) ?? "all";
}

function isEvidenceMutable(evidence: EvidenceResponse) {
  return !["accepted", "rejected", "resolution_needed"].includes(evidence.status);
}
