import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { CheckCircle2, FileUp, ListChecks, Loader2, Search, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { AppButton, EmptyState, ScrollSafeModal } from "@/features/student/components/primitives";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import {
  useCreateEvidence,
  useDeleteEvidence,
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useCheckParticipant,
  useEvents,
  useImportToApplication,
} from "@/features/event/hooks/useEvent";
import type { EventRegistryItem } from "@/features/event/api/event";
import { cn } from "@/lib/utils";
import { studentCriterionLabel } from "./student-evidence-utils";

type AddEvidenceDrawerProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCriterion?: Criterion;
  existingEvidence?: EvidenceResponse | null;
  onCreated: (evidence: EvidenceResponse) => void;
};

type AddMode = "choose" | "event" | "manual";

type ManualValues = {
  evidenceName: string;
  note: string;
  issuer: string;
  occurredAt: string;
  duration: string;
  organizerLevel: string;
};

const maxFileSize = 10 * 1024 * 1024;
const acceptedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const acceptedMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const mainCriteria: Criterion[] = ["ethics", "academic", "physical", "volunteer", "integration"];

const defaultEvidenceName: Record<Criterion, string> = {
  ethics: "Minh chứng Đạo đức tốt",
  academic: "Minh chứng Học tập tốt",
  physical: "Minh chứng Thể lực tốt",
  volunteer: "Minh chứng Tình nguyện tốt",
  integration: "Minh chứng Hội nhập tốt",
  priority: "Minh chứng thành tích ưu tiên",
  collective: "Minh chứng tập thể",
};

