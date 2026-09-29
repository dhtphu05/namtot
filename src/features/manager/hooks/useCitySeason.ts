import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  citySeasonApi,
  type GrantSubmissionDeadlineExceptionInput,
  type RevokeSubmissionDeadlineExceptionInput,
  type SaveCityReviewSeasonInput,
} from "../api/city-season";

export const citySeasonKeys = {
  season: (schoolYear: string) => ["cityReviewSeason", schoolYear] as const,
  seasons: () => ["cityReviewSeasons"] as const,
  applicationDeadline: (applicationId: string) =>
    ["managerSubmissionDeadline", applicationId] as const,
};

export function useCityReviewSeasons() {
  return useQuery({
    queryKey: citySeasonKeys.seasons(),
    queryFn: async () => (await citySeasonApi.listSeasons()).data,
    retry: false,
  });
}

export function useCityReviewSeason(schoolYear: string) {
  return useQuery({
    queryKey: citySeasonKeys.season(schoolYear),
    queryFn: async () => (await citySeasonApi.getSeason(schoolYear)).data,
    enabled: /^\d{4}-\d{4}$/.test(schoolYear),
    retry: false,
  });
}

export function useSaveCityReviewSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      schoolYear,
      payload,
      expectedVersion,
    }: {
      schoolYear: string;
      payload: SaveCityReviewSeasonInput;
      expectedVersion?: number;
    }) =>
      expectedVersion === undefined
        ? citySeasonApi.createSeason(payload)
        : citySeasonApi.updateSeason(schoolYear, { ...payload, expectedVersion }),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({ queryKey: citySeasonKeys.season(input.schoolYear) });
      await queryClient.invalidateQueries({ queryKey: citySeasonKeys.seasons() });
      toast.success("Đã lưu lịch mùa xét Thành phố.");
    },
    onError: (error: Error) => toast.error(error.message || "Không thể lưu lịch mùa xét."),
  });
}

export function useDeleteCityReviewSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolYear, reason }: { schoolYear: string; reason: string }) =>
      citySeasonApi.deleteSeason(schoolYear, reason),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: citySeasonKeys.seasons() }),
        queryClient.invalidateQueries({ queryKey: citySeasonKeys.season(input.schoolYear) }),
      ]);
      toast.success("Đã xóa mùa xét chưa phát sinh hồ sơ.");
    },
    onError: (error: Error) => toast.error(error.message || "Không thể xóa mùa xét."),
  });
}

export function useManagerSubmissionDeadline(applicationId: string) {
  return useQuery({
    queryKey: citySeasonKeys.applicationDeadline(applicationId),
    queryFn: async () => (await citySeasonApi.getApplicationDeadline(applicationId)).data,
    enabled: Boolean(applicationId),
    retry: false,
  });
}

export function useGrantSubmissionDeadlineException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: GrantSubmissionDeadlineExceptionInput;
    }) => citySeasonApi.grantException(applicationId, payload),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: citySeasonKeys.applicationDeadline(input.applicationId),
      });
      toast.success("Đã cấp ngoại lệ thời hạn nộp hồ sơ.");
    },
    onError: (error: Error) => toast.error(error.message || "Không thể cấp ngoại lệ thời hạn."),
  });
}

export function useRevokeSubmissionDeadlineException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      applicationId,
      payload,
    }: {
      applicationId: string;
      payload: RevokeSubmissionDeadlineExceptionInput;
    }) => citySeasonApi.revokeException(applicationId, payload),
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: citySeasonKeys.applicationDeadline(input.applicationId),
      });
      toast.success("Đã thu hồi ngoại lệ thời hạn nộp hồ sơ.");
    },
    onError: (error: Error) => toast.error(error.message || "Không thể thu hồi ngoại lệ thời hạn."),
  });
}
