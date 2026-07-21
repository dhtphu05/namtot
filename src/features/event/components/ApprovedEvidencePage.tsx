import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentApplication } from "@/features/application/hooks/useApplication";
import { AddEvidenceDrawer } from "@/features/evidence/components/AddEvidenceDrawer";
import { EmptyState, PageHeader, StudentPageShell } from "@/features/student/components/primitives";
import type { Criterion, EvidenceResponse } from "@/lib/api/types";
import type { OfficialEventLibraryItem } from "@/types/evidence";
import {
  ReferenceEventSkeleton,
  StudentReferenceEventLibrary,
} from "./OfficialEventLibraryStudent";

type EventLibrarySearch = {
  q?: string;
  criterion?: string;
};

type StudentReferenceEvent = Pick<
  OfficialEventLibraryItem,
  "eventId" | "title" | "criterion" | "approvedUsageCount"
>;

export function ApprovedEvidencePage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: "/app/event-library" }) as EventLibrarySearch;
  const currentApplication = useCurrentApplication();
  const applicationId = currentApplication.data?.application?.id;
  const [search, setSearch] = useState(searchParams.q ?? "");
  const [criterion, setCriterion] = useState<Criterion | "all">(
    normalizeCriterionSearch(searchParams.criterion) ?? "all",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [referenceEvent, setReferenceEvent] = useState<StudentReferenceEvent | null>(null);

  useEffect(() => {
    setSearch(searchParams.q ?? "");
    setCriterion(normalizeCriterionSearch(searchParams.criterion) ?? "all");
  }, [searchParams.criterion, searchParams.q]);

  const updateSearchParams = (nextSearch: string, nextCriterion: Criterion | "all") => {
    void navigate({
      to: "/app/event-library",
      replace: true,
      search: {
        q: nextSearch.trim() || undefined,
        criterion: nextCriterion === "all" ? undefined : nextCriterion,
      } as never,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateSearchParams(value, criterion);
  };

  const handleCriterionChange = (value: Criterion | "all") => {
    setCriterion(value);
    updateSearchParams(search, value);
  };

  const openBlankEvidenceSheet = () => {
    setReferenceEvent(null);
    setDrawerOpen(true);
  };

  const openReferenceEvidenceSheet = (item: StudentReferenceEvent) => {
    setReferenceEvent(item);
    setDrawerOpen(true);
  };

  const handleCreated = (evidence: EvidenceResponse) => {
    void navigate({
      to: "/app/application",
      search: {
        criterion: evidence.criterion,
        evidenceId: evidence.id,
      } as never,
    });
  };

  const selectedCriterion = criterion === "all" ? "academic" : criterion;

  return (
    <StudentPageShell className="px-4 md:px-6">
      <PageHeader
        title="Kho minh chứng"
        description="Trang này giúp bạn tham khảo tên hoạt động đã từng được chấp nhận để đặt tên minh chứng nhất quán hơn."
        rightAction={
          <Button
            type="button"
            className="min-h-11"
            onClick={openBlankEvidenceSheet}
            disabled={!applicationId || currentApplication.isLoading}
          >
            Thêm minh chứng
          </Button>
        }
      />

      {currentApplication.isLoading ? (
        <ReferencePageSkeleton />
      ) : currentApplication.isError ? (
        <div className="rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-rose-900">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">Chưa tải được hồ sơ để mở kho minh chứng.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void currentApplication.refetch()}
            >
              Thử lại
            </Button>
          </div>
        </div>
      ) : !currentApplication.data?.application ? (
        <EmptyState
          variant="noData"
          title="Bạn chưa có hồ sơ xét duyệt"
          description="Tạo hồ sơ trước khi thêm minh chứng từ tên hoạt động tham khảo."
          primaryAction={
            <Button asChild>
              <Link to="/app/application">Mở hồ sơ</Link>
            </Button>
          }
        />
      ) : (
        <StudentReferenceEventLibrary
          applicationId={applicationId}
          search={search}
          criterion={criterion}
          onSearchChange={handleSearchChange}
          onCriterionChange={handleCriterionChange}
          onSelect={openReferenceEvidenceSheet}
          onAddEvidence={openBlankEvidenceSheet}
        />
      )}

      {applicationId ? (
        <AddEvidenceDrawer
          applicationId={applicationId}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          initialCriterion={selectedCriterion}
          initialEvidenceName={referenceEvent?.title ?? ""}
          referenceEvent={
            referenceEvent
              ? {
                  eventId: referenceEvent.eventId,
                  title: referenceEvent.title,
                  criterion: referenceEvent.criterion ?? selectedCriterion,
                  approvedUsageCount: referenceEvent.approvedUsageCount ?? 0,
                }
              : null
          }
          submitLabel="Thêm vào hồ sơ"
          onCreated={handleCreated}
        />
      ) : null}
    </StudentPageShell>
  );
}

function ReferencePageSkeleton() {
  return (
    <div className="min-w-0">
      <Skeleton className="h-11 w-full rounded-lg" />
      <Skeleton className="mt-2 h-5 w-72 max-w-full rounded-md" />
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-32 shrink-0 rounded-md" />
        ))}
      </div>
      <div className="mt-4">
        <ReferenceEventSkeleton />
      </div>
    </div>
  );
}

function normalizeCriterionSearch(value?: string): Criterion | null {
  if (
    value === "ethics" ||
    value === "academic" ||
    value === "physical" ||
    value === "volunteer" ||
    value === "integration"
  ) {
    return value;
  }
  return null;
}
