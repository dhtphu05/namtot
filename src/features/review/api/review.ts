import { apiClient } from "@/lib/api/client";
import type { ApplicationMetric, Criterion, EvidenceResponse, Level, Pagination } from "@/lib/api/types";

export type ReviewTaskStatus =
  | "waiting"
  | "reviewing"
  | "supplement_required"
  | "resolution_needed"
  | "accepted"
  | "rejected";

export interface ReviewTaskOwnerApplication {
  id: string;
  schoolYear: string;
  targetLevel: Level;
  status: string;
  student: {
    fullName: string;
    studentCode: string | null;
    className: string | null;
    faculty: string | null;
  };
}

export interface ReviewTaskOwnerCollective {
  id: string;
  schoolYear: string;
  targetLevel: Level;
  status: string;
  className: string;
  representative: {
    fullName: string;
    faculty: string | null;
  };
}

export interface ReviewTaskListItem {
  id: string;
  criterion: Criterion;
  status: ReviewTaskStatus;
  decision: string | null;
  dueDate: string | null;
  application: ReviewTaskOwnerApplication | null;
  collectiveProfile: ReviewTaskOwnerCollective | null;
  evidenceCount: number;
  assignedOfficer: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewTaskDetail {
  task: {
    id: string;
    criterion: Criterion;
    status: ReviewTaskStatus;
    decision: string | null;
    officerNote: string | null;
    assignedOfficer: { id: string; fullName: string } | null;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  };
  application: {
    id: string;
    schoolYear: string;
    targetLevel: Level;
    status: string;
    readinessScore: number;
    submittedAt: string | null;
  } | null;
  collectiveProfile: ReviewTaskOwnerCollective | null;
  student: {
    id: string;
    fullName: string;
    studentCode: string | null;
    className: string | null;
    faculty: string | null;
  } | null;
  metrics: ApplicationMetric[];
  evidences: Array<
    EvidenceResponse & {
      confidence?: number | null;
      files?: Array<{ id: string; publicUrl?: string | null; originalName?: string; mimeType?: string }>;
      card?: Record<string, unknown> | null;
      event?: Record<string, unknown> | null;
    }
  >;
  precheck: unknown | null;
  cascade: unknown | null;
  knowledgeBaseMatches: Array<{ evidenceId: string; matches: Array<Record<string, unknown>> }>;
  criteriaChecklist: Array<{ criterion: Criterion; humanConfirmationRequired: boolean; note: string }>;
}

export interface ReviewTaskFilters {
  criterion?: string;
  status?: string;
  assignedToMe?: boolean;
  applicationId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ReviewTaskListResult {
  items: ReviewTaskListItem[];
  pagination?: Pagination;
}

export const reviewApi = {
  getReviewTasks: async (filters?: ReviewTaskFilters): Promise<ReviewTaskListResult> => {
    const query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== "" && value !== "all") {
          query.append(key, String(value));
        }
      });
    }
    const qString = query.toString();
    const res = await apiClient<ReviewTaskListItem[]>(
      `/api/review/tasks${qString ? `?${qString}` : ""}`,
      { method: "GET" },
    );
    return { items: res.data, pagination: res.meta.pagination };
  },

  getReviewTaskDetail: async (id: string) => {
    const res = await apiClient<ReviewTaskDetail>(`/api/review/tasks/${id}`, {
      method: "GET",
    });
    return res.data;
  },

  submitDecision: async (
    id: string,
    payload: {
      decision: "accepted" | "rejected" | "supplement_required" | "resolution_needed";
      officerNote?: string;
      evidenceDecisions?: Array<{
        evidenceId: string;
        status: "accepted" | "rejected" | "needs_supplement" | "resolution_needed";
        note?: string;
      }>;
    },
  ) => {
    const res = await apiClient(`/api/review/tasks/${id}/decision`, {
      method: "POST",
      body: payload,
    });
    return res.data;
  },

  requestSupplement: async (
    id: string,
    payload: {
      reason: string;
      requestedEvidenceName?: string;
      allowedCriteria?: string[];
      deadline?: string;
    },
  ) => {
    const res = await apiClient(`/api/review/tasks/${id}/request-supplement`, {
      method: "POST",
      body: payload,
    });
    return res.data;
  },

  escalateResolution: async (
    id: string,
    payload: {
      reason: string;
      evidenceId?: string;
    },
  ) => {
    const res = await apiClient(`/api/review/tasks/${id}/escalate-resolution`, {
      method: "POST",
      body: payload,
    });
    return res.data;
  },
};
