import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EvidenceResponse } from "@/lib/api/types";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";
import type { EvidenceCard } from "@/types/evidence";
import {
  getWarningDisplayCopy,
  isVietnameseUiCopy,
  localizeEvidenceValue,
  normalizeWarnings,
  warningCopy,
} from "./evidence-card-utils";
import { EvidenceAuditButton } from "./EvidenceAuditButton";
import {
  getStudentEvidenceStatus,
  studentEvidenceStatusMap,
  type StudentEvidenceStatus,
} from "../utils/studentEvidenceStatus";

type EvidenceCardPanelProps = {
  evidence: EvidenceResponse;
  card?: EvidenceCard | null;
  loadingCard?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
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
  confirmationMode,
  loadingCard,
  onRetry,
  retrying,
  onSaveCorrections,
  savingCorrections,
  onConfirm,
  confirming,
  onRunPrecheck,
  onDirtyChange,
}: EvidenceCardPanelProps) {
  const status = getStudentEvidenceStatus(evidence, card);
  const processingMessage =
    evidence.sourceType === "event_import" ? null : getProcessingMessage(evidence.indexingStatus);
  const extractedFields = getExtractedReadableFields(card);
  const academic = getAcademicInfo(card);
  const missingFields = getMissingFields(card);
  const matchingStatus = getMatchingStatus(card, evidence.sourceType);
  const fieldDetails = card?.fieldDetails ?? [];
  const canShowConfirmation = evidence.sourceType !== "event_import" && fieldDetails.length > 0;
  const hasRecognizedInfo = extractedFields.length > 0 || fieldDetails.length > 0;

  return (
    <div className="space-y-4">
      <StatusSection
        status={status}
        processingMessage={processingMessage}
        onRetry={onRetry}
        retrying={retrying}
      />

      {canShowConfirmation ? (
        <ConfirmationWorkspace
          card={card}
          onSaveCorrections={onSaveCorrections}
          savingCorrections={savingCorrections}
          onConfirm={onConfirm}
          confirming={confirming}
          onRunPrecheck={onRunPrecheck}
          onDirtyChange={onDirtyChange}
          confirmationMode={confirmationMode}
        />
      ) : null}

      {!canShowConfirmation && extractedFields.length ? (
        <ReadableFieldsSection fields={extractedFields} />
      ) : null}

      {loadingCard && !card ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải thông tin nhận diện…
        </p>
      ) : null}
      {!loadingCard && !card && !hasRecognizedInfo ? (
        <section className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Thông tin nhận diện sẽ xuất hiện tại đây khi có dữ liệu từ tài liệu.
        </section>
      ) : null}

      {card?.evidencePrecheck ? <EvidencePrecheckSummary card={card} /> : null}

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="w-full justify-between px-1">
            Thông tin đối chiếu khác
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          {missingFields.length ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-amber-950">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <h3 className="font-semibold">Cần kiểm tra thêm</h3>
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {academic ? <AcademicSummary academic={academic} /> : null}
          <section className="rounded-xl border p-4">
            <h3 className="font-semibold text-foreground">Đối chiếu danh sách chính thức</h3>
            <div className="mt-2 flex flex-wrap items-start gap-2 text-sm">
              <RegistryBadge tone={matchingStatus.tone} label={matchingStatus.label} />
              {matchingStatus.eventName ? (
                <span className="font-medium text-foreground">{matchingStatus.eventName}</span>
              ) : (
                <span className="text-muted-foreground">
                  {isTechnicalCopy(matchingStatus.message)
                    ? "Chưa có thêm thông tin đối chiếu."
                    : matchingStatus.message}
                </span>
              )}
            </div>
          </section>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div>
              <h3 className="font-semibold text-foreground">Lịch sử cập nhật</h3>
              <p className="mt-1 text-sm text-muted-foreground">Các thay đổi trên minh chứng.</p>
            </div>
            <EvidenceAuditButton evidenceId={evidence.id} label="Xem lịch sử" />
          </section>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function ReadableFieldsSection({
  fields,
}: {
  fields: ReturnType<typeof getExtractedReadableFields>;
}) {
  return (
    <section className="rounded-xl border p-4">
      <div>
        <h3 className="font-semibold text-foreground">Thông tin nhận diện</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Các thông tin này giúp bạn đối chiếu với tài liệu; chưa phải kết quả xét duyệt.
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <FieldInfo
            key={field.key}
            label={field.label}
            value={field.value}
            source={field.source}
          />
        ))}
      </div>
    </section>
  );
}

