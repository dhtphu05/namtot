import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AcceptedEvidencePrecedent,
  OfficerEvidenceKnowledgeEventDetail,
  OfficerEvidenceKnowledgeSearchItem,
} from "../types";
import { AcceptedEvidenceGallery } from "./AcceptedEvidenceGallery";
import {
  formatDateTime,
  formatYear,
  getCriterionLabel,
  getLevelLabel,
} from "./evidence-knowledge-labels";

type OfficerEventWorkspaceProps = {
  selected?: OfficerEvidenceKnowledgeSearchItem | null;
  detail?: OfficerEvidenceKnowledgeEventDetail | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectEvidence: (item: AcceptedEvidencePrecedent, index: number) => void;
};

export function OfficerEventWorkspace({
  selected,
  detail,
  isLoading,
  isError,
  onRetry,
  onSelectEvidence,
}: OfficerEventWorkspaceProps) {
  if (!selected) {
    return (
      <section className="rounded-md border border-dashed border-[#CBD5E1] bg-white px-4 py-12 text-center">
        <div className="text-sm font-semibold text-brand-deep">Chọn một sự kiện</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Workspace sẽ hiển thị tiền lệ đã chấp nhận của sự kiện được chọn.
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-md border border-[#E5E7EB] bg-white p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải chi tiết tiền lệ...
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-md border border-[#E5E7EB]">
              <div className="aspect-video bg-slate-100" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError || !detail) {
    return (
      <section className="rounded-md border border-[#E5E7EB] bg-white px-4 py-10 text-center">
        <div className="text-sm font-semibold text-rose-700">Không tải được chi tiết tiền lệ.</div>
        <Button className="mt-3 min-h-11" type="button" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-4">
      <header className="min-w-0 border-b border-[#E5E7EB] pb-4">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-[20px] font-bold leading-7 text-[var(--text-primary)]">
            {detail.canonicalTitle}
          </h2>
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{getCriterionLabel(detail.criterion)}</span>
            <span>·</span>
            <span>{getLevelLabel(detail.applicableLevel)}</span>
            <span>·</span>
            <span>{formatYear(detail.year)}</span>
          </div>
          {detail.organizer ? (
            <div className="mt-1 text-sm text-muted-foreground">{detail.organizer}</div>
          ) : null}
        </div>

        {detail.resolutionPrecedent ? (
          <div className="mt-3 text-sm font-medium text-slate-700">
            Hội đồng xác nhận · {formatDateTime(detail.resolutionPrecedent.approvedAt)}.
          </div>
        ) : null}
      </header>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Minh chứng đã chấp nhận
          </h3>
          <span className="text-sm text-muted-foreground">
            {detail.acceptedEvidence.length} mục
          </span>
        </div>
        <AcceptedEvidenceGallery items={detail.acceptedEvidence} onSelect={onSelectEvidence} />
      </div>
    </section>
  );
}
