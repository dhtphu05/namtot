import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Criterion } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
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
    enabled,
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
