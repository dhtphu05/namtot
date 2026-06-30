import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evidenceApi } from "@/features/evidence/api/evidence";
import type { Criterion, EvidenceSourceType, EvidenceStatus, IndexingStatus } from "@/lib/api/types";
import { toast } from "sonner";

export const evidenceKeys = {
  all: ["evidences"] as const,
  list: (appId: string) => [...evidenceKeys.all, "list", appId] as const,
  detail: (id: string) => [...evidenceKeys.all, "detail", id] as const,
};

export function useEvidences(
  applicationId: string | undefined,
  filters?: {
    criterion?: Criterion;
    status?: EvidenceStatus;
    indexingStatus?: IndexingStatus;
    page?: number;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: [...evidenceKeys.list(applicationId ?? ""), filters],
    queryFn: async () => {
      if (!applicationId) return null;
      const res = await evidenceApi.getEvidences(applicationId, filters);
      return res.data;
    },
    enabled: !!applicationId,
  });
}

export function useCreateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      data,
    }: {
      applicationId: string;
      data: { evidenceName: string; criterion: Criterion; sourceType?: EvidenceSourceType };
    }) => {
      const res = await evidenceApi.createEvidence(applicationId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: evidenceKeys.list(variables.applicationId) });
    },
    onError: (err: Error) => {
      toast.error(`Không thể tạo minh chứng: ${err.message}`);
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
      await evidenceApi.deleteEvidence(id);
      return { id, applicationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: evidenceKeys.list(data.applicationId) });
      toast.success("Đã xoá minh chứng");
    },
  });
}

export function useUploadAndIndex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evidenceId,
      applicationId,
      file,
    }: {
      evidenceId: string;
      applicationId: string;
      file: File;
    }) => {
      // 1. Upload file
      await evidenceApi.uploadFile(evidenceId, file);
      
      // 2. Start indexing async
      const indexRes = await evidenceApi.startIndexing(evidenceId, { runMode: "async" });
      
      return { evidenceId, applicationId, jobId: indexRes.data.jobId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: evidenceKeys.list(data.applicationId) });
      toast.success("Đã tải lên và bắt đầu trích xuất dữ liệu AI");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi tải file: ${err.message}`);
    },
  });
}
