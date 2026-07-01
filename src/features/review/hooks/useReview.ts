import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewApi, type ReviewTaskFilters } from "../api/review";

export const reviewKeys = {
  all: ["reviews"] as const,
  tasks: (filters: ReviewTaskFilters) => [...reviewKeys.all, "tasks", filters] as const,
  detail: (id: string) => [...reviewKeys.all, "detail", id] as const,
};

export function useReviewTasks(filters: ReviewTaskFilters = {}) {
  return useQuery({
    queryKey: reviewKeys.tasks(filters),
    queryFn: () => reviewApi.getReviewTasks(filters),
  });
}

export function useReviewTaskDetail(id: string) {
  return useQuery({
    queryKey: reviewKeys.detail(id),
    queryFn: () => reviewApi.getReviewTaskDetail(id),
    enabled: Boolean(id),
  });
}

export function useSubmitDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof reviewApi.submitDecision>[1] }) =>
      reviewApi.submitDecision(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Đã cập nhật quyết định xét duyệt");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Có lỗi xảy ra khi ra quyết định");
    },
  });
}

export function useRequestSupplement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof reviewApi.requestSupplement>[1] }) =>
      reviewApi.requestSupplement(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Đã gửi yêu cầu bổ sung minh chứng");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Có lỗi xảy ra khi gửi yêu cầu bổ sung");
    },
  });
}

export function useEscalateResolution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof reviewApi.escalateResolution>[1] }) =>
      reviewApi.escalateResolution(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      toast.success("Đã chuyển hồ sơ sang Resolution Hub");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Có lỗi xảy ra khi chuyển hồ sơ");
    },
  });
}