function AcademicSummary({
  academic,
}: {
  academic: NonNullable<ReturnType<typeof getAcademicInfo>>;
}) {
  return (
    <section className="rounded-xl border p-4">
      <h3 className="font-semibold text-foreground">Thông tin học tập</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FieldInfo
          label="Điểm học tập bạn đã nhập"
          value={academic.userGpaDisplay}
          source="Sinh viên nhập"
        />
        <FieldInfo
          label="Điểm học tập được nhận diện"
          value={academic.suggestionDisplay}
          source="Hệ thống nhận diện"
        />
        <FieldInfo
          label="Ngưỡng tham chiếu"
          value={academic.thresholdDisplay}
          source="Kho chính thức"
        />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{academic.message}</p>
    </section>
  );
}

function EvidencePrecheckSummary({ card }: { card: EvidenceCard }) {
  const precheck = card.evidencePrecheck;
  if (!precheck) return null;
  const warnings = precheck.warnings ?? [];
  const suggestedCriteria = (card.suggestedCriteria ?? []).filter((item) =>
    isCoreCriterion(item.criterion),
  );
  const missingFields = (precheck.completeness?.missingImportantFields ?? []).map(fieldLabel);
  const availableFacts = precheck.availableFacts ?? [];
  const conductEntries = precheck.documentFacts?.conductEntries ?? [];

  return (
    <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-normal text-sky-800">
            Thông tin từ tài liệu
          </div>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {precheck.identifiedAs?.documentLabel &&
            isVietnameseUiCopy(precheck.identifiedAs.documentLabel)
              ? precheck.identifiedAs?.documentLabel
              : documentTypeLabel(card.documentType)}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {precheck.identifiedAs?.shortDescription &&
            isVietnameseUiCopy(precheck.identifiedAs.shortDescription)
              ? precheck.identifiedAs.shortDescription
              : "Thông tin dưới đây giúp bạn đối chiếu với tài liệu đã tải lên."}
          </p>
        </div>
        <Badge variant="outline" className="bg-background">
          {evidencePrecheckStatusLabel(precheck.status)}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <FieldInfo
          label="Khả năng đọc tài liệu"
          value={qualityLabel(precheck.quality?.level)}
          source="Hệ thống nhận diện"
        />
        <FieldInfo
          label="Đối chiếu thông tin cá nhân"
          value={identityLabel(precheck.identityCheck?.status)}
          source="Hệ thống đối chiếu"
        />
      </div>

      {conductEntries.length ? (
        <div className="mt-3 rounded-lg border bg-background p-3">
          <div className="text-xs font-semibold text-muted-foreground">
            Kết quả rèn luyện nhận diện được
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {conductEntries.slice(0, 6).map((entry, index) => (
              <FieldInfo
                key={`${entry.semester ?? "hk"}-${entry.schoolYear ?? index}`}
                label={
                  [entry.semester ? `Học kỳ ${entry.semester}` : null, entry.schoolYear]
                    .filter(Boolean)
                    .join(" - ") || "Kết quả"
                }
                value={[entry.score ?? null, localizeEvidenceValue(entry.classification)]
                  .filter((part) => part !== null && part !== undefined && part !== "")
                  .join(" - ")}
                source="Hệ thống nhận diện"
              />
            ))}
          </div>
        </div>
      ) : availableFacts.length ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {availableFacts.slice(0, 6).map((fact, index) => (
            <FieldInfo
              key={`${fact.key ?? "fact"}-${index}`}
              label={precheckFactLabel(fact.key, fact.label)}
              value={localizeEvidenceValue(fact.displayValue)}
              source="Hệ thống nhận diện"
            />
          ))}
        </div>
      ) : null}

      {missingFields.length ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Cần kiểm tra thêm: {missingFields.map(fieldLabel).join(", ")}.
        </div>
      ) : null}

      {warnings.length ? (
        <ul className="mt-3 space-y-1 text-sm text-amber-950">
          {warnings.slice(0, 3).map((warning, index) => (
            <li key={`${warning.code ?? "warning"}-${index}`} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{getWarningDisplayCopy(warning.code, warning.friendlyMessage)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {suggestedCriteria.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {suggestedCriteria.slice(0, 2).map((item, index) => (
            <span
              key={`${item.criterion ?? "criterion"}-${index}`}
              className="rounded-full border border-sky-200 bg-background px-2.5 py-1 text-sky-900"
            >
              Có thể liên quan: {criterionLabel(String(item.criterion))}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        Đây chỉ là thông tin hỗ trợ đối chiếu, không phải kết quả duyệt minh chứng.
      </p>
    </section>
  );
}

function StatusSection({
  status,
  processingMessage,
  onRetry,
  retrying,
}: {
  status: StudentEvidenceStatus;
  processingMessage?: string | null;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const message =
    processingMessage ??
    (status.key === "unreadable_file" && !onRetry
      ? "Không đọc rõ tài liệu. Bạn vẫn có thể xem tệp và thông tin đã có trong hồ sơ."
      : isTechnicalCopy(status.message)
        ? studentEvidenceStatusMap[status.key].message
        : status.message);

  return (
    <section className="rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {processingMessage ? (
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Đang xử lý
            </Badge>
          ) : (
            <StatusBadge status={status} />
          )}
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" onClick={onRetry} disabled={retrying}>
            {retrying ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Thử xử lý lại
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function getProcessingMessage(status?: string | null) {
  if (status === "uploaded" || status === "pending_indexing") {
    return "Tài liệu đã được nhận và đang chờ xử lý.";
  }
  if (status === "ocr_processing" || status === "processing") {
    return "Hệ thống đang đọc nội dung tài liệu.";
  }
  if (status === "extracting" || status === "extracting_fields") {
    return "Hệ thống đang tổng hợp thông tin nhận diện.";
  }
  if (status === "checking_registry") {
    return "Hệ thống đang đối chiếu danh sách chính thức.";
  }
  return null;
}

function ConfirmationWorkspace({
  card,
  confirmationMode,
  onSaveCorrections,
  savingCorrections,
  onConfirm,
  confirming,
  onRunPrecheck,
  onDirtyChange,
}: {
  card?: EvidenceCard | null;
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
}) {
  const details = useMemo(() => card?.fieldDetails ?? [], [card?.fieldDetails]);
  const fieldsContainerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!editing) return;
    fieldsContainerRef.current
      ?.querySelector<HTMLInputElement | HTMLSelectElement>(
        "input:not([disabled]), select:not([disabled])",
      )
      ?.focus();
  }, [editing]);

  const isConfirmed = card?.confirmationStatus === "confirmed";
  const canEditFields = Boolean(
    onSaveCorrections && card?.canEdit && !isConfirmed && details.some((field) => field.editable),
  );
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
    <section
      id="evidence-confirmation-workspace"
      className={`scroll-mt-4 rounded-xl border border-sky-200 bg-sky-50/40 ${
        confirmationMode ? "ring-2 ring-primary/20" : ""
      }`}
    >
      <div className="border-b border-sky-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">
              {isConfirmed ? "Bạn đã xác nhận thông tin" : "Thông tin nhận diện"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isConfirmed
                ? "Minh chứng đã được lưu trong hồ sơ của bạn."
                : "Thông tin nhận diện có thể chưa chính xác. Hãy đối chiếu với tài liệu trước khi xác nhận."}
            </p>
            {card?.confirmedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Xác nhận lúc {formatDateTimeLabel(card.confirmedAt)}
              </p>
            ) : null}
          </div>
          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
            {!isConfirmed && canEditFields && !editing ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full gap-2 border-primary/30 bg-background text-primary hover:bg-primary/5 sm:w-auto"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Chỉnh sửa thông tin nhận diện
              </Button>
            ) : editing ? (
              <p role="status" className="text-sm font-medium text-primary">
                Đang chỉnh sửa thông tin nhận diện
              </p>
            ) : null}
            <Badge variant="outline" className="bg-background">
              {confirmationStatusLabel(card?.confirmationStatus)}
            </Badge>
          </div>
        </div>
      </div>

      {!isConfirmed && canEditFields ? (
        <div className="mx-4 mt-4 flex flex-col items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Hệ thống có thể nhận diện chưa đúng. Hãy kiểm tra thông tin bên cạnh ảnh minh chứng.
            </p>
          </div>
        </div>
      ) : null}

      <div ref={fieldsContainerRef} className="space-y-4 p-4">
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

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background p-4">
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
                <Save className="h-4 w-4" aria-hidden="true" />
                {savingCorrections ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
            </>
          ) : !isConfirmed && canConfirm ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void confirm()}
              disabled={!canConfirm || confirming}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {confirming ? "Đang xác nhận…" : "Xác nhận thông tin"}
            </Button>
          ) : null}
        </div>
      </div>
      {!isConfirmed && !canEditFields && !canConfirm ? (
        <p className="border-t border-sky-100 px-4 py-3 text-xs text-muted-foreground">
          Minh chứng đang ở chế độ chỉ xem. Thông tin nhận diện không đồng nghĩa minh chứng đã được
          duyệt.
        </p>
      ) : null}
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
  const hasSavedCorrection =
    field.correctedValue !== null &&
    field.correctedValue !== undefined &&
    String(field.correctedValue) !== String(field.extractedValue ?? "");
  return (
    <div className="rounded-md bg-background px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-xs font-medium uppercase text-muted-foreground">
          {isVietnameseUiCopy(field.label) ? field.label : fieldLabel(field.key)}
        </label>
        {changed ? <Badge variant="outline">Đã chỉnh</Badge> : null}
      </div>
      {editing && field.editable ? (
        <FieldControl id={inputId} fieldKey={field.key} value={value} onChange={onChange} />
      ) : (
        <div className="mt-1 break-words font-semibold text-foreground">
          {formatFieldDisplay(field.effectiveValue)}
        </div>
      )}
      {(changed || hasSavedCorrection) &&
      field.extractedValue !== null &&
      field.extractedValue !== undefined ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Giá trị nhận diện ban đầu: {formatFieldDisplay(field.extractedValue)}
        </p>
      ) : null}
      {field.warningCodes?.length ? (
        <p className="mt-1 text-xs text-amber-700">
          {field.warningCodes.map((code) => getWarningDisplayCopy(code)).join(" ")}
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

function StatusBadge({ status }: { status: StudentEvidenceStatus }) {
  const label = isTechnicalCopy(status.label)
    ? studentEvidenceStatusMap[status.key].label
    : status.label;
  const className = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-sky-200 bg-sky-50 text-sky-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
  }[status.tone];

  return (
    <Badge className={className} variant="outline">
      {label}
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
}: {
  label: string;
  value?: string | null;
  source?:
    | "Hồ sơ"
    | "Sinh viên nhập"
    | "Hệ thống nhận diện"
    | "Hệ thống đối chiếu"
    | "Kho chính thức"
    | "Kho sự kiện"
    | "Cán bộ xác nhận";
}) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
      <div>
        <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      </div>
      <div className="mt-1 break-words font-semibold text-foreground">
        {value || "Chưa tìm thấy thông tin này trong tài liệu."}
      </div>
    </div>
  );
}

function getExtractedReadableFields(card?: EvidenceCard | null) {
  const suggestionSource = getSuggestionSource(card);
  const primary = card?.primaryFields ?? {};
  const profile = card?.studentProfileFields ?? {};
  const fields =
    card?.normalizedFields ??
    card?.extractedFields ??
    asRecord(card?.normalizedFieldsJson) ??
    asRecord(card?.extractedFieldsJson) ??
    {};
  const summary = card?.readableSummary;
  const items = [
    fieldFromLayer(
      "student_name",
      "Họ tên",
      [fields.student_name, fields.studentName, profile.studentName, primary.studentName],
      suggestionSource,
    ),
    fieldFromLayer(
      "student_code",
      "MSSV",
      [fields.student_code, fields.studentCode, profile.studentCode, primary.studentCode],
      suggestionSource,
    ),
    fieldFromLayer(
      "class_name",
      "Lớp",
      [fields.class_name, fields.className, profile.className, primary.className],
      suggestionSource,
    ),
    fieldFromLayer(
      "faculty",
      "Khoa/Trường",
      [fields.faculty, profile.faculty, primary.faculty],
      suggestionSource,
    ),
    fieldFromLayer(
      "event_name",
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
      "certificate_type",
      "Loại minh chứng",
      [fields.certificate_type, fields.certificateType],
      suggestionSource,
    ),
    fieldFromLayer(
      "activity_date",
      "Ngày hoạt động",
      [fields.activity_date, fields.activityDate, summary?.activityTime, summary?.time],
      suggestionSource,
    ),
    fieldFromLayer(
      "issue_date",
      "Ngày cấp",
      [fields.issue_date, fields.issueDate, summary?.issueDate],
      suggestionSource,
    ),
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

  const layerItems = items.filter((item) => Boolean(item.value));

  if (layerItems.length > 0) return layerItems;

  return (card?.evidencePrecheck?.availableFacts ?? [])
    .map((fact) => ({
      key: fact.key ?? fact.label ?? "",
      label: precheckFactLabel(fact.key, fact.label),
      value: getDisplayValue(fact.displayValue),
      source: suggestionSource,
    }))
    .filter((item) => item.key && item.value)
    .slice(0, 8);
}

function formatConvertedValue(value: unknown, unit?: string | null) {
  if (value === undefined || value === null || value === "") return null;
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function fieldFromLayer(
  key: string,
  label: string,
  values: unknown[],
  source: "Hồ sơ" | "Hệ thống nhận diện" | "Kho sự kiện",
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
    thresholdDisplay: thresholdValue ? `${thresholdValue}/${thresholdScale}` : "Chưa có ngưỡng",
    message:
      (isVietnameseUiCopy(getDisplayValue(academic.message))
        ? getDisplayValue(academic.message)
        : null) ?? "Hệ thống chỉ tạo gợi ý. Vui lòng xác nhận trước khi dùng để tiền kiểm.",
  };
}

function getSuggestionSource(card?: EvidenceCard | null): "Hệ thống nhận diện" | "Kho sự kiện" {
  return card?.provider === "event_registry" ? "Kho sự kiện" : "Hệ thống nhận diện";
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
  const groupedFields = new Set(groups.flatMap((group) => group.keys));
  const results = groups
    .map((group) => ({
      title: group.title,
      fields: fields.filter((field) => group.keys.includes(field.key)),
    }))
    .filter((group) => group.fields.length > 0);
  const otherFields = fields.filter((field) => !groupedFields.has(field.key));
  return otherFields.length
    ? [...results, { title: "Thông tin khác", fields: otherFields }]
    : results;
}

function confirmationStatusLabel(status?: string | null) {
  if (status === "confirmed") return "Đã xác nhận";
  if (status === "correction_required") return "Đã chỉnh, chờ xác nhận";
  if (status === "not_required") return "Không cần xác nhận";
  return "Cần xác nhận";
}

function evidencePrecheckStatusLabel(status?: string | null) {
  if (status === "ready_for_confirmation") return "Sẵn sàng xác nhận";
  if (status === "file_not_readable") return "Tệp khó đọc";
  if (status === "insufficient_information") return "Thiếu thông tin";
  if (status === "possible_mismatch") return "Cần đối chiếu";
  if (status === "needs_attention") return "Cần kiểm tra";
  return "Đã có thông tin đối chiếu";
}

function documentTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    conduct_result: "Kết quả rèn luyện",
    student_healthy_certificate: "Chứng nhận Sinh viên khỏe",
    volunteer_certificate: "Minh chứng tình nguyện",
    activity_certificate: "Giấy chứng nhận hoạt động",
    award_certificate: "Giấy khen/giải thưởng",
    academic_result: "Kết quả học tập",
    research_achievement: "Thành tích nghiên cứu",
    international_exchange: "Minh chứng hội nhập",
    participant_confirmation: "Xác nhận tham gia",
    certificate: "Giấy chứng nhận",
    award: "Giấy khen/giải thưởng",
    transcript: "Bảng điểm",
    language_certificate: "Chứng chỉ ngoại ngữ",
    participant_list: "Danh sách tham gia",
    other: "Tài liệu minh chứng",
  };
  const normalizedType = type
    ?.trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalizedType ? (labels[normalizedType] ?? "Tài liệu minh chứng") : "Tài liệu minh chứng";
}

function qualityLabel(level?: string | null) {
  if (level === "clear") return "Rõ";
  if (level === "poor") return "Khó đọc";
  if (level === "needs_check") return "Cần kiểm tra";
  return "Chưa rõ";
}

function identityLabel(status?: string | null) {
  if (status === "matched") return "Có thông tin khớp";
  if (status === "missing") return "Thiếu thông tin";
  if (status === "possible_mismatch") return "Có thể chưa khớp";
  if (status === "not_applicable") return "Không áp dụng";
  return "Chưa rõ";
}

function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    student_name: "họ tên",
    student_code: "mã sinh viên",
    class_name: "lớp",
    faculty: "khoa",
    event_name: "tên hoạt động",
    organizer: "đơn vị tổ chức",
    organizer_level: "cấp tổ chức",
    issue_date: "ngày cấp",
    activity_date: "ngày tham gia",
    award_level: "mức giải thưởng",
    volunteer_days: "số ngày tham gia",
    certificate_type: "loại chứng nhận",
    language_score: "điểm ngoại ngữ",
    gpa: "Điểm học tập",
    conduct_score: "điểm rèn luyện",
  };
  return labels[key] ?? (looksLikeInternalCode(key) ? "thông tin liên quan" : "Thông tin khác");
}

