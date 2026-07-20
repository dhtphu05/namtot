import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FilePlus2,
  Pencil,
  RefreshCw,
  Save,
} from "lucide-react";
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
  confirmationMode?: boolean;
  onSaveCorrections?: (
    fields: Record<string, unknown>,
    expectedUpdatedAt?: string,
  ) => Promise<void>;
  savingCorrections?: boolean;
  onConfirm?: (expectedUpdatedAt?: string) => Promise<void>;
  confirming?: boolean;
  onRunPrecheck?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  confirmationMode,
  onSaveCorrections,
  savingCorrections,
  onConfirm,
  confirming,
  onRunPrecheck,
  onDirtyChange,
}: EvidenceCardPanelProps) {
  const status = getStudentEvidenceStatus(evidence, card);
  const userFields = getUserProvidedFields(evidence, card);
  const extractedFields = getExtractedReadableFields(card);
  const academic = getAcademicInfo(card);
  const suggestionSource = getSuggestionSource(card);
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
  const showConfirmationWorkspace =
    Boolean(card?.fieldDetails?.length) &&
    evidence.sourceType !== "event_import" &&
    (confirmationMode ||
      card?.confirmationStatus === "pending" ||
      card?.confirmationStatus === "correction_required" ||
      card?.confirmationStatus === "confirmed");

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

      {showConfirmationWorkspace ? (
        <ConfirmationWorkspace
          card={card}
          onSaveCorrections={onSaveCorrections}
          savingCorrections={savingCorrections}
          onConfirm={onConfirm}
          confirming={confirming}
          onRunPrecheck={onRunPrecheck}
          onDirtyChange={onDirtyChange}
        />
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
        <h3 className="font-semibold text-foreground">{suggestionSource}</h3>
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
              label={`GPA ${suggestionSource.toLowerCase()}`}
              value={academic.suggestionDisplay}
              source={suggestionSource}
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

function ConfirmationWorkspace({
  card,
  onSaveCorrections,
  savingCorrections,
  onConfirm,
  confirming,
  onRunPrecheck,
  onDirtyChange,
}: {
  card?: EvidenceCard | null;
  onSaveCorrections?: (
    fields: Record<string, unknown>,
    expectedUpdatedAt?: string,
  ) => Promise<void>;
  savingCorrections?: boolean;
  onConfirm?: (expectedUpdatedAt?: string) => Promise<void>;
  confirming?: boolean;
  onRunPrecheck?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const details = useMemo(() => card?.fieldDetails ?? [], [card?.fieldDetails]);
  const initialDraft = useMemo(
    () =>
      Object.fromEntries(
        details.map((field) => [field.key, field.correctedValue ?? field.effectiveValue ?? ""]),
      ),
    [details],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
    setEditing(false);
  }, [card?.id, card?.updatedAt, card?.confirmationStatus, initialDraft]);

  const changedFields = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(draft).filter(
          ([key, value]) => String(value ?? "") !== String(initialDraft[key] ?? ""),
        ),
      ),
    [draft, initialDraft],
  );
  const dirty = Object.keys(changedFields).length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const isConfirmed = card?.confirmationStatus === "confirmed";
  const canSave = Boolean(onSaveCorrections && editing && dirty && card?.canEdit);
  const canConfirm = Boolean(onConfirm && !editing && card?.canConfirm);

  const save = async () => {
    if (!canSave || !onSaveCorrections) return;
    await onSaveCorrections(changedFields, card?.updatedAt);
    setEditing(false);
  };

  const confirm = async () => {
    if (!canConfirm || !onConfirm) return;
    await onConfirm(card?.updatedAt);
  };

  return (
    <section className="rounded-md border border-sky-200 bg-sky-50/40">
      <div className="border-b border-sky-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">
              {isConfirmed ? "Đã xác nhận" : "Kiểm tra thông tin minh chứng"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isConfirmed
                ? "Thông tin này sẽ được dùng cho lần tiền kiểm tiếp theo."
                : "Hệ thống đã đọc nội dung từ tài liệu. Hãy kiểm tra lại trước khi dùng dữ liệu này để tiền kiểm hồ sơ."}
            </p>
            {card?.confirmedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Xác nhận lúc {formatDateTimeLabel(card.confirmedAt)}
              </p>
            ) : null}
          </div>
          <Badge variant="outline" className="bg-background">
            {confirmationStatusLabel(card?.confirmationStatus)}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {groupFieldDetails(details).map((group) => (
          <div key={group.title}>
            <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {group.fields.map((field) => (
                <EditableField
                  key={field.key}
                  field={field}
                  editing={editing}
                  value={draft[field.key]}
                  onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
                  changed={String(draft[field.key] ?? "") !== String(initialDraft[field.key] ?? "")}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 p-4">
        <p className="max-w-xl text-xs text-muted-foreground">
          Xác nhận nghĩa là thông tin phản ánh đúng tài liệu bạn tải lên, không phải minh chứng đã
          được duyệt.
        </p>
        <div className="flex flex-wrap gap-2">
          {isConfirmed && onRunPrecheck ? (
            <Button type="button" variant="outline" size="sm" onClick={onRunPrecheck}>
              Chạy lại tiền kiểm
            </Button>
          ) : null}
          {!editing && !isConfirmed ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
              Chỉnh sửa
            </Button>
          ) : null}
          {editing ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(initialDraft);
                  setEditing(false);
                }}
                disabled={savingCorrections}
              >
                Hủy chỉnh sửa
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void save()}
                disabled={!canSave || savingCorrections}
              >
                <Save className="h-4 w-4" />
                Lưu thay đổi
              </Button>
            </>
          ) : !isConfirmed ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void confirm()}
              disabled={!canConfirm || confirming}
            >
              <CheckCircle2 className="h-4 w-4" />
              Xác nhận thông tin
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EditableField({
  field,
  editing,
  value,
  onChange,
  changed,
}: {
  field: NonNullable<EvidenceCard["fieldDetails"]>[number];
  editing: boolean;
  value: unknown;
  onChange: (value: string) => void;
  changed: boolean;
}) {
  const inputId = `evidence-card-field-${field.key}`;
  return (
    <div className="rounded-md bg-background px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-xs font-medium uppercase text-muted-foreground">
          {field.label}
        </label>
        {changed ? <Badge variant="outline">Đã chỉnh</Badge> : null}
        <ConfidenceBadge confidence={field.confidence} />
      </div>
      {editing && field.editable ? (
        <FieldControl id={inputId} fieldKey={field.key} value={value} onChange={onChange} />
      ) : (
        <div className="mt-1 break-words font-semibold text-foreground">
          {formatFieldDisplay(field.effectiveValue)}
        </div>
      )}
      {changed && field.extractedValue !== null && field.extractedValue !== undefined ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Giá trị hệ thống đọc: {formatFieldDisplay(field.extractedValue)}
        </p>
      ) : null}
      {field.warningCodes?.length ? (
        <p className="mt-1 text-xs text-amber-700">
          {field.warningCodes.map((code) => warningCopy[code] ?? code).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function FieldControl({
  id,
  fieldKey,
  value,
  onChange,
}: {
  id: string;
  fieldKey: string;
  value: unknown;
  onChange: (value: string) => void;
}) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (fieldKey === "organizer_level") {
    return (
      <select
        id={id}
        className="mt-1 min-h-10 w-full rounded-md border bg-background px-3 py-2"
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
      >
        {[
          "",
          "class",
          "faculty",
          "school",
          "university",
          "city",
          "central",
          "club",
          "external",
          "unknown",
        ].map((option) => (
          <option key={option} value={option}>
            {option ? (mapOrganizerLevel(option) ?? option) : "Chưa nhập"}
          </option>
        ))}
      </select>
    );
  }
  const type =
    fieldKey === "issue_date" || fieldKey === "activity_date"
      ? "date"
      : ["volunteer_days", "language_score", "gpa", "conduct_score"].includes(fieldKey)
        ? "number"
        : "text";
  return (
    <input
      id={id}
      type={type}
      className="mt-1 min-h-10 w-full rounded-md border bg-background px-3 py-2"
      value={stringValue}
      step={type === "number" ? "0.1" : undefined}
      min={type === "number" ? 0 : undefined}
      max={fieldKey === "gpa" ? 4 : fieldKey === "conduct_score" ? 100 : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
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
  source:
    | "Hồ sơ"
    | "Sinh viên nhập"
    | "SmartReader gợi ý"
    | "Hệ thống gợi ý"
    | "Kho chính thức"
    | "Cán bộ xác nhận";
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
  const suggestionSource = getSuggestionSource(card);
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
      suggestionSource,
    ),
    fieldFromLayer(
      "organizer",
      "Đơn vị xác nhận",
      [fields.organizer, summary?.organizer, summary?.organizerName],
      suggestionSource,
    ),
    fieldFromLayer(
      "organizerLevel",
      "Cấp tổ chức",
      [fields.organizer_level, fields.organizerLevel],
      suggestionSource,
    ),
    fieldFromLayer(
      "activityDate",
      "Ngày hoạt động",
      [fields.activity_date, fields.activityDate, summary?.activityTime, summary?.time],
      suggestionSource,
    ),
    fieldFromLayer(
      "issueDate",
      "Ngày cấp",
      [fields.issue_date, fields.issueDate, summary?.issueDate],
      suggestionSource,
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
      suggestionSource,
    ),
  ];

  return items
    .map((item) => ({
      ...item,
      confidence: item.source === suggestionSource ? confidence[item.key] : undefined,
      missing: !item.value,
    }))
    .map((item) =>
      item.source === suggestionSource &&
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
  source: "Hồ sơ" | "SmartReader gợi ý" | "Hệ thống gợi ý",
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
      "Hệ thống chỉ tạo gợi ý. Vui lòng xác nhận trước khi dùng để tiền kiểm.",
  };
}

function getSuggestionSource(card?: EvidenceCard | null): "SmartReader gợi ý" | "Hệ thống gợi ý" {
  return card?.provider === "openai" || card?.provider === "mock"
    ? "Hệ thống gợi ý"
    : "SmartReader gợi ý";
}

function groupFieldDetails(fields: NonNullable<EvidenceCard["fieldDetails"]>) {
  const groups = [
    { title: "Người tham gia", keys: ["student_name", "student_code", "class_name", "faculty"] },
    {
      title: "Hoạt động/minh chứng",
      keys: ["event_name", "certificate_type", "organizer", "organizer_level"],
    },
    { title: "Thời gian", keys: ["issue_date", "activity_date"] },
    {
      title: "Kết quả",
      keys: ["volunteer_days", "award_level", "language_score", "gpa", "conduct_score"],
    },
  ];
  return groups
    .map((group) => ({
      title: group.title,
      fields: fields.filter((field) => group.keys.includes(field.key)),
    }))
    .filter((group) => group.fields.length > 0);
}

function confirmationStatusLabel(status?: string | null) {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "correction_required") return "Đã chỉnh, chờ xác nhận";
  if (status === "not_required") return "Không cần xác nhận";
  return "Cần xác nhận";
}

function ConfidenceBadge({ confidence }: { confidence?: number | null }) {
  if (typeof confidence !== "number") return null;
  const label =
    confidence >= 0.85
      ? "Độ tin cậy cao"
      : confidence >= 0.6
        ? "Cần kiểm tra"
        : "Cần xử lý thủ công";
  return (
    <Badge variant="outline" className="border-slate-200 bg-background px-1.5 py-0 text-[10px]">
      {label}
    </Badge>
  );
}

function formatFieldDisplay(value: unknown) {
  return getDisplayValue(value) ?? "Chưa nhập";
}

function formatDateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
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
