import { useMemo, useState } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import { evidenceApi } from "@/features/evidence/api/evidence";
import type { EvidenceCard } from "@/types/evidence";
import { isTerminalJobStatus } from "@/types/jobs";

type UseEvidenceCardPollingOptions = {
  enabled?: boolean;
  queryKey?: QueryKey;
  initialIntervalMs?: number;
  backoffIntervalMs?: number;
  backoffAfterMs?: number;
  slowIntervalMs?: number;
  slowAfterMs?: number;
  maxElapsedMs?: number;
  pauseWhenHidden?: boolean;
  stopWhen?: (card: EvidenceCard | null) => boolean;
};

export function useEvidenceCardPolling(
  evidenceId?: string,
  options: UseEvidenceCardPollingOptions = {},
) {
  const [startedAt] = useState(() => Date.now());
  const initialIntervalMs = options.initialIntervalMs ?? 2500;
  const backoffIntervalMs = options.backoffIntervalMs ?? 8000;
  const backoffAfterMs = options.backoffAfterMs ?? 30000;
  const slowIntervalMs = options.slowIntervalMs ?? backoffIntervalMs;
  const slowAfterMs = options.slowAfterMs ?? Number.POSITIVE_INFINITY;
  const maxElapsedMs = options.maxElapsedMs ?? 180000;
  const enabled = Boolean(evidenceId) && options.enabled !== false;
  const queryKey = useMemo(
    () => options.queryKey ?? ["evidences", evidenceId, "card", "polling"],
    [evidenceId, options.queryKey],
  );

  return useQuery<EvidenceCard | null>({
    queryKey,
    enabled,
    queryFn: async () => {
      if (!evidenceId) return null;
      const response = await evidenceApi.getEvidenceCard(evidenceId);
      return response.data;
    },
    refetchInterval: (query) => {
      const elapsedMs = Date.now() - startedAt;
      const card = query.state.data;
      const uxStep = card?.uxStatus?.step;
      const isHidden =
        options.pauseWhenHidden !== false &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden";

      if (
        !enabled ||
        isHidden ||
        isTerminalJobStatus(uxStep) ||
        options.stopWhen?.(card ?? null) ||
        elapsedMs > maxElapsedMs
      ) {
        return false;
      }

      if (elapsedMs >= slowAfterMs) {
        return slowIntervalMs;
      }

      return elapsedMs < backoffAfterMs ? initialIntervalMs : backoffIntervalMs;
    },
  });
}
