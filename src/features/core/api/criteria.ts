import { apiClient } from "@/lib/api/client";
import type { ApiResponse, Criterion, Level } from "@/lib/api/types";

export type ActiveCriteriaConfigRule = {
  criterion: Criterion;
  ruleKey: string;
  title: string;
  mandatory: boolean;
  priorityRule: boolean;
  studentFriendlyText: string;
  acceptedEvidenceHints: string[];
  missingActionHints: string[];
  source: {
    documentName: string;
    page: number | null;
    section: string | null;
  };
};

export type ActiveCriteriaConfig = {
  id: string;
  scope: Level;
  code: string;
  title: string;
  description: string | null;
  sourceDocumentName: string | null;
  sourceDocumentNumber: string | null;
  sourceIssuedAt: string | null;
  sourcePeriodLabel: string | null;
  sourceOrganization: string | null;
  sourceFileName: string | null;
  sourceNote: string | null;
  rules: ActiveCriteriaConfigRule[];
};

export type ActiveCriteriaConfigsResponse = {
  configs: ActiveCriteriaConfig[];
};

export const criteriaApi = {
  getActiveConfigs: (): Promise<ApiResponse<ActiveCriteriaConfigsResponse>> =>
    apiClient<ActiveCriteriaConfigsResponse>("/api/criteria/configs/active", { method: "GET" }),
};

export function requireActiveCriteriaConfigs(
  response: ApiResponse<ActiveCriteriaConfigsResponse>,
): ActiveCriteriaConfigsResponse {
  if (response.data === null) throw new Error("Hệ thống không trả dữ liệu bộ tiêu chí.");
  return response.data;
}
