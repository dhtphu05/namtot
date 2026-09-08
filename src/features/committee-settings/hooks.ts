import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DuplicateDraftSchoolYearError,
  type CreateDraftInput,
  type CriteriaConfiguration,
} from "./types.ts";
import { localCriteriaRepository } from "./repository.ts";

export const criteriaConfigurationKeys = {
  all: ["committee-settings", "criteria-configurations"] as const,
  detail: (id: string) => ["committee-settings", "criteria-configurations", id] as const,
};

export function useCriteriaConfigurations() {
  return useQuery({
    queryKey: criteriaConfigurationKeys.all,
    queryFn: async () => {
      const items = await localCriteriaRepository.list();
      const recovery = localCriteriaRepository.consumeRecoveryState();
      if (recovery.recoveredFromInvalidStorage) {
        toast.info("Dữ liệu demo đã được khôi phục về trạng thái ban đầu.");
      }
      return items;
    },
  });
}

export function useCriteriaConfiguration(configurationId: string) {
  return useQuery({
    queryKey: criteriaConfigurationKeys.detail(configurationId),
    queryFn: () => localCriteriaRepository.get(configurationId),
    retry: false,
  });
}

export function useCreateCriteriaDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDraftInput) => localCriteriaRepository.createDraft(input),
    onSuccess: (configuration) => {
      setConfigurationCache(queryClient, configuration);
      void queryClient.invalidateQueries({ queryKey: criteriaConfigurationKeys.all });
    },
  });
}

export function useCloneCriteriaDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceConfigurationId,
      targetSchoolYear,
    }: {
      sourceConfigurationId: string;
      targetSchoolYear: string;
    }) => localCriteriaRepository.cloneAsDraft(sourceConfigurationId, targetSchoolYear),
    onSuccess: (configuration) => {
      setConfigurationCache(queryClient, configuration);
      void queryClient.invalidateQueries({ queryKey: criteriaConfigurationKeys.all });
    },
  });
}

export function useSaveCriteriaConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configuration: CriteriaConfiguration) =>
      localCriteriaRepository.save(configuration),
    onSuccess: (configuration) => {
      setConfigurationCache(queryClient, configuration);
      void queryClient.invalidateQueries({ queryKey: criteriaConfigurationKeys.all });
    },
  });
}

export function usePublishCriteriaConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configurationId: string) => localCriteriaRepository.publish(configurationId),
    onSuccess: (configuration) => {
      setConfigurationCache(queryClient, configuration);
      void queryClient.invalidateQueries({ queryKey: criteriaConfigurationKeys.all });
    },
  });
}

export function useArchiveCriteriaConfiguration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (configurationId: string) => localCriteriaRepository.archive(configurationId),
    onSuccess: (configuration) => {
      setConfigurationCache(queryClient, configuration);
      void queryClient.invalidateQueries({ queryKey: criteriaConfigurationKeys.all });
    },
  });
}

export function useResetCriteriaDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => localCriteriaRepository.resetDemo(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: criteriaConfigurationKeys.all });
      toast.success("Đã khôi phục dữ liệu demo");
    },
  });
}

export function isDuplicateDraftError(error: unknown): error is DuplicateDraftSchoolYearError {
  return error instanceof DuplicateDraftSchoolYearError;
}

function setConfigurationCache(
  queryClient: ReturnType<typeof useQueryClient>,
  configuration: CriteriaConfiguration,
) {
  queryClient.setQueryData(criteriaConfigurationKeys.detail(configuration.id), configuration);
}
