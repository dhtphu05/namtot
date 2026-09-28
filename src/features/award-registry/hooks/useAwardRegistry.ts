import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { awardRegistryApi, requireAwardData } from "@/features/award-registry/api/award-registry";
import type {
  AwardDecisionCreateInput,
  AwardDecisionUpdateInput,
  AwardRegistryFilters,
  AwardRosterMapping,
} from "@/types/award-registry";

export const awardRegistryKeys = {
  all: ["award-registry"] as const,
  list: (filters: AwardRegistryFilters = {}) =>
    [...awardRegistryKeys.all, "list", filters] as const,
  detail: (id: string) => [...awardRegistryKeys.all, "detail", id] as const,
  processing: (id: string) => [...awardRegistryKeys.all, "processing", id] as const,
  preview: (id: string, page = 1) => [...awardRegistryKeys.all, "preview", id, page] as const,
  recipients: (id: string, page = 1) => [...awardRegistryKeys.all, "recipients", id, page] as const,
  workspaces: () => [...awardRegistryKeys.all, "workspaces"] as const,
};

function invalidateDecision(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: awardRegistryKeys.all });
  if (!id) return;
  void queryClient.invalidateQueries({ queryKey: awardRegistryKeys.detail(id) });
  void queryClient.invalidateQueries({ queryKey: awardRegistryKeys.processing(id) });
  void queryClient.invalidateQueries({ queryKey: awardRegistryKeys.preview(id) });
  void queryClient.invalidateQueries({ queryKey: awardRegistryKeys.recipients(id) });
}

export function useAwardDecisions(filters: AwardRegistryFilters) {
  return useQuery({
    queryKey: awardRegistryKeys.list(filters),
    queryFn: async () => requireAwardData(await awardRegistryApi.list(filters)),
  });
}

export function useAwardDecision(id: string) {
  return useQuery({
    queryKey: awardRegistryKeys.detail(id),
    queryFn: async () => requireAwardData(await awardRegistryApi.get(id)),
    enabled: Boolean(id),
  });
}

export function useAwardRosterProcessing(id: string, enabled = true) {
  const processingStartedAt = useRef<number | null>(null);
  const query = useQuery({
    queryKey: awardRegistryKeys.processing(id),
    queryFn: async () => requireAwardData(await awardRegistryApi.getProcessing(id)),
    enabled: Boolean(id) && enabled,
    refetchInterval: (state) => {
      if (state.state.data?.status !== "processing") return false;
      processingStartedAt.current ??= Date.now();
      return Date.now() - processingStartedAt.current < 120_000 ? 2_500 : false;
    },
  });

  useEffect(() => {
    if (query.data?.status !== "processing") processingStartedAt.current = null;
  }, [query.data?.status]);

  return query;
}

export function useAwardRosterPreview(id: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: awardRegistryKeys.preview(id, page),
    queryFn: async () => requireAwardData(await awardRegistryApi.getPreview(id, page)),
    enabled: Boolean(id) && enabled,
  });
}

export function useAwardRecipients(id: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: awardRegistryKeys.recipients(id, page),
    queryFn: async () => requireAwardData(await awardRegistryApi.recipients(id, page)),
    enabled: Boolean(id) && enabled,
  });
}

export function useAwardWorkspaceNames(enabled: boolean) {
  return useQuery({
    queryKey: awardRegistryKeys.workspaces(),
    queryFn: async () => requireAwardData(await awardRegistryApi.listWorkspaceNames()),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateAwardDecision() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: AwardDecisionCreateInput) =>
      requireAwardData(await awardRegistryApi.create(input)),
    onSuccess: () => {
      invalidateDecision(client);
      toast.success("Đã tạo bản nháp quyết định.");
    },
  });
}

export function useUpdateAwardDecision(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: AwardDecisionUpdateInput) =>
      requireAwardData(await awardRegistryApi.update(id, input)),
    onSuccess: () => {
      invalidateDecision(client, id);
      toast.success("Đã cập nhật thông tin quyết định.");
    },
  });
}

export function useUploadAwardFile(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: "decision" | "roster"; file: File }) =>
      requireAwardData(await awardRegistryApi.upload(id, input.kind, input.file)),
    onSuccess: (_data, input) => {
      invalidateDecision(client, id);
      toast.success(
        input.kind === "roster" ? "Đã tải danh sách lên." : "Đã tải văn bản quyết định lên.",
      );
    },
  });
}

export function useProcessAwardRoster(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => requireAwardData(await awardRegistryApi.processRoster(id)),
    onSuccess: () => {
      invalidateDecision(client, id);
      toast.success("Đã gửi danh sách vào hàng đợi xử lý.");
    },
  });
}

export function useUpdateAwardRosterMapping(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (mapping: AwardRosterMapping) =>
      requireAwardData(await awardRegistryApi.updateMapping(id, mapping)),
    onSuccess: () => {
      invalidateDecision(client, id);
      toast.success("Đã cập nhật ánh xạ cột.");
    },
  });
}

export function useConfirmAwardDecision(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => requireAwardData(await awardRegistryApi.confirm(id)),
    onSuccess: () => {
      invalidateDecision(client, id);
      toast.success("Đã xác nhận quyết định và lưu danh sách.");
    },
  });
}
