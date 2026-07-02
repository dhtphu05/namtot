import { apiClient } from "@/lib/api/client";
import type {
  ApiResponse,
  ApplicationStatus,
  Criterion,
  Level,
  QueryValue,
  ReviewDecision,
  Role,
} from "@/features/review/types";
import type {
  ResolutionCaseDetail,
  ResolutionCaseListItem,
  ResolutionCaseStatus,
  ResolutionCasesParams,
  ResolutionCasesResponse,
  ResolutionFinalDecision,
  ResolveResolutionCaseRequest,
  ResolveResolutionCaseResponse,
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

function normalizeResolutionCaseItem(raw: RawRecord): ResolutionCaseListItem {
  const application = asRecord(raw.application);
  const student = asRecord(application?.student);
  const evidence = asRecord(raw.evidence);
  const createdBy = asRecord(raw.createdByUser ?? raw.createdByActor);
  const escalatedBy = asRecord(raw.escalatedBy ?? raw.createdByUser ?? raw.createdByActor);

  return {
    id: asString(raw.id),
    applicationId: asString(raw.applicationId ?? application?.id),
    taskId: asString(raw.taskId ?? raw.reviewTaskId) || null,
    evidenceIds: [raw.evidenceId ?? evidence?.id].filter(Boolean).map((item) => asString(item)),
    studentId: asString(raw.studentId ?? student?.id),
    studentName: asString(raw.studentName ?? student?.fullName),
    studentCode: asString(raw.studentCode ?? student?.studentCode),
    className: (raw.className ?? student?.className ?? null) as string | null,
    faculty: (raw.faculty ?? student?.faculty ?? null) as string | null,
    targetLevel: (raw.targetLevel ?? application?.targetLevel ?? "school") as Level,
    criterion: (raw.criterion ?? evidence?.criterion ?? "academic") as Criterion,
    reason: asString(raw.reason),
    status: normalizeResolutionStatus(raw.status),
    createdById: asString(raw.createdById ?? raw.createdBy) || null,
    createdByName: asString(raw.createdByName ?? createdBy?.fullName) || null,
    createdByRole: (raw.createdByRole ?? createdBy?.role ?? null) as Role | null,
    escalatedById: asString(raw.escalatedById ?? raw.createdBy) || null,
    escalatedByName: asString(raw.escalatedByName ?? escalatedBy?.fullName) || null,
    escalatedByRole: (raw.escalatedByRole ?? escalatedBy?.role ?? null) as Role | null,
    createdAt: asString(raw.createdAt),
    updatedAt: asString(raw.updatedAt ?? raw.closedAt ?? raw.createdAt),
  };
}

function normalizeResolutionCaseDetail(payload: RawRecord | null): ResolutionCaseDetail | null {
  if (!payload) return null;

  const rawCase = asRecord(payload.resolutionCase) ?? payload;
  const application = asRecord(payload.application) ?? asRecord(rawCase.application);
  const student = asRecord(payload.student) ?? asRecord(application?.student);
  const evidence = asRecord(payload.evidence) ?? asRecord(rawCase.evidence);
  const relatedTask = asRecord(payload.relatedReviewTask);
  const base = normalizeResolutionCaseItem({
    ...rawCase,
    application,
    evidence,
    studentId: student?.id,
    studentName: student?.fullName,
    studentCode: student?.studentCode,
    faculty: student?.faculty,
    className: student?.className,
    taskId: relatedTask?.id ?? rawCase.taskId,
  });

  return {
    ...base,
    applicationStatus: (application?.status ??
      rawCase.applicationStatus ??
      "resolution_needed") as ApplicationStatus,
    officerNote: asString(relatedTask?.officerNote ?? rawCase.officerNote) || null,
    evidenceNames: [evidence?.evidenceName].filter(Boolean).map((item) => asString(item)),
    comments: [],
    auditTimeline: asRecordArray(payload.auditTimeline).map((item) => ({
      id: asString(item.id),
      actorId: asString(item.actorId) || null,
      actorName: asString(item.actorName ?? item.actorId),
      actorRole: (item.actorRole ?? null) as Role | null,
      action: asString(item.action),
      note: asString(item.note) || null,
      createdAt: asString(item.createdAt),
    })),
    decisionHistory: buildDecisionHistory(rawCase, asRecordArray(payload.auditTimeline)),
  };
}

function buildDecisionHistory(
  rawCase: RawRecord,
  auditTimeline: RawRecord[],
): NonNullable<ResolutionCaseDetail["decisionHistory"]> {
  const committeeDecision = parseCommitteeDecision(rawCase.committeeDecision);
  const decisionItems = auditTimeline.filter((item) =>
    asString(item.action).toLowerCase().includes("resolution"),
  );

  if (committeeDecision?.decision) {
    return [
      {
        id: `${asString(rawCase.id)}-committee-decision`,
        decision: mapFinalDecisionToReviewDecision(committeeDecision.decision),
        note: asString(committeeDecision.note),
        actorId: asString(rawCase.closedBy),
        actorName: asString(rawCase.closedByName ?? rawCase.closedBy ?? "Hội đồng"),
        actorRole: "committee",
        createdAt: asString(committeeDecision.decidedAt ?? rawCase.closedAt ?? rawCase.createdAt),
      },
    ];
  }

  return decisionItems.map((item) => ({
    id: asString(item.id),
    decision: "resolution_needed",
    note: asString(item.note),
    actorId: asString(item.actorId),
    actorName: asString(item.actorName ?? item.actorId ?? "System"),
    actorRole: (item.actorRole ?? "committee") as Role,
    createdAt: asString(item.createdAt),
  }));
}

function parseCommitteeDecision(value: unknown): RawRecord | null {
  if (!value) return null;
  if (typeof value === "object") return asRecord(value);
  if (typeof value !== "string") return null;

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function mapFinalDecisionToReviewDecision(decision: unknown): ReviewDecision {
  if (decision === "accepted" || decision === "rejected" || decision === "supplement_required") {
    return decision;
  }
  return "resolution_needed";
}

function normalizeResolutionStatus(status: unknown): ResolutionCaseStatus {
  if (status === "resolved" || status === "rejected" || status === "closed") return "resolved";
  if (status === "in_review" || status === "analyzing" || status === "committee_review") {
    return "in_review";
  }
  return "open";
}

function normalizeResolveResponse(
  response: ApiResponse<unknown>,
  requestedDecision: ResolutionFinalDecision,
): ApiResponse<ResolveResolutionCaseResponse> {
  const data = asRecord(response.data);
  const rawCase = asRecord(data?.resolutionCase) ?? data;
  const application = asRecord(data?.application);
  const committeeDecision = parseCommitteeDecision(rawCase?.committeeDecision);

  return {
    ...response,
    data: rawCase
      ? {
          id: asString(rawCase.id),
          status: normalizeResolutionStatus(rawCase.status),
          decision: (committeeDecision?.decision ?? requestedDecision) as ResolutionFinalDecision,
          applicationId: asString(application?.id ?? rawCase.applicationId),
          applicationStatus: (application?.status ?? "resolution_needed") as ApplicationStatus,
          resolvedAt: asString(rawCase.closedAt) || null,
        }
      : null,
  };
}

export const resolutionApi = {
  getResolutionCases: async (
    params?: ResolutionCasesParams,
  ): Promise<ApiResponse<ResolutionCasesResponse>> => {
    const response = await apiClient<ResolutionCasesResponse>(
      `/api/resolution/cases${buildQueryString(params)}`,
    );

    return withDataFallback(
      {
        ...response,
        data: {
          items: (response.data?.items ?? []).map((item) =>
            normalizeResolutionCaseItem(item as unknown as RawRecord),
          ),
        },
      },
      { items: [] },
    );
  },

  getResolutionCase: async (id: string): Promise<ApiResponse<ResolutionCaseDetail>> => {
    const response = await apiClient<RawRecord>(`/api/resolution/cases/${id}`);

    return withDataFallback({
      ...response,
      data: normalizeResolutionCaseDetail(response.data),
    });
  },

  resolveResolutionCase: async (
    id: string,
    payload: ResolveResolutionCaseRequest,
  ): Promise<ApiResponse<ResolveResolutionCaseResponse>> => {
    const response = await apiClient(`/api/resolution/cases/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    return withDataFallback(normalizeResolveResponse(response, payload.decision));
  },
};
