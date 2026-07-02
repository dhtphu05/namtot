import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectiveApi } from "@/features/collective/api/collective";
import { useAuth } from "@/features/auth/store/auth-store";
import type { Level } from "@/lib/api/types";
import { toast } from "sonner";

export const collectiveKeys = {
  all: ["collective"] as const,
  current: (userId?: string | null) => [...collectiveKeys.all, "current", userId ?? "anonymous"] as const,
  detail: (id: string) => [...collectiveKeys.all, "detail", id] as const,
  latestPrecheck: (id: string) => [...collectiveKeys.all, "precheck", "latest", id] as const,
};

export function useCurrentCollective(schoolYear?: string, className?: string) {
  const userId = useAuth((s) => s.user?.id);

  return useQuery({
    queryKey: [...collectiveKeys.current(userId), { schoolYear, className }],
    queryFn: async () => {
      const res = await collectiveApi.getCurrent(schoolYear, className);
      return res.data;
    },
    enabled: !!userId,
  });
}

export function useCollectiveDetail(id?: string) {
  return useQuery({
    queryKey: collectiveKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) return null;
      const res = await collectiveApi.getById(id);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useStartCollective() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async (data: { schoolYear?: string; className?: string; targetLevel?: Level }) => {
      const res = await collectiveApi.start(data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(
        [...collectiveKeys.current(userId), { schoolYear: data.collective.schoolYear, className: data.collective.className }],
        data
      );
      queryClient.invalidateQueries({ queryKey: collectiveKeys.current(userId) });
    },
    onError: (err: Error) => {
      toast.error(`Không thể tạo hồ sơ tập thể: ${err.message}`);
    },
  });
}

export function useUpdateCollective() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { targetLevel?: Level; className?: string; note?: string } }) => {
      const res = await collectiveApi.update(id, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectiveKeys.current(userId) });
      queryClient.invalidateQueries({ queryKey: collectiveKeys.detail(variables.id) });
      toast.success("Đã cập nhật thông tin tập thể.");
    },
  });
}

export function useSubmitCollective() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, options }: { id: string; options: { allowSubmitWithWarnings?: boolean; note?: string } }) => {
      const res = await collectiveApi.submit(id, options);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectiveKeys.current(userId) });
      queryClient.invalidateQueries({ queryKey: collectiveKeys.detail(variables.id) });
      toast.success("Đã nộp hồ sơ tập thể thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Không thể nộp hồ sơ: ${err.message}`);
    },
  });
}

export function useCollectivePrecheck() {
  const queryClient = useQueryClient();
  const userId = useAuth((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ id, level }: { id: string; level?: Level }) => {
      const res = await collectiveApi.precheck(id, { level });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectiveKeys.current(userId) });
      queryClient.invalidateQueries({ queryKey: collectiveKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: collectiveKeys.latestPrecheck(variables.id) });
      toast.success("Tiền kiểm hoàn tất!");
    },
  });
}

export function useLatestCollectivePrecheck(id?: string) {
  return useQuery({
    queryKey: collectiveKeys.latestPrecheck(id ?? ""),
    queryFn: async () => {
      if (!id) return null;
      const res = await collectiveApi.getLatestPrecheck(id);
      return res.data;
    },
    enabled: !!id,
  });
}
