import { FileText } from "lucide-react";
import type { AcceptedEvidencePrecedent } from "../types";
import { getApprovalSourceLabel } from "./evidence-knowledge-labels";

type AcceptedEvidenceGalleryProps = {
  items: AcceptedEvidencePrecedent[];
  onSelect: (item: AcceptedEvidencePrecedent, index: number) => void;
};

export function AcceptedEvidenceGallery({ items, onSelect }: AcceptedEvidenceGalleryProps) {
  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed border-[#CBD5E1] bg-white px-4 py-10 text-center text-sm text-muted-foreground">
        Chưa có minh chứng đã chấp nhận để hiển thị.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item, index) => (
        <button
          key={item.precedentId}
          className="min-w-0 rounded-md border border-[#E5E7EB] bg-white text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]/25"
          type="button"
          onClick={() => onSelect(item, index)}
        >
          <div className="aspect-video w-full overflow-hidden border-b border-[#E5E7EB] bg-slate-50">
            <div className="flex h-full items-center justify-center">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
          </div>
          <div className="px-3 py-2">
            <div className="line-clamp-1 text-sm font-semibold text-brand-deep">
              Minh chứng đã chấp nhận #{index + 1}
            </div>
            <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {getApprovalSourceLabel(item.approvalSource)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
