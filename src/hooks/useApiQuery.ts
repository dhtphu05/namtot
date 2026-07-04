import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import type { ApiResponse } from "@/types/api";

type ApiQueryOptions<TData, TError = Error> = Omit<
  UseQueryOptions<TData, TError, TData, QueryKey>,
  "queryKey" | "queryFn"
>;

export function useApiQuery<TData, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<ApiResponse<TData>>,
  options?: ApiQueryOptions<TData, TError>,
) {
  return useQuery<TData, TError, TData, QueryKey>({
    queryKey,
    queryFn: async () => {
      const response = await queryFn();
      return response.data as TData;
    },
    ...options,
  });
}
