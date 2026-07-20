import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Criterion } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { eventsApi } from "@/features/event/api/events";
import { applicationKeys } from "@/features/application/hooks/useApplication";
import { evidenceKeys } from "@/features/evidence/hooks/useEvidence";
import type { OfficialEventLibraryResponse } from "@/types/evidence";

export type ApprovedEvidenceFilters = {
  studentCode?: string | null;
  studentName?: string | null;
  criterion?: Criterion | "all";
  q?: string;
  status?: "all" | "importable" | "imported";
};

export type OfficialEventLibraryFilters = {
  applicationId?: string;
  search?: string;
  criterion?: Criterion | "all";
  projection?: "full" | "reference";
  page?: number;
  limit?: number;
};

export type EvidenceEventSuggestionFilters = {
  applicationId?: string;
  query?: string;
  criterion?: Criterion;
  eventId?: string;
  limit?: number;
  excludeImported?: boolean;
};

export const approvedEvidenceKeys = {
  all: ["approved-evidence"] as const,
  search: (filters: ApprovedEvidenceFilters) =>
    [...approvedEvidenceKeys.all, "search", filters] as const,
};

export const officialEventLibraryKeys = {
  all: ["official-event-library"] as const,
  list: (filters: OfficialEventLibraryFilters) =>
    [
      ...officialEventLibraryKeys.all,
      {
        applicationId: filters.applicationId ?? null,
        search: filters.search?.trim() ?? "",
        criterion: filters.criterion ?? "all",
        projection: filters.projection ?? "full",
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      },
    ] as const,
  suggestions: (filters: EvidenceEventSuggestionFilters) =>
    [
      ...officialEventLibraryKeys.all,
      "suggestions",
      {
        applicationId: filters.applicationId ?? null,
        query: filters.query?.trim() ?? "",
        criterion: filters.criterion ?? null,
        eventId: filters.eventId ?? null,
        limit: filters.limit ?? 5,
        excludeImported: filters.excludeImported ?? true,
      },
    ] as const,
};

export function useApprovedEvidenceSearch(filters: ApprovedEvidenceFilters, enabled = true) {
  return useQuery({
    queryKey: approvedEvidenceKeys.search(filters),
    queryFn: async () => {
      const response = await eventsApi.searchApprovedEvidence({
        studentCode: filters.studentCode ?? undefined,
        studentName: filters.studentName ?? undefined,
        criterion: filters.criterion && filters.criterion !== "all" ? filters.criterion : undefined,
        q: filters.q?.trim() || undefined,
      });
      const items = response.data ?? [];

      if (filters.status === "importable") {
        return items.filter((item) => item.importable && !item.alreadyImported);
      }

      if (filters.status === "imported") {
        return items.filter((item) => item.alreadyImported);
      }

      return items;
    },
    enabled,
  });
}

export function useOfficialEventLibrary(filters: OfficialEventLibraryFilters, enabled = true) {
  return useQuery<OfficialEventLibraryResponse>({
    queryKey: officialEventLibraryKeys.list(filters),
    queryFn: async ({ signal }) => {
      if (!filters.applicationId) {
        return {
          items: [],
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
          total: 0,
          totalPages: 1,
        };
      }

      const response = await eventsApi.searchOfficialEventLibrary(
        {
          applicationId: filters.applicationId,
          search: filters.search?.trim() || undefined,
          criterion:
            filters.criterion && filters.criterion !== "all" ? filters.criterion : undefined,
          projection: filters.projection,
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
        },
        { signal },
      );
      return response.data;
    },
    enabled: enabled && Boolean(filters.applicationId),
  });
}

export function useEvidenceEventSuggestions(
  filters: EvidenceEventSuggestionFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: officialEventLibraryKeys.suggestions(filters),
    queryFn: async ({ signal }) => {
      if (!filters.applicationId) {
        return {
          query: filters.query ?? null,
          normalizedQuery: null,
          suggestions: [],
          meta: { minimumQueryLength: 3, resultCount: 0, source: "event_registry" as const },
        };
      }
      const response = await eventsApi.getEvidenceEventSuggestions(
        {
          applicationId: filters.applicationId,
          query: filters.query?.trim() || undefined,
          criterion: filters.criterion,
          eventId: filters.eventId,
          limit: filters.limit ?? 5,
          excludeImported: filters.excludeImported ?? true,
        },
        { signal },
      );
      return response.data;
    },
    enabled: enabled && Boolean(filters.applicationId),
    placeholderData: (previous) => previous,
  });
}

export function useImportOfficialEvent(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId }: { eventId: string }) => {
      if (!applicationId) throw new Error("Missing applicationId");
      const response = await eventsApi.importAsEvidence(eventId, { applicationId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
        queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(applicationId) });
        queryClient.invalidateQueries({
          queryKey: applicationKeys.criteriaCompletion(applicationId),
        });
      }
      queryClient.invalidateQueries({ queryKey: officialEventLibraryKeys.all });
      if (data?.evidence?.id) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.detail(data.evidence.id) });
        queryClient.invalidateQueries({ queryKey: evidenceKeys.card(data.evidence.id) });
        queryClient.invalidateQueries({ queryKey: evidenceKeys.audit(data.evidence.id) });
      }
    },
  });
}

export function useImportApprovedEvidence(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, participantId }: { eventId: string; participantId: string }) => {
      if (!applicationId) throw new Error("Missing applicationId");
      const response = await eventsApi.importAsEvidence(eventId, { applicationId, participantId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.assistantContext() });
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
        queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(applicationId) });
        queryClient.invalidateQueries({
          queryKey: applicationKeys.criteriaCompletion(applicationId),
        });
      }
      queryClient.invalidateQueries({ queryKey: officialEventLibraryKeys.all });
      queryClient.invalidateQueries({ queryKey: approvedEvidenceKeys.all });
      if (data?.evidence?.id) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.detail(data.evidence.id) });
        queryClient.invalidateQueries({ queryKey: evidenceKeys.card(data.evidence.id) });
        queryClient.invalidateQueries({ queryKey: evidenceKeys.audit(data.evidence.id) });
      }
      toast.success("Đã thêm minh chứng vào hồ sơ.");
    },
    onError: (error: Error) => {
      toast.error(getImportErrorMessage(error));
    },
  });
}

function getImportErrorMessage(error: Error) {
  if (error instanceof ApiError) {
    const normalized = `${error.message} ${error.code}`.toLowerCase();
    if (error.status === 403) return "Bạn không có quyền thực hiện thao tác này.";
    if (
      error.status === 409 ||
      normalized.includes("already") ||
      normalized.includes("duplicate")
    ) {
      return "Minh chứng này đã có trong hồ sơ.";
    }
    if (normalized.includes("participant") || normalized.includes("mismatch")) {
      return "Bạn chỉ có thể thêm minh chứng của chính mình.";
    }
  }
  return "Chưa thêm được minh chứng. Vui lòng thử lại.";
}
