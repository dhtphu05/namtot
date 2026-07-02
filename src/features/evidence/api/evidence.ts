import { apiClient } from "@/lib/api/client";
import type { Criterion, EvidenceSourceType, EvidenceStatus, IndexingStatus, Evidence } from "@/lib/api/types";

export interface EvidenceResponse extends Evidence {
  fileId?: string;
  jobId?: string;
}

type EvidenceListPayload =
  | EvidenceResponse[]
  | {
      items?: EvidenceResponse[];
      data?: EvidenceResponse[];
      evidences?: EvidenceResponse[];
    };

type EvidencePayload =
  | EvidenceResponse
  | {
      evidence?: EvidenceResponse;
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
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? payload?.data ?? payload?.evidences ?? [];
}

function normalizeEvidence(payload: EvidencePayload): EvidenceResponse {
  if (!payload) return payload as EvidenceResponse;
  if ("evidence" in payload && payload.evidence) {
    return {
      ...payload.evidence,
      fileId: payload.file?.id,
      fileName: payload.file?.fileName,
      jobId: payload.jobId ?? undefined,
    } as EvidenceResponse;
  }
  return payload as EvidenceResponse;
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
    }
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
      { method: "GET" }
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
    }
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
    }
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

  uploadEvidenceFile: async (evidenceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient<EvidencePayload>(
      `/api/evidences/${evidenceId}/files`,
      {
        method: "POST",
        body: formData,
      }
    );
    return { ...res, data: normalizeEvidence(res.data) };
  },

  // Alias for compatibility
  uploadFile: async (evidenceId: string, file: File) => {
    return evidenceApi.uploadEvidenceFile(evidenceId, file);
  },

  startIndexing: async (evidenceId: string, options?: { force?: boolean; runMode?: "sync" | "async" }) => {
    const res = await apiClient<EvidencePayload>(
      `/api/evidences/${evidenceId}/start-indexing`,
      {
        method: "POST",
        body: options || {},
      }
    );
    return { ...res, data: normalizeEvidence(res.data) };
  },

  getEvidenceCard: async (evidenceId: string) => {
    return apiClient<unknown>(`/api/evidences/${evidenceId}/card`, {
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
