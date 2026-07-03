import { apiBlob, apiClient } from "@/lib/api/client";
import type { ApplicationStatus, Level } from "@/lib/api/types";

export interface ExportReviewResultsInput {
  schoolYear?: string;
  status?: ApplicationStatus;
  targetLevel?: Level;
  faculty?: string;
  format?: "json" | "csv";
}

export interface ExportReviewResultRow {
  studentCode: string | null;
  fullName: string;
  className: string | null;
  faculty: string | null;
  schoolYear: string;
  targetLevel: Level;
  finalLevel: Level | null;
  finalStatus: string;
  applicationStatus: ApplicationStatus;
  readinessScore: number;
  submittedAt: string | null;
  completedAt: string | null;
  criteriaTaskStatuses: Record<string, string>;
  finalNote: string | null;
}

export type ExportReviewResultsResponse =
  | { format: "json"; data: ExportReviewResultRow[] }
  | {
      format: "csv";
      fileId: string;
      downloadUrl: string;
      file: { id: string; originalName: string; mimeType: string; fileSize: number };
    };

export const exportsApi = {
  exportReviewResults: async (payload: ExportReviewResultsInput) => {
    const res = await apiClient<ExportReviewResultsResponse>("/api/exports/review-results", {
      method: "POST",
      body: payload,
    });
    return res.data;
  },

  downloadExportFile: (fileId: string) => apiBlob(`/api/exports/${fileId}/download`),
};
