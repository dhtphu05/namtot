import { ChevronDown, FilePlus2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorState } from "@/components/feedback/ErrorState";
import type { EvidenceResponse } from "@/lib/api/types";
import type { EvidenceCard } from "@/types/evidence";
import type { JobResponse } from "@/types/jobs";
import {
  getSafeExtractedFields,
  getSafeOcrText,
  normalizeWarnings,
  warningCopy,
} from "./evidence-card-utils";
import { EvidenceAuditButton } from "./EvidenceAuditButton";
import {
  getStudentEvidenceStatus,
  studentEvidenceStatusMap,
  type StudentEvidenceStatus,
} from "../utils/studentEvidenceStatus";
import { getEvidenceFiles } from "./student-evidence-utils";

type EvidenceCardPanelProps = {
  evidence: EvidenceResponse;
  card?: EvidenceCard | null;
  job?: JobResponse | null;
  requestId?: string;
  onRetry?: () => void;
  retrying?: boolean;
  onUploadMore?: () => void;
  uploading?: boolean;
};

export function EvidenceCardPanel({
  evidence,
  card,
  job,
  requestId,
  onRetry,
  retrying,
  onUploadMore,
  uploading,
}: EvidenceCardPanelProps) {
  const status = getStudentEvidenceStatus(evidence, card);
  const fields = getStudentReadableFields(card);
  const missingFields = getMissingFields(card);
  const ocrText = card?.ocrTextPreview ?? getSafeOcrText(card);
  const matchingStatus = getMatchingStatus(card, evidence.sourceType);
  const fileCount = getEvidenceFiles(evidence).length;
  const failed = evidence.indexingStatus === "failed";

  if (failed && !onRetry && !onUploadMore) {
    return (
      <ErrorState
        title={status.label}
        message={job?.error?.message ?? status.message}
        requestId={requestId}
      />
    );
  }

  return (
    <div className="space-y-4">
      <StatusSection
        status={status}
        onRetry={onRetry}
        retrying={retrying}
        onUploadMore={onUploadMore}
        uploading={uploading}
      />

      {evidence.sourceType !== "event_import" && isReading(evidence.indexingStatus) ? (
        <CompactReadingProgress status={evidence.indexingStatus} />
      ) : null}

      <section className="rounded-md border p-4">
        <h3 className="font-semibold text-foreground">Thông tin đã đọc</h3>
        {fields.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {fields.map((field) => (
              <Info key={field.label} label={field.label} value={field.value} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Chưa có thông tin tóm tắt.</p>
        )}
      </section>

      <section className="rounded-md border p-4">
        <h3 className="font-semibold text-foreground">Danh sách chính thức</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={matchingStatus.status} />
          {matchingStatus.eventName ? (
            <span className="font-medium text-foreground">{matchingStatus.eventName}</span>
          ) : (
            <span className="text-muted-foreground">{matchingStatus.message}</span>
          )}
        </div>
      </section>

      {missingFields.length ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <h3 className="font-semibold">Cần bổ sung</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          {onUploadMore ? (
            <Button
              type="button"
              size="sm"
              className="mt-3"
              variant="outline"
              onClick={onUploadMore}
              disabled={uploading}
            >
              <FilePlus2 className="h-4 w-4" />
              Upload thêm file
            </Button>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-md border p-4">
        <h3 className="font-semibold text-foreground">File gốc</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {fileCount ? `${fileCount} file đã tải lên.` : "Chưa có file trong minh chứng này."}
        </p>
      </section>

      <section className="rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">Lịch sử</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Các bước xử lý chính của minh chứng.
            </p>
          </div>
          <EvidenceAuditButton evidenceId={evidence.id} label="Lịch sử" />
        </div>
      </section>

      {ocrText ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="px-0">
              Xem nội dung đã đọc
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="max-h-52 overflow-auto rounded-md border bg-muted/30 p-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {ocrText}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
}

function StatusSection({
  status,
  onRetry,
  retrying,
  onUploadMore,
  uploading,
}: {
  status: StudentEvidenceStatus;
  onRetry?: () => void;
  retrying?: boolean;
  onUploadMore?: () => void;
  uploading?: boolean;
}) {
  const action =
    status.key === "unreadable_file" && onRetry
      ? { label: "Tải lại file", onClick: onRetry, disabled: retrying }
      : status.key === "needs_more_info" && onUploadMore
        ? { label: "Upload thêm file", onClick: onUploadMore, disabled: uploading }
        : null;

  return (
    <section className="rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StatusBadge status={status} />
          <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
        </div>
        {action ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {status.key === "unreadable_file" ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <FilePlus2 className="h-4 w-4" />
            )}
            {action.label}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function CompactReadingProgress({ status }: { status: string }) {
  const activeIndex =
    status === "indexed" || status === "needs_manual_review"
      ? 2
      : status === "ocr_processing" || status === "processing"
        ? 1
        : 0;
  const steps = ["Đã nhận file", "Đang đọc file", "Đã tạo tóm tắt", "Chờ cán bộ xét duyệt"];

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2 text-sm">
            <span
              className={
                index <= activeIndex
                  ? "h-2.5 w-2.5 rounded-full bg-primary"
                  : "h-2.5 w-2.5 rounded-full bg-border"
              }
            />
            <span
              className={
                index <= activeIndex ? "font-medium text-foreground" : "text-muted-foreground"
              }
            >
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StudentEvidenceStatus }) {
  const className = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  }[status.tone];

  return (
    <Badge className={className} variant="outline">
      {status.label}
    </Badge>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value || "--"}</div>
    </div>
  );
}

function getStudentReadableFields(card?: EvidenceCard | null) {
  const summary = card?.readableSummary;
  if (summary) {
    const summaryFields = [
      fieldFromValue("Tên hoạt động", summary.eventName),
      fieldFromValue("Đơn vị xác nhận", summary.organizer ?? summary.organizerName),
      fieldFromValue("Thời gian", summary.time ?? summary.activityTime),
      fieldFromValue(
        "Số ngày / giá trị quy đổi",
        formatConvertedValue(summary.convertedValue, summary.convertedUnit),
      ),
      fieldFromValue("Ngày cấp", summary.issueDate),
      fieldFromValue("Họ tên", summary.studentName),
      fieldFromValue("MSSV", summary.studentCode),
    ];

    return summaryFields.filter((field): field is { label: string; value: string } =>
      Boolean(field),
    );
  }

  const fields = getSafeExtractedFields(card);
  const picked = [
    pickField(fields, ["eventName", "event_name", "certificateName"], "Tên hoạt động"),
    pickField(
      fields,
      ["activityTime", "activity_time", "convertedValue", "converted_value"],
      "Thời gian / số ngày",
    ),
    pickField(fields, ["organizer", "organizerName"], "Đơn vị xác nhận"),
    pickField(fields, ["issueDate", "issue_date"], "Ngày cấp"),
    pickField(fields, ["studentName", "student_name", "fullName"], "Họ tên"),
    pickField(fields, ["studentCode", "student_code"], "MSSV"),
  ];

  return picked.filter((field): field is { label: string; value: string } => Boolean(field));
}

function fieldFromValue(label: string, value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "object") return null;
  return { label, value: String(value) };
}

function formatConvertedValue(value: unknown, unit?: string | null) {
  if (value === undefined || value === null || value === "") return null;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function pickField(
  fields: Array<{ key: string; label: string; value: string }>,
  keys: string[],
  label: string,
) {
  const found = fields.find((field) => keys.includes(field.key));
  if (!found || looksLikeJson(found.value)) return null;
  return { label, value: found.value };
}

function getMissingFields(card?: EvidenceCard | null) {
  if (Array.isArray(card?.missingFields) && card.missingFields.length) {
    return card.missingFields
      .map((field) => {
        if (typeof field === "string") return field;
        return field.label ?? field.message ?? field.field ?? "";
      })
      .filter(Boolean);
  }

  const warnings = normalizeWarnings(card?.warnings ?? card?.warningsJson);
  return warnings
    .filter((warning) => warning.startsWith("missing_"))
    .map((warning) => warningCopy[warning] ?? warning)
    .map((warning) => {
      if (warning.includes("số ngày")) return "Thiếu số ngày tham gia";
      if (warning.includes("ngày cấp") || warning.includes("ngày ký")) return "Thiếu ngày cấp";
      if (warning.includes("đơn vị")) return "Thiếu đơn vị xác nhận";
      if (warning.includes("họ tên")) return "Thiếu họ tên";
      if (warning.includes("MSSV")) return "Thiếu MSSV";
      return warning;
    });
}

function getMatchingStatus(card: EvidenceCard | null | undefined, sourceType: string) {
  const code =
    card?.matchingStatus?.code ??
    (sourceType === "event_import" ? "official_match_found" : "official_match_not_found");
  const status =
    code === "similar_name_found"
      ? studentEvidenceStatusMap.similar_name_found
      : code === "official_match_found"
        ? studentEvidenceStatusMap.official_match_found
        : studentEvidenceStatusMap.official_match_not_found;

  return {
    status,
    message: card?.matchingStatus?.message ?? status.message,
    eventName: card?.matchingStatus?.matchedEventName ?? card?.matchingStatus?.eventName ?? null,
  };
}

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function isReading(status?: string | null) {
  return Boolean(
    status &&
    [
      "uploaded",
      "pending_indexing",
      "ocr_processing",
      "processing",
      "extracting",
      "checking_registry",
    ].includes(status),
  );
}
