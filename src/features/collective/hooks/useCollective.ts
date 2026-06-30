import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectiveApi } from "@/features/collective/api/collective";
import type { Level } from "@/lib/api/types";
import { toast } from "sonner";

export const collectiveKeys = {
  all: ["collective"] as const,
  current: (schoolYear?: string, className?: string) => [...collectiveKeys.all, "current", schoolYear, className] as const,
  detail: (id: string) => [...collectiveKeys.all, "detail", id] as const,
};

export function useCurrentCollective(schoolYear?: string, className?: string) {
  return useQuery({
    queryKey: collectiveKeys.current(schoolYear, className),
    queryFn: async () => {
      const res = await collectiveApi.getCurrent(schoolYear, className);
      return res.data;
    },
  });
}

export function useStartCollective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { schoolYear?: string; className?: string; targetLevel?: Level }) => {
      const res = await collectiveApi.start(data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectiveKeys.all });
    },
    onError: (err: Error) => {
      toast.error(`Không thể tạo hồ sơ tập thể: ${err.message}`);
    },
  });
}

export function useUpdateCollective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { targetLevel?: Level; className?: string; note?: string } }) => {
      const res = await collectiveApi.update(id, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectiveKeys.all });
      toast.success("Đã cập nhật thông tin tập thể.");
    },
  });
}

export function useSubmitCollective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, options }: { id: string; options: { allowSubmitWithWarnings?: boolean; note?: string } }) => {
      const res = await collectiveApi.submit(id, options);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectiveKeys.all });
      toast.success("Đã nộp hồ sơ tập thể thành công!");
    },
    onError: (err: Error) => {
      toast.error(`Không thể nộp hồ sơ: ${err.message}`);
    },
  });
}

export function useCollectivePrecheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, level }: { id: string; level?: Level }) => {
      const res = await collectiveApi.precheck(id, { level });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectiveKeys.all });
      toast.success("Tiền kiểm hoàn tất!");
    },
  });
}
