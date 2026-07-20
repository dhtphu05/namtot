import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Pagination } from "@/lib/api/types";
import type {
  AdminWorkspaceDetail,
  AdminWorkspaceListFilters,
  AdminWorkspaceListItem,
  AdminWorkspaceListResponse,
  AdminWorkspaceUserListFilters,
  AdminWorkspaceUserListItem,
  AdminWorkspaceUserListResponse,
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  UpdateWorkspaceStatusPayload,
} from "@/features/admin-workspace/types";

type QueryFilters = AdminWorkspaceListFilters | AdminWorkspaceUserListFilters;

function buildQueryString(filters?: QueryFilters) {
  const query = new URLSearchParams();

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "all") {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function fallbackPagination(filters?: QueryFilters): Pagination {
  return {
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 20,
    total: 0,
    totalPages: 0,
  };
}

function withListEnvelope<TItem>(
  response: ApiResponse<TItem[]>,
  filters?: QueryFilters,
): ApiResponse<{ items: TItem[]; pagination: Pagination }> {
  const items = Array.isArray(response.data) ? response.data : [];

  return {
    ...response,
    data: {
      items,
      pagination: response.meta.pagination ?? fallbackPagination(filters),
    },
  };
}

export const adminWorkspaceApi = {
  list: async (
    filters?: AdminWorkspaceListFilters,
  ): Promise<ApiResponse<AdminWorkspaceListResponse>> => {
    const response = await apiClient<AdminWorkspaceListItem[]>(
      `/api/admin/workspaces${buildQueryString(filters)}`,
    );
    return withListEnvelope(response, filters) as ApiResponse<AdminWorkspaceListResponse>;
  },

  get: async (workspaceId: string): Promise<ApiResponse<AdminWorkspaceDetail>> => {
    return apiClient<AdminWorkspaceDetail>(`/api/admin/workspaces/${workspaceId}`);
  },

  create: async (payload: CreateWorkspacePayload): Promise<ApiResponse<AdminWorkspaceListItem>> => {
    return apiClient<AdminWorkspaceListItem>("/api/admin/workspaces", {
      method: "POST",
      body: payload,
    });
  },

  update: async (
    workspaceId: string,
    payload: UpdateWorkspacePayload,
  ): Promise<ApiResponse<AdminWorkspaceListItem>> => {
    return apiClient<AdminWorkspaceListItem>(`/api/admin/workspaces/${workspaceId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  updateStatus: async (
    workspaceId: string,
    payload: UpdateWorkspaceStatusPayload,
  ): Promise<
    ApiResponse<AdminWorkspaceListItem & { readiness?: AdminWorkspaceDetail["readiness"] }>
  > => {
    return apiClient<AdminWorkspaceListItem & { readiness?: AdminWorkspaceDetail["readiness"] }>(
      `/api/admin/workspaces/${workspaceId}/status`,
      {
        method: "PATCH",
        body: payload,
      },
    );
  },

  listUsers: async (
    workspaceId: string,
    filters?: AdminWorkspaceUserListFilters,
  ): Promise<ApiResponse<AdminWorkspaceUserListResponse>> => {
    const response = await apiClient<AdminWorkspaceUserListItem[]>(
      `/api/admin/workspaces/${workspaceId}/users${buildQueryString(filters)}`,
    );
    return withListEnvelope(response, filters) as ApiResponse<AdminWorkspaceUserListResponse>;
  },
};
