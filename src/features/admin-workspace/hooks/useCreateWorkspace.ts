import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminWorkspaceApi } from "@/features/admin-workspace/api/admin-workspace";
import { adminWorkspaceKeys } from "@/features/admin-workspace/hooks/useAdminWorkspaces";
import type { CreateWorkspacePayload } from "@/features/admin-workspace/types";

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateWorkspacePayload) => {
      const response = await adminWorkspaceApi.create(payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminWorkspaceKeys.all });
      toast.success("Đã tạo trường triển khai.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể tạo trường triển khai.");
    },
  });
}
