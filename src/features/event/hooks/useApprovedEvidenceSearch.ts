import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Criterion } from "@/lib/api/types";
import { eventsApi } from "@/features/event/api/events";
import { evidenceKeys } from "@/features/evidence/hooks/useEvidence";

export type ApprovedEvidenceFilters = {
  studentCode?: string | null;
  criterion?: Criterion | "all";
  q?: string;
  status?: "all" | "importable" | "imported";
};

export const approvedEvidenceKeys = {
  all: ["approved-evidence"] as const,
  search: (filters: ApprovedEvidenceFilters) =>
    [...approvedEvidenceKeys.all, "search", filters] as const,
};

export function useApprovedEvidenceSearch(filters: ApprovedEvidenceFilters, enabled = true) {
  return useQuery({
    queryKey: approvedEvidenceKeys.search(filters),
    queryFn: async () => {
      const response = await eventsApi.searchApprovedEvidence({
        studentCode: filters.studentCode ?? undefined,
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
    enabled: enabled && Boolean(filters.studentCode),
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
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
      }
      queryClient.invalidateQueries({ queryKey: approvedEvidenceKeys.all });
      if (data?.evidence?.id) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.detail(data.evidence.id) });
        queryClient.invalidateQueries({ queryKey: evidenceKeys.card(data.evidence.id) });
        queryClient.invalidateQueries({ queryKey: evidenceKeys.audit(data.evidence.id) });
      }
      toast.success("Đã import minh chứng vào hồ sơ.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể import minh chứng.");
    },
  });
}
