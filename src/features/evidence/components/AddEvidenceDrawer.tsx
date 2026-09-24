import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Loader2,
  Search,
  X,
} from "lucide-react";
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
import type { EvidenceEventSuggestion } from "@/features/event/api/events";
import {
  useEvidenceEventSuggestions,
  useImportOfficialEvent,
  useOfficialEventLibrary,
} from "@/features/event/hooks/useApprovedEvidenceSearch";
import { useCheckEventParticipant } from "@/features/event/hooks/useEvents";
import { getCriterionDisplayLabel } from "@/features/application/presentation";
import { StudentAssistantExplanation } from "@/features/student-assistant/components/StudentAssistantExplanation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { Criterion, EventParticipantCheck, EvidenceResponse } from "@/lib/api/types";
import {
  useCreateEvidence,
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import { studentEvidenceCriteria } from "./evidence-card-utils";

type AddEvidenceDrawerProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const maxFileSize = 10 * 1024 * 1024;
const acceptedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

export function AddEvidenceDrawer({
  applicationId,
  open,
  onOpenChange,
  initialCriterion = "academic",
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
  const [criterion, setCriterion] = useState<Criterion>(initialCriterion);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [selectedReferenceEvent, setSelectedReferenceEvent] = useState<NonNullable<
    AddEvidenceDrawerProps["referenceEvent"]
  > | null>(referenceEvent ?? null);
  const [nameError, setNameError] = useState("");
  const [fileError, setFileError] = useState("");
  const [eventSuggestionsExpanded, setEventSuggestionsExpanded] = useState(false);
  const [dismissedEventSuggestionKey, setDismissedEventSuggestionKey] = useState("");
  const [participantChecks, setParticipantChecks] = useState<Record<string, EventParticipantCheck>>(
    {},
  );
  const [importedEvidence, setImportedEvidence] = useState<EvidenceResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const createEvidence = useCreateEvidence(applicationId);
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const checkParticipant = useCheckEventParticipant();
  const importOfficialEvent = useImportOfficialEvent(applicationId);
  const isSubmitting = createEvidence.isPending || uploadFile.isPending || startIndexing.isPending;
  const hasRequirementContext = Boolean(initialRequirementKey && initialRequirementLabel);
  const hasReferenceEvent = Boolean(referenceEvent);
  const referenceEventId = referenceEvent?.eventId;
  const referenceEventTitle = referenceEvent?.title;
  const referenceEventCriterion = referenceEvent?.criterion;
  const referenceEventApprovedUsageCount = referenceEvent?.approvedUsageCount;
  const debouncedEvidenceName = useDebouncedValue(evidenceName, 300);
  const normalizedEventSuggestionQuery = normalizeSuggestionQuery(debouncedEvidenceName);
  const shouldSearchReferenceEvents =
    open && !hasReferenceEvent && debouncedEvidenceName.trim().length >= 2;
  const referenceSearch = useOfficialEventLibrary(
    {
      applicationId,
      search: debouncedEvidenceName,
      criterion,
      projection: "reference",
      page: 1,
      limit: 6,
    },
    shouldSearchReferenceEvents,
  );
  const suggestions = referenceSearch.data?.items ?? [];
  const shouldSearchEventSuggestions =
    open &&
    !hasReferenceEvent &&
    (Boolean(preselectedEventId) || normalizedEventSuggestionQuery.length >= 3) &&
    dismissedEventSuggestionKey !==
      getEventSuggestionDismissKey(preselectedEventId, normalizedEventSuggestionQuery);
  const eventSuggestionQuery = useEvidenceEventSuggestions(
    {
      applicationId,
      query: preselectedEventId ? undefined : debouncedEvidenceName,
      criterion,
      eventId: preselectedEventId,
      limit: eventSuggestionsExpanded ? 5 : 3,
      excludeImported: true,
    },
    shouldSearchEventSuggestions,
  );
  const eventSuggestions = eventSuggestionQuery.data?.suggestions ?? [];
  const requirementContextLabel = hasRequirementContext
    ? `${getCriterionDisplayLabel(criterion)} - ${initialRequirementLabel}`
    : "";

  const fileLabel = useMemo(() => {
    if (!file) return "Chọn file PDF/JPG/PNG";
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
    setCriterion(initialCriterion);
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
    setFileError("");
    setEventSuggestionsExpanded(false);
    setDismissedEventSuggestionKey("");
    setParticipantChecks({});
    setImportedEvidence(null);
    window.requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0 });
    });
  }, [
    initialCriterion,
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
      return;
    }

    const extension = `.${selectedFile.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (!acceptedTypes.includes(extension)) {
      toast.error("Định dạng file không được hỗ trợ. Chỉ chấp nhận PDF, JPG, JPEG, PNG, WEBP.");
      return;
    }

    if (selectedFile.size > maxFileSize) {
      toast.error("Dung lượng file vượt quá giới hạn 10MB.");
      return;
    }

    setFile(selectedFile);
    setFileError("");
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
  };

  const submit = async () => {
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
    setFileError("");

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

      toast.success("Đã ghi nhận minh chứng. Hệ thống đang đọc nhanh file để tạo bản tóm tắt.");
      resetForm();
      onOpenChange(false);
      onCreated(latest);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm minh chứng.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid max-h-[85dvh] w-[min(760px,calc(100vw-32px))] max-w-[760px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
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
                : "AI sẽ đọc file và tạo Thẻ minh chứng để bạn kiểm tra trước khi dùng cho tiền kiểm."}
          </DialogDescription>
        </DialogHeader>

        <div ref={contentRef} className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="evidence-name">Tên minh chứng</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="evidence-name"
                value={evidenceName}
                onChange={(event) => handleEvidenceNameChange(event.target.value)}
                placeholder="Ví dụ: Giấy chứng nhận Mùa hè xanh"
                className="min-h-11 pl-10"
                disabled={isSubmitting}
                autoComplete="off"
              />
            </div>
            {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
            {selectedReferenceEvent ? (
              <ReferenceSummary
                title={selectedReferenceEvent.title}
                criterion={selectedReferenceEvent.criterion ?? criterion}
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
              criterion={criterion}
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
            <Label>Tiêu chí</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
              {studentEvidenceCriteria.find((item) => item.key === criterion)?.label}
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-foreground"
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
            <Label>File minh chứng</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={acceptedTypes.join(",")}
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
                        disabled={isSubmitting}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Thay file
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
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
                className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-dashed bg-muted/30 px-4 py-6 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-5 w-5 text-primary" />
                <span>{fileLabel}</span>
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              Hỗ trợ PDF, JPG, JPEG, PNG, WEBP. AI sẽ đọc file, tạo Thẻ minh chứng và báo các thông
              tin cần kiểm tra. Tối đa 10MB.
            </p>
            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
          </div>

          {isSubmitting ? <UploadProgress /> : null}
        </div>

        <DialogFooter className="shrink-0 border-t px-5 py-4">
          <Button type="button" onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Đang ghi nhận..." : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
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
          className="flex min-h-11 w-full min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
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
            <div className="text-sm font-semibold text-sky-950">Gợi ý từ sự kiện chính thức</div>
            <div className="text-xs text-sky-800">
              Hệ thống sẽ kiểm tra bạn có trong danh sách tham gia trước khi import.
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onDismiss(dismissedKey)}>
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
            className="flex min-h-10 w-full items-center justify-center gap-2 px-3 text-sm font-semibold text-sky-800 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            onClick={onToggleExpanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Thu gọn" : "Xem thêm"}
          </button>
        ) : null}
        <StudentAssistantExplanation
          params={{
            contextType: "event_registry",
            contextId: visibleSuggestions[0]?.eventId ?? applicationId,
            applicationId,
            criterion,
            eventId: visibleSuggestions[0]?.eventId,
          }}
          title="Vì sao có gợi ý này?"
          compact
          className="m-3 border-sky-100 bg-white"
        />
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

function UploadProgress() {
  const steps = [
    "Đã tải file",
    "AI đang đọc nội dung",
    "Đang tạo Thẻ minh chứng",
    "Đang tiền kiểm thông tin",
    "Chờ bạn xác nhận",
  ];

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="text-sm font-semibold text-foreground">Đã ghi nhận minh chứng</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
            {index === 1 ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            {step}
          </div>
        ))}
      </div>
    </div>
  );
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