function precheckFactLabel(key?: string, label?: string) {
  if (key) {
    const knownLabel = fieldLabel(key);
    if (knownLabel !== "Thông tin khác" && knownLabel !== "thông tin liên quan") return knownLabel;
  }
  return label && isVietnameseUiCopy(label) ? label : "Thông tin nhận diện";
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
  if (typeof value === "string") {
    return formatDateText(value) ?? mapOrganizerLevel(value) ?? localizeEvidenceValue(value);
  }
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
  return getCoreCriterionLabel(value);
}

function getMissingFields(card?: EvidenceCard | null) {
  if (Array.isArray(card?.missingFields) && card.missingFields.length) {
    return card.missingFields.map(displayMissingField).filter(Boolean);
  }

  const warnings = normalizeWarnings(card?.warnings ?? card?.warningsJson);
  return warnings
    .filter((warning) => warning.startsWith("missing_"))
    .map((warning) => warningCopy[warning] ?? null)
    .filter((warning): warning is string => Boolean(warning))
    .map((warning) => {
      if (warning.includes("số ngày")) return "Thiếu số ngày tham gia";
      if (warning.includes("ngày cấp") || warning.includes("ngày ký")) return "Thiếu ngày cấp";
      if (warning.includes("đơn vị")) return "Thiếu đơn vị xác nhận";
      if (warning.includes("họ tên")) return "Thiếu họ tên";
      if (warning.includes("MSSV")) return "Thiếu MSSV";
      return warning;
    });
}

