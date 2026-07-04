import { apiClient } from "@/lib/api/client";
import type { Criterion, Level } from "@/lib/api/types";

export interface EventRegistryItem {
  id: string;
  eventName: string;
  criterion: Criterion;
  level?: Level | null;
  organizer?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  participantCount?: number | null;
  status?: string;
}

export interface CheckParticipantResult {
  matched: boolean;
  participant?: {
    studentCode?: string;
    fullName?: string;
    role?: string | null;
    hours?: number | null;
    days?: number | null;
  } | null;
  message?: string;
}

export interface GetEventsParams {
  search?: string;
  studentCode?: string;
  criterion?: string;
  page?: number;
  limit?: number;
}

type EventListPayload =
  | EventRegistryItem[]
  | {
      items?: EventRegistryItem[];
      data?: EventRegistryItem[];
      events?: EventRegistryItem[];
    };

function normalizeEvents(payload: EventListPayload | null): EventRegistryItem[] {
  if (Array.isArray(payload)) return payload;
  return payload?.items ?? payload?.data ?? payload?.events ?? [];
}

export const eventApi = {
  getEvents: async (params?: GetEventsParams) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, String(value));
        }
      });
    }
    const qString = query.toString();
    const res = await apiClient<EventListPayload>(`/api/events${qString ? `?${qString}` : ""}`, {
      method: "GET",
    });
    return { ...res, data: normalizeEvents(res.data) };
  },

  searchEvents: async (params?: GetEventsParams) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key === "search" ? "q" : key, String(value));
        }
      });
    }
    const qString = query.toString();
    const res = await apiClient<EventListPayload>(
      `/api/events/search${qString ? `?${qString}` : ""}`,
      {
        method: "GET",
      },
    );
    return { ...res, data: normalizeEvents(res.data) };
  },

  getParticipants: async (
    eventId: string,
    params?: { page?: number; limit?: number; q?: string },
  ) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, String(value));
        }
      });
    }
    const qString = query.toString();
    return apiClient<unknown[]>(
      `/api/events/${eventId}/participants${qString ? `?${qString}` : ""}`,
      {
        method: "GET",
      },
    );
  },

  getEvent: async (eventId: string) => {
    return apiClient<EventRegistryItem>(`/api/events/${eventId}`, {
      method: "GET",
    });
  },

  // Alias for compatibility
  getEventById: async (id: string) => {
    return eventApi.getEvent(id);
  },

  checkEventParticipant: async (
    eventId: string,
    input: { studentCode?: string; applicationId?: string },
  ) => {
    return apiClient<CheckParticipantResult>(`/api/events/${eventId}/check-participant`, {
      method: "POST",
      body: input,
    });
  },

  // Alias for compatibility
  checkParticipant: async (eventId: string, studentCode: string) => {
    return eventApi.checkEventParticipant(eventId, { studentCode });
  },

  importEventToApplication: async (eventId: string, applicationId: string) => {
    return apiClient<unknown>(`/api/events/${eventId}/import-to-application`, {
      method: "POST",
      body: { applicationId },
    });
  },

  importAsEvidence: async (
    eventId: string,
    input: { applicationId: string; participantId?: string },
  ) => {
    return apiClient<unknown>(`/api/events/${eventId}/import-as-evidence`, {
      method: "POST",
      body: input,
    });
  },

  // Alias for compatibility
  importToApplication: async (eventId: string, applicationId: string) => {
    return eventApi.importEventToApplication(eventId, applicationId);
  },
};
