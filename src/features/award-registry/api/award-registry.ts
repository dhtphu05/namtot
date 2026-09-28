import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Pagination } from "@/lib/api/types";
import type {
  AwardDecision,
  AwardDecisionCreateInput,
  AwardDecisionList,
  AwardDecisionUpdateInput,
  AwardRecipientList,
  AwardRegistryFilters,
  AwardRosterMapping,
  AwardRosterPreview,
  AwardRosterProcessing,
  WorkspaceName,
} from "@/types/award-registry";

function queryString(filters: object) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export const awardRegistryApi = {
  list: async (filters: AwardRegistryFilters = {}) =>
    withMetaPagination(
      await apiClient<AwardDecisionList>(`/api/award-decisions${queryString(filters)}`),
    ),

  get: (decisionId: string) => apiClient<AwardDecision>(`/api/award-decisions/${decisionId}`),

  create: (input: AwardDecisionCreateInput) =>
    apiClient<AwardDecision>("/api/award-decisions", { method: "POST", body: input }),

  update: (decisionId: string, input: AwardDecisionUpdateInput) =>
    apiClient<AwardDecision>(`/api/award-decisions/${decisionId}`, {
      method: "PATCH",
      body: input,
    }),

  upload: (decisionId: string, kind: "decision" | "roster", file: File) => {
    const body = new FormData();
    body.append("file", file);
    return apiClient<AwardDecision>(`/api/award-decisions/${decisionId}/files/${kind}`, {
      method: "POST",
      body,
    });
  },

  processRoster: (decisionId: string) =>
    apiClient<{ status: "processing" | "preview_ready" }>(
      `/api/award-decisions/${decisionId}/process-roster`,
      { method: "POST" },
    ),

  getProcessing: (decisionId: string) =>
    apiClient<AwardRosterProcessing>(`/api/award-decisions/${decisionId}/roster-processing`),

  getPreview: (decisionId: string, page = 1, limit = 20) =>
    apiClient<AwardRosterPreview>(
      `/api/award-decisions/${decisionId}/roster-preview${queryString({ page, limit })}`,
    ),

  updateMapping: (decisionId: string, mapping: AwardRosterMapping) =>
    apiClient<Pick<AwardRosterPreview, "mapping" | "validationSummary" | "items" | "pagination">>(
      `/api/award-decisions/${decisionId}/roster-mapping`,
      { method: "PATCH", body: mapping },
    ),

  confirm: (decisionId: string) =>
    apiClient<{ recipientCount: number }>(`/api/award-decisions/${decisionId}/confirm`, {
      method: "POST",
    }),

  recipients: async (decisionId: string, page = 1, limit = 20) =>
    withMetaPagination(
      await apiClient<AwardRecipientList>(
        `/api/award-decisions/${decisionId}/recipients${queryString({ page, limit })}`,
      ),
    ),

  listWorkspaceNames: () => apiClient<WorkspaceName[]>("/api/workspaces"),
};

function withMetaPagination<T extends { items: unknown[]; pagination?: Pagination }>(
  response: ApiResponse<T>,
): ApiResponse<T> {
  if (!response.data || response.data.pagination || !response.meta.pagination) return response;
  return {
    ...response,
    data: { ...response.data, pagination: response.meta.pagination },
  };
}

export function requireAwardData<T>(response: ApiResponse<T>): T {
  if (response.data === null) throw new Error("API không trả dữ liệu quyết định.");
  return response.data;
}
