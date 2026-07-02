import { apiClient } from "@/lib/api/client";
import type { ApiResponse, QueryValue } from "@/features/review/types";
import type {
  ManagerApplicationsParams,
  ManagerApplicationsResponse,
  ManagerDashboardSummary,
  ManagerResultFilters,
  ManagerResultsResponse,
  ManagerWorkloadResponse,
  FinalizeApplicationInput,
} from "../types";

const emptyDashboardSummary: ManagerDashboardSummary = {
  applicationOverview: {
    totalApplications: 0,
    draftCount: 0,
    submittedCount: 0,
    underReviewCount: 0,
    supplementRequiredCount: 0,
    resolutionNeededCount: 0,
    completedCount: 0,
    rejectedCount: 0,
  },
  targetLevelBreakdown: { school: 0, university: 0, city: 0, central: 0 },
  finalStatusBreakdown: { passed: 0, failed: 0, partiallyPassed: 0, pending: 0 },
  finalLevelBreakdown: {
    school: 0,
    university: 0,
    city: 0,
    central: 0,
    notAchieved: 0,
    unfinalized: 0,
  },
  reviewTaskSummary: {
    total: 0,
    accepted: 0,
    rejected: 0,
    supplementRequired: 0,
    resolutionNeeded: 0,
    waiting: 0,
  },
  resolutionSummary: { open: 0, resolved: 0, rejected: 0, closed: 0 },
  workloadByOfficer: [],
  recentApplications: [],
  recentFinalizedApplications: [],
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

  getManagerResults: async (
    params?: ManagerResultFilters,
  ): Promise<ApiResponse<ManagerResultsResponse>> => {
    const response = await apiClient<ManagerResultsResponse>(
      `/api/manager/results${buildQueryString(params)}`,
    );

    return withDataFallback(response, {
      items: [],
      pagination: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 20, total: 0 },
    });
  },

  finalizeApplication: async (
    applicationId: string,
    payload: FinalizeApplicationInput,
  ): Promise<ApiResponse<unknown>> => {
    return apiClient(`/api/manager/applications/${applicationId}/finalize`, {
      method: "POST",
      body: payload,
    });
  },
};
