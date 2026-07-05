import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { InlineAlert, StatusBadge } from "@/features/student/components/primitives";
import { getEvidenceStudentStatus } from "@/features/student/selectors/student-ui";
import type { EvidenceResponse } from "@/lib/api/types";
import type { EvidenceCard } from "@/types/evidence";
import type { JobResponse } from "@/types/jobs";
import { getSafeExtractedFields, normalizeWarnings } from "./evidence-card-utils";
import { ExtractedFieldsTable } from "./ExtractedFieldsTable";
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
  const fields = getSafeExtractedFields(card);
  const warnings = normalizeWarnings(card?.warnings ?? card?.warningsJson);
  const studentStatus = getEvidenceStudentStatus(evidence);
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Tình trạng minh chứng</div>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
            {job && !isOfficialImport
              ? "Hệ thống đang cập nhật kết quả xử lý file."
              : "Thông tin này dùng để hỗ trợ kiểm tra hồ sơ."}
          </p>
        </div>
        <StatusBadge tone={studentStatus.tone} label={studentStatus.label} />
      </div>

      {isOfficialImport ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Minh chứng này được tạo từ danh sách chính thức đã được xác nhận.
        </div>
      ) : null}

      {evidence.indexingStatus === "needs_manual_review" ? (
        <InlineAlert
          type="warning"
          title="Cần kiểm tra thêm"
          description="Một số thông tin trong minh chứng cần cán bộ xác nhận trước khi dùng để xét hồ sơ."
        />
      ) : null}

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Thông tin đã nhận diện
        </h3>
        <ExtractedFieldsTable fields={fields} />
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-foreground">Cảnh báo cần xem lại</h3>
        <WarningsList warnings={warnings} />
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
