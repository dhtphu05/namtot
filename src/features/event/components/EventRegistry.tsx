import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Search,
  SlidersHorizontal,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/store/auth-store";
import {
  useEventParticipantsPage,
  useEventsPage,
  useStaffEventWorkspace,
} from "@/features/event/hooks/useEvents";
import { useSignedFileUrl } from "@/features/evidence/hooks/useEvidence";
import {
  criterionLabel,
  levelLabel,
  type Criterion,
  type EventRegistryItem,
  type IndexingStatus,
  type Level,
  type Role,
  type StaffEventFile,
  type StaffEventWorkspace,
} from "@/lib/api/types";
import { cn } from "@/lib/utils";

const criteria: Array<{ value: Criterion | "all"; label: string }> = [
  { value: "all", label: "Tất cả" },
  { value: "ethics", label: "Đạo đức" },
  { value: "academic", label: "Học tập" },
  { value: "physical", label: "Thể lực" },
  { value: "volunteer", label: "Tình nguyện" },
  { value: "integration", label: "Hội nhập" },
];

const eventPageSize = 40;
const participantPageSize = 20;

type MobileTab = "info" | "documents" | "participants" | "mapping";

export function EventRegistry() {
  const user = useAuth((state) => state.user);
  const role = user?.role as Role | undefined;
  const canManageEvents =
    role === "officer" ||
    role === "manager" ||
    role === "city_officer" ||
    role === "city_manager" ||
    role === "admin";
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventSearch, setEventSearch] = useState("");
  const [criterion, setCriterion] = useState<Criterion | "all">("all");
  const [eventPage, setEventPage] = useState(1);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantPage, setParticipantPage] = useState(1);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("info");
  const debouncedEventSearch = useDebouncedValue(eventSearch, 350);
  const debouncedParticipantSearch = useDebouncedValue(participantSearch, 350);

  const eventFilters = useMemo(
    () => ({
      q: debouncedEventSearch.trim() || undefined,
      criterion: criterion === "all" ? undefined : criterion,
      page: eventPage,
      limit: eventPageSize,
    }),
    [criterion, debouncedEventSearch, eventPage],
  );
  const eventsQuery = useEventsPage(eventFilters);
  const events = useMemo(() => eventsQuery.data?.items ?? [], [eventsQuery.data?.items]);
  const eventPagination = eventsQuery.data?.pagination;
  const selectedListEvent = events.find((item) => item.id === selectedEventId) ?? null;
  const detailQuery = useStaffEventWorkspace(selectedEventId ?? undefined);
  const detail = detailQuery.data;
  const participantParams = useMemo(
    () => ({
      q: debouncedParticipantSearch.trim() || undefined,
      page: participantPage,
      limit: participantPageSize,
    }),
    [debouncedParticipantSearch, participantPage],
  );
  const participantsQuery = useEventParticipantsPage(
    selectedEventId ?? undefined,
    participantParams,
  );

  useEffect(() => {
    setEventPage(1);
  }, [criterion, debouncedEventSearch]);

  useEffect(() => {
    setParticipantPage(1);
  }, [debouncedParticipantSearch, selectedEventId]);

  useEffect(() => {
    if (!events.length) {
      setSelectedEventId(null);
      return;
    }
    if (!selectedEventId || !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const selectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setMobileTab("info");
  };

  return (
    <>
      <PageHeader
        title="Kho sự kiện chính thức"
        subtitle="Quản lý sự kiện, tài liệu nguồn và danh sách người tham gia."
        showSearch={false}
        action={
          canManageEvents ? (
            <Button asChild>
              <Link to="/app/decision-imports">
                <UploadCloud className="h-4 w-4" />
                Import quyết định
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid min-h-0 gap-4 lg:h-[calc(100dvh-132px)] lg:grid-cols-[minmax(280px,32%)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[minmax(300px,31%)_minmax(420px,47%)_minmax(240px,22%)]">
        <OfficialEventListPanel
          className={cn(selectedEventId ? "hidden lg:flex" : "flex")}
          events={events}
          pagination={eventPagination}
          search={eventSearch}
          criterion={criterion}
          selectedEventId={selectedEventId}
          isLoading={eventsQuery.isLoading}
          isError={eventsQuery.isError}
          onSearchChange={setEventSearch}
          onCriterionChange={setCriterion}
          onSelect={selectEvent}
          onRetry={() => void eventsQuery.refetch()}
          onPageChange={setEventPage}
          canManageEvents={canManageEvents}
        />

        <main
          className={cn(
            "min-h-0 min-w-0",
            selectedEventId ? "flex flex-col" : "hidden lg:flex lg:flex-col",
          )}
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2 lg:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedEventId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            {detail ? (
              <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {detail.event.name}
              </span>
            ) : null}
          </div>

          {selectedEventId ? (
            <OfficialEventDetailPanel
              detail={detail}
              fallbackEvent={selectedListEvent}
              isLoading={detailQuery.isLoading}
              isError={detailQuery.isError}
              onRetry={() => void detailQuery.refetch()}
              participants={participantsQuery.data?.items ?? []}
              participantPagination={participantsQuery.data?.pagination}
              participantSearch={participantSearch}
              onParticipantSearchChange={setParticipantSearch}
              participantLoading={participantsQuery.isLoading}
              participantError={participantsQuery.isError}
              onParticipantRetry={() => void participantsQuery.refetch()}
              onParticipantPageChange={setParticipantPage}
              mobileTab={mobileTab}
              onMobileTabChange={setMobileTab}
              onOpenMapping={() => setMappingOpen(true)}
            />
          ) : (
            <NoSelectionState />
          )}
        </main>

        <aside className="hidden min-h-0 min-w-0 xl:flex xl:flex-col">
          {detail ? (
            <MappingPanel detail={detail} role={role} canManageEvents={canManageEvents} />
          ) : (
            <NoSelectionState compact />
          )}
        </aside>
      </div>

      <Drawer open={mappingOpen} onOpenChange={setMappingOpen}>
        <DrawerContent className="mx-auto max-h-[88dvh] max-w-xl overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>Mapping và quy đổi</DrawerTitle>
            <DrawerDescription>
              Thông tin dùng để sinh viên import hoạt động vào hồ sơ.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 overflow-y-auto px-4 pb-4">
            {detail ? (
              <MappingPanel detail={detail} role={role} canManageEvents={canManageEvents} />
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function OfficialEventListPanel({
  className,
  events,
  pagination,
  search,
  criterion,
  selectedEventId,
  isLoading,
  isError,
  canManageEvents,
  onSearchChange,
  onCriterionChange,
  onSelect,
  onRetry,
  onPageChange,
}: {
  className?: string;
  events: EventRegistryItem[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  search: string;
  criterion: Criterion | "all";
  selectedEventId: string | null;
  isLoading: boolean;
  isError: boolean;
  canManageEvents: boolean;
  onSearchChange: (value: string) => void;
  onCriterionChange: (value: Criterion | "all") => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}) {
  const searchId = useId();
  const hasFilter = Boolean(search.trim() || criterion !== "all");

  return (
    <aside
      className={cn(
        "min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white",
        className,
      )}
    >
      <div className="shrink-0 border-b border-slate-100 p-3">
        <div className="relative">
          <label className="sr-only" htmlFor={searchId}>
            Tìm sự kiện, đơn vị tổ chức
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            id={searchId}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm sự kiện, đơn vị tổ chức"
            className="h-11 pl-10 pr-10 text-sm"
          />
          {search ? (
            <button
              type="button"
              aria-label="Xóa tìm kiếm"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Lọc theo tiêu chí">
          {criteria.map((item) => {
            const selected = criterion === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                  selected
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-slate-200 bg-white text-[var(--text-secondary)] hover:bg-slate-50",
                )}
                onClick={() => onCriterionChange(item.value)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-[74px] rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <PanelEmpty
            tone="error"
            title="Chưa tải được kho sự kiện"
            description="Vui lòng thử lại. Bộ lọc hiện tại sẽ được giữ nguyên."
            action={
              <Button type="button" size="sm" onClick={onRetry}>
                Thử lại
              </Button>
            }
          />
        ) : events.length ? (
          <ul className="space-y-1.5">
            {events.map((event) => (
              <li key={event.id}>
                <EventListItem
                  event={event}
                  selected={event.id === selectedEventId}
                  onSelect={() => onSelect(event.id)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <PanelEmpty
            title={hasFilter ? "Không tìm thấy sự kiện phù hợp" : "Chưa có sự kiện chính thức"}
            description={
              hasFilter
                ? "Thử tìm bằng tên chương trình hoặc đơn vị tổ chức."
                : "Xác nhận một phiên import quyết định để tạo sự kiện chính thức."
            }
            action={
              !hasFilter && canManageEvents ? (
                <Button asChild size="sm">
                  <Link to="/app/decision-imports">Import quyết định</Link>
                </Button>
              ) : hasFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
        )}
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 text-xs text-[var(--text-secondary)]">
          <span>
            Trang {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            >
              Trước
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function EventListItem({
  event,
  selected,
  onSelect,
}: {
  event: EventRegistryItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "flex min-h-[72px] w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        selected ? "bg-primary/10" : "hover:bg-slate-50",
      )}
      onClick={onSelect}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold leading-5 text-[var(--text-primary)]">
          {event.eventName}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">
          {compactText([
            event.organizer,
            event.organizerLevel ? levelLabel[event.organizerLevel] : null,
            event.participantCount ? `${event.participantCount} sinh viên` : null,
          ])}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <StatusPill status={event.rosterIndexed ? "ready" : event.status} />
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)] lg:hidden" />
      </span>
    </button>
  );
}

function OfficialEventDetailPanel({
  detail,
  fallbackEvent,
  isLoading,
  isError,
  participants,
  participantPagination,
  participantSearch,
  participantLoading,
  participantError,
  mobileTab,
  onRetry,
  onParticipantSearchChange,
  onParticipantRetry,
  onParticipantPageChange,
  onMobileTabChange,
  onOpenMapping,
}: {
  detail?: StaffEventWorkspace | null;
  fallbackEvent?: EventRegistryItem | null;
  isLoading: boolean;
  isError: boolean;
  participants: Array<{
    id: string;
    studentName: string;
    studentCode: string;
    className?: string | null;
    participationStatus?: string | null;
  }>;
  participantPagination?: { page: number; limit: number; total: number; totalPages: number };
  participantSearch: string;
  participantLoading: boolean;
  participantError: boolean;
  mobileTab: MobileTab;
  onRetry: () => void;
  onParticipantSearchChange: (value: string) => void;
  onParticipantRetry: () => void;
  onParticipantPageChange: (page: number) => void;
  onMobileTabChange: (tab: MobileTab) => void;
  onOpenMapping: () => void;
}) {
  if (isError) {
    return (
      <Surface className="flex min-h-[360px] items-center justify-center">
        <PanelEmpty
          tone="error"
          title="Chưa tải được thông tin sự kiện"
          description="Danh sách bên trái vẫn được giữ nguyên. Vui lòng thử lại."
          action={
            <Button type="button" onClick={onRetry}>
              Thử lại
            </Button>
          }
        />
      </Surface>
    );
  }

  if (isLoading && !detail) {
    return (
      <Surface className="space-y-4 p-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </Surface>
    );
  }

  if (!detail) {
    return fallbackEvent ? (
      <Surface className="p-4">
        <EventHeaderFallback event={fallbackEvent} />
      </Surface>
    ) : (
      <NoSelectionState />
    );
  }

  return (
    <Surface className="min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-slate-100 p-4">
          <EventHeader detail={detail} />
          <div className="mt-3 flex items-center gap-2 xl:hidden">
            <Button type="button" variant="outline" size="sm" onClick={onOpenMapping}>
              <SlidersHorizontal className="h-4 w-4" />
              Xem mapping
            </Button>
          </div>
          <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto lg:hidden" role="tablist">
            {mobileTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={mobileTab === tab.value}
                className={cn(
                  "min-h-10 shrink-0 rounded-full px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
                  mobileTab === tab.value
                    ? "bg-primary/10 text-primary"
                    : "text-[var(--text-secondary)] hover:bg-slate-50",
                )}
                onClick={() => onMobileTabChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-5">
            <DetailSection
              title="Thông tin"
              className={cn(mobileTab !== "info" && "hidden lg:block")}
            >
              <IndexStatus detail={detail} />
            </DetailSection>

            <DetailSection
              title="Tài liệu nguồn"
              className={cn(mobileTab !== "documents" && "hidden lg:block")}
            >
              <SourceDocuments files={detail.files} />
            </DetailSection>

            <DetailSection
              title="Danh sách sinh viên"
              className={cn(mobileTab !== "participants" && "hidden lg:block")}
            >
              <ParticipantsTable
                rows={participants}
                pagination={participantPagination}
                search={participantSearch}
                isLoading={participantLoading}
                isError={participantError}
                onSearchChange={onParticipantSearchChange}
                onRetry={onParticipantRetry}
                onPageChange={onParticipantPageChange}
              />
            </DetailSection>

            <div className={cn(mobileTab !== "mapping" && "hidden", "lg:hidden")}>
              <MappingPanel detail={detail} />
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}

const mobileTabs: Array<{ value: MobileTab; label: string }> = [
  { value: "info", label: "Thông tin" },
  { value: "documents", label: "Tài liệu" },
  { value: "participants", label: "Người tham gia" },
  { value: "mapping", label: "Mapping" },
];

function EventHeader({ detail }: { detail: StaffEventWorkspace }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        SỰ KIỆN
      </div>
      <div className="mt-1 flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-xl font-bold leading-7 text-[var(--text-primary)]">
            {detail.event.name}
          </h2>
          <div className="mt-1 truncate text-sm text-[var(--text-secondary)]">
            {detail.event.organizer ?? "Chưa có đơn vị tổ chức"}
          </div>
        </div>
        <StatusPill
          status={getWorkspaceStatus(detail)}
          label={getFriendlyStatusLabel(getWorkspaceStatus(detail))}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
        <span>{detail.event.participantCount} sinh viên</span>
        <span>{levelLabel[detail.event.organizerLevel]}</span>
        {detail.source.decisionNumber ? <span>QĐ: {detail.source.decisionNumber}</span> : null}
      </div>
    </div>
  );
}

function EventHeaderFallback({ event }: { event: EventRegistryItem }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        SỰ KIỆN
      </div>
      <h2 className="mt-1 line-clamp-2 text-xl font-bold leading-7 text-[var(--text-primary)]">
        {event.eventName}
      </h2>
      <div className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang tải thông tin sự kiện...
      </div>
    </div>
  );
}

function SourceDocuments({ files }: { files: StaffEventFile[] }) {
  const [activeFile, setActiveFile] = useState<StaffEventFile | null>(null);

  useEffect(() => {
    setActiveFile(null);
  }, [files]);

  return (
    <div className="space-y-3">
      {files.length ? (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200/80">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex min-w-0 flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileTypeIcon file={file} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {file.originalName}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                    {fileRoleLabel(file.role)} · {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-10 sm:min-h-8"
                onClick={() => setActiveFile(file)}
              >
                Xem
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-[var(--text-secondary)]">
          Chưa có tài liệu nguồn cho sự kiện này.
        </p>
      )}

      {activeFile ? <OfficialFilePreview file={activeFile} /> : null}
    </div>
  );
}

function OfficialFilePreview({ file }: { file: StaffEventFile }) {
  const signedUrl = useSignedFileUrl(file.id, true);
  const url = signedUrl.data;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/60">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-3 py-2">
        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
          {file.originalName}
        </div>
        {url ? (
          <Button asChild type="button" variant="ghost" size="sm">
            <a href={url} target="_blank" rel="noreferrer">
              Mở tab mới
            </a>
          </Button>
        ) : null}
      </div>
      {signedUrl.isLoading ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </div>
      ) : signedUrl.isError ? (
        <PanelEmpty
          tone="error"
          title="Chưa mở được tài liệu"
          description="Vui lòng thử lại. Đường dẫn xem file chỉ được lấy khi bạn bấm xem."
          action={
            <Button type="button" size="sm" onClick={() => void signedUrl.refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : url && isImageFile(file) ? (
        <img src={url} alt={file.originalName} className="max-h-[420px] w-full object-contain" />
      ) : url && isPdfFile(file) ? (
        <iframe title={file.originalName} src={url} className="h-[420px] w-full bg-white" />
      ) : url ? (
        <div className="p-4 text-sm text-[var(--text-secondary)]">
          Trình duyệt không hỗ trợ preview loại file này. Hãy mở trong tab mới.
        </div>
      ) : null}
    </div>
  );
}

function IndexStatus({ detail }: { detail: StaffEventWorkspace }) {
  const status = getWorkspaceStatus(detail);
  const copy = getIndexStatusCopy(status);
  const summary = detail.indexSummary;

  return (
    <div className="rounded-lg border border-slate-200/80 p-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            Danh sách và trạng thái xử lý
          </div>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{copy}</p>
        </div>
        <StatusPill status={status} label={getFriendlyStatusLabel(status)} />
      </div>

      {summary.validRows !== null || summary.warningRows !== null || summary.errorRows !== null ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <MetricRow label="Hợp lệ" value={summary.validRows} />
          <MetricRow label="Cần xem lại" value={summary.warningRows} />
          <MetricRow label="Lỗi" value={summary.errorRows} />
        </div>
      ) : null}
    </div>
  );
}

function ParticipantsTable({
  rows,
  pagination,
  search,
  isLoading,
  isError,
  onSearchChange,
  onRetry,
  onPageChange,
}: {
  rows: Array<{
    id: string;
    studentName: string;
    studentCode: string;
    className?: string | null;
    participationStatus?: string | null;
  }>;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  search: string;
  isLoading: boolean;
  isError: boolean;
  onSearchChange: (value: string) => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}) {
  const searchId = useId();

  return (
    <div className="min-h-0">
      <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <label className="sr-only" htmlFor={searchId}>
            Tìm sinh viên trong danh sách
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            id={searchId}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm họ tên hoặc MSSV"
            className="h-10 pl-10 pr-10 text-sm"
          />
          {search ? (
            <button
              type="button"
              aria-label="Xóa tìm kiếm sinh viên"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {pagination ? (
          <span className="text-xs text-[var(--text-secondary)]">{pagination.total} sinh viên</span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-13 min-h-[52px] rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <PanelEmpty
          tone="error"
          title="Chưa tải được danh sách sinh viên"
          description="Lỗi này không ảnh hưởng danh sách sự kiện."
          action={
            <Button type="button" size="sm" onClick={onRetry}>
              Thử lại
            </Button>
          }
        />
      ) : (
        <>
          <div className="max-h-[420px] min-h-[220px] overflow-auto rounded-lg border border-slate-200/80">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs text-[var(--text-secondary)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Họ tên</th>
                  <th className="px-3 py-2 font-semibold">MSSV</th>
                  <th className="px-3 py-2 font-semibold">Lớp</th>
                  <th className="px-3 py-2 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="h-[52px] border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                      {row.studentName}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">{row.studentCode}</td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {row.className ?? ""}
                    </td>
                    <td className="px-3 py-2">
                      <SmallBadge>{formatParticipationStatus(row.participationStatus)}</SmallBadge>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]"
                    >
                      Không có sinh viên phù hợp.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
              <span>
                Trang {pagination.page}/{pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
                >
                  Sau
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MappingPanel({
  detail,
  role,
  canManageEvents = false,
}: {
  detail: StaffEventWorkspace;
  role?: Role;
  canManageEvents?: boolean;
}) {
  const ready = getWorkspaceStatus(detail) === "ready";

  return (
    <Surface className="min-h-0 overflow-y-auto p-4">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Mapping và quy đổi</h3>
          <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200/80">
            <InfoRow label="Tiêu chí" value={criterionLabel[detail.event.criterion]} />
            <InfoRow label="Cấp tổ chức" value={levelLabel[detail.event.organizerLevel]} />
            <InfoRow
              label="Giá trị ghi nhận"
              value={
                detail.event.convertedValue !== null
                  ? String(detail.event.convertedValue)
                  : "Chưa có"
              }
            />
            <InfoRow label="Đơn vị quy đổi" value={detail.event.convertedUnit ?? "Chưa có"} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trạng thái</h3>
          <p className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-3 text-sm leading-6 text-[var(--text-secondary)]">
            {ready
              ? "Sự kiện đã sẵn sàng để sinh viên thêm vào hồ sơ."
              : getIndexStatusCopy(getWorkspaceStatus(detail))}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Action</h3>
          <div className="mt-2">
            {ready ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Đã sẵn sàng sử dụng
              </div>
            ) : canManageEvents && detail.source.decisionImportId ? (
              <Button asChild variant="outline" className="w-full">
                <Link
                  to="/app/decision-imports/$decisionImportId"
                  params={{ decisionImportId: detail.source.decisionImportId }}
                >
                  Xem phiên import quyết định
                </Link>
              </Button>
            ) : role === "committee" || role === "city_committee" ? (
              <p className="rounded-lg border border-slate-200/80 px-3 py-3 text-sm text-[var(--text-secondary)]">
                Hội đồng đang xem ở chế độ chỉ đọc.
              </p>
            ) : (
              <p className="rounded-lg border border-slate-200/80 px-3 py-3 text-sm text-[var(--text-secondary)]">
                Chưa có thao tác tiếp theo khả dụng.
              </p>
            )}
          </div>
        </div>
      </div>
    </Surface>
  );
}

function NoSelectionState({ compact = false }: { compact?: boolean }) {
  return (
    <Surface
      className={cn(
        "flex min-h-[240px] items-center justify-center p-5 text-center",
        compact && "min-h-0 flex-1",
      )}
    >
      <p className="max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        Chọn một sự kiện để xem thông tin và danh sách sinh viên.
      </p>
    </Surface>
  );
}

function DetailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {children}
    </section>
  );
}

function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0 rounded-lg border border-slate-200/80 bg-white", className)}>
      {children}
    </div>
  );
}

function PanelEmpty({
  title,
  description,
  action,
  tone = "default",
}: {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center px-4 py-8 text-center">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          tone === "error" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600",
        )}
      >
        {tone === "error" ? <X className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
      </div>
      <div className="mt-3 text-sm font-semibold text-[var(--text-primary)]">{title}</div>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone = getStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex min-h-6 max-w-full items-center rounded-full px-2.5 text-xs font-semibold",
        tone === "success" && "bg-emerald-50 text-emerald-700",
        tone === "warning" && "bg-amber-50 text-amber-800",
        tone === "error" && "bg-rose-50 text-rose-700",
        tone === "info" && "bg-blue-50 text-blue-700",
        tone === "neutral" && "bg-slate-100 text-slate-700",
      )}
    >
      <span className="truncate">{label ?? getFriendlyStatusLabel(status)}</span>
    </span>
  );
}

function SmallBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function MetricRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="text-xs text-[var(--text-secondary)]">{label}</div>
      <div className="mt-1 text-base font-semibold text-[var(--text-primary)]">
        {value ?? "Chưa có"}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 px-3 py-2.5 text-sm">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="min-w-0 text-right font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function FileTypeIcon({ file }: { file: StaffEventFile }) {
  const Icon = isImageFile(file) ? ImageIcon : isSpreadsheetFile(file) ? FileSpreadsheet : FileText;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-primary">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function getWorkspaceStatus(detail: StaffEventWorkspace) {
  if (detail.event.status === "archived") return "archived";
  if (detail.indexSummary.status === "failed") return "failed";
  if (
    ["pending_indexing", "ocr_processing", "extracting", "checking_registry", "uploaded"].includes(
      detail.indexSummary.status,
    )
  ) {
    return "processing";
  }
  if (detail.event.rosterIndexed && detail.event.status === "active") return "ready";
  if (detail.indexSummary.status === "indexed") return "processed";
  return "needs_confirmation";
}

function getFriendlyStatusLabel(status: string) {
  const labels: Record<string, string> = {
    processing: "Đang xử lý",
    needs_confirmation: "Cần xác nhận",
    processed: "Đã xử lý",
    ready: "Sẵn sàng sử dụng",
    failed: "Có lỗi",
    archived: "Đã lưu trữ",
    active: "Sẵn sàng sử dụng",
    draft: "Cần xác nhận",
  };
  return labels[status] ?? "Cần xác nhận";
}

function getStatusTone(status: string) {
  if (status === "ready" || status === "active") return "success";
  if (status === "failed") return "error";
  if (status === "processing") return "info";
  if (status === "needs_confirmation" || status === "draft" || status === "processed")
    return "warning";
  return "neutral";
}

function getIndexStatusCopy(status: string) {
  if (status === "processing")
    return "Danh sách đang được xử lý. Tiến độ chỉ hiển thị khi backend có dữ liệu thật.";
  if (status === "processed" || status === "ready") return "Danh sách đã được xác nhận.";
  if (status === "failed")
    return "Quá trình xử lý danh sách gặp lỗi. Kiểm tra lại phiên import hoặc tài liệu nguồn.";
  if (status === "archived") return "Sự kiện đã được lưu trữ.";
  return "Danh sách cần được kiểm tra hoặc xác nhận trước khi sinh viên sử dụng.";
}

function fileRoleLabel(role: StaffEventFile["role"]) {
  const labels: Record<StaffEventFile["role"], string> = {
    roster: "Danh sách",
    decision_source: "Quyết định",
    sample_certificate: "Mẫu giấy chứng nhận",
  };
  return labels[role];
}

function formatParticipationStatus(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  const labels: Record<string, string> = {
    confirmed: "Đã xác nhận",
    participated: "Tham gia",
    participant: "Tham gia",
    attended: "Tham gia",
    present: "Tham gia",
    absent: "Vắng",
    pending: "Chờ xác nhận",
  };
  return normalized ? (labels[normalized] ?? value ?? "Tham gia") : "Tham gia";
}

function compactText(values: Array<string | number | null | undefined>) {
  return values.filter(isPresent).map(String).join(" · ");
}

function isPresent(value: unknown): value is string | number {
  if (typeof value === "number") return true;
  return typeof value === "string" && value.trim().length > 0;
}

function formatFileSize(size?: number | null) {
  if (!size || size <= 0) return "Không rõ dung lượng";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isImageFile(file: StaffEventFile) {
  return file.mimeType.startsWith("image/");
}

function isPdfFile(file: StaffEventFile) {
  return file.mimeType === "application/pdf" || file.originalName.toLowerCase().endsWith(".pdf");
}

function isSpreadsheetFile(file: StaffEventFile) {
  const name = file.originalName.toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    file.mimeType.includes("spreadsheet") ||
    file.mimeType.includes("excel")
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debouncedValue;
}
