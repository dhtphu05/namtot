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

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuthData: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: authStorageKey,
      partialize: (state): PersistedAuthState => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

export function waitForAuthHydration() {
  if (typeof window === "undefined" || useAuth.persist.hasHydrated()) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = useAuth.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });

    if (useAuth.persist.hasHydrated()) {
      unsubscribe();
      resolve();
    }
  });
}
