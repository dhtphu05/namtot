import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/store/auth-store";
import { reviewApi } from "../api/review";
import type {
  EscalateResolutionRequest,
  RequestSupplementRequest,
  ReviewTaskListParams,
  ReviewTaskDetail,
  SubmitReviewDecisionRequest,
} from "../types";

export const reviewKeys = {
  all: ["reviewTasks"] as const,
  lists: (userId?: string) => ["officerTasks", userId ?? "anonymous"] as const,
  list: (userId?: string, params?: ReviewTaskListParams) =>
    [...reviewKeys.lists(userId), params ?? {}] as const,
  detail: (taskId: string) => ["reviewTask", taskId] as const,
  dashboard: (userId?: string) => ["officerDashboard", userId ?? "anonymous"] as const,
  assessment: (taskId: string) => ["criterionLevelAssessment", taskId] as const,
  timeline: (taskId: string) => ["reviewTaskTimeline", taskId] as const,
  precedents: (taskId: string, limit: number) => ["reviewTaskPrecedents", taskId, limit] as const,
  signedUrl: (fileId: string) => ["signedFileUrl", fileId] as const,
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
  const userId = useAuth((state) => state.user?.id);
  return useQuery({
    queryKey: reviewKeys.list(userId, params),
    queryFn: async () => {
      const response = await reviewApi.getReviewTasks(params);
      return response.data;
    },
    enabled: Boolean(userId),
  });
}

export function useOfficerDashboard() {
  const userId = useAuth((state) => state.user?.id);
  return useQuery({
    queryKey: reviewKeys.dashboard(userId),
    queryFn: async () => {
      const response = await reviewApi.getOfficerDashboard();
      return response.data;
    },
    enabled: Boolean(userId),
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
    refetchInterval: (query) => (hasReadingEvidence(query.state.data) ? 5000 : false),
  });
}

export const useReviewTaskDetail = useReviewTask;

function hasReadingEvidence(task?: ReviewTaskDetail | null) {
  return Boolean(
    task?.evidences.some((evidence) =>
      ["pending_indexing", "ocr_processing", "extracting", "checking_registry"].includes(
        evidence.indexingStatus ?? "",
      ),
    ),
  );
}

export function useCriterionLevelAssessment(taskId?: string) {
  return useQuery({
    queryKey: reviewKeys.assessment(taskId ?? ""),
    queryFn: async () => {
      const response = await reviewApi.getCriterionLevelAssessment(taskId ?? "");
      return response.data;
    },
    enabled: Boolean(taskId),
  });
}

export function useReviewTaskTimeline(taskId?: string) {
  return useQuery({
    queryKey: reviewKeys.timeline(taskId ?? ""),
    queryFn: async () => {
      const response = await reviewApi.getReviewTaskTimeline(taskId ?? "");
      return response.data ?? [];
    },
    enabled: Boolean(taskId),
  });
}

export function useReviewTaskPrecedents(taskId?: string, enabled = true, limit = 3) {
  return useQuery({
    queryKey: reviewKeys.precedents(taskId ?? "", limit),
    queryFn: async () => {
      const response = await reviewApi.getReviewTaskPrecedents(taskId ?? "", limit);
      return response.data ?? { items: [], hasStrongPrecedent: false };
    },
    enabled: enabled && Boolean(taskId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useSignedFileUrl(fileId?: string, enabled = false) {
  return useQuery({
    queryKey: reviewKeys.signedUrl(fileId ?? ""),
    queryFn: async () => {
      const response = await reviewApi.getSignedFileUrl(fileId ?? "");
      return response.data?.url ?? null;
    },
    enabled: Boolean(fileId) && enabled,
    staleTime: 4 * 60 * 1000,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["officerTasks"] });
      queryClient.invalidateQueries({ queryKey: ["officerDashboard"] });
      queryClient.invalidateQueries({
        queryKey: managerInvalidationKeys.dashboard,
      });
      queryClient.invalidateQueries({
        queryKey: managerInvalidationKeys.workload,
      });
      if (data?.applicationId) {
        queryClient.invalidateQueries({
          queryKey: ["manager", "aggregation", data.applicationId],
        });
      }

      if (
        variables.payload.decision === "resolution_needed" ||
        data?.status === "resolution_needed"
      ) {
        queryClient.invalidateQueries({
          queryKey: resolutionInvalidationKeys.cases,
        });
      }
      if (variables.payload.decision === "accepted") {
        queryClient.invalidateQueries({ queryKey: ["evidence-knowledge"] });
      }
    },
  });
}

export const useSubmitDecision = useSubmitReviewDecision;

export function useClaimReviewTask(taskId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id?: string) => {
      const targetTaskId = id ?? taskId;

      if (!targetTaskId) {
        throw new Error("Review task id is required.");
      }

      const response = await reviewApi.claimReviewTask(targetTaskId);
      return response.data;
    },
    onSuccess: (_, id) => {
      const targetTaskId = id ?? taskId;

      if (targetTaskId) {
        queryClient.invalidateQueries({
          queryKey: reviewKeys.detail(targetTaskId),
        });
      }

      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({ queryKey: ["officerTasks"] });
      queryClient.invalidateQueries({ queryKey: ["officerDashboard"] });
      queryClient.invalidateQueries({
        queryKey: managerInvalidationKeys.workload,
      });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["officerTasks"] });
      queryClient.invalidateQueries({ queryKey: ["officerDashboard"] });
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
      queryClient.invalidateQueries({ queryKey: ["officerTasks"] });
      queryClient.invalidateQueries({ queryKey: ["officerDashboard"] });
      queryClient.invalidateQueries({
        queryKey: resolutionInvalidationKeys.cases,
      });
    },
  });
}
