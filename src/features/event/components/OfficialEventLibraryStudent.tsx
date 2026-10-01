import { useEffect, useId, useState } from "react";
import { Check, ChevronRight, Loader2, Search, X } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/features/student/components/primitives";
import { ApiError } from "@/lib/api/client";
import { getCoreCriterionLabel } from "@/lib/criteria-presentation";
import { cn } from "@/lib/utils";
import type { Criterion, EvidenceResponse, Level } from "@/lib/api/types";
import type { OfficialEventLibraryItem } from "@/types/evidence";
import {
  useImportOfficialEvent,
  useOfficialEventLibrary,
} from "@/features/event/hooks/useApprovedEvidenceSearch";

type ImportDialogState =
  | "confirm"
  | "checking"
  | "success"
  | "participant_not_found"
  | "already_imported"
  | "generic_error";

type OfficialEventLibraryBrowserProps = {
  applicationId?: string;
  title?: string;
  search: string;
  criterion: Criterion | "all";
  hideCriterionFilters?: boolean;
  pageSize?: number;
  compact?: boolean;
  className?: string;
  onSearchChange: (value: string) => void;
  onCriterionChange: (value: Criterion | "all") => void;
  onSelect: (item: OfficialEventLibraryItem) => void;
};

type OfficialEventLibraryDialogProps = {
  open: boolean;
  applicationId?: string;
  title: string;
  criterion?: Criterion;
  hideCriterionFilters?: boolean;
  onOpenChange: (open: boolean) => void;
  onManualUpload: (criterion: Criterion) => void;
  onImported?: (evidence: EvidenceResponse | null, item: OfficialEventLibraryItem) => void;
};

type OfficialEventImportDialogProps = {
  item: OfficialEventLibraryItem | null;
  open: boolean;
  applicationId?: string;
  onOpenChange: (open: boolean) => void;
  onManualUpload: (criterion: Criterion) => void;
  onViewApplication: (evidence: EvidenceResponse | null, item: OfficialEventLibraryItem) => void;
};

const criteriaOptions: Array<{ value: Criterion | "all"; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "ethics", label: "Đạo đức" },
  { value: "academic", label: "Học tập" },
  { value: "physical", label: "Thể lực" },
  { value: "volunteer", label: "Tình nguyện" },
  { value: "integration", label: "Hội nhập" },
];

const organizerLevelLabel: Record<Level, string> = {
  school: "Cấp Trường",
  university: "Cấp Đại học",
  city: "Cấp Thành phố",
  central: "Cấp Trung ương",
};

const referenceCriterionOptions: Array<{
  value: Criterion | "all";
  number: string;
  label: string;
}> = [
  { value: "all", number: "00", label: "Tất cả" },
  { value: "ethics", number: "01", label: getCoreCriterionLabel("ethics") },
  { value: "academic", number: "02", label: getCoreCriterionLabel("academic") },
  { value: "physical", number: "03", label: getCoreCriterionLabel("physical") },
  { value: "volunteer", number: "04", label: getCoreCriterionLabel("volunteer") },
  { value: "integration", number: "05", label: getCoreCriterionLabel("integration") },
];

type StudentReferenceEventLibraryProps = {
  applicationId?: string;
  search: string;
  criterion: Criterion | "all";
  pageSize?: number;
  onSearchChange: (value: string) => void;
  onCriterionChange: (value: Criterion | "all") => void;
  onSelect: (item: StudentReferenceEvent) => void;
  onAddEvidence: () => void;
};

type StudentReferenceEvent = Pick<
  OfficialEventLibraryItem,
  "eventId" | "title" | "criterion" | "approvedUsageCount"
>;

