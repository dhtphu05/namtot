import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { eventsApi, type EventFilters } from "@/features/event/api/events";
import { evidenceKeys } from "@/features/evidence/hooks/useEvidence";

export const eventKeys = {
  all: ["events"] as const,
  list: (filters?: EventFilters) => [...eventKeys.all, "list", filters] as const,
  participants: (eventId?: string, params?: { page?: number; limit?: number; q?: string }) =>
    [...eventKeys.all, "participants", eventId ?? "", params ?? {}] as const,
};

export function useEvents(filters?: EventFilters) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: async () => {
      const res = await eventsApi.listEvents(filters);
      return res.data;
    },
  });
}

export function useEventParticipants(
  eventId?: string,
  params?: { page?: number; limit?: number; q?: string },
) {
  return useQuery({
    queryKey: eventKeys.participants(eventId, params),
    queryFn: async () => {
      if (!eventId) return [];
      const res = await eventsApi.getParticipants(eventId, params);
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useCheckEventParticipant() {
  return useMutation({
    mutationFn: async ({ eventId, applicationId }: { eventId: string; applicationId: string }) => {
      const res = await eventsApi.checkParticipant(eventId, applicationId);
      return res.data;
    },
    onError: (err: Error) => {
      toast.error(`Không thể kiểm tra sự kiện: ${err.message}`);
    },
  });
}

export function useImportEventToApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, applicationId }: { eventId: string; applicationId: string }) => {
      const res = await eventsApi.importToApplication(eventId, applicationId);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: evidenceKeys.list(variables.applicationId) });
      toast.success("Đã import minh chứng vào hồ sơ");
    },
    onError: (err: Error) => {
      toast.error(`Không thể import sự kiện: ${err.message}`);
    },
  });
}
