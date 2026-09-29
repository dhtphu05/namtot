import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminUsersApi,
  type AdminUserWriteInput,
  type AdminUsersFilters,
} from "../api/admin-users";

export const adminUsersKeys = {
  all: ["admin-users"] as const,
  list: (filters: AdminUsersFilters) => [...adminUsersKeys.all, "list", filters] as const,
  detail: (id?: string) => [...adminUsersKeys.all, "detail", id ?? ""] as const,
};

export function useAdminUsers(filters: AdminUsersFilters) {
  return useQuery({
    queryKey: adminUsersKeys.list(filters),
    queryFn: () => adminUsersApi.list(filters),
  });
}

export function useAdminUser(userId?: string) {
  return useQuery({
    queryKey: adminUsersKeys.detail(userId),
    queryFn: async () => (await adminUsersApi.get(userId!)).data,
    enabled: Boolean(userId),
  });
}

function useInvalidateAdminUsers() {
  const client = useQueryClient();
  return async (userId?: string) => {
    await Promise.all([
      client.invalidateQueries({ queryKey: adminUsersKeys.all }),
      ...(userId ? [client.invalidateQueries({ queryKey: adminUsersKeys.detail(userId) })] : []),
    ]);
  };
}

export function useCreateAdminUser() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: async (input: AdminUserWriteInput) => (await adminUsersApi.create(input)).data,
    onSuccess: async () => {
      await invalidate();
      toast.success("Đã tạo tài khoản.");
    },
    onError: (error: Error) => toast.error(error.message || "Không thể tạo tài khoản."),
  });
}

export function useUpdateAdminUser() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: AdminUserWriteInput }) =>
      (await adminUsersApi.update(userId, input)).data,
    onSuccess: async (_result, input) => {
      await invalidate(input.userId);
      toast.success("Đã cập nhật tài khoản.");
    },
    onError: (error: Error) => toast.error(error.message || "Không thể cập nhật tài khoản."),
  });
}

export function useSetAdminUserActive() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      (await adminUsersApi.setActive(userId, isActive)).data,
    onSuccess: async (_result, input) => {
      await invalidate(input.userId);
      toast.success(input.isActive ? "Đã kích hoạt tài khoản." : "Đã vô hiệu hóa tài khoản.");
    },
    onError: (error: Error) =>
      toast.error(error.message || "Không thể cập nhật trạng thái tài khoản."),
  });
}

export function useSetOfficerSpecializations() {
  const invalidate = useInvalidateAdminUsers();
  return useMutation({
    mutationFn: async ({ userId, criteria }: { userId: string; criteria: string[] }) =>
      (await adminUsersApi.setSpecializations(userId, criteria)).data,
    onSuccess: async (_result, input) => {
      await invalidate(input.userId);
      toast.success("Đã lưu chuyên môn City Officer.");
    },
    onError: (error: Error) => toast.error(error.message || "Không thể lưu chuyên môn."),
  });
}
