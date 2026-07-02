import { apiClient } from "@/lib/api/client";
import type {
  ApplicationStatus,
  Criterion,
  EvidenceStatus,
  ApiResponse,
  EscalateResolutionRequest,
  EscalateResolutionResponse,
  Level,
  QueryValue,
  RequestSupplementRequest,
  RequestSupplementResponse,
  ReviewDecisionHistoryItem,
  ReviewTaskDetail,
  ReviewTaskEvidence,
  ReviewTaskListItem,
  ReviewTaskListParams,
  ReviewTaskListResponse,
  ReviewTaskMetric,
  ReviewTaskStatus,
  Role,
  SubmitReviewDecisionRequest,
  SubmitReviewDecisionResponse,
} from "../types";

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

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : null;
}

function asRecordArray(value: unknown): RawRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is RawRecord => Boolean(asRecord(item)))
    : [];
}

function asString(value: unknown, fallback = "") {
  return value === undefined || value === null ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeListItem(item: RawRecord): ReviewTaskListItem {
  const application = asRecord(item.application);
  const collectiveProfile = asRecord(item.collectiveProfile);
  const student = asRecord(application?.student);
  const representative = asRecord(collectiveProfile?.representative);
  const assignedOfficer = asRecord(item.assignedOfficer);
  const count = asRecord(item._count);

  return {
    id: asString(item.id),
    applicationId: asString(item.applicationId ?? application?.id ?? collectiveProfile?.id),
    studentId: asString(item.studentId ?? student?.id ?? representative?.id),
    studentName: asString(
      item.studentName ??
        student?.fullName ??
        representative?.fullName ??
        collectiveProfile?.className ??
        "",
    ),
    studentCode: asString(item.studentCode ?? student?.studentCode),
    faculty: item.faculty ?? student?.faculty ?? representative?.faculty ?? null,
    className: item.className ?? student?.className ?? collectiveProfile?.className ?? null,
    schoolYear: asString(
      item.schoolYear ?? application?.schoolYear ?? collectiveProfile?.schoolYear,
    ),
    targetLevel: (item.targetLevel ??
      application?.targetLevel ??
      collectiveProfile?.targetLevel ??
      "school") as Level,
    applicationStatus: (item.applicationStatus ??
      application?.status ??
      collectiveProfile?.status ??
      "under_review") as ApplicationStatus,
    criterion: (item.criterion ?? "academic") as Criterion,
    status: (item.status ?? "waiting") as ReviewTaskStatus,
    assignedOfficerId: item.assignedOfficerId ?? assignedOfficer?.id ?? null,
    assignedOfficerName: item.assignedOfficerName ?? assignedOfficer?.fullName ?? null,
    evidenceCount: asNumber(item.evidenceCount ?? count?.evidences),
    supplementCount: item.supplementCount,
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt ?? item.createdAt),
  };
}

