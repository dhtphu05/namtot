import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OfficerEvidenceKnowledgeSearchItem } from "../types";
import { getApprovalSourcesLabel } from "./evidence-knowledge-labels";

type OfficerEventListProps = {
  items: OfficerEvidenceKnowledgeSearchItem[];
  selectedEventId?: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onSelect: (eventId: string) => void;
  onRetry: () => void;
};

export function OfficerEventList({
  items,
  selectedEventId,
  isLoading,
  isError,
  errorMessage,
  onSelect,
  onRetry,
}: OfficerEventListProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-[#E5E7EB]">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex h-[68px] animate-pulse items-center px-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-4/5 rounded bg-slate-200" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3 py-8 text-center">
        <div className="text-sm font-semibold text-rose-700">Không tải được kho minh chứng.</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {errorMessage || "Vui lòng thử lại sau."}
        </div>
        <Button className="mt-3 min-h-11" type="button" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="px-3 py-10 text-center">
        <div className="text-sm font-semibold text-brand-deep">Chưa có tiền lệ phù hợp</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Các minh chứng đã được chấp nhận sẽ xuất hiện tại đây.
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[#E5E7EB]">
      {items.map((item) => {
        const selected = item.eventId === selectedEventId;
        return (
          <li key={item.eventId}>
            <button
              className={[
                "relative flex h-[68px] w-full min-w-0 items-center px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]/25",
                selected ? "bg-[#F1F7FD] pl-4" : "hover:bg-slate-50",
              ].join(" ")}
              type="button"
              onClick={() => onSelect(item.eventId)}
            >
              {selected ? (
                <span className="absolute left-0 top-2 h-[52px] w-[3px] rounded-r-full bg-[#0057C2]" />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-semibold text-brand-deep">
                  {item.canonicalTitle}
                </span>
                <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {item.acceptedCount} minh chứng - {getApprovalSourcesLabel(item.approvalSources)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
