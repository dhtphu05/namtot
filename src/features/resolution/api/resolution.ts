import { apiClient } from "@/lib/api/client";
import type { Criterion, Pagination, SafeUser } from "@/lib/api/types";

export type ResolutionStatus = "open" | "in_review" | "resolved" | "rejected";
export type KnowledgeDecision = "accepted" | "rejected" | "needs_supplement" | "reference_only";

export interface ResolutionCaseListItem {
  id: string;
  status: ResolutionStatus;
  reason: string;
  committeeDecision: string | null;
  createdAt: string;
  closedAt: string | null;
  student: {
    fullName: string;
    studentCode: string | null;
    className: string | null;
    faculty: string | null;
  };
  application: {
    id: string;
    targetLevel: string;
    status: string;
  };
  evidence: {
    id: string;
    evidenceName: string;
    criterion: Criterion;
    status: string;
    confidence?: number | null;
  } | null;
}

export interface ResolutionCaseDetail {
  resolutionCase: ResolutionCaseListItem & {
    applicationId: string;
    evidenceId: string | null;
  };
  application: Record<string, unknown>;
  student: SafeUser;
  evidence: ResolutionCaseListItem["evidence"] & { evidenceCard?: Record<string, unknown> | null };
  evidenceCard: Record<string, unknown> | null;
  relatedReviewTask: Record<string, unknown> | null;
  precheck: unknown | null;
  cascade: unknown | null;
  knowledgeBaseMatches: Array<Record<string, unknown>>;
  auditTimeline: Array<Record<string, unknown>>;
}

export interface ResolutionFilters {
  status?: string;
  criterion?: string;
  applicationId?: string;
  evidenceId?: string;
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

export const resolutionApi = {
  listCases: async (filters?: ResolutionFilters) => {
    const res = await apiClient<ResolutionCaseListItem[]>(`/api/resolution/cases${buildQuery(filters)}`);
    return { items: res.data, pagination: res.meta.pagination as Pagination | undefined };
  },

  getCase: async (id: string) => {
    const res = await apiClient<ResolutionCaseDetail>(`/api/resolution/cases/${id}`);
    return res.data;
  },

  decideCase: async (
    id: string,
    payload: {
      decision: KnowledgeDecision;
      committeeNote: string;
      updateRelatedTask?: boolean;
      saveToKnowledgeBase?: boolean;
      knowledgeBase?: {
        decision: KnowledgeDecision;
        reason: string;
        requiredFields: string[];
        commonErrors: string[];
      };
    },
  ) => {
    const res = await apiClient(`/api/resolution/cases/${id}/decision`, {
      method: "POST",
      body: payload,
    });
    return res.data;
  },

  reopenCase: async (id: string, payload: { reason: string }) => {
    const res = await apiClient(`/api/resolution/cases/${id}/reopen`, {
      method: "POST",
      body: payload,
    });
    return res.data;
  },
};
