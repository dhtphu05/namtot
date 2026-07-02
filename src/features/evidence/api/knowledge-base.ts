import { apiClient } from "@/lib/api/client";
import type { Criterion, Level, Pagination } from "@/lib/api/types";

export type KnowledgeDecision = "accepted" | "rejected" | "needs_supplement" | "reference_only";

export interface KnowledgeBaseItem {
  id: string;
  evidenceName: string | null;
  eventName: string | null;
  criterion: Criterion;
  level: Level | null;
  decision: KnowledgeDecision;
  reason: string;
  requiredFieldsJson: string[];
  commonErrorsJson: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseFilters {
  q?: string;
  criterion?: string;
  level?: string;
  decision?: string;
  page?: number;
  limit?: number;
}

function buildQuery(filters: KnowledgeBaseFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") query.append(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const knowledgeBaseApi = {
  search: async (filters: KnowledgeBaseFilters) => {
    const res = await apiClient<KnowledgeBaseItem[]>(`/api/knowledge-base/search${buildQuery(filters)}`);
    return { items: res.data, pagination: res.meta.pagination as Pagination | undefined };
  },

  useItem: async (id: string) => {
    const res = await apiClient<KnowledgeBaseItem>(`/api/knowledge-base/${id}/use`, { method: "POST" });
    return res.data;
  },
};
