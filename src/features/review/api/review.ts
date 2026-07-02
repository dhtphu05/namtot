import { apiClient } from "@/lib/api/client";
import type {
  ApiResponse,
  EscalateResolutionRequest,
  EscalateResolutionResponse,
  QueryValue,
  RequestSupplementRequest,
  RequestSupplementResponse,
  ReviewTaskDetail,
  ReviewTaskListParams,
  ReviewTaskListResponse,
  SubmitReviewDecisionRequest,
  SubmitReviewDecisionResponse,
} from "../types";

function buildQueryString(params?: Record<string, QueryValue>) {
  const query = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function withDataFallback<T>(response: ApiResponse<T>, fallback: T | null = null): ApiResponse<T> {
  return {
    ...response,
    data: response.data ?? fallback,
  };
}

export const reviewApi = {
  getReviewTasks: async (
    params?: ReviewTaskListParams,
  ): Promise<ApiResponse<ReviewTaskListResponse>> => {
    const response = await apiClient<ReviewTaskListResponse>(
      `/api/review/tasks${buildQueryString(params)}`,
    );

    return withDataFallback(response, { items: [] });
  },

  getReviewTask: async (id: string): Promise<ApiResponse<ReviewTaskDetail>> => {
    const response = await apiClient<ReviewTaskDetail>(`/api/review/tasks/${id}`);

    return withDataFallback(response);
  },

  submitReviewDecision: async (
    taskId: string,
    payload: SubmitReviewDecisionRequest,
  ): Promise<ApiResponse<SubmitReviewDecisionResponse>> => {
    const response = await apiClient<SubmitReviewDecisionResponse>(
      `/api/review/tasks/${taskId}/decision`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    return withDataFallback(response);
  },

  requestSupplement: async (
    taskId: string,
    payload: RequestSupplementRequest,
  ): Promise<ApiResponse<RequestSupplementResponse>> => {
    const response = await apiClient<RequestSupplementResponse>(
      `/api/review/tasks/${taskId}/request-supplement`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    return withDataFallback(response);
  },

  escalateResolution: async (
    taskId: string,
    payload: EscalateResolutionRequest,
  ): Promise<ApiResponse<EscalateResolutionResponse>> => {
    const response = await apiClient<EscalateResolutionResponse>(
      `/api/review/tasks/${taskId}/escalate-resolution`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    return withDataFallback(response);
  },
};
