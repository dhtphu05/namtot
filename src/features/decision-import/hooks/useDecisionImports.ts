import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { decisionImportApi } from "@/features/decision-import/api/decision-import";
import type {
  DecisionImportColumnMapping,
  DecisionImportConfirmInput,
  DecisionImportCreateInput,
  DecisionImportListFilters,
} from "@/types/decision-import";

export const decisionImportKeys = {
  all: ["decision-imports"] as const,
  list: (filters?: DecisionImportListFilters) =>
    [...decisionImportKeys.all, "list", filters ?? {}] as const,
  detail: (id?: string) => [...decisionImportKeys.all, "detail", id ?? ""] as const,
  status: (id?: string) => [...decisionImportKeys.all, "status", id ?? ""] as const,
  metadata: (id?: string) => [...decisionImportKeys.all, "metadata", id ?? ""] as const,
  tables: (id?: string) => [...decisionImportKeys.all, "tables", id ?? ""] as const,
  preview: (id?: string) => [...decisionImportKeys.all, "preview", id ?? ""] as const,
  audit: (id?: string) => [...decisionImportKeys.all, "audit", id ?? ""] as const,
};

function invalidateDecisionImport(
  queryClient: ReturnType<typeof useQueryClient>,
  importId?: string,
) {
  queryClient.invalidateQueries({ queryKey: decisionImportKeys.all });
  if (!importId) return;
  queryClient.invalidateQueries({ queryKey: decisionImportKeys.detail(importId) });
  queryClient.invalidateQueries({ queryKey: decisionImportKeys.status(importId) });
  queryClient.invalidateQueries({ queryKey: decisionImportKeys.metadata(importId) });
  queryClient.invalidateQueries({ queryKey: decisionImportKeys.tables(importId) });
  queryClient.invalidateQueries({ queryKey: decisionImportKeys.preview(importId) });
  queryClient.invalidateQueries({ queryKey: decisionImportKeys.audit(importId) });
  queryClient.invalidateQueries({ queryKey: ["events"] });
}

export function useDecisionImports(filters?: DecisionImportListFilters) {
  return useQuery({
    queryKey: decisionImportKeys.list(filters),
    queryFn: async () => {
      const response = await decisionImportApi.list(filters);
      return response.data;
    },
  });
}

export function useDecisionImport(importId?: string) {
  return useQuery({
    queryKey: decisionImportKeys.detail(importId),
    queryFn: async () => {
      if (!importId) return null;
      const response = await decisionImportApi.get(importId);
      return response.data;
    },
    enabled: Boolean(importId),
  });
}

export function useDecisionImportMetadata(importId?: string, enabled = true) {
  return useQuery({
    queryKey: decisionImportKeys.metadata(importId),
    queryFn: async () => {
      if (!importId) return null;
      const response = await decisionImportApi.getMetadata(importId);
      return response.data;
    },
    enabled: Boolean(importId) && enabled,
  });
}

export function useDecisionImportTables(importId?: string, enabled = true) {
  return useQuery({
    queryKey: decisionImportKeys.tables(importId),
    queryFn: async () => {
      if (!importId) return [];
      const response = await decisionImportApi.getTables(importId);
      return response.data;
    },
    enabled: Boolean(importId) && enabled,
  });
}

export function useDecisionImportPreview(importId?: string, enabled = true) {
  return useQuery({
    queryKey: decisionImportKeys.preview(importId),
    queryFn: async () => {
      if (!importId) return null;
      const response = await decisionImportApi.getPreview(importId);
      return response.data;
    },
    enabled: Boolean(importId) && enabled,
  });
}

export function useDecisionImportAudit(importId?: string, enabled = true) {
  return useQuery({
    queryKey: decisionImportKeys.audit(importId),
    queryFn: async () => {
      if (!importId) return { items: [] };
      const response = await decisionImportApi.getAudit(importId);
      return response.data ?? { items: [] };
    },
    enabled: Boolean(importId) && enabled,
  });
}

export function useCreateDecisionImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DecisionImportCreateInput) => {
      const response = await decisionImportApi.create(input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: decisionImportKeys.all });
      toast.success("Đã tạo phiên import.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể tạo phiên import.");
    },
  });
}

export function useUploadDecisionImportFile(importId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!importId) throw new Error("Missing decision import id");
      const response = await decisionImportApi.uploadFile(importId, file);
      return response.data;
    },
    onSuccess: () => {
      invalidateDecisionImport(queryClient, importId);
      toast.success("Đã nhận file quyết định.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Chưa tải được file quyết định.");
    },
  });
}

export function useStartDecisionImport(importId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!importId) throw new Error("Missing decision import id");
      const response = await decisionImportApi.start(importId);
      return response.data;
    },
    onSuccess: () => {
      invalidateDecisionImport(queryClient, importId);
      toast.success("Đã bắt đầu xử lý quyết định.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể bắt đầu xử lý.");
    },
  });
}

export function useUpdateDecisionColumnMapping(importId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapping: DecisionImportColumnMapping) => {
      if (!importId) throw new Error("Missing decision import id");
      const response = await decisionImportApi.updateColumnMapping(importId, mapping);
      return response.data;
    },
    onSuccess: () => {
      invalidateDecisionImport(queryClient, importId);
      toast.success("Đã cập nhật mapping cột.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể cập nhật mapping cột.");
    },
  });
}

export function useConfirmDecisionImport(importId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input?: DecisionImportConfirmInput) => {
      if (!importId) throw new Error("Missing decision import id");
      const response = await decisionImportApi.confirm(importId, input);
      return response.data;
    },
    onSuccess: () => {
      invalidateDecisionImport(queryClient, importId);
      toast.success("Đã lưu danh sách vào kho minh chứng chính thức.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể xác nhận phiên import.");
    },
  });
}

export function useCancelDecisionImport(importId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!importId) throw new Error("Missing decision import id");
      const response = await decisionImportApi.cancel(importId);
      return response.data;
    },
    onSuccess: () => {
      invalidateDecisionImport(queryClient, importId);
      toast.success("Đã huỷ phiên import.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Không thể huỷ phiên import.");
    },
  });
}
