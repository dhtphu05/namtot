import { useMemo, useState } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import { jobsApi } from "@/features/evidence/api/jobs";
import { isTerminalJobStatus, type JobResponse } from "@/types/jobs";

type UseJobPollingOptions = {
  enabled?: boolean;
  queryKey?: QueryKey;
  initialIntervalMs?: number;
  backoffIntervalMs?: number;
  backoffAfterMs?: number;
  slowIntervalMs?: number;
  slowAfterMs?: number;
  maxElapsedMs?: number;
  pauseWhenHidden?: boolean;
};

export function useJobPolling(jobId?: string, options: UseJobPollingOptions = {}) {
  const [startedAt] = useState(() => Date.now());
  const initialIntervalMs = options.initialIntervalMs ?? 2500;
  const backoffIntervalMs = options.backoffIntervalMs ?? 8000;
  const backoffAfterMs = options.backoffAfterMs ?? 30000;
  const slowIntervalMs = options.slowIntervalMs ?? backoffIntervalMs;
  const slowAfterMs = options.slowAfterMs ?? Number.POSITIVE_INFINITY;
  const maxElapsedMs = options.maxElapsedMs ?? 180000;
  const enabled = Boolean(jobId) && options.enabled !== false;
  const queryKey = useMemo(() => options.queryKey ?? ["jobs", jobId], [jobId, options.queryKey]);

  return useQuery<JobResponse | null>({
    queryKey,
    enabled,
    queryFn: async () => {
      if (!jobId) return null;
      const response = await jobsApi.getJobStatus(jobId);
      return response.data;
    },
    refetchInterval: (query) => {
      const elapsedMs = Date.now() - startedAt;
      const status = query.state.data?.status;
      const isHidden =
        options.pauseWhenHidden !== false &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden";

      if (!enabled || isHidden || isTerminalJobStatus(status) || elapsedMs > maxElapsedMs) {
        return false;
      }

      if (elapsedMs >= slowAfterMs) {
        return slowIntervalMs;
      }

      return elapsedMs < backoffAfterMs ? initialIntervalMs : backoffIntervalMs;
    },
  });
}
