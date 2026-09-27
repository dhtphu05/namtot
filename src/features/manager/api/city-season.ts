import { apiClient } from "@/lib/api/client";
import type { ApiResponse, ManagerSubmissionDeadline } from "@/lib/api/types";

export type CityReviewSeason = {
  id: string;
  schoolYear: string;
  submissionOpensAt: string | null;
  submissionClosesAt: string | null;
  reviewDeadlineAt: string | null;
  supplementDeadlineAt: string | null;
  finalizationDeadlineAt: string | null;
  version: number;
  updatedAt: string;
  submissionStatus: "NOT_CONFIGURED" | "NOT_OPEN" | "OPEN" | "CLOSED" | "EXCEPTION_ACTIVE";
  reviewStatus: "NOT_CONFIGURED" | "ON_TRACK" | "OVERDUE";
  supplementStatus: "NOT_CONFIGURED" | "ON_TRACK" | "OVERDUE";
  finalizationStatus: "NOT_CONFIGURED" | "ON_TRACK" | "OVERDUE";
};

export type SaveCityReviewSeasonInput = {
  schoolYear: string;
  submissionOpensAt: string;
  submissionClosesAt: string;
  reviewDeadlineAt: string;
  supplementDeadlineAt: string;
  finalizationDeadlineAt: string;
  reason: string;
};

export type GrantSubmissionDeadlineExceptionInput = { validUntil: string; reason: string };
export type RevokeSubmissionDeadlineExceptionInput = { reason: string };

function seasonPath(schoolYear: string) {
  return `/api/manager/city-review-seasons/${encodeURIComponent(schoolYear)}`;
}

export const citySeasonApi = {
  getSeason(schoolYear: string): Promise<ApiResponse<CityReviewSeason | null>> {
    return apiClient<CityReviewSeason | null>(seasonPath(schoolYear));
  },
  createSeason(input: SaveCityReviewSeasonInput): Promise<ApiResponse<CityReviewSeason>> {
    return apiClient<CityReviewSeason>("/api/manager/city-review-seasons", {
      method: "POST",
      body: input,
    });
  },
  updateSeason(
    schoolYear: string,
    input: SaveCityReviewSeasonInput & { expectedVersion: number },
  ): Promise<ApiResponse<CityReviewSeason>> {
    return apiClient<CityReviewSeason>(seasonPath(schoolYear), {
      method: "PATCH",
      body: input,
    });
  },
  getApplicationDeadline(applicationId: string): Promise<ApiResponse<ManagerSubmissionDeadline>> {
    return apiClient<ManagerSubmissionDeadline>(
      `/api/manager/applications/${applicationId}/submission-deadline`,
    );
  },
  grantException(
    applicationId: string,
    input: GrantSubmissionDeadlineExceptionInput,
  ): Promise<ApiResponse<unknown>> {
    return apiClient(`/api/manager/applications/${applicationId}/submission-deadline-exception`, {
      method: "PUT",
      body: input,
    });
  },
  revokeException(
    applicationId: string,
    input: RevokeSubmissionDeadlineExceptionInput,
  ): Promise<ApiResponse<unknown>> {
    return apiClient(`/api/manager/applications/${applicationId}/submission-deadline-exception`, {
      method: "DELETE",
      body: input,
    });
  },
};
