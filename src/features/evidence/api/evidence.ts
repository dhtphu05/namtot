import { apiClient } from "@/lib/api/client";
import type {
  Criterion,
  EvidenceSourceType,
  EvidenceStatus,
  IndexingStatus,
  Evidence,
} from "@/lib/api/types";
import type {
  EvidenceAudit,
  EvidenceCard,
  EvidenceDetail,
  EvidenceStudentStatus,
  EvidenceStudentStatusCode,
} from "@/types/evidence";

export interface EvidenceResponse extends Evidence {
  fileId?: string;
  jobId?: string;
  studentStatus?: EvidenceStudentStatus | null;
}

type EvidenceListPayload =
  | unknown[]
  | {
      items?: unknown[];
      data?: unknown[];
      evidences?: unknown[];
    };

type EvidencePayload =
  | unknown
  | {
      evidence?: unknown;
      file?: {
        id?: string;
        fileName?: string;
        size?: number;
        [key: string]: unknown;
      };
      jobId?: string | null;
      [key: string]: unknown;
    }
  | null;

function normalizeEvidences(payload: EvidenceListPayload | null): EvidenceResponse[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.items ?? payload?.data ?? payload?.evidences ?? []);
  return rows.map(normalizeEvidence).filter((item): item is EvidenceResponse => Boolean(item?.id));
}

export function normalizeEvidence(payload: EvidencePayload): EvidenceResponse {
  if (!payload) return payload as EvidenceResponse;
  const wrapper = asRecord(payload);
  const row = asRecord(wrapper?.evidence) ?? wrapper ?? {};
  const file = asRecord(wrapper?.file);

  return {
    ...row,
    id: stringValue(row.id),
    applicationId: nullableString(row.applicationId ?? row.application_id),
    evidenceName:
      stringValue(row.evidenceName ?? row.evidence_name ?? row.name ?? row.title) || "Minh chứng",
    criterion: enumString(row.criterion, "academic") as Criterion,
    sourceType: enumString(
      row.sourceType ?? row.source_type,
      "manual_upload",
    ) as EvidenceSourceType,
    status: enumString(row.status, "draft") as EvidenceStatus,
    indexingStatus: enumString(
      row.indexingStatus ?? row.indexing_status ?? asRecord(row.uxStatus ?? row.ux_status)?.step,
      "not_started",
    ) as IndexingStatus,
    description: nullableString(row.description),
    note: nullableString(row.note),
    confidence: nullableNumber(row.confidence),
    studentStatus: normalizeStudentStatus(row.studentStatus ?? row.student_status),
    files: Array.isArray(row.files) ? row.files : [],
    fileId: nullableString(row.fileId ?? row.file_id ?? file?.id) ?? undefined,
    fileName:
      nullableString(row.fileName ?? row.file_name ?? file?.fileName ?? file?.file_name) ??
      undefined,
    jobId:
      nullableString(row.jobId ?? row.job_id ?? wrapper?.jobId ?? wrapper?.job_id) ?? undefined,
    uxStatus: asRecord(row.uxStatus ?? row.ux_status),
    card: normalizeEvidenceCard(row.card),
    createdAt: nullableString(row.createdAt ?? row.created_at) ?? "",
    updatedAt: nullableString(row.updatedAt ?? row.updated_at) ?? "",
  } as EvidenceResponse;
}

