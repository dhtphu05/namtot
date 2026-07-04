import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { JobProgressInline } from "@/components/status/JobProgressInline";
import { UxStatusCard } from "@/components/status/UxStatusCard";
import type { EvidenceResponse } from "@/lib/api/types";
import type { EvidenceCard } from "@/types/evidence";
import type { JobResponse } from "@/types/jobs";
import {
  getConfidenceSummary,
  getEvidenceUxStatus,
  getSafeExtractedFields,
  getSafeOcrText,
  normalizeWarnings,
} from "./evidence-card-utils";
import { ExtractedFieldsTable } from "./ExtractedFieldsTable";
import { OcrTextPreview } from "./OcrTextPreview";
import { WarningsList } from "./WarningsList";

type EvidenceCardPanelProps = {
  evidence: EvidenceResponse;
  card?: EvidenceCard | null;
  job?: JobResponse | null;
  requestId?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function EvidenceCardPanel({
  evidence,
  card,
  job,
  requestId,
  onRetry,
  retrying,
}: EvidenceCardPanelProps) {
  const confidence = getConfidenceSummary(card?.confidence ?? evidence.confidence);
  const fields = getSafeExtractedFields(card);
  const warnings = normalizeWarnings(card?.warnings ?? card?.warningsJson);
  const uxStatus = getEvidenceUxStatus(evidence, card);
  const failed = evidence.indexingStatus === "failed";
  const isOfficialImport = evidence.sourceType === "event_import";

  if (failed) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Số hoá chưa thành công"
          message={job?.error?.message ?? "Hệ thống chưa đọc được nội dung minh chứng này."}
          requestId={requestId}
          onRetry={onRetry}
        />
        <p className="text-sm text-muted-foreground">
          Kết quả số hoá chỉ hỗ trợ kiểm tra. Cán bộ/Hội đồng sẽ xác nhận cuối cùng.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <UxStatusCard status={uxStatus} />
      {job && !isOfficialImport ? <JobProgressInline job={job} /> : null}

      {isOfficialImport ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Minh chứng này được tạo từ danh sách chính thức đã được xác nhận, không cần OCR lại.
        </div>
      ) : null}

      {confidence ? (
        <div className="rounded-md border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-foreground">
                {confidence.tone === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                {confidence.label}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Đây là độ chắc chắn của việc đọc và rút trích thông tin, không phải kết quả xét
                duyệt cuối cùng.
              </p>
            </div>
            <Badge variant="outline">{confidence.percent}%</Badge>
          </div>
        </div>
      ) : null}

      {evidence.indexingStatus === "needs_manual_review" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Hệ thống đã đọc được một phần minh chứng nhưng cần cán bộ kiểm tra thêm.
        </div>
      ) : null}

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Trường đã rút trích
        </h3>
        <ExtractedFieldsTable fields={fields} />
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">Cảnh báo cần xem lại</h3>
        <WarningsList warnings={warnings} />
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">Nội dung đã đọc</h3>
        <OcrTextPreview text={getSafeOcrText(card)} />
      </section>

      <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
        Kết quả số hoá chỉ hỗ trợ kiểm tra. Cán bộ/Hội đồng sẽ xác nhận cuối cùng.
      </div>

      {onRetry && evidence.indexingStatus === "failed" ? (
        <Button type="button" variant="outline" onClick={onRetry} disabled={retrying}>
          <RefreshCw className="h-4 w-4" />
          Thử xử lý lại
        </Button>
      ) : null}
    </div>
  );
}
