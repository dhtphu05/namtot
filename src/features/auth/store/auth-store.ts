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

const authStorageKey = "5tot-auth";

type PersistedAuthState = Pick<AuthState, "user" | "accessToken" | "refreshToken">;

function writeAuthStorage(state: PersistedAuthState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(authStorageKey, JSON.stringify({ state, version: 0 }));
}

function clearAuthStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(authStorageKey);
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuthData: (user, accessToken, refreshToken) => {
        const next = { user, accessToken, refreshToken };
        writeAuthStorage(next);
        set(next);
      },
        
      setTokens: (accessToken, refreshToken) =>
        set((state) => {
          writeAuthStorage({ user: state.user, accessToken, refreshToken });
          return { accessToken, refreshToken };
        }),

      setUser: (user) =>
        set((state) => {
          writeAuthStorage({ user, accessToken: state.accessToken, refreshToken: state.refreshToken });
          return { user };
        }),

      clearAuth: () => {
        clearAuthStorage();
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: authStorageKey,
    }
  )
);
