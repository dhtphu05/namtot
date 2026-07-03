import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { managerApi } from "../api/manager";
import type {
  FinalizeApplicationInput,
  FinalizeCollectiveInput,
  CommitteeInboxParams,
  ManagerApplicationsParams,
  ManagerCollectiveFilters,
  ManagerResultFilters,
  ReopenFinalInput,
} from "../types";

export const managerKeys = {
  applications: ["managerApplications"] as const,
  applicationsList: (params?: ManagerApplicationsParams) =>
    [...managerKeys.applications, params ?? {}] as const,
  workload: ["managerWorkload"] as const,
  dashboard: ["managerDashboard"] as const,
  committeeInbox: (params?: CommitteeInboxParams) => ["committeeInbox", params ?? {}] as const,
  collectives: (params?: ManagerCollectiveFilters) => ["managerCollectives", params ?? {}] as const,
  collectiveAggregation: (collectiveId?: string) => ["managerCollectiveAggregation", collectiveId ?? ""] as const,
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

export function useCommitteeInbox(params?: CommitteeInboxParams) {
  return useQuery({
    queryKey: managerKeys.committeeInbox(params),
    queryFn: async () => {
      const response = await managerApi.getCommitteeInbox(params);
      return response.data;
    },
  });
}

export function useManagerCollectives(params?: ManagerCollectiveFilters) {
  return useQuery({
    queryKey: managerKeys.collectives(params),
    queryFn: async () => {
      const response = await managerApi.getManagerCollectives(params);
      return response.data;
    },
  });
}

export function useManagerCollectiveAggregation(collectiveId?: string) {
  return useQuery({
    queryKey: managerKeys.collectiveAggregation(collectiveId),
    enabled: Boolean(collectiveId),
    queryFn: async () => {
      const response = await managerApi.getManagerCollectiveAggregation(collectiveId ?? "");
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
      queryClient.invalidateQueries({ queryKey: ["committeeInbox"] });
      queryClient.invalidateQueries({ queryKey: ["managerResults"] });
      queryClient.invalidateQueries({ queryKey: ["managerResultDetail"] });
      queryClient.invalidateQueries({ queryKey: managerKeys.applications });
      toast.success("Đã chốt kết quả hồ sơ.");
    },
    onError: (error: Error) => {
      const code = "code" in error ? String(error.code) : "";
      if (code === "FINAL_LEVEL_MISMATCH" || code === "FINAL_STATUS_MISMATCH") {
        queryClient.invalidateQueries({ queryKey: managerKeys.dashboard });
        queryClient.invalidateQueries({ queryKey: ["committeeInbox"] });
        queryClient.invalidateQueries({ queryKey: ["managerResults"] });
        queryClient.invalidateQueries({ queryKey: ["managerResultDetail"] });
        toast.error(
          "Đề xuất cấp đạt đã thay đổi sau recompute cuối. Snapshot mới đã được lưu và màn hình đang tải lại, vui lòng kiểm tra rồi chốt lại.",
        );
        return;
      }
      toast.error(error.message || "Không thể chốt kết quả hồ sơ.");
    },
  });
}

export function useReopenFinalApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: ReopenFinalInput;
    }) => managerApi.reopenFinalApplication(applicationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.dashboard });
      queryClient.invalidateQueries({ queryKey: ["committeeInbox"] });
      queryClient.invalidateQueries({ queryKey: ["managerResults"] });
      queryClient.invalidateQueries({ queryKey: ["managerResultDetail"] });
      queryClient.invalidateQueries({ queryKey: managerKeys.applications });
      toast.success("Da mo lai ket qua da chot.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Khong the mo lai ket qua da chot.");
    },
  });
}

export function useFinalizeManagerCollective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      collectiveId,
      payload,
    }: {
      collectiveId: string;
      payload: FinalizeCollectiveInput;
    }) => managerApi.finalizeCollective(collectiveId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerCollectives"] });
      queryClient.invalidateQueries({ queryKey: ["managerCollectiveAggregation"] });
      queryClient.invalidateQueries({ queryKey: managerKeys.dashboard });
      toast.success("Đã chốt kết quả hồ sơ tập thể.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể chốt kết quả hồ sơ tập thể.");
    },
  });
}
