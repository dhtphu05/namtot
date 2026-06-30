import { apiClient } from "@/lib/api/client";
import type { 
  Level, 
  CurrentCollectiveEmpty, 
  CurrentCollectiveResponse, 
  CollectiveMember, 
  CollectiveMemberInput, 
  RosterImportResult,
  CollectivePrecheckView,
  EvidenceResponse,
  EvidenceSourceType,
  IndexingStatus
} from "./types";

export const collectiveApi = {
  // Profile
  getCurrent: async (schoolYear?: string, className?: string) => {
    const query = new URLSearchParams();
    if (schoolYear) query.append("schoolYear", schoolYear);
    if (className) query.append("className", className);
    const qString = query.toString();
    return apiClient<CurrentCollectiveResponse | CurrentCollectiveEmpty>(
      `/api/collective/current${qString ? `?${qString}` : ""}`,
      { method: "GET" }
    );
  },

  start: async (data: { schoolYear?: string; className?: string; targetLevel?: Level }) => {
    return apiClient<CurrentCollectiveResponse>("/api/collective/current/start", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getById: async (id: string) => {
    return apiClient<CurrentCollectiveResponse>(`/api/collective/${id}`, {
      method: "GET",
    });
  },

  update: async (id: string, data: { targetLevel?: Level; className?: string; note?: string }) => {
    return apiClient(`/api/collective/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Members
  getMembers: async (id: string, query?: Record<string, string | number>) => {
    const q = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => q.append(k, String(v)));
    }
    const qString = q.toString();
    return apiClient<CollectiveMember[]>(`/api/collective/${id}/members${qString ? `?${qString}` : ""}`, {
      method: "GET",
    });
  },

  upsertMember: async (id: string, data: CollectiveMemberInput) => {
    return apiClient<CollectiveMember>(`/api/collective/${id}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  importMembers: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<RosterImportResult>(`/api/collective/${id}/members/import`, {
      method: "POST",
      body: formData,
    });
  },

  updateMember: async (id: string, memberId: string, data: Partial<CollectiveMemberInput>) => {
    return apiClient<CollectiveMember>(`/api/collective/${id}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteMember: async (id: string, memberId: string) => {
    return apiClient<null>(`/api/collective/${id}/members/${memberId}`, {
      method: "DELETE",
    });
  },

  // Evidences
  getEvidences: async (id: string, query?: Record<string, string | number>) => {
    const q = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => q.append(k, String(v)));
    }
    const qString = q.toString();
    return apiClient<EvidenceResponse[]>(`/api/collective/${id}/evidences${qString ? `?${qString}` : ""}`, {
      method: "GET",
    });
  },

  createEvidence: async (id: string, data: { evidenceName: string; collectiveCriterion?: string; sourceType?: EvidenceSourceType }) => {
    return apiClient<EvidenceResponse>(`/api/collective/${id}/evidences`, {
      method: "POST",
      body: JSON.stringify({ ...data, criterion: "collective" }),
    });
  },

  uploadFile: async (evidenceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{ fileId: string; fileName: string; size: number }>(`/api/collective/evidences/${evidenceId}/files`, {
      method: "POST",
      body: formData,
    });
  },

  startIndexing: async (evidenceId: string, options?: { force?: boolean; runMode?: "sync" | "async" }) => {
    return apiClient<{ jobId: string; status: IndexingStatus }>(`/api/collective/evidences/${evidenceId}/start-indexing`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  importEvent: async (id: string, data: { eventId: string; collectiveCriterion?: string }) => {
    return apiClient<EvidenceResponse>(`/api/collective/${id}/import-event`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Precheck and Submit
  precheck: async (id: string, options?: { level?: Level }) => {
    return apiClient<CollectivePrecheckView>(`/api/collective/${id}/precheck`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
  },

  getLatestPrecheck: async (id: string) => {
    return apiClient<CollectivePrecheckView>(`/api/collective/${id}/precheck/latest`, {
      method: "GET",
    });
  },

  submit: async (id: string, options: { allowSubmitWithWarnings?: boolean; note?: string }) => {
    return apiClient(`/api/collective/${id}/submit`, {
      method: "POST",
      body: JSON.stringify(options),
    });
  },
};
