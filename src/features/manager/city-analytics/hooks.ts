import { useQuery } from "@tanstack/react-query";
import { cityAnalyticsApi } from "./api";
import type { CityAnalyticsListParams, CityAnalyticsSummaryParams } from "./types";

export const cityAnalyticsKeys = {
  summary: (params: CityAnalyticsSummaryParams) => ["cityAnalytics", "summary", params] as const,
  applications: (params: CityAnalyticsListParams) =>
    ["cityAnalytics", "applications", params] as const,
};

export function useCityAnalyticsSummary(params: CityAnalyticsSummaryParams) {
  return useQuery({
    queryKey: cityAnalyticsKeys.summary(params),
    queryFn: async () => (await cityAnalyticsApi.getSummary(params)).data,
    staleTime: 30_000,
  });
}

export function useCityAnalyticsApplications(params: CityAnalyticsListParams, enabled: boolean) {
  return useQuery({
    queryKey: cityAnalyticsKeys.applications(params),
    queryFn: async () => (await cityAnalyticsApi.getApplications(params)).data,
    enabled,
    staleTime: 15_000,
  });
}
