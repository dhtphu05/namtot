import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileWarning,
  Inbox,
  Loader2,
  RotateCcw,
  Search,
  ShieldQuestion,
} from "lucide-react";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { useCommitteeInbox } from "@/features/manager/hooks/useManager";
import type {
  CommitteeInboxBucket,
  CommitteeInboxItem,
  CommitteeInboxSummary,
} from "@/features/manager/types";
import { getLevelLabel } from "@/lib/levels";

export const Route = createFileRoute("/app/committee/inbox")({
  validateSearch: (search) => ({
    bucket: typeof search.bucket === "string" ? normalizeBucket(search.bucket) : "all",
  }),
  component: CommitteeInboxRoute,
});

const bucketConfig: Array<{
  key: CommitteeInboxBucket;
  label: string;
  desc: string;
  icon: typeof Inbox;
  tone: "brand" | "success" | "warning" | "danger" | "muted";
}> = [
  {
    key: "all",
    label: "Tất cả việc cần xử lý",
    desc: "Ưu tiên cao hiển thị trước",
    icon: Inbox,
    tone: "brand",
  },
  {
    key: "ready_to_finalize",
    label: "Có thể chốt ngay",
    desc: "Đủ task, không còn case mở",
    icon: CheckCircle2,
    tone: "success",
  },
  {
    key: "needs_resolution",
    label: "Cần hội ý",
    desc: "Resolution đang mở",
    icon: ShieldQuestion,
    tone: "danger",
  },
  {
    key: "downgraded",
    label: "Bị hạ cấp",
    desc: "Target cao hơn đề xuất",
    icon: AlertTriangle,
    tone: "warning",
  },
  {
    key: "no_eligible_level",
    label: "Không đạt cấp nào",
    desc: "Suggested level rỗng",
    icon: FileWarning,
    tone: "danger",
  },
  {
    key: "supplement_required",
    label: "Cần bổ sung",
    desc: "Sinh viên/cán bộ cần bổ sung",
    icon: RotateCcw,
    tone: "warning",
  },
  {
    key: "overdue",
    label: "Quá hạn",
    desc: "Task/case lâu chưa xử lý",
    icon: Clock3,
    tone: "danger",
  },
  {
    key: "recently_finalized",
    label: "Đã chốt gần đây",
    desc: "Theo dõi sau chốt",
    icon: CheckCircle2,
    tone: "muted",
  },
];

