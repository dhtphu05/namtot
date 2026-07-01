import { Link } from "@tanstack/react-router";
import { TopBar } from "@/components/layout/TopBar";
import { Card, Chip } from "@/components/ui-kit";
import { AlertTriangle, ChevronRight, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useResolutionCases } from "../hooks/useResolution";
import type { ResolutionCaseListItem } from "../api/resolution";

const STATUS_LABEL: Record<string, { label: string; tone: "brand" | "success" | "warning" | "error" | "muted" }> = {
  open: { label: "Đang mở", tone: "warning" },
  in_review: { label: "Hội đồng đang xét", tone: "brand" },
  resolved: { label: "Đã xử lý", tone: "success" },
  rejected: { label: "Từ chối", tone: "error" },
};

const CRITERION_LABEL: Record<string, string> = {
  ethics: "Đạo đức",
  academic: "Học tập",
  physical: "Thể lực",
  volunteer: "Tình nguyện",
  integration: "Hội nhập",
  priority: "Ưu tiên",
  collective: "Tập thể",
};

export function ResolutionHub() {
  const [status, setStatus] = useState("all");
  const [criterion, setCriterion] = useState("all");
  const [search, setSearch] = useState("");
  const filters = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      criterion: criterion === "all" ? undefined : criterion,
      q: search.trim() || undefined,
      page: 1,
      limit: 50,
    }),
    [criterion, search, status],
  );
  const { data, isLoading, isError, error } = useResolutionCases(filters);
  const cases = data?.items ?? [];

  return (
    <>
      <TopBar title="Resolution Hub" subtitle="Hồ sơ mập mờ cần hội đồng quyết định" />
      <Card className="mb-4 !p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg bg-[#F6F9FC] px-3 py-1.5 text-[12px] font-semibold text-brand-deep"
          >
            <option value="all">Mọi trạng thái</option>
            {Object.entries(STATUS_LABEL).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={criterion}
            onChange={(event) => setCriterion(event.target.value)}
            className="rounded-lg bg-[#F6F9FC] px-3 py-1.5 text-[12px] font-semibold text-brand-deep"
          >
            <option value="all">Mọi tiêu chí</option>
            {Object.entries(CRITERION_LABEL).map(([key, item]) => (
              <option key={key} value={key}>
                {item}
              </option>
            ))}
          </select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sinh viên, MSSV, lý do..."
              className="w-full rounded-lg bg-[#F6F9FC] py-1.5 pl-8 pr-3 text-[12px] font-semibold text-brand-deep"
            />
          </div>
        </div>
      </Card>

      <Card>
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải resolution cases...
          </div>
        )}
        {isError && <div className="py-12 text-center font-semibold text-rose-600">{(error as Error)?.message || "Không thể tải resolution cases."}</div>}
        {!isLoading && !isError && (
          <div className="space-y-2">
            {cases.map((item) => (
              <ResolutionRow key={item.id} item={item} />
            ))}
            {cases.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Chưa có case phù hợp.</div>}
          </div>
        )}
      </Card>
    </>
  );
}

function ResolutionRow({ item }: { item: ResolutionCaseListItem }) {
  const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.open;
  return (
    <Link to="/app/resolution/$id" params={{ id: item.id }} className="block">
      <div className="flex items-center gap-4 rounded-lg p-4 transition-all hover:bg-[#F6F9FC]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-brand-deep">{item.student.fullName}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {item.student.studentCode ?? "Chưa có MSSV"} - {item.evidence?.evidenceName ?? "Không có evidence"} - {item.reason}
          </div>
        </div>
        {item.evidence && <Chip>{CRITERION_LABEL[item.evidence.criterion] ?? item.evidence.criterion}</Chip>}
        <Chip tone={status.tone}>{status.label}</Chip>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
