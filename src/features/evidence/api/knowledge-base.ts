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

type KnowledgeBaseSearchPayload =
  | KnowledgeBaseItem[]
  | {
      items?: KnowledgeBaseItem[];
      data?: KnowledgeBaseItem[];
      pagination?: Pagination;
    }
  | null
  | undefined;

function buildQuery(filters: KnowledgeBaseFilters) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") query.append(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function normalizeItems(payload: KnowledgeBaseSearchPayload): KnowledgeBaseItem[] {
  if (Array.isArray(payload)) return payload.map(normalizeItem);
  if (Array.isArray(payload?.items)) return payload.items.map(normalizeItem);
  if (Array.isArray(payload?.data)) return payload.data.map(normalizeItem);
  return [];
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeItem(item: KnowledgeBaseItem): KnowledgeBaseItem {
  return {
    ...item,
    requiredFieldsJson: normalizeStringArray(item.requiredFieldsJson),
    commonErrorsJson: normalizeStringArray(item.commonErrorsJson),
  };
}

export const knowledgeBaseApi = {
  search: async (filters: KnowledgeBaseFilters) => {
    const res = await apiClient<KnowledgeBaseSearchPayload>(`/api/knowledge-base/search${buildQuery(filters)}`);
    const payloadPagination = !Array.isArray(res.data) ? res.data?.pagination : undefined;
    return {
      items: normalizeItems(res.data),
      pagination: (res.meta.pagination ?? payloadPagination) as Pagination | undefined,
    };
  },

  useItem: async (id: string) => {
    const res = await apiClient<KnowledgeBaseItem>(`/api/knowledge-base/${id}/use`, { method: "POST" });
    return res.data;
  },
};
