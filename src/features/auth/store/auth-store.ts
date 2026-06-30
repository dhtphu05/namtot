import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SafeUser } from "@/lib/api/types";

interface AuthState {
  user: SafeUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  setAuthData: (
    user: SafeUser,
    accessToken: string,
    refreshToken: string
  ) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: SafeUser) => void;
  clearAuth: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuthData: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
        
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: "5tot-auth",
    }
  )
);
