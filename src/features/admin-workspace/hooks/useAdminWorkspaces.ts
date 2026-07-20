import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { adminWorkspaceApi } from "@/features/admin-workspace/api/admin-workspace";
import type {
  AdminWorkspaceListFilters,
  AdminWorkspaceUserListFilters,
  UpdateWorkspacePayload,
  UpdateWorkspaceStatusPayload,
} from "@/features/admin-workspace/types";

export const adminWorkspaceKeys = {
  all: ["admin-workspaces"] as const,
  list: (filters?: AdminWorkspaceListFilters) =>
    [...adminWorkspaceKeys.all, "list", filters ?? {}] as const,
  summary: () => [...adminWorkspaceKeys.all, "summary"] as const,
  detail: (workspaceId?: string) =>
    [...adminWorkspaceKeys.all, "detail", workspaceId ?? ""] as const,
  users: (workspaceId?: string, filters?: AdminWorkspaceUserListFilters) =>
    [...adminWorkspaceKeys.all, "users", workspaceId ?? "", filters ?? {}] as const,
};

export function useAdminWorkspaces(filters: AdminWorkspaceListFilters) {
  return useQuery({
    queryKey: adminWorkspaceKeys.list(filters),
    queryFn: async () => {
      const response = await adminWorkspaceApi.list(filters);
      return response.data;
    },
  });
}

export function useAdminWorkspacesSummary() {
  return useQuery({
    queryKey: adminWorkspaceKeys.summary(),
    queryFn: async () => {
      const response = await adminWorkspaceApi.list({ page: 1, limit: 100 });
      return response.data;
    },
  });
}

export function useAdminWorkspaceDetail(workspaceId?: string) {
  return useQuery({
    queryKey: adminWorkspaceKeys.detail(workspaceId),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return null;
      const response = await adminWorkspaceApi.get(workspaceId);
      return response.data;
    },
  });
}

export function useAdminWorkspaceUsers(
  workspaceId: string | undefined,
  filters: AdminWorkspaceUserListFilters,
) {
  return useQuery({
    queryKey: adminWorkspaceKeys.users(workspaceId, filters),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return null;
      const response = await adminWorkspaceApi.listUsers(workspaceId, filters);
      return response.data;
    },
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateWorkspacePayload) => {
      const response = await adminWorkspaceApi.update(workspaceId, payload);
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...adminWorkspaceKeys.all, "list"] }),
        queryClient.invalidateQueries({ queryKey: adminWorkspaceKeys.summary() }),
        queryClient.invalidateQueries({ queryKey: adminWorkspaceKeys.detail(workspaceId) }),
      ]);
      toast.success("Đã cập nhật thông tin trường.");
    },
  });
}

export function useUpdateWorkspaceStatus(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateWorkspaceStatusPayload) => {
      const response = await adminWorkspaceApi.updateStatus(workspaceId, payload);
      return response.data;
    },
    onSuccess: async (_data, payload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...adminWorkspaceKeys.all, "list"] }),
        queryClient.invalidateQueries({ queryKey: adminWorkspaceKeys.summary() }),
        queryClient.invalidateQueries({ queryKey: adminWorkspaceKeys.detail(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: ["workspaces", "registration"] }),
      ]);

      if (payload.isActive === false) {
        toast.success("Đã vô hiệu hóa trường triển khai.");
      } else if (payload.isActive === true) {
        toast.success("Đã khôi phục hoạt động của trường.");
      } else if (payload.registrationEnabled === true) {
        toast.success("Đã mở đăng ký cho trường.");
      } else {
        toast.success("Đã đóng đăng ký cho trường.");
      }
    },
    onError: (error: Error) => {
      toast.error(mapWorkspaceError(error));
    },
  });
}

export function mapWorkspaceError(error: Error) {
  if (error instanceof ApiError) {
    if (error.code === "WORKSPACE_NOT_READY_FOR_REGISTRATION") {
      return readinessBlockerMessage(error.details);
    }
    if (error.code === "WORKSPACE_NOT_FOUND") return "Không tìm thấy trường triển khai.";
    if (error.code === "WORKSPACE_STATUS_INVALID") {
      return "Trạng thái trường chưa hợp lệ. Vui lòng tải lại và thử lại.";
    }
    if (error.code === "WORKSPACE_INACTIVE") return "Trường đang tạm dừng hoạt động.";
  }
  return error.message || "Không thể thực hiện thao tác. Vui lòng thử lại.";
}

function readinessBlockerMessage(details: unknown) {
  const blockers =
    details && typeof details === "object" && "blockers" in details
      ? (details as { blockers?: unknown }).blockers
      : null;

  if (Array.isArray(blockers) && blockers.includes("CRITERIA_VERSION_NOT_FOUND")) {
    return "Chưa thể mở đăng ký vì trường chưa có bộ tiêu chí đang hiệu lực.";
  }
  if (Array.isArray(blockers) && blockers.includes("WORKSPACE_INACTIVE")) {
    return "Chưa thể mở đăng ký vì trường đang tạm dừng hoạt động.";
  }
  return "Chưa thể mở đăng ký vì trường chưa hoàn tất điều kiện triển khai.";
}
