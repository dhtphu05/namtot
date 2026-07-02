import { apiClient } from "@/lib/api/client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  applicationId?: string | null;
  evidenceId?: string | null;
  reviewTaskId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// Backward compatibility
export interface NotificationResponse extends Notification {
  read: boolean;
  desc?: string;
}

type NotificationListPayload =
  | Notification[]
  | {
      items?: Notification[];
      data?: Notification[];
      notifications?: Notification[];
    };

function normalizeNotifications(payload: NotificationListPayload | null): Notification[] {
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? payload?.data ?? payload?.notifications ?? [];
}

export const notificationsApi = {
  getNotifications: async (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value));
        }
      });
    }
    const qString = query.toString();
    const res = await apiClient<NotificationListPayload>(`/api/notifications${qString ? `?${qString}` : ""}`, {
      method: "GET",
    });
    return { ...res, data: normalizeNotifications(res.data) };
  },

  markNotificationRead: async (notificationId: string) => {
    return apiClient<null>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
  },

  // Alias for compatibility
  markAsRead: async (id: string) => {
    return notificationsApi.markNotificationRead(id);
  },
};
