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
  getApprovalSourcesLabel,
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
      <div className="rounded-md border border-[#E5E7EB] bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight text-brand-deep">
              {detail.canonicalTitle}
            </h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{getCriterionLabel(detail.criterion)}</span>
              <span>{detail.organizer || "Chưa có đơn vị tổ chức"}</span>
              <span>{getLevelLabel(detail.applicableLevel)}</span>
              <span>{formatYear(detail.year)}</span>
            </div>
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {selected.acceptedCount} minh chứng -{" "}
            {getApprovalSourcesLabel(selected.approvalSources)}
          </div>
        </div>

        {detail.resolutionPrecedent ? (
          <div className="mt-3 rounded-md border border-[#E5E7EB] bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Tiền lệ Resolution đã được chấp nhận lúc{" "}
            {formatDateTime(detail.resolutionPrecedent.approvedAt)}.
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-brand-deep">Minh chứng đã chấp nhận</h3>
          <span className="text-sm text-muted-foreground">
            {detail.acceptedEvidence.length} mục
          </span>
        </div>
        <AcceptedEvidenceGallery items={detail.acceptedEvidence} onSelect={onSelectEvidence} />
      </div>
    </section>
  );
}
