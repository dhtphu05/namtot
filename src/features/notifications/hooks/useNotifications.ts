import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications";

export const notificationKeys = {
  all: ["notifications"] as const,
};

export function useNotifications(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...notificationKeys.all, params],
    queryFn: async () => {
      const res = await notificationsApi.getNotifications(params);
      return res.data || [];
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await notificationsApi.markNotificationRead(notificationId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Alias for compatibility
export function useMarkNotificationAsRead() {
  return useMarkNotificationRead();
}
