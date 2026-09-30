import { apiClient } from "@/lib/api/client";
import type { PrecheckResult } from "@/lib/api/types";
import type {
  ApplicationStatus,
  Criterion,
  EvidenceStatus,
  ApiResponse,
  ClaimReviewTaskResponse,
  CriterionAuthority,
  CriterionLevelAssessment,
  EscalateResolutionRequest,
  EscalateResolutionResponse,
  Level,
  OfficerDashboardResponse,
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
  ReviewTaskPermissions,
  ReviewTaskPrecedentCheckResponse,
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asString(value: unknown, fallback = "") {
  return value === undefined || value === null ? fallback : String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizePermissions(value: unknown): ReviewTaskPermissions | undefined {
  const permissions = asRecord(value);
  if (!permissions) return undefined;

  return {
    canView: Boolean(permissions.canView),
    canAct: Boolean(permissions.canAct),
    canClaim: Boolean(permissions.canClaim),
    canRequestSupport: Boolean(permissions.canRequestSupport),
    reason: asString(permissions.reason) as ReviewTaskPermissions["reason"],
    reasonLabel: asString(permissions.reasonLabel),
    badges: asStringArray(permissions.badges),
    availableActions: asStringArray(
      permissions.availableActions,
    ) as ReviewTaskPermissions["availableActions"],
  };
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
    supplementCount: asNumber(item.supplementCount),
    aiConfidence:
      item.aiConfidence === undefined || item.aiConfidence === null
        ? null
        : asNumber(item.aiConfidence),
    riskLevel: (item.riskLevel ?? "low") as ReviewTaskListItem["riskLevel"],
    dueDate: item.dueDate === undefined || item.dueDate === null ? null : asString(item.dueDate),
    officerSuggestedLevel: (item.officerSuggestedLevel ?? null) as Level | null,
    permissions: normalizePermissions(item.permissions),
    priorityReason: (item.priorityReason ?? null) as ReviewTaskListItem["priorityReason"],
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
  const evidenceRecords = mergeReviewEvidenceRecords(payload, rawTask, rawApplication);

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
    evidences: normalizeEvidences(evidenceRecords),
    metrics: normalizeMetrics(asRecordArray(payload.metrics ?? rawApplication?.metrics)),
    precheck: normalizeReviewPrecheck(payload.precheck),
    checklist: normalizeChecklist(
      asRecordArray(payload.criteriaChecklist ?? payload.checklist ?? rawTask.checklist),
    ),
    criterionLevelAssessment: normalizeCriterionLevelAssessment(
      asRecord(payload.criterionLevelAssessment ?? rawTask.criterionLevelAssessment),
    ),
    officerSuggestedLevel: (rawTask.officerSuggestedLevel ?? null) as Level | null,
    levelAssessmentJson: rawTask.levelAssessmentJson ?? null,
    decisionReason: asString(rawTask.decisionReason) || null,
    supplementRequestJson: rawTask.supplementRequestJson ?? null,
    permissions: normalizePermissions(rawTask.permissions ?? payload.permissions),
    decisionHistory: normalizeDecisionHistory(
      asRecordArray(payload.audit ?? payload.decisionHistory),
    ),
    createdAt: asString(rawTask.createdAt),
    updatedAt: asString(rawTask.updatedAt),
  };
}

function normalizeReviewPrecheck(value: unknown): PrecheckResult | null {
  const record = asRecord(value);
  if (!record) return null;
  const result = asRecord(record.resultJson) ?? record;
  if (!Array.isArray(result.criteriaResults)) return null;

  return {
    applicationId: asString(result.applicationId ?? record.applicationId),
    level: (result.level ?? "city") as PrecheckResult["level"],
    readinessScore: asNumber(result.readinessScore ?? record.readinessScore),
    readyToSubmit: Boolean(result.readyToSubmit),
    criteriaResults: asRecordArray(result.criteriaResults) as PrecheckResult["criteriaResults"],
    missingItems: asRecordArray(
      result.missingItems ?? record.missingItemsJson,
    ) as PrecheckResult["missingItems"],
    warnings: asStringArray(result.warnings),
    nextBestAction: asString(result.nextBestAction ?? record.nextBestAction),
    nextAction: (result.nextAction ?? null) as PrecheckResult["nextAction"],
    humanConfirmationRequired: result.humanConfirmationRequired !== false,
    createdAt: asString(record.createdAt ?? result.createdAt),
  };
}

function mergeReviewEvidenceRecords(
  payload: RawRecord,
  rawTask: RawRecord,
  rawApplication: RawRecord | null,
): RawRecord[] {
  const evidenceSources = [
    payload.evidences,
    payload.reviewTaskEvidences,
    rawTask.evidences,
    rawTask.reviewTaskEvidences,
    rawApplication?.evidences,
    rawApplication?.evidenceCards,
  ];
  const byId = new Map<string, RawRecord>();

  for (const source of evidenceSources) {
    for (const item of asRecordArray(source)) {
      const id = asString(
        item.id ?? item.evidenceId ?? item.evidence_id ?? item.cardId ?? item.card_id,
      );
      if (!id) continue;
      byId.set(id, { ...(byId.get(id) ?? {}), ...item, id });
    }
  }

  const fileSources = [
    payload.evidenceFiles,
    payload.files,
    rawApplication?.evidenceFiles,
    rawApplication?.files,
    rawTask.evidenceFiles,
    rawTask.files,
  ];
  for (const source of fileSources) {
    for (const file of asRecordArray(source)) {
      const evidenceId = asString(
        file.evidenceId ??
          file.evidence_id ??
          file.evidenceCardId ??
          file.evidence_card_id ??
          file.cardId ??
          file.card_id,
      );
      if (!evidenceId) continue;
      const current = byId.get(evidenceId) ?? { id: evidenceId };
      const files = asRecordArray(current.files);
      byId.set(evidenceId, { ...current, files: [...files, file] });
    }
  }

  return Array.from(byId.values());
}

function normalizeEvidences(items: RawRecord[]): ReviewTaskEvidence[] {
  return (items ?? []).map((item) => ({
    id: asString(item.id),
    evidenceName: asString(
      item.evidenceName ??
        item.evidence_name ??
        item.title ??
        item.name ??
        item.documentName ??
        item.document_name,
    ),
    criterion: (item.criterion ?? "academic") as Criterion,
    sourceType: item.sourceType ?? "manual_upload",
    status: (item.status ?? "under_review") as EvidenceStatus,
    indexingStatus: asString(item.indexingStatus),
    confidence: item.confidence ?? asRecord(item.card)?.confidence ?? null,
    note: item.note ?? null,
    reviewerNote: item.reviewerNote ?? null,
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt),
    files: asRecordArray(item.files).map((file: RawRecord) => ({
      id: asString(file.id ?? file.fileId ?? file.file_id),
      originalName: asString(
        file.originalName ??
          file.original_name ??
          file.fileName ??
          file.file_name ??
          file.name ??
          file.filename,
      ),
      mimeType: asString(file.mimeType ?? file.mime_type ?? file.contentType ?? file.content_type),
      size: asNumber(file.size ?? file.fileSize ?? file.file_size),
      url:
        file.url ??
        file.publicUrl ??
        file.public_url ??
        file.signedUrl ??
        file.signed_url ??
        file.downloadUrl ??
        file.download_url ??
        null,
      storageKey: file.storageKey ?? file.storage_key ?? file.key ?? null,
      createdAt: asString(file.createdAt ?? file.created_at ?? item.createdAt),
      uploadedAt: asString(
        file.uploadedAt ?? file.uploaded_at ?? file.createdAt ?? file.created_at ?? item.createdAt,
      ),
    })),
    card: normalizeEvidenceCard(asRecord(item.card) ?? item),
    event: asRecord(item.event)
      ? {
          id: asString(asRecord(item.event)?.id),
          eventName: asString(asRecord(item.event)?.eventName),
          organizer: asRecord(item.event)?.organizer as string | null,
          organizerLevel: (asRecord(item.event)?.organizerLevel ?? null) as Level | null,
          startDate: asRecord(item.event)?.startDate
            ? asString(asRecord(item.event)?.startDate)
            : null,
          endDate: asRecord(item.event)?.endDate ? asString(asRecord(item.event)?.endDate) : null,
        }
      : null,
  }));
}