function normalizeEvidenceCard(payload: unknown): EvidenceCard | null {
  if (!payload) return null;
  const wrapper = asRecord(payload);
  const row = asRecord(wrapper?.card) ?? wrapper;
  if (!row) return null;
  const readableSummary =
    asRecord(row.readableSummary ?? row.readable_summary) ??
    asRecord(row.summary) ??
    normalizeReadableSummary(
      row.extractedFields ?? row.extracted_fields ?? row.extractedFieldsJson,
    );
  const missingFields = normalizeStringOrObjectArray(
    row.missingFields ?? row.missing_fields ?? row.missingInfo ?? row.missing_info,
  );

  return {
    ...row,
    id: nullableString(row.id) ?? undefined,
    evidenceId: nullableString(row.evidenceId ?? row.evidence_id) ?? undefined,
    readableSummary,
    matchingStatus: normalizeMatchingStatus(row.matchingStatus ?? row.matching_status),
    missingFields,
    studentStatus: normalizeStudentStatus(row.studentStatus ?? row.student_status),
    userProvidedFields: asRecord(row.userProvidedFields ?? row.user_provided_fields) ?? null,
    extractedFields: asRecord(row.extractedFields ?? row.extracted_fields) ?? null,
    normalizedFields: asRecord(row.normalizedFields ?? row.normalized_fields) ?? null,
    verifiedFields: asRecord(row.verifiedFields ?? row.verified_fields) ?? null,
    fieldConfidence: asRecord(row.fieldConfidence ?? row.field_confidence) as Record<
      string,
      number
    > | null,
    extractedFieldsJson: row.extractedFieldsJson ?? row.extracted_fields_json,
    warnings: normalizeStringOrObjectArray(row.warnings ?? row.warningsJson ?? row.warnings_json),
    warningsJson: row.warningsJson ?? row.warnings_json,
    ocrText: nullableString(row.ocrText ?? row.ocr_text),
    ocrTextPreview: nullableString(row.ocrTextPreview ?? row.ocr_text_preview),
    uxStatus: asRecord(row.uxStatus ?? row.ux_status),
    createdAt: nullableString(row.createdAt ?? row.created_at) ?? undefined,
    updatedAt: nullableString(row.updatedAt ?? row.updated_at) ?? undefined,
  } as EvidenceCard;
}

function normalizeReadableSummary(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;

  return {
    ...record,
    eventName: nullableString(record.eventName ?? record.event_name ?? record.certificateName),
    organizer: nullableString(record.organizer ?? record.organizerName ?? record.organizer_name),
    activityTime: nullableString(record.activityTime ?? record.activity_time ?? record.time),
    convertedValue: nullableString(record.convertedValue ?? record.converted_value),
    convertedUnit: nullableString(record.convertedUnit ?? record.converted_unit),
    issueDate: nullableString(record.issueDate ?? record.issue_date),
    studentName: nullableString(record.studentName ?? record.student_name ?? record.fullName),
    studentCode: nullableString(record.studentCode ?? record.student_code),
  };
}

function normalizeMatchingStatus(value: unknown) {
  const record = asRecord(value);
  if (!record && typeof value !== "string") return null;

  return {
    ...(record ?? {}),
    code: nullableString(record?.code ?? record?.status ?? value),
    label: nullableString(record?.label),
    message: nullableString(record?.message),
    matchedEventName: nullableString(
      record?.matchedEventName ??
        record?.matched_event_name ??
        record?.eventName ??
        record?.event_name,
    ),
  };
}

function normalizeStudentStatus(value: unknown): EvidenceStudentStatus | null {
  const record = asRecord(value);
  const code = nullableString(record?.code ?? record?.status ?? value);
  if (!code) return null;

  return {
    ...(record ?? {}),
    code: code as EvidenceStudentStatusCode,
    label: nullableString(record?.label),
    message: nullableString(record?.message),
    nextAction: nullableString(
      record?.nextAction ?? record?.next_action,
    ) as EvidenceStudentStatus["nextAction"],
    severity: nullableString(record?.severity) as EvidenceStudentStatus["severity"],
    source: nullableString(record?.source) as EvidenceStudentStatus["source"],
  };
}

function normalizeStringOrObjectArray(
  value: unknown,
): string[] | Array<{ label?: string; message?: string; field?: string }> {
  if (!value) return [];
  if (!Array.isArray(value)) {
    if (typeof value === "string") return [value];
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      const record = asRecord(item);
      if (!record) return "";
      return {
        label: nullableString(record.label) ?? undefined,
        message: nullableString(record.message) ?? undefined,
        field: nullableString(record.field ?? record.code ?? record.key) ?? undefined,
      };
    })
    .filter(Boolean) as string[] | Array<{ label?: string; message?: string; field?: string }>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

function nullableNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function enumString(value: unknown, fallback: string) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = asRecord(value);
  if (!record) return fallback;
  return (
    nullableString(record.status) ??
    nullableString(record.value) ??
    nullableString(record.key) ??
    nullableString(record.code) ??
    nullableString(record.step) ??
    fallback
  );
}

export const evidenceApi = {
  getEvidences: async (
    applicationId: string,
    filters?: {
      criterion?: Criterion;
      status?: EvidenceStatus;
      indexingStatus?: IndexingStatus;
      page?: number;
      limit?: number;
    },
  ) => {
    const query = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          query.append(key, String(value));
        }
      });
    }
    const qString = query.toString();
    const res = await apiClient<EvidenceListPayload>(
      `/api/applications/${applicationId}/evidences${qString ? `?${qString}` : ""}`,
      { method: "GET" },
    );
    return { ...res, data: normalizeEvidences(res.data) };
  },

  createEvidence: async (
    applicationId: string,
    input: {
      evidenceName: string;
      criterion: Criterion;
      sourceType: EvidenceSourceType;
      description?: string;
      note?: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    const res = await apiClient<EvidencePayload>(`/api/applications/${applicationId}/evidences`, {
      method: "POST",
      body: input,
    });
    return { ...res, data: normalizeEvidence(res.data) };
  },

  updateEvidence: async (
    evidenceId: string,
    input: {
      evidenceName?: string;
      criterion?: Criterion;
      description?: string;
      note?: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    const res = await apiClient<EvidencePayload>(`/api/evidences/${evidenceId}`, {
      method: "PATCH",
      body: input,
    });
    return { ...res, data: normalizeEvidence(res.data) };
  },

  deleteEvidence: async (evidenceId: string) => {
    return apiClient<null>(`/api/evidences/${evidenceId}`, {
      method: "DELETE",
    });
  },

  getEvidence: async (evidenceId: string) => {
    const res = await apiClient<EvidencePayload>(`/api/evidences/${evidenceId}`, {
      method: "GET",
    });
    return { ...res, data: normalizeEvidence(res.data) as EvidenceDetail };
  },

  uploadEvidenceFile: async (evidenceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient<EvidencePayload>(`/api/evidences/${evidenceId}/files`, {
      method: "POST",
      body: formData,
    });
    return { ...res, data: normalizeEvidence(res.data) };
  },

  // Alias for compatibility
  uploadFile: async (evidenceId: string, file: File) => {
    return evidenceApi.uploadEvidenceFile(evidenceId, file);
  },

  startIndexing: async (
    evidenceId: string,
    options?: { force?: boolean; runMode?: "sync" | "async" },
  ) => {
    const res = await apiClient<EvidencePayload>(`/api/evidences/${evidenceId}/start-indexing`, {
      method: "POST",
      body: options || {},
    });
    return { ...res, data: normalizeEvidence(res.data) };
  },

  getEvidenceCard: async (evidenceId: string) => {
    const res = await apiClient<unknown>(`/api/evidences/${evidenceId}/card`, {
      method: "GET",
    });
    const wrapper = asRecord(res.data);
    const normalizedCard = normalizeEvidenceCard(wrapper?.card ?? res.data);
    const normalizedEvidence = wrapper?.evidence ? normalizeEvidence(wrapper.evidence) : null;
    return {
      ...res,
      data: normalizedCard
        ? {
            ...normalizedCard,
            evidence: normalizedEvidence ?? undefined,
            auditSummary: wrapper?.auditSummary ?? wrapper?.audit_summary,
          }
        : null,
    };
  },

  getEvidenceAudit: async (evidenceId: string) => {
    return apiClient<EvidenceAudit>(`/api/evidences/${evidenceId}/audit`, {
      method: "GET",
    });
  },

  getSignedFileUrl: async (fileId: string) => {
    return apiClient<{ url: string }>(`/api/files/${fileId}/signed-url`, {
      method: "GET",
    });
  },

  // Alias for compatibility
  getCard: async (evidenceId: string) => {
    return evidenceApi.getEvidenceCard(evidenceId);
  },
};