function normalizeReviewTaskDetail(payload: RawRecord | null): ReviewTaskDetail | null {
  if (!payload) return null;

  const rawTask = asRecord(payload.task) ?? payload;
  const rawApplication = asRecord(payload.application) ?? asRecord(rawTask.application);
  const rawCollectiveProfile =
    asRecord(payload.collectiveProfile) ?? asRecord(rawTask.collectiveProfile);
  const rawStudent =
    asRecord(payload.student) ??
    asRecord(rawApplication?.student) ??
    asRecord(rawCollectiveProfile?.representative) ??
    asRecord(rawTask.student) ??
    null;
  const rawAssignedOfficer = asRecord(rawTask.assignedOfficer) ?? asRecord(payload.assignedOfficer);

  const applicationType = (rawApplication?.applicationType ??
    (rawCollectiveProfile ? "collective" : "individual")) as "individual" | "collective";

  return {
    id: asString(rawTask.id),
    application: {
      id: asString(rawApplication?.id ?? rawTask.applicationId ?? rawCollectiveProfile?.id),
      schoolYear: asString(rawApplication?.schoolYear ?? rawCollectiveProfile?.schoolYear),
      applicationType,
      targetLevel: (rawApplication?.targetLevel ??
        rawCollectiveProfile?.targetLevel ??
        "school") as Level,
      status: (rawApplication?.status ??
        rawCollectiveProfile?.status ??
        "under_review") as ApplicationStatus,
      submittedAt: rawApplication?.submittedAt ?? rawCollectiveProfile?.submittedAt ?? null,
      finalStatus: rawApplication?.finalStatus ?? rawCollectiveProfile?.finalStatus ?? null,
      student: {
        id: asString(rawStudent?.id),
        fullName: asString(rawStudent?.fullName ?? rawCollectiveProfile?.className),
        studentCode: asString(rawStudent?.studentCode),
        email: asString(rawStudent?.email),
        faculty: rawStudent?.faculty ?? null,
        className: rawStudent?.className ?? rawCollectiveProfile?.className ?? null,
      },
    },
    criterion: (rawTask.criterion ?? "academic") as Criterion,
    status: (rawTask.status ?? "waiting") as ReviewTaskStatus,
    assignedOfficer: rawAssignedOfficer
      ? {
          id: asString(rawAssignedOfficer.id ?? rawTask.assignedOfficerId),
          fullName: asString(rawAssignedOfficer.fullName),
          email: asString(rawAssignedOfficer.email),
        }
      : null,
    evidences: normalizeEvidences(asRecordArray(payload.evidences ?? rawTask.evidences)),
    metrics: normalizeMetrics(asRecordArray(payload.metrics ?? rawApplication?.metrics)),
    checklist: normalizeChecklist(
      asRecordArray(payload.criteriaChecklist ?? payload.checklist ?? rawTask.checklist),
    ),
    decisionHistory: normalizeDecisionHistory(
      asRecordArray(payload.audit ?? payload.decisionHistory),
    ),
    createdAt: asString(rawTask.createdAt),
    updatedAt: asString(rawTask.updatedAt),
  };
}

function normalizeEvidences(items: RawRecord[]): ReviewTaskEvidence[] {
  return (items ?? []).map((item) => ({
    id: asString(item.id),
    evidenceName: asString(item.evidenceName),
    criterion: (item.criterion ?? "academic") as Criterion,
    sourceType: item.sourceType ?? "manual_upload",
    status: (item.status ?? "under_review") as EvidenceStatus,
    confidence: item.confidence ?? asRecord(item.card)?.confidence ?? null,
    note: item.note ?? null,
    reviewerNote: item.reviewerNote ?? null,
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt),
    files: asRecordArray(item.files).map((file: RawRecord) => ({
      id: asString(file.id),
      originalName: asString(file.originalName),
      mimeType: asString(file.mimeType),
      size: asNumber(file.size ?? file.fileSize),
      url: file.url ?? file.publicUrl ?? null,
      storageKey: file.storageKey ?? null,
      createdAt: asString(file.createdAt ?? item.createdAt),
    })),
  }));
}

function normalizeMetrics(items: RawRecord[]): ReviewTaskMetric[] {
  return (items ?? []).map((item) => ({
    id: asString(item.id),
    criterion: (item.criterion ?? item.metricType ?? "academic") as Criterion,
    metricType: asString(item.metricType),
    value: asString(item.valueNumber ?? item.valueString ?? item.value),
    unit: item.unit ?? null,
    note: item.note ?? null,
  }));
}

function normalizeChecklist(items: RawRecord[]) {
  return (items ?? []).map((item, index) => ({
    id: asString(item.id ?? item.key ?? index),
    label: asString(item.label ?? item.name),
    passed: item.passed ?? null,
    required: Boolean(item.required ?? true),
    note: item.note ?? item.description ?? null,
  }));
}

function normalizeDecisionHistory(items: RawRecord[]): ReviewDecisionHistoryItem[] {
  return (items ?? [])
    .filter((item) => item.action || item.decision)
    .map((item) => ({
      id: asString(item.id ?? `${asString(item.action, "decision")}-${asString(item.createdAt)}`),
      decision: mapAuditActionToDecision(asString(item.decision ?? item.action)),
      note: asString(item.note),
      actorId: asString(item.actorId),
      actorName: asString(
        asRecord(item.actor)?.fullName ?? item.actorName ?? item.actorId ?? "System",
      ),
      actorRole: item.actorRole as Role | undefined,
      createdAt: asString(item.createdAt),
    }));
}

