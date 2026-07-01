import { apiClient } from "@/lib/api/client";
import type { LoginData, SafeUser } from "@/lib/api/types";

export const authApi = {
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
  }
};
