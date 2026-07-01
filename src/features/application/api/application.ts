import { apiClient } from "@/lib/api/client";
import type {
  ApplicationMetric,
  CurrentApplicationEmpty,
  CurrentApplicationResponse,
  Level,
  MetricType,
  PrecheckResult,
  VerificationStatus,
} from "@/lib/api/types";

export const applicationApi = {
  getCurrentApplication: async (schoolYear?: string) => {
    const query = schoolYear ? `?schoolYear=${schoolYear}` : "";
    return apiClient<CurrentApplicationResponse | CurrentApplicationEmpty>(
      `/api/applications/current${query}`,
      { method: "GET" }
    );
  },

  startApplication: async (data: { schoolYear?: string; targetLevel?: Level }) => {
    return apiClient<CurrentApplicationResponse>("/api/applications/current/start", {
      method: "POST",
      body: data,
    });
  },

  updateTargetLevel: async (id: string, targetLevel: Level) => {
    return apiClient(`/api/applications/${id}/target-level`, {
      method: "PATCH",
      body: { targetLevel },
    });
  },

  saveDraft: async (id: string, draftPayload: Record<string, unknown>) => {
    return apiClient(`/api/applications/${id}/draft`, {
      method: "PATCH",
      body: draftPayload,
    });
  },

  getTimeline: async (id: string, page = 1, limit = 20) => {
    return apiClient(`/api/applications/${id}/timeline?page=${page}&limit=${limit}`, {
      method: "GET",
    });
  },

  precheck: async (id: string, options?: { level?: Level; runMode?: "sync" | "async" }) => {
    return apiClient<PrecheckResult>(`/api/applications/${id}/precheck`, {
      method: "POST",
      body: options || {},
    });
  },

  getLatestPrecheck: async (id: string) => {
    return apiClient<PrecheckResult | null>(`/api/applications/${id}/precheck/latest`, {
      method: "GET",
    });
  },

  cascadeReview: async (id: string, includeUpgradeHints = true) => {
    return apiClient(`/api/applications/${id}/cascade-review`, {
      method: "POST",
      body: { includeUpgradeHints },
    });
  },

  getLatestCascadeReview: async (id: string) => {
    return apiClient(`/api/applications/${id}/cascade-review/latest`, {
      method: "GET",
    });
  },

  submit: async (id: string, options: { allowSubmitWithWarnings?: boolean; studentNote?: string }) => {
    return apiClient(`/api/applications/${id}/submit`, {
      method: "POST",
      body: options,
    });
  },

  upsertMetric: async (
    id: string,
    data: { metricType: MetricType; value: number; scale?: number | string }
  ) => {
    return apiClient<ApplicationMetric>(`/api/applications/${id}/metrics`, {
      method: "POST",
      body: data,
    });
  },

  updateMetric: async (
    metricId: string,
    data: { value?: number; scale?: number | string; verificationStatus?: VerificationStatus }
  ) => {
    return apiClient<ApplicationMetric>(`/api/metrics/${metricId}`, {
      method: "PATCH",
      body: data,
    });
  },
};