function normalizeEvidenceCard(card: RawRecord | null) {
  if (!card) return null;
  return {
    id: asString(card.id),
    ocrText: (card.ocrText ?? null) as string | null,
    readableSummary: (card.readableSummary ?? null) as Record<string, unknown> | null,
    userProvidedFields: asRecord(card.userProvidedFields) ?? null,
    studentProfileFields: asRecord(card.studentProfileFields) ?? null,
    extractedFields: asRecord(card.extractedFields) ?? null,
    normalizedFields: asRecord(card.normalizedFields) ?? null,
    verifiedFields: asRecord(card.verifiedFields) ?? null,
    primaryFields: asRecord(card.primaryFields) ?? null,
    fieldConfidence: asRecord(card.fieldConfidence) as Record<string, number> | null,
    metricSuggestions: asRecord(card.metricSuggestions) ?? null,
    academic: asRecord(card.academic) ?? null,
    extractedFieldsJson: card.extractedFieldsJson ?? null,
    normalizedFieldsJson: card.normalizedFieldsJson ?? null,
    matchingStatus: asRecord(card.matchingStatus) as ReviewTaskEvidenceCard["matchingStatus"],
    warningsJson: card.warningsJson ?? card.warnings ?? [],
    matchedEventId: (card.matchedEventId ?? null) as string | null,
    matchedKnowledgeItemIds: card.matchedKnowledgeItemIds ?? null,
    confidence:
      card.confidence === undefined || card.confidence === null ? null : asNumber(card.confidence),
    aiSummary: (card.aiSummary ?? null) as string | null,
    createdAt: asString(card.createdAt),
    updatedAt: asString(card.updatedAt),
  };
}

