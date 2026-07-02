import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useFinalizeManagerApplication,
  useManagerDashboardSummary,
  useManagerResults,
} from "@/features/manager/hooks/useManager";
import type { ManagerResultFilters, ManagerResultItem } from "@/features/manager/types";
import type { Level, Role } from "@/features/review/types";
import type { FinalStatus } from "@/lib/api/types";

export const Route = createFileRoute("/app/manager/results")({
  component: ManagerResultsRoute,
});

const levels: Level[] = ["school", "university", "city", "central"];
const allowedRoles: Role[] = ["manager", "committee", "admin"];
const finalizerRoles: Role[] = ["committee", "admin"];

const levelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp ĐHĐN",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const finalStatusLabel: Record<FinalStatus, string> = {
  pending: "Chưa chốt",
  passed: "Đạt",
  partially_passed: "Đạt cấp thấp hơn",
  failed: "Chưa đạt",
};

const applicationStatusLabel: Record<string, string> = {
  draft: "Bản nháp",
  submitted: "Đã nộp",
  under_review: "Đang xét duyệt",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội đồng xử lý",
  completed: "Hoàn tất",
  rejected: "Chưa đạt",
};

type ActiveFilter = "all" | Level | "failed" | "pending";

function ManagerResultsRoute() {
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <>
        <TopBar
          title="Kết quả xét duyệt theo cấp"
          subtitle="Phân loại sinh viên đạt/chưa đạt theo kết quả cuối cùng."
        />
        <Card>
          <div className="py-8 text-center">
            <div className="text-base font-semibold text-brand-deep">
              Bạn không có quyền truy cập màn kết quả theo cấp.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Chức năng này dành cho quản lý, hội đồng và quản trị viên.
            </div>
          </div>
        </Card>
      </>
    );
  }

  return <ManagerResultsContent role={role} />;
}

