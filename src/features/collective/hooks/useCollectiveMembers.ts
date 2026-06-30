import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectiveApi } from "@/features/collective/api/collective";
import type { CollectiveMemberInput } from "@/lib/api/types";
import { toast } from "sonner";

export const collectiveMemberKeys = {
  all: ["collective-members"] as const,
  list: (id: string) => [...collectiveMemberKeys.all, "list", id] as const,
};

export function useCollectiveMembers(collectiveId?: string, query?: Record<string, string | number>) {
  return useQuery({
    queryKey: [...collectiveMemberKeys.list(collectiveId ?? ""), query],
    queryFn: async () => {
      if (!collectiveId) return [];
      const res = await collectiveApi.getMembers(collectiveId, query);
      return res.data;
    },
    enabled: !!collectiveId,
  });
}

export function useUpsertMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CollectiveMemberInput }) => {
      const res = await collectiveApi.upsertMember(id, data);
      return { id, data: res.data };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: collectiveMemberKeys.list(res.id) });
      toast.success("Đã thêm/cập nhật thành viên.");
    },
    onError: (err: Error) => toast.error(`Lỗi cập nhật thành viên: ${err.message}`),
  });
}

export function useImportMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const res = await collectiveApi.importMembers(id, file);
      return { id, result: res.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: collectiveMemberKeys.list(data.id) });
    },
    onError: (err: Error) => toast.error(`Lỗi khi import danh sách: ${err.message}`),
  });
}
