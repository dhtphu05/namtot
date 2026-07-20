import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileUp,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCriterionDisplayLabel } from "@/features/application/presentation";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import {
  useCreateEvidence,
  useStartEvidenceIndexing,
  useUploadEvidenceFile,
} from "@/features/evidence/hooks/useEvidence";
import {
  useEvidenceEventSuggestions,
  useImportOfficialEvent,
} from "@/features/event/hooks/useApprovedEvidenceSearch";
import { useCheckEventParticipant } from "@/features/event/hooks/useEvents";
import type { EvidenceEventSuggestion } from "@/features/event/api/events";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { EventParticipantCheck } from "@/lib/api/types";
import { studentEvidenceCriteria } from "./evidence-card-utils";

type AddEvidenceDrawerProps = {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCriterion?: Criterion;
  initialEvidenceName?: string;
  initialRequirementKey?: string;
  initialRequirementLabel?: string;
  referenceEvent?: {
    eventId: string;
    title: string;
  } | null;
  preselectedEventId?: string;
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
  referenceEvent,
  preselectedEventId,
  submitLabel = "Upload minh chứng",
  onCreated,
}: AddEvidenceDrawerProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [evidenceName, setEvidenceName] = useState("");
  const [criterion, setCriterion] = useState<Criterion>(initialCriterion);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nameError, setNameError] = useState("");
  const [fileError, setFileError] = useState("");
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(new Set());
  const [checkedEventId, setCheckedEventId] = useState<string | null>(null);
  const [participantCheckResult, setParticipantCheckResult] =
    useState<EventParticipantCheck | null>(null);
  const [importedEvidence, setImportedEvidence] = useState<EvidenceResponse | null>(null);
  const [importedEventId, setImportedEventId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const debouncedEvidenceName = useDebouncedValue(evidenceName, 300);

  const createEvidence = useCreateEvidence(applicationId);
  const uploadFile = useUploadEvidenceFile(applicationId);
  const startIndexing = useStartEvidenceIndexing(applicationId);
  const checkParticipant = useCheckEventParticipant();
  const importOfficialEvent = useImportOfficialEvent(applicationId);
  const isSubmitting = createEvidence.isPending || uploadFile.isPending || startIndexing.isPending;
  const isEventActionPending = checkParticipant.isPending || importOfficialEvent.isPending;
  const hasRequirementContext = Boolean(initialRequirementKey && initialRequirementLabel);
  const hasReferenceEvent = Boolean(referenceEvent);
  const requirementContextLabel = hasRequirementContext
    ? `${getCriterionDisplayLabel(criterion)} - ${initialRequirementLabel}`
    : "";

  const fileLabel = useMemo(() => {
    if (!file) return "Chọn file PDF/JPG/PNG/WEBP";
    return `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
  }, [file]);

  const normalizedSuggestionQuery = debouncedEvidenceName.trim();
  const eventSuggestions = useEvidenceEventSuggestions(
    {
      applicationId,
      query: preselectedEventId ? undefined : normalizedSuggestionQuery,
      criterion,
      eventId: preselectedEventId,
      limit: suggestionsExpanded ? 5 : 3,
      excludeImported: !preselectedEventId,
    },
    open &&
      !hasReferenceEvent &&
      Boolean(preselectedEventId || normalizedSuggestionQuery.length >= 3),
  );
  const visibleSuggestions = useMemo(
    () =>
      (eventSuggestions.data?.suggestions ?? []).filter(
        (suggestion) => !dismissedSuggestionIds.has(suggestion.eventId),
      ),
    [dismissedSuggestionIds, eventSuggestions.data?.suggestions],
  );
  const displayedSuggestions = suggestionsExpanded
    ? visibleSuggestions
    : visibleSuggestions.slice(0, 1);

  useEffect(() => {
    if (!open) return;
    setCriterion(initialCriterion);
    setEvidenceName(referenceEvent?.title ?? initialEvidenceName);
    setNote("");
    setNameError("");
    setFileError("");
    setSuggestionsExpanded(Boolean(preselectedEventId));
    setDismissedSuggestionIds(new Set());
    setCheckedEventId(null);
    setParticipantCheckResult(null);
    setImportedEvidence(null);
    setImportedEventId(null);
    window.requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0 });
    });
  }, [initialCriterion, initialEvidenceName, open, preselectedEventId, referenceEvent?.title]);

  useEffect(() => {
    setDismissedSuggestionIds(new Set());
    setCheckedEventId(null);
    setParticipantCheckResult(null);
    setImportedEvidence(null);
    setImportedEventId(null);
  }, [criterion, normalizedSuggestionQuery, preselectedEventId]);

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
          eventId: referenceEvent?.eventId,
          note: note.trim() || undefined,
          metadata: referenceEvent
            ? {
                eventId: referenceEvent.eventId,
                referenceEventId: referenceEvent.eventId,
                referenceEventTitle: referenceEvent.title,
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

  const checkSuggestion = async (suggestion: EvidenceEventSuggestion) => {
    try {
      const result = await checkParticipant.mutateAsync({
        eventId: suggestion.eventId,
        applicationId,
      });
      setParticipantCheckResult(result);
      setCheckedEventId(suggestion.eventId);
    } catch {
      setParticipantCheckResult({
        found: false,
        participant: null,
        canImport: false,
        reason: "EVENT_PARTICIPANT_NOT_FOUND",
      });
      setCheckedEventId(suggestion.eventId);
    }
  };

  const importSuggestion = async (suggestion: EvidenceEventSuggestion) => {
    try {
      const result = await importOfficialEvent.mutateAsync({ eventId: suggestion.eventId });
      if (result?.evidence) {
        setImportedEvidence(result.evidence);
        setImportedEventId(suggestion.eventId);
      }
      toast.success(
        result?.alreadyImported
          ? "Minh chứng đã có trong hồ sơ."
          : "Đã nhập minh chứng từ sự kiện.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chưa nhập được minh chứng từ sự kiện.");
    }
  };

  const closeAndViewImportedEvidence = () => {
    if (!importedEvidence) return;
    onOpenChange(false);
    onCreated(importedEvidence);
  };

  const goToPrecheck = () => {
    onOpenChange(false);
    void navigate({
      to: "/app/application",
      search: { tab: "precheck" } as never,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto grid max-h-[92dvh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DrawerHeader className="shrink-0">
          <DrawerTitle>Thêm minh chứng</DrawerTitle>
          <DrawerDescription>
            {hasReferenceEvent
              ? "Tên sự kiện đã được điền sẵn. Bạn vẫn cần tải file minh chứng của mình để cán bộ kiểm tra."
              : hasRequirementContext
                ? requirementContextLabel
                : "Upload khi chưa tìm thấy trong danh sách chính thức."}
          </DrawerDescription>
        </DrawerHeader>

        <div ref={contentRef} className="min-h-0 space-y-4 overflow-y-auto px-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="evidence-name">Tên minh chứng</Label>
            <Input
              id="evidence-name"
              value={evidenceName}
              onChange={(event) => setEvidenceName(event.target.value)}
              placeholder="Ví dụ: Giấy chứng nhận Mùa hè xanh"
              disabled={isSubmitting}
            />
            {nameError ? <p className="text-sm text-destructive">{nameError}</p> : null}
          </div>

          {!hasReferenceEvent ? (
            <InlineEventSuggestions
              suggestions={displayedSuggestions}
              totalCount={visibleSuggestions.length}
              expanded={suggestionsExpanded}
              loading={eventSuggestions.isFetching}
              error={eventSuggestions.isError}
              checkedEventId={checkedEventId}
              checkResult={participantCheckResult}
              importedEvidence={importedEvidence}
              importedEventId={importedEventId}
              pending={isEventActionPending}
              prefersReducedMotion={prefersReducedMotion}
              onToggleExpanded={() => setSuggestionsExpanded((current) => !current)}
              onDismiss={(eventId) =>
                setDismissedSuggestionIds((current) => new Set(current).add(eventId))
              }
              onCheck={checkSuggestion}
              onImport={importSuggestion}
              onViewImported={closeAndViewImportedEvidence}
              onPrecheck={goToPrecheck}
              onContinue={() => onOpenChange(false)}
            />
          ) : null}

          <div className="space-y-2">
            <Label>Tiêu chí</Label>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground">
              {studentEvidenceCriteria.find((item) => item.key === criterion)?.label}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence-note">Ghi chú cho cán bộ</Label>
            <Textarea
              id="evidence-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Không bắt buộc"
              disabled={isSubmitting}
            />
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
            <button
              type="button"
              disabled={isSubmitting}
              className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-dashed bg-muted/30 px-4 py-6 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-5 w-5 text-primary" />
              <span>{fileLabel}</span>
            </button>
            <p className="text-xs text-muted-foreground">
              Hỗ trợ PDF, JPG, JPEG, PNG, WEBP. Tối đa 10MB.
            </p>
            {fileError ? <p className="text-sm text-destructive">{fileError}</p> : null}
          </div>

          {isSubmitting ? <UploadProgress /> : null}
        </div>

        <DrawerFooter className="shrink-0 border-t">
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
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

type InlineEventSuggestionsProps = {
  suggestions: EvidenceEventSuggestion[];
  totalCount: number;
  expanded: boolean;
  loading: boolean;
  error: boolean;
  checkedEventId: string | null;
  checkResult: ReturnType<typeof useCheckEventParticipant>["data"] | null;
  importedEvidence: EvidenceResponse | null;
  importedEventId: string | null;
  pending: boolean;
  prefersReducedMotion: boolean;
  onToggleExpanded: () => void;
  onDismiss: (eventId: string) => void;
  onCheck: (suggestion: EvidenceEventSuggestion) => void;
  onImport: (suggestion: EvidenceEventSuggestion) => void;
  onViewImported: () => void;
  onPrecheck: () => void;
  onContinue: () => void;
};

function InlineEventSuggestions({
  suggestions,
  totalCount,
  expanded,
  loading,
  error,
  checkedEventId,
  checkResult,
  importedEvidence,
  importedEventId,
  pending,
  prefersReducedMotion,
  onToggleExpanded,
  onDismiss,
  onCheck,
  onImport,
  onViewImported,
  onPrecheck,
  onContinue,
}: InlineEventSuggestionsProps) {
  if (error) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Chưa tải được gợi ý sự kiện. Bạn vẫn có thể upload minh chứng thủ công.
      </div>
    );
  }

  if (!loading && suggestions.length === 0) return null;

  return (
    <div
      className="min-h-[88px] rounded-md border bg-background px-3 py-3"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.stopPropagation();
          onToggleExpanded();
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Search className="h-4 w-4 text-primary" />
          Gợi ý từ danh sách chính thức
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div role="listbox" aria-label="Gợi ý sự kiện chính thức" className="space-y-2">
        <AnimatePresence initial={false}>
          {suggestions.map((suggestion) => (
            <motion.div
              key={suggestion.eventId}
              role="option"
              aria-selected={checkedEventId === suggestion.eventId}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            >
              <EventSuggestionCard
                suggestion={suggestion}
                checked={checkedEventId === suggestion.eventId}
                checkResult={checkedEventId === suggestion.eventId ? checkResult : null}
                importedEvidence={importedEvidence}
                importedEventId={importedEventId}
                pending={pending}
                onDismiss={() => onDismiss(suggestion.eventId)}
                onCheck={() => onCheck(suggestion)}
                onImport={() => onImport(suggestion)}
                onViewImported={onViewImported}
                onPrecheck={onPrecheck}
                onContinue={onContinue}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalCount > 1 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 px-2 text-xs"
          onClick={onToggleExpanded}
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {expanded ? "Thu gọn" : `Xem thêm ${totalCount - 1} gợi ý`}
        </Button>
      ) : null}
    </div>
  );
}

function EventSuggestionCard({
  suggestion,
  checked,
  checkResult,
  importedEvidence,
  importedEventId,
  pending,
  onDismiss,
  onCheck,
  onImport,
  onViewImported,
  onPrecheck,
  onContinue,
}: {
  suggestion: EvidenceEventSuggestion;
  checked: boolean;
  checkResult: ReturnType<typeof useCheckEventParticipant>["data"] | null;
  importedEvidence: EvidenceResponse | null;
  importedEventId: string | null;
  pending: boolean;
  onDismiss: () => void;
  onCheck: () => void;
  onImport: () => void;
  onViewImported: () => void;
  onPrecheck: () => void;
  onContinue: () => void;
}) {
  const canImport = checked && Boolean(checkResult?.found && checkResult.canImport);
  const importedThisEvent = Boolean(importedEvidence && importedEventId === suggestion.eventId);
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {suggestion.eventName}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {studentEvidenceCriteria.find((item) => item.key === suggestion.criterion)?.label}
            </span>
            {suggestion.organizer ? <span>{suggestion.organizer}</span> : null}
            {suggestion.startDate || suggestion.endDate ? (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatEventDateRange(suggestion.startDate, suggestion.endDate)}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Danh sách chính thức đã sẵn sàng. Kiểm tra tên của bạn trước khi nhập minh chứng.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={onDismiss}>
          Ẩn
        </Button>
      </div>

      {checked ? (
        <div
          aria-live="polite"
          className={`mt-3 rounded-md px-3 py-2 text-sm ${
            canImport
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {canImport ? (
            <>
              <div className="font-medium">Đã tìm thấy bạn trong danh sách chính thức.</div>
              {checkResult?.participant?.studentCode ? (
                <div className="mt-1 text-xs">Mã SV: {checkResult.participant.studentCode}</div>
              ) : null}
            </>
          ) : (
            "Chưa tìm thấy bạn trong danh sách đã xác nhận của sự kiện này."
          )}
        </div>
      ) : null}

      {importedThisEvent ? (
        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Đã nhập minh chứng từ sự kiện
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onViewImported}>
              Xem minh chứng
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onPrecheck}>
              Chạy lại tiền kiểm
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onContinue}>
              Tiếp tục hoàn thiện
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCheck}>
            {pending && !checked ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kiểm tra tên tôi
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canImport || pending || suggestion.alreadyImported}
            onClick={onImport}
          >
            {pending && checked ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {suggestion.alreadyImported ? "Đã có trong hồ sơ" : "Nhập minh chứng"}
          </Button>
        </div>
      )}
    </div>
  );
}

function UploadProgress() {
  const steps = ["Đã nhận file", "Đang đọc file", "Đã tạo tóm tắt", "Chờ cán bộ xét duyệt"];

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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

function formatEventDateRange(startDate: string | null, endDate: string | null) {
  const start = formatEventDate(startDate);
  const end = formatEventDate(endDate);
  if (start && end && start !== end) return `${start} - ${end}`;
  return start ?? end ?? "Chưa có ngày";
}

function formatEventDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
