import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { applicationApi } from "@/features/application/api/application";
import type { Level, MetricInput, MetricType, VerificationStatus } from "@/lib/api/types";

export const applicationKeys = {
  all: ["applications"] as const,
  current: () => ["application", "current"] as const,
  timeline: (id: string) => ["application", id, "timeline"] as const,
  latestPrecheck: (id: string) => ["application", id, "precheck", "latest"] as const,
  metrics: (id: string) => ["application", id, "metrics"] as const,
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
    mutationFn: async (data: {
      schoolYear?: string;
      applicationType?: "individual" | "collective";
      targetLevel?: Level;
    }) => {
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
    mutationFn: async ({
      id,
      draftData,
      draftPayload,
      step,
    }: {
      id: string;
      draftData?: Record<string, unknown>;
      draftPayload?: Record<string, unknown>;
      step?: string;
    }) => {
      const res = await applicationApi.saveDraft(id, {
        draftData: draftData ?? draftPayload ?? {},
        step,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
    },
  });
}

export const useSaveDraft = useSaveApplicationDraft;

export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      allowSubmitWithWarnings,
    }: {
      id: string;
      allowSubmitWithWarnings?: boolean;
      studentNote?: string;
    }) => {
      const res = await applicationApi.submitApplication(id, {
        allowSubmitWithWarnings: !!allowSubmitWithWarnings,
      });
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

export function useLatestPrecheck(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.latestPrecheck(applicationId ?? ""),
    queryFn: async () => {
      if (!applicationId) return null;
      const res = await applicationApi.getLatestPrecheck(applicationId);
      return res.data;
    },
    enabled: !!applicationId,
  });
}

export function usePrecheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, level }: { id: string; level?: Level }) => {
      const res = await applicationApi.precheck(id, { level, runMode: "sync" });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(variables.id) });
    },
  });
}

export function useApplicationTimeline(id: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.timeline(id ?? ""),
    queryFn: async () => {
      if (!id) return [];
      const res = await applicationApi.getApplicationTimeline(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useApplicationMetrics(id: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.metrics(id ?? ""),
    queryFn: async () => {
      if (!id) return [];
      const res = await applicationApi.getMetrics(id);
      return res.data || [];
    },
    enabled: !!id,
  });
}

export function useUpsertMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      metricType,
      value,
      scale,
    }: {
      id: string;
      metricType: MetricType;
      value: number;
      scale?: number | string;
    }) => {
      const res = await applicationApi.createApplicationMetric(id, {
        criterion: metricType === "gpa" ? "academic" : "ethics",
        metricType: metricType as MetricInput["metricType"],
        valueNumber: value,
        unit: typeof scale === "string" ? scale : undefined,
        source: "student_input",
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.id) });
    },
  });
}

export function useCreateMetric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ applicationId, data }: { applicationId: string; data: MetricInput }) => {
      const res = await applicationApi.createApplicationMetric(applicationId, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.applicationId) });
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
      value,
      scale,
      verificationStatus,
      data,
    }: {
      metricId: string;
      applicationId?: string;
      value?: number;
      scale?: number | string;
      verificationStatus?: VerificationStatus;
      data?: Partial<MetricInput>;
    }) => {
      const res = await applicationApi.updateMetric(
        metricId,
        data ?? { value, scale, verificationStatus },
      );
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
      if (variables.applicationId) {
        queryClient.invalidateQueries({ queryKey: applicationKeys.metrics(variables.applicationId) });
      }
      toast.success("Đã cập nhật chỉ số thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Lỗi cập nhật chỉ số: ${err.message}`);
    },
  });
}
