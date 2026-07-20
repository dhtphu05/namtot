import { AlertTriangle, ChevronDown, FilePlus2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorState } from "@/components/feedback/ErrorState";
import type { EvidenceResponse } from "@/lib/api/types";
import type { EvidenceCard } from "@/types/evidence";
import type { JobResponse } from "@/types/jobs";
import { getSafeOcrText, normalizeWarnings, warningCopy } from "./evidence-card-utils";
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
  const userFields = getUserProvidedFields(evidence, card);
  const extractedFields = getExtractedReadableFields(card);
  const academic = getAcademicInfo(card);
  const missingFields = getMissingFields(card);
  const ocrText = card?.ocrTextPreview ?? getSafeOcrText(card);
  const matchingStatus = getMatchingStatus(card, evidence.sourceType);
  const extractedEventName = getDisplayValue(
    card?.normalizedFields?.event_name ??
      card?.normalizedFields?.eventName ??
      card?.extractedFields?.event_name ??
      card?.extractedFields?.eventName ??
      card?.readableSummary?.eventName,
  );
  const showExtractedEventName =
    extractedEventName &&
    normalizeCompare(extractedEventName) !== normalizeCompare(evidence.evidenceName);
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words text-lg font-semibold text-foreground">
              {evidence.evidenceName}
            </h3>
            {showExtractedEventName ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Hệ thống đọc được:{" "}
                <span className="font-medium text-foreground">{extractedEventName}</span>
              </p>
            ) : null}
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Kết quả số hoá chỉ hỗ trợ kiểm tra. Cán bộ/Hội đồng sẽ xác nhận cuối cùng.
        </p>
      </section>

      <section className="rounded-md border p-4">
        <h3 className="font-semibold text-foreground">Thông tin minh chứng</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {userFields.map((field) => (
            <FieldInfo
              key={field.label}
              label={field.label}
              value={field.value}
              source="Sinh viên nhập"
            />
          ))}
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h3 className="font-semibold text-foreground">SmartReader gợi ý</h3>
        {extractedFields.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {extractedFields.map((field) => (
              <FieldInfo
                key={field.key}
                label={field.label}
                value={field.value}
                source={field.source}
                missing={field.missing}
              />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Chưa đọc được thông tin tóm tắt.</p>
        )}
      </section>

      {academic ? (
        <section className="rounded-md border p-4">
          <h3 className="font-semibold text-foreground">GPA / học tập</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <FieldInfo
              label="GPA sinh viên nhập"
              value={academic.userGpaDisplay}
              source="Sinh viên nhập"
            />
            <FieldInfo
              label="GPA SmartReader gợi ý"
              value={academic.suggestionDisplay}
              source="SmartReader gợi ý"
              missing={!academic.suggestionDisplay}
            />
            <FieldInfo
              label="Ngưỡng tham chiếu"
              value={academic.thresholdDisplay}
              source="Kho chính thức"
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{academic.message}</p>
        </section>
      ) : null}

      <section className="rounded-md border p-4">
        <h3 className="font-semibold text-foreground">Danh sách chính thức</h3>
        <div className="mt-3 flex flex-wrap items-start gap-2 text-sm">
          <RegistryBadge tone={matchingStatus.tone} label={matchingStatus.label} />
          {matchingStatus.eventName ? (
            <span className="font-medium text-foreground">{matchingStatus.eventName}</span>
          ) : (
            <span className="text-muted-foreground">{matchingStatus.message}</span>
          )}
        </div>
      </section>

      {missingFields.length ? (
        <section className="rounded-md border border-amber-200 bg-amber-50/60 p-4 text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-semibold">Cần kiểm tra</h3>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Nếu trường này không bắt buộc với tiêu chí bạn đang nộp, bạn không cần bổ sung ngay.
          </p>
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

function RegistryBadge({
  tone,
  label,
}: {
  tone: "success" | "info" | "warning" | "error" | "neutral";
  label: string;
}) {
  const className = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <Badge className={className} variant="outline">
      {label}
    </Badge>
  );
}

function FieldInfo({
  label,
  value,
  source,
  missing,
}: {
  label: string;
  value?: string | null;
  source: "Hồ sơ" | "Sinh viên nhập" | "SmartReader gợi ý" | "Kho chính thức" | "Cán bộ xác nhận";
  missing?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
        <Badge variant="outline" className="border-slate-200 bg-background px-1.5 py-0 text-[10px]">
          {source}
        </Badge>
      </div>
      <div
        className={`mt-1 break-words font-semibold ${
          missing ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {value || "Chưa đọc được"}
      </div>
    </div>
  );
}

function getUserProvidedFields(evidence: EvidenceResponse, card?: EvidenceCard | null) {
  const userProvided = card?.userProvidedFields ?? {};
  return [
    {
      label: "Tên minh chứng",
      value: getDisplayValue(userProvided.evidenceName ?? evidence.evidenceName),
    },
    {
      label: "Tiêu chí",
      value: criterionLabel(evidence.criterion),
    },
  ].filter((field) => field.value);
}

function getExtractedReadableFields(card?: EvidenceCard | null) {
  const primary = card?.primaryFields ?? {};
  const profile = card?.studentProfileFields ?? {};
  const fields = card?.normalizedFields ?? card?.extractedFields ?? {};
  const summary = card?.readableSummary;
  const confidence = card?.fieldConfidence ?? {};
  const items = [
    fieldFromLayer(
      "eventName",
      "Tên hoạt động",
      [fields.event_name, fields.eventName, summary?.eventName],
      "SmartReader gợi ý",
    ),
    fieldFromLayer(
      "organizer",
      "Đơn vị xác nhận",
      [fields.organizer, summary?.organizer, summary?.organizerName],
      "SmartReader gợi ý",
    ),
    fieldFromLayer(
      "organizerLevel",
      "Cấp tổ chức",
      [fields.organizer_level, fields.organizerLevel],
      "SmartReader gợi ý",
    ),
    fieldFromLayer(
      "activityDate",
      "Ngày hoạt động",
      [fields.activity_date, fields.activityDate, summary?.activityTime, summary?.time],
      "SmartReader gợi ý",
    ),
    fieldFromLayer(
      "issueDate",
      "Ngày cấp",
      [fields.issue_date, fields.issueDate, summary?.issueDate],
      "SmartReader gợi ý",
    ),
    fieldFromLayer("studentName", "Họ tên", [profile.studentName, primary.studentName], "Hồ sơ"),
    fieldFromLayer("studentCode", "MSSV", [profile.studentCode, primary.studentCode], "Hồ sơ"),
    fieldFromLayer("className", "Lớp", [profile.className, primary.className], "Hồ sơ"),
    fieldFromLayer("faculty", "Khoa", [profile.faculty, primary.faculty], "Hồ sơ"),
    fieldFromLayer(
      "convertedValue",
      "Giá trị",
      [
        formatConvertedValue(summary?.convertedValue, summary?.convertedUnit),
        fields.converted_value,
        fields.convertedValue,
        fields.volunteer_days,
      ],
      "SmartReader gợi ý",
    ),
  ];

  return items
    .map((item) => ({
      ...item,
      confidence: item.source === "SmartReader gợi ý" ? confidence[item.key] : undefined,
      missing: !item.value,
    }))
    .map((item) =>
      item.source === "SmartReader gợi ý" &&
      typeof item.confidence === "number" &&
      item.confidence < 0.5
        ? { ...item, value: null, missing: true }
        : item,
    );
}

function formatConvertedValue(value: unknown, unit?: string | null) {
  if (value === undefined || value === null || value === "") return null;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function fieldFromLayer(
  key: string,
  label: string,
  values: unknown[],
  source: "Hồ sơ" | "SmartReader gợi ý",
) {
  return {
    key,
    label,
    value: getDisplayValue(values.find((value) => getDisplayValue(value))),
    source,
  };
}

function getAcademicInfo(card?: EvidenceCard | null) {
  const academic = card?.academic;
  if (!academic) return null;
  const userInput = asRecord(academic.userInput);
  const suggestion = asRecord(academic.smartReaderSuggestion);
  const threshold = asRecord(academic.threshold);
  const suggestionValue = getDisplayValue(suggestion?.value);
  const suggestionScale = getDisplayValue(suggestion?.scale) ?? "4";
  const thresholdValue = getDisplayValue(threshold?.value);
  const thresholdScale = getDisplayValue(threshold?.scale) ?? "4";

  return {
    userGpaDisplay: getDisplayValue(userInput?.gpaDisplay ?? userInput?.gpa) ?? "Chưa nhập",
    suggestionDisplay: suggestionValue ? `${suggestionValue}/${suggestionScale}` : null,
    suggestionConfidence:
      typeof suggestion?.confidence === "number" ? suggestion.confidence : undefined,
    thresholdDisplay: thresholdValue ? `${thresholdValue}/${thresholdScale}` : "Chưa có ngưỡng",
    message:
      getDisplayValue(academic.message) ??
      "SmartReader chỉ tạo gợi ý. Vui lòng xác nhận trước khi dùng để tiền kiểm.",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getDisplayValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return formatDateText(value) ?? mapOrganizerLevel(value) ?? value;
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    return getDisplayValue(record.display ?? record.label ?? record.value ?? record.raw);
  }
  return null;
}

function formatDateText(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  const dateWithOptionalTime = trimmed.match(
    /^(?:\d{1,2}:\d{2}\s*)?(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
  );
  if (!dateWithOptionalTime) return null;
  const [, day, month, year] = dateWithOptionalTime;
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

function mapOrganizerLevel(value: string) {
  const labels: Record<string, string> = {
    school: "Cấp Trường",
    university: "Cấp Đại học",
    city: "Cấp Thành phố",
    central: "Cấp Trung ương",
    faculty: "Cấp Khoa",
    club: "CLB/Đội/Nhóm",
    external: "Đơn vị ngoài trường",
    unknown: "Chưa xác định",
  };
  return labels[value] ?? null;
}

function criterionLabel(value: string) {
  const labels: Record<string, string> = {
    ethics: "Đạo đức tốt",
    academic: "Học tập tốt",
    physical: "Thể lực tốt",
    volunteer: "Tình nguyện tốt",
    integration: "Hội nhập tốt",
  };
  return labels[value] ?? value;
}

function normalizeCompare(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/đ/g, "d")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  const warnings = normalizeWarnings(card?.warnings ?? card?.warningsJson);
  const hasConflict = warnings.includes("event_name_mismatch_with_user_input");
  const code =
    card?.matchingStatus?.code ??
    (sourceType === "event_import" ? "official_match_found" : "official_match_not_found");

  if (hasConflict) {
    return {
      label: "Có điểm chưa khớp",
      tone: "warning" as const,
      message: "Tên hệ thống đọc được khác tên bạn đã nhập, cần cán bộ kiểm tra.",
      eventName: card?.matchingStatus?.matchedEventName ?? card?.matchingStatus?.eventName ?? null,
    };
  }

  if (code === "official_match_found" || sourceType === "event_import") {
    return {
      label: "Đã khớp kho chính thức",
      tone: "success" as const,
      message:
        card?.matchingStatus?.message ?? studentEvidenceStatusMap.official_match_found.message,
      eventName: card?.matchingStatus?.matchedEventName ?? card?.matchingStatus?.eventName ?? null,
    };
  }

  if (sourceType === "manual_upload") {
    return {
      label: "Minh chứng tự tải lên",
      tone: "neutral" as const,
      message: "Chưa đối chiếu với danh sách chính thức.",
      eventName: null,
    };
  }

  if (code === "similar_name_found") {
    return {
      label: "Có hoạt động tương tự",
      tone: "info" as const,
      message: card?.matchingStatus?.message ?? studentEvidenceStatusMap.similar_name_found.message,
      eventName: card?.matchingStatus?.matchedEventName ?? card?.matchingStatus?.eventName ?? null,
    };
  }

  return {
    label: "Chưa khớp danh sách chính thức",
    tone: "warning" as const,
    message:
      card?.matchingStatus?.message ?? studentEvidenceStatusMap.official_match_not_found.message,
    eventName: card?.matchingStatus?.matchedEventName ?? card?.matchingStatus?.eventName ?? null,
  };
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