function displayMissingField(
  field: NonNullable<EvidenceCard["missingFields"]>[number],
): string | null {
  if (typeof field === "string") {
    if (warningCopy[field]) return warningCopy[field];
    if (fieldLabel(field) !== field) return `Thiếu ${fieldLabel(field)}`;
    return looksLikeInternalCode(field) ? null : field;
  }
  const copy = field.label ?? field.message;
  if (copy && !isTechnicalCopy(copy)) return copy;
  if (field.field && fieldLabel(field.field) !== "thông tin liên quan") {
    return `Thiếu ${fieldLabel(field.field)}`;
  }
  return null;
}

function isCoreCriterion(
  value: unknown,
): value is "ethics" | "academic" | "physical" | "volunteer" | "integration" {
  return ["ethics", "academic", "physical", "volunteer", "integration"].includes(String(value));
}

function looksLikeInternalCode(value: string) {
  return /^[a-z][a-z0-9]*(?:[_-][a-z0-9]+)+$/i.test(value.trim());
}

function isTechnicalCopy(value: string) {
  return (
    looksLikeInternalCode(value) ||
    !isVietnameseUiCopy(value) ||
    /\b(?:ai|ocr|indexing|extraction|pipeline|smartreader)\b/i.test(value)
  );
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
      message: "Tên trong tài liệu khác tên bạn đã nhập. Bạn có thể kiểm tra lại trước khi nộp.",
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
