import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { resolutionApi, type ResolutionFilters } from "../api/resolution";

export const resolutionKeys = {
  all: ["resolution"] as const,
  cases: (filters: ResolutionFilters) => [...resolutionKeys.all, "cases", filters] as const,
  detail: (id: string) => [...resolutionKeys.all, "detail", id] as const,
};

export function useResolutionCases(filters: ResolutionFilters = {}) {
  return useQuery({
    queryKey: resolutionKeys.cases(filters),
    queryFn: () => resolutionApi.listCases(filters),
  });
}

export function useResolutionCase(id: string) {
  return useQuery({
    queryKey: resolutionKeys.detail(id),
    queryFn: () => resolutionApi.getCase(id),
    enabled: Boolean(id),
  });
}

export function useDecideResolutionCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof resolutionApi.decideCase>[1] }) =>
      resolutionApi.decideCase(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: resolutionKeys.all });
      queryClient.invalidateQueries({ queryKey: resolutionKeys.detail(variables.id) });
      toast.success("Đã lưu quyết định hội đồng");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể lưu quyết định hội đồng");
    },
  });
}

export function useReopenResolutionCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => resolutionApi.reopenCase(id, { reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: resolutionKeys.all });
      queryClient.invalidateQueries({ queryKey: resolutionKeys.detail(variables.id) });
      toast.success("Đã mở lại resolution case");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể mở lại resolution case");
    },
  });
}
