import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { getDefaultAppPathForRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import type { Criterion } from "@/lib/api/types";
import {
  useOfficerEvidenceKnowledgeEvent,
  useOfficerEvidenceKnowledgeSearch,
} from "../hooks/useEvidenceKnowledge";
import type { AcceptedEvidencePrecedent } from "../types";
import { EvidencePrecedentSheet } from "./EvidencePrecedentSheet";
import { OfficerEventList } from "./OfficerEventList";
import { OfficerEventWorkspace } from "./OfficerEventWorkspace";
import { getCriterionLabel } from "./evidence-knowledge-labels";

type EvidenceKnowledgeRouteSearch = {
  q?: string;
};

export function OfficerEvidenceKnowledgePage() {
  const navigate = useNavigate();
  const searchParams = useSearch({
    from: "/app/evidence-knowledge",
  }) as EvidenceKnowledgeRouteSearch;
  const user = useAuth((state) => state.user);
  const canViewOfficerKnowledge =
    user?.role === "officer" ||
    user?.role === "manager" ||
    user?.role === "committee" ||
    user?.role === "city_officer" ||
    user?.role === "city_manager" ||
    user?.role === "city_committee" ||
    user?.role === "admin";
  const [search, setSearch] = useState(searchParams.q ?? "");
  const debouncedSearch = useDebouncedValue(search, 280);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<{
    item: AcceptedEvidencePrecedent;
    index: number;
  } | null>(null);

  useEffect(() => {
    setSearch(searchParams.q ?? "");
  }, [searchParams.q]);

  useEffect(() => {
    if (!canViewOfficerKnowledge) return;
    const timeout = window.setTimeout(() => {
      void navigate({
        to: "/app/evidence-knowledge",
        replace: true,
        search: { q: search.trim() || undefined } as never,
      });
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [canViewOfficerKnowledge, navigate, search]);

  useEffect(() => {
    if (!user || canViewOfficerKnowledge) return;
    void navigate({
      to: getDefaultAppPathForRole(user.role),
      replace: true,
    });
  }, [canViewOfficerKnowledge, navigate, user]);

  const filters = useMemo(
    () => ({
      q: debouncedSearch.trim() || undefined,
      page: 1,
      limit: 50,
    }),
    [debouncedSearch],
  );
  const searchQuery = useOfficerEvidenceKnowledgeSearch(filters, canViewOfficerKnowledge);
  const items = useMemo(() => searchQuery.data?.items ?? [], [searchQuery.data?.items]);
  const selected = items.find((item) => item.eventId === selectedEventId) ?? items[0] ?? null;
  const detailQuery = useOfficerEvidenceKnowledgeEvent(
    selected?.eventId,
    canViewOfficerKnowledge && Boolean(selected?.eventId),
  );
  const workspaceName = user?.workspace?.shortName || user?.workspace?.name || "workspace hiện tại";
  const criteria = (user?.officerSpecializations ?? [])
    .filter((item) => item.isActive !== false)
    .map((item) => item.criterion)
    .filter((criterion, index, arr) => arr.indexOf(criterion) === index);

  useEffect(() => {
    if (!selectedEventId && items[0]?.eventId) {
      setSelectedEventId(items[0].eventId);
    }
    if (
      selectedEventId &&
      items.length &&
      !items.some((item) => item.eventId === selectedEventId)
    ) {
      setSelectedEventId(items[0]?.eventId ?? null);
      setSelectedEvidence(null);
    }
  }, [items, selectedEventId]);

  const detail = detailQuery.data ?? null;

  if (!canViewOfficerKnowledge) {
    return null;
  }

  return (
    <>
      <PageHeader
        title="Kho minh chứng chuyên trách"
        subtitle={`Tra cứu tiền lệ minh chứng đã được chấp nhận trong ${workspaceName}. ${formatCriteria(criteria)}`}
        showSearch={false}
      />

      <div className="min-w-0 space-y-4 pb-8">
        <div className="flex min-h-11 items-center gap-2 rounded-md border border-[#CBD5E1] bg-white px-3">
          <label className="sr-only" htmlFor="officer-evidence-knowledge-search">
            Tìm tiền lệ minh chứng
          </label>
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            id="officer-evidence-knowledge-search"
            className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder="Tìm theo tên sự kiện, viết tắt, đơn vị tổ chức hoặc năm..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="grid min-w-0 overflow-hidden rounded-md border border-[#CBD5E1] bg-white xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-w-0 overflow-hidden border-b border-[#CBD5E1] xl:border-b-0 xl:border-r">
            <div className="border-b border-[#E5E7EB] px-3 py-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  Sự kiện đã có tiền lệ
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  {searchQuery.isLoading ? "..." : `${items.length} kết quả`}
                </div>
              </div>
            </div>
            <OfficerEventList
              items={items}
              selectedEventId={selected?.eventId}
              isLoading={searchQuery.isLoading}
              isError={searchQuery.isError}
              errorMessage={
                searchQuery.error instanceof Error ? searchQuery.error.message : undefined
              }
              onSelect={(eventId) => {
                setSelectedEventId(eventId);
                setSelectedEvidence(null);
              }}
              onRetry={() => void searchQuery.refetch()}
            />
          </aside>

          <div className="min-w-0 p-4">
            <OfficerEventWorkspace
              selected={selected}
              detail={detail}
              isLoading={detailQuery.isLoading}
              isError={detailQuery.isError}
              onRetry={() => void detailQuery.refetch()}
              onSelectEvidence={(item, index) => setSelectedEvidence({ item, index })}
            />
          </div>
        </div>
      </div>

      <EvidencePrecedentSheet
        open={Boolean(selectedEvidence)}
        event={detail}
        item={selectedEvidence?.item}
        index={selectedEvidence?.index}
        onOpenChange={(open) => {
          if (!open) setSelectedEvidence(null);
        }}
      />
    </>
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

function formatCriteria(criteria: Criterion[]) {
  if (!criteria.length) return "Tiêu chí phụ trách sẽ do hệ thống quyền hiện tại xác định.";
  return `Tiêu chí phụ trách: ${criteria.map(getCriterionLabel).join(", ")}.`;
}
