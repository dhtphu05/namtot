import { useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Loader2, RefreshCw, Sparkles, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Chip } from "@/components/ui-kit";
import { evidenceApi } from "@/features/evidence/api/evidence";
import { useEvidenceCard } from "@/features/evidence/hooks/useEvidence";
import type { EvidenceResponse } from "@/lib/api/types";
import {
  evidenceStatusLabel,
  formatFileSize,
  formatStudentDate,
  getFileName,
  getFileSize,
  getPrimaryFile,
  indexingStatusLabel,
  isImageFile,
  isPdfFile,
  sourceTypeLabel,
  studentCriterionLabel,
} from "./student-evidence-utils";

type EvidenceCardPayload = {
  card?: {
    ocrText?: string | null;
    extractedFieldsJson?: unknown;
    warningsJson?: unknown;
    warnings?: unknown;
    matchedEventId?: string | null;
    matchedKnowledgeItemIds?: unknown;
    confidence?: number | null;
    aiSummary?: string | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
  } | null;
  indexingStatus?: string;
};

export function EvidenceDetailModal({
  evidence,
  onClose,
  onReplace,
}: {
  evidence: EvidenceResponse | null;
  onClose: () => void;
  onReplace?: (evidence: EvidenceResponse) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedUrlLoading, setSignedUrlLoading] = useState(false);
  const cardQuery = useEvidenceCard(evidence?.id);

  const file = evidence ? getPrimaryFile(evidence) : null;
  const cardPayload = (cardQuery.data ?? null) as EvidenceCardPayload | null;
  const card = cardPayload?.card ?? null;
  const extractedFields = useReadableFields(card?.extractedFieldsJson);
  const warnings = useWarnings(card?.warningsJson ?? card?.warnings);

  if (!evidence) return null;

  const previewFile = async (openInNewTab = false) => {
    if (!file?.id) {
      toast.error("Minh chứng này chưa có file để xem.");
      return;
    }

    try {
      setSignedUrlLoading(true);
      const res = await evidenceApi.getSignedFileUrl(file.id);
      const url = res.data?.url;
      if (!url) throw new Error("Không lấy được đường dẫn xem file.");
      setSignedUrl(url);
      if (openInNewTab) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở file minh chứng.");
    } finally {
      setSignedUrlLoading(false);
    }
  };

  const nextAction = getNextAction(evidence.indexingStatus, warnings);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#E3ECF6] px-5 py-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Chip tone="brand">{studentCriterionLabel[evidence.criterion]}</Chip>
              <Chip tone="muted">{sourceTypeLabel[evidence.sourceType]}</Chip>
              <Chip tone={evidence.status === "accepted" ? "success" : evidence.status === "rejected" ? "error" : "warning"}>
                {evidenceStatusLabel[evidence.status]}
              </Chip>
              <Chip tone={evidence.indexingStatus === "indexed" ? "success" : evidence.indexingStatus === "failed" ? "error" : "brand"}>
                {indexingStatusLabel[evidence.indexingStatus]}
              </Chip>
            </div>
            <h3 className="truncate text-xl font-bold text-brand-deep">{evidence.evidenceName}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              AI gợi ý, cán bộ xác nhận kết quả cuối cùng.
              {typeof (card?.confidence ?? evidence.confidence) === "number"
                ? ` Độ tin cậy AI: ${Math.round(Number(card?.confidence ?? evidence.confidence) * 100)}%.`
                : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-deep"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-88px)] gap-0 overflow-y-auto lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4 border-r border-[#E3ECF6] px-5 py-5">
            <section className="rounded-lg border border-[#E3ECF6] p-4">
              <h4 className="font-bold text-brand-deep">File minh chứng</h4>
              {file ? (
                <div className="mt-3 space-y-3">
                  <InfoRow label="Tên file" value={getFileName(file)} />
                  <InfoRow label="Loại file" value={file.mimeType ?? "--"} />
                  <InfoRow label="Dung lượng" value={formatFileSize(getFileSize(file))} />
                  <InfoRow label="Tải lên" value={formatStudentDate(file.uploadedAt ?? file.createdAt ?? evidence.createdAt)} />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => previewFile(false)} disabled={signedUrlLoading}>
                      {signedUrlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      Xem file
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => previewFile(true)} disabled={signedUrlLoading}>
                      <ExternalLink className="h-4 w-4" /> Mở trong tab mới
                    </Button>
                    {signedUrl && (
                      <a href={signedUrl} download={getFileName(file)}>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" /> Tải xuống
                        </Button>
                      </a>
                    )}
                    {onReplace && (
                      <Button size="sm" variant="ghost" onClick={() => onReplace(evidence)}>
                        <RefreshCw className="h-4 w-4" /> Thay file
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Chưa có file tài liệu. Hãy tải file lên để cán bộ và AI có dữ liệu kiểm tra.
                </div>
              )}
            </section>

            {signedUrl && file && (
              <section className="rounded-lg border border-[#E3ECF6] p-4">
                <h4 className="font-bold text-brand-deep">Preview</h4>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#E3ECF6] bg-slate-50">
                  {isImageFile(file) ? (
                    <img src={signedUrl} alt={getFileName(file)} className="max-h-[420px] w-full object-contain" />
                  ) : isPdfFile(file) ? (
                    <iframe title={getFileName(file)} src={signedUrl} className="h-[420px] w-full" />
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      Trình duyệt không hỗ trợ preview loại file này. Hãy mở trong tab mới hoặc tải xuống.
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-lg border border-[#E3ECF6] p-4">
              <h4 className="font-bold text-brand-deep">Lịch sử</h4>
              <div className="mt-3 space-y-2 text-sm">
                <InfoRow label="Tạo minh chứng" value={formatStudentDate(evidence.createdAt)} />
                <InfoRow label="Cập nhật gần nhất" value={formatStudentDate(evidence.updatedAt)} />
                <InfoRow label="AI cập nhật" value={formatStudentDate(String(card?.updatedAt ?? ""))} />
              </div>
            </section>
          </div>

          <div className="space-y-4 px-5 py-5">
            <section className="rounded-lg border border-[#E3ECF6] p-4">
              <h4 className="flex items-center gap-2 font-bold text-brand-deep">
                <Sparkles className="h-4 w-4 text-[#0057C2]" /> AI đã đọc gì?
              </h4>
              {cardQuery.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Đang tải thông tin AI...
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  <TextBlock label="Tóm tắt AI" value={card?.aiSummary} empty="Chưa có tóm tắt AI cho minh chứng này." />
                  <TextBlock label="OCR preview" value={card?.ocrText} empty="Chưa có nội dung OCR." clamp />
                  <div>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">Trường đã trích xuất</div>
                    {extractedFields.length ? (
                      <div className="mt-2 grid gap-2">
                        {extractedFields.map((field) => (
                          <InfoRow key={field.label} label={field.label} value={field.value} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">AI chưa trích xuất được trường dữ liệu rõ ràng.</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-[#E3ECF6] p-4">
              <h4 className="flex items-center gap-2 font-bold text-brand-deep">
                <TriangleAlert className="h-4 w-4 text-amber-500" /> Cảnh báo
              </h4>
              {warnings.length ? (
                <div className="mt-3 space-y-2">
                  {warnings.map((warning, index) => (
                    <div key={`${warning}-${index}`} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {friendlyWarning(warning)}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Chưa có cảnh báo từ AI cho minh chứng này.</p>
              )}
            </section>

            <section className="rounded-lg bg-[#F1F7FD] p-4">
              <h4 className="font-bold text-brand-deep">Việc nên làm tiếp theo</h4>
              <p className="mt-2 text-sm text-slate-700">{nextAction}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-semibold text-brand-deep">{value || "--"}</span>
    </div>
  );
}

function TextBlock({ label, value, empty, clamp }: { label: string; value?: string | null; empty: string; clamp?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <p className={`mt-2 whitespace-pre-wrap text-sm text-slate-700 ${clamp ? "max-h-32 overflow-auto rounded-lg bg-slate-50 p-3" : ""}`}>
        {value?.trim() || empty}
      </p>
    </div>
  );
}

function useReadableFields(value: unknown) {
  return useMemo(() => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    return Object.entries(value as Record<string, unknown>)
      .filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== null && fieldValue !== "")
      .map(([key, fieldValue]) => ({
        label: key.replace(/_/g, " "),
        value: Array.isArray(fieldValue) ? fieldValue.join(", ") : String(fieldValue),
      }));
  }, [value]);
}

function useWarnings(value: unknown) {
  return useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
    if (typeof value === "string") return [value];
    return [];
  }, [value]);
}

function friendlyWarning(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("date") || normalized.includes("ngày")) return "Thiếu hoặc chưa rõ ngày cấp.";
  if (normalized.includes("unit") || normalized.includes("đơn vị")) return "Thiếu đơn vị xác nhận.";
  if (normalized.includes("blur") || normalized.includes("mờ")) return "Ảnh có thể bị mờ, hãy tải lại file rõ hơn.";
  if (normalized.includes("name") || normalized.includes("họ tên")) return "Không tìm thấy họ tên rõ ràng.";
  if (normalized.includes("volunteer") || normalized.includes("tình nguyện")) return "Không xác định được số ngày tình nguyện.";
  return value || "Cần cán bộ kiểm tra.";
}

function getNextAction(indexingStatus: string, warnings: string[]) {
  if (warnings.some((warning) => warning.toLowerCase().includes("blur") || warning.toLowerCase().includes("mờ"))) {
    return "Ảnh có thể bị mờ. Hãy tải lại file rõ hơn trước khi nộp hồ sơ.";
  }
  if (indexingStatus === "indexed") {
    return "Minh chứng đã được AI đọc xong. Bạn có thể chạy tiền kiểm để biết hồ sơ còn thiếu gì.";
  }
  if (indexingStatus === "failed") {
    return "AI không đọc được file này. Bạn có thể thay file hoặc vẫn nộp để cán bộ kiểm tra thủ công.";
  }
  return "AI chưa chắc chắn. Cán bộ sẽ kiểm tra khi bạn nộp hồ sơ.";
}

