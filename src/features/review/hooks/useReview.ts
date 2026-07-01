import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "../api/review";
import { toast } from "sonner";

export const reviewKeys = {
  all: ["reviews"] as const,
  tasks: (filters: Record<string, any>) => [...reviewKeys.all, "tasks", filters] as const,
  detail: (id: string) => [...reviewKeys.all, "detail", id] as const,
};

export function useReviewTasks(filters?: { criterion?: string; status?: string; assignedToMe?: boolean }) {
  return useQuery({
    queryKey: reviewKeys.tasks(filters || {}),
    queryFn: async () => {
      const res = await reviewApi.getReviewTasks(filters);
      return res.data;
    },
  });
}

export function useReviewTaskDetail(id: string) {
  return useQuery({
    queryKey: reviewKeys.detail(id),
    queryFn: async () => {
      const res = await reviewApi.getReviewTaskDetail(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useSubmitDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Parameters<typeof reviewApi.submitDecision>[1] }) => {
      const res = await reviewApi.submitDecision(id, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Đã cập nhật quyết định xét duyệt");
    },
    onError: (err: any) => {
      toast.error(err.message || "Có lỗi xảy ra khi ra quyết định");
    }
  });
}

export function useRequestSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Parameters<typeof reviewApi.requestSupplement>[1] }) => {
      const res = await reviewApi.requestSupplement(id, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Đã gửi yêu cầu bổ sung minh chứng");
    },
    onError: (err: any) => {
      toast.error(err.message || "Có lỗi xảy ra khi gửi yêu cầu bổ sung");
    }
  });
}

export function useEscalateResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Parameters<typeof reviewApi.escalateResolution>[1] }) => {
      const res = await reviewApi.escalateResolution(id, payload);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Đã chuyển hồ sơ sang Resolution Hub");
    },
    onError: (err: any) => {
      toast.error(err.message || "Có lỗi xảy ra khi chuyển hồ sơ");
    }
  });
}
