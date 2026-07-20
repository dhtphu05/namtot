import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventApi, type GetEventsParams } from "@/features/event/api/event";
import { applicationKeys } from "@/features/application/hooks/useApplication";
import { evidenceKeys } from "@/features/evidence/hooks/useEvidence";
import { toast } from "sonner";

export const eventKeys = {
  all: ["events"] as const,
  list: (filters?: GetEventsParams) => [...eventKeys.all, "list", filters] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
};

export function useEvents(params?: GetEventsParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: async () => {
      const res = await eventApi.getEvents(params);
      return res.data;
    },
  });
}

export function useCheckParticipant() {
  return useMutation({
    mutationFn: async ({
      eventId,
      studentCode,
      applicationId,
    }: {
      eventId: string;
      studentCode?: string;
      applicationId?: string;
    }) => {
      const res = await eventApi.checkEventParticipant(eventId, { studentCode, applicationId });
      return res.data;
    },
  });
}

export function useImportToApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, applicationId }: { eventId: string; applicationId: string }) => {
      const res = await eventApi.importEventToApplication(eventId, applicationId);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["evidences", variables.applicationId] });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.criteriaCompletion(variables.applicationId),
      });
      toast.success("Đã thêm sự kiện vào minh chứng");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi thêm sự kiện: ${err.message}`);
    },
  });
}
