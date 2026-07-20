import { FileText } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSignedFileUrl } from "@/features/review/hooks/useReview";
import type { AcceptedEvidencePrecedent, OfficerEvidenceKnowledgeEventDetail } from "../types";
import {
  formatDateTime,
  formatYear,
  getApprovalSourceLabel,
  getCriterionLabel,
  getLevelLabel,
} from "./evidence-knowledge-labels";

type EvidencePrecedentSheetProps = {
  open: boolean;
  event?: OfficerEvidenceKnowledgeEventDetail | null;
  item?: AcceptedEvidencePrecedent | null;
  index?: number;
  onOpenChange: (open: boolean) => void;
};

export function EvidencePrecedentSheet({
  open,
  event,
  item,
  index = 0,
  onOpenChange,
}: EvidencePrecedentSheetProps) {
  const previewFile = item?.previewFile ?? null;
  const signedUrl = useSignedFileUrl(previewFile?.id, open && Boolean(previewFile?.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-y-auto p-4 sm:max-w-[420px]"
      >
        <SheetHeader className="pr-10 text-left">
          <SheetTitle>{event?.canonicalTitle ?? "Tiền lệ minh chứng"}</SheetTitle>
          <SheetDescription>
            Thông tin tham chiếu chỉ phục vụ cán bộ kiểm tra, không thay thế quyết định hiện tại.
          </SheetDescription>
        </SheetHeader>

        {item ? (
          <div className="mt-4 space-y-4">
            <div className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
              <div className="aspect-video bg-slate-50">
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
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    <div>
                      <FileText className="mx-auto mb-2 h-8 w-8" />
                      {signedUrl.isLoading
                        ? "Đang tải preview được bảo vệ..."
                        : "Chưa có preview được bảo vệ cho minh chứng này."}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <InfoBlock
              title={`Minh chứng đã chấp nhận #${index + 1}`}
              rows={[
                ["Nguồn duyệt", getApprovalSourceLabel(item.approvalSource)],
                ["Tiêu chí", getCriterionLabel(item.criterion)],
                ["Cấp áp dụng", getLevelLabel(item.applicableLevel)],
                ["Năm", formatYear(item.eventYear)],
                ["Năm xét", item.schoolYear || "Chưa có dữ liệu"],
                ["Ngày ghi nhận", formatDateTime(item.createdAt)],
              ]}
            />

            <InfoBlock
              title="Phạm vi sự kiện"
              rows={[
                ["Đơn vị tổ chức", event?.organizer || "Chưa có dữ liệu"],
                ["Cấp tổ chức", getLevelLabel(event?.organizerLevel)],
                ["Cấp áp dụng", getLevelLabel(event?.applicableLevel)],
                ["Năm", formatYear(event?.year)],
              ]}
            />

            <section className="rounded-md border border-[#E5E7EB] bg-white p-3">
              <h3 className="text-sm font-semibold text-brand-deep">Tên gọi đã xác minh</h3>
              {event?.aliases.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {event.aliases.map((alias) => (
                    <span
                      key={alias}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Chưa có tên gọi khác.</p>
              )}
            </section>

            <section className="rounded-md border border-[#E5E7EB] bg-white p-3">
              <h3 className="text-sm font-semibold text-brand-deep">OCR và dữ liệu trích xuất</h3>
              <dl className="mt-2 grid gap-2 text-sm">
                <SafeRow label="Có OCR" value={item.ocrMetadata.hasOcrText ? "Có" : "Không"} />
                <SafeRow
                  label="Cảnh báo xử lý"
                  value={`${item.ocrMetadata.warningsCount || 0} cảnh báo`}
                />
                {safeExtractedEntries(item.ocrMetadata.extractedFields).map(([label, value]) => (
                  <SafeRow key={label} label={label} value={value} />
                ))}
              </dl>
            </section>

            <section className="rounded-md border border-[#E5E7EB] bg-white p-3">
              <h3 className="text-sm font-semibold text-brand-deep">Tóm tắt audit</h3>
              <p className="mt-2 text-sm text-muted-foreground">{summarizeAudit(item)}</p>
            </section>
          </div>
        ) : (
          <div className="mt-8 rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Chọn một minh chứng đã chấp nhận để xem chi tiết.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-3">
      <h3 className="text-sm font-semibold text-brand-deep">{title}</h3>
      <dl className="mt-2 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <SafeRow key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

function SafeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-md bg-slate-50 px-3 py-2">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function safeExtractedEntries(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const allowedLabels: Record<string, string> = {
    eventName: "Tên sự kiện",
    event_name: "Tên sự kiện",
    activityName: "Tên hoạt động",
    activity_name: "Tên hoạt động",
    organizer: "Đơn vị tổ chức",
    year: "Năm",
    issueYear: "Năm cấp",
    issue_year: "Năm cấp",
    level: "Cấp",
    organizerLevel: "Cấp tổ chức",
    organizer_level: "Cấp tổ chức",
  };
  return Object.entries(value as Record<string, unknown>)
    .filter(
      ([key, item]) => allowedLabels[key] && item !== undefined && item !== null && item !== "",
    )
    .slice(0, 6)
    .map(([key, item]) => [allowedLabels[key], String(item)]);
}

function summarizeAudit(item: AcceptedEvidencePrecedent) {
  if (item.approvalSource === "resolution") {
    return "Minh chứng đã được Resolution Hub/Committee chấp nhận và đưa vào kho tiền lệ.";
  }
  return "Minh chứng đã được cán bộ chuyên trách chấp nhận và đưa vào kho tiền lệ.";
}
