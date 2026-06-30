import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationApi } from "@/features/application/api/application";
import type { Level } from "@/lib/api/types";
import { toast } from "sonner";

export const applicationKeys = {
  all: ["applications"] as const,
  current: () => [...applicationKeys.all, "current"] as const,
  timeline: (id: string) => [...applicationKeys.all, "timeline", id] as const,
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
    mutationFn: async (data: { schoolYear?: string; targetLevel?: Level }) => {
      const res = await applicationApi.startApplication(data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...applicationKeys.current(), { schoolYear: data.application.schoolYear }], data);
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

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, draftPayload }: { id: string; draftPayload: Record<string, unknown> }) => {
      const res = await applicationApi.saveDraft(id, draftPayload);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate silently in the background, keeping old data while fetching new
      queryClient.invalidateQueries({ queryKey: applicationKeys.current() });
    },
  });
}

export function useSubmitApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, allowSubmitWithWarnings, studentNote }: { id: string; allowSubmitWithWarnings?: boolean; studentNote?: string }) => {
      const res = await applicationApi.submit(id, { allowSubmitWithWarnings, studentNote });
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
