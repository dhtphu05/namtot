import { TopBar } from "@/components/layout/TopBar";
import { Button, Card, Chip } from "@/components/ui-kit";
import { BookOpenCheck, Loader2, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useKnowledgeBaseSearch, useUseKnowledgeBaseItem } from "../hooks/useKnowledgeBase";
import type { KnowledgeBaseItem } from "../api/knowledge-base";

const CRITERION_LABEL: Record<string, string> = {
  ethics: "Đạo đức",
  academic: "Học tập",
  physical: "Thể lực",
  volunteer: "Tình nguyện",
  integration: "Hội nhập",
  priority: "Ưu tiên",
  collective: "Tập thể",
};

const LEVEL_LABEL: Record<string, string> = {
  school: "Cấp trường",
  university: "Cấp ĐH Đà Nẵng",
  city: "Cấp thành phố",
  central: "Cấp Trung ương",
};

const DECISION_LABEL: Record<
  string,
  { label: string; tone: "brand" | "success" | "warning" | "error" | "muted" }
> = {
  accepted: { label: "Đã duyệt", tone: "success" },
  rejected: { label: "Từ chối", tone: "error" },
  needs_supplement: { label: "Cần bổ sung", tone: "warning" },
  reference_only: { label: "Tham chiếu", tone: "muted" },
};

export function EvidenceSearch() {
  const [q, setQ] = useState("");
  const [criterion, setCriterion] = useState("all");
  const [decision, setDecision] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const useItem = useUseKnowledgeBaseItem();
  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      criterion: criterion === "all" ? undefined : criterion,
      decision: decision === "all" ? undefined : decision,
      page: 1,
      limit: 50,
    }),
    [criterion, decision, q],
  );
  const { data, isLoading, isError, error } = useKnowledgeBaseSearch(filters);
  const items = data?.items ?? [];
  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null;

  return (
    <>
      <TopBar
        title="Kho tri thức minh chứng"
        subtitle="Tra cứu case đã duyệt / từ chối từ Knowledge Base backend"
        action={
          <Button variant="secondary" disabled>
            <BookOpenCheck className="h-4 w-4" />
            Tạo case từ màn xét duyệt
          </Button>
        }
      />

      <Card className="mb-4 !p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-[min(100%,260px)] flex-1 items-center gap-2 rounded-lg bg-[#F6F9FC] px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Tìm tên minh chứng, sự kiện, lý do..."
              className="min-w-0 flex-1 bg-transparent text-[13px] focus:outline-none"
            />
          </div>
          <select
            value={criterion}
            onChange={(event) => setCriterion(event.target.value)}
            className="rounded-lg bg-[#F6F9FC] px-3 py-2 text-[12.5px] font-semibold text-brand-deep"
          >
            <option value="all">Tất cả tiêu chí</option>
            {Object.entries(CRITERION_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
            className="rounded-lg bg-[#F6F9FC] px-3 py-2 text-[12.5px] font-semibold text-brand-deep"
          >
            <option value="all">Mọi quyết định</option>
            {Object.entries(DECISION_LABEL).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <Card className="!p-2">
            {isLoading && <Loading label="Đang tải Knowledge Base..." />}
            {isError && (
              <Error label={(error as Error)?.message || "Không thể tải Knowledge Base."} />
            )}
            {!isLoading && !isError && (
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveId(item.id)}
                      className={`w-full rounded-lg p-2.5 text-left ${active?.id === item.id ? "bg-[#F1F7FD]" : "hover:bg-[#F6F9FC]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 truncate text-[13px] font-semibold text-brand-deep">
                          {item.evidenceName ?? item.eventName ?? "Case chưa đặt tên"}
                        </div>
                        <DecisionChip decision={item.decision} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {CRITERION_LABEL[item.criterion] ?? item.criterion} - {item.usageCount} lần
                        dùng
                      </div>
                    </button>
                  </li>
                ))}
                {items.length === 0 && (
                  <li className="py-10 text-center text-sm text-muted-foreground">
                    Chưa có case phù hợp.
                  </li>
                )}
              </ul>
            )}
          </Card>
        </aside>

        <section className="space-y-3 lg:col-span-5">
          {active ? (
            <KnowledgeDetail item={active} />
          ) : (
            <Card>
              <div className="py-12 text-center text-sm text-muted-foreground">
                Chọn một case để xem chi tiết.
              </div>
            </Card>
          )}
        </section>

        <aside className="space-y-3 lg:col-span-3">
          {active && (
            <>
              <Card>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Trường bắt buộc
                </div>
                <List values={active.requiredFieldsJson} empty="Chưa khai báo trường bắt buộc." />
              </Card>
              <Card>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lỗi thường gặp
                </div>
                <List
                  values={active.commonErrorsJson}
                  empty="Chưa khai báo lỗi thường gặp."
                  tone="warning"
                />
              </Card>
              <Card>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Đã dùng
                </div>
                <div className="text-[24px] font-bold text-brand-deep">{active.usageCount} lần</div>
                <Button
                  className="mt-2 w-full"
                  onClick={() => useItem.mutate(active.id)}
                  disabled={useItem.isPending}
                >
                  {useItem.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <BookOpenCheck className="h-4 w-4" />
                  )}
                  Dùng làm tham chiếu
                </Button>
              </Card>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function KnowledgeDetail({ item }: { item: KnowledgeBaseItem }) {
  return (
    <>
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Case tham chiếu
            </div>
            <h3 className="text-[17px] font-bold text-brand-deep">
              {item.evidenceName ?? item.eventName ?? "Case chưa đặt tên"}
            </h3>
            <div className="text-[12px] text-muted-foreground">
              {CRITERION_LABEL[item.criterion] ?? item.criterion}
              {item.level ? ` - ${LEVEL_LABEL[item.level] ?? item.level}` : ""}
            </div>
          </div>
          <DecisionChip decision={item.decision} />
        </div>
        <div className="rounded-xl bg-[#F6F9FC] p-5 text-sm text-muted-foreground">
          Không hiển thị ảnh mẫu ở màn này vì Knowledge Base API không expose file preview. Dữ liệu
          dùng để tham chiếu nằm trong lý do, field bắt buộc và lỗi thường gặp.
        </div>
      </Card>
      <Card>
        <h4 className="mb-2 text-[14px] font-bold text-brand-deep">Lý do quyết định</h4>
        <p className="text-[12.5px]">{item.reason}</p>
      </Card>
    </>
  );
}

function DecisionChip({ decision }: { decision: string }) {
  const item = DECISION_LABEL[decision] ?? { label: decision, tone: "muted" as const };
  return <Chip tone={item.tone}>{item.label}</Chip>;
}

function List({
  values,
  empty,
  tone = "success",
}: {
  values: string[];
  empty: string;
  tone?: "success" | "warning";
}) {
  if (values.length === 0)
    return <div className="text-[12.5px] text-muted-foreground">{empty}</div>;
  return (
    <ul className={`space-y-1 text-[12.5px] ${tone === "warning" ? "text-amber-800" : ""}`}>
      {values.map((value) => (
        <li key={value} className="flex gap-1.5">
          <span className={tone === "warning" ? "" : "text-emerald-600"}>-</span>
          {value}
        </li>
      ))}
    </ul>
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
