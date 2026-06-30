import { apiClient } from "@/lib/api/client";
import type { JobStatus } from "@/lib/api/types";

export interface JobResponse {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  result?: unknown;
  error?: { message: string; code: string };
  createdAt: string;
  updatedAt: string;
}

export const jobsApi = {
  getJobStatus: async (jobId: string) => {
    return apiClient<JobResponse>(`/api/jobs/${jobId}`, {
      method: "GET",
    });
  },

  runJob: async (jobId: string) => {
    return apiClient<JobResponse>(`/api/jobs/${jobId}/run`, {
      method: "POST",
    });
  },
};
