import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectiveApi } from "@/features/collective/api/collective";
import { collectiveKeys } from "@/features/collective/hooks/useCollective";
import type { EvidenceSourceType } from "@/lib/api/types";
import { toast } from "sonner";

export const collectiveEvidenceKeys = {
  all: ["collective-evidences"] as const,
  list: (id: string) => [...collectiveEvidenceKeys.all, "list", id] as const,
};

function invalidateCollectiveEvidences(queryClient: ReturnType<typeof useQueryClient>, collectiveId: string) {
  queryClient.invalidateQueries({ queryKey: collectiveEvidenceKeys.list(collectiveId) });
  queryClient.invalidateQueries({ queryKey: collectiveKeys.detail(collectiveId) });
  queryClient.invalidateQueries({ queryKey: collectiveKeys.all });
}

export function useCollectiveEvidences(collectiveId?: string, query?: Record<string, string | number>) {
  return useQuery({
    queryKey: [...collectiveEvidenceKeys.list(collectiveId ?? ""), query],
    queryFn: async () => {
      if (!collectiveId) return [];
      const res = await collectiveApi.getEvidences(collectiveId, query);
      return res.data;
    },
    enabled: !!collectiveId,
  });
}

export function useCreateCollectiveEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectiveId,
      data,
    }: {
      collectiveId: string;
      data: { evidenceName: string; collectiveCriterion?: string; sourceType?: EvidenceSourceType };
    }) => {
      const res = await collectiveApi.createEvidence(collectiveId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      invalidateCollectiveEvidences(queryClient, variables.collectiveId);
      toast.success("Đã tạo minh chứng tập thể.");
    },
    onError: (err: Error) => toast.error(`Lỗi tạo minh chứng tập thể: ${err.message}`),
  });
}

export function useUploadAndIndexCollective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evidenceId,
      collectiveId,
      file,
    }: {
      evidenceId: string;
      collectiveId: string;
      file: File;
    }) => {
      await collectiveApi.uploadFile(evidenceId, file);
      const indexRes = await collectiveApi.startIndexing(evidenceId, { runMode: "async" });
      return { evidenceId, collectiveId, jobId: indexRes.data.jobId };
    },
    onSuccess: (data) => {
      invalidateCollectiveEvidences(queryClient, data.collectiveId);
      toast.success("Đã tải lên minh chứng tập thể và bắt đầu xử lý AI.");
    },
    onError: (err: Error) => toast.error(`Lỗi tải file: ${err.message}`),
  });
}

export function useImportEventCollective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collectiveId, data }: { collectiveId: string; data: { eventId: string; collectiveCriterion?: string } }) => {
      const res = await collectiveApi.importEvent(collectiveId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      invalidateCollectiveEvidences(queryClient, variables.collectiveId);
      toast.success("Đã import sự kiện tập thể.");
    },
    onError: (err: Error) => toast.error(`Lỗi import sự kiện: ${err.message}`),
  });
}
