import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Search, UsersRound } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, StatCard } from "@/components/ui-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useFinalizeManagerCollective,
  useManagerCollectives,
} from "@/features/manager/hooks/useManager";
import type { ManagerCollectiveItem, ManagerCollectiveFilters } from "@/features/manager/types";
import type { CollectiveStatus, FinalStatus, Level, Role } from "@/lib/api/types";
import { ACTIVE_LEVELS, getFinalizeActionLabel, getLevelLabel } from "@/lib/levels";
import {
  finalStatusTone,
  getApplicationStatusLabel,
  getFinalStatusLabel,
} from "@/lib/status-labels";

export const Route = createFileRoute("/app/manager/collective")({
  component: ManagerCollectiveRoute,
});

const allowedRoles: Role[] = ["manager", "committee", "admin"];
const finalizerRoles: Role[] = ["manager", "committee", "admin"];
const levels: Level[] = [...ACTIVE_LEVELS];
const statuses: CollectiveStatus[] = [
  "draft",
  "prechecked",
  "ready_to_submit",
  "submitted",
  "under_review",
  "supplement_required",
  "resolution_needed",
  "completed",
  "rejected",
];

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

function ManagerCollectiveRoute() {
  const user = useAuth((state) => state.user);
  const role = user?.role;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Hồ sơ tập thể"
          subtitle="Theo dõi và chốt kết quả hồ sơ tập thể Sinh viên 5 tốt."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập màn hồ sơ tập thể.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return <ManagerCollectiveContent role={role} />;
}

