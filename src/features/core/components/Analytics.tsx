import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip, StatCard } from "@/components/ui-kit";
import { Activity, CheckCircle2, Loader2, Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useApplicationAggregation, useFinalizeApplication, useManagerApplications } from "@/features/review/hooks/useManager";
import type { ApplicationStatus, Level } from "@/lib/api/types";

const STATUS_LABEL: Record<string, string> = {
  submitted: "Đã nộp",
  under_review: "Đang xét",
  supplement_required: "Cần bổ sung",
  resolution_needed: "Cần hội đồng",
  completed: "Hoàn tất",
  rejected: "Không đạt",
};

const LEVEL_LABEL: Record<string, string> = {
  school: "Cấp trường",
  university: "Cấp ĐH Đà Nẵng",
  city: "Cấp thành phố",
  central: "Cấp Trung ương",
};

export function Analytics() {
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      q: search.trim() || undefined,
      page: 1,
      limit: 30,
    }),
    [search, status],
  );
  const applications = useManagerApplications(filters);
  const selected = selectedId ?? applications.data?.items[0]?.id;
  const aggregation = useApplicationAggregation(selected);
  const finalize = useFinalizeApplication();
  const items = applications.data?.items ?? [];

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((item) => item.status === "completed").length;
    const blocked = items.filter((item) => item.status === "supplement_required" || item.status === "resolution_needed").length;
    return { total, completed, blocked };
  }, [items]);

  const finalizeSelected = () => {
    const data = aggregation.data;
    if (!selected || !data || !data.suggestedFinalStatus || data.suggestedFinalStatus === "pending") return;
    finalize.mutate({
      applicationId: selected,
      payload: {
        finalStatus: data.suggestedFinalStatus as "passed" | "failed" | "partially_passed",
        finalLevel: data.suggestedFinalLevel as Level | null,
        finalNote: "Chốt theo kết quả aggregation từ hệ thống.",
        overrideAggregation: false,
        notifyStudent: true,
      },
    });
  };

  return (
    <>
      <TopBar title="Dashboard quản lý hồ sơ" subtitle="Theo dõi application, aggregation và chốt kết quả từ backend" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hồ sơ trong bộ lọc" value={stats.total} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Đã hoàn tất" value={stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} tint="#22C55E" />
        <StatCard label="Đang vướng" value={stats.blocked} icon={<Activity className="h-5 w-5" />} tint="#F59E0B" />
        <StatCard label="Page size" value={applications.data?.pagination?.limit ?? 30} icon={<ShieldCheck className="h-5 w-5" />} tint="#0057C2" />
      </div>

      <Card className="mb-4 !p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ApplicationStatus | "all")}
            className="rounded-lg bg-[#F6F9FC] px-3 py-1.5 text-[12px] font-semibold text-brand-deep"
          >
            <option value="all">Mọi trạng thái</option>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sinh viên hoặc MSSV..."
              className="w-full rounded-lg bg-[#F6F9FC] py-1.5 pl-8 pr-3 text-[12px] font-semibold text-brand-deep"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <h3 className="mb-3 font-bold text-brand-deep">Danh sách hồ sơ</h3>
          {applications.isLoading && <Loading label="Đang tải hồ sơ..." />}
          {applications.isError && <Error label={(applications.error as Error)?.message || "Không thể tải hồ sơ."} />}
          {!applications.isLoading && !applications.isError && (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selected === item.id ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#EEF2F7] hover:bg-[#F6F9FC]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-brand-deep">{item.student.fullName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.student.studentCode ?? "Chưa có MSSV"} - {item.student.className ?? item.student.faculty ?? "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip>{LEVEL_LABEL[item.targetLevel] ?? item.targetLevel}</Chip>
                      <Chip tone={item.status === "completed" ? "success" : item.status === "rejected" ? "error" : "brand"}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Chip>
                    </div>
                  </div>
                </button>
              ))}
              {items.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">Không có hồ sơ phù hợp.</div>}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-5" glow>
          <h3 className="mb-3 font-bold text-brand-deep">Aggregation</h3>
          {aggregation.isLoading && <Loading label="Đang tổng hợp hồ sơ..." />}
          {aggregation.isError && <Error label={(aggregation.error as Error)?.message || "Không thể tải aggregation."} />}
          {!aggregation.isLoading && !aggregation.isError && aggregation.data && (
            <div className="space-y-3 text-sm">
              <Info label="Sinh viên" value={aggregation.data.student.fullName} />
              <Info label="Readiness" value={`${aggregation.data.application.readinessScore}`} />
              <Info label="Gợi ý trạng thái" value={aggregation.data.suggestedFinalStatus} />
              <Info label="Gợi ý cấp đạt" value={aggregation.data.suggestedFinalLevel ? LEVEL_LABEL[aggregation.data.suggestedFinalLevel] ?? aggregation.data.suggestedFinalLevel : "-"} />
              <Info label="Resolution mở" value={`${aggregation.data.resolutionSummary.open}`} />
              <div className="rounded-lg bg-[#F6F9FC] p-3">
                <div className="mb-2 font-semibold text-brand-deep">Lý do chưa chốt</div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {aggregation.data.blockingReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                  {aggregation.data.blockingReasons.length === 0 && <li>Không có blocking reason.</li>}
                </ul>
              </div>
              <Button
                className="w-full"
                onClick={finalizeSelected}
                disabled={!aggregation.data.canFinalize || aggregation.data.suggestedFinalStatus === "pending" || finalize.isPending}
              >
                {finalize.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Chốt theo gợi ý
              </Button>
            </div>
          )}
          {!aggregation.isLoading && !aggregation.isError && !aggregation.data && (
            <div className="py-10 text-center text-sm text-muted-foreground">Chọn một hồ sơ để xem aggregation.</div>
          )}
        </Card>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[#EEF9FF] py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-brand-deep">{value}</span>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function Error({ label }: { label: string }) {
  return <div className="py-10 text-center text-sm font-semibold text-rose-600">{label}</div>;
}
