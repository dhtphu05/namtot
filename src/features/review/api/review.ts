import { apiClient } from "@/lib/api/client";

export interface ReviewTaskResponse {
  id: string;
  applicationId: string;
  studentId: string;
  studentName: string;
  studentMssv: string;
  studentKhoa: string;
  evidenceName: string;
  criterion: string;
  targetLevel: string;
  sourceType: string;
  confidence: number;
  status: string;
  dueDate: string;
  assignedOfficerId: string;
}

export const reviewApi = {
  getReviewTasks: async (filters?: {
    criterion?: string;
    status?: string;
    assignedToMe?: boolean;
    applicationId?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "all") query.append(k, String(v));
      });
    }
    const qString = query.toString();
    return apiClient<ReviewTaskResponse[]>(
      `/api/review/tasks${qString ? `?${qString}` : ""}`,
      { method: "GET" }
    );
  },

  getReviewTaskDetail: async (id: string) => {
    return apiClient<ReviewTaskResponse>(`/api/review/tasks/${id}`, {
      method: "GET",
    });
  },

  submitDecision: async (
    id: string,
    payload: {
      decision: "accepted" | "rejected";
      officerNote?: string;
      evidenceDecisions?: Array<{
        evidenceId: string;
        status: "draft" | "pending_indexing" | "indexed" | "needs_supplement" | "under_review" | "accepted" | "rejected" | "resolution_needed";
        note?: string;
      }>;
    }
  ) => {
    return apiClient(`/api/review/tasks/${id}/decision`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  requestSupplement: async (
    id: string,
    payload: {
      reason: string;
      requestedEvidenceName?: string;
      allowedCriteria?: string[];
      deadline?: string;
    }
  ) => {
    return apiClient(`/api/review/tasks/${id}/request-supplement`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  escalateResolution: async (
    id: string,
    payload: {
      reason: string;
      evidenceId?: string;
    }
  ) => {
    return apiClient(`/api/review/tasks/${id}/escalate-resolution`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
