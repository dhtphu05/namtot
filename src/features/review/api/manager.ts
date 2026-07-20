import { apiClient } from "@/lib/api/client";
import type { ApplicationStatus, FinalStatus, Level, Pagination, SafeUser } from "@/lib/api/types";
import type { ReviewTaskListItem } from "./review";

export interface ManagerApplication {
  id: string;
  student: SafeUser;
  schoolYear: string;
  targetLevel: Level;
  status: ApplicationStatus;
  readinessScore: number;
  submittedAt: string | null;
  reviewProgress: ReviewProgress;
}

export interface ReviewProgress {
  waiting: number;
  reviewing: number;
  supplementRequired: number;
  resolutionNeeded: number;
  accepted: number;
  rejected: number;
  canAggregate: boolean;
}

export interface OfficerWorkload {
  id: string;
  fullName: string;
  specializations: string[];
  facultyScope: string | null;
  workload: {
    waiting: number;
    reviewing: number;
    supplementRequired: number;
    resolutionNeeded: number;
    totalActive: number;
  };
}

export interface ApplicationAggregation {
  application: {
    id: string;
    targetLevel: Level;
    status: ApplicationStatus;
    finalStatus: FinalStatus;
    finalLevel: Level | null;
    readinessScore: number;
  };
  student: SafeUser;
  criteriaSummary: Array<{
    criterion: string;
    taskStatus: string;
    decision: string | null;
    evidenceCount: number;
    hasResolutionOpen: boolean;
    blocking: boolean;
    summary: string;
  }>;
  reviewProgress: ReviewProgress;
  resolutionSummary: { open: number; resolved: number; rejected: number };
  suggestedFinalStatus: FinalStatus;
  suggestedFinalLevel: Level | null;
  canFinalize: boolean;
  blockingReasons: string[];
  warnings: string[];
  latestPrecheck: unknown | null;
  latestCascade: unknown | null;
}

export interface ManagerApplicationFilters {
  status?: string;
  targetLevel?: string;
  faculty?: string;
  schoolYear?: string;
  q?: string;
  page?: number;
  limit?: number;
}

function buildQuery(filters?: Record<string, unknown>) {
  const query = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && value !== "all") query.append(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const managerApi = {
  listApplications: async (filters?: ManagerApplicationFilters) => {
    const res = await apiClient<ManagerApplication[]>(
      `/api/manager/applications${buildQuery(filters)}`,
    );
    return { items: res.data, pagination: res.meta.pagination as Pagination | undefined };
  },

  getWorkloads: async () => {
    const res = await apiClient<{ officers: OfficerWorkload[] }>("/api/manager/workloads");
    return res.data;
  },

  assignTask: async (taskId: string, payload: { officerId: string; note?: string }) => {
    const res = await apiClient<ReviewTaskListItem>(`/api/manager/review-tasks/${taskId}/assign`, {
      method: "POST",
      body: payload,
    });
    return res.data;
  },

  getApplicationAggregation: async (applicationId: string) => {
    const res = await apiClient<ApplicationAggregation>(
      `/api/manager/applications/${applicationId}/aggregation`,
    );
    return res.data;
  },

  finalizeApplication: async (
    applicationId: string,
    payload: {
      finalStatus: "passed" | "failed" | "partially_passed";
      finalLevel?: Level | null;
      finalNote: string;
      overrideAggregation?: boolean;
      notifyStudent?: boolean;
    },
  ) => {
    const res = await apiClient(`/api/manager/applications/${applicationId}/finalize`, {
      method: "POST",
      body: payload,
    });
    return res.data;
  },
};
