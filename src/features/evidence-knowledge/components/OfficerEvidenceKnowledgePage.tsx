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
        <div className="rounded-md border border-[#E5E7EB] bg-white p-3">
          <label className="sr-only" htmlFor="officer-evidence-knowledge-search">
            Tìm tiền lệ minh chứng
          </label>
          <div className="flex min-h-11 items-center gap-2 rounded-md bg-[#F6F9FC] px-3 shadow-[0_0_0_1px_rgba(15,23,42,0.07)]">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              id="officer-evidence-knowledge-search"
              className="h-11 min-w-0 flex-1 bg-transparent px-0 shadow-none focus-visible:ring-0"
              placeholder="Tìm theo tên sự kiện, viết tắt, đơn vị tổ chức hoặc năm..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="min-w-0 overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
            <div className="border-b border-[#E5E7EB] px-3 py-3">
              <div className="text-sm font-bold text-brand-deep">Sự kiện đã có tiền lệ</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Kết quả được gom theo sự kiện chuẩn.
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
