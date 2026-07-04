import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { EmptyReviewState } from "@/features/review/components/EmptyReviewState";

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
      <TopBar
        title="Hồ sơ hội ý"
        subtitle="Danh sách hồ sơ cần hội ý được tải trực tiếp từ backend."
      />
      <Card>
        <EmptyReviewState
          title="Resolution Hub legacy không còn dùng dữ liệu mẫu"
          description="Vui lòng mở trang hồ sơ hội ý chính để xem các trường hợp cần xử lý."
        />
        <div className="mt-4 flex justify-center">
          <Button asChild>
            <Link to="/app/resolution">
              Mở hồ sơ hội ý
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
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
          <div className="font-bold text-brand-deep">{item.student?.fullName ?? "Chưa có dữ liệu"}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {item.student?.studentCode ?? "Chưa có MSSV"} - {item.evidence?.evidenceName ?? "Không có evidence"} - {item.reason}
          </div>
        </div>
        {item.evidence && <Chip>{CRITERION_LABEL[item.evidence.criterion] ?? item.evidence.criterion}</Chip>}
        <Chip tone={status.tone}>{status.label}</Chip>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}
