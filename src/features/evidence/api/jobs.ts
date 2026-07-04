import { apiClient } from "@/lib/api/client";
import type { JobResponse } from "@/types/jobs";

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

  retryJob: async (jobId: string) => {
    return apiClient<JobResponse>(`/api/jobs/${jobId}/retry`, {
      method: "POST",
    });
  },

  cancelJob: async (jobId: string) => {
    return apiClient<JobResponse>(`/api/jobs/${jobId}/cancel`, {
      method: "POST",
    });
  },
};
