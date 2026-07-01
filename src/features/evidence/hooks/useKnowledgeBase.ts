import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { knowledgeBaseApi, type KnowledgeBaseFilters } from "../api/knowledge-base";

export const knowledgeBaseKeys = {
  all: ["knowledge-base"] as const,
  search: (filters: KnowledgeBaseFilters) => [...knowledgeBaseKeys.all, "search", filters] as const,
};

export function useKnowledgeBaseSearch(filters: KnowledgeBaseFilters) {
  return useQuery({
    queryKey: knowledgeBaseKeys.search(filters),
    queryFn: () => knowledgeBaseApi.search(filters),
  });
}

export function useUseKnowledgeBaseItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => knowledgeBaseApi.useItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseKeys.all });
      toast.success("Đã dùng case làm tham chiếu");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể dùng case làm tham chiếu");
    },
  });
}
