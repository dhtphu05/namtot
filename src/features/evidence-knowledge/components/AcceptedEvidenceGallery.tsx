import { FileText } from "lucide-react";
import { useSignedFileUrl } from "@/features/review/hooks/useReview";
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
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,340px))] gap-4">
      {items.map((item, index) => (
        <EvidenceGalleryCard
          key={item.precedentId}
          item={item}
          index={index}
          onSelect={() => onSelect(item, index)}
        />
      ))}
    </div>
  );
}

function EvidenceGalleryCard({
  item,
  index,
  onSelect,
}: {
  item: AcceptedEvidencePrecedent;
  index: number;
  onSelect: () => void;
}) {
  const previewFile = item.previewFile;
  const signedUrl = useSignedFileUrl(previewFile?.id, Boolean(previewFile?.id));

  return (
    <button
      className="w-full max-w-[340px] min-w-[280px] rounded-md border border-[#E5E7EB] bg-white text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0057C2]/25"
      type="button"
      onClick={onSelect}
    >
      <div className="aspect-video w-full overflow-hidden border-b border-[#E5E7EB] bg-slate-50">
        {signedUrl.data && previewFile?.mimeType?.startsWith("image/") ? (
          <img
            alt="Minh chứng tham chiếu đã được bảo vệ"
            className="h-full w-full object-contain"
            src={signedUrl.data}
          />
        ) : signedUrl.data && previewFile?.mimeType === "application/pdf" ? (
          <iframe
            className="h-full w-full"
            src={signedUrl.data}
            title="Minh chứng tham chiếu đã được bảo vệ"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
            <div>
              <FileText className="mx-auto mb-1 h-5 w-5 text-slate-400" />
              {previewFile
                ? signedUrl.isError
                  ? "Không tải được preview"
                  : "Đang tải preview"
                : "Chưa có preview"}
            </div>
          </div>
        )}
      </div>
      <div className="px-3 py-2">
        <div className="line-clamp-1 text-sm font-semibold text-[var(--text-primary)]">
          Minh chứng đã chấp nhận #{index + 1}
        </div>
        <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {getApprovalSourceLabel(item.approvalSource)}
        </div>
      </div>
    </button>
  );
}
