import { useQuery } from "@tanstack/react-query";
import { managerApi } from "../api/manager";
import type { ManagerApplicationsParams } from "../types";

export const managerKeys = {
  applications: ["managerApplications"] as const,
  applicationsList: (params?: ManagerApplicationsParams) =>
    [...managerKeys.applications, params ?? {}] as const,
  workload: ["managerWorkload"] as const,
  dashboard: ["managerDashboard"] as const,
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
