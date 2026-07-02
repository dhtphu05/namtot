import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evidenceApi } from "@/features/evidence/api/evidence";
import type { Criterion, EvidenceSourceType, EvidenceStatus, IndexingStatus } from "@/lib/api/types";
import { toast } from "sonner";
import { applicationKeys } from "@/features/application/hooks/useApplication";

export const evidenceKeys = {
  all: ["evidences"] as const,
  list: (appId: string) => ["evidences", appId] as const,
  detail: (id: string) => ["evidence", id, "card"] as const,
  signedUrl: (fileId: string) => ["file", fileId, "signed-url"] as const,
};

function invalidateStudentState(
  queryClient: ReturnType<typeof useQueryClient>,
  applicationId?: string,
  evidenceId?: string,
) {
  queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
  if (applicationId) {
    queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
    queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(applicationId) });
  } else {
    queryClient.invalidateQueries({ queryKey: evidenceKeys.all });
  }
  if (evidenceId) {
    queryClient.invalidateQueries({ queryKey: evidenceKeys.detail(evidenceId) });
  }
}

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

export function useEvidenceCard(evidenceId: string | undefined) {
  return useQuery({
    queryKey: evidenceKeys.detail(evidenceId ?? ""),
    queryFn: async () => {
      if (!evidenceId) return null;
      const res = await evidenceApi.getEvidenceCard(evidenceId);
      return res.data;
    },
    enabled: !!evidenceId,
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
      invalidateStudentState(queryClient, activeAppId, data?.id);
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
      invalidateStudentState(queryClient, variables.applicationId, variables.evidenceId);
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
      invalidateStudentState(queryClient, data.applicationId, data.id);
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
      invalidateStudentState(queryClient, data.applicationId, data.evidenceId);
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