function normalizeCriterionLevelAssessment(
  payload: RawRecord | null,
): CriterionLevelAssessment | null {
  if (!payload) return null;
  return {
    taskId: asString(payload.taskId),
    criterion: (payload.criterion ?? "academic") as Criterion,
    targetLevel: (payload.targetLevel ?? null) as Level | null,
    levels: asRecordArray(payload.levels).map((level) => ({
      level: (level.level ?? "school") as Level,
      status: (level.status ??
        "needs_review") as CriterionLevelAssessment["levels"][number]["status"],
      score: level.score === undefined || level.score === null ? null : asNumber(level.score),
      summary: asString(level.summary),
      criteriaVersion: asRecord(level.criteriaVersion)
        ? {
            id: asString(asRecord(level.criteriaVersion)?.id) || null,
            versionName: asString(asRecord(level.criteriaVersion)?.versionName) || null,
          }
        : null,
      requirements: asRecordArray(level.requirements).map((requirement) => ({
        key: asString(requirement.key),
        label: asString(requirement.label),
        status: (requirement.status ??
          "needs_review") as CriterionLevelAssessment["levels"][number]["requirements"][number]["status"],
        actualValue:
          requirement.actualValue === undefined || requirement.actualValue === null
            ? null
            : asString(requirement.actualValue),
        requiredValue:
          requirement.requiredValue === undefined || requirement.requiredValue === null
            ? null
            : asString(requirement.requiredValue),
        source:
          requirement.source === undefined || requirement.source === null
            ? null
            : asString(requirement.source),
        reason:
          requirement.reason === undefined || requirement.reason === null
            ? null
            : asString(requirement.reason),
        ruleType:
          requirement.ruleType === undefined || requirement.ruleType === null
            ? null
            : asString(requirement.ruleType),
        check: asRecord(requirement.check)
          ? {
              metric: asString(asRecord(requirement.check)?.metric) || undefined,
              operator: asString(asRecord(requirement.check)?.operator) || undefined,
              value:
                typeof asRecord(requirement.check)?.value === "number"
                  ? (asRecord(requirement.check)?.value as number)
                  : undefined,
              evidenceCriterion: asRecord(requirement.check)?.evidenceCriterion as
                Criterion | undefined,
              evidenceSourceType:
                asString(asRecord(requirement.check)?.evidenceSourceType) || undefined,
            }
          : null,
        grouping: Array.isArray(requirement.grouping) ? requirement.grouping : [],
      })),
    })),
    suggestedCriterionLevel: (payload.suggestedCriterionLevel ?? null) as Level | null,
    humanConfirmationRequired: Boolean(payload.humanConfirmationRequired ?? true),
    criteriaAuthority: normalizeCriterionAuthority(payload.criteriaAuthority),
  };
}

