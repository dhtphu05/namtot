import { apiClient } from "@/lib/api/client";
import type { ApiResponse, QueryValue } from "@/features/review/types";
import type {
  ResolutionCaseDetail,
  ResolutionCasesParams,
  ResolutionCasesResponse,
  ResolveResolutionCaseRequest,
  ResolveResolutionCaseResponse,
} from "../types";

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

export const resolutionApi = {
  getResolutionCases: async (
    params?: ResolutionCasesParams,
  ): Promise<ApiResponse<ResolutionCasesResponse>> => {
    const response = await apiClient<ResolutionCasesResponse>(
      `/api/resolution/cases${buildQueryString(params)}`,
    );

    return withDataFallback(response, { items: [] });
  },

  getResolutionCase: async (id: string): Promise<ApiResponse<ResolutionCaseDetail>> => {
    const response = await apiClient<ResolutionCaseDetail>(`/api/resolution/cases/${id}`);

    return withDataFallback(response);
  },

  resolveResolutionCase: async (
    id: string,
    payload: ResolveResolutionCaseRequest,
  ): Promise<ApiResponse<ResolveResolutionCaseResponse>> => {
    const response = await apiClient<ResolveResolutionCaseResponse>(
      `/api/resolution/cases/${id}/resolve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    return withDataFallback(response);
  },
};
