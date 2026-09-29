import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, ChevronDown, ChevronUp, FileUp, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CriterionIcon } from "@/components/AppIcon";
import type { EvidenceEventSuggestion } from "@/features/event/api/events";
import {
  useEvidenceEventSuggestions,
  useImportOfficialEvent,
  useOfficialEventLibrary,
} from "@/features/event/hooks/useApprovedEvidenceSearch";
import { useCheckEventParticipant } from "@/features/event/hooks/useEvents";
import { getCriterionDisplayLabel } from "@/features/application/presentation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { Criterion, EventParticipantCheck, EvidenceResponse } from "@/lib/api/types";
import {
  useCreateEvidence,
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import { studentEvidenceCriteria } from "./evidence-card-utils";
import {
  EVIDENCE_UPLOAD_ACCEPT,
  EVIDENCE_UPLOAD_LIMIT_MB,
  validateEvidenceUploadFile,
} from "../utils/evidenceLibrary";

type AddEvidenceDrawerProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criterionMode?: "context" | "select";
  initialCriterion?: Criterion;
  initialEvidenceName?: string;
  initialRequirementKey?: string;
  initialRequirementLabel?: string;
  preselectedEventId?: string;
  referenceEvent?: {
    eventId: string;
    title: string;
    criterion?: Criterion;
    approvedUsageCount?: number;
  } | null;
  submitLabel?: string;
  onCreated: (evidence: EvidenceResponse) => void;
};