function ManagerCollectiveContent({ role }: { role: Role }) {
  const [search, setSearch] = useState("");
  const [targetLevel, setTargetLevel] = useState<Level | "all">("all");
  const [status, setStatus] = useState<CollectiveStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ManagerCollectiveItem | null>(null);
  const canFinalizeRole = finalizerRoles.includes(role);
  const filters = useMemo<ManagerCollectiveFilters>(
    () => ({
      page,
      limit: 20,
      q: search.trim() || undefined,
      targetLevel: targetLevel === "all" ? undefined : targetLevel,
      status: status === "all" ? undefined : status,
    }),
    [page, search, status, targetLevel],
  );
  const collectivesQuery = useManagerCollectives(filters);
  const items = collectivesQuery.data?.items ?? [];
  const pagination = collectivesQuery.data?.pagination ?? {
    page,
    limit: 20,
    total: 0,
    totalPages: 0,
  };
  const readyCount = items.filter((item) => item.canFinalize).length;
  const blockedCount = items.filter((item) => !item.canFinalize).length;
  const finalizedCount = items.filter((item) => isFinalized(item)).length;

  return (
    <>
      <TopBar
        title="Hồ sơ tập thể"
        subtitle="Danh sách hồ sơ tập thể, blocker xét duyệt và thao tác chốt kết quả."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng hồ sơ"
          value={pagination.total}
          icon={<UsersRound className="h-5 w-5" />}
        />
        <StatCard label="Có thể chốt" value={readyCount} tint="#22C55E" />
        <StatCard label="Đang bị chặn" value={blockedCount} tint="#F59E0B" />
        <StatCard label="Đã chốt" value={finalizedCount} tint="#0057C2" />
      </div>

      <Card>
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm lớp hoặc đại diện"
              className="h-10 w-full rounded-md border border-[#DDE5EF] bg-white pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </label>
          <select
            value={targetLevel}
            onChange={(event) => {
              setPage(1);
              setTargetLevel(event.target.value as Level | "all");
            }}
            className="h-10 rounded-md border border-[#DDE5EF] bg-white px-3 text-sm outline-none focus:border-brand"
          >
            <option value="all">Tất cả cấp</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {getLevelLabel(level)}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as CollectiveStatus | "all");
            }}
            className="h-10 rounded-md border border-[#DDE5EF] bg-white px-3 text-sm outline-none focus:border-brand"
          >
            <option value="all">Tất cả trạng thái</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {getApplicationStatusLabel(item)}
              </option>
            ))}
          </select>
        </div>

        {collectivesQuery.isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          </div>
        ) : collectivesQuery.isError ? (
          <div className="rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            Không thể tải danh sách hồ sơ tập thể.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-md bg-[#F6F9FC] p-8 text-center text-sm text-muted-foreground">
            Chưa có hồ sơ tập thể phù hợp bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-[#E5ECF3] text-left text-xs uppercase text-muted-foreground">
                  <th className="py-3 pr-4">Tập thể</th>
                  <th className="py-3 pr-4">Mục tiêu</th>
                  <th className="py-3 pr-4">Trạng thái</th>
                  <th className="py-3 pr-4">Tiến độ</th>
                  <th className="py-3 pr-4">Blocker</th>
                  <th className="py-3 pr-4">Kết quả</th>
                  <th className="py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const finalized = isFinalized(item);
                  const blockedReason =
                    item.blockingReasons?.join(" ") || "Hồ sơ chưa đủ điều kiện chốt.";
                  return (
                    <tr key={item.id} className="border-b border-[#EEF2F7] align-top">
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-brand-deep">{item.className}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.schoolYear} · {item.representative?.fullName ?? "Chưa rõ đại diện"}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{getLevelLabel(item.targetLevel)}</td>
                      <td className="py-3 pr-4">
                        <Chip tone={item.status === "completed" ? "success" : "warning"}>
                          {getApplicationStatusLabel(item.status)}
                        </Chip>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-brand-deep">
                          {Math.round(item.readinessScore ?? 0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item._count?.members ?? 0} thành viên · {item._count?.reviewTasks ?? 0}{" "}
                          task
                        </div>
                      </td>
                      <td className="max-w-[260px] py-3 pr-4">
                        {item.canFinalize ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Đủ điều kiện
                          </span>
                        ) : (
                          <div className="text-xs text-amber-700">{blockedReason}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Chip tone={finalStatusTone(item.finalStatus)}>
                          {getFinalStatusLabel(item.finalStatus)}
                        </Chip>
                        {item.finalLevel ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {getLevelLabel(item.finalLevel)}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          size="sm"
                          title={
                            finalized
                              ? "Xem biên bản kết quả tập thể đã chốt"
                              : !item.canFinalize
                                ? blockedReason
                                : "Xem summary trước khi chốt"
                          }
                          onClick={() => setSelected(item)}
                        >
                          Xem summary
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Trang {pagination.page}/{Math.max(1, pagination.totalPages)} · {pagination.total} hồ sơ
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>

      {selected ? (
        <CollectiveFinalizeDialog
          item={selected}
          canFinalizeRole={canFinalizeRole}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}

function CollectiveFinalizeDialog({
  canFinalizeRole,
  item,
  onClose,
}: {
  canFinalizeRole: boolean;
  item: ManagerCollectiveItem;
  onClose: () => void;
}) {
  const [finalStatus, setFinalStatus] = useState<Exclude<FinalStatus, "pending">>("passed");
  const [finalLevel, setFinalLevel] = useState<Level | "none">(item.targetLevel);
  const [finalNote, setFinalNote] = useState("");
  const finalizeMutation = useFinalizeManagerCollective();
  const levelRequired = finalStatus !== "failed" && finalLevel === "none";
  const noteRequired = finalNote.trim().length === 0;
  const blockedReason = item.blockingReasons?.join(" ") || "Hồ sơ chưa đủ điều kiện chốt.";
  const savedFinalLevel =
    finalStatus === "failed" ? null : finalLevel === "none" ? null : finalLevel;
  const savedResultText =
    finalStatus === "failed"
      ? "failed + không có cấp đạt"
      : `${finalStatus} + ${savedFinalLevel ? getLevelLabel(savedFinalLevel) : "--"}`;

  const submit = () => {
    if (!canFinalizeRole || !item.canFinalize || levelRequired || noteRequired) return;
    finalizeMutation.mutate(
      {
        collectiveId: item.id,
        payload: {
          finalStatus,
          finalLevel: finalStatus === "failed" ? null : (finalLevel as Level),
          finalNote: finalNote.trim(),
          notifyRepresentative: true,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chốt kết quả tập thể {item.className}</DialogTitle>
          <DialogDescription>
            Kết quả sau khi chốt sẽ hiển thị cho đại diện tập thể và được dùng khi xuất báo cáo.
          </DialogDescription>
        </DialogHeader>

        {!item.canFinalize ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {blockedReason}
          </div>
        ) : null}

        {!canFinalizeRole ? (
          <div className="rounded-md border bg-slate-50 p-3 text-sm text-muted-foreground">
            Tài khoản hiện tại chỉ xem summary tập thể, không có quyền chốt kết quả.
          </div>
        ) : null}

        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="mb-3 text-sm font-bold text-brand-deep">Tổng hợp trước khi chốt</div>
          <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
            <SummaryMetric label="Thành viên" value={`${item._count?.members ?? 0}`} />
            <SummaryMetric label="Minh chứng" value={`${item._count?.evidences ?? 0}`} />
            <SummaryMetric label="Task xét duyệt" value={`${item._count?.reviewTasks ?? 0}`} />
            <SummaryMetric label="Blocker" value={`${item.blockingReasons?.length ?? 0}`} />
            <SummaryMetric
              label="Tỷ lệ tham gia"
              value={formatPercent(item.memberSummary?.participationRate)}
            />
            <SummaryMetric
              label="SV5T cấp trường"
              value={formatPercent(item.memberSummary?.schoolSv5tRate)}
            />
            <SummaryMetric
              label="Đạt cấp cao hơn"
              value={`${item.memberSummary?.higherLevelAchieverCount ?? 0}`}
            />
            <SummaryMetric label="Readiness" value={`${item.readinessScore}%`} />
            <SummaryMetric
              label="Cấp đề xuất"
              value={getLevelLabel(item.finalLevel ?? item.targetLevel)}
            />
            <SummaryMetric label="Kết quả sẽ lưu" value={savedResultText} />
          </div>
          <div className="mt-3 rounded-md border bg-white p-3 text-sm">
            <div className="font-semibold text-brand-deep">Blocker chính</div>
            <div className="mt-1 text-muted-foreground">
              {item.blockingReasons?.length
                ? item.blockingReasons.join(" ")
                : "Không có blocker chính."}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-brand-deep">Kết quả cuối</span>
            <select
              value={finalStatus}
              onChange={(event) =>
                setFinalStatus(event.target.value as Exclude<FinalStatus, "pending">)
              }
              className="h-10 w-full rounded-md border border-[#DDE5EF] bg-white px-3 text-sm outline-none focus:border-brand"
            >
              <option value="passed">Đạt</option>
              <option value="partially_passed">Đạt cấp thấp hơn</option>
              <option value="failed">Chưa đạt</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-brand-deep">Cấp đạt</span>
            <select
              value={finalLevel}
              onChange={(event) => setFinalLevel(event.target.value as Level | "none")}
              disabled={finalStatus === "failed"}
              className="h-10 w-full rounded-md border border-[#DDE5EF] bg-white px-3 text-sm outline-none focus:border-brand disabled:bg-slate-100"
            >
              <option value="none">Không áp dụng</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {getLevelLabel(level)}
                </option>
              ))}
            </select>
            {levelRequired ? <span className="text-xs text-red-600">Cần chọn cấp đạt.</span> : null}
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-brand-deep">Ghi chú chốt</span>
            <Textarea
              value={finalNote}
              onChange={(event) => setFinalNote(event.target.value)}
              placeholder="Nhập căn cứ hoặc ghi chú kết quả"
            />
            {noteRequired ? (
              <span className="text-xs text-red-600">Ghi chú là bắt buộc.</span>
            ) : null}
          </label>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={submit}
            disabled={
              finalizeMutation.isPending ||
              !canFinalizeRole ||
              !item.canFinalize ||
              levelRequired ||
              noteRequired
            }
          >
            {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {finalStatus === "failed" ? "Chốt chưa đạt" : getFinalizeActionLabel(savedFinalLevel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-brand-deep">{value}</div>
    </div>
  );
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return `${Math.round(value > 1 ? value : value * 100)}%`;
}

function isFinalized(item: ManagerCollectiveItem): boolean {
  return item.finalStatus !== "pending" && Boolean(item.completedAt);
}
