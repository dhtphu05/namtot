import { useQuery } from "@tanstack/react-query";
import { criteriaApi, requireActiveCriteriaConfigs } from "@/features/core/api/criteria";

export const activeCriteriaConfigsQueryKey = ["criteria", "active-configs"] as const;

export function useActiveCriteriaConfigs() {
  return useQuery({
    queryKey: activeCriteriaConfigsQueryKey,
    queryFn: async () => requireActiveCriteriaConfigs(await criteriaApi.getActiveConfigs()),
    staleTime: 5 * 60_000,
  });
}
