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
  | unknown[]
  | {
      items?: unknown[];
      data?: unknown[];
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
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeItem(raw: unknown): KnowledgeBaseItem {
  const item = asRecord(raw) ?? {};
  return {
    id: stringValue(item.id),
    evidenceName: nullableString(item.evidenceName ?? item.evidence_name),
    eventName: nullableString(item.eventName ?? item.event_name),
    criterion: stringValue(item.criterion || "volunteer") as Criterion,
    level: nullableString(item.level) as Level | null,
    decision: stringValue(item.decision || "reference_only") as KnowledgeDecision,
    reason: stringValue(item.reason ?? item.acceptedReasonSummary ?? item.accepted_reason_summary),
    requiredFieldsJson: normalizeStringArray(
      item.requiredFieldsJson ??
        item.required_fields_json ??
        item.requiredFields ??
        item.required_fields,
    ),
    commonErrorsJson: normalizeStringArray(
      item.commonErrorsJson ?? item.common_errors_json ?? item.commonErrors ?? item.common_errors,
    ),
    usageCount: numberValue(item.usageCount ?? item.usage_count),
    createdAt: stringValue(item.createdAt ?? item.created_at),
    updatedAt: stringValue(item.updatedAt ?? item.updated_at),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export const knowledgeBaseApi = {
  search: async (filters: KnowledgeBaseFilters) => {
    const res = await apiClient<KnowledgeBaseSearchPayload>(
      `/api/knowledge-base/search${buildQuery(filters)}`,
    );
    const payloadPagination = !Array.isArray(res.data) ? res.data?.pagination : undefined;
    return {
      items: normalizeItems(res.data),
      pagination: (res.meta.pagination ?? payloadPagination) as Pagination | undefined,
    };
  },

  useItem: async (id: string) => {
    const res = await apiClient<KnowledgeBaseItem>(`/api/knowledge-base/${id}/use`, {
      method: "POST",
    });
    return res.data;
  },
};
