import { apiClient, type ApiOptions } from "@/lib/api/client";
import type { ApiResponse } from "@/lib/api/types";
import type {
  OfficerEvidenceKnowledgeEventDetail,
  OfficerEvidenceKnowledgeSearchFilters,
  OfficerEvidenceKnowledgeSearchResponse,
} from "../types";

type QueryValue = string | number | boolean | null | undefined;

function toQuery(params?: Record<string, QueryValue>) {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export const evidenceKnowledgeApi = {
  searchOfficer: (
    filters: OfficerEvidenceKnowledgeSearchFilters,
    options?: Pick<ApiOptions, "signal">,
  ): Promise<ApiResponse<OfficerEvidenceKnowledgeSearchResponse>> =>
    apiClient<OfficerEvidenceKnowledgeSearchResponse>(
      `/api/evidence-knowledge/officer/search${toQuery({
        q: filters.q?.trim() || undefined,
        criterion: filters.criterion,
        applicationId: filters.applicationId,
        year: filters.year,
        level: filters.level,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      })}`,
      { signal: options?.signal },
    ),

  getOfficerEvent: (
    eventId: string,
    options?: Pick<ApiOptions, "signal">,
  ): Promise<ApiResponse<OfficerEvidenceKnowledgeEventDetail>> =>
    apiClient<OfficerEvidenceKnowledgeEventDetail>(
      `/api/evidence-knowledge/officer/events/${eventId}`,
      { signal: options?.signal },
    ),
};
