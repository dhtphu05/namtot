import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/auth";
import { toUiRole } from "@/features/auth/role-map";
import { useAuth } from "@/features/auth/store/auth-store";
import { useApp } from "@/lib/store";

export const authKeys = {
  me: ["me"] as const,
};

export const meQueryOptions = {
  queryKey: authKeys.me,
  queryFn: async () => {
    const me = await authApi.getMe();
    useAuth.getState().setUser(me.data);
    useApp.getState().setRole(toUiRole(me.data.role));
    return me.data;
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  retry: 0,
};

export function useMe() {
  const hasToken = useAuth((state) => Boolean(state.accessToken));

  return useQuery({
    ...meQueryOptions,
    enabled: hasToken,
  });
}
