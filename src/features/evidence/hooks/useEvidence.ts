import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evidenceApi } from "@/features/evidence/api/evidence";
import { jobsApi } from "@/features/evidence/api/jobs";
import type {
  Criterion,
  EvidenceSourceType,
  EvidenceStatus,
  IndexingStatus,
} from "@/lib/api/types";
import { toast } from "sonner";
import { applicationKeys } from "@/features/application/hooks/useApplication";

export const evidenceKeys = {
  all: ["evidences"] as const,
  list: (appId: string) => ["evidences", appId] as const,
  detail: (id: string) => ["evidence", id] as const,
  card: (id: string) => ["evidence", id, "card"] as const,
  audit: (id: string) => ["evidence", id, "audit"] as const,
  signedUrl: (fileId: string) => ["file", fileId, "signed-url"] as const,
  job: (id: string) => ["jobs", id] as const,
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
    queryClient.invalidateQueries({ queryKey: evidenceKeys.card(evidenceId) });
    queryClient.invalidateQueries({ queryKey: evidenceKeys.audit(evidenceId) });
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
  },
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
    queryKey: evidenceKeys.card(evidenceId ?? ""),
    queryFn: async () => {
      if (!evidenceId) return null;
      const res = await evidenceApi.getEvidenceCard(evidenceId);
      return res.data;
    },
    enabled: !!evidenceId,
  });
}

export function useEvidenceDetail(evidenceId: string | undefined) {
  return useQuery({
    queryKey: evidenceKeys.detail(evidenceId ?? ""),
    queryFn: async () => {
      if (!evidenceId) return null;
      const res = await evidenceApi.getEvidence(evidenceId);
      return res.data;
    },
    enabled: !!evidenceId,
  });
}

export function useEvidenceAudit(evidenceId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: evidenceKeys.audit(evidenceId ?? ""),
    queryFn: async () => {
      if (!evidenceId) return { items: [] };
      const res = await evidenceApi.getEvidenceAudit(evidenceId);
      return res.data ?? { items: [] };
    },
    enabled: !!evidenceId && enabled,
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
    mutationFn: async ({
      id,
      applicationId: mutationAppId,
      silent,
    }: {
      id: string;
      applicationId?: string;
      silent?: boolean;
    }) => {
      await evidenceApi.deleteEvidence(id);
      return { id, applicationId: mutationAppId || applicationId, silent };
    },
    onSuccess: (data) => {
      invalidateStudentState(queryClient, data.applicationId, data.id);
      if (!data.silent) toast.success("Đã xoá minh chứng");
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

export function useStartEvidenceIndexing(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evidenceId }: { evidenceId: string }) => {
      const res = await evidenceApi.startIndexing(evidenceId, { runMode: "async" });
      return res.data;
    },
    onSuccess: (data, variables) => {
      invalidateStudentState(
        queryClient,
        applicationId ?? data?.applicationId ?? undefined,
        variables.evidenceId,
      );
      toast.success("Đã bắt đầu đọc minh chứng.");
    },
    onError: (err: Error) => {
      toast.error(`Không thể bắt đầu đọc minh chứng: ${err.message}`);
    },
  });
}

export function useRetryEvidenceJob(applicationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evidenceId, jobId }: { evidenceId: string; jobId: string }) => {
      const res = await jobsApi.retryJob(jobId);
      return { evidenceId, job: res.data };
    },
    onSuccess: (data) => {
      if (applicationId)
        queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.detail(data.evidenceId) });
      queryClient.invalidateQueries({ queryKey: evidenceKeys.card(data.evidenceId) });
      if (data.job?.id) queryClient.invalidateQueries({ queryKey: evidenceKeys.job(data.job.id) });
      toast.success("Đã yêu cầu xử lý lại minh chứng.");
    },
    onError: (err: Error) => {
      toast.error(`Không thể xử lý lại: ${err.message}`);
    },
  });
}

export function useCancelEvidenceJob() {
  return useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const res = await jobsApi.cancelJob(jobId);
      return res.data;
    },
  });
}
