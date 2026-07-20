import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reviewKeys } from "./useReview";
import { managerApi, type ManagerApplicationFilters } from "../api/manager";

export const managerKeys = {
  all: ["manager"] as const,
  applications: (filters: ManagerApplicationFilters) =>
    [...managerKeys.all, "applications", filters] as const,
  workloads: () => [...managerKeys.all, "workloads"] as const,
  aggregation: (applicationId: string) =>
    [...managerKeys.all, "aggregation", applicationId] as const,
};

export function useManagerApplications(filters: ManagerApplicationFilters = {}) {
  return useQuery({
    queryKey: managerKeys.applications(filters),
    queryFn: () => managerApi.listApplications(filters),
  });
}

export function useManagerWorkloads() {
  return useQuery({
    queryKey: managerKeys.workloads(),
    queryFn: managerApi.getWorkloads,
  });
}

export function useApplicationAggregation(applicationId?: string) {
  return useQuery({
    queryKey: managerKeys.aggregation(applicationId ?? ""),
    queryFn: () => managerApi.getApplicationAggregation(applicationId!),
    enabled: Boolean(applicationId),
  });
}

export function useAssignReviewTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      officerId,
      note,
    }: {
      taskId: string;
      officerId: string;
      note?: string;
    }) => managerApi.assignTask(taskId, { officerId, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      queryClient.invalidateQueries({ queryKey: managerKeys.workloads() });
      toast.success("Đã phân công task xét duyệt");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể phân công task");
    },
  });
}

export function useFinalizeApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: Parameters<typeof managerApi.finalizeApplication>[1];
    }) => managerApi.finalizeApplication(applicationId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: managerKeys.all });
      queryClient.invalidateQueries({ queryKey: managerKeys.aggregation(variables.applicationId) });
      toast.success("Đã chốt kết quả hồ sơ");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Không thể chốt kết quả hồ sơ");
    },
  });
}
