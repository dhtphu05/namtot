import { apiClient } from "@/lib/api/client";
import type { ApiResponse, QueryValue, Role } from "@/features/review/types";
import type { CollectiveStatus, FinalStatus, Level } from "@/lib/api/types";
import type {
  ManagerApplicationsParams,
  ManagerApplicationsResponse,
  ManagerEligibilityVerificationDetail,
  ManagerEligibilityVerificationQueueResponse,
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
  CommitteeInboxParams,
  CommitteeInboxResponse,
  ReopenFinalInput,
  VerifyEligibilityInput,
  CancelApplicationInput,
  ReopenCancelledApplicationInput,
  ArchiveApplicationInput,
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
  decisionSummary: {
    ready: 0,
    downgraded: 0,
    notEligible: 0,
    resolution: 0,
    supplement: 0,
    overdue: 0,
    recentlyFinalized: 0,
    unfinished: 0,
  },
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

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : {};
}

function normalizeCollectiveItem(value: unknown) {
  const item = asRecord(value);
  const representative = asRecord(item.representative);
  const counts = asRecord(item._count);
  const memberSummary = asRecord(item.memberSummary);
  const blockingReasons = Array.isArray(item.blockingReasons)
    ? item.blockingReasons.filter((reason): reason is string => typeof reason === "string")
    : [];

  return {
    ...item,
    id: String(item.id ?? ""),
    representativeId: String(item.representativeId ?? ""),
    className: String(item.className ?? "Chưa rõ lớp"),
    schoolYear: String(item.schoolYear ?? ""),
    targetLevel: (item.targetLevel ?? "school") as Level,
    status: (item.status ?? "draft") as CollectiveStatus,
    readinessScore: Number(item.readinessScore ?? 0),
    finalStatus: (item.finalStatus ?? "pending") as FinalStatus,
    finalLevel: (item.finalLevel ?? null) as Level | null,
    representative: item.representative
      ? {
          id: String(representative.id ?? ""),
          fullName: String(representative.fullName ?? "Chưa rõ đại diện"),
          email: (representative.email ?? null) as string | null,
          faculty: (representative.faculty ?? null) as string | null,
        }
      : null,
    memberSummary,
    canFinalize: Boolean(item.canFinalize),
    blockingReasons,
    _count: {
      members: Number(counts.members ?? 0),
      evidences: Number(counts.evidences ?? 0),
      reviewTasks: Number(counts.reviewTasks ?? 0),
    },
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

  getEligibilityVerificationQueue: async (): Promise<
    ApiResponse<ManagerEligibilityVerificationQueueResponse>
  > => {
    const response = await apiClient<ManagerEligibilityVerificationQueueResponse>(
      `/api/manager/applications${buildQueryString({
        eligibilityVerification: "pending",
        page: 1,
        limit: 20,
      })}`,
    );
    return withDataFallback(response, {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  },

  getEligibilityVerification: async (
    applicationId: string,
  ): Promise<ApiResponse<ManagerEligibilityVerificationDetail>> => {
    return apiClient<ManagerEligibilityVerificationDetail>(
      `/api/manager/applications/${applicationId}/eligibility-verification`,
    );
  },

  verifyApplicationEligibility: async (applicationId: string, payload: VerifyEligibilityInput) => {
    return apiClient(`/api/applications/${applicationId}/eligibility-verification`, {
      method: "POST",
      body: payload,
    });
  },

  getManagerWorkload: async (): Promise<ApiResponse<ManagerWorkloadResponse>> => {
    const response = await apiClient<ManagerWorkloadResponse>("/api/manager/workload");

    return withDataFallback(response, { workloads: [] });
  },

  getManagerDashboardSummary: async (): Promise<ApiResponse<ManagerDashboardSummary>> => {
    const response = await apiClient<ManagerDashboardSummary>("/api/manager/dashboard-summary");

    return withDataFallback(response, emptyDashboardSummary);
  },

  getCommitteeInbox: async (
    params?: CommitteeInboxParams,
    role?: Role,
  ): Promise<ApiResponse<CommitteeInboxResponse>> => {
    const endpoint =
      role === "city_manager" || role === "city_committee"
        ? "/api/manager/committee-inbox"
        : "/api/committee/inbox";
    const response = await apiClient<CommitteeInboxResponse>(
      `${endpoint}${buildQueryString(params)}`,
    );

    return withDataFallback(response, {
      summary: {
        readyToFinalize: 0,
        downgraded: 0,
        noEligibleLevel: 0,
        needsResolution: 0,
        supplementRequired: 0,
        overdue: 0,
        recentlyFinalized: 0,
      },
      items: [],
      pagination: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        total: 0,
        totalPages: 0,
      },
    });
  },

  getManagerCollectives: async (
    params?: ManagerCollectiveFilters,
  ): Promise<ApiResponse<ManagerCollectivesResponse>> => {
    const response = await apiClient<unknown>(
      `/api/manager/collective-profiles${buildQueryString(params)}`,
    );
    const data = response.data;
    const pagination = response.meta?.pagination as
      ManagerCollectivesResponse["pagination"] | undefined;

    return withDataFallback(
      {
        ...response,
        data: {
          items: Array.isArray(data) ? data.map(normalizeCollectiveItem) : [],
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
      pagination: {
        page: params?.page ?? 1,
        pageSize: params?.pageSize ?? 10,
        total: 0,
        totalPages: 0,
      },
      sort: { sortBy: params?.sortBy ?? "lastActivityAt", sortOrder: params?.sortOrder ?? "desc" },
    });
  },

  getManagerResultDetail: async (
    applicationId: string,
  ): Promise<ApiResponse<ManagerResultDetail>> => {
    return apiClient<ManagerResultDetail>(`/api/manager/results/${applicationId}`);
  },

  cancelApplication: async (applicationId: string, payload: CancelApplicationInput) => {
    return apiClient(`/api/manager/applications/${applicationId}/cancel`, {
      method: "POST",
      body: payload,
    });
  },

  reopenCancelledApplication: async (
    applicationId: string,
    payload: ReopenCancelledApplicationInput,
  ) => {
    return apiClient(`/api/manager/applications/${applicationId}/reopen-cancelled`, {
      method: "POST",
      body: payload,
    });
  },

  archiveApplication: async (applicationId: string, payload: ArchiveApplicationInput = {}) => {
    return apiClient(`/api/manager/applications/${applicationId}/archive`, {
      method: "POST",
      body: payload,
    });
  },

  unarchiveApplication: async (applicationId: string) => {
    return apiClient(`/api/manager/applications/${applicationId}/unarchive`, {
      method: "POST",
      body: {},
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
