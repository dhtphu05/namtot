import { AlertTriangle, FileText } from "lucide-react";
import { ErrorState } from "@/components/feedback/ErrorState";
import { LoadingState } from "@/components/feedback/LoadingState";
import { UxStatusCard } from "@/components/status/UxStatusCard";
import type { DecisionImportMetadata } from "@/types/decision-import";
import {
  compactFacts,
  formatCriterion,
  formatDecisionDate,
  formatLevel,
  isPresentDisplayValue,
} from "./decision-import-utils";

type DecisionMetadataPanelProps = {
  metadata?: DecisionImportMetadata | null;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
};

export function DecisionMetadataPanel({
  metadata,
  isLoading,
  isError,
  errorMessage,
  onRetry,
}: DecisionMetadataPanelProps) {
  if (isLoading) return <LoadingState label="Đang tải thông tin văn bản..." />;

  if (isError) {
    return (
      <ErrorState
        title="Không thể tải thông tin văn bản"
        message={errorMessage ?? "Vui lòng thử lại sau."}
        onRetry={onRetry}
      />
    );
  }

  const facts = compactFacts([
    { label: "Số văn bản", value: metadata?.documentNo ?? metadata?.decisionNumber },
    { label: "Loại văn bản", value: metadata?.documentType },
    { label: "Đơn vị ban hành", value: metadata?.issuer ?? metadata?.organizer },
    { label: "Ngày ban hành", value: formatDecisionDate(metadata?.issueDate) },
    { label: "Ngày hiệu lực", value: formatDecisionDate(metadata?.effectiveDate) },
    { label: "Người ký", value: metadata?.signer },
    { label: "Tiêu chí", value: formatCriterion(metadata?.criterion) },
    { label: "Cấp xét", value: formatLevel(metadata?.targetLevel) },
  ]);
  const hasDocumentText =
    facts.length > 0 ||
    isPresentDisplayValue(metadata?.summary) ||
    isPresentDisplayValue(metadata?.relatedDocumentNo);

  if (!hasDocumentText) {
    return (
      <section className="rounded-md border bg-white p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Thông tin văn bản</h2>
        </div>
        <div className="mt-3 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Chưa đọc được thông tin văn bản; vẫn có thể kiểm tra danh sách sinh viên.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-md border bg-white p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-foreground">Thông tin văn bản</h2>
      </div>

      <UxStatusCard status={metadata?.uxStatus} className="p-3" />

      {!metadata?.documentNo || !metadata?.issuer || !metadata?.issueDate ? (
        <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Chưa đọc đủ số văn bản, đơn vị ban hành hoặc ngày ban hành; vẫn có thể kiểm tra danh sách.
        </div>
      ) : null}

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {facts.map((fact) => (
          <Info key={fact.label} label={fact.label} value={fact.value} />
        ))}
      </div>

      <Info label="Trích yếu" value={metadata?.summary} />
      <Info label="Số văn bản liên quan" value={metadata?.relatedDocumentNo} />
    </section>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  if (!isPresentDisplayValue(value)) return null;

  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}
