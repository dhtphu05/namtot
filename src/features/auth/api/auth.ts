import { apiClient } from "@/lib/api/client";
import type { LoginData, SafeUser, WorkspaceSummary } from "@/lib/api/types";

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  workspaceId: string;
  studentCode: string;
  className?: string;
  faculty?: string;
  phone?: string;
};

export const authApi = {
  register: async (data: RegisterPayload) => {
    return apiClient<LoginData>("/api/auth/register", {
      method: "POST",
      body: data,
    });
  },

  getRegistrationWorkspaces: async () => {
    return apiClient<WorkspaceSummary[]>("/api/workspaces?registration=true", {
      method: "GET",
    });
  },

  login: async (email: string, password: string) => {
    return apiClient<LoginData>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
  },

  refresh: async (refreshToken: string) => {
    return apiClient<{ accessToken: string; refreshToken: string }>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },

  logout: async (refreshToken?: string) => {
    return apiClient<null>("/api/auth/logout", {
      method: "POST",
      body: { refreshToken },
    });
  },

  getMe: async () => {
    return apiClient<SafeUser>("/api/me", {
      method: "GET",
    });
  },

  updateMe: async (data: { fullName?: string; phone?: string; avatarUrl?: string }) => {
    return apiClient<SafeUser>("/api/me", {
      method: "PATCH",
      body: data,
    });
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient<SafeUser>("/api/me/avatar", {
      method: "POST",
      body: formData,
    });
  },
};