function ManagerResultsContent({ role }: { role: Role }) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ManagerResultItem | null>(null);
  const canFinalize = finalizerRoles.includes(role);
  const summaryQuery = useManagerDashboardSummary();
  const filters = useMemo<ManagerResultFilters>(() => {
    const next: ManagerResultFilters = {
      page: 1,
      pageSize: 50,
      search: search.trim() || undefined,
    };
    if (levels.includes(activeFilter as Level)) {
      next.finalLevel = activeFilter as Level;
    }
    if (activeFilter === "failed") {
      next.finalStatus = "failed";
    }
    if (activeFilter === "pending") {
      next.finalStatus = "pending";
    }
    return next;
  }, [activeFilter, search]);
  const resultsQuery = useManagerResults(filters);
  const summary = summaryQuery.data;
  const breakdown = summary?.finalLevelBreakdown;
  const total = summary?.applicationOverview?.totalApplications ?? summary?.totalApplications ?? 0;
  const items = resultsQuery.data?.items ?? [];

  return (
    <>
      <TopBar
        title="Kết quả xét duyệt theo cấp"
        subtitle="Phân loại sinh viên đạt/chưa đạt theo kết quả cuối cùng."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard icon={<FileSearch className="h-5 w-5" />} label="Tổng hồ sơ" value={total} />
        {levels.map((level) => (
          <StatCard
            key={level}
            icon={<ShieldCheck className="h-5 w-5" />}
            label={`Đạt ${levelLabel[level]}`}
            value={breakdown?.[level] ?? 0}
            tint={level === "central" ? "#0057C2" : level === "city" ? "#7C3AED" : "#16A34A"}
          />
        ))}
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Chưa đạt"
          value={breakdown?.notAchieved ?? 0}
          tint="#DC2626"
        />
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5" />}
          label="Chưa chốt"
          value={breakdown?.unfinalized ?? 0}
          tint="#F59E0B"
        />
      </div>

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["all", "Tất cả"],
            ["school", "Cấp Trường"],
            ["university", "Cấp ĐHĐN"],
            ["city", "Cấp Thành phố"],
            ["central", "Cấp Trung ương"],
            ["failed", "Chưa đạt"],
            ["pending", "Chưa chốt"],
          ].map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant={activeFilter === value ? "primary" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(value as ActiveFilter)}
            >
              {label}
            </Button>
          ))}
          <div className="relative ml-auto min-w-[240px] flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sinh viên, MSSV, lớp, khoa..."
              className="w-full rounded-lg border border-[#DCE7F2] bg-white py-2 pl-8 pr-3 text-[13px] font-medium text-brand-deep outline-none focus:ring-2 focus:ring-[#0057C2]/20"
            />
          </div>
        </div>
      </Card>

      {resultsQuery.isLoading || summaryQuery.isLoading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải kết quả xét duyệt...
          </div>
        </Card>
      ) : resultsQuery.isError || summaryQuery.isError ? (
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">Không thể tải dữ liệu kết quả.</div>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                void resultsQuery.refetch();
                void summaryQuery.refetch();
              }}
            >
              Thử lại
            </Button>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-sm text-muted-foreground">
            Chưa có hồ sơ phù hợp với bộ lọc hiện tại.
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b bg-[#F6F9FC] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Sinh viên</th>
                  <th className="px-4 py-3">MSSV</th>
                  <th className="px-4 py-3">Lớp</th>
                  <th className="px-4 py-3">Khoa</th>
                  <th className="px-4 py-3">Cấp đăng ký</th>
                  <th className="px-4 py-3">AI/Cascade gợi ý</th>
                  <th className="px-4 py-3">Kết quả cuối</th>
                  <th className="px-4 py-3">Cấp đạt</th>
                  <th className="px-4 py-3">Trạng thái hồ sơ</th>
                  <th className="px-4 py-3">Tiến độ task</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const finalized = item.finalStatus !== "pending" && Boolean(item.finalizedAt);
                  return (
                    <tr key={item.applicationId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-semibold text-brand-deep">{item.studentName}</td>
                      <td className="px-4 py-3">{item.studentCode ?? "--"}</td>
                      <td className="px-4 py-3">{item.className ?? "--"}</td>
                      <td className="px-4 py-3">{item.faculty ?? "--"}</td>
                      <td className="px-4 py-3">{levelLabel[item.targetLevel]}</td>
                      <td className="px-4 py-3">
                        {item.suggestedLevel ? levelLabel[item.suggestedLevel] : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <FinalStatusChip status={item.finalStatus} />
                      </td>
                      <td className="px-4 py-3">
                        {item.finalLevel ? levelLabel[item.finalLevel] : "--"}
                      </td>
                      <td className="px-4 py-3">
                        {applicationStatusLabel[item.applicationStatus] ?? item.applicationStatus}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone="brand">
                          {item.reviewTaskSummary.accepted}/{item.reviewTaskSummary.total} đạt
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link to="/app/analytics">
                            <Button size="sm" variant="ghost">Xem chi tiết</Button>
                          </Link>
                          <Button
                            size="sm"
                            disabled={!canFinalize || finalized}
                            title={
                              canFinalize
                                ? finalized
                                  ? "Hồ sơ đã có kết quả cuối."
                                  : "Chốt kết quả hồ sơ"
                                : "Chỉ Hội đồng/Admin được chốt kết quả."
                            }
                            onClick={() => setSelected(item)}
                          >
                            Chốt kết quả
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <FinalizationDialog
        item={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}

function FinalStatusChip({ status }: { status: FinalStatus }) {
  const tone =
    status === "passed" ? "success" : status === "failed" ? "error" : status === "pending" ? "warning" : "brand";
  return <Chip tone={tone}>{finalStatusLabel[status]}</Chip>;
}

type DecisionMode = "target" | "lower" | "failed";

function FinalizationDialog({
  item,
  onOpenChange,
  open,
}: {
  item: ManagerResultItem | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const finalizeMutation = useFinalizeManagerApplication();
  const [mode, setMode] = useState<DecisionMode>("target");
  const [finalLevel, setFinalLevel] = useState<Level>("school");
  const [note, setNote] = useState("");

  const lowerLevels = useMemo(() => {
    if (!item) return [];
    const index = levels.indexOf(item.targetLevel);
    return levels.slice(0, index);
  }, [item]);

  useEffect(() => {
    setMode("target");
    setFinalLevel(lowerLevels[0] ?? "school");
    setNote("");
  }, [item?.applicationId, lowerLevels]);

  if (!item) return null;

  const resolvedLevel =
    mode === "target" ? item.targetLevel : mode === "lower" ? finalLevel : null;
  const resolvedStatus =
    mode === "target" ? "passed" : mode === "lower" ? "partially_passed" : "failed";
  const noteRequired = !note.trim();
  const lowerLevelMissing =
    mode === "lower" && (!resolvedLevel || !lowerLevels.includes(resolvedLevel));

  const submit = () => {
    if (noteRequired || lowerLevelMissing) return;
    finalizeMutation.mutate(
      {
        applicationId: item.applicationId,
        payload: {
          finalStatus: resolvedStatus,
          finalLevel: resolvedLevel,
          finalNote: note.trim(),
          notifyStudent: true,
          overrideAggregation: false,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chốt kết quả hồ sơ</DialogTitle>
          <DialogDescription>
            Quyết định này sẽ được lưu audit và thông báo cho sinh viên.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="text-sm font-bold text-brand-deep">{item.studentName}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.studentCode ?? "--"} • {item.className ?? "--"} • {item.faculty ?? "--"}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Info label="Cấp đăng ký" value={levelLabel[item.targetLevel]} />
              <Info label="Gợi ý" value={item.suggestedLevel ? levelLabel[item.suggestedLevel] : "--"} />
              <Info label="Readiness" value={`${item.readinessScore}`} />
              <Info label="Trạng thái" value={applicationStatusLabel[item.applicationStatus] ?? item.applicationStatus} />
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm font-bold text-brand-deep">Tổng hợp xét duyệt</div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Info label="Tổng task" value={`${item.reviewTaskSummary.total}`} />
              <Info label="Đạt" value={`${item.reviewTaskSummary.accepted}`} />
              <Info label="Không đạt" value={`${item.reviewTaskSummary.rejected}`} />
              <Info label="Bổ sung" value={`${item.reviewTaskSummary.supplementRequired}`} />
              <Info label="Hội ý" value={`${item.reviewTaskSummary.resolutionNeeded}`} />
              <Info label="Chờ" value={`${item.reviewTaskSummary.waiting}`} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="mb-3 text-sm font-bold text-brand-deep">Quyết định cuối</div>
          <RadioGroup value={mode} onValueChange={(value) => setMode(value as DecisionMode)}>
            <DecisionOption id="target" label="Đạt cấp đăng ký" />
            <DecisionOption id="lower" label="Không đạt cấp đăng ký nhưng đạt cấp thấp hơn" />
            <DecisionOption id="failed" label="Chưa đạt" />
          </RadioGroup>

          {mode === "lower" ? (
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-semibold text-brand-deep">Cấp đạt</span>
              <select
                value={finalLevel}
                onChange={(event) => setFinalLevel(event.target.value as Level)}
                className="w-full rounded-lg border border-[#DCE7F2] px-3 py-2"
              >
                {lowerLevels.length === 0 ? (
                  <option value="">Không có cấp thấp hơn</option>
                ) : (
                  lowerLevels.map((level) => (
                    <option key={level} value={level}>
                      {levelLabel[level]}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : null}

          <label className="mt-4 block text-sm">
            <span className="mb-1 block font-semibold text-brand-deep">Ghi chú kết quả</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Nhập căn cứ và ghi chú chốt kết quả..."
              className="min-h-24 w-full rounded-lg border border-[#DCE7F2] px-3 py-2 outline-none focus:ring-2 focus:ring-[#0057C2]/20"
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={submit}
            disabled={finalizeMutation.isPending || noteRequired || lowerLevelMissing}
          >
            {finalizeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Chốt kết quả
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionOption({ id, label }: { id: DecisionMode; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <RadioGroupItem value={id} id={id} />
      <span className="font-medium text-brand-deep">{label}</span>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-brand-deep">{value}</div>
    </div>
  );
}
