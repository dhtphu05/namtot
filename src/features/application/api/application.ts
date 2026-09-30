import { apiClient } from "@/lib/api/client";
import type {
  ApplicationMetric,
  CurrentApplicationEmpty,
  CurrentApplicationResponse,
  CriteriaCompletionResponse,
  CitySubmissionEligibility,
  ApplicationSubmissionDeadline,
  Level,
  MetricInput,
  PrecheckResult,
} from "@/lib/api/types";

type MetricPayloadInput = {
  metricType?: unknown;
  value?: unknown;
  valueNumber?: unknown;
  valueText?: unknown;
  scale?: unknown;
  verificationStatus?: unknown;
};

type MetricApiData =
  | ApplicationMetric
  | (Record<string, unknown> & {
      metric?: ApplicationMetric;
    });

export type DeclareEthicsConductScoreInput = {
  value: number;
  scale?: number;
  schoolYear?: string;
  sourceType?: "manual_metric" | "manual_evidence";
  evidenceId?: string;
};

export type DeclareAcademicGpaInput = {
  value: number;
  scale: 4 | 10;
  schoolYear: string;
  sourceType?: "manual_metric" | "manual_evidence";
  evidenceId?: string;
};

export type DeclarePhysicalCourseResultInput = {
  resultType: "score" | "classification";
  value?: number;
  classification?: string;
  schoolYear: string;
  sourceType?: "manual_metric" | "manual_evidence";
  evidenceId?: string;
  replaceExisting?: boolean;
};

export type AddPhysicalPathEvidenceInput = {
  requirementKey:
    | "healthy_student_title"
    | "sports_activity_or_award"
    | "sports_team_member"
    | "regular_sports_training";
  evidenceId: string;
  sourceType?: "manual_evidence" | "official_event";
  payloadJson?: Record<string, unknown>;
  replaceExisting?: boolean;
};

export type AddVolunteerActivityInput = {
  requirementKey: "accumulated_volunteer_days" | "activity_count";
  activityType: string;
  activityName: string;
  organizer?: string;
  organizerLevel?: string;
  startDate?: string;
  endDate?: string;
  declaredValue?: number;
  declaredUnit?: "day" | "session" | "event" | "donation";
  sourceType?: "manual_evidence" | "official_event";
  evidenceId?: string;
  eventId?: string;
};

export type AddIntegrationPathResponseInput = {
  requirementKey: string;
  evidenceId?: string;
  sourceType?: "manual_evidence" | "official_event";
  payloadJson?: Record<string, unknown>;
};

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
    return {
      application: null,
      state: "not_started",
      schoolYear: new Date().getFullYear().toString(),
    };
  }

  if ("application" in data) {
    return {
      ...data,
      application: data.application ? normalizeApplication(data.application) : data.application,
    };
  }

  return {
    application: normalizeApplication(data),
    state: data.state ?? data.status,
  };
}

function normalizeApplication<
  T extends { targetLevel?: unknown; finalLevel?: unknown; metrics?: unknown[] },
>(application: T): T {
  return {
    ...application,
    targetLevel: normalizeLevel(application.targetLevel),
    finalLevel: application.finalLevel
      ? normalizeLevel(application.finalLevel)
      : application.finalLevel,
    metrics: application.metrics?.map((metric) =>
      metric && typeof metric === "object" ? normalizeMetric(metric) : metric,
    ),
  };
}

function normalizeLevel(value: unknown): Level {
  const map: Record<string, Level> = {
    truong: "school",
    school: "school",
    dhdn: "university",
    university: "university",
    "dai-hoc-da-nang": "university",
    "thanh-pho": "city",
    city: "city",
    "trung-uong": "central",
    central: "central",
  };
  return map[String(value ?? "").trim()] ?? "school";
}

const metricTypeMap: Record<string, string> = {
  language_certificate: "foreign_language_score",
  integration_activity: "foreign_language_score",
};

function normalizeMetric<
  T extends { metricType?: unknown; value?: unknown; valueNumber?: unknown },
>(metric: T): T & { value: unknown; valueNumber: unknown; metricType: unknown } {
  const value = metric.value ?? metric.valueNumber;
  return {
    ...metric,
    metricType:
      metric.metricType === "language_certificate" ? "foreign_language_score" : metric.metricType,
    value,
    valueNumber: value,
  };
}

