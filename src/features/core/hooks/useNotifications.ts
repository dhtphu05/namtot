import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationsApi } from "../api/notifications";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (filters: { page?: number; limit?: number }) =>
    [...notificationKeys.all, "list", filters] as const,
};

export function useNotifications(filters: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: notificationKeys.list(filters),
    queryFn: () => notificationsApi.list(filters),
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể đánh dấu thông báo đã đọc");
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => notificationsApi.markRead(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      toast.success("Đã đánh dấu thông báo đã đọc");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể đánh dấu tất cả thông báo");
    },
  });
}