export function AddEvidenceDrawer({
  applicationId,
  open,
  onOpenChange,
  initialCriterion = "academic",
  existingEvidence = null,
  onCreated,
}: AddEvidenceDrawerProps) {
  const [mode, setMode] = useState<AddMode>("choose");
  const [criterion, setCriterion] = useState<Criterion>(initialCriterion);
  const [values, setValues] = useState<ManualValues>(() => getInitialValues(initialCriterion));
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [participantChecks, setParticipantChecks] = useState<
    Record<string, { ok: boolean; message?: string; loading?: boolean }>
  >({});
  const [dragActive, setDragActive] = useState(false);
  const [successEvidence, setSuccessEvidence] = useState<EvidenceResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studentCode = useAuth((state) => state.user?.studentCode);

  const createEvidence = useCreateEvidence(applicationId);
  const rollbackEvidence = useDeleteEvidence(applicationId);
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const checkParticipant = useCheckParticipant();
  const importEvent = useImportToApplication();
  const eventsQuery = useEvents({
    search: eventSearch || undefined,
    criterion,
    limit: 8,
  });

  const eventResults = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const isSubmitting =
    createEvidence.isPending ||
    uploadFile.isPending ||
    startIndexing.isPending ||
    rollbackEvidence.isPending;
  const isEventBusy = checkParticipant.isPending || importEvent.isPending;
  const criterionLabel = studentCriterionLabel[criterion] ?? "tiêu chí này";

  useEffect(() => {
    if (!open) return;
    const nextCriterion = existingEvidence?.criterion ?? initialCriterion;
    setMode("choose");
    setCriterion(nextCriterion);
    setValues({
      ...getInitialValues(nextCriterion),
      evidenceName: existingEvidence?.evidenceName ?? defaultEvidenceName[nextCriterion],
      note: typeof existingEvidence?.note === "string" ? existingEvidence.note : "",
    });
    setFile(null);
    setFormError("");
    setEventSearch("");
    setParticipantChecks({});
    setSuccessEvidence(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [existingEvidence, initialCriterion, open]);

  const setField = (key: keyof ManualValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFormError("");
  };

  const handleFileChange = (nextFile?: File | null) => {
    if (!nextFile) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const validationError = validateEvidenceFile(nextFile);
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(nextFile);
    setFormError("");
  };

  const submitManual = async () => {
    const validationError = validateManual(values, criterion, file);
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    let created: EvidenceResponse | null = null;
    let uploadSucceeded = false;
    try {
      const createdEvidence = await createEvidence.mutateAsync({
        applicationId,
        data: {
          evidenceName: values.evidenceName.trim(),
          criterion,
          sourceType: "manual_upload",
          description: buildDescription(values),
          note: values.note.trim() || undefined,
          metadata: {
            criterion,
            entryMode: "manual",
            issuer: values.issuer,
            occurredAt: values.occurredAt,
            duration: values.duration,
            organizerLevel: values.organizerLevel,
          },
        },
      });
      created = createdEvidence as unknown as EvidenceResponse;

      const uploaded = await uploadFile.mutateAsync({
        evidenceId: createdEvidence.id,
        applicationId,
        file: file as File,
      });
      uploadSucceeded = true;

      let latest = mergeEvidenceAfterUpload(created, uploaded.res as EvidenceResponse | undefined);
      if (!latest.jobId) {
        try {
          const indexed = await startIndexing.mutateAsync({ evidenceId: createdEvidence.id });
          latest = mergeEvidenceAfterUpload(latest, indexed as EvidenceResponse | undefined);
        } catch {
          toast.warning("Đã lưu file minh chứng. Hệ thống sẽ kiểm tra lại file sau.");
        }
      }

      setSuccessEvidence(latest);
      onCreated(latest);
      toast.success("Đã ghi nhận minh chứng.");
    } catch {
      if (created?.id && !uploadSucceeded) {
        await rollbackEvidence
          .mutateAsync({ id: created.id, applicationId, silent: true })
          .catch(() => undefined);
      }
      setFormError("Vui lòng kiểm tra tệp và thử lại.");
      toast.error("Chưa lưu được minh chứng. Vui lòng kiểm tra tệp và thử lại.");
    }
  };

  const checkEvent = async (event: EventRegistryItem) => {
    setParticipantChecks((current) => ({
      ...current,
      [event.id]: { ok: false, loading: true },
    }));
    try {
      const result = await checkParticipant.mutateAsync({
        eventId: event.id,
        studentCode: studentCode ?? "",
        applicationId,
      });
      const matched = Boolean(result?.matched);
      setParticipantChecks((current) => ({
        ...current,
        [event.id]: {
          ok: matched,
          loading: false,
          message: matched
            ? "Đã tìm thấy tên bạn trong danh sách"
            : result?.message || "Chưa tìm thấy trong danh sách",
        },
      }));
    } catch {
      setParticipantChecks((current) => ({
        ...current,
        [event.id]: {
          ok: false,
          loading: false,
          message: "Chưa kiểm tra được danh sách. Bạn có thể tải minh chứng riêng.",
        },
      }));
    }
  };

  const importEventEvidence = async (event: EventRegistryItem) => {
    try {
      const imported = await importEvent.mutateAsync({ eventId: event.id, applicationId });
      const evidence = {
        id: event.id,
        applicationId,
        evidenceName: event.eventName,
        criterion: event.criterion ?? criterion,
        sourceType: "event_import",
        status: "indexed",
        indexingStatus: "indexed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(typeof imported === "object" && imported ? imported : {}),
      } as EvidenceResponse;
      setSuccessEvidence(evidence);
      onCreated(evidence);
      toast.success("Đã thêm minh chứng từ danh sách xác nhận.");
    } catch {
      setFormError("Vui lòng thử lại hoặc tải minh chứng riêng.");
      toast.error("Chưa thêm được minh chứng từ danh sách.");
    }
  };

  const footer = successEvidence ? (
    <div className="flex flex-wrap justify-end gap-2">
      <AppButton asChild variant="secondary">
        <a href="/app/application">Kiểm tra hồ sơ</a>
      </AppButton>
      <AppButton
        variant="secondary"
        onClick={() => {
          setSuccessEvidence(null);
          setMode("choose");
          setFile(null);
          setValues(getInitialValues(criterion));
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      >
        Thêm minh chứng khác
      </AppButton>
      <AppButton onClick={() => onOpenChange(false)}>Đóng</AppButton>
    </div>
  ) : (
    <div className="flex flex-wrap justify-end gap-2">
      {mode !== "choose" ? (
        <AppButton variant="ghost" onClick={() => setMode("choose")} disabled={isSubmitting}>
          Quay lại
        </AppButton>
      ) : null}
      <AppButton variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
        Hủy
      </AppButton>
      {mode === "manual" ? (
        <AppButton onClick={() => void submitManual()} disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isSubmitting ? "Đang lưu..." : "Lưu minh chứng"}
        </AppButton>
      ) : null}
    </div>
  );

  return (
    <ScrollSafeModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Thêm minh chứng cho ${criterionLabel}`}
      description="Chọn minh chứng đã được xác nhận hoặc tải file riêng của bạn."
      widthClassName="max-w-3xl"
      footer={footer}
    >
      {successEvidence ? (
        <EmptyState
          title="Đã ghi nhận minh chứng"
          description={`Minh chứng đã được thêm vào tiêu chí ${
            studentCriterionLabel[successEvidence.criterion] ?? criterionLabel
          }.`}
        />
      ) : (
        <div className="space-y-5">
          {mode === "choose" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <OptionCard
                icon={<ListChecks className="h-5 w-5" />}
                title="Tìm trong danh sách đã xác nhận"
                description="Dành cho hoạt động hoặc sự kiện đã có danh sách từ Đoàn - Hội."
                cta="Tìm minh chứng"
                onClick={() => setMode("event")}
              />
              <OptionCard
                icon={<UploadCloud className="h-5 w-5" />}
                title="Tải minh chứng mới"
                description="Dành cho giấy chứng nhận, ảnh, PDF hoặc file riêng của bạn."
                cta="Tải lên"
                onClick={() => setMode("manual")}
              />
            </div>
          ) : null}

          {mode === "event" ? (
            <EventImportStep
              criterion={criterion}
              setCriterion={setCriterion}
              eventSearch={eventSearch}
              setEventSearch={setEventSearch}
              eventResults={eventResults}
              loading={eventsQuery.isLoading || eventsQuery.isFetching}
              participantChecks={participantChecks}
              isEventBusy={isEventBusy}
              onCheck={checkEvent}
              onImport={importEventEvidence}
              onManual={() => setMode("manual")}
            />
          ) : null}

          {mode === "manual" ? (
            <ManualUploadStep
              criterion={criterion}
              setCriterion={(nextCriterion) => {
                setCriterion(nextCriterion);
                setValues((current) => ({
                  ...current,
                  evidenceName: current.evidenceName || defaultEvidenceName[nextCriterion] || "",
                }));
              }}
              values={values}
              setField={setField}
              file={file}
              fileInputRef={fileInputRef}
              formError={formError}
              isSubmitting={isSubmitting}
              dragActive={dragActive}
              setDragActive={setDragActive}
              onFileChange={handleFileChange}
            />
          ) : null}
        </div>
      )}
    </ScrollSafeModal>
  );
}

function OptionCard({
  icon,
  title,
  description,
  cta,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#0057C2] hover:bg-[#F8FBFE]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F7FD] text-[#0057C2]">
        {icon}
      </span>
      <h3 className="mt-3 line-clamp-2 text-base font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 line-clamp-3 text-sm leading-5 text-[var(--text-secondary)]">
        {description}
      </p>
      <span className="mt-4 inline-flex text-sm font-bold text-[#0057C2]">{cta}</span>
    </button>
  );
}

function EventImportStep({
  criterion,
  setCriterion,
  eventSearch,
  setEventSearch,
  eventResults,
  loading,
  participantChecks,
  isEventBusy,
  onCheck,
  onImport,
  onManual,
}: {
  criterion: Criterion;
  setCriterion: (criterion: Criterion) => void;
  eventSearch: string;
  setEventSearch: (value: string) => void;
  eventResults: EventRegistryItem[];
  loading: boolean;
  participantChecks: Record<string, { ok: boolean; message?: string; loading?: boolean }>;
  isEventBusy: boolean;
  onCheck: (event: EventRegistryItem) => void;
  onImport: (event: EventRegistryItem) => void;
  onManual: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="min-w-0">
          <span className="text-sm font-bold text-[var(--text-primary)]">Tìm minh chứng</span>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={eventSearch}
              onChange={(event) => setEventSearch(event.target.value)}
              placeholder="Nhập tên hoạt động, cuộc thi, giấy chứng nhận..."
              className="w-full min-w-0 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0057C2]"
            />
          </div>
        </label>
        <label>
          <span className="text-sm font-bold text-[var(--text-primary)]">Tiêu chí</span>
          <select
            value={criterion}
            onChange={(event) => setCriterion(event.target.value as Criterion)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0057C2]"
          >
            {mainCriteria.map((item) => (
              <option key={item} value={item}>
                {studentCriterionLabel[item]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tìm trong danh sách đã xác nhận...
        </div>
      ) : eventResults.length ? (
        <div className="space-y-3">
          {eventResults.map((event) => {
            const check = participantChecks[event.id];
            return (
              <div key={event.id} className="min-w-0 rounded-2xl border border-slate-200 p-3">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-bold text-[var(--text-primary)]">
                      {event.eventName}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">
                      {event.organizer || "Đơn vị tổ chức chưa cập nhật"}
                      {event.startDate
                        ? ` · ${new Date(event.startDate).toLocaleDateString("vi-VN")}`
                        : ""}
                    </p>
                    {check?.message ? (
                      <p
                        className={cn(
                          "mt-2 flex items-center gap-1 text-xs font-semibold",
                          check.ok ? "text-emerald-700" : "text-amber-700",
                        )}
                      >
                        {check.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                        {check.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <AppButton
                      size="sm"
                      variant="secondary"
                      disabled={isEventBusy || check?.loading}
                      onClick={() => void onCheck(event)}
                    >
                      {check?.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ListChecks className="h-4 w-4" />
                      )}
                      Kiểm tra tên
                    </AppButton>
                    {check?.ok ? (
                      <AppButton
                        size="sm"
                        disabled={isEventBusy}
                        onClick={() => void onImport(event)}
                      >
                        Thêm vào hồ sơ
                      </AppButton>
                    ) : (
                      <AppButton size="sm" variant="ghost" onClick={onManual}>
                        Tải minh chứng riêng
                      </AppButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          variant="noData"
          title="Chưa tìm thấy minh chứng phù hợp"
          description="Bạn có thể thử từ khóa khác hoặc tải minh chứng riêng để cán bộ kiểm tra."
          primaryAction={
            <AppButton size="sm" variant="secondary" onClick={onManual}>
              Tải minh chứng riêng
            </AppButton>
          }
        />
      )}
    </div>
  );
}

function ManualUploadStep({
  criterion,
  setCriterion,
  values,
  setField,
  file,
  fileInputRef,
  formError,
  isSubmitting,
  dragActive,
  setDragActive,
  onFileChange,
}: {
  criterion: Criterion;
  setCriterion: (criterion: Criterion) => void;
  values: ManualValues;
  setField: (key: keyof ManualValues, value: string) => void;
  file: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  formError: string;
  isSubmitting: boolean;
  dragActive: boolean;
  setDragActive: (value: boolean) => void;
  onFileChange: (file?: File | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Tên minh chứng" required>
          <input
            value={values.evidenceName}
            onChange={(event) => setField("evidenceName", event.target.value)}
            disabled={isSubmitting}
            placeholder="Ví dụ: Giấy chứng nhận Sinh viên khỏe"
            className={fieldInputClass}
          />
        </Field>
        <Field label="Tiêu chí" required>
          <select
            value={criterion}
            onChange={(event) => setCriterion(event.target.value as Criterion)}
            disabled={isSubmitting}
            className={fieldInputClass}
          >
            {mainCriteria.map((item) => (
              <option key={item} value={item}>
                {studentCriterionLabel[item]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Tệp minh chứng" required>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedExtensions.join(",")}
          disabled={isSubmitting}
          onChange={(event) => onFileChange(event.target.files?.[0])}
        />
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "rounded-2xl border border-dashed px-4 py-6 text-center transition-colors",
            dragActive ? "border-[#0057C2] bg-[#F1F7FD]" : "border-[#B8CEE8] bg-[#F8FBFE]",
          )}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            onFileChange(event.dataTransfer.files?.[0]);
          }}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-[#0057C2]" />
          <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">
            {file ? file.name : "Chọn hoặc kéo tệp vào đây"}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            Hỗ trợ PDF, PNG, JPG, JPEG, WEBP. Tối đa 10MB.
          </div>
        </div>
        {file ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-[#F1F7FD] px-3 py-2 text-sm text-[#0057C2]">
            <span className="min-w-0 truncate">
              <FileUp className="mr-2 inline h-4 w-4" />
              {file.name}
            </span>
            <button
              type="button"
              className="rounded-lg p-1 hover:bg-white"
              onClick={() => onFileChange(null)}
              disabled={isSubmitting}
              aria-label="Bỏ chọn tệp"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </Field>

      <Field label="Ghi chú cho cán bộ nếu cần">
        <textarea
          value={values.note}
          onChange={(event) => setField("note", event.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder="Ví dụ: File gồm giấy xác nhận và danh sách tham gia."
          className={`${fieldInputClass} resize-none`}
        />
      </Field>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-bold text-[var(--text-primary)]">
          Bổ sung thông tin nếu có
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Đơn vị xác nhận">
            <input
              value={values.issuer}
              onChange={(event) => setField("issuer", event.target.value)}
              disabled={isSubmitting}
              className={fieldInputClass}
            />
          </Field>
          <Field label="Ngày cấp/ngày tham gia">
            <input
              type="date"
              value={values.occurredAt}
              onChange={(event) => setField("occurredAt", event.target.value)}
              disabled={isSubmitting}
              className={fieldInputClass}
            />
          </Field>
          <Field label="Số ngày/số buổi nếu có">
            <input
              value={values.duration}
              onChange={(event) => setField("duration", event.target.value)}
              disabled={isSubmitting}
              className={fieldInputClass}
            />
          </Field>
          <Field label="Cấp tổ chức nếu có">
            <input
              value={values.organizerLevel}
              onChange={(event) => setField("organizerLevel", event.target.value)}
              disabled={isSubmitting}
              className={fieldInputClass}
            />
          </Field>
        </div>
      </details>

      {formError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {formError}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-bold text-[var(--text-primary)]">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const fieldInputClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#0057C2] disabled:bg-slate-50 disabled:text-slate-500";

function getInitialValues(criterion: Criterion): ManualValues {
  return {
    evidenceName: defaultEvidenceName[criterion] ?? "Minh chứng",
    note: "",
    issuer: "",
    occurredAt: "",
    duration: "",
    organizerLevel: "",
  };
}

function validateEvidenceFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  const validType = acceptedMimeTypes.includes(file.type) || acceptedExtensions.includes(extension);
  if (!validType) return "Tệp không đúng định dạng. Vui lòng tải PDF, PNG, JPG, JPEG hoặc WEBP.";
  if (file.size > maxFileSize)
    return "Tệp vượt quá dung lượng cho phép. Vui lòng chọn file tối đa 10MB.";
  return "";
}

function validateManual(values: ManualValues, criterion: Criterion, file: File | null) {
  if (!values.evidenceName.trim()) return "Tên minh chứng là bắt buộc.";
  if (!criterion) return "Vui lòng chọn tiêu chí.";
  if (!file) return "Vui lòng chọn tệp minh chứng.";
  return "";
}

function buildDescription(values: ManualValues) {
  const rows = [
    ["Đơn vị xác nhận", values.issuer],
    ["Ngày cấp/ngày tham gia", values.occurredAt],
    ["Số ngày/số buổi", values.duration],
    ["Cấp tổ chức", values.organizerLevel],
  ]
    .map(([label, value]) => (value?.trim() ? `${label}: ${value.trim()}` : ""))
    .filter(Boolean);
  return rows.join("\n") || undefined;
}

function mergeEvidenceAfterUpload(
  current: EvidenceResponse,
  next?: EvidenceResponse,
): EvidenceResponse {
  if (!next) return current;
  if (next.id) return next;
  const files = Array.isArray(next.files) && next.files.length ? next.files : current.files;
  return {
    ...current,
    fileId: next.fileId ?? current.fileId,
    fileName: next.fileName ?? current.fileName,
    jobId: next.jobId ?? current.jobId,
    indexingStatus: next.indexingStatus ?? current.indexingStatus,
    files,
    updatedAt: next.updatedAt || current.updatedAt,
  };
}
