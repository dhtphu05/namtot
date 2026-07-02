import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evidenceApi } from "@/features/evidence/api/evidence";
import type { Criterion, EvidenceSourceType, EvidenceStatus, IndexingStatus } from "@/lib/api/types";
import { toast } from "sonner";

export const evidenceKeys = {
  all: ["evidences"] as const,
  list: (appId: string) => ["evidences", appId] as const,
  detail: (id: string) => ["evidence", id, "card"] as const,
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

export function useCreateEvidence(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId: mutationAppId,
      data,
    }: {
      applicationId?: string;
      data: {
        evidenceName: string;
        criterion: Criterion;
        sourceType: EvidenceSourceType;
        description?: string;
        note?: string;
        metadata?: Record<string, unknown>;
      };
    }) => {
      const activeAppId = mutationAppId || applicationId;
      if (!activeAppId) throw new Error("Missing applicationId");
      const res = await evidenceApi.createEvidence(activeAppId, data);
      return res.data;
    },
    onSuccess: (data, variables) => {
      const activeAppId = variables.applicationId || applicationId;
      if (activeAppId) {
        queryClient.invalidateQueries({ queryKey: ["evidences", activeAppId] });
      }
    },
    onError: (err: Error) => {
      toast.error(`Không thể tạo minh chứng: ${err.message}`);
    },
  });
}

export function useUpdateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evidenceId,
      applicationId,
      data,
    }: {
      evidenceId: string;
      applicationId: string;
      data: {
        evidenceName?: string;
        criterion?: Criterion;
        description?: string;
        note?: string;
        metadata?: Record<string, unknown>;
      };
    }) => {
      const res = await evidenceApi.updateEvidence(evidenceId, data);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["evidences", variables.applicationId] });
      toast.success("Đã cập nhật minh chứng");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi khi cập nhật minh chứng: ${err.message}`);
    },
  });
}

export function useDeleteEvidence(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, applicationId: mutationAppId }: { id: string; applicationId?: string }) => {
      await evidenceApi.deleteEvidence(id);
      return { id, applicationId: mutationAppId || applicationId };
    },
    onSuccess: (data) => {
      if (data.applicationId) {
        queryClient.invalidateQueries({ queryKey: ["evidences", data.applicationId] });
      }
      toast.success("Đã xoá minh chứng");
    },
    onError: (err: Error) => {
      toast.error(`Không thể xoá minh chứng: ${err.message}`);
    },
  });
}

export function useUploadEvidenceFile(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evidenceId,
      applicationId: mutationAppId,
      file,
    }: {
      evidenceId: string;
      applicationId?: string;
      file: File;
    }) => {
      const activeAppId = mutationAppId || applicationId;
      const res = await evidenceApi.uploadEvidenceFile(evidenceId, file);
      return { evidenceId, applicationId: activeAppId, res: res.data };
    },
    onSuccess: (data) => {
      if (data.applicationId) {
        queryClient.invalidateQueries({ queryKey: ["evidences", data.applicationId] });
        queryClient.invalidateQueries({ queryKey: ["application", "current"] });
      }
      toast.success("Đã tải lên tệp tin minh chứng thành công");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi tải tệp tin: ${err.message}`);
    },
  });
}

// Compatibility wrapper for upload without polling or jobId expectation
export function useUploadAndIndex() {
  return useUploadEvidenceFile();
}
