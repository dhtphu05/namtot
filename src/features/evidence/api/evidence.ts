import { apiClient } from "@/lib/api/client";
import type {
  Criterion,
  EvidenceSourceType,
  EvidenceStatus,
  IndexingStatus,
  Evidence,
} from "@/lib/api/types";
import type { EvidenceAudit, EvidenceCard, EvidenceDetail } from "@/types/evidence";

export interface EvidenceResponse extends Evidence {
  fileId?: string;
  jobId?: string;
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

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

function normalizeEvidences(payload: EvidenceListPayload | null): EvidenceResponse[] {
  const rows = Array.isArray(payload)
    ? payload
    : (payload?.items ?? payload?.data ?? payload?.evidences ?? []);
  return rows.map(normalizeEvidence).filter((item): item is EvidenceResponse => Boolean(item?.id));
}

function normalizeEvidence(payload: EvidencePayload): EvidenceResponse {
  if (!payload) return payload as EvidenceResponse;
  const wrapper = asRecord(payload);
  const row = asRecord(wrapper?.evidence) ?? wrapper ?? {};
  const file = asRecord(wrapper?.file);
  const fileId = nullableString(row.fileId ?? row.file_id ?? file?.id) ?? undefined;
  const fileName =
    nullableString(row.fileName ?? row.file_name ?? file?.fileName ?? file?.file_name ?? file?.originalName ?? file?.original_name) ??
    undefined;
  const fallbackFile = fileId
    ? [{
        id: fileId,
        fileName: fileName ?? "Tệp đính kèm",
        originalName: fileName,
        mimeType: nullableString(row.mimeType ?? row.mime_type ?? file?.mimeType ?? file?.mime_type) ?? undefined,
        fileSize: nullableNumber(row.fileSize ?? row.file_size ?? file?.size ?? file?.fileSize ?? file?.file_size) ?? undefined,
        size: nullableNumber(row.fileSize ?? row.file_size ?? file?.size ?? file?.fileSize ?? file?.file_size) ?? undefined,
        createdAt: nullableString(row.createdAt ?? row.created_at) ?? "",
        updatedAt: nullableString(row.updatedAt ?? row.updated_at) ?? "",
      }]
    : [];

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
    files: Array.isArray(row.files) && row.files.length > 0 ? row.files : fallbackFile,
    fileId,
    fileName,
    jobId:
      nullableString(row.jobId ?? row.job_id ?? wrapper?.jobId ?? wrapper?.job_id) ?? undefined,
    uxStatus: asRecord(row.uxStatus ?? row.ux_status),
    card: row.card,
    createdAt: nullableString(row.createdAt ?? row.created_at) ?? "",
    updatedAt: nullableString(row.updatedAt ?? row.updated_at) ?? "",
  } as EvidenceResponse;
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

function toJsonObject(value?: Record<string, unknown>): Record<string, JsonValue | undefined> | undefined {
  if (!value) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, toJsonValue(item)]),
  );
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue).filter((item): item is JsonValue => item !== undefined);
  }
  if (typeof value === "object") {
    return toJsonObject(value as Record<string, unknown>);
  }
  return String(value);
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
    const body: Record<string, JsonValue | undefined> = {
      evidenceName: input.evidenceName,
      criterion: input.criterion,
      sourceType: input.sourceType,
      description: input.description,
      note: input.note,
      metadata: toJsonObject(input.metadata),
    };
    const res = await apiClient<EvidencePayload>(`/api/applications/${applicationId}/evidences`, {
      method: "POST",
      body,
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
    const body: Record<string, JsonValue | undefined> = {
      evidenceName: input.evidenceName,
      criterion: input.criterion,
      description: input.description,
      note: input.note,
      metadata: toJsonObject(input.metadata),
    };
    const res = await apiClient<EvidencePayload>(`/api/evidences/${evidenceId}`, {
      method: "PATCH",
      body,
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
    return apiClient<EvidenceCard>(`/api/evidences/${evidenceId}/card`, {
      method: "GET",
    });
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