function mapAuditActionToDecision(action?: string) {
  if (action?.toLowerCase().includes("reject")) return "rejected";
  if (action?.toLowerCase().includes("resolution")) return "resolution_needed";
  if (action?.toLowerCase().includes("supplement")) return "supplement_required";
  return "accepted";
}

function toBackendDeadline(deadline?: string | null) {
  if (!deadline) return undefined;
  return deadline.includes("T") ? deadline : new Date(`${deadline}T23:59:59`).toISOString();
}

function normalizeDecisionResponse(
  response: ApiResponse<unknown>,
): ApiResponse<SubmitReviewDecisionResponse> {
  const data = asRecord(response.data);
  const task = asRecord(data?.task) ?? data;
  const application = asRecord(data?.application) ?? asRecord(task?.application);

  return {
    ...response,
    data: task
      ? {
          taskId: asString(task.id),
          status: (task.status ?? "waiting") as ReviewTaskStatus,
          applicationId: asString(application?.id ?? task.applicationId),
          applicationStatus: (application?.status ?? "under_review") as ApplicationStatus,
        }
      : null,
  };
}

function normalizeSupplementResponse(
  response: ApiResponse<unknown>,
): ApiResponse<RequestSupplementResponse> {
  const normalized = normalizeDecisionResponse(response);
  const responseData = asRecord(response.data);
  return {
    ...response,
    data: normalized.data
      ? {
          ...normalized.data,
          status: "supplement_required",
          applicationStatus: "supplement_required",
          notificationCreated: Boolean(responseData?.notificationCreated),
        }
      : null,
  };
}

function normalizeResolutionResponse(
  response: ApiResponse<unknown>,
): ApiResponse<EscalateResolutionResponse> {
  const normalized = normalizeDecisionResponse(response);
  return {
    ...response,
    data: normalized.data
      ? {
          ...normalized.data,
          status: "resolution_needed",
          applicationStatus: "resolution_needed",
          resolutionCaseId: asString(asRecord(response.data)?.resolutionCaseId),
        }
      : null,
  };
}

export const reviewApi = {
  getReviewTasks: async (
    params?: ReviewTaskListParams,
  ): Promise<ApiResponse<ReviewTaskListResponse>> => {
    const response = await apiClient<ReviewTaskListResponse>(
      `/api/review/tasks${buildQueryString(params)}`,
    );

    return withDataFallback(
      {
        ...response,
        data: {
          items: (response.data?.items ?? []).map((item) =>
            normalizeListItem(item as unknown as RawRecord),
          ),
        },
      },
      { items: [] },
    );
  },

  getReviewTask: async (id: string): Promise<ApiResponse<ReviewTaskDetail>> => {
    const response = await apiClient<RawRecord>(`/api/review/tasks/${id}`);

    return withDataFallback({
      ...response,
      data: normalizeReviewTaskDetail(response.data),
    });
  },

  submitReviewDecision: async (
    taskId: string,
    payload: SubmitReviewDecisionRequest,
  ): Promise<ApiResponse<SubmitReviewDecisionResponse>> => {
    const response = await apiClient(`/api/review/tasks/${taskId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        decision: payload.decision,
        officerNote: payload.note,
        evidenceDecisions: payload.evidenceDecisions,
      },
    });

    return withDataFallback(normalizeDecisionResponse(response));
  },

  requestSupplement: async (
    taskId: string,
    payload: RequestSupplementRequest,
  ): Promise<ApiResponse<RequestSupplementResponse>> => {
    const response = await apiClient(`/api/review/tasks/${taskId}/request-supplement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        reason: payload.note,
        deadline: toBackendDeadline(payload.deadline),
        evidenceIds: payload.evidenceIds ?? [],
      },
    });

    return withDataFallback(normalizeSupplementResponse(response));
  },

  escalateResolution: async (
    taskId: string,
    payload: EscalateResolutionRequest,
  ): Promise<ApiResponse<EscalateResolutionResponse>> => {
    const response = await apiClient(`/api/review/tasks/${taskId}/escalate-resolution`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        reason: payload.reason,
        evidenceId: payload.evidenceIds?.[0],
      },
    });

    return withDataFallback(normalizeResolutionResponse(response));
  },
};
