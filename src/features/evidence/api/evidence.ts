import { apiClient } from "@/lib/api/client";
import type { Criterion, EvidenceSourceType, EvidenceStatus, IndexingStatus } from "@/lib/api/types";

export interface EvidenceResponse {
  id: string;
  applicationId: string;
  evidenceName: string;
  criterion: Criterion;
  sourceType: EvidenceSourceType;
  status: EvidenceStatus;
  indexingStatus: IndexingStatus;
  fileId?: string;
  jobId?: string;
  createdAt: string;
  updatedAt: string;
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
    data: { evidenceName: string; criterion: Criterion; sourceType?: EvidenceSourceType }
  ) => {
    return apiClient<EvidenceResponse>(`/api/applications/${applicationId}/evidences`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateEvidence: async (
    id: string,
    data: { evidenceName?: string; criterion?: Criterion }
  ) => {
    return apiClient<EvidenceResponse>(`/api/evidences/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteEvidence: async (id: string) => {
    return apiClient<null>(`/api/evidences/${id}`, {
      method: "DELETE",
    });
  },

  uploadFile: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{ fileId: string; fileName: string; size: number }>(
      `/api/evidences/${id}/files`,
      {
        method: "POST",
        body: formData,
        // Browser will set Content-Type with correct boundary automatically for FormData
      }
    );
  },

  startIndexing: async (id: string, options?: { force?: boolean; runMode?: "sync" | "async" }) => {
    return apiClient<{ jobId: string; status: IndexingStatus }>(
      `/api/evidences/${id}/start-indexing`,
      {
        method: "POST",
        body: JSON.stringify(options || {}),
      }
    );
  },

  getCard: async (id: string) => {
    return apiClient<unknown>(`/api/evidences/${id}/card`, {
      method: "GET",
    });
  },
};
