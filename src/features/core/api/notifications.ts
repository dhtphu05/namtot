import { apiClient } from "@/lib/api/client";
import type { Pagination } from "@/lib/api/types";

export interface NotificationItem {
  id: string;
  userId: string;
  applicationId: string | null;
  collectiveProfileId: string | null;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const notificationsApi = {
  list: async (filters: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    const res = await apiClient<NotificationItem[]>(`/api/notifications${query.size ? `?${query.toString()}` : ""}`);
    return { items: res.data, pagination: res.meta.pagination as Pagination | undefined };
  },

  markRead: async (id: string) => {
    const res = await apiClient<NotificationItem>(`/api/notifications/${id}/read`, { method: "PATCH" });
    return res.data;
  },
};