function normalizeCriterionAuthority(value: unknown): CriterionAuthority | null {
  const authority = asRecord(value);
  if (!authority) return null;

  return {
    source: asString(authority.source, "CriteriaVersion"),
    applicationWorkspaceId: authority.applicationWorkspaceId
      ? asString(authority.applicationWorkspaceId)
      : null,
    schoolYear: authority.schoolYear ? asString(authority.schoolYear) : null,
    targetLevel: (authority.targetLevel ?? null) as Level | null,
    levels: asRecordArray(authority.levels).map((level) => ({
      level: (level.level ?? "school") as Level,
      status: (level.status ?? "blocked") as "resolved" | "blocked",
      criteriaVersionId: level.criteriaVersionId ? asString(level.criteriaVersionId) : null,
      versionName: level.versionName ? asString(level.versionName) : null,
      unitScope: level.unitScope ? asString(level.unitScope) : null,
      warnings: asStringArray(level.warnings),
    })),
  };
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
    const serializedParams = params
      ? ({
          ...params,
          statuses: params.statuses?.join(","),
        } as Record<string, QueryValue>)
      : undefined;
    const response = await apiClient<ReviewTaskListResponse>(
      `/api/review/tasks${buildQueryString(serializedParams)}`,
    );

    return withDataFallback(
      {
        ...response,
        data: {
          items: (response.data?.items ?? []).map((item) =>
            normalizeListItem(item as unknown as RawRecord),
          ),
          pagination: response.meta.pagination ?? response.data?.pagination,
        },
      },
      { items: [] },
    );
  },

  getOfficerDashboard: async (): Promise<ApiResponse<OfficerDashboardResponse>> => {
    const response = await apiClient<OfficerDashboardResponse>("/api/review/dashboard");
    return withDataFallback(response);
  },

  getReviewTask: async (id: string): Promise<ApiResponse<ReviewTaskDetail>> => {
    const response = await apiClient<RawRecord>(`/api/review/tasks/${id}`);

    return withDataFallback({
      ...response,
      data: normalizeReviewTaskDetail(response.data),
    });
  },

  claimReviewTask: async (taskId: string): Promise<ApiResponse<ClaimReviewTaskResponse>> => {
    const response = await apiClient<RawRecord>(`/api/review/tasks/${taskId}/claim`, {
      method: "POST",
    });
    const rawTask = asRecord(response.data?.task);

    return withDataFallback({
      ...response,
      data: {
        task: rawTask ? normalizeListItem(rawTask) : undefined,
      },
    });
  },

  getCriterionLevelAssessment: async (
    id: string,
  ): Promise<ApiResponse<CriterionLevelAssessment>> => {
    const response = await apiClient<RawRecord>(
      `/api/review/tasks/${id}/criterion-level-assessment`,
    );
    return withDataFallback({
      ...response,
      data: normalizeCriterionLevelAssessment(response.data),
    });
  },

  getReviewTaskTimeline: async (id: string): Promise<ApiResponse<unknown[]>> => {
    return apiClient<unknown[]>(`/api/review/tasks/${id}/timeline`);
  },

  getReviewTaskPrecedents: async (
    id: string,
    limit = 3,
  ): Promise<ApiResponse<ReviewTaskPrecedentCheckResponse>> => {
    const response = await apiClient<ReviewTaskPrecedentCheckResponse>(
      `/api/review/tasks/${id}/precedents/check${buildQueryString({ limit })}`,
    );
    return withDataFallback(response, { items: [], hasStrongPrecedent: false });
  },

  getSignedFileUrl: async (fileId: string) => {
    return apiClient<{ url: string }>(`/api/files/${fileId}/signed-url`);
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
        officerSuggestedLevel: payload.officerSuggestedLevel ?? null,
        levelAssessmentJson: payload.levelAssessmentJson,
        supplementRequestJson: payload.supplementRequestJson,
        officerNote: payload.note,
        precedentId: payload.precedentId,
        precedentEventId: payload.precedentEventId,
        precedentEvidenceId: payload.precedentEvidenceId,
        evidenceDecisions: payload.evidenceDecisions,
        evidenceAssessments: payload.evidenceAssessments,
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
        evidenceIds: payload.evidenceIds ?? [],
        precedentId: payload.precedentId,
        precedentGuardViewed: payload.precedentGuardViewed,
        precedentGuardReason: payload.precedentGuardReason,
      },
    });

    return withDataFallback(normalizeResolutionResponse(response));
  },
};
