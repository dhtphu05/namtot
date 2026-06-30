import { useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "@/features/evidence/api/jobs";
import { useEffect } from "react";
import { toast } from "sonner";
import { evidenceKeys } from "@/features/evidence/hooks/useEvidence";

export function useJobPolling(jobId?: string, applicationId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await jobsApi.getJobStatus(jobId);
      return res.data;
    },
    enabled: !!jobId,
    // Poll every 2 seconds if the job is not completed or failed
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "completed" || data.status === "failed") {
        return false;
      }
      return 2000;
    },
  });

  // Watch for completion to invalidate evidence list
  useEffect(() => {
    if (query.data?.status === "completed") {
      if (applicationId) {
        queryClient.invalidateQueries({ queryKey: evidenceKeys.list(applicationId) });
      }
      toast.success("Trích xuất dữ liệu hoàn tất!");
    } else if (query.data?.status === "failed") {
      toast.error(`Trích xuất dữ liệu thất bại: ${query.data.error?.message || "Lỗi không xác định"}`);
    }
  }, [query.data?.status, applicationId, queryClient]);

  return query;
}
