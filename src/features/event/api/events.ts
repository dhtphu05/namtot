import { apiClient } from "@/lib/api/client";
import type {
  Criterion,
  EventParticipantCheck,
  EventRegistryItem,
  EventStatus,
  Level,
} from "@/lib/api/types";
import type { EvidenceResponse } from "@/features/evidence/api/evidence";

export interface EventFilters {
  q?: string;
  criterion?: Criterion;
  organizerLevel?: Level;
  level?: Level;
  status?: EventStatus;
  page?: number;
  limit?: number;
}

function toQuery(filters?: EventFilters) {
  const query = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        query.append(key, String(value));
      }
    });
  }
  const qString = query.toString();
  return qString ? `?${qString}` : "";
}

export const eventsApi = {
  listEvents: async (filters?: EventFilters) => {
    return apiClient<EventRegistryItem[]>(`/api/events${toQuery(filters)}`, {
      method: "GET",
    });
  },

  checkParticipant: async (eventId: string, applicationId: string) => {
    return apiClient<EventParticipantCheck>(`/api/events/${eventId}/check-participant`, {
      method: "POST",
      body: { applicationId },
    });
  },

  importToApplication: async (eventId: string, applicationId: string) => {
    return apiClient<{ evidence: EvidenceResponse; card: unknown }>(
      `/api/events/${eventId}/import-to-application`,
      {
        method: "POST",
        body: { applicationId },
      }
    );
  },
};
