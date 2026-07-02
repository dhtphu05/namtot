import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../api/audit";
import type { AuditLogParams } from "../types";

export const auditKeys = {
  logs: ["auditLogs"] as const,
  logsList: (params?: AuditLogParams) => [...auditKeys.logs, params ?? {}] as const,
};

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: auditKeys.logsList(params),
    queryFn: async () => {
      const response = await auditApi.getAuditLogs(params);
      return response.data;
    },
  });
}
