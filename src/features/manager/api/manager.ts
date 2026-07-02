import { apiClient } from "@/lib/api/client";
import type { ApiResponse, QueryValue } from "@/features/review/types";
import type {
  ManagerApplicationsParams,
  ManagerApplicationsResponse,
  ManagerDashboardSummary,
  ManagerWorkloadResponse,
} from "../types";

const emptyDashboardSummary: ManagerDashboardSummary = {
  totalApplications: 0,
  submitted: 0,
  underReview: 0,
  supplementRequired: 0,
  resolutionNeeded: 0,
  completed: 0,
  rejected: 0,
  totalReviewTasks: 0,
  waitingTasks: 0,
  reviewingTasks: 0,
};

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

export const managerApi = {
  getManagerApplications: async (
    params?: ManagerApplicationsParams,
  ): Promise<ApiResponse<ManagerApplicationsResponse>> => {
    const response = await apiClient<ManagerApplicationsResponse>(
      `/api/manager/applications${buildQueryString(params)}`,
    );

    return withDataFallback(response, { items: [] });
  },

  getManagerWorkload: async (): Promise<ApiResponse<ManagerWorkloadResponse>> => {
    const response = await apiClient<ManagerWorkloadResponse>("/api/manager/workload");

    return withDataFallback(response, { workloads: [] });
  },

  getManagerDashboardSummary: async (): Promise<ApiResponse<ManagerDashboardSummary>> => {
    const response = await apiClient<ManagerDashboardSummary>("/api/manager/dashboard-summary");

    return withDataFallback(response, emptyDashboardSummary);
  },
};
