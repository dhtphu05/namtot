import { apiClient } from "@/lib/api/client";
import type { ApiResponse, QueryValue } from "@/features/review/types";
import type {
  ManagerApplicationsParams,
  ManagerApplicationsResponse,
  ManagerDashboardSummary,
  ManagerCollectiveAggregation,
  ManagerCollectiveFilters,
  ManagerCollectivesResponse,
  ManagerResultFilters,
  ManagerResultDetail,
  ManagerResultsResponse,
  ManagerWorkloadResponse,
  FinalizeApplicationInput,
  FinalizeCollectiveInput,
  ReopenFinalInput,
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

  getManagerCollectives: async (
    params?: ManagerCollectiveFilters,
  ): Promise<ApiResponse<ManagerCollectivesResponse>> => {
    const response = await apiClient<unknown>(
      `/api/manager/collective-profiles${buildQueryString(params)}`,
    );
    const data = response.data;
    const pagination = response.meta?.pagination as ManagerCollectivesResponse["pagination"] | undefined;

    return withDataFallback(
      {
        ...response,
        data: {
          items: Array.isArray(data) ? data : [],
          pagination: pagination ?? {
            page: params?.page ?? 1,
            limit: params?.limit ?? 20,
            total: 0,
            totalPages: 0,
          },
        },
      } as ApiResponse<ManagerCollectivesResponse>,
      {
        items: [],
        pagination: {
          page: params?.page ?? 1,
          limit: params?.limit ?? 20,
          total: 0,
          totalPages: 0,
        },
      },
    );
  },

  getManagerCollectiveAggregation: async (
    collectiveId: string,
  ): Promise<ApiResponse<ManagerCollectiveAggregation>> => {
    return apiClient<ManagerCollectiveAggregation>(
      `/api/manager/collective-profiles/${collectiveId}/aggregation`,
    );
  },

  getManagerResults: async (
    params?: ManagerResultFilters,
  ): Promise<ApiResponse<ManagerResultsResponse>> => {
    const response = await apiClient<ManagerResultsResponse>(
      `/api/manager/results${buildQueryString(params)}`,
    );

    return withDataFallback(response, {
      items: [],
      pagination: { page: params?.page ?? 1, pageSize: params?.pageSize ?? 10, total: 0, totalPages: 0 },
      sort: { sortBy: params?.sortBy ?? "lastActivityAt", sortOrder: params?.sortOrder ?? "desc" },
    });
  },

  getManagerResultDetail: async (
    applicationId: string,
  ): Promise<ApiResponse<ManagerResultDetail>> => {
    return apiClient<ManagerResultDetail>(`/api/manager/results/${applicationId}`);
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

  reopenFinalApplication: async (
    applicationId: string,
    payload: ReopenFinalInput,
  ): Promise<ApiResponse<unknown>> => {
    return apiClient(`/api/manager/applications/${applicationId}/reopen-final`, {
      method: "POST",
      body: payload,
    });
  },

  finalizeCollective: async (
    collectiveId: string,
    payload: FinalizeCollectiveInput,
  ): Promise<ApiResponse<unknown>> => {
    return apiClient(`/api/manager/collective-profiles/${collectiveId}/finalize`, {
      method: "POST",
      body: payload,
    });
  },
};
