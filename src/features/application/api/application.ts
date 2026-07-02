import { apiClient } from "@/lib/api/client";
import type { CurrentApplicationEmpty, CurrentApplicationResponse, Level, MetricInput } from "@/lib/api/types";

export const applicationApi = {
  getCurrentApplication: async (schoolYear?: string) => {
    const query = schoolYear ? `?schoolYear=${schoolYear}` : "";
    return apiClient<CurrentApplicationResponse | CurrentApplicationEmpty>(
      `/api/applications/current${query}`,
      { method: "GET" }
    );
  },

  startCurrentApplication: async (data: { schoolYear?: string; applicationType?: "individual" | "collective"; targetLevel?: Level }) => {
    return apiClient<CurrentApplicationResponse>("/api/applications/current/start", {
      method: "POST",
      body: data,
    });
  },

  startApplication: async (data: { schoolYear?: string; targetLevel?: Level }) => {
    return applicationApi.startCurrentApplication({ ...data, applicationType: "individual" });
  },

  updateTargetLevel: async (applicationId: string, targetLevel: Level) => {
    return apiClient(`/api/applications/${applicationId}/target-level`, {
      method: "PATCH",
      body: { targetLevel },
    });
  },

  saveDraft: async (applicationId: string, input: { draftData: Record<string, unknown>; step?: string }) => {
    return apiClient(`/api/applications/${applicationId}/draft`, {
      method: "PATCH",
      body: input,
    });
  },

  getApplicationTimeline: async (applicationId: string) => {
    return apiClient(`/api/applications/${applicationId}/timeline`, {
      method: "GET",
    });
  },

  getTimeline: async (id: string) => {
    return applicationApi.getApplicationTimeline(id);
  },

  precheck: async (id: string, options?: { level?: Level; runMode?: "sync" | "async" }) => {
    return apiClient(`/api/applications/${id}/precheck`, {
      method: "POST",
      body: options || {},
    });
  },

  getLatestPrecheck: async (id: string) => {
    return apiClient(`/api/applications/${id}/precheck/latest`, {
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

  submitApplication: async (applicationId: string, options: { allowSubmitWithWarnings: boolean }) => {
    return apiClient(`/api/applications/${applicationId}/submit`, {
      method: "POST",
      body: options,
    });
  },

  submit: async (id: string, options: { allowSubmitWithWarnings?: boolean; studentNote?: string }) => {
    return applicationApi.submitApplication(id, { allowSubmitWithWarnings: !!options.allowSubmitWithWarnings });
  },

  getMetrics: async (id: string) => {
    return apiClient<any[]>(`/api/applications/${id}/metrics`, {
      method: "GET",
    });
  },

  createApplicationMetric: async (applicationId: string, input: MetricInput) => {
    return apiClient<any>(`/api/applications/${applicationId}/metrics`, {
      method: "POST",
      body: input,
    });
  },

  createMetric: async (id: string, data: { metricType: string; value: number; scale: number; evidenceName?: string }) => {
    return applicationApi.createApplicationMetric(id, {
      criterion: data.metricType === "gpa" ? "academic" : "ethics",
      metricType: data.metricType as any,
      valueNumber: data.value,
      source: "student_input",
    });
  },

  updateMetric: async (metricId: string, data: any) => {
    return apiClient<any>(`/api/metrics/${metricId}`, {
      method: "PATCH",
      body: data,
    });
  },
};