export function AddEvidenceDrawer({
  applicationId,
  open,
  onOpenChange,
  initialCriterion,
  criterionMode = "context",
  initialEvidenceName = "",
  initialRequirementKey,
  initialRequirementLabel,
  preselectedEventId,
  referenceEvent,
  submitLabel = "Thêm vào hồ sơ",
  onCreated,
}: AddEvidenceDrawerProps) {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const [evidenceName, setEvidenceName] = useState("");
  const [criterion, setCriterion] = useState<Criterion | null>(
    criterionMode === "select" ? (initialCriterion ?? null) : (initialCriterion ?? "academic"),
  );
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [selectedReferenceEvent, setSelectedReferenceEvent] = useState<NonNullable<
    AddEvidenceDrawerProps["referenceEvent"]
  > | null>(referenceEvent ?? null);
  const [nameError, setNameError] = useState("");
  const [criterionError, setCriterionError] = useState("");
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [eventSuggestionsExpanded, setEventSuggestionsExpanded] = useState(false);
  const [dismissedEventSuggestionKey, setDismissedEventSuggestionKey] = useState("");
  const [participantChecks, setParticipantChecks] = useState<Record<string, EventParticipantCheck>>(
    {},
  );
  const [importedEvidence, setImportedEvidence] = useState<EvidenceResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const createEvidence = useCreateEvidence(applicationId, { silent: true });
  const uploadFile = useUploadEvidenceFile(applicationId, { silent: true });
  const startIndexing = useStartEvidenceIndexing(applicationId, { silent: true });
  const checkParticipant = useCheckEventParticipant();
  const importOfficialEvent = useImportOfficialEvent(applicationId);
  const isSubmitting = createEvidence.isPending || uploadFile.isPending || startIndexing.isPending;
  const hasRequirementContext = Boolean(initialRequirementKey && initialRequirementLabel);
  const hasReferenceEvent = Boolean(referenceEvent);
  const referenceEventId = referenceEvent?.eventId;
  const referenceEventTitle = referenceEvent?.title;
  const referenceEventCriterion = referenceEvent?.criterion;
  const referenceEventApprovedUsageCount = referenceEvent?.approvedUsageCount;
  const activeCriterion = criterion ?? "academic";
  const debouncedEvidenceName = useDebouncedValue(evidenceName, 300);
  const normalizedEventSuggestionQuery = normalizeSuggestionQuery(debouncedEvidenceName);
  const shouldSearchReferenceEvents =
    open && criterion !== null && !hasReferenceEvent && debouncedEvidenceName.trim().length >= 2;
  const referenceSearch = useOfficialEventLibrary(
    {
      applicationId,
      search: debouncedEvidenceName,
      criterion: activeCriterion,
      projection: "reference",
      page: 1,
      limit: 6,
    },
    shouldSearchReferenceEvents,
  );
  const suggestions = referenceSearch.data?.items ?? [];
  const shouldSearchEventSuggestions =
    open &&
    criterion !== null &&
    !hasReferenceEvent &&
    (Boolean(preselectedEventId) || normalizedEventSuggestionQuery.length >= 3) &&
    dismissedEventSuggestionKey !==
      getEventSuggestionDismissKey(preselectedEventId, normalizedEventSuggestionQuery);
  const eventSuggestionQuery = useEvidenceEventSuggestions(
    {
      applicationId,
      query: preselectedEventId ? undefined : debouncedEvidenceName,
      criterion: activeCriterion,
      eventId: preselectedEventId,
      limit: eventSuggestionsExpanded ? 5 : 3,
      excludeImported: true,
    },
    shouldSearchEventSuggestions,
  );
  const eventSuggestions = eventSuggestionQuery.data?.suggestions ?? [];
  const requirementContextLabel = hasRequirementContext
    ? `${getCriterionDisplayLabel(activeCriterion)} - ${initialRequirementLabel}`
    : "";

  const fileLabel = useMemo(() => {
    if (!file) return "Chọn tài liệu PDF, JPG, PNG hoặc WEBP";
    return `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  }, [file]);

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) return;
    setCriterion(
      initialCriterion ??
        referenceEventCriterion ??
        (criterionMode === "select" ? null : "academic"),
    );
    setEvidenceName(referenceEventTitle ?? initialEvidenceName);
    setSelectedReferenceEvent(
      referenceEventId && referenceEventTitle
        ? {
            eventId: referenceEventId,
            title: referenceEventTitle,
            criterion: referenceEventCriterion,
            approvedUsageCount: referenceEventApprovedUsageCount,
          }
        : null,
    );
    setNoteOpen(false);
    setNote("");
    setNameError("");
    setCriterionError("");
    setFileError("");
    setSubmitError("");
    setEventSuggestionsExpanded(false);
    setDismissedEventSuggestionKey("");
    setParticipantChecks({});
    setImportedEvidence(null);
    window.requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0 });
    });
  }, [
    initialCriterion,
    criterionMode,
    initialEvidenceName,
    open,
    referenceEventApprovedUsageCount,
    referenceEventCriterion,
    referenceEventId,
    referenceEventTitle,
    preselectedEventId,
  ]);

  const resetForm = () => {
    setEvidenceName("");
    setNote("");
    setFile(null);
    setNameError("");
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (selectedFile?: File) => {
    if (!selectedFile) {
      setFile(null);
      setFileError("");
      return;
    }

    const validationError = validateEvidenceUploadFile(selectedFile);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    setFile(selectedFile);
    setFileError("");
    setSubmitError("");
  };

  const handleParticipantCheck = async (suggestion: EvidenceEventSuggestion) => {
    const result = await checkParticipant.mutateAsync({
      eventId: suggestion.eventId,
      applicationId,
    });
    setParticipantChecks((current) => ({ ...current, [suggestion.eventId]: result }));
    return result;
  };

  const handleImportSuggestion = async (suggestion: EvidenceEventSuggestion) => {
    try {
      const participantCheck =
        participantChecks[suggestion.eventId] ?? (await handleParticipantCheck(suggestion));
      if (!participantCheck.canImport) {
        toast.error(participantCheck.reason || "Bạn chưa đủ điều kiện import sự kiện này.");
        return;
      }
      const result = await importOfficialEvent.mutateAsync({ eventId: suggestion.eventId });
      const evidence = result?.evidence ?? null;
      setImportedEvidence(evidence);
      toast.success("Đã thêm minh chứng từ sự kiện chính thức.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chưa import được sự kiện.");
    }
  };

  const viewImportedEvidence = () => {
    if (importedEvidence) onCreated(importedEvidence);
    onOpenChange(false);
  };

  const goToPrecheck = () => {
    onOpenChange(false);
    void navigate({
      to: "/app/application",
      search: { tab: "precheck" } as never,
    });
  };

  const handleEvidenceNameChange = (value: string) => {
    setEvidenceName(value);
    if (selectedReferenceEvent && value.trim() !== selectedReferenceEvent.title) {
      setSelectedReferenceEvent(null);
    }
  };

  const handleSuggestionSelect = (item: {
    eventId: string;
    title: string;
    criterion?: Criterion;
    approvedUsageCount?: number;
  }) => {
    setSelectedReferenceEvent({
      eventId: item.eventId,
      title: item.title,
      criterion: item.criterion,
      approvedUsageCount: item.approvedUsageCount ?? 0,
    });
    setEvidenceName(item.title);
    if (item.criterion) setCriterion(item.criterion);
    setNameError("");
    setCriterionError("");
  };

  const submit = async () => {
    if (!criterion) {
      setCriterionError("Chọn tiêu chí phù hợp với tài liệu.");
      return;
    }

    const trimmedName = evidenceName.trim();
    if (!trimmedName) {
      setNameError("Tên minh chứng là bắt buộc.");
      return;
    }

    if (!file) {
      setFileError("File minh chứng là bắt buộc.");
      return;
    }

    setNameError("");
    setCriterionError("");
    setFileError("");
    setSubmitError("");

    try {
      const created = await createEvidence.mutateAsync({
        applicationId,
        data: {
          evidenceName: trimmedName,
          criterion,
          sourceType: "manual_upload",
          eventId: selectedReferenceEvent?.eventId,
          note: note.trim() || undefined,
          metadata: selectedReferenceEvent
            ? {
                eventId: selectedReferenceEvent.eventId,
                referenceEventId: selectedReferenceEvent.eventId,
                referenceEventTitle: selectedReferenceEvent.title,
                referenceSource: "student_reference_library",
              }
            : undefined,
        },
      });

      let latest = created;
      if (file) {
        const uploaded = await uploadFile.mutateAsync({
          evidenceId: created.id,
          applicationId,
          file,
        });
        latest = uploaded.res ?? latest;
      }

      if (file && !latest.jobId) {
        const indexed = await startIndexing.mutateAsync({ evidenceId: created.id });
        latest = indexed ?? latest;
      }

      toast.success("Đã thêm minh chứng. Hệ thống đang đọc tài liệu.");
      resetForm();
      onOpenChange(false);
      onCreated(latest);
    } catch (error) {
      setSubmitError(getEvidenceSubmitError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid max-h-[85dvh] w-[min(760px,calc(100vw-32px))] max-w-[760px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 [&>button:last-child]:min-h-12 [&>button:last-child]:min-w-12"
        onEscapeKeyDown={(event) => {
          if (!eventSuggestionsExpanded) return;
          event.preventDefault();
          setEventSuggestionsExpanded(false);
        }}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-16">
          <DialogTitle>Thêm minh chứng</DialogTitle>
          <DialogDescription>
            {hasReferenceEvent
              ? "Tên sự kiện đã được điền sẵn. Bạn vẫn cần tải file minh chứng của mình để cán bộ kiểm tra."
              : hasRequirementContext
                ? requirementContextLabel
                : "Chọn tiêu chí, thêm tài liệu và kiểm tra lại trước khi gửi. Đóng cửa sổ khi chưa gửi sẽ bỏ thông tin đang nhập."}
          </DialogDescription>
        </DialogHeader>

        <div ref={contentRef} className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
          <StepHeading number="1" title="Chọn tiêu chí" />
          {criterionMode === "select" ? (
            <div
              role="group"
              aria-label="Chọn tiêu chí cho minh chứng"
              className="grid gap-2 sm:grid-cols-2"
            >
              {studentEvidenceCriteria.map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  variant={criterion === item.key ? "secondary" : "outline"}
                  aria-pressed={criterion === item.key}
                  className="min-h-12 justify-start gap-2"
                  disabled={isSubmitting}
                  onClick={() => {
                    setCriterion(item.key);
                    setCriterionError("");
                  }}
                >
                  <CriterionIcon criterion={item.key} size={18} />
                  {item.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-11 items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
              <CriterionIcon criterion={activeCriterion} size={18} />
              {studentEvidenceCriteria.find((item) => item.key === activeCriterion)?.label}
            </div>
          )}
          {criterionError ? (
            <p role="alert" className="text-sm text-destructive">
              {criterionError}
            </p>
          ) : null}

          <StepHeading number="2" title="Thêm tài liệu hoặc thông tin" />
          <div className="space-y-2">
            <Label htmlFor="evidence-name">Tên minh chứng</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="evidence-name"
                value={evidenceName}
                onChange={(event) => handleEvidenceNameChange(event.target.value)}
                placeholder="Ví dụ: Giấy chứng nhận Mùa hè xanh"
                className="min-h-12 pl-10"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
            {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
            {selectedReferenceEvent ? (
              <ReferenceSummary
                title={selectedReferenceEvent.title}
                criterion={selectedReferenceEvent.criterion ?? activeCriterion}
                approvedUsageCount={selectedReferenceEvent.approvedUsageCount ?? 0}
              />
            ) : shouldSearchReferenceEvents ? (
              <ReferenceSuggestions
                items={suggestions}
                isLoading={referenceSearch.isLoading || referenceSearch.isFetching}
                isError={referenceSearch.isError}
                onSelect={handleSuggestionSelect}
              />
            ) : null}
            <InlineEventSuggestions
              applicationId={applicationId}
              criterion={activeCriterion}
              dismissedKey={getEventSuggestionDismissKey(
                preselectedEventId,
                normalizedEventSuggestionQuery,
              )}
              expanded={eventSuggestionsExpanded}
              importedEvidence={importedEvidence}
              isChecking={checkParticipant.isPending}
              isError={eventSuggestionQuery.isError}
              isImporting={importOfficialEvent.isPending}
              isLoading={eventSuggestionQuery.isLoading || eventSuggestionQuery.isFetching}
              participantChecks={participantChecks}
              reducedMotion={reducedMotion}
              suggestions={eventSuggestions}
              onCheckParticipant={(suggestion) => {
                void handleParticipantCheck(suggestion).catch(() => undefined);
              }}
              onDismiss={setDismissedEventSuggestionKey}
              onGoToPrecheck={goToPrecheck}
              onImport={(suggestion) => {
                void handleImportSuggestion(suggestion);
              }}
              onToggleExpanded={() => setEventSuggestionsExpanded((current) => !current)}
              onViewEvidence={viewImportedEvidence}
            />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-foreground"
              onClick={() => setNoteOpen((current) => !current)}
            >
              Ghi chú cho cán bộ
              <span className="text-xs font-medium text-muted-foreground">
                {noteOpen ? "Thu gọn" : "Mở rộng"}
              </span>
            </button>
            {noteOpen ? (
              <Textarea
                id="evidence-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Không bắt buộc"
                disabled={isSubmitting}
                className="min-h-24"
              />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence-upload">Tài liệu minh chứng</Label>
            <input
              id="evidence-upload"
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={EVIDENCE_UPLOAD_ACCEPT}
              aria-describedby="evidence-upload-help evidence-file-error"
              disabled={isSubmitting}
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
            {file ? (
              <div className="overflow-hidden rounded-md border bg-white">
                {filePreviewUrl ? (
                  <div className="border-b bg-slate-50">
                    {isImageUpload(file) ? (
                      <img
                        src={filePreviewUrl}
                        alt={file.name}
                        className="max-h-[280px] w-full object-contain"
                      />
                    ) : isPdfUpload(file) ? (
                      <iframe
                        title={file.name}
                        src={filePreviewUrl}
                        className="h-[280px] w-full bg-white"
                      />
                    ) : null}
                  </div>
                ) : null}
                <div className="flex min-w-0 items-start gap-3 p-3">
                  <FileUp className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {fileLabel}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-12"
                        disabled={isSubmitting}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Thay file
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-12"
                        disabled={isSubmitting}
                        onClick={() => handleFileChange(undefined)}
                      >
                        <X className="h-4 w-4" />
                        Xóa file
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                className={`flex min-h-[72px] w-full items-center justify-center gap-3 rounded-md border border-dashed px-4 py-6 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60 ${isDraggingFile ? "border-primary bg-primary/5" : "bg-muted/30 hover:bg-muted"}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDraggingFile(false);
                  handleFileChange(event.dataTransfer.files?.[0]);
                }}
              >
                <FileUp className="h-5 w-5 text-primary" />
                <span>Kéo thả tài liệu vào đây hoặc {fileLabel.toLocaleLowerCase("vi")}</span>
              </button>
            )}
            <p id="evidence-upload-help" className="text-xs text-muted-foreground">
              Hỗ trợ PDF, JPG, PNG, WEBP. Tối đa {EVIDENCE_UPLOAD_LIMIT_MB} MB. Tài liệu sẽ được sử
              dụng khi kiểm tra hồ sơ cấp Thành phố.
            </p>
            {fileError ? (
              <p id="evidence-file-error" role="alert" className="text-sm text-destructive">
                {fileError}
              </p>
            ) : null}
          </div>

          <StepHeading number="3" title="Kiểm tra và gửi xử lý" />
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            <p>
              Tiêu chí:{" "}
              <span className="font-medium text-foreground">
                {criterion
                  ? studentEvidenceCriteria.find((item) => item.key === criterion)?.label
                  : "Chưa chọn"}
              </span>
            </p>
            <p className="truncate">{file ? `Tài liệu: ${file.name}` : "Chưa chọn tài liệu"}</p>
          </div>
          {isSubmitting ? (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Đang thêm tài liệu và gửi xử lý.
            </p>
          ) : null}
          {submitError ? (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t px-5 py-4">
          <Button
            type="button"
            className="min-h-12"
            onClick={() => void submit()}
            disabled={isSubmitting || !criterion}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Đang ghi nhận..." : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-12"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReferenceSummary({
  title,
  criterion,
  approvedUsageCount,
}: {
  title: string;
  criterion: Criterion;
  approvedUsageCount: number;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <div className="font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {studentEvidenceCriteria.find((item) => item.key === criterion)?.label} ·{" "}
        {approvedUsageCount} lượt đã được duyệt
      </div>
    </div>
  );
}

function ReferenceSuggestions({
  items,
  isLoading,
  isError,
  onSelect,
}: {
  items: Array<{
    eventId: string;
    title: string;
    criterion?: Criterion;
    approvedUsageCount?: number;
  }>;
  isLoading: boolean;
  isError: boolean;
  onSelect: (item: {
    eventId: string;
    title: string;
    criterion?: Criterion;
    approvedUsageCount?: number;
  }) => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-md border bg-white px-3 py-2 text-sm text-muted-foreground">
        Đang tìm hoạt động phù hợp...
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        Không tải được gợi ý hoạt động.
      </div>
    );
  }
  if (!items.length) return null;

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
      {items.map((item) => (
        <button
          key={item.eventId}
          type="button"
          className="flex min-h-12 w-full min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          onClick={() => onSelect(item)}
        >
          <span className="min-w-0">
            <span className="line-clamp-1 font-semibold text-foreground">{item.title}</span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              {studentEvidenceCriteria.find((criterion) => criterion.key === item.criterion)
                ?.label ?? "Chưa xác định"}{" "}
              · {item.approvedUsageCount ?? 0} lượt đã được duyệt
            </span>
          </span>
          <span className="text-xs font-medium text-primary">Chọn</span>
        </button>
      ))}
    </div>
  );
}

