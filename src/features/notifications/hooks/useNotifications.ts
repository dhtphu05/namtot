import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type Notification } from "@/features/notifications/api/notifications";

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
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueriesData<Notification[]>({
        queryKey: notificationKeys.all,
      });
      const readAt = new Date().toISOString();

      queryClient.setQueriesData<Notification[]>({ queryKey: notificationKeys.all }, (current) =>
        current?.map((item) => (item.id === notificationId ? { ...item, readAt } : item)),
      );

      return { previous };
    },
    onError: (_error, _notificationId, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
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
