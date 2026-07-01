import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationApi } from "@/features/application/api/application";
import { useAuth } from "@/features/auth/store/auth-store";
import type { Level, MetricType, VerificationStatus } from "@/lib/api/types";
import { toast } from "sonner";

export const applicationKeys = {
  all: ["applications"] as const,
  current: (userId?: string | null) => [...applicationKeys.all, "current", userId ?? "anonymous"] as const,
  timeline: (id: string) => [...applicationKeys.all, "timeline", id] as const,
  latestPrecheck: (id: string) => [...applicationKeys.all, "precheck", "latest", id] as const,
};

export function useCurrentApplication(schoolYear?: string) {
  const userId = useAuth((s) => s.user?.id);

  return useQuery({
    queryKey: [...applicationKeys.current(userId), { schoolYear }],
    queryFn: async () => {
      const res = await applicationApi.getCurrentApplication(schoolYear);
      return res.data;
    },
    enabled: !!userId,
  });
}

export function useStartApplication() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async (data: { schoolYear?: string; targetLevel?: Level }) => {
      const res = await applicationApi.startApplication(data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...applicationKeys.current(userId), { schoolYear: data.application.schoolYear }], data);
      queryClient.invalidateQueries({ queryKey: applicationKeys.current(userId) });
    },
    onError: (err: Error) => {
      toast.error(`Không thể tạo hồ sơ: ${err.message}`);
    },
  });
}

export function useUpdateTargetLevel() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, targetLevel }: { id: string; targetLevel: Level }) => {
      const res = await applicationApi.updateTargetLevel(id, targetLevel);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current(userId) });
    },
  });
}

export function useSaveDraft() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, draftPayload }: { id: string; draftPayload: Record<string, unknown> }) => {
      const res = await applicationApi.saveDraft(id, draftPayload);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate silently in the background, keeping old data while fetching new
      queryClient.invalidateQueries({ queryKey: applicationKeys.current(userId) });
    },
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, allowSubmitWithWarnings, studentNote }: { id: string; allowSubmitWithWarnings?: boolean; studentNote?: string }) => {
      const res = await applicationApi.submit(id, { allowSubmitWithWarnings, studentNote });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current(userId) });
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
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, level }: { id: string; level?: Level }) => {
      const res = await applicationApi.precheck(id, { level, runMode: "sync" });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current(userId) });
      queryClient.invalidateQueries({ queryKey: applicationKeys.latestPrecheck(variables.id) });
    },
  });
}

export function useUpsertMetric() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

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
      const res = await applicationApi.upsertMetric(id, { metricType, value, scale });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current(userId) });
    },
  });
}

export function useUpdateMetric() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({
      metricId,
      value,
      scale,
      verificationStatus,
    }: {
      metricId: string;
      value?: number;
      scale?: number | string;
      verificationStatus?: VerificationStatus;
    }) => {
      const res = await applicationApi.updateMetric(metricId, { value, scale, verificationStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.current(userId) });
    },
  });
}
