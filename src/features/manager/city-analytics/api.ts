import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type {
  CityAnalyticsApplicationsResponse,
  CityAnalyticsListParams,
  CityAnalyticsSummary,
  CityAnalyticsSummaryParams,
} from "./types";

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const cityAnalyticsApi = {
  getSummary(params: CityAnalyticsSummaryParams = {}): Promise<ApiResponse<CityAnalyticsSummary>> {
    return apiClient<CityAnalyticsSummary>(`/api/analytics/city${buildQuery(params)}`);
  },

  getApplications(
    params: CityAnalyticsListParams,
  ): Promise<ApiResponse<CityAnalyticsApplicationsResponse>> {
    return apiClient<CityAnalyticsApplicationsResponse>(
      `/api/analytics/city/applications${buildQuery(params)}`,
    );
  },
};