function parseMetricValue(input: MetricPayloadInput) {
  const raw = input.value ?? input.valueNumber ?? input.valueText;
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return undefined;

  const normalized = raw.replace(",", ".");
  const match = normalized.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function toBackendMetricPayload(input: MetricPayloadInput) {
  const metricType = metricTypeMap[String(input.metricType)] ?? input.metricType;
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

function toBackendMetricUpdatePayload(input: MetricPayloadInput) {
  const value = parseMetricValue(input);
  return {
    ...(value !== undefined && !Number.isNaN(value) ? { value } : {}),
    ...(input.scale !== undefined ? { scale: input.scale } : {}),
    ...(input.verificationStatus ? { verificationStatus: input.verificationStatus } : {}),
  };
}

export const applicationApi = {
  getSubmissionDeadline: async (applicationId: string) => {
    return apiClient<ApplicationSubmissionDeadline>(
      `/api/applications/${applicationId}/submission-deadline`,
      { method: "GET" },
    );
  },

  getCitySubmissionEligibility: async (applicationId: string) => {
    return apiClient<CitySubmissionEligibility>(`/api/applications/${applicationId}/eligibility`, {
      method: "GET",
    });
  },

  getCurrentApplication: async (schoolYear?: string) => {
    const query = schoolYear ? `?schoolYear=${schoolYear}` : "";
    const res = await apiClient<CurrentApplicationPayload>(`/api/applications/current${query}`, {
      method: "GET",
    });
    return { ...res, data: normalizeCurrentApplication(res.data) };
  },

  startCurrentApplication: async (data: { schoolYear?: string }) => {
    const res = await apiClient<CurrentApplicationPayload>("/api/applications/current/start", {
      method: "POST",
      body: data,
    });
    return { ...res, data: normalizeCurrentApplication(res.data) };
  },

  startApplication: async (data: { schoolYear?: string }) => {
    return applicationApi.startCurrentApplication(data);
  },

  updateTargetLevel: async (applicationId: string, targetLevel: Level) => {
    return apiClient(`/api/applications/${applicationId}/target-level`, {
      method: "PATCH",
      body: { targetLevel },
    });
  },

  saveDraft: async (
    applicationId: string,
    input: { draftData: Record<string, unknown>; step?: string },
  ) => {
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

  getCriteriaCompletion: async (id: string) => {
    return apiClient<CriteriaCompletionResponse>(`/api/applications/${id}/criteria-completion`, {
      method: "GET",
    });
  },

  declareEthicsConductScore: async (id: string, input: DeclareEthicsConductScoreInput) => {
    return apiClient(`/api/applications/${id}/ethics/conduct-score/declare`, {
      method: "POST",
      body: input,
    });
  },

  declareAcademicGpa: async (id: string, input: DeclareAcademicGpaInput) => {
    return apiClient(`/api/applications/${id}/academic/gpa/declare`, {
      method: "POST",
      body: input,
    });
  },

  declarePhysicalCourseResult: async (id: string, input: DeclarePhysicalCourseResultInput) => {
    return apiClient(`/api/applications/${id}/physical/course-result/declare`, {
      method: "POST",
      body: input,
    });
  },

  addPhysicalPathEvidence: async (id: string, input: AddPhysicalPathEvidenceInput) => {
    return apiClient(`/api/applications/${id}/physical/path-evidence`, {
      method: "POST",
      body: input,
    });
  },

  addVolunteerActivity: async (id: string, input: AddVolunteerActivityInput) => {
    return apiClient(`/api/applications/${id}/volunteer/activities`, {
      method: "POST",
      body: input,
    });
  },

  addIntegrationPathResponse: async (id: string, input: AddIntegrationPathResponseInput) => {
    return apiClient(`/api/applications/${id}/integration/path-responses`, {
      method: "POST",
      body: input,
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

  submitApplication: async (
    applicationId: string,
    options: { allowSubmitWithWarnings: boolean; studentNote?: string },
  ) => {
    return apiClient(`/api/applications/${applicationId}/submit`, {
      method: "POST",
      body: options,
    });
  },

  submit: async (
    id: string,
    options: { allowSubmitWithWarnings?: boolean; studentNote?: string },
  ) => {
    return applicationApi.submitApplication(id, {
      allowSubmitWithWarnings: !!options.allowSubmitWithWarnings,
      studentNote: options.studentNote,
    });
  },

  getMetrics: async (id: string) => {
    const res = await applicationApi.getCurrentApplication();
    const metrics = res.data.application?.id === id ? (res.data.application.metrics ?? []) : [];
    return { ...res, data: metrics.map(normalizeMetric) };
  },

  createApplicationMetric: async (applicationId: string, input: MetricInput) => {
    const res = await apiClient<MetricApiData>(`/api/applications/${applicationId}/metrics`, {
      method: "POST",
      body: toBackendMetricPayload(input),
    });
    return {
      ...res,
      data: res.data?.metric
        ? { ...res.data, metric: normalizeMetric(res.data.metric) }
        : normalizeMetric(res.data),
    };
  },

  createMetric: async (
    id: string,
    data: { metricType: string; value: number; scale: number; evidenceName?: string },
  ) => {
    return applicationApi.createApplicationMetric(id, {
      metricType: data.metricType as MetricInput["metricType"],
      value: data.value,
      scale: data.scale,
    });
  },

  updateMetric: async (metricId: string, data: MetricPayloadInput) => {
    const res = await apiClient<ApplicationMetric>(`/api/metrics/${metricId}`, {
      method: "PATCH",
      body: toBackendMetricUpdatePayload(data),
    });
    return { ...res, data: normalizeMetric(res.data) };
  },
};