export function StudentReferenceEventLibrary({
  applicationId,
  search,
  criterion,
  pageSize = 24,
  onSearchChange,
  onCriterionChange,
  onSelect,
  onAddEvidence,
}: StudentReferenceEventLibraryProps) {
  const searchId = useId();
  const debouncedSearch = useDebouncedValue(search, 280);
  const library = useOfficialEventLibrary(
    {
      applicationId,
      search: debouncedSearch,
      criterion,
      projection: "reference",
      page: 1,
      limit: pageSize,
    },
    Boolean(applicationId),
  );
  const items: StudentReferenceEvent[] = (library.data?.items ?? []).map((item) => ({
    eventId: item.eventId,
    title: item.title,
    criterion: item.criterion,
    approvedUsageCount: item.approvedUsageCount ?? 0,
  }));
  const hasFilter = Boolean(debouncedSearch.trim() || criterion !== "all");
  const resultCount = library.data?.total ?? items.length;

  return (
    <section className="min-w-0" aria-label="Tra cứu kho minh chứng">
      <div className="min-w-0">
        <label className="sr-only" htmlFor={searchId}>
          Tìm theo tên sự kiện hoặc tên viết tắt
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            id={searchId}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo tên sự kiện hoặc tên viết tắt..."
            className="min-h-11 w-full rounded-lg pl-10 pr-10 text-sm"
            autoComplete="off"
          />
          {search ? (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
          Mùa hè xanh, MHX 2025, hiến máu, NCKH
        </p>
      </div>

      <ReferenceCriterionFilter
        value={criterion}
        onChange={(nextCriterion) =>
          onCriterionChange(nextCriterion === criterion ? "all" : nextCriterion)
        }
      />

      <div className="mt-4 min-w-0">
        {library.isLoading || library.isFetching ? (
          <ReferenceEventSkeleton />
        ) : library.isError ? (
          <ReferenceEventError onRetry={() => void library.refetch()} />
        ) : items.length === 0 ? (
          <ReferenceEventEmpty
            hasFilter={hasFilter}
            onReset={() => {
              onSearchChange("");
              onCriterionChange("all");
            }}
            onAddEvidence={onAddEvidence}
          />
        ) : (
          <div className="min-w-0">
            <div className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
              {resultCount} kết quả phù hợp
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
              {items.map((item) => (
                <ReferenceEventTile key={item.eventId} item={item} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function ReferenceCriterionFilter({
  value,
  onChange,
}: {
  value: Criterion | "all";
  onChange: (criterion: Criterion | "all") => void;
}) {
  return (
    <div className="mt-4 min-w-0 overflow-x-auto pb-1" data-reference-criterion-filter>
      <div
        className="inline-flex min-w-max rounded-md border border-slate-200 bg-white p-1"
        role="tablist"
        aria-label="Lọc theo tiêu chí"
      >
        {referenceCriterionOptions.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                selected
                  ? "bg-[var(--surface-selected)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
              )}
              onClick={() => onChange(option.value)}
            >
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {option.value === "all" ? "Tất cả" : option.number}
              </span>
              {option.value !== "all" ? <span>{option.label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReferenceEventTile({
  item,
  onSelect,
}: {
  item: StudentReferenceEvent;
  onSelect: (item: StudentReferenceEvent) => void;
}) {
  return (
    <button
      type="button"
      className="flex h-[64px] w-full min-w-0 items-center gap-3 border-b border-slate-200 px-4 text-left text-sm leading-5 text-[var(--text-primary)] transition-colors last:border-b-0 hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
      onClick={() => onSelect(item)}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-semibold">{item.title}</span>
        <span className="mt-0.5 flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 text-xs text-[var(--text-secondary)]">
          <span>{getReferenceCriterionLabel(item.criterion)}</span>
          <span>{item.approvedUsageCount ?? 0} lượt đã được duyệt</span>
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
    </button>
  );
}

export function ReferenceEventSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-md border border-slate-200 bg-white"
      aria-label="Đang tải kho minh chứng"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="flex h-[64px] items-center border-b border-slate-200 px-4 last:border-b-0"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getReferenceCriterionLabel(criterion?: Criterion) {
  return (
    referenceCriterionOptions.find((item) => item.value === criterion)?.label ?? "Chưa xác định"
  );
}

export function ReferenceEventEmpty({
  hasFilter,
  onReset,
  onAddEvidence,
}: {
  hasFilter: boolean;
  onReset: () => void;
  onAddEvidence: () => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-5">
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {hasFilter ? "Không tìm thấy sự kiện phù hợp." : "Chưa có sự kiện tham khảo phù hợp."}
      </p>
      <p className="mt-1 text-sm leading-5 text-[var(--text-secondary)]">
        {hasFilter
          ? "Thử từ khóa ngắn hơn hoặc chọn tiêu chí khác."
          : "Bạn vẫn có thể thêm minh chứng và tự tải tệp để cán bộ kiểm tra."}
      </p>
      <div className="mt-3">
        <Button
          type="button"
          variant={hasFilter ? "outline" : "default"}
          onClick={hasFilter ? onReset : onAddEvidence}
        >
          {hasFilter ? "Xóa tìm kiếm" : "Thêm minh chứng"}
        </Button>
      </div>
    </div>
  );
}

export function ReferenceEventError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-rose-900">
      <p className="text-sm font-medium">
        Chưa tải được kho minh chứng. Bộ lọc hiện tại vẫn được giữ.
      </p>
      <Button type="button" variant="outline" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}

export function OfficialEventLibraryBrowser({
  applicationId,
  title,
  search,
  criterion,
  hideCriterionFilters = false,
  pageSize = 20,
  compact = false,
  className,
  onSearchChange,
  onCriterionChange,
  onSelect,
}: OfficialEventLibraryBrowserProps) {
  const searchId = useId();
  const debouncedSearch = useDebouncedValue(search, 350);
  const library = useOfficialEventLibrary(
    {
      applicationId,
      search: debouncedSearch,
      criterion,
      page: 1,
      limit: pageSize,
    },
    Boolean(applicationId),
  );
  const items = library.data?.items ?? [];
  const hasFilter = Boolean(debouncedSearch.trim() || criterion !== "all");
  const emptyCopy = hasFilter
    ? {
        title: "Không tìm thấy hoạt động phù hợp.",
        description: "Thử tìm bằng tên chương trình, chiến dịch hoặc đơn vị tổ chức.",
      }
    : {
        title: "Chưa có hoạt động chính thức phù hợp.",
        description: "Khi Hội Sinh viên xác nhận danh sách, hoạt động sẽ xuất hiện tại đây.",
      };

  return (
    <div className={cn("min-w-0", className)}>
      {title ? (
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            Tìm hoạt động mình đã tham gia và thêm vào hồ sơ.
          </p>
        </div>
      ) : null}

      <div className={cn(title ? "mt-5" : undefined, "relative")}>
        <label className="sr-only" htmlFor={searchId}>
          Tìm tên sự kiện hoặc đơn vị tổ chức
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <Input
          id={searchId}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm tên sự kiện hoặc đơn vị tổ chức"
          className="h-12 w-full rounded-lg pl-10 pr-10 text-sm"
        />
        {search ? (
          <button
            type="button"
            aria-label="Xóa tìm kiếm"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-tertiary)] transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            onClick={() => onSearchChange("")}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {hideCriterionFilters ? null : (
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo tiêu chí">
          {criteriaOptions.map((option) => {
            const selected = criterion === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                  selected
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-slate-200 bg-white text-[var(--text-secondary)] hover:border-primary/25 hover:bg-slate-50",
                )}
                onClick={() => onCriterionChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        {library.isLoading ? (
          <div className={cn("grid gap-4", compact ? "grid-cols-1" : "md:grid-cols-2")}>
            {Array.from({ length: compact ? 4 : 6 }).map((_, index) => (
              <Skeleton key={index} className="min-h-[88px] rounded-lg" />
            ))}
          </div>
        ) : library.isError ? (
          <EmptyState
            variant="error"
            title="Chưa tải được kho minh chứng"
            description="Vui lòng thử lại. Bộ lọc và từ khóa hiện tại sẽ được giữ nguyên."
            primaryAction={
              <Button type="button" onClick={() => void library.refetch()}>
                Thử lại
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            variant="noData"
            title={emptyCopy.title}
            description={emptyCopy.description}
            primaryAction={
              hasFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onSearchChange("");
                    onCriterionChange("all");
                  }}
                >
                  Xóa tìm kiếm
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={cn("grid gap-4", compact ? "grid-cols-1" : "md:grid-cols-2")}>
            {items.map((item) => (
              <OfficialEventCard key={item.eventId} item={item} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function OfficialEventLibraryDialog({
  open,
  applicationId,
  title,
  criterion,
  hideCriterionFilters = false,
  onOpenChange,
  onManualUpload,
  onImported,
}: OfficialEventLibraryDialogProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Criterion | "all">(criterion ?? "all");
  const [item, setItem] = useState<OfficialEventLibraryItem | null>(null);
  const [state, setState] = useState<ImportDialogState>("confirm");
  const [lastEvidence, setLastEvidence] = useState<EvidenceResponse | null>(null);
  const [errorItem, setErrorItem] = useState<OfficialEventLibraryItem | null>(null);
  const importEvent = useImportOfficialEvent(applicationId);

  useEffect(() => {
    if (!open) return;
    setFilter(criterion ?? "all");
    setItem(null);
    setState("confirm");
    setLastEvidence(null);
    setErrorItem(null);
  }, [criterion, open]);

  const selectedItem = item ?? errorItem;

  const beginImport = (nextItem: OfficialEventLibraryItem) => {
    setItem(nextItem);
    setLastEvidence(null);
    setErrorItem(null);
    setState(nextItem.state === "already_imported" ? "already_imported" : "confirm");
  };

  const confirmImport = async () => {
    if (!item || item.state === "already_imported") {
      setState("already_imported");
      return;
    }

    setState("checking");
    try {
      const result = await importEvent.mutateAsync({ eventId: item.eventId });
      const evidence = result?.evidence ?? null;
      setLastEvidence(evidence);
      setState("success");
    } catch (error) {
      setErrorItem(item);
      setState(toImportDialogState(error));
    }
  };

  const closeAndReset = () => {
    setItem(null);
    setState("confirm");
    setLastEvidence(null);
    setErrorItem(null);
    onOpenChange(false);
  };

  const manualFallback = () => {
    const fallbackCriterion = selectedItem?.criterion ?? criterion ?? "volunteer";
    closeAndReset();
    onManualUpload(fallbackCriterion);
  };

  const viewApplication = () => {
    if (selectedItem) onImported?.(lastEvidence, selectedItem);
    closeAndReset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {!selectedItem ? (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Tìm hoạt động mình đã tham gia và thêm vào hồ sơ.
              </DialogDescription>
            </DialogHeader>
            <OfficialEventLibraryBrowser
              applicationId={applicationId}
              search={search}
              criterion={filter}
              hideCriterionFilters={hideCriterionFilters}
              compact
              pageSize={12}
              onSearchChange={setSearch}
              onCriterionChange={setFilter}
              onSelect={beginImport}
            />
          </>
        ) : (
          <ImportStateContent
            item={selectedItem}
            state={state}
            isSubmitting={importEvent.isPending}
            onClose={closeAndReset}
            onConfirm={() => void confirmImport()}
            onRetry={() => void confirmImport()}
            onManualUpload={manualFallback}
            onViewApplication={viewApplication}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function OfficialEventImportDialog({
  item,
  open,
  applicationId,
  onOpenChange,
  onManualUpload,
  onViewApplication,
}: OfficialEventImportDialogProps) {
  const [state, setState] = useState<ImportDialogState>("confirm");
  const [lastEvidence, setLastEvidence] = useState<EvidenceResponse | null>(null);
  const importEvent = useImportOfficialEvent(applicationId);

  useEffect(() => {
    if (!open || !item) return;
    setState(item.state === "already_imported" ? "already_imported" : "confirm");
    setLastEvidence(null);
  }, [item, open]);

  const confirmImport = async () => {
    if (!item || item.state === "already_imported") {
      setState("already_imported");
      return;
    }
    setState("checking");
    try {
      const result = await importEvent.mutateAsync({ eventId: item.eventId });
      setLastEvidence(result?.evidence ?? null);
      setState("success");
    } catch (error) {
      setState(toImportDialogState(error));
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <ImportStateContent
          item={item}
          state={state}
          isSubmitting={importEvent.isPending}
          onClose={() => onOpenChange(false)}
          onConfirm={() => void confirmImport()}
          onRetry={() => void confirmImport()}
          onManualUpload={() => {
            onOpenChange(false);
            onManualUpload(item.criterion ?? "volunteer");
          }}
          onViewApplication={() => onViewApplication(lastEvidence, item)}
        />
      </DialogContent>
    </Dialog>
  );
}

function OfficialEventCard({
  item,
  onSelect,
}: {
  item: OfficialEventLibraryItem;
  onSelect: (item: OfficialEventLibraryItem) => void;
}) {
  const imported = item.state === "already_imported";

  return (
    <button
      type="button"
      className={cn(
        "group flex min-h-[88px] w-full min-w-0 items-center gap-4 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 sm:p-5",
        imported
          ? "border-emerald-200 bg-emerald-50/80"
          : "border-slate-200 bg-white hover:border-primary/25 hover:bg-slate-50",
      )}
      onClick={() => onSelect(item)}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] font-semibold leading-5 text-[var(--text-primary)] sm:text-base">
          {item.title}
        </span>
        <span className="mt-1 block truncate text-[13px] leading-5 text-[var(--text-secondary)] sm:text-sm">
          {formatOrganizerSubtitle(item)}
        </span>
      </span>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          imported
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-50 text-[var(--text-tertiary)] group-hover:bg-white group-hover:text-primary",
        )}
        aria-hidden="true"
      >
        {imported ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </span>
    </button>
  );
}

function ImportStateContent({
  item,
  state,
  isSubmitting,
  onClose,
  onConfirm,
  onRetry,
  onManualUpload,
  onViewApplication,
}: {
  item: OfficialEventLibraryItem;
  state: ImportDialogState;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRetry: () => void;
  onManualUpload: () => void;
  onViewApplication: () => void;
}) {
  const subtitle = formatOrganizerSubtitle(item);
  const liveCopy = getStateCopy(state);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{item.title}</DialogTitle>
        <DialogDescription>{subtitle}</DialogDescription>
      </DialogHeader>

      <div className="min-h-[112px] rounded-lg border border-slate-100 bg-slate-50/70 p-4">
        {state === "confirm" ? (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Hệ thống sẽ kiểm tra thông tin của bạn trong danh sách đã được Hội Sinh viên xác nhận.
          </p>
        ) : state === "checking" ? (
          <div className="flex min-h-[80px] items-center gap-3 text-sm font-medium text-[var(--text-secondary)]">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Đang kiểm tra thông tin của bạn...
          </div>
        ) : (
          <div aria-live="polite">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{liveCopy.title}</p>
            {liveCopy.description ? (
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {liveCopy.description}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <DialogFooter>
        {state === "confirm" ? (
          <>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Đóng
            </Button>
            <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
              Kiểm tra và thêm
            </Button>
          </>
        ) : state === "checking" ? (
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Đóng
          </Button>
        ) : state === "success" ? (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button type="button" onClick={onViewApplication}>
              Xem trong hồ sơ
            </Button>
          </>
        ) : state === "participant_not_found" ? (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Button type="button" onClick={onManualUpload}>
              Tải minh chứng
            </Button>
          </>
        ) : state === "already_imported" ? (
          <Button type="button" onClick={onViewApplication}>
            Xem trong hồ sơ
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Đóng
            </Button>
            <Button type="button" onClick={onRetry} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Thử lại
            </Button>
          </>
        )}
      </DialogFooter>
    </>
  );
}

function getStateCopy(state: ImportDialogState) {
  if (state === "success") {
    return { title: "Đã thêm hoạt động vào hồ sơ." };
  }
  if (state === "participant_not_found") {
    return {
      title: "Chưa tìm thấy thông tin của bạn trong danh sách đã được xác nhận.",
      description: "Bạn vẫn có thể tải giấy chứng nhận hoặc minh chứng cá nhân để cán bộ kiểm tra.",
    };
  }
  if (state === "already_imported") {
    return { title: "Hoạt động này đã có trong hồ sơ." };
  }
  return {
    title: "Chưa thêm được hoạt động.",
    description: "Vui lòng kiểm tra kết nối và thử lại sau.",
  };
}

function toImportDialogState(error: unknown): ImportDialogState {
  if (error instanceof ApiError) {
    const normalized = `${error.code} ${error.message}`.toLowerCase();
    if (
      error.status === 409 ||
      normalized.includes("event_already_imported") ||
      normalized.includes("already") ||
      normalized.includes("duplicate")
    ) {
      return "already_imported";
    }
    if (
      error.status === 404 ||
      normalized.includes("participant_not_found") ||
      normalized.includes("participant") ||
      normalized.includes("roster")
    ) {
      return "participant_not_found";
    }
  }
  return "generic_error";
}

function formatOrganizerSubtitle(item: OfficialEventLibraryItem) {
  const parts = [
    item.organizer?.trim(),
    item.organizerLevel
      ? (organizerLevelLabel[item.organizerLevel as Level] ?? item.organizerLevel)
      : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Hoạt động chính thức";
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}
