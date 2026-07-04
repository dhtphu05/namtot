import { useMemo, useState } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";
import { decisionImportApi } from "@/features/decision-import/api/decision-import";
import {
  isActiveDecisionImportStatus,
  isTerminalDecisionImportStatus,
  type DecisionImport,
} from "@/types/decision-import";

type UseDecisionImportPollingOptions = {
  enabled?: boolean;
  queryKey?: QueryKey;
  intervalMs?: number;
  maxElapsedMs?: number;
};

export function useDecisionImportPolling(
  importId?: string,
  options: UseDecisionImportPollingOptions = {},
) {
  const [startedAt] = useState(() => Date.now());
  const intervalMs = options.intervalMs ?? 3000;
  const maxElapsedMs = options.maxElapsedMs ?? 240000;
  const enabled = Boolean(importId) && options.enabled !== false;
  const queryKey = useMemo(
    () => options.queryKey ?? ["decision-imports", importId, "status"],
    [importId, options.queryKey],
  );

  return useQuery<DecisionImport | null>({
    queryKey,
    enabled,
    queryFn: async () => {
      if (!importId) return null;
      const response = await decisionImportApi.getStatus(importId);
      return response.data;
    },
    refetchInterval: (query) => {
      const elapsedMs = Date.now() - startedAt;
      const status = query.state.data?.status;

      if (!enabled || isTerminalDecisionImportStatus(status) || elapsedMs > maxElapsedMs) {
        return false;
      }

      if (!isActiveDecisionImportStatus(status)) {
        return false;
      }

      if (elapsedMs > 180000) {
        return 10000;
      }

      if (elapsedMs > 60000) {
        return 5000;
      }

      return intervalMs;
    },
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });
}
