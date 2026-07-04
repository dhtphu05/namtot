import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (page = 1, limit = 20) => [...notificationKeys.all, "list", page, limit] as const,
};

export function useNotifications(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;

  return useQuery({
    queryKey: notificationKeys.list(page, limit),
    queryFn: async () => {
      const res = await notificationsApi.getNotifications({ page, limit });
      return res.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
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
