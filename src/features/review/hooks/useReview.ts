import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewApi } from "../api/review";
import type {
  EscalateResolutionRequest,
  RequestSupplementRequest,
  ReviewTaskListParams,
  SubmitReviewDecisionRequest,
} from "../types";

export const reviewKeys = {
  all: ["reviewTasks"] as const,
  lists: () => [...reviewKeys.all, "list"] as const,
  list: (params?: ReviewTaskListParams) => [...reviewKeys.lists(), params ?? {}] as const,
  detail: (taskId: string) => ["reviewTask", taskId] as const,
};

export const managerInvalidationKeys = {
  applications: ["managerApplications"] as const,
  workload: ["managerWorkload"] as const,
  dashboard: ["managerDashboard"] as const,
};

export const resolutionInvalidationKeys = {
  cases: ["resolutionCases"] as const,
};

type ReviewMutationVariables<TPayload> = {
  id?: string;
  payload: TPayload;
};

export function useReviewTasks(params?: ReviewTaskListParams) {
  return useQuery({
    queryKey: reviewKeys.list(params),
    queryFn: async () => {
      const response = await reviewApi.getReviewTasks(params);
      return response.data;
    },
  });
}

export function useReviewTask(taskId?: string) {
  return useQuery({
    queryKey: reviewKeys.detail(taskId ?? ""),
    queryFn: async () => {
      const response = await reviewApi.getReviewTask(taskId ?? "");
      return response.data;
    },
    enabled: Boolean(taskId),
  });
}

export const useReviewTaskDetail = useReviewTask;

export function useSubmitReviewDecision(taskId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: ReviewMutationVariables<SubmitReviewDecisionRequest>) => {
      const targetTaskId = id ?? taskId;

      if (!targetTaskId) {
        throw new Error("Review task id is required.");
      }

      const response = await reviewApi.submitReviewDecision(targetTaskId, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      const targetTaskId = variables.id ?? taskId;

      if (targetTaskId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.detail(targetTaskId),
        });
      }

      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({
        queryKey: managerInvalidationKeys.dashboard,
      });
      queryClient.invalidateQueries({
        queryKey: managerInvalidationKeys.workload,
      });

      if (
        variables.payload.decision === "resolution_needed" ||
        data?.status === "resolution_needed"
      ) {
        queryClient.invalidateQueries({
          queryKey: resolutionInvalidationKeys.cases,
        });
      }
    },
  });
}

export const useSubmitDecision = useSubmitReviewDecision;

export function useRequestSupplement(taskId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: ReviewMutationVariables<RequestSupplementRequest>) => {
      const targetTaskId = id ?? taskId;

      if (!targetTaskId) {
        throw new Error("Review task id is required.");
      }

      const response = await reviewApi.requestSupplement(targetTaskId, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const targetTaskId = variables.id ?? taskId;

      if (targetTaskId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.detail(targetTaskId),
        });
      }

      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({
        queryKey: managerInvalidationKeys.applications,
      });
    },
  });
}

export function useEscalateResolution(taskId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: ReviewMutationVariables<EscalateResolutionRequest>) => {
      const targetTaskId = id ?? taskId;

      if (!targetTaskId) {
        throw new Error("Review task id is required.");
      }

      const response = await reviewApi.escalateResolution(targetTaskId, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const targetTaskId = variables.id ?? taskId;

      if (targetTaskId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.detail(targetTaskId),
        });
      }

      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({
        queryKey: resolutionInvalidationKeys.cases,
      });
    },
  });
}
