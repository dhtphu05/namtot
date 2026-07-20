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
  IndexingStatus,
} from "@/lib/api/types";

type BackendCurrentCollective = {
  profile: CollectiveState | null;
  state: CurrentCollectiveResponse["state"] | "not_started";
  schoolYear: string;
  className?: string;
};

type CollectiveEvidenceResponse = EvidenceResponse & {
  collectiveCriterion?: string;
  evidence?: EvidenceResponse;
};

function normalizeCurrentCollective(
  data: BackendCurrentCollective | CurrentCollectiveResponse | CurrentCollectiveEmpty,
): CurrentCollectiveResponse | CurrentCollectiveEmpty {
  if ("collective" in data) return data;
  if (!data.profile) {
    return { collective: null, state: "not_started", schoolYear: data.schoolYear };
  }
  return { collective: data.profile, state: data.profile.status };
}

function normalizeCollectiveEvidence(item: CollectiveEvidenceResponse): CollectiveEvidenceResponse {
  if (item.evidence) {
    return {
      ...item.evidence,
      collectiveCriterion: item.collectiveCriterion,
    } as CollectiveEvidenceResponse;
  }
  return item;
}

export const collectiveApi = {
  // Profile
  getCurrent: async (schoolYear?: string, className?: string) => {
    const query = new URLSearchParams();
    if (schoolYear) query.append("schoolYear", schoolYear);
    if (className) query.append("className", className);
    const qString = query.toString();
    const res = await apiClient<
      BackendCurrentCollective | CurrentCollectiveResponse | CurrentCollectiveEmpty
    >(`/api/collective/current${qString ? `?${qString}` : ""}`, { method: "GET" });
    return { ...res, data: normalizeCurrentCollective(res.data) };
  },

  start: async (data: { schoolYear?: string; className?: string; targetLevel?: Level }) => {
    const res = await apiClient<CollectiveState>("/api/collective/current/start", {
      method: "POST",
      body: data,
    });
    return {
      ...res,
      data: { collective: res.data, state: res.data.status } satisfies CurrentCollectiveResponse,
    };
  },

  getById: async (id: string) => {
    return apiClient<CollectiveState>(`/api/collective/${id}`, {
      method: "GET",
    });
  },

  update: async (id: string, data: { targetLevel?: Level; className?: string; note?: string }) => {
    return apiClient(`/api/collective/${id}`, {
      method: "PATCH",
      body: data,
    });
  },

  // Members
  getMembers: async (id: string, query?: Record<string, string | number>) => {
    const q = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([k, v]) => q.append(k, String(v)));
    }
    const qString = q.toString();
    return apiClient<CollectiveMember[]>(
      `/api/collective/${id}/members${qString ? `?${qString}` : ""}`,
      {
        method: "GET",
      },
    );
  },

  upsertMember: async (id: string, data: CollectiveMemberInput) => {
    return apiClient<CollectiveMember>(`/api/collective/${id}/members`, {
      method: "POST",
      body: data,
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
      body: data,
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
    const res = await apiClient<CollectiveEvidenceResponse[]>(
      `/api/collective/${id}/evidences${qString ? `?${qString}` : ""}`,
      {
        method: "GET",
      },
    );
    return { ...res, data: res.data.map(normalizeCollectiveEvidence) };
  },

  createEvidence: async (
    id: string,
    data: { evidenceName: string; collectiveCriterion?: string; sourceType?: EvidenceSourceType },
  ) => {
    const res = await apiClient<CollectiveEvidenceResponse>(`/api/collective/${id}/evidences`, {
      method: "POST",
      body: { ...data, criterion: "collective" },
    });
    return { ...res, data: normalizeCollectiveEvidence(res.data) };
  },

  uploadFile: async (evidenceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<{ fileId: string; fileName: string; size: number }>(
      `/api/collective/evidences/${evidenceId}/files`,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  startIndexing: async (
    evidenceId: string,
    options?: { force?: boolean; runMode?: "sync" | "async" },
  ) => {
    return apiClient<{ jobId: string; status: IndexingStatus }>(
      `/api/collective/evidences/${evidenceId}/start-indexing`,
      {
        method: "POST",
        body: options || {},
      },
    );
  },

  importEvent: async (id: string, data: { eventId: string; collectiveCriterion?: string }) => {
    const res = await apiClient<CollectiveEvidenceResponse>(`/api/collective/${id}/import-event`, {
      method: "POST",
      body: data,
    });
    return { ...res, data: normalizeCollectiveEvidence(res.data) };
  },

  // Precheck and Submit
  precheck: async (id: string, options?: { level?: Level }) => {
    return apiClient<CollectivePrecheckView>(`/api/collective/${id}/precheck`, {
      method: "POST",
      body: options || {},
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
      body: options,
    });
  },
};
