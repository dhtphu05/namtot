import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "../api/review";
import { toast } from "sonner";

export const reviewKeys = {
  all: ["reviews"] as const,
  tasks: (filters: Record<string, any>) => [...reviewKeys.all, "tasks", filters] as const,
  detail: (id: string) => [...reviewKeys.all, "detail", id] as const,
};

export function useReviewTasks(filters?: { criterion?: string; status?: string; officerId?: string }) {
  return useQuery({
    queryKey: reviewKeys.tasks(filters || {}),
    queryFn: async () => {
      const res = await reviewApi.getReviewTasks(filters);
      if (!res.success) throw new Error("Failed to fetch review tasks");
      return res.data;
    },
  });
}

export function useReviewTaskDetail(studentId: string) {
  return useQuery({
    queryKey: reviewKeys.detail(studentId),
    queryFn: async () => {
      const res = await reviewApi.getReviewTaskDetail(studentId);
      if (!res.success) throw new Error("Failed to fetch review task detail");
      return res.data;
    },
    enabled: !!studentId,
  });
}

export function useSubmitDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ studentId, payload }: { studentId: string; payload: { decision: "accepted" | "rejected" | "supplement_required" | "resolution_needed"; reason?: string } }) => {
      const res = await reviewApi.submitDecision(studentId, payload);
      if (!res.success) throw new Error("Failed to submit decision");
      return res.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the detail query
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.studentId) });
      // Invalidate all task lists
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Đã cập nhật quyết định xét duyệt");
    },
    onError: (err: any) => {
      toast.error(err.message || "Có lỗi xảy ra khi ra quyết định");
    }
  });
}
