import { apiClient } from "@/lib/api/client";
import type { ApiResponse, QueryValue } from "@/features/review/types";
import type { AuditLogParams, AuditLogResponse } from "../types";

function buildQueryString(params?: Record<string, QueryValue>) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function withDataFallback<T>(response: ApiResponse<T>, fallback: T | null = null): ApiResponse<T> {
  return {
    ...response,
    data: response.data ?? fallback,
  };
}

export const auditApi = {
  getAuditLogs: async (params?: AuditLogParams): Promise<ApiResponse<AuditLogResponse>> => {
    const response = await apiClient<AuditLogResponse>(`/api/audit${buildQueryString(params)}`);

    return withDataFallback(response, { items: [] });
  },
};