function InlineEventSuggestions({
  applicationId,
  criterion,
  dismissedKey,
  expanded,
  importedEvidence,
  isChecking,
  isError,
  isImporting,
  isLoading,
  participantChecks,
  reducedMotion,
  suggestions,
  onCheckParticipant,
  onDismiss,
  onGoToPrecheck,
  onImport,
  onToggleExpanded,
  onViewEvidence,
}: {
  applicationId: string;
  criterion: Criterion;
  dismissedKey: string;
  expanded: boolean;
  importedEvidence: EvidenceResponse | null;
  isChecking: boolean;
  isError: boolean;
  isImporting: boolean;
  isLoading: boolean;
  participantChecks: Record<string, EventParticipantCheck>;
  reducedMotion: boolean;
  suggestions: EvidenceEventSuggestion[];
  onCheckParticipant: (suggestion: EvidenceEventSuggestion) => void;
  onDismiss: (key: string) => void;
  onGoToPrecheck: () => void;
  onImport: (suggestion: EvidenceEventSuggestion) => void;
  onToggleExpanded: () => void;
  onViewEvidence: () => void;
}) {
  if (importedEvidence) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm">
        <div className="font-semibold text-emerald-900">
          Đã thêm minh chứng từ sự kiện chính thức.
        </div>
        <p className="mt-1 text-emerald-800">
          Minh chứng đã được ghi nhận từ danh sách tham gia đã xác nhận.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={onViewEvidence}>
            Xem minh chứng
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onGoToPrecheck}>
            Chạy lại tiền kiểm
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => onDismiss(dismissedKey)}>
            Tiếp tục hoàn thiện
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading && !suggestions.length) {
    return (
      <div className="rounded-md border bg-white px-3 py-2 text-sm text-muted-foreground">
        Đang kiểm tra sự kiện chính thức phù hợp...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Chưa tải được gợi ý từ sự kiện chính thức. Bạn vẫn có thể tải file thủ công.
      </div>
    );
  }

  if (!suggestions.length) return null;

  const visibleSuggestions = expanded ? suggestions : suggestions.slice(0, 1);

  return (
    <AnimatePresence initial={false}>
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
        className="overflow-hidden rounded-md border border-sky-100 bg-sky-50/50"
      >
        <div className="flex items-center justify-between gap-3 border-b border-sky-100 px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-sky-950">
              Dùng hoạt động đã được ghi nhận
            </div>
            <div className="text-xs text-sky-800">
              Hệ thống sẽ kiểm tra bạn có trong danh sách tham gia trước khi import.
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-12"
            onClick={() => onDismiss(dismissedKey)}
          >
            Ẩn
          </Button>
        </div>
        <div className="divide-y divide-sky-100">
          {visibleSuggestions.map((suggestion) => (
            <InlineEventSuggestionRow
              key={suggestion.eventId}
              isChecking={isChecking}
              isImporting={isImporting}
              participantCheck={participantChecks[suggestion.eventId]}
              suggestion={suggestion}
              onCheckParticipant={onCheckParticipant}
              onImport={onImport}
            />
          ))}
        </div>
        {suggestions.length > 1 ? (
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center gap-2 px-3 text-sm font-semibold text-sky-800 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            onClick={onToggleExpanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Thu gọn" : "Xem thêm"}
          </button>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

function InlineEventSuggestionRow({
  isChecking,
  isImporting,
  participantCheck,
  suggestion,
  onCheckParticipant,
  onImport,
}: {
  isChecking: boolean;
  isImporting: boolean;
  participantCheck?: EventParticipantCheck;
  suggestion: EvidenceEventSuggestion;
  onCheckParticipant: (suggestion: EvidenceEventSuggestion) => void;
  onImport: (suggestion: EvidenceEventSuggestion) => void;
}) {
  const canImport = participantCheck?.canImport ?? false;
  const participantFound = participantCheck?.found ?? false;

  return (
    <div className="px-3 py-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-foreground">
            {suggestion.eventName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              {studentEvidenceCriteria.find((item) => item.key === suggestion.criterion)?.label}
            </span>
            {suggestion.organizer ? <span>{suggestion.organizer}</span> : null}
            {suggestion.startDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(suggestion.startDate)}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-xs text-sky-800">
            Mức khớp: {getSuggestionMatchLabel(suggestion.match.level)}
            {participantCheck
              ? ` · ${participantFound ? "Đã xác nhận tham gia" : "Chưa thấy trong danh sách"}`
              : ""}
          </div>
          {participantCheck?.reason ? (
            <div className="mt-1 text-xs text-amber-800">{participantCheck.reason}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {!participantCheck ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-12"
              disabled={isChecking}
              onClick={() => onCheckParticipant(suggestion)}
            >
              {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Kiểm tra tham gia
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="min-h-12"
              disabled={!canImport || isImporting}
              onClick={() => onImport(suggestion)}
            >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {suggestion.alreadyImported ? "Đã có" : "Import minh chứng"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function getSuggestionMatchLabel(level: EvidenceEventSuggestion["match"]["level"]) {
  if (level === "exact") return "trùng tên";
  if (level === "strong") return "phù hợp cao";
  return "có thể phù hợp";
}

function StepHeading({ number, title }: { number: string; title: string }) {
  return (
    <h3 className="flex items-center gap-2 border-t pt-4 text-sm font-semibold text-foreground">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs text-muted-foreground">
        {number}
      </span>
      {title}
    </h3>
  );
}

function getEvidenceSubmitError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Chưa thêm được minh chứng. Vui lòng kiểm tra lại thông tin và thử lại.";
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

function isImageUpload(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);
}

function isPdfUpload(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function normalizeSuggestionQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getEventSuggestionDismissKey(eventId: string | undefined, query: string) {
  return eventId ? `event:${eventId}` : `query:${query}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
