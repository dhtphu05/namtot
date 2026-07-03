import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { managerApi } from "../api/manager";
import type { FinalizeApplicationInput, ManagerApplicationsParams, ManagerResultFilters } from "../types";

export const managerKeys = {
  applications: ["managerApplications"] as const,
  applicationsList: (params?: ManagerApplicationsParams) =>
    [...managerKeys.applications, params ?? {}] as const,
  workload: ["managerWorkload"] as const,
  dashboard: ["managerDashboard"] as const,
  results: (params?: ManagerResultFilters) => ["managerResults", params ?? {}] as const,
  resultDetail: (applicationId?: string) => ["managerResultDetail", applicationId ?? ""] as const,
};

export function useManagerApplications(params?: ManagerApplicationsParams) {
  return useQuery({
    queryKey: managerKeys.applicationsList(params),
    queryFn: async () => {
      const response = await managerApi.getManagerApplications(params);
      return response.data;
    },
  });
}

export function useManagerWorkload() {
  return useQuery({
    queryKey: managerKeys.workload,
    queryFn: async () => {
      const response = await managerApi.getManagerWorkload();
      return response.data;
    },
  });
}

export function useManagerDashboardSummary() {
  return useQuery({
    queryKey: managerKeys.dashboard,
    queryFn: async () => {
      const response = await managerApi.getManagerDashboardSummary();
      return response.data;
    },
  });
}

export function useManagerResults(params?: ManagerResultFilters) {
  return useQuery({
    queryKey: managerKeys.results(params),
    queryFn: async () => {
      const response = await managerApi.getManagerResults(params);
      return response.data;
    },
  });
}

export function useManagerResultDetail(applicationId?: string) {
  return useQuery({
    queryKey: managerKeys.resultDetail(applicationId),
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const response = await managerApi.getManagerResultDetail(applicationId ?? "");
      return response.data;
    },
  });
}

export function useFinalizeManagerApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: FinalizeApplicationInput;
    }) => managerApi.finalizeApplication(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: ["managerResults"] });
      queryClient.invalidateQueries({ queryKey: ["managerResultDetail"] });
      queryClient.invalidateQueries({ queryKey: managerKeys.applications });
      toast.success("Đã chốt kết quả hồ sơ.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể chốt kết quả hồ sơ.");
    },
  });
}
