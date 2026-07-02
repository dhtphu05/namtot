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

type NotificationListPayload =
  | NotificationItem[]
  | {
      items?: NotificationItem[];
      data?: NotificationItem[];
      notifications?: NotificationItem[];
      pagination?: Pagination;
    };

export const notificationsApi = {
  list: async (filters: { page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    const res = await apiClient<NotificationListPayload>(`/api/notifications${query.size ? `?${query.toString()}` : ""}`);
    const payload = res.data;
    const items = Array.isArray(payload)
      ? payload
      : payload?.items ?? payload?.data ?? payload?.notifications ?? [];
    const pagination = Array.isArray(payload)
      ? (res.meta.pagination as Pagination | undefined)
      : payload?.pagination ?? (res.meta.pagination as Pagination | undefined);
    return { items, pagination };
  },

  markRead: async (id: string) => {
    const res = await apiClient<NotificationItem>(`/api/notifications/${id}/read`, { method: "PATCH" });
    return res.data;
  },
};
