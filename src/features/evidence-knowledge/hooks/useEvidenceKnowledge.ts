import { useQuery } from "@tanstack/react-query";
import { evidenceKnowledgeApi } from "../api/evidence-knowledge";
import type { OfficerEvidenceKnowledgeSearchFilters } from "../types";

export const evidenceKnowledgeKeys = {
  all: ["evidence-knowledge"] as const,
  officerSearch: (filters: OfficerEvidenceKnowledgeSearchFilters) =>
    [...evidenceKnowledgeKeys.all, "officer-search", filters] as const,
  officerEvent: (eventId?: string) =>
    [...evidenceKnowledgeKeys.all, "officer-event", eventId ?? ""] as const,
};

export function useOfficerEvidenceKnowledgeSearch(
  filters: OfficerEvidenceKnowledgeSearchFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: evidenceKnowledgeKeys.officerSearch(filters),
    queryFn: async ({ signal }) => {
      const response = await evidenceKnowledgeApi.searchOfficer(filters, { signal });
      return (
        response.data ?? {
          items: [],
          pagination: {
            page: filters.page ?? 1,
            limit: filters.limit ?? 20,
            total: 0,
            totalPages: 1,
          },
        }
      );
    },
    enabled,
  });
}

export function useOfficerEvidenceKnowledgeEvent(eventId?: string, enabled = true) {
  return useQuery({
    queryKey: evidenceKnowledgeKeys.officerEvent(eventId),
    queryFn: async ({ signal }) => {
      const response = await evidenceKnowledgeApi.getOfficerEvent(eventId ?? "", { signal });
      return response.data;
    },
    enabled: enabled && Boolean(eventId),
  });
}
