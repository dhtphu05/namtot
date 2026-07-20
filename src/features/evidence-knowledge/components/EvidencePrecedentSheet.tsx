import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const extracted = item ? getExtractedFields(item.ocrMetadata.extractedFields) : {};
  const conflicts = item && event ? buildConflicts(event, extracted) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[100dvh] max-h-[100dvh] w-[100vw] max-w-none grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:h-[min(88dvh,900px)] sm:max-h-[88dvh] sm:w-[min(1120px,92vw)] sm:max-w-[1120px] sm:rounded-lg">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-16">
          <DialogTitle>{event?.canonicalTitle ?? "Tiền lệ minh chứng"}</DialogTitle>
          <DialogDescription>
            Thông tin tham chiếu phục vụ cán bộ kiểm tra, không thay thế quyết định hiện tại.
          </DialogDescription>
        </DialogHeader>

        {item ? (
          <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[minmax(0,63fr)_minmax(360px,37fr)]">
            <section className="min-h-0 border-b bg-slate-50 p-4 lg:border-b-0 lg:border-r">
              <div className="sticky top-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
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
                        <FileText className="mx-auto mb-2 h-7 w-7" />
                        {signedUrl.isLoading
                          ? "Đang tải preview được bảo vệ..."
                          : signedUrl.isError
                            ? "Không tải được preview."
                            : "Chưa có preview cho minh chứng này."}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="min-h-0 overflow-y-auto p-4">
              {conflicts.length ? <ConflictCallout conflicts={conflicts} /> : null}
              <Tabs defaultValue="overview" className="min-w-0">
                <TabsList className="mb-3 h-auto flex-wrap justify-start">
                  <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                  <TabsTrigger value="extracted">Dữ liệu đọc từ minh chứng</TabsTrigger>
                  <TabsTrigger value="history">Lịch sử xử lý</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0 space-y-3">
                  <InfoBlock
                    title={`Minh chứng đã chấp nhận #${index + 1}`}
                    rows={[
                      ["Nguồn xác nhận", getApprovalSourceLabel(item.approvalSource)],
                      ["Tiêu chí", getCriterionLabel(item.criterion)],
                      ["Cấp áp dụng", getLevelLabel(item.applicableLevel)],
                      ["Năm hoạt động", formatYear(item.eventYear)],
                      ["Năm xét", item.schoolYear || "Chưa có dữ liệu"],
                      ["Ngày ghi nhận", formatDateTime(item.createdAt)],
                    ]}
                  />
                  <InfoBlock
                    title="Thông tin sự kiện chuẩn"
                    rows={[
                      ["Đơn vị tổ chức", event?.organizer || "Chưa có dữ liệu"],
                      ["Cấp tổ chức", getLevelLabel(event?.organizerLevel)],
                      ["Cấp áp dụng", getLevelLabel(event?.applicableLevel)],
                      ["Năm", formatYear(event?.year)],
                    ]}
                  />
                  <section className="rounded-md border border-[#E5E7EB] bg-white p-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Tên gọi đã xác minh
                    </h3>
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
                </TabsContent>

                <TabsContent value="extracted" className="mt-0">
                  <InfoBlock
                    title="Dữ liệu đọc từ minh chứng"
                    rows={[
                      ["Tên sự kiện", extracted.eventName || "Chưa có dữ liệu"],
                      ["Đơn vị tổ chức", extracted.organizer || "Chưa có dữ liệu"],
                      ["Cấp tổ chức", extracted.organizerLevel || "Chưa có dữ liệu"],
                      [
                        "Cảnh báo xử lý",
                        item.ocrMetadata.warningsCount
                          ? `${item.ocrMetadata.warningsCount} cảnh báo cần kiểm tra`
                          : "Không có cảnh báo đáng chú ý",
                      ],
                    ]}
                  />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <section className="rounded-md border border-[#E5E7EB] bg-white p-3">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Lịch sử xử lý
                    </h3>
                    <ol className="mt-3 space-y-2 text-sm text-slate-700">
                      {item.approvalSource === "resolution" ? (
                        <>
                          <TimelineItem text="Cán bộ chuyển Hội đồng xem xét" />
                          <TimelineItem text="Hội đồng xác nhận minh chứng" />
                        </>
                      ) : (
                        <TimelineItem text="Cán bộ chuyên trách xác nhận minh chứng" />
                      )}
                      <TimelineItem text="Đưa vào Kho tiền lệ" />
                    </ol>
                  </section>
                </TabsContent>
              </Tabs>
            </section>
          </div>
        ) : (
          <div className="min-h-0 p-4">
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Chọn một minh chứng đã chấp nhận để xem chi tiết.
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 border-t px-5 py-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Đóng
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConflictCallout({ conflicts }: { conflicts: Array<[string, string, string]> }) {
  return (
    <section className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3">
      <h3 className="text-sm font-semibold text-amber-950">Thông tin cần đối chiếu</h3>
      <div className="mt-2 space-y-2">
        {conflicts.map(([label, canonical, extracted]) => (
          <div key={label} className="grid gap-1 text-sm text-amber-950">
            <div className="font-medium">{label}</div>
            <div>Thông tin chuẩn: {canonical}</div>
            <div>Dữ liệu đọc được: {extracted}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InfoBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="rounded-md border border-[#E5E7EB] bg-white p-3">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
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
    <div className="grid grid-cols-[132px_minmax(0,1fr)] gap-3 rounded-md bg-slate-50 px-3 py-2">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-slate-800">
        {mapBusinessValue(value)}
      </dd>
    </div>
  );
}

function TimelineItem({ text }: { text: string }) {
  return <li className="rounded-md bg-slate-50 px-3 py-2">{text}</li>;
}

function getExtractedFields(value: unknown): {
  eventName?: string;
  organizer?: string;
  organizerLevel?: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    eventName: stringField(
      record.eventName ?? record.event_name ?? record.activityName ?? record.activity_name,
    ),
    organizer: stringField(record.organizer),
    organizerLevel: stringField(record.organizerLevel ?? record.organizer_level ?? record.level),
  };
}

function buildConflicts(
  event: OfficerEvidenceKnowledgeEventDetail,
  extracted: ReturnType<typeof getExtractedFields>,
): Array<[string, string, string]> {
  const checks: Array<[string, string | null | undefined, string | undefined]> = [
    ["Tên sự kiện", event.canonicalTitle, extracted.eventName],
    ["Đơn vị tổ chức", event.organizer, extracted.organizer],
  ];
  return checks
    .filter(([, canonical, extractedValue]) =>
      Boolean(
        canonical &&
        extractedValue &&
        normalizeCompare(canonical) !== normalizeCompare(extractedValue),
      ),
    )
    .map(([label, canonical, extractedValue]) => [
      label,
      String(canonical),
      String(extractedValue),
    ]);
}

function stringField(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function normalizeCompare(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/đ/g, "d")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapBusinessValue(value: string): string {
  if (value === "external") return "Đơn vị bên ngoài trường";
  return value;
}
