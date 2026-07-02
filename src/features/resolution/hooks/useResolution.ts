import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resolutionApi } from "../api/resolution";
import type { ResolutionCasesParams, ResolveResolutionCaseRequest } from "../types";

export const resolutionKeys = {
  cases: ["resolutionCases"] as const,
  casesList: (params?: ResolutionCasesParams) => [...resolutionKeys.cases, params ?? {}] as const,
  caseDetail: (caseId: string) => ["resolutionCase", caseId] as const,
};

export function useResolutionCases(params?: ResolutionCasesParams) {
  return useQuery({
    queryKey: resolutionKeys.casesList(params),
    queryFn: async () => {
      const response = await resolutionApi.getResolutionCases(params);
      return response.data;
    },
  });
}

export function useResolutionCase(caseId?: string) {
  return useQuery({
    queryKey: resolutionKeys.caseDetail(caseId ?? ""),
    queryFn: async () => {
      const response = await resolutionApi.getResolutionCase(caseId ?? "");
      return response.data;
    },
    enabled: Boolean(caseId),
  });
}

export function useResolveResolutionCase(caseId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ResolveResolutionCaseRequest) => {
      if (!caseId) {
        throw new Error("Missing resolution case id");
      }

      return resolutionApi.resolveResolutionCase(caseId, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: resolutionKeys.cases }),
        caseId
          ? queryClient.invalidateQueries({ queryKey: resolutionKeys.caseDetail(caseId) })
          : Promise.resolve(),
      ]);
    },
  });
}
