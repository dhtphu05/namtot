import { apiClient } from "@/lib/api/client";
import type { CurrentApplicationEmpty, CurrentApplicationResponse, Level, MetricInput } from "@/lib/api/types";

type CurrentApplicationPayload =
  | CurrentApplicationResponse
  | CurrentApplicationEmpty
  | (CurrentApplicationResponse["application"] & {
      state?: CurrentApplicationResponse["state"];
      application?: never;
    })
  | null;

function normalizeCurrentApplication(
  data: CurrentApplicationPayload,
): CurrentApplicationResponse | CurrentApplicationEmpty {
  if (!data) {
    return { application: null, state: "not_started", schoolYear: new Date().getFullYear().toString() };
  }

  if ("application" in data) {
    if (data.application?.metrics) {
      return {
        ...data,
        application: {
          ...data.application,
          metrics: data.application.metrics.map(normalizeMetric),
        },
      };
    }
    return data;
  }

  return {
    application: {
      ...data,
      metrics: data.metrics?.map(normalizeMetric),
    },
    state: data.state ?? data.status,
  };
}

const metricTypeMap: Record<string, string> = {
  language_certificate: "foreign_language_score",
  integration_activity: "foreign_language_score",
};

function normalizeMetric<T extends Record<string, any>>(metric: T): T {
  const value = metric.value ?? metric.valueNumber;
  return {
    ...metric,
    metricType: metric.metricType === "language_certificate" ? "foreign_language_score" : metric.metricType,
    value,
    valueNumber: value,
  };
}

function parseMetricValue(input: Record<string, any>) {
  const raw = input.value ?? input.valueNumber ?? input.valueText;
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return undefined;

  const normalized = raw.replace(",", ".");
  const match = normalized.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function toBackendMetricPayload(input: Record<string, any>) {
  const metricType = metricTypeMap[input.metricType] ?? input.metricType;
  const value = parseMetricValue(input);

  if (!metricType || value === undefined || Number.isNaN(value)) {
    throw new Error("Metric value is required");
  }

  return {
    metricType,
    value,
    ...(input.scale !== undefined ? { scale: input.scale } : {}),
  };
}

function toBackendMetricUpdatePayload(input: Record<string, any>) {
  const value = parseMetricValue(input);
  return {
    ...(value !== undefined && !Number.isNaN(value) ? { value } : {}),
    ...(input.scale !== undefined ? { scale: input.scale } : {}),
    ...(input.verificationStatus ? { verificationStatus: input.verificationStatus } : {}),
  };
}

export const applicationApi = {
  getCurrentApplication: async (schoolYear?: string) => {
    const query = schoolYear ? `?schoolYear=${schoolYear}` : "";
    const res = await apiClient<CurrentApplicationPayload>(
      `/api/applications/current${query}`,
      { method: "GET" }
    );
    return { ...res, data: normalizeCurrentApplication(res.data) };
  },

  startCurrentApplication: async (data: { schoolYear?: string; applicationType?: "individual" | "collective"; targetLevel?: Level }) => {
    const res = await apiClient<CurrentApplicationPayload>("/api/applications/current/start", {
      method: "POST",
      body: data,
    });
    return { ...res, data: normalizeCurrentApplication(res.data) };
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
    const res = await applicationApi.getCurrentApplication();
    const metrics = res.data.application?.id === id ? (res.data.application.metrics ?? []) : [];
    return { ...res, data: metrics.map(normalizeMetric) };
  },

  createApplicationMetric: async (applicationId: string, input: MetricInput) => {
    const res = await apiClient<any>(`/api/applications/${applicationId}/metrics`, {
      method: "POST",
      body: toBackendMetricPayload(input),
    });
    return { ...res, data: res.data?.metric ? { ...res.data, metric: normalizeMetric(res.data.metric) } : normalizeMetric(res.data) };
  },

  createMetric: async (id: string, data: { metricType: string; value: number; scale: number; evidenceName?: string }) => {
    return applicationApi.createApplicationMetric(id, {
      metricType: data.metricType as any,
      value: data.value,
      scale: data.scale,
    });
  },

  updateMetric: async (metricId: string, data: any) => {
    const res = await apiClient<any>(`/api/metrics/${metricId}`, {
      method: "PATCH",
      body: toBackendMetricUpdatePayload(data),
    });
    return { ...res, data: normalizeMetric(res.data) };
  },
};
