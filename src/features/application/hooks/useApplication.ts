import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationApi } from "@/features/application/api/application";
import type { Level, MetricInput } from "@/lib/api/types";
import { toast } from "sonner";

export const applicationKeys = {
  all: ["applications"] as const,
  current: () => ["application", "current"] as const,
  timeline: (id: string) => ["application", id, "timeline"] as const,
};

export function useCurrentApplication(schoolYear?: string) {
  return useQuery({
    queryKey: [...applicationKeys.current(), { schoolYear }],
    queryFn: async () => {
      const res = await applicationApi.getCurrentApplication(schoolYear);
      return res.data;
    },
  });
}

export function useStartApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { schoolYear?: string; applicationType?: "individual" | "collective"; targetLevel?: Level }) => {
      const res = await applicationApi.startCurrentApplication(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
    },
    onError: (err: Error) => {
      toast.error(`Không thể tạo hồ sơ: ${err.message}`);
    },
  });
}

export function useUpdateTargetLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, targetLevel }: { id: string; targetLevel: Level }) => {
      const res = await applicationApi.updateTargetLevel(id, targetLevel);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
    },
  });
}

export function useSaveApplicationDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, draftData, step }: { id: string; draftData: Record<string, unknown>; step?: string }) => {
      const res = await applicationApi.saveDraft(id, { draftData, step });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
    },
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, draftPayload }: { id: string; draftPayload: Record<string, unknown> }) => {
      const res = await applicationApi.saveDraft(id, { draftData: draftPayload });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
    },
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, allowSubmitWithWarnings }: { id: string; allowSubmitWithWarnings: boolean }) => {
      const res = await applicationApi.submitApplication(id, { allowSubmitWithWarnings });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      toast.success("Đã nộp hồ sơ thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Không thể nộp hồ sơ: ${err.message}`);
    },
  });
}

export function usePrecheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, level }: { id: string; level?: Level }) => {
      const res = await applicationApi.precheck(id, { level, runMode: "sync" });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
    },
  });
}

export function useApplicationTimeline(id: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.timeline(id ?? ""),
    queryFn: async () => {
      if (!id) return null;
      const res = await applicationApi.getApplicationTimeline(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useApplicationMetrics(id: string | undefined) {
  return useQuery({
    queryKey: [...applicationKeys.all, "metrics", id ?? ""],
    queryFn: async () => {
      if (!id) return [];
      const res = await applicationApi.getMetrics(id);
      return res.data || [];
    },
    enabled: !!id,
  });
}

export function useCreateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      data,
    }: {
      applicationId: string;
      data: MetricInput;
    }) => {
      const res = await applicationApi.createApplicationMetric(applicationId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...applicationKeys.all, "metrics", variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      toast.success("Đã lưu chỉ số thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi lưu chỉ số: ${err.message}`);
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      metricId,
      applicationId,
      data,
    }: {
      metricId: string;
      applicationId: string;
      data: Partial<MetricInput>;
    }) => {
      const res = await applicationApi.updateMetric(metricId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...applicationKeys.all, "metrics", variables.applicationId] });
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      toast.success("Đã cập nhật chỉ số thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi cập nhật chỉ số: ${err.message}`);
    },
  });
}