function CommitteeInboxRoute() {
  const searchState = Route.useSearch();
  const [search, setSearch] = useState("");
  const activeBucket = searchState.bucket ?? "all";
  const inboxQuery = useCommitteeInbox({
    bucket: activeBucket,
    search: search.trim() || undefined,
    page: 1,
    limit: 50,
  });
  const summary = inboxQuery.data?.summary;
  const items = inboxQuery.data?.items ?? [];

  const cards = useMemo(
    () =>
      bucketConfig.map((bucket) => ({
        ...bucket,
        count:
          bucket.key === "all" ? totalActionable(summary) : getBucketCount(summary, bucket.key),
      })),
    [summary],
  );

  return (
    <>
      <TopBar
        title="Hàng chờ chốt kết quả"
        subtitle="Các hồ sơ/case của Hội đồng/Cấp quản lý, sắp theo việc cần làm tiếp theo."
        action={
          <Button asChild variant="outline">
            <Link to="/app/manager/results">Mở danh sách kết quả</Link>
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((bucket) => {
          const Icon = bucket.icon;
          const active = activeBucket === bucket.key;
          return (
            <Link
              key={bucket.key}
              to="/app/committee/inbox"
              search={{ bucket: bucket.key }}
              className={`rounded-lg border bg-white p-4 transition hover:border-[#0057C2] hover:shadow-sm ${
                active ? "border-[#0057C2] ring-2 ring-[#0057C2]/10" : "border-[#DCE7F2]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`rounded-md p-2 ${bucketIconClass(bucket.tone)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-2xl font-bold text-brand-deep">{bucket.count}</span>
              </div>
              <div className="mt-3 text-sm font-bold text-brand-deep">{bucket.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{bucket.desc}</div>
            </Link>
          );
        })}
      </div>

      <Card className="mb-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold text-brand-deep">Việc cần xử lý hôm nay</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Mỗi dòng có lý do, blocker và hành động kế tiếp để không phải tự đọc toàn bộ hồ sơ.
            </div>
          </div>
          <div className="relative w-full md:w-80">
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

      {inboxQuery.isLoading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải hàng chờ chốt kết quả...
          </div>
        </Card>
      ) : inboxQuery.isError ? (
        <Card>
          <div className="py-10 text-center">
            <div className="font-semibold text-rose-600">Không thể tải hàng chờ chốt kết quả.</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Tài khoản này có thể không có quyền hoặc backend chưa sẵn sàng.
            </div>
            <Button className="mt-4" variant="outline" onClick={() => void inboxQuery.refetch()}>
              Thử lại
            </Button>
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="font-semibold text-brand-deep">Không có việc cần xử lý lúc này.</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Bạn có thể xem danh sách đã chốt hoặc theo dõi thống kê mùa xét.
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <Button asChild variant="outline">
                <Link to="/app/manager/results" search={{ filter: "recently_finalized" }}>
                  Xem đã chốt gần đây
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/app/analytics">Mở thống kê</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}

function InboxItemCard({ item }: { item: CommitteeInboxItem }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={priorityTone(item.priority)}>{priorityLabel(item.priority)}</Chip>
            <Chip tone="brand">{bucketLabel(item.type)}</Chip>
            {item.dueAt ? <Chip tone="error">Quá hạn {formatDate(item.dueAt)}</Chip> : null}
          </div>
          <div className="mt-3 text-base font-bold text-brand-deep">
            {item.studentName ?? "Chưa rõ sinh viên"}
            <span className="ml-2 text-sm font-semibold text-muted-foreground">
              {item.studentCode ?? "--"}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {item.className ?? "--"} · {item.faculty ?? "--"} · Đăng ký{" "}
            {item.targetLevel ? getLevelLabel(item.targetLevel) : "--"} · Đề xuất{" "}
            {item.suggestedLevel ? getLevelLabel(item.suggestedLevel) : "Không đạt cấp nào"}
          </div>
          <div className="mt-3 text-sm font-semibold text-brand-deep">{item.mainReason}</div>
          {item.blockers.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {item.blockers.slice(0, 3).map((blocker) => (
                <span
                  key={blocker}
                  className="rounded-md bg-[#F6F9FC] px-2 py-1 text-xs text-muted-foreground"
                >
                  {blocker}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
          {item.nextAction === "open_resolution_case" && item.resolutionCaseId ? (
            <Button asChild>
              <Link to="/app/resolution/$id" params={{ id: item.resolutionCaseId }}>
                Mở Resolution Case <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild>
              <Link
                to="/app/manager/results/$applicationId"
                params={{ applicationId: item.applicationId }}
                search={{ focus: item.type, resolutionCaseId: item.resolutionCaseId ?? undefined }}
              >
                {nextActionLabel(item)} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <Link
              to="/app/manager/results/$applicationId"
              params={{ applicationId: item.applicationId }}
            >
              Xem hồ sơ
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function normalizeBucket(value: string): CommitteeInboxBucket {
  return bucketConfig.some((bucket) => bucket.key === value)
    ? (value as CommitteeInboxBucket)
    : "all";
}

function getBucketCount(summary: CommitteeInboxSummary | undefined, bucket: CommitteeInboxBucket) {
  if (!summary) return 0;
  if (bucket === "ready_to_finalize") return summary.readyToFinalize;
  if (bucket === "downgraded") return summary.downgraded;
  if (bucket === "no_eligible_level") return summary.noEligibleLevel;
  if (bucket === "needs_resolution") return summary.needsResolution;
  if (bucket === "supplement_required") return summary.supplementRequired;
  if (bucket === "overdue") return summary.overdue;
  if (bucket === "recently_finalized") return summary.recentlyFinalized;
  return totalActionable(summary);
}

function totalActionable(summary: CommitteeInboxSummary | undefined) {
  if (!summary) return 0;
  return (
    summary.readyToFinalize +
    summary.downgraded +
    summary.noEligibleLevel +
    summary.needsResolution +
    summary.supplementRequired +
    summary.overdue +
    summary.recentlyFinalized
  );
}

function bucketLabel(type: CommitteeInboxItem["type"]) {
  return bucketConfig.find((bucket) => bucket.key === type)?.label ?? "Việc cần xử lý";
}

function nextActionLabel(item: CommitteeInboxItem) {
  if (item.nextAction === "review_downgrade_reason") return "Xem lý do hạ cấp";
  if (item.nextAction === "finalize_failed") return "Chốt chưa đạt";
  if (item.nextAction === "finalize_city") return "Chốt đạt cấp Thành phố";
  if (item.nextAction === "finalize_university") return "Chốt đạt cấp ĐHĐN";
  if (item.nextAction === "finalize_school") return "Chốt đạt cấp Trường";
  if (item.nextAction === "wait_for_supplement") return "Theo dõi bổ sung";
  if (item.nextAction === "send_reminder") return "Mở hồ sơ quá hạn";
  if (item.nextAction === "reopen_final_result") return "Xem lại kết quả";
  return "Mở Decision Console";
}

function priorityTone(priority: CommitteeInboxItem["priority"]) {
  if (priority === "high") return "error";
  if (priority === "medium") return "warning";
  return "muted";
}

function priorityLabel(priority: CommitteeInboxItem["priority"]) {
  if (priority === "high") return "Ưu tiên cao";
  if (priority === "medium") return "Cần xử lý";
  return "Theo dõi";
}

function bucketIconClass(tone: "brand" | "success" | "warning" | "danger" | "muted") {
  if (tone === "success") return "bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "bg-amber-50 text-amber-700";
  if (tone === "danger") return "bg-rose-50 text-rose-700";
  if (tone === "muted") return "bg-slate-100 text-slate-700";
  return "bg-sky-50 text-sky-700";
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
