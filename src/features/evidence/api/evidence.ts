import { apiClient } from "@/lib/api/client";
import type { Criterion, EvidenceSourceType, EvidenceStatus, IndexingStatus, Evidence } from "@/lib/api/types";

export interface EvidenceResponse extends Evidence {
  fileId?: string;
  jobId?: string;
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
    return apiClient<EvidenceResponse[]>(
      `/api/applications/${applicationId}/evidences${qString ? `?${qString}` : ""}`,
      { method: "GET" }
    );
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
    return apiClient<EvidenceResponse>(`/api/applications/${applicationId}/evidences`, {
      method: "POST",
      body: input,
    });
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
    return apiClient<EvidenceResponse>(`/api/evidences/${evidenceId}`, {
      method: "PATCH",
      body: input,
    });
  },

  deleteEvidence: async (evidenceId: string) => {
    return apiClient<null>(`/api/evidences/${evidenceId}`, {
      method: "DELETE",
    });
  },

  uploadEvidenceFile: async (evidenceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{ fileId: string; fileName: string; size: number }>(
      `/api/evidences/${evidenceId}/files`,
      {
        method: "POST",
        body: formData,
      }
    );
  },

  // Alias for compatibility
  uploadFile: async (evidenceId: string, file: File) => {
    return evidenceApi.uploadEvidenceFile(evidenceId, file);
  },

  startIndexing: async (evidenceId: string, options?: { force?: boolean; runMode?: "sync" | "async" }) => {
    return apiClient<{ jobId: string; status: IndexingStatus }>(
      `/api/evidences/${evidenceId}/start-indexing`,
      {
        method: "POST",
        body: options || {},
      }
    );
  },

  getEvidenceCard: async (evidenceId: string) => {
    return apiClient<unknown>(`/api/evidences/${evidenceId}/card`, {
      method: "GET",
    });
  },

  // Alias for compatibility
  getCard: async (evidenceId: string) => {
    return evidenceApi.getEvidenceCard(evidenceId);
  },
};
