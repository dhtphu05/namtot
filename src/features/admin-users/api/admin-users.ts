import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Pagination, Role, SafeUser } from "@/lib/api/types";

export type AdminUser = SafeUser & {
  officerSpecializations: Array<{
    criterion: string;
    facultyScope: string | null;
    isActive?: boolean;
  }>;
};

export type AdminUsersFilters = {
  q?: string;
  role?: Role | "all";
  workspaceId?: string | "all";
  isActive?: boolean | "all";
  page: number;
  limit: number;
};

export type AdminUsersPage = { items: AdminUser[]; pagination: Pagination };
export type AdminUserWriteInput = Record<string, string | null | undefined>;

function queryString(filters: AdminUsersFilters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "all" && value !== "") params.set(key, String(value));
  });
  return `?${params.toString()}`;
}

export const adminUsersApi = {
  async list(filters: AdminUsersFilters): Promise<AdminUsersPage> {
    const response = await apiClient<AdminUser[]>(`/api/admin/users${queryString(filters)}`);
    const items = Array.isArray(response.data) ? response.data : [];
    return {
      items,
      pagination: response.meta.pagination ?? {
        page: filters.page,
        limit: filters.limit,
        total: items.length,
        totalPages: 1,
      },
    };
  },
  get(userId: string) {
    return apiClient<AdminUser>(`/api/admin/users/${userId}`);
  },
  create(input: AdminUserWriteInput) {
    return apiClient<AdminUser>("/api/admin/users", { method: "POST", body: input });
  },
  update(userId: string, input: AdminUserWriteInput) {
    return apiClient<AdminUser>(`/api/admin/users/${userId}`, { method: "PATCH", body: input });
  },
  setActive(userId: string, isActive: boolean) {
    return apiClient<AdminUser>(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      body: { isActive },
    });
  },
  resetPassword(userId: string, newPassword: string) {
    return apiClient<{ userId: string }>(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: { newPassword },
    });
  },
  setSpecializations(userId: string, criteria: string[]) {
    return apiClient<AdminUser["officerSpecializations"]>(
      `/api/admin/users/${userId}/specializations`,
      {
        method: "PUT",
        body: { criteria },
      },
    );
  },
};

export type { ApiResponse };
